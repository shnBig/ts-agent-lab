import "dotenv/config";
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatDeepSeek } from "@langchain/deepseek";
import { createAgent } from "langchain";

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  throw new Error("请配置 DEEPSEEK_API_KEY");
}
// =======================================
// 1. 定义 State
// =======================================
const GraphState = Annotation.Root({
  question: Annotation<string>(),

  category: Annotation<"technical" | "general" | "unknown">(),

  answer: Annotation<string>(),
});

// =======================================
// 1.0 定义工具
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
// 1.1 创建deepseek模型
const model = new ChatDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
  temperature: 0,
  modelKwargs: {
    thinking: { type: "disabled" },
  },
});

// 1.2 创建agent
const agent = createAgent({
  model,
  tools: [calculatorTool],
  systemPrompt: "你是一个专业的问题助手，只能回答技术问题和普通问题。",
});
// =======================================

// =======================================
// 2. 定义分类节点
// =======================================

async function classifyNode(state: typeof GraphState.State) {
  console.log("\n[classifyNode] 开始分析问题");

  console.log("用户问题：", state.question);

  const technicalKeywords = [
    "vue",
    "typescript",
    "javascript",
    "react",
    "vite",
    "langchain",
    "langgraph",
    "代码",
    "原理",
    "响应式",
  ];

  const question = state.question.toLowerCase();

  const isTechnical = technicalKeywords.some((keyword) =>
    question.includes(keyword),
  );

  const category = isTechnical ? "technical" : "general";

  console.log("问题分类：", category);

  return {
    category,
  };
}

// =======================================
// 3. 定义路由函数
// =======================================

function routeByCategory(state: typeof GraphState.State) {
  console.log("\n[routeByCategory] 判断下一步执行路径");

  console.log("当前分类：", state.category);

  return state.category;
}

// =======================================
// 4. 定义技术问题回答节点
// =======================================

async function technicalAnswerNode(state: typeof GraphState.State) {
  console.log("\n[technicalAnswerNode] 执行技术回答");

  return {
    answer: `这是一个技术问题：${state.question}。我们需要从技术原理和代码实现两个方面进行分析。`,
  };
}

// =======================================
// 5. 定义普通问题回答节点
// =======================================

async function generalAnswerNode(state: typeof GraphState.State) {
  console.log("\n[generalAnswerNode] 执行普通回答");
  // 调用agent
  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: state.question,
      },
    ],
  });

  for (const message of result.messages) {
    if ("tool_calls" in message && message.tool_calls?.length) {
      console.log("工具调用：", message.tool_calls);
    }
  }
  return {
    answer: result.messages[result.messages.length - 1].content,
  };
}

// =======================================
// 6. 构建图
// =======================================
const graphBuilder = new StateGraph(GraphState)
  .addNode("classifyNode", classifyNode)
  .addNode("technicalAnswerNode", technicalAnswerNode)
  .addNode("generalAnswerNode", generalAnswerNode)
  .addEdge(START, "classifyNode")
  .addConditionalEdges("classifyNode", routeByCategory, {
    technical: "technicalAnswerNode",
    general: "generalAnswerNode",
  })
  .addEdge("technicalAnswerNode", END)
  .addEdge("generalAnswerNode", END);

// =======================================
// 7. 编译
// =======================================
const graph = graphBuilder.compile();

// =======================================
// 8. 执行
// =======================================
async function main() {
  const result = await graph.invoke({
    question: "帮我算一下一加一呗",
    category: "unknown",
    answer: "",
  });
  console.log("\n========== 最终 State ==========");
  console.dir(result, { depth: null });
}

main().catch((error) => {
  console.error("Graph 执行失败：", error);
});
