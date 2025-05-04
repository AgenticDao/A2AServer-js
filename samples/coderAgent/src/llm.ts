import { ChatOpenAI } from "@langchain/openai";
import { CONFIG, env } from "./config";

/**
 * Creates and configures a ChatOpenAI instance with project settings.
 * 
 * @param temperature Override the default temperature
 * @param modelName Override the default model name
 * @returns Configured ChatOpenAI instance
 */
export function createLLM(
  temperature = CONFIG.baseTemperature,
  modelName = CONFIG.modelName
) {
  // Create and configure the OpenAI chat model
  return new ChatOpenAI({
    openAIApiKey: env.OPENAI_API_KEY,
    modelName: modelName,
    temperature: temperature,
    maxTokens: CONFIG.maxTokens,
  });
} 