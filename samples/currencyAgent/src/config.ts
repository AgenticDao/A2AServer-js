/**
 * Configuration module for Coder Agent
 * Loads environment variables from .env file and provides centralized access
 */
import { config } from "dotenv";

// Load environment variables from .env file
config();

// Required environment variables
const requiredEnvVars = ['OPENAI_API_KEY'];

// Check for required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: Required environment variable ${envVar} is not set.`);
    process.exit(1);
  }
}

export default {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || "gpt-4o",
    apiBase: process.env.OPENAI_API_BASE,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.2"),
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || "41241"),
    host: process.env.HOST || "localhost",
    endpoint: process.env.SERVER_ENDPOINT || `http://${process.env.HOST || "localhost"}:${process.env.PORT || "41241"}`,
  },

  // Other Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};
