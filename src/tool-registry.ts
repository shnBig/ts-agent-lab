import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { z } from "zod";

// 一个已经注册的工具
type RegisteredTool = {
  definition: ChatCompletionTool;
  execute: (rawArgs: string) => string;
};

// 定义工具时，保留 Schema 与 handler 之间的类型关系
type DefineToolOptions<TSchema extends z.ZodType> = {
  definition: ChatCompletionTool;
  schema: TSchema;
  handler: (args: z.infer<TSchema>) => unknown;
};

// 创建一个工具
export function defineTool<TSchema extends z.ZodType>(
  options: DefineToolOptions<TSchema>
): RegisteredTool {
  const { definition, schema, handler } = options;

  return {
    definition,

    execute(rawArgs) {
      // 第一步：解析 JSON 字符串
      let parsedArgs: unknown;

      try {
        parsedArgs = JSON.parse(rawArgs);
      } catch {
        return JSON.stringify({
          error: "工具参数不是合法的 JSON",
        });
      }

      // 第二步：使用 Zod 验证参数
      const validation = schema.safeParse(parsedArgs);

      if (!validation.success) {
        return JSON.stringify({
          error: "工具参数校验失败",
          details: validation.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      // 第三步：执行工具函数
      try {
        const result = handler(validation.data);

        return JSON.stringify({
          success: true,
          data: result,
        });
      } catch (error) {
        return JSON.stringify({
          error: error instanceof Error
            ? error.message
            : "工具执行失败",
        });
      }
    },
  };
}

// 创建工具注册表
export function createToolRegistry<
  TTools extends Record<string, RegisteredTool>
>(toolMap: TTools) {
  // 所有工具定义，交给模型使用
  const definitions = Object.values(toolMap).map(
    (tool) => tool.definition
  );

  // 根据工具名称，找到并执行工具
  function execute(name: string, rawArgs: string): string {
    const tool = toolMap[name];

    if (!tool) {
      return JSON.stringify({
        error: `不存在名为 ${name} 的工具`,
      });
    }

    return tool.execute(rawArgs);
  }

  return {
    definitions,
    execute,
  };
}