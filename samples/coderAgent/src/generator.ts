/**
 * Code Generator using LangChain and OpenAI
 */
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { codeGenerationModel } from "./openai.js";
import { CodeMessageData, extractCodeFromMarkdown, getCodeGenerationSystemPrompt } from "./code-format.js";

/**
 * Generates code using the OpenAI model with a system prompt and user messages
 */
export async function generateCodeWithMessages(messages: BaseMessage[]): Promise<CodeMessageData> {
  console.log(`[CoderAgent] Generating code with ${messages.length} messages`);
  
  // Prepare messages for the model with system prompt first
  const systemMessage = new SystemMessage(getCodeGenerationSystemPrompt());
  const allMessages = [systemMessage, ...messages];
  
  // Call the model directly with type assertion to resolve dependency version conflicts
  const response = await codeGenerationModel.invoke(allMessages as any);
  
  // Process the response
  const content = response.content.toString();
  return extractCodeFromMarkdown(content);
}

/**
 * Converts A2A message history to LangChain messages
 */
export function convertHistoryToMessages(history: any[]): BaseMessage[] {
  // Default message if history is empty or invalid
  if (!history || !Array.isArray(history) || history.length === 0) {
    return [new HumanMessage("Generate sample code")];
  }

  const messages = history
    .map((m) => {
      if (m.role === "user") {
        // Get all text parts from user messages
        const text = m.parts
          ?.filter((p: any) => p.type === "text" && p.text)
          ?.map((p: any) => p.text)
          ?.join("\n") || "";
          
        if (text) {
          return new HumanMessage(text);
        }
      }
      return null;
    })
    .filter((m): m is BaseMessage => m !== null);

  // If no valid messages were found, provide a default message
  if (messages.length === 0) {
    return [new HumanMessage("Generate sample code")];
  }

  return messages;
}

/**
 * Generates code based on message history
 */
export async function generateCode(history: any[]): Promise<CodeMessageData> {
  try {
    // Convert history to messages and add debug logs
    const messages = convertHistoryToMessages(history);
    console.log(`[CoderAgent] Processing ${messages.length} messages`);
    
    if (messages.length === 0) {
      console.warn("[CoderAgent] No messages found in history, using default");
      messages.push(new HumanMessage("Generate a simple hello world example"));
    }
    
    // Use the simplified direct approach
    return await generateCodeWithMessages(messages);
  } catch (error) {
    console.error("[CoderAgent] Error in code generation:", error);
    throw error;
  }
} 