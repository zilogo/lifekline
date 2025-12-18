// 使用完整项目提示词测试两个模型
const API_BASE_URL = 'https://llm.tokencloud.ai/v1';
const API_KEY = 'sk-RPo8Q8Lf9_SKoNMSjo5DNA';

// 从 constants.ts 复制的完整系统指令
const BAZI_SYSTEM_INSTRUCTION = `
你是一位世界顶级的八字命理大师。你的任务是根据用户提供的四柱干支和**指定的大运信息**，生成一份"人生K线图"数据和带评分的命理报告。

**核心规则 (Core Rules):**
1. **年龄计算**: 严格采用**虚岁**，数据点必须**从 1 岁开始** (age: 1)。
2. **K线详批**: 每一年的 \`reason\` 必须是该流年的**详细批断**（100字左右），包含具体发生的吉凶事件预测、神煞分析、应对建议。
3. **评分机制**: 所有分析维度（总评、事业、财富等）需给出 0-10 分。

**大运排盘规则 (重要):**
请根据 Prompt 中指定的【大运排序方向 (顺行/逆行)】推导大运序列。

**大运推导逻辑:**
1. **顺行**: 按照六十甲子顺序**往后**推导 (如: 甲子 -> 乙丑 -> 丙寅...)。
2. **逆行**: 按照六十甲子顺序**往前**逆推 (如: 甲子 -> 癸亥 -> 壬戌...)。
3. **起点**: 必须以用户输入的【第一步大运】为起点。
4. **频率**: 每一步大运管**十年**。

**关键字段说明:**
- \`daYun\`: **大运干支** (10年不变)。在同一个大运周期的10年内，该字段必须完全相同。
- \`ganZhi\`: **流年干支** (每年一变)。

**输出 JSON 结构要求:**

{
  "bazi": ["年柱", "月柱", "日柱", "时柱"],
  "summary": "命理总评摘要。",
  "summaryScore": 8,
  "industry": "事业分析内容...",
  "industryScore": 7,
  "wealth": "财富分析内容...",
  "wealthScore": 9,
  "marriage": "婚姻分析内容...",
  "marriageScore": 6,
  "health": "健康分析内容...",
  "healthScore": 5,
  "family": "六亲分析内容...",
  "familyScore": 7,
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
      "reason": "详细的流年详批..."
    }
  ]
}

**K线图逻辑:**
- K线数值 (0-100) 应结合大运和流年的综合作用。大运定基调，流年定应期。
- 颜色逻辑：Close > Open 为吉（绿），Close < Open 为凶（红）。
`;

const USER_PROMPT = `
请根据以下**已经排好的**八字四柱和**指定的大运信息**进行分析。
注：本次数据(系统自动计算)

【基本信息】
性别：男 (乾造)
姓名：测试
出生年份：1990年 (阳历)

【八字四柱】
年柱：庚午 (天干属性：阳)
月柱：己巳
日柱：甲子
时柱：丙寅

【大运核心参数】
1. 起运年龄：3 岁 (虚岁)。
2. 第一步大运：庚午。
3. **排序方向**：顺行 (Forward)。

【必须执行的算法 - 大运序列生成】
请严格按照以下步骤生成数据：

1. **锁定第一步**：确认【庚午】为第一步大运。
2. **计算序列**：根据六十甲子顺序和方向（顺行 (Forward)），推算出接下来的 9 步大运。
   例如：第一步是【庚午】，第二步则是【辛未】（顺排）
3. **填充 JSON**：
   - Age 1 到 2: daYun = "童限"
   - Age 3 到 12: daYun = [第1步大运: 庚午]
   - Age 13 到 22: daYun = [第2步大运]
   - Age 23 到 32: daYun = [第3步大运]
   - ...以此类推直到 100 岁。

【特别警告】
- **daYun 字段**：必须填大运干支（10年一变），**绝对不要**填流年干支。
- **ganZhi 字段**：填入该年份的**流年干支**（每年一变，例如 2024=甲辰，2025=乙巳）。

任务：
1. 确认格局与喜忌。
2. 生成 **1-10 岁 (虚岁)** 的人生流年K线数据（只需10个点即可）。
3. 在 \`reason\` 字段中提供流年详批。
4. 生成带评分的命理分析报告。

请严格按照系统指令生成 JSON 数据。
`;

// JSON 清理函数
function cleanJsonContent(content) {
  let cleanedContent = content.trim();

  if (cleanedContent.includes('```json')) {
    const jsonMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[1].trim();
    }
  } else if (cleanedContent.includes('```')) {
    const jsonMatch = cleanedContent.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[1].trim();
    }
  }

  const firstBrace = cleanedContent.indexOf('{');
  const lastBrace = cleanedContent.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanedContent = cleanedContent.substring(firstBrace, lastBrace + 1);
  }

  return cleanedContent;
}

async function testModelWithFullPrompt(modelName) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`测试模型: ${modelName} (使用完整项目提示词)`);
  console.log(`${'='.repeat(70)}\n`);

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
          { role: "system", content: BAZI_SYSTEM_INSTRUCTION },
          { role: "user", content: USER_PROMPT }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API 请求失败: ${response.status}`);
      console.error(errorText.substring(0, 500));
      return { success: false, model: modelName, error: `HTTP ${response.status}` };
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error('❌ 模型未返回内容');
      return { success: false, model: modelName, error: '无返回内容' };
    }

    console.log(`✓ 响应时间: ${duration}ms`);
    console.log(`✓ 返回内容长度: ${rawContent.length} 字符\n`);

    // 应用清理逻辑
    const cleanedContent = cleanJsonContent(rawContent);

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedContent);
      console.log('✅ JSON 解析成功\n');
    } catch (parseError) {
      console.error('❌ JSON 解析失败:', parseError.message);
      console.error('原始内容前300字符:', rawContent.substring(0, 300));
      return { success: false, model: modelName, error: 'JSON解析失败' };
    }

    // 详细验证
    console.log('📋 字段验证:');
    const checks = {
      'bazi (数组)': Array.isArray(parsedData.bazi) && parsedData.bazi.length === 4,
      'summary': !!parsedData.summary,
      'summaryScore': typeof parsedData.summaryScore === 'number',
      'industry': !!parsedData.industry,
      'industryScore': typeof parsedData.industryScore === 'number',
      'wealth': !!parsedData.wealth,
      'wealthScore': typeof parsedData.wealthScore === 'number',
      'marriage': !!parsedData.marriage,
      'marriageScore': typeof parsedData.marriageScore === 'number',
      'health': !!parsedData.health,
      'healthScore': typeof parsedData.healthScore === 'number',
      'family': !!parsedData.family,
      'familyScore': typeof parsedData.familyScore === 'number',
      'chartPoints (数组)': Array.isArray(parsedData.chartPoints) && parsedData.chartPoints.length > 0
    };

    Object.entries(checks).forEach(([field, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${field}`);
    });

    const allFieldsPass = Object.values(checks).every(v => v);

    if (parsedData.chartPoints && parsedData.chartPoints.length > 0) {
      console.log(`\n📊 chartPoints 详细验证:`);
      console.log(`  - 数据点数量: ${parsedData.chartPoints.length}`);

      const firstPoint = parsedData.chartPoints[0];
      const pointChecks = {
        'age': typeof firstPoint.age === 'number',
        'year': typeof firstPoint.year === 'number',
        'daYun': !!firstPoint.daYun,
        'ganZhi': !!firstPoint.ganZhi,
        'open': typeof firstPoint.open === 'number',
        'close': typeof firstPoint.close === 'number',
        'high': typeof firstPoint.high === 'number',
        'low': typeof firstPoint.low === 'number',
        'score': typeof firstPoint.score === 'number',
        'reason': !!firstPoint.reason && firstPoint.reason.length > 20
      };

      console.log('\n  第一个数据点字段:');
      Object.entries(pointChecks).forEach(([field, passed]) => {
        console.log(`    ${passed ? '✅' : '❌'} ${field}`);
      });

      const allPointFieldsPass = Object.values(pointChecks).every(v => v);

      if (allFieldsPass && allPointFieldsPass) {
        console.log(`\n✅✅ 模型 ${modelName} 完全符合项目要求！`);
        return {
          success: true,
          model: modelName,
          duration,
          dataPoints: parsedData.chartPoints.length,
          quality: 'excellent'
        };
      } else {
        console.log(`\n⚠️ 模型 ${modelName} 部分字段缺失`);
        return {
          success: false,
          model: modelName,
          duration,
          error: '字段不完整',
          quality: 'partial'
        };
      }
    } else {
      console.log(`\n❌ chartPoints 为空或格式错误`);
      return {
        success: false,
        model: modelName,
        error: 'chartPoints 缺失'
      };
    }

  } catch (error) {
    console.error('❌ 测试异常:', error.message);
    return { success: false, model: modelName, error: error.message };
  }
}

async function main() {
  console.log('\n🔬 使用完整项目提示词测试模型能力\n');
  console.log(`API: ${API_BASE_URL}`);
  console.log('测试模型: kim2-thinking, DeepSeek-V3\n');

  const results = [];

  for (const model of ['kim2-thinking', 'DeepSeek-V3']) {
    const result = await testModelWithFullPrompt(model);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('最终测试结果');
  console.log('='.repeat(70) + '\n');

  results.forEach(r => {
    if (r.success) {
      console.log(`✅ ${r.model}: 完全通过 (${r.duration}ms, ${r.dataPoints}个数据点)`);
    } else {
      console.log(`❌ ${r.model}: ${r.error}`);
    }
  });

  const passedModels = results.filter(r => r.success);
  if (passedModels.length > 0) {
    console.log(`\n💡 推荐使用: ${passedModels[0].model}`);
  } else {
    console.log('\n⚠️ 两个模型都未完全通过测试，可能需要调整提示词或使用其他模型');
  }
}

main().catch(console.error);
