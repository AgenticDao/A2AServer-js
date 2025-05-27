import { llmModel } from './openai'
import { tool } from '@langchain/core/tools';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import {
  StateGraph,
  MessagesAnnotation,
  END,
  START
} from "@langchain/langgraph";
import { z } from 'zod';
import axios from 'axios';
import { HumanMessage, SystemMessage, isHumanMessage } from '@langchain/core/messages';
import { RunnableSequence } from '@langchain/core/runnables';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import config from './config';

// Define the system prompt for the emoji generation agent
const SYSTEM_PROMPT = `
System Prompt: Emoji Generation LLM Agent

Objective:
Your goal is to help users generate custom emoji images based on their descriptions. You should understand the user's request, generate appropriate emoji images using the image generation service, and provide the resulting image URLs in a user-friendly format.

General Guidelines:

	1.	Always Structure Your Responses: Begin with understanding the user's emoji request, then provide the generated emoji image(s) with clear descriptions.
	2.	Be Creative and Helpful: Interpret user requests creatively while staying true to their intent. If the request is unclear, ask for clarification.
	3.	Use Clear and Friendly Language: Make your responses accessible and engaging for all users.

Inputs You'll Receive:

	•	Emoji Description: The user's description of what kind of emoji they want to generate.
	•	Style Preferences: Any specific style, color, or characteristic preferences.

Response Format:

Your response should be structured in the following way:

	1.	Understanding (1-2 Sentences):
	•	Acknowledge what the user wants to create and any specific requirements.
	2.	Generated Emoji:
	•	Present the generated emoji image with a clear description.
	•	Provide the image URL for easy access.
	3.	Additional Information (Optional):
	•	Suggest variations or related emoji ideas if appropriate.
	•	Provide usage suggestions for the generated emoji.

Response status instructions:
- Set response status to input_required if the user needs to provide more information about their emoji request
- Set response status to error if there is an error while generating the emoji
- Set response status to completed if the emoji generation is complete
`;

// EmojiData type definition
interface EmojiData {
  id: string;
  prompt: string;
  imageUrl: string;
  downloadUrl?: string;
  timestamp: string;
  model: string;
}

// Define token usage tracking
interface TokenUsage {
  id: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

// Define emoji agent schema
interface EmojiAgentSchema {
  id: string;
  prompt: string;
  timestamp: string;
  response: string;
  emoji_data: EmojiData | { error: string };
}

interface EmojiAgentSchemaLog {
  id: string;
  agent_name: string;
  agent_description: string;
  logs: EmojiAgentSchema[];
  time_stamp: string;
}

// Get image service configuration
const IMAGE_SERVICE_API_BASE = config.imageService.apiBase;
const IMAGE_SERVICE_API_KEY = config.imageService.apiKey;
const IMAGE_SERVICE_MODEL = config.imageService.model;

// Generate emoji image tool
const generateEmojiTool = tool(async (input) => {
  const { prompt } = input;
  console.log(`Generating emoji for prompt: ${prompt}`);
  console.log(`IMAGE_SERVICE_API_BASE: ${IMAGE_SERVICE_API_BASE}`);
  console.log(`IMAGE_SERVICE_API_KEY: ${IMAGE_SERVICE_API_KEY}`);
  console.log(`IMAGE_SERVICE_MODEL: ${IMAGE_SERVICE_MODEL}`);
  
  try {
    const requestBody = {
      stream: false,
      model: IMAGE_SERVICE_MODEL,
      messages: [
        {
          content: "You are a emoji generate service to help user create a emoji picture",
          role: "system"
        },
        {
          content: prompt,
          role: "user"
        }
      ]
    };

    const response = await axios.post(
      IMAGE_SERVICE_API_BASE,
      requestBody,
      {
        headers: {
          'Authorization': IMAGE_SERVICE_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes timeout for image generation
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      
      // Extract the first image URL from the content (OpenAI videos domain with query parameters)
      const imageUrlMatch = content.match(/\((https:\/\/videos\.openai\.com[^\)]+)\)/);
      
      if (imageUrlMatch) {
        return {
          success: true,
          id: uuidv4(),
          prompt: prompt,
          imageUrl: imageUrlMatch[1],
          downloadUrl: imageUrlMatch[1],
          timestamp: new Date().toISOString(),
          model: IMAGE_SERVICE_MODEL,
          fullResponse: `Successfully generated emoji for: "${prompt}"\n\n![${prompt}](${imageUrlMatch[1]})`,
          formatted: {
            prompt: prompt,
            imageUrl: imageUrlMatch[1],
            message: `Successfully generated emoji for: "${prompt}"`
          }
        };
      } else {
        console.warn(`No image URL found in response for prompt: ${prompt}`);
        return {
          error: "No image URL found in response",
          details: `The image generation service responded but no image URL was found. Response: ${content.substring(0, 200)}...`
        };
      }
    } else {
      console.warn(`Invalid response structure for prompt: ${prompt}`);
      return {
        error: "Invalid response structure",
        details: "The image generation service returned an unexpected response format."
      };
    }
  } catch (error) {
    console.error(`Error generating emoji for prompt "${prompt}":`, error);
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return { 
          error: "Request timeout", 
          details: "The image generation service is taking longer than expected. Please try again or use a simpler prompt."
        };
      }
      if (error.response) {
        if (error.response.status === 429) {
          return { 
            error: "Rate limit exceeded", 
            details: "The image generation service rate limit has been exceeded. Please try again later."
          };
        }
        return { 
          error: `API error: ${error.response.status}`, 
          details: error.response.data?.message || 'Unknown error' 
        };
      }
    }
    return { 
      error: "Failed to generate emoji", 
      details: "Please try again later. If the problem persists, try using a different prompt." 
    };
  }
}, {
  name: "generate_emoji",
  description: "Generate a custom emoji image based on the user's description.",
  schema: z.object({
    prompt: z.string().describe("The description of the emoji to generate (e.g., 'a happy cat with sunglasses')"),
  }),
});

// Create the tools array
const tools = [generateEmojiTool];

// Create the tool node for the graph
const toolNodeForGraph = new ToolNode(tools);

// Function to determine if the workflow should continue
const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return END;
};

// Bind the tools to the model
const modelWithTools = llmModel.bindTools(tools);

// Function to call the model with the current state
const callModel = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  
  // If this is the first call (only human message), prepend the system message
  if (messages.length === 1 && isHumanMessage(messages[0])) {
    const systemMessage = new SystemMessage(SYSTEM_PROMPT);
    const response = await modelWithTools.invoke([systemMessage, ...messages]);
    return { messages: response };
  }
  
  // Otherwise, proceed with existing messages
  const response = await modelWithTools.invoke(messages);
  return { messages: response };
};

// Create the emoji agent workflow
const workflow = new StateGraph(MessagesAnnotation)
  // Define the two nodes we will cycle between
  .addNode("agent", callModel)
  .addNode("tools", toolNodeForGraph)
  // Set the entrypoint
  .addEdge(START, "agent")
  // Add conditional edges
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  // Connect the tools back to the agent
  .addEdge("tools", "agent");

// Compile the workflow
const workflowExecutor = workflow.compile();

/**
 * EmojiAgent class for generating custom emoji images
 */
export class EmojiAgent {
  private name: string;
  private description: string;
  private autosave: boolean;
  private workspaceFolder: string;
  private logTokens: boolean;
  private logs: EmojiAgentSchemaLog;
  private logFileName: string;

  constructor(
    name: string = "emoji-generator-agent-01",
    description: string = "Generates custom emoji images based on user descriptions",
    logTokens: boolean = true,
    logLevel: string = "INFO",
    autosave: boolean = true,
    workspaceFolder: string = "emoji-agent-runs"
  ) {
    this.name = name;
    this.description = description;
    this.autosave = autosave;
    this.workspaceFolder = workspaceFolder;
    this.logTokens = logTokens;
    this.logs = {
      id: uuidv4(),
      agent_name: name,
      agent_description: description,
      logs: [],
      time_stamp: new Date().toISOString()
    };
    this.logFileName = `emoji-agent-run-time-${uuidv4()}`;
    
    // Ensure workspace folder exists
    if (!fs.existsSync(workspaceFolder)) {
      fs.mkdirSync(workspaceFolder, { recursive: true });
    }
  }

  /**
   * Generate emoji image using the image generation service
   */
  async generateEmoji(prompt: string): Promise<EmojiData | { error: string }> {
    console.log(`Generating emoji for prompt: ${prompt}`);
    try {
      const requestBody = {
        stream: false,
        model: IMAGE_SERVICE_MODEL,
        messages: [
          {
            content: "You are a emoji generate service to help user create a emoji picture",
            role: "system"
          },
          {
            content: prompt,
            role: "user"
          }
        ]
      };

          const response = await axios.post(
      IMAGE_SERVICE_API_BASE,
      requestBody,
      {
        headers: {
          'Authorization': IMAGE_SERVICE_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes timeout for image generation
      }
    );
      
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content;
        
        // Extract the first image URL from the content (OpenAI videos domain with query parameters)
        const imageUrlMatch = content.match(/\((https:\/\/videos\.openai\.com[^\)]+)\)/);
        const downloadUrlMatch = content.match(/\[Click to download\]\((https:\/\/[^\)]+)\)/);
        
        if (imageUrlMatch) {
          return {
            id: uuidv4(),
            prompt: prompt,
            imageUrl: imageUrlMatch[1],
            downloadUrl: downloadUrlMatch ? downloadUrlMatch[1] : imageUrlMatch[1],
            timestamp: new Date().toISOString(),
            model: IMAGE_SERVICE_MODEL
          };
        } else {
          console.warn(`No image URL found in response for prompt: ${prompt}`);
          return {
            error: `No image URL found in response for prompt: ${prompt}`
          };
        }
      } else {
        console.warn(`Invalid response structure for prompt: ${prompt}`);
        return {
          error: `Invalid response structure for prompt: ${prompt}`
        };
      }
    } catch (error) {
      console.error(`Error generating emoji for prompt "${prompt}":`, error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          return {
            error: `Request timeout for prompt "${prompt}": The image generation service is taking longer than expected.`
          };
        }
        return {
          error: `Error generating emoji: ${error.message}`
        };
      }
      return {
        error: `Error generating emoji: Unknown error`
      };
    }
  }

  /**
   * Generate emoji and create a response using the LLM
   */
  async generateAndRespond(prompt: string, task: string = ""): Promise<EmojiAgentSchema> {
    const emojiData = await this.generateEmoji(prompt);
    
    let emojiInfo = "";
    
    // Check if we got valid data or an error
    if ('error' in emojiData) {
      emojiInfo = `Error generating emoji for "${prompt}": ${emojiData.error}`;
    } else {
      // Format the data for the prompt
      emojiInfo = `
      Successfully generated emoji for: "${prompt}"
      Image URL: ${emojiData.imageUrl}
      Download URL: ${emojiData.downloadUrl}
      Generated at: ${emojiData.timestamp}
      Model used: ${emojiData.model}
      `;
    }
    
    // Create the prompt for the LLM
    const llmPrompt = `${task || ''}
    
    User requested emoji generation for: "${prompt}"
    
    ${emojiInfo}
    
    Please provide a friendly response about the generated emoji.`;
    
    // Run the LLM through our workflow
    console.log(`Creating response for emoji generation: ${prompt}`);
    const result = await this.runLLM(llmPrompt);
    
    // Create the response output
    const response: EmojiAgentSchema = {
      id: uuidv4(),
      prompt: prompt,
      timestamp: new Date().toISOString(),
      response: result.messages[result.messages.length - 1].content as string,
      emoji_data: emojiData
    };
    
    // Add to logs
    this.logs.logs.push(response);
    
    return response;
  }

  /**
   * Run the LLM with a prompt
   */
  private async runLLM(prompt: string) {
    // Run through our graph
    const result = await RunnableSequence.from([
      // Convert input string to state with a human message
      (input: string) => ({ 
        messages: [new HumanMessage(input)] 
      }),
      // Run through our graph
      workflowExecutor,
    ]).invoke(prompt);
    
    return result;
  }

  /**
   * Save logs to a file
   */
  private saveToFile() {
    if (this.autosave) {
      const filePath = path.join(this.workspaceFolder, `${this.logFileName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(this.logs, null, 2), 'utf8');
      console.log(`Logs saved to ${filePath}`);
    }
  }

  /**
   * Run the emoji agent to generate emojis
   */
  async run(
    prompts: string[],
    task: string = "",
    realTime: boolean = false
  ): Promise<string> {
    // Create file if it doesn't exist
    if (!fs.existsSync(this.workspaceFolder)) {
      fs.mkdirSync(this.workspaceFolder, { recursive: true });
    }
    
    try {
      if (realTime) {
        console.log(`Starting real-time emoji generation for prompts: ${prompts.join(', ')}`);
        // Set up interval to run every 5 seconds (reasonable for image generation)
        const intervalId = setInterval(async () => {
          for (const prompt of prompts) {
            try {
              await this.generateAndRespond(prompt, task);
              console.log(`Completed emoji generation for "${prompt}".`);
              this.saveToFile();
            } catch (error) {
              console.error(`Error generating emoji for "${prompt}":`, error);
              // Add error to logs
              this.logs.logs.push({
                id: uuidv4(),
                prompt: prompt,
                timestamp: new Date().toISOString(),
                response: `Error generating emoji for "${prompt}": ${error instanceof Error ? error.message : 'Unknown error'}`,
                emoji_data: { error: 'Failed to generate emoji' }
              });
              this.saveToFile();
            }
          }
        }, 5000); // 5 second interval
        
        // Just for demonstration, stop after 30 seconds
        // In a real app, you'd want some other way to stop this
        setTimeout(() => {
          clearInterval(intervalId);
        }, 30000);
      } else {
        console.log(`Starting one-time emoji generation for prompts: ${prompts.join(', ')}`);
        // Run once for each prompt
        const promises = prompts.map(async (prompt) => {
          try {
            await this.generateAndRespond(prompt, task);
            console.log(`Completed emoji generation for "${prompt}".`);
          } catch (error) {
            console.error(`Error generating emoji for "${prompt}":`, error);
            // Add error to logs
            this.logs.logs.push({
              id: uuidv4(),
              prompt: prompt,
              timestamp: new Date().toISOString(),
              response: `Error generating emoji for "${prompt}": ${error instanceof Error ? error.message : 'Unknown error'}`,
              emoji_data: { error: 'Failed to generate emoji' }
            });
          }
        });
        
        await Promise.all(promises);
        this.saveToFile();
      }
    } catch (error) {
      console.error("Error in run method:", error);
      this.saveToFile();
    }
    
    // Return the logs as JSON
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export the emoji generation agent as a RunnableSequence
export const emojiGenerationAgent = RunnableSequence.from([
  // Convert input string to state with a human message
  (input: string) => ({ 
    messages: [new HumanMessage(input)] 
  }),
  // Run through our graph
  workflowExecutor,
  // Return the result (all messages and emoji data for downstream processing)
  (state: typeof MessagesAnnotation.State) => {
    // Extract emoji data if available
    const toolMessages = state.messages.filter(msg => "tool_call_id" in msg);
    let emoji_data = null;
    
    if (toolMessages.length > 0) {
      const lastToolMessage = toolMessages[toolMessages.length - 1];
      try {
        // Try to parse the emoji data from the tool message
        const content = typeof lastToolMessage.content === 'string' 
          ? lastToolMessage.content 
          : JSON.stringify(lastToolMessage.content);
        
        emoji_data = JSON.parse(content);
      } catch (e) {
        console.warn("Failed to parse emoji data", e);
      }
    }
    
    return {
      messages: state.messages,
      emoji_data,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
  }
]);

// For backward compatibility and testing
export const emojiAgent = emojiGenerationAgent;