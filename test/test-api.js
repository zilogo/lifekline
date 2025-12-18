// API 测试脚本
const API_BASE_URL = 'https://llm.tokencloud.ai/v1';
const API_KEY = 'sk-RPo8Q8Lf9_SKoNMSjo5DNA';
const MODELS = ['kim2-thinking', 'DeepSeek-V3'];

// 简化的八字测试提示词
const SYSTEM_PROMPT = `你是一位八字命理大师。请根据用户提供的八字信息，生成一份JSON格式的命理报告。

输出 JSON 结构要求：
{
  "bazi": ["年柱", "月柱", "日柱", "时柱"],
  "summary": "命理总评摘要",
  "summaryScore": 8,
  "industry": "事业分析内容",
  "industryScore": 7,
  "chartPoints": [
    {
      "age": 1,
      "year": 1990,
      "daYun": "童限",
      "ganZhi": "庚午",
      "open": 50,
      "close": 55,
      "high": 60,
      "low": 45,
      "score": 55,
      "reason": "详细的流年详批"
    }
  ]
}`;

const USER_PROMPT = `请根据以下八字信息生成命理分析：

【基本信息】
性别：男 (乾造)
出生年份：1990年

【八字四柱】
年柱：庚午
月柱：己巳
日柱：甲子
时柱：丙寅

【大运信息】
起运年龄：3 岁
第一步大运：庚午
排序方向：顺行

请生成 1-5 岁的人生K线数据（只需5个数据点即可测试）。`;

async function testModel(modelName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试模型: ${modelName}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: USER_PROMPT }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    const duration = Date.now() - startTime;

    console.log(`✓ HTTP 状态码: ${response.status} ${response.statusText}`);
    console.log(`✓ 响应时间: ${duration}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`✗ API 请求失败:`);
      console.error(errorText);
      return { success: false, model: modelName, error: errorText };
    }

    const result = await response.json();
    console.log(`✓ 返回结构:`, JSON.stringify(result, null, 2).substring(0, 500) + '...');

    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      console.error(`✗ 模型未返回内容`);
      return { success: false, model: modelName, error: '无返回内容' };
    }

    console.log(`✓ 返回内容长度: ${content.length} 字符`);
    console.log(`✓ 返回内容预览:\n${content.substring(0, 300)}...\n`);

    // 尝试解析 JSON
    let parsedData;
    try {
      parsedData = JSON.parse(content);
      console.log(`✓ JSON 解析成功`);
    } catch (parseError) {
      console.error(`✗ JSON 解析失败:`, parseError.message);
      console.error(`原始内容:`, content.substring(0, 500));
      return { success: false, model: modelName, error: `JSON解析失败: ${parseError.message}` };
    }

    // 验证必需字段
    const requiredFields = ['bazi', 'summary', 'summaryScore', 'chartPoints'];
    const missingFields = requiredFields.filter(field => !parsedData[field]);

    if (missingFields.length > 0) {
      console.error(`✗ 缺少必需字段:`, missingFields);
      return { success: false, model: modelName, error: `缺少字段: ${missingFields.join(', ')}` };
    }

    console.log(`✓ 所有必需字段都存在`);

    // 验证 chartPoints 结构
    if (!Array.isArray(parsedData.chartPoints) || parsedData.chartPoints.length === 0) {
      console.error(`✗ chartPoints 不是数组或为空`);
      return { success: false, model: modelName, error: 'chartPoints 格式错误' };
    }

    const firstPoint = parsedData.chartPoints[0];
    const pointRequiredFields = ['age', 'year', 'daYun', 'ganZhi', 'open', 'close', 'high', 'low', 'score', 'reason'];
    const missingPointFields = pointRequiredFields.filter(field => firstPoint[field] === undefined);

    if (missingPointFields.length > 0) {
      console.error(`✗ chartPoints[0] 缺少字段:`, missingPointFields);
      return { success: false, model: modelName, error: `chartPoints缺少字段: ${missingPointFields.join(', ')}` };
    }

    console.log(`✓ chartPoints 结构正确`);
    console.log(`✓ 生成了 ${parsedData.chartPoints.length} 个数据点`);
    console.log(`\n✅ 模型 ${modelName} 测试通过！\n`);

    return {
      success: true,
      model: modelName,
      duration,
      dataPoints: parsedData.chartPoints.length,
      data: parsedData
    };

  } catch (error) {
    console.error(`✗ 测试异常:`, error.message);
    return { success: false, model: modelName, error: error.message };
  }
}

async function main() {
  console.log('\n🧪 开始测试 API 和模型兼容性...\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`测试模型: ${MODELS.join(', ')}\n`);

  const results = [];

  for (const model of MODELS) {
    const result = await testModel(model);
    results.push(result);

    // 等待一秒避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 汇总结果
  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60) + '\n');

  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.model}: 通过 (响应时间: ${result.duration}ms, 数据点: ${result.dataPoints})`);
    } else {
      console.log(`❌ ${result.model}: 失败 - ${result.error}`);
    }
  });

  const passedModels = results.filter(r => r.success);
  console.log(`\n通过测试: ${passedModels.length}/${results.length}`);

  if (passedModels.length > 0) {
    console.log(`\n推荐使用的模型: ${passedModels[0].model}`);
  }
}

main().catch(console.error);
