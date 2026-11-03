import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { runAgentTurn } from "./agent.js";

const rl = createInterface({
  input: stdin,
  output: stdout,
});

// 当前会话的消息历史
const messages:ChatCompletionMessageParam[] = [];

async function main() {
  console.log("DeepSeek TypeScript Agent");
  console.log("输入 exit 退出");

  while (true) {
    const input = await rl.question("\n你：");

    const question = input.trim();

    if (!question) continue;

    if (question.toLowerCase() === "exit") {
      break;
    }

    try {
      const answer = await runAgentTurn(
        messages,
        question
      );

      console.log("\nAgent：", answer);
    } catch (error) {
      console.error("执行失败：", error);
    }
  }

  rl.close();
}

main();