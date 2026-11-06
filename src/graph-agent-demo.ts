import { ChatDeepSeek } from "@langchain/deepseek";
import { tool } from "@langchain/core/tools";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { z } from "zod";

import {
  StateGraph,
  MessagesAnnotation,
  START,
  END,
} from "@langchain/langgraph";

import {
  ToolNode,
  toolsCondition,
} from "@langchain/langgraph/prebuilt";

import { MODEL } from "./config.js";

// 1. 创建 DeepSeek 模型
const model = new ChatDeepSeek({
  model: MODEL,
  temperature: 0,
  modelKwargs: {
    thinking: {
      type: "disabled",
    },
  },
});

// 2. 定义计算器工具
const calculatorTool = tool(
  async ({ a, b, operation }) => {
    let result: number;

    switch (operation) {
      case "add":
        result = a + b;
        break;

      case "multiply":
        result = a * b;
        break;

      default:
        throw new Error("不支持的运算");
    }

    return String(result);
  },
  {
    name: "calculator",
    description: "计算两个数字的加法或乘法",
    schema: z.object({
      a: z.number().describe("第一个数字"),
      b: z.number().describe("第二个数字"),
      operation: z
        .enum(["add", "multiply"])
        .describe("运算类型"),
    }),
  }
);

const tools = [calculatorTool];

// 3. 把工具描述绑定到模型
const modelWithTools = model.bindTools(tools);

// 4. 定义 Agent 节点
const agentNode = async (
  state: typeof MessagesAnnotation.State
) => {
  const response = await modelWithTools.invoke([
    new SystemMessage(
      "你是一个数学助手。遇到需要计算的任务时，使用计算器工具。拿到工具结果后，再给用户清晰的最终答案。"
    ),
    ...state.messages,
  ]);

  return {
    messages: [response],
  };
};

// 5. 定义工具执行节点
const toolsNode = new ToolNode(tools);

// 6. 创建图
const graph = new StateGraph(MessagesAnnotation)
  // 注册节点
  .addNode("agent", agentNode)
  .addNode("tools", toolsNode)

  // 起点进入 agent
  .addEdge(START, "agent")

  // agent 执行后，根据是否存在工具调用决定下一步
  .addConditionalEdges(
    "agent",
    toolsCondition,
    ["tools", END]
  )

  // 工具执行完毕，重新回到 agent
  .addEdge("tools", "agent")

  // 编译图
  .compile();

  // 7. 执行 Agent
async function main() {
  const result = await graph.invoke(
    {
      messages: [
        new HumanMessage(
          "帮我计算 128 × 256，再告诉我结果是否大于 30000。"
        ),
      ],
    },
    {
      recursionLimit: 10,
    }
  );

  console.log("\n========== Agent 执行记录 ==========\n");

  for (const message of result.messages) {
    console.log(`[${message.getType()}]`);

    if (message instanceof AIMessage) {
      console.log("内容：", message.content);
      console.log("工具调用：", message.tool_calls);
    } else {
      console.log("内容：", message.content);
    }

    console.log("--------------------------------");
  }
}

main().catch(console.error);