/**
 * OpenAI models configuration for the Crypto Market Agent
 */
import { ChatOpenAI } from "@langchain/openai";
import config from "./config";

export const llmModel = new ChatOpenAI({
  modelName: config.openai.model,
  apiKey: config.openai.apiKey,
  configuration: {
    baseURL: config.openai.apiBase,
  },
  temperature: config.openai.temperature,
});

export { z } from "zod"; 