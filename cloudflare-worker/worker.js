/**
 * Cloudflare Worker - AI API 代理
 * 作用：保护 API Key，转发前端请求到实际的 AI API
 */

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // 只允许 POST 请求
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      // 1. 解析请求体
      const body = await request.json();

      // 2. 从环境变量读取配置（管理员在 Dashboard 配置）
      const API_KEY = env.API_KEY;
      const API_BASE_URL = env.API_BASE_URL;
      const MODEL_NAME = env.MODEL_NAME;

      // 3. 验证环境变量
      if (!API_KEY || !API_BASE_URL) {
        return jsonResponse({
          error: '服务器未配置 API，请联系管理员'
        }, 500);
      }

      // 4. 构建 AI API 请求
      const aiRequest = {
        model: body.model || MODEL_NAME,
        messages: body.messages,
        response_format: body.response_format,
        temperature: body.temperature || 0.7
      };

      // 5. 调用实际的 AI API
      const cleanBaseUrl = API_BASE_URL.replace(/\/$/, '');
      const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(aiRequest)
      });

      // 6. 检查响应
      if (!response.ok) {
        const errorText = await response.text();
        return jsonResponse({
          error: `AI API 错误: ${response.status}`,
          details: errorText
        }, response.status);
      }

      // 7. 返回结果（添加 CORS 头）
      const result = await response.json();
      return jsonResponse(result, 200, request.headers.get('Origin'));

    } catch (error) {
      return jsonResponse({
        error: '请求处理失败',
        message: error.message
      }, 500);
    }
  }
};

// CORS 处理
function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

// JSON 响应辅助函数
function jsonResponse(data, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
