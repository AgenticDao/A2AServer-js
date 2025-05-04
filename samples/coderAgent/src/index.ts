import { A2AServer, TaskContext, TaskYieldUpdate } from "../../../src/index";
import { createCoderAgent, processAgentAction } from "./coderAgent";
import { CONFIG } from "./config";
import { HumanMessage } from "@langchain/core/messages";

/**
 * Main function to start the A2A server with LangGraph coder agent
 */
async function startServer() {
  console.log("Initializing coder agent with LangChain and LangGraph...");
  
  // Create the LangGraph agent
  const coderAgent = createCoderAgent();
  
  /**
   * A2A Task Handler that uses the LangGraph coder agent
   */
  async function* langGraphCoderHandler(
    context: TaskContext
  ): AsyncGenerator<TaskYieldUpdate, void, unknown> {
    const taskId = context.task.id;
    const userMessage = context.userMessage;
    
    console.log(`[${taskId}] Processing new coding task...`);
    
    // Yield "working" status
    yield {
      state: "working",
      message: {
        role: "agent",
        parts: [{ type: "text", text: "I'm working on your coding task..." }],
      },
    };
    
    try {
      // Initialize agent state with user message
      const initialState = {
        messages: [new HumanMessage(userMessage.parts[0].text)],
        steps: [],
        code: "",
        currentTask: userMessage.parts[0].text,
        isComplete: false,
      };
      
      // Execute the LangGraph agent
      const agentExecutor = await coderAgent.invoke(initialState);
      
      // Check for cancellation after each step
      if (context.isCancelled()) {
        console.log(`[${taskId}] Task was cancelled.`);
        return;
      }
      
      // Extract the final code from the agent's output
      const finalCode = agentExecutor.code || "";
      
      // Create an artifact with the generated code
      yield {
        name: "generated_code.txt",
        parts: [{ type: "text", text: finalCode }],
      };
      
      // Send final completion message
      yield {
        state: "completed",
        message: {
          role: "agent",
          parts: [
            {
              type: "text",
              text: "I've generated the code based on your requirements. Check the attached file for the implementation.",
            },
          ],
        },
      };
    } catch (error) {
      console.error(`[${taskId}] Error in coder agent:`, error);
      
      // Return error as a failed state
      yield {
        state: "failed",
        message: {
          role: "agent",
          parts: [
            {
              type: "text",
              text: `Sorry, I encountered an error while processing your request: ${error.message || "Unknown error"}`,
            },
          ],
        },
      };
    }
  }
  
  // Create and start the A2A server
  const server = new A2AServer(langGraphCoderHandler);
  server.start(CONFIG.port);
  
  console.log(`A2A Coder Agent server started on port ${CONFIG.port}`);
  console.log("Send coding tasks to the server to generate code using LangGraph + OpenAI");
}

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
}); 