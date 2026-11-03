import type {
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

import { client, MODEL } from "./config.js";
import {
  toolDefinitions,
  executeTool,
} from "./tools.js";

const SYSTEM_PROMPT = `
你是一个 TypeScript AI Agent 助手。

你可以使用：
1. get_weather：查询指定城市天气。
2. calculate：执行数学计算。

需要时调用工具。
工具执行后，根据结果回答用户。
请使用中文。
`;

export async function runAgentTurn(
  messages: ChatCompletionMessageParam[],
  userInput: string
) {
  messages.push({
    role: "user",
    content: userInput,
  });

  for (let step = 0; step < 8; step++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      tools: toolDefinitions,
      thinking: { type: "disabled" },
    });

    const assistantMessage = response.choices[0].message;

    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls;

    // 没有工具调用，说明模型已经可以直接回答
    if (!toolCalls || toolCalls.length === 0) {
      return assistantMessage.content ?? "";
    }

    // 逐个执行模型请求的工具
    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;

      console.log(`[Agent] 调用工具：${name}`);
      console.log(`[Agent] 原始参数：${args}`);

      const result = executeTool(name, args);

      console.log(`[Tool] 执行结果：${result}`);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  throw new Error("Agent 超过最大执行次数");
}