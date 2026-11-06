
import {
  Annotation,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";

// ===================================
// 1. 定义整个图的 State
// ===================================

const GraphState = Annotation.Root({
  question: Annotation<string>(),
  analysis: Annotation<string[]>({
    reducer: (current, update) => {
      return current.concat(update);
    },
    default: () => [],
  }),
  answer: Annotation<string>(),
});

// ===================================
// 2. 定义 Node：分析问题
// ===================================

async function analyzeNode(
  state: typeof GraphState.State
) {
  console.log("\n[analyzeNode] 开始分析问题");

  console.log("收到的问题：", state.question);

  const analysis = `用户提出的是一个技术问题，需要解释：${state.question}`;

  console.log("分析完成：", analysis);

  // 只返回自己需要更新的字段
  return {
    analysis:[analysis],
  };
}

// ===================================
// 3. 定义 Node：生成回答
// ===================================

async function answerNode(
  state: typeof GraphState.State
) {
  console.log("\n[answerNode] 开始生成回答");

  console.log("读取分析结果：", state.analysis);

  const answer = `根据分析，针对你的问题「${state.question}」，${state.analysis}`;

  console.log("回答生成完成：", answer);

  return {
    answer,
  };
}

// ===================================
// 4. 构建图
// ===================================

const graphBuilder = new StateGraph(GraphState)
  .addNode("analyzeNode", analyzeNode)
  .addNode("answerNode", answerNode)
  .addEdge(START, "analyzeNode")
  .addEdge("analyzeNode", "answerNode")
  .addEdge("answerNode", END);

// ===================================
// 5. 编译图
// ===================================

const graph = graphBuilder.compile();

// ===================================
// 6. 执行图
// ===================================

async function main() {
  const result = await graph.invoke({
    question: "Vue 3 的 reactive 是如何实现响应式的？",
    analysis: [],
    answer: "",
  });

  console.log("\n========== 最终 State ==========");
  console.dir(result, { depth: null });
}

main().catch((error) => {
  console.error("Graph 执行失败：", error);
});
