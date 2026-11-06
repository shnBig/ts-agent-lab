import "dotenv/config";

import { ChatDeepSeek } from "@langchain/deepseek";

import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";

const apiKey = process.env.DEEPSEEK_API_KEY;
const modelName = process.env.DEEPSEEK_MODEL || "deepseek-flash";

if (!apiKey) {
  throw new Error("请配置 DEEPSEEK_API_KEY");
}

// 创建 LangChain 的 DeepSeek 模型实例
const model = new ChatDeepSeek({
  apiKey,
  model: modelName,
  temperature: 0.7,
  maxRetries: 2,
  timeout: 30_000,

  // 明确关闭思考模式，先专注学习 LangChain 的基础调用
  modelKwargs: {
    thinking: {
      type: "disabled",
    },
  },
});
// console.log(ChatDeepSeek.lc_name());
async function main() {
//   正常一次性输出
  const response = await model.invoke([
    new SystemMessage("你是一个专业的 TypeScript 技术助手，请使用中文回答。"),
    new HumanMessage("请解释一下 TypeScript 中 unknown 和 any 的区别。"),
  ]);
  console.log("模型返回的完整消息：");
  console.dir(response, { depth: null });

  console.log("\n模型回答：");
  console.log(response.content);
}

main().catch(console.error);
