// 测试 DeepSeek-V3 是否能通过容错逻辑正常工作
const API_BASE_URL = 'https://llm.tokencloud.ai/v1';
const API_KEY = 'sk-RPo8Q8Lf9_SKoNMSjo5DNA';

// 模拟 geminiService.ts 中的 JSON 清理逻辑
function cleanJsonContent(content) {
  let cleanedContent = content.trim();

  // 如果内容包含```json标记，提取其中的JSON
  if (cleanedContent.includes('```json')) {
    const jsonMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[1].trim();
    }
  } else if (cleanedContent.includes('```')) {
    // 处理普通```标记
    const jsonMatch = cleanedContent.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[1].trim();
    }
  }

  // 尝试找到第一个{和最后一个}之间的内容
  const firstBrace = cleanedContent.indexOf('{');
  const lastBrace = cleanedContent.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanedContent = cleanedContent.substring(firstBrace, lastBrace + 1);
  }

  return cleanedContent;
}

async function testDeepSeekWithFallback() {
  console.log('🧪 测试 DeepSeek-V3 是否能通过容错逻辑正常工作\n');

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'DeepSeek-V3',
        messages: [
          {
            role: "system",
            content: "你是一位八字命理大师。请根据用户提供的八字信息，生成JSON格式的命理报告。必须包含：bazi, summary, summaryScore, chartPoints字段。"
          },
          {
            role: "user",
            content: "请为1990年庚午年出生的男性生成3个数据点的命理K线数据（1-3岁）。八字：庚午、己巳、甲子、丙寅"
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 请求失败:', errorText);
      return;
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content;

    console.log('📄 原始返回内容:');
    console.log(rawContent.substring(0, 300) + '...\n');

    // 应用容错逻辑
    const cleanedContent = cleanJsonContent(rawContent);

    console.log('🧹 清理后的内容:');
    console.log(cleanedContent.substring(0, 300) + '...\n');

    // 尝试解析
    try {
      const parsedData = JSON.parse(cleanedContent);
      console.log('✅ JSON 解析成功！\n');
      console.log('验证必需字段:');
      console.log('  - bazi:', parsedData.bazi ? '✅' : '❌');
      console.log('  - summary:', parsedData.summary ? '✅' : '❌');
      console.log('  - summaryScore:', parsedData.summaryScore !== undefined ? '✅' : '❌');
      console.log('  - chartPoints:', Array.isArray(parsedData.chartPoints) ? '✅' : '❌');
      console.log(`  - 数据点数量: ${parsedData.chartPoints?.length || 0}\n`);

      if (parsedData.chartPoints && parsedData.chartPoints.length > 0) {
        const firstPoint = parsedData.chartPoints[0];
        console.log('第一个数据点结构:');
        console.log('  - age:', firstPoint.age !== undefined ? '✅' : '❌');
        console.log('  - year:', firstPoint.year !== undefined ? '✅' : '❌');
        console.log('  - daYun:', firstPoint.daYun !== undefined ? '✅' : '❌');
        console.log('  - ganZhi:', firstPoint.ganZhi !== undefined ? '✅' : '❌');
        console.log('  - open/close/high/low:', (firstPoint.open !== undefined && firstPoint.close !== undefined) ? '✅' : '❌');
        console.log('  - score:', firstPoint.score !== undefined ? '✅' : '❌');
        console.log('  - reason:', firstPoint.reason ? '✅' : '❌');
      }

      console.log('\n✅ DeepSeek-V3 可以通过容错逻辑正常使用！');
      console.log('💡 建议：虽然不支持原生 JSON Mode，但容错代码可以处理其输出。');

    } catch (parseError) {
      console.error('❌ JSON 解析失败:', parseError.message);
      console.error('清理后的内容前500字符:', cleanedContent.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ 测试异常:', error.message);
  }
}

testDeepSeekWithFallback();
