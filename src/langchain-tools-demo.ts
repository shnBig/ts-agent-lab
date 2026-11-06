
import "dotenv/config";

import { ChatDeepSeek } from "@langchain/deepseek";
import { tool } from "@langchain/core/tools";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { z } from "zod";

const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
  throw new Error("请配置 DEEPSEEK_API_KEY");
}

// 1. 定义工具
const calculatorTool = tool(
  async ({ a, b, operation }) => {
    let result: number;

    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) {
          throw new Error("除数不能为 0");
        }
        result = a / b;
        break;
      default:
        throw new Error("不支持的运算类型");
    }

    console.log(`[工具执行] ${a} ${operation} ${b} = ${result}`);
    return String(result);
  },
  {
    name: "calculator",
    description: "执行两个数字之间的加减乘除运算",
    schema: z.object({
      a: z.number().describe("第一个数字"),
      b: z.number().describe("第二个数字"),
      operation: z
        .enum(["add", "subtract", "multiply", "divide"])
        .describe("运算类型"),
    }),
  }
);

// 2. 创建模型
const model = new ChatDeepSeek({
  apiKey,
  model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
  temperature: 0,
  modelKwargs: {
    thinking: { type: "disabled" },
  },
});

// 3. 绑定工具
const tools = [calculatorTool];
const modelWithTools = model.bindTools(tools);

const toolByName = new Map(
  tools.map((item) => [item.name, item])
);

// 4. Agent 执行循环
async function runAgent(userInput: string) {
  const messages: BaseMessage[] = [
    new SystemMessage(
      "你是一个智能助手。涉及数学计算时，必须使用 calculator 工具，不能自己心算。"
    ),
    new HumanMessage(userInput),
  ];

  const maxIterations = 5;

  for (let i = 0; i < maxIterations; i++) {
    console.log(`\n--- 第 ${i + 1} 轮模型调用 ---`);

    // 请求模型
    const aiMessage = await modelWithTools.invoke(messages);

    // 把模型的完整消息放进历史
    messages.push(aiMessage);

    const toolCalls = aiMessage.tool_calls ?? [];

    // 没有工具调用，说明模型已经准备好直接回答
    if (toolCalls.length === 0) {
      console.log("\n[最终回答]");
      console.log(aiMessage.content);
      return;
    }

    // 逐个执行模型请求的工具
    for (const toolCall of toolCalls) {
      console.log(
        `[模型请求工具] ${toolCall.name}`,
        toolCall.args
      );

      const selectedTool = toolByName.get(toolCall.name);

      if (!selectedTool) {
        throw new Error(`不存在工具：${toolCall.name}`);
      }

      if (!toolCall.id) {
        throw new Error("工具调用缺少 tool_call_id");
      }

      // 真正执行本地 TypeScript 函数
      const result = await selectedTool.invoke(toolCall.args);

      console.log(`[工具执行结果] ${result}`);

      // 把工具结果作为 ToolMessage 放回消息历史
      messages.push(
        new ToolMessage({
          content: String(result),
          tool_call_id: toolCall.id,
        })
      );
    }
  }

  throw new Error("Agent 超过最大执行轮数");
}

// 5. 启动
async function main() {
  await runAgent("帮我计算 125 乘以 36，然后告诉我结果。");
}

main().catch((error) => {
  console.error("Agent 执行失败：", error);
});
