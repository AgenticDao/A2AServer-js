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

// Define the system prompt for the currency conversion agent
const SYSTEM_PROMPT = 
  "You are a specialized assistant for currency conversions. " +
  "Your sole purpose is to use the 'get_exchange_rate' tool to answer questions about currency exchange rates. " +
  "If the user asks about anything other than currency conversion or exchange rates, " +
  "politely state that you cannot help with that topic and can only assist with currency-related queries. " +
  "Do not attempt to answer unrelated questions or use tools for other purposes." +
  "\n\nWhen processing currency queries, follow these steps:" +
  "\n1. Identify source currency (currency_from) and target currency (currency_to) from user input" +
  "\n2. If needed, identify date (currency_date), default is 'latest'" +
  "\n3. If information is incomplete, clearly ask the user to provide missing information" +
  "\n4. Use get_exchange_rate tool to fetch exchange rate data" +
  "\n5. Return results in a clear and friendly format, including rate, date and brief explanation" +
  "\n\nResponse status instructions:" +
  "\n- Set response status to input_required if the user needs to provide more information" +
  "\n- Set response status to error if there is an error while processing the request" +
  "\n- Set response status to completed if the request is complete" +
  "\n\nCurrency code examples: USD, EUR, JPY, GBP, CNY";

// Exchange rate tool for getting currency conversion rates
const getExchangeRateTool = tool(async (input) => {
  const { currency_from, currency_to, currency_date } = input;
  
  // Validate input
  const validCurrencyCodes = ['USD', 'EUR', 'JPY', 'GBP', 'CAD', 'AUD', 'CHF', 'CNY', 'HKD', 'NZD', 'SEK', 'KRW', 'SGD', 'NOK', 'MXN', 'INR', 'RUB', 'ZAR', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP', 'PHP', 'AED', 'COP', 'SAR', 'MYR', 'RON'];
  
  if (!currency_from || !currency_to) {
    return { 
      error: "Missing currency code",
      details: "Please provide both source (currency_from) and target (currency_to) currency codes" 
    };
  }
  
  if (!validCurrencyCodes.includes(currency_from.toUpperCase()) || !validCurrencyCodes.includes(currency_to.toUpperCase())) {
    return { 
      error: "Invalid currency code", 
      details: `Please use valid currency codes, such as: ${validCurrencyCodes.slice(0, 5).join(', ')}, etc.`
    };
  }
  
  try {
    const response = await axios.get(
      `https://api.frankfurter.app/${currency_date}`,
      { params: { from: currency_from.toUpperCase(), to: currency_to.toUpperCase() } }
    );
    
    // Format response data
    const data = response.data;
    return {
      success: true,
      base: data.base,
      date: data.date,
      rates: data.rates,
      formatted: {
        from: currency_from.toUpperCase(),
        to: currency_to.toUpperCase(),
        rate: data.rates[currency_to.toUpperCase()],
        date: data.date,
        message: `1 ${currency_from.toUpperCase()} = ${data.rates[currency_to.toUpperCase()]} ${currency_to.toUpperCase()} (${data.date === 'latest' ? 'latest rate' : data.date})`
      }
    };
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) {
        return { 
          error: "Invalid currency code or date", 
          details: "Please check your input and try again. Make sure to use correct currency codes (like USD, EUR) and valid date format (YYYY-MM-DD)."
        };
      }
      return { 
        error: `API error: ${error.response.status}`, 
        details: error.response.data?.message || 'Unknown error' 
      };
    }
    return { 
      error: "Failed to fetch exchange rate data", 
      details: "Please try again later. If the problem persists, try using different currency codes or date." 
    };
  }
}, {
  name: "get_exchange_rate",
  description: "Get current or historical currency exchange rate information.",
  schema: z.object({
    currency_from: z.string().describe("Source currency code (e.g., 'USD')"),
    currency_to: z.string().describe("Target currency code (e.g., 'EUR')"),
    currency_date: z.string().default("latest").describe("Exchange rate date, use 'latest' for current rates or YYYY-MM-DD format"),
  }),
});

// Create the tools array
const tools = [getExchangeRateTool];

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

// Create the currency agent workflow
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

// Export the currency agent as a RunnableSequence
export const currencyAgent = RunnableSequence.from([
  // Convert input string to state with a human message
  (input: string) => ({ 
    messages: [new HumanMessage(input)] 
  }),
  // Run through our graph
  workflowExecutor,
  // Return the result (all messages and exchange data for downstream processing)
  (state: typeof MessagesAnnotation.State) => {
    // Extract exchange data if available
    const toolMessages = state.messages.filter(msg => "tool_call_id" in msg);
    let exchange_data = null;
    
    if (toolMessages.length > 0) {
      const lastToolMessage = toolMessages[toolMessages.length - 1];
      try {
        // Try to parse the exchange data from the tool message
        const content = typeof lastToolMessage.content === 'string' 
          ? lastToolMessage.content 
          : JSON.stringify(lastToolMessage.content);
        
        exchange_data = JSON.parse(content);
      } catch (e) {
        console.warn("Failed to parse exchange data", e);
      }
    }
    
    return {
      messages: state.messages,
      exchange_data
    };
  }
]);