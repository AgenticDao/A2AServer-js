import { StateGraph, END } from "@langchain/langgraph";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AgentAction, AgentFinish, AgentStep } from "@langchain/core/agents";
import { createLLM } from "./llm";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";

// Define the state schema for our agent graph
const stateSchema = z.object({
  messages: z.array(z.any()),
  steps: z.array(AgentStep).default([]),
  code: z.string().default(""),
  currentTask: z.string().default(""),
  isComplete: z.boolean().default(false),
});

// Type for our state
type AgentState = z.infer<typeof stateSchema>;

/**
 * System prompt for the coder agent
 */
const SYSTEM_PROMPT = `You are an expert software engineer who can solve coding problems efficiently.
You have expertise in multiple programming languages and can adapt to different requirements.

When writing code:
1. Make it concise, readable, and well-documented
2. Follow best practices and design patterns
3. Consider edge cases and performance
4. Include appropriate error handling

Your task is to help the user with their coding requests by generating clean, working code.`;

/**
 * Creates the coder agent prompt template
 */
function createCoderAgentPrompt() {
  return ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    new MessagesPlaceholder("messages"),
    new MessagesPlaceholder("agent_steps"),
  ]);
}

/**
 * Decides if the coding task is complete based on the state
 */
function shouldContinue(state: AgentState): "continue" | typeof END {
  return state.isComplete ? END : "continue";
}

/**
 * Creates and configures the coder agent
 */
export function createCoderAgent() {
  // Initialize LLM
  const llm = createLLM();
  
  // Create prompt
  const prompt = createCoderAgentPrompt();
  
  // Create main flow for generating code
  const codeGenerator = RunnableSequence.from([
    {
      messages: (state: AgentState) => state.messages,
      agent_steps: (state: AgentState) => {
        return state.steps.map((step) => {
          return `Previous action: ${step.action.log}`;
        });
      },
    },
    prompt,
    llm,
    // Process LLM response to extract code
    async (response) => {
      const message = response.content;
      
      let code = "";
      // Extract code blocks from the message (simple regex for demonstration)
      if (typeof message === "string") {
        const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
        const matches = message.matchAll(codeBlockRegex);
        
        for (const match of matches) {
          code += match[1] + "\n";
        }
      }
      
      // Return as an AgentAction
      return {
        tool: "code_generator",
        toolInput: { code },
        log: typeof message === "string" ? message : JSON.stringify(message),
      } as AgentAction;
    },
  ]);
  
  // Create the task completion checker
  const taskCompleter = RunnableSequence.from([
    {
      messages: (state: AgentState) => state.messages,
      code: (state: AgentState) => state.code,
      task: (state: AgentState) => state.currentTask,
    },
    ChatPromptTemplate.fromMessages([
      ["system", `Your job is to determine if the coding task has been completed.
      Return "COMPLETE" if the code fully satisfies the requirements, or "INCOMPLETE" 
      if more work is needed.`],
      ["human", "Current task: {task}"],
      ["human", "Generated code:\n{code}"],
      new MessagesPlaceholder("messages"),
    ]),
    llm,
    async (response) => {
      const message = response.content;
      const isComplete = typeof message === "string" && 
        message.toUpperCase().includes("COMPLETE");
      
      return {
        tool: "task_completer",
        toolInput: { isComplete },
        log: typeof message === "string" ? message : JSON.stringify(message),
      } as AgentAction;
    },
  ]);
  
  // Create the graph
  const workflow = new StateGraph<AgentState>({
    channels: stateSchema,
  });
  
  // Add nodes
  workflow.addNode("code_generator", codeGenerator);
  workflow.addNode("task_completer", taskCompleter);
  
  // Define the edges between nodes
  workflow.addEdge("code_generator", "task_completer");
  
  // Connect the task checker back to code generator if task is incomplete
  workflow.addConditionalEdges(
    "task_completer",
    shouldContinue,
    {
      "continue": "code_generator",
      [END]: END,
    }
  );
  
  // Set the entry point
  workflow.setEntryPoint("code_generator");
  
  // Compile the graph
  return workflow.compile();
}

/**
 * Updates the agent state with new code
 */
export function processAgentAction(state: AgentState, action: AgentAction): AgentState {
  if (action.tool === "code_generator") {
    // Update code in the state
    return {
      ...state,
      code: action.toolInput.code,
      steps: [...state.steps, { action } as AgentStep],
    };
  } else if (action.tool === "task_completer") {
    // Update completion status
    return {
      ...state,
      isComplete: action.toolInput.isComplete,
      steps: [...state.steps, { action } as AgentStep],
    };
  }
  
  // Default case - return state unchanged
  return state;
} 