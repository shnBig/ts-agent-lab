
import "dotenv/config";

import { ChatDeepSeek } from "@langchain/deepseek";
import { createAgent } from "langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
  throw new Error("请配置 DEEPSEEK_API_KEY");
}

// 1. 创建计算器工具
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
    }

    console.log(
      `[工具执行] ${a} ${operation} ${b} = ${result}`
    );

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

// 2. 创建 DeepSeek 模型
const model = new ChatDeepSeek({
  apiKey,
  model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
  temperature: 0,
  modelKwargs: {
    thinking: { type: "disabled" },
  },
});

// 3. 创建 Agent
const agent = createAgent({
  model,
  tools: [calculatorTool],
  systemPrompt: `
你是一个智能助手。
涉及数学计算时，必须调用 calculator 工具。
不能自己心算，也不要编造计算结果。
请使用中文回答。
`,
});

// 4. 调用 Agent
async function main() {
  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "先计算 125 乘以 36，再加上 500，告诉我最终结果。",
      },
    ],
  });

  console.log("\n========== Agent 执行结果 ==========");

  for (const message of result.messages) {
    console.log("\n消息类型：", message.getType());
    console.log("消息内容：", message.content);

    if ("tool_calls" in message && message.tool_calls?.length) {
      console.log("工具调用：", message.tool_calls);
    }
  }

  console.log("\n========== 最终答案 ==========");
  console.log(result.messages.at(-1)?.content);
}

main().catch((error) => {
  console.error("Agent 执行失败：", error);
});
