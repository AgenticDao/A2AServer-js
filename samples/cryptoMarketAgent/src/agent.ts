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

// Define the system prompt for the crypto market analysis agent
const SYSTEM_PROMPT = `
System Prompt: Crypto Market Analysis LLM Agent

Objective:
Your goal is to analyze data for a specific cryptocurrency and provide a comprehensive, accurate, and concise summary and analysis. This should include current market status, trends, historical context, and potential future outcomes based on available data. Your analysis should also incorporate sentiment analysis from relevant sources like social media and news, providing a full picture for traders and investors.

General Guidelines:

	1.	Always Structure Your Responses: Begin with a summary of the cryptocurrency, followed by current performance data, historical trends, market sentiment, and end with a future outlook or possible price scenarios based on the analysis.
	2.	Be Analytical and Data-Driven: Use numerical data, key statistics, and historical trends. Support your analysis with facts and metrics. Avoid speculative statements without data support.
	3.	Use Clear and Understandable Language: While you should present technical details and financial terms, ensure that your responses are accessible to both experienced traders and newcomers to the crypto market.

Inputs You'll Receive:

	•	Crypto Symbol: The specific cryptocurrency symbol (e.g., BTC for Bitcoin, ETH for Ethereum) you are analyzing.
	•	Date Range: The time period over which historical data is analyzed.
	•	Market Data: You will be provided with current and historical price data, trading volumes, and other market metrics.

Response Format:

Your response should be structured in the following way:

	1.	Summary (1-2 Sentences):
	•	Briefly summarize the state of the cryptocurrency. Mention its current price, trend (upward, downward, sideways), and any major events affecting it.
	2.	Current Market Data:
	•	Price: Current price in USD and percentage change in the last 24 hours.
	•	Volume: Total trading volume in the last 24 hours, highlighting any unusual spikes or dips.
	•	Market Cap: Current market capitalization.
	•	Volatility Index: Analyze the coin's volatility over the last week or month.
	•	RSI (Relative Strength Index): A key indicator that suggests whether the coin is overbought or oversold.
	3.	Historical Performance:
	•	Provide a comparison between the current performance and the price over the last 7 days, 30 days, 90 days, and 1 year.
	•	Highlight any key support/resistance levels based on historical data.
	•	Mention any significant price movements related to major news or events (e.g., major exchange listing, protocol upgrades, legal/regulatory news).
	4.	Future Outlook:
	•	Bullish Scenario: Provide analysis for an upward trend, citing reasons such as strong technical indicators, positive sentiment, or recent developments.
	•	Bearish Scenario: Provide a potential downside, noting risk factors like negative sentiment, regulatory concerns, or weak technical indicators.
	•	Long-Term View: Briefly discuss the long-term potential of the coin, including adoption, technological development, or macroeconomic factors that could impact its price in the future.
	5.	Actionable Insights (Optional):
	•	Provide potential actions for traders (buy, sell, hold) based on the analysis, clearly stating that this is not financial advice but a data-driven perspective.

Response status instructions:
- Set response status to input_required if the user needs to provide more information (like a specific coin)
- Set response status to error if there is an error while processing the request
- Set response status to completed if the analysis is complete
`;

// CryptoData type definition
interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
  [key: string]: any;
}

// Define token usage tracking
interface TokenUsage {
  id: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

// Define crypto agent schema
interface CryptoAgentSchema {
  id: string;
  coin_id: string;
  timestamp: string;
  summary: string;
  raw_data: CryptoData | { error: string };
}

interface CryptoAgentSchemaLog {
  id: string;
  agent_name: string;
  agent_description: string;
  logs: CryptoAgentSchema[];
  time_stamp: string;
}

// Get cryptocurrency data tool
const getCryptoDataTool = tool(async (input) => {
  const { coin_id, currency = 'usd' } = input;
  
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      { params: { vs_currency: currency, ids: coin_id } }
    );
    
    if (response.data && response.data.length > 0) {
      const cryptoData = response.data[0];
      return {
        success: true,
        id: cryptoData.id,
        name: cryptoData.name,
        symbol: cryptoData.symbol,
        current_price: cryptoData.current_price,
        market_cap: cryptoData.market_cap,
        market_cap_rank: cryptoData.market_cap_rank,
        total_volume: cryptoData.total_volume,
        high_24h: cryptoData.high_24h,
        low_24h: cryptoData.low_24h,
        price_change_24h: cryptoData.price_change_24h,
        price_change_percentage_24h: cryptoData.price_change_percentage_24h,
        circulating_supply: cryptoData.circulating_supply,
        total_supply: cryptoData.total_supply,
        max_supply: cryptoData.max_supply,
        ath: cryptoData.ath,
        atl: cryptoData.atl,
        timestamp: new Date().toISOString(),
        formatted: {
          name: cryptoData.name,
          symbol: cryptoData.symbol.toUpperCase(),
          current_price: `$${cryptoData.current_price}`,
          market_cap: `$${cryptoData.market_cap}`,
          price_change_24h: `${cryptoData.price_change_percentage_24h}%`,
          volume_24h: `$${cryptoData.total_volume}`,
          message: `Current price of ${cryptoData.name} (${cryptoData.symbol.toUpperCase()}) is $${cryptoData.current_price} with a 24h change of ${cryptoData.price_change_percentage_24h}%`
        }
      };
    } else {
      console.warn(`No data found for ${coin_id} on CoinGecko.`);
      return {
        error: "Cryptocurrency not found",
        details: `No data found for ${coin_id} on CoinGecko. Please check the cryptocurrency ID and try again.`
      };
    }
  } catch (error) {
    console.error(`Error fetching data from CoinGecko for ${coin_id}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 429) {
        return { 
          error: "Rate limit exceeded", 
          details: "The CoinGecko API rate limit has been exceeded. Please try again later."
        };
      }
      return { 
        error: `API error: ${error.response.status}`, 
        details: error.response.data?.message || 'Unknown error' 
      };
    }
    return { 
      error: "Failed to fetch cryptocurrency data", 
      details: "Please try again later. If the problem persists, try using a different cryptocurrency ID." 
    };
  }
}, {
  name: "get_crypto_data",
  description: "Get current cryptocurrency market data from CoinGecko.",
  schema: z.object({
    coin_id: z.string().describe("The ID of the coin to fetch data for (e.g., 'bitcoin', 'ethereum')"),
    currency: z.string().default("usd").describe("The currency to get prices in (default: 'usd')"),
  }),
});

// Create the tools array
const tools = [getCryptoDataTool];

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

// Create the crypto agent workflow
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
 * CryptoAgent class for analyzing cryptocurrency data
 */
export class CryptoAgent {
  private name: string;
  private description: string;
  private currency: string;
  private autosave: boolean;
  private workspaceFolder: string;
  private logTokens: boolean;
  private logs: CryptoAgentSchemaLog;
  private logFileName: string;

  constructor(
    name: string = "crypto-price-agent-01",
    description: string = "Fetches real-time crypto data for a specific coin",
    currency: string = "usd",
    logTokens: boolean = true,
    logLevel: string = "INFO",
    autosave: boolean = true,
    workspaceFolder: string = "crypto-agent-runs"
  ) {
    this.name = name;
    this.description = description;
    this.currency = currency;
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
    this.logFileName = `crypto-agent-run-time-${uuidv4()}`;
    
    // Ensure workspace folder exists
    if (!fs.existsSync(workspaceFolder)) {
      fs.mkdirSync(workspaceFolder, { recursive: true });
    }
  }

  /**
   * Get cryptocurrency data from CoinGecko
   */
  async getCryptoData(coinId: string): Promise<CryptoData | { error: string }> {
    console.log(`Fetching data for ${coinId} from CoinGecko.`);
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets',
        { params: { vs_currency: this.currency, ids: coinId } }
      );
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      } else {
        console.warn(`No data found for ${coinId} on CoinGecko.`);
        return {
          error: `No data found for ${coinId} on CoinGecko.`
        };
      }
    } catch (error) {
      console.error(`Error fetching data from CoinGecko for ${coinId}:`, error);
      return {
        error: `Error fetching data: ${axios.isAxiosError(error) ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Fetch crypto data and generate a summary using the LLM
   */
  async fetchAndSummarize(coinId: string, task: string = ""): Promise<CryptoAgentSchema> {
    const cryptoData = await this.getCryptoData(coinId);
    
    let cryptoInfo = "";
    
    // Check if we got valid data or an error
    if ('error' in cryptoData) {
      cryptoInfo = `Error fetching data for ${coinId}: ${cryptoData.error}`;
    } else {
      // Format the data for the prompt
      cryptoInfo = `
      Coin: ${cryptoData.name} (${cryptoData.symbol.toUpperCase()})
      Current Price: $${cryptoData.current_price}
      Market Cap: $${cryptoData.market_cap}
      24h Trading Volume: $${cryptoData.total_volume}
      Circulating Supply: ${cryptoData.circulating_supply}
      Total Supply: ${cryptoData.total_supply}
      All-Time High: $${cryptoData.ath}
      All-Time Low: $${cryptoData.atl}
      Market Rank: ${cryptoData.market_cap_rank}
      Price Change 24h: ${cryptoData.price_change_percentage_24h}%
      `;
    }
    
    // Create the prompt for the LLM
    const prompt = `${task || ''}
    
    Here is the live data for ${coinId}:
    ${cryptoInfo}
    
    Please provide a comprehensive analysis for ${coinId}.`;
    
    // Run the LLM through our workflow
    console.log(`Summarizing data for ${coinId}.`);
    const result = await this.runLLM(prompt);
    
    // Create the summary output
    const summary: CryptoAgentSchema = {
      id: uuidv4(),
      coin_id: coinId,
      timestamp: new Date().toISOString(),
      summary: result.messages[result.messages.length - 1].content as string,
      raw_data: cryptoData
    };
    
    // Add to logs
    this.logs.logs.push(summary);
    
    return summary;
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
   * Run the crypto agent to analyze multiple coins
   */
  async run(
    coinIds: string[],
    task: string = "",
    realTime: boolean = false
  ): Promise<string> {
    // Create file if it doesn't exist
    if (!fs.existsSync(this.workspaceFolder)) {
      fs.mkdirSync(this.workspaceFolder, { recursive: true });
    }
    
    try {
      if (realTime) {
        console.log(`Starting real-time analysis for coins: ${coinIds.join(', ')}`);
        // Set up interval to run every second
        const intervalId = setInterval(async () => {
          for (const coinId of coinIds) {
            try {
              await this.fetchAndSummarize(coinId, task);
              console.log(`Completed summary for ${coinId}.`);
              this.saveToFile();
            } catch (error) {
              console.error(`Error summarizing ${coinId}:`, error);
              // Add error to logs
              this.logs.logs.push({
                id: uuidv4(),
                coin_id: coinId,
                timestamp: new Date().toISOString(),
                summary: `Error summarizing ${coinId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                raw_data: { error: 'Failed to fetch data' }
              });
              this.saveToFile();
            }
          }
        }, 1000); // 1 second interval
        
        // Just for demonstration, stop after 10 seconds
        // In a real app, you'd want some other way to stop this
        setTimeout(() => {
          clearInterval(intervalId);
        }, 10000);
      } else {
        console.log(`Starting one-time analysis for coins: ${coinIds.join(', ')}`);
        // Run once for each coin
        const promises = coinIds.map(async (coinId) => {
          try {
            await this.fetchAndSummarize(coinId, task);
            console.log(`Completed summary for ${coinId}.`);
          } catch (error) {
            console.error(`Error summarizing ${coinId}:`, error);
            // Add error to logs
            this.logs.logs.push({
              id: uuidv4(),
              coin_id: coinId,
              timestamp: new Date().toISOString(),
              summary: `Error summarizing ${coinId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              raw_data: { error: 'Failed to fetch data' }
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

// Export the crypto market agent as a RunnableSequence
export const cryptoMarketAgent = RunnableSequence.from([
  // Convert input string to state with a human message
  (input: string) => ({ 
    messages: [new HumanMessage(input)] 
  }),
  // Run through our graph
  workflowExecutor,
  // Return the result (all messages and crypto data for downstream processing)
  (state: typeof MessagesAnnotation.State) => {
    // Extract crypto data if available
    const toolMessages = state.messages.filter(msg => "tool_call_id" in msg);
    let crypto_data = null;
    
    if (toolMessages.length > 0) {
      const lastToolMessage = toolMessages[toolMessages.length - 1];
      try {
        // Try to parse the crypto data from the tool message
        const content = typeof lastToolMessage.content === 'string' 
          ? lastToolMessage.content 
          : JSON.stringify(lastToolMessage.content);
        
        crypto_data = JSON.parse(content);
      } catch (e) {
        console.warn("Failed to parse crypto data", e);
      }
    }
    
    return {
      messages: state.messages,
      crypto_data,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
  }
]);

// For backward compatibility and testing
export const cryptoAgent = cryptoMarketAgent;