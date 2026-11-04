import "dotenv/config";

import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// 1. 初始化 DeepSeek 模型
const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
  throw new Error("请配置 DEEPSEEK_API_KEY");
}

const model = new ChatDeepSeek({
  apiKey,
  model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
  temperature: 0.7,
});

// 2. 定义 Prompt 模板
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一位资深的 {role}。

请使用中文回答，解释要清晰，最好结合代码示例。`,
  ],
  [
    "human",
    `我正在学习 {topic}。

请重点解释：{question}`,
  ],
]);

// 3. 创建输出解析器
const parser = new StringOutputParser();

// 4. 组合 Runnable
const chain = prompt
  .pipe(model)
  .pipe(parser);

// 5. 执行
async function main() {
  const result = await chain.invoke({
    role: "TypeScript 前端工程师",
    topic: "Vue 3",
    question: "Vue 3 的 reactive 是如何实现响应式的？",
  });

  console.log("模型回答：");
  console.log(result);
}

main().catch((error) => {
  console.error("Chain 执行失败：", error);
});