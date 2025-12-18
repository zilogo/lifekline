
import { UserInput, LifeDestinyResult, Gender } from "../types";
import { BAZI_SYSTEM_INSTRUCTION } from "../constants";
import { WORKER_URL } from "../config/workerConfig";

// Helper to determine stem polarity
const getStemPolarity = (pillar: string): 'YANG' | 'YIN' => {
  if (!pillar) return 'YANG'; // default
  const firstChar = pillar.trim().charAt(0);
  const yangStems = ['甲', '丙', '戊', '庚', '壬'];
  const yinStems = ['乙', '丁', '己', '辛', '癸'];
  
  if (yangStems.includes(firstChar)) return 'YANG';
  if (yinStems.includes(firstChar)) return 'YIN';
  return 'YANG'; // fallback
};

export const generateLifeAnalysis = async (input: UserInput): Promise<LifeDestinyResult> => {

  const { modelName } = input;

  // 验证 Worker 是否配置
  if (!WORKER_URL || WORKER_URL.trim().length === 0) {
    throw new Error("Worker 未配置，请联系开发者");
  }

  const genderStr = input.gender === Gender.MALE ? '男 (乾造)' : '女 (坤造)';
  const startAgeInt = parseInt(input.startAge) || 1;
  
  // Calculate Da Yun Direction accurately
  const yearStemPolarity = getStemPolarity(input.yearPillar);
  let isForward = false;

  if (input.gender === Gender.MALE) {
    isForward = yearStemPolarity === 'YANG';
  } else {
    isForward = yearStemPolarity === 'YIN';
  }

  const daYunDirectionStr = isForward ? '顺行 (Forward)' : '逆行 (Backward)';
  
  const directionExample = isForward
    ? "例如：第一步是【戊申】，第二步则是【己酉】（顺排）"
    : "例如：第一步是【戊申】，第二步则是【丁未】（逆排）";

  // Add calculation mode indicator
  const calculationNote = input.isManualOverride
    ? "(用户手动输入)"
    : "(系统自动计算)";

  const userPrompt = `
    请根据以下**已经排好的**八字四柱和**指定的大运信息**进行分析。
    注：本次数据${calculationNote}
    
    【基本信息】
    性别：${genderStr}
    姓名：${input.name || "未提供"}
    出生年份：${input.birthYear}年 (阳历)
    
    【八字四柱】
    年柱：${input.yearPillar} (天干属性：${yearStemPolarity === 'YANG' ? '阳' : '阴'})
    月柱：${input.monthPillar}
    日柱：${input.dayPillar}
    时柱：${input.hourPillar}
    
    【大运核心参数】
    1. 起运年龄：${input.startAge} 岁 (虚岁)。
    2. 第一步大运：${input.firstDaYun}。
    3. **排序方向**：${daYunDirectionStr}。
    
    【必须执行的算法 - 大运序列生成】
    请严格按照以下步骤生成数据：
    
    1. **锁定第一步**：确认【${input.firstDaYun}】为第一步大运。
    2. **计算序列**：根据六十甲子顺序和方向（${daYunDirectionStr}），推算出接下来的 9 步大运。
       ${directionExample}
    3. **填充 JSON**：
       - Age 1 到 ${startAgeInt - 1}: daYun = "童限"
       - Age ${startAgeInt} 到 ${startAgeInt + 9}: daYun = [第1步大运: ${input.firstDaYun}]
       - Age ${startAgeInt + 10} 到 ${startAgeInt + 19}: daYun = [第2步大运]
       - Age ${startAgeInt + 20} 到 ${startAgeInt + 29}: daYun = [第3步大运]
       - ...以此类推直到 100 岁。
    
    【特别警告】
    - **daYun 字段**：必须填大运干支（10年一变），**绝对不要**填流年干支。
    - **ganZhi 字段**：填入该年份的**流年干支**（每年一变，例如 2024=甲辰，2025=乙巳）。
    
    任务：
    1. 确认格局与喜忌。
    2. 生成 **1-100 岁 (虚岁)** 的人生流年K线数据。
    3. 在 \`reason\` 字段中提供流年详批。
    4. 生成带评分的命理分析报告。
    
    请严格按照系统指令生成 JSON 数据。
  `;

  try {
    // 创建 AbortController 用于超时控制（5分钟超时）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5分钟

    try {
      // 调用 Cloudflare Worker 代理（保护 API Key）- 流式输出
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName, // 可选，Worker 会使用默认值
          messages: [
            { role: "system", content: BAZI_SYSTEM_INSTRUCTION },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API 请求失败: ${response.status} - ${errText}`);
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let rawBuffer = ''; // 保存原始响应文本
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          clearTimeout(timeoutId); // 流结束，清除超时定时器
          break;
        }

        // 解码数据块
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        rawBuffer += chunk; // 同时保存原始文本

        // 按行分割处理 SSE 数据
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后不完整的行

        for (const line of lines) {
          const trimmedLine = line.trim();

          // 跳过空行和注释
          if (!trimmedLine || trimmedLine.startsWith(':')) {
            continue;
          }

          // 解析 SSE 格式：data: {...}
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6); // 移除 "data: " 前缀

            // 检查是否结束
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              const message = parsed.choices?.[0]?.message?.content; // 处理非流式响应

              if (delta) {
                accumulatedContent += delta;
              } else if (message) {
                // 如果是完整的 message 而不是 delta，直接使用
                accumulatedContent = message;
              }
            } catch (e) {
              console.warn('解析 SSE 数据失败:', data.substring(0, 100));
            }
          }
        }
      }

      clearTimeout(timeoutId); // 确保清除超时定时器

      // 如果 SSE 解析没有提取到内容，尝试从原始文本中提取
      let content = accumulatedContent;
      if (!content && rawBuffer) {
        console.warn('SSE 解析未提取到内容，尝试解析原始响应');
        // 移除所有 "data: " 前缀，提取 JSON
        const dataLines = rawBuffer.split('\n')
          .filter(line => line.trim().startsWith('data: '))
          .map(line => line.trim().slice(6));

        if (dataLines.length > 0) {
          try {
            // 尝试解析第一个完整的响应
            const firstData = JSON.parse(dataLines[0]);
            content = firstData.choices?.[0]?.message?.content || '';
          } catch (e) {
            console.error('备用解析失败:', e);
          }
        }
      }

      if (!content) {
        throw new Error("模型未返回任何内容。");
      }

      // 尝试提取JSON内容（处理模型可能返回的额外文本）
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

      // 解析 JSON
      let data;
      try {
        data = JSON.parse(cleanedContent);
      } catch (parseError: any) {
        console.error("JSON解析失败:", parseError);
        console.error("原始内容:", content);
        console.error("清理后内容:", cleanedContent);
        throw new Error(`AI返回的数据格式无效，无法解析为JSON。请尝试更换模型或检查API配置。详细错误: ${parseError.message}`);
      }

      // 简单校验数据完整性
      if (!data.chartPoints || !Array.isArray(data.chartPoints)) {
        throw new Error("模型返回的数据格式不正确（缺失 chartPoints）。");
      }

      return {
        chartData: data.chartPoints,
        analysis: {
          bazi: data.bazi || [],
          summary: data.summary || "无摘要",
          summaryScore: data.summaryScore || 5,
          industry: data.industry || "无",
          industryScore: data.industryScore || 5,
          wealth: data.wealth || "无",
          wealthScore: data.wealthScore || 5,
          marriage: data.marriage || "无",
          marriageScore: data.marriageScore || 5,
          health: data.health || "无",
          healthScore: data.healthScore || 5,
          family: data.family || "无",
          familyScore: data.familyScore || 5,
        },
      };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // 处理超时错误
      if (fetchError.name === 'AbortError') {
        throw new Error('请求超时（5分钟），请稍后重试或联系管理员');
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("Gemini/OpenAI API Error:", error);
    throw error;
  }
};
