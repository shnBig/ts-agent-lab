import { z } from "zod";
import { defineTool, createToolRegistry } from "./tool-registry.js";

// 1. 天气工具的参数校验规则
const weatherSchema = z.object({
  city: z.string().trim().min(1, "城市名称不能为空"),
});

// 2. 计算器工具的参数校验规则
const calculateSchema = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
  a: z.number().finite(),
  b: z.number().finite(),
});

// 3. 创建工具注册表
export const tools = createToolRegistry({
  get_weather: defineTool({
    definition: {
      type: "function",
      function: {
        name: "get_weather",
        description: "查询指定城市的天气",
        parameters: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "城市名称",
            },
          },
          required: ["city"],
        },
      },
    },
    schema: weatherSchema,
    handler: ({ city }) => {
      // 这里暂时模拟天气数据，后续可以接真实天气 API
      return {
        city,
        temperature: 25,
        weather: "晴天",
      };
    },
  }),

  calculate: defineTool({
    definition: {
      type: "function",
      function: {
        name: "calculate",
        description: "执行两个数字之间的数学运算",
        parameters: {
          type: "object",
          properties: {
            operation: {
              type: "string",
              enum: ["add", "subtract", "multiply", "divide"],
              description: "运算类型",
            },
            a: {
              type: "number",
              description: "第一个数字",
            },
            b: {
              type: "number",
              description: "第二个数字",
            },
          },
          required: ["operation", "a", "b"],
        },
      },
    },
    schema: calculateSchema,
    handler: ({ operation, a, b }) => {
      if (operation === "add") return { result: a + b };
      if (operation === "subtract") return { result: a - b };
      if (operation === "multiply") return { result: a * b };

      if (b === 0) {
        throw new Error("除数不能为 0");
      }

      return { result: a / b };
    },
  }),
});

// 提供给 DeepSeek 的工具定义
export const toolDefinitions = tools.definitions;

// Agent 调用这个函数执行工具
export const executeTool = tools.execute;