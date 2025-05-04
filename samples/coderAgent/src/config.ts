import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
config();

// Define schema for environment variables
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  PORT: z.string().default('41241').transform(Number),
  MODEL_NAME: z.string().default('gpt-4o'),
});

// Parse and validate environment variables
export const env = envSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  PORT: process.env.PORT,
  MODEL_NAME: process.env.MODEL_NAME,
});

// Configuration constants
export const CONFIG = {
  baseTemperature: 0,
  maxTokens: 4000,
  port: env.PORT,
  modelName: env.MODEL_NAME,
}; 