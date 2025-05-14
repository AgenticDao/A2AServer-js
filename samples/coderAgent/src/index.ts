/**
 * Coder Agent implemented with LangChain and OpenAI
 */
import {
  TaskContext,
  A2AServer,
  TaskYieldUpdate,
  schema
} from "@agenticdao/a2a-server";
import { generateCode } from "./generator";
import { CodeMessageData } from "./code-format";
import config from "./config";

/**
 * Coder Agent implementation using LangChain and OpenAI
 */
async function* coderAgent({
  task,
  history,
}: TaskContext): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  // Make sure we have history
  if (!history || history.length === 0) {
    console.warn(`[CoderAgent] No history/messages found for task ${task.id}`);
    yield {
      state: "failed",
      message: {
        role: "agent",
        parts: [{ type: "text", text: "No input message found." }],
      },
    };
    return;
  }

  // Inform the user that we're working
  yield {
    state: "working",
    message: {
      role: "agent",
      parts: [{ type: "text", text: "Generating code..." }],
    },
  };

  try {
    // Generate code using our LangChain-based generator
    const generatedCode: CodeMessageData = await generateCode(history);
    
    // Track which files we've emitted and their content
    const fileContents = new Map<string, string>();
    const fileOrder: string[] = [];
    let emittedFileCount = 0;
    
    // Process generated files
    if (generatedCode.files && generatedCode.files.length > 0) {
      // First, collect all files
      for (const file of generatedCode.files) {
        if (file.filename && file.content) {
          fileContents.set(file.filename, file.content);
          fileOrder.push(file.filename);
        }
      }
      
      // Then emit each file as an artifact
      for (let i = 0; i < fileOrder.length; i++) {
        const filename = fileOrder[i];
        const content = fileContents.get(filename) || "";
        
        console.log(`[CoderAgent] Emitting file (index ${i}): ${filename}`);
        yield {
          index: i,
          name: filename,
          parts: [{ type: "text", text: content }],
          lastChunk: i === fileOrder.length - 1,
        };
        emittedFileCount++;
      }
      
      // Notify completion
      yield {
        state: "completed",
        message: {
          role: "agent",
          parts: [
            {
              type: "text",
              text: `Generated files: ${fileOrder.join(", ")}`,
            },
          ],
        },
      };
    } else {
      // No files were generated
      yield {
        state: "completed",
        message: {
          role: "agent",
          parts: [
            {
              type: "text",
              text: "Completed, but no files were generated.",
            },
          ],
        },
      };
    }
  } catch (error) {
    // Handle errors
    console.error("[CoderAgent] Error generating code:", error);
    yield {
      state: "failed",
      message: {
        role: "agent",
        parts: [
          {
            type: "text", 
            text: `Error generating code: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
      },
    };
  }
}

// Agent card definition
const coderAgentCard: schema.AgentCard = {
  name: "Coder Agent",
  description:
    "An agent that generates code based on natural language instructions and streams file outputs.",
  url: `http://${config.server.host}:${config.server.port}`,
  provider: {
    organization: "A2A Samples",
  },
  version: "0.0.1",
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  authentication: null,
  defaultInputModes: ["text"],
  defaultOutputModes: ["text", "file"],
  skills: [
    {
      id: "code_generation",
      name: "Code Generation",
      description:
        "Generates code snippets or complete files based on user requests, streaming the results.",
      tags: ["code", "development", "programming"],
      examples: [
        "Write a Python function to calculate Fibonacci numbers.",
        "Create an HTML file with a basic button that alerts 'Hello!' when clicked.",
        "Generate a TypeScript class for a user profile with name and email properties.",
        "Write a React component for a todo list.",
        "Create a simple Express.js server with a GET endpoint.",
      ],
    },
  ],
};

// Create and start the server
const server = new A2AServer(coderAgent, {
  card: coderAgentCard,
  // enableVerification: true,
});

// Start the server on the configured port
server.start(config.server.port);

console.log(`[CoderAgent] Server started on http://${config.server.host}:${config.server.port}`);
console.log("[CoderAgent] Press Ctrl+C to stop the server");