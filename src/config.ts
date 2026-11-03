import "dotenv/config";
import OpenAI from "openai";

const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
  throw new Error("请配置 DEEPSEEK_API_KEY");
}

export const client = new OpenAI({
  apiKey,
  baseURL: "https://api.deepseek.com",
});

export const MODEL =
  process.env.DEEPSEEK_MODEL || "deepseek-flash";