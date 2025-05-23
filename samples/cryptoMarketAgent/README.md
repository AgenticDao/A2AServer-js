# Crypto Market Analysis Agent

A specialized cryptocurrency market analysis agent built with LangChain and LangGraph that provides comprehensive cryptocurrency market analysis through the CoinGecko API. Implemented as an A2A-compliant server for seamless integration with agent platforms.

## Features

- **Real-Time Market Data**: Fetches up-to-date cryptocurrency market information
- **Price Analysis**: Current price and percentage changes in the last 24 hours
- **Market Metrics**: Volume, market cap, circulating supply, and other key indicators
- **Trend Analysis**: Analysis of bullish and bearish scenarios and market sentiment
- **Historical Context**: Comparison with historical performance and significant price movements
- **Future Outlook**: Projections and analysis of long-term potential
- **Structured Data Response**: Returns both human-readable analysis and structured data
- **Streaming Response**: Delivers information progressively via the A2A protocol
- **Input Validation**: Verifies cryptocurrency IDs and provides helpful error messages

## Prerequisites

- Node.js v22.0+ or higher
- OpenAI API key

## Setup

1. Clone the repository
2. Navigate to the `samples/cryptoMarketAgent` directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

## Configuration

The agent can be configured through environment variables in the `.env` file:

```
# Required
OPENAI_API_KEY=your_api_key_here
WALLET_PRIVATE_KEY=your_private_key_in_base58

# Optional with defaults
OPENAI_MODEL=gpt-4o               # Model to use for market analysis
OPENAI_API_BASE=                  # Custom API endpoint (leave empty for OpenAI default)
OPENAI_TEMPERATURE=0.2            # Creativity level (0.0-1.0)
PORT=41241                        # Server port
HOST=localhost                    # Server host
LOG_LEVEL=info                    # Logging verbosity
```

## Usage

Start the development server:

```bash
npm run dev
```

The server will be available at `http://localhost:41241` (or your configured port).

Send requests to the agent using the A2A protocol. Example queries:

- "Analyze Bitcoin's current market situation"
- "What's the market outlook for Ethereum?"
- "How is Solana performing in the market?"
- "Current price and trend analysis for Cardano"

## Code Structure

- `src/index.ts`: Main server implementation and A2A integration
- `src/agent.ts`: Core crypto market agent implementation using LangGraph
- `src/openai.ts`: OpenAI model configuration
- `src/config.ts`: Configuration management

## Architecture

The crypto market agent follows a graph-based architecture using LangGraph:

1. **Request Processing**: Accepts user queries via A2A protocol
2. **Information Extraction**: Identifies cryptocurrency IDs and specific analysis requests
3. **API Integration**: Connects to CoinGecko API to fetch market data
4. **Analysis Generation**: Uses AI to analyze the market data and provide insights
5. **Response Formatting**: Formats analysis into human-readable text and structured data
6. **State Management**: Manages conversational state to handle missing information

## How It Works

1. The agent receives a natural language query about a cryptocurrency
2. It extracts the cryptocurrency ID and the type of analysis requested
3. If information is incomplete, it asks the user for the missing details
4. Once all required information is available, it queries the CoinGecko API
5. The market data is analyzed by the AI to generate comprehensive insights
6. Both the analysis and structured data are sent back to the client

## Error Handling

The agent handles various error conditions:

- **Missing Cryptocurrency ID**: Prompts the user to specify which cryptocurrency to analyze
- **Invalid Cryptocurrency ID**: Informs the user if the specified cryptocurrency cannot be found
- **API Rate Limits**: Handles and explains API rate limiting in user-friendly terms
- **API Errors**: Provides clear explanations for any API errors that occur
- **Non-Crypto Queries**: Politely declines to answer non-cryptocurrency related questions

## License

This project is licensed under the MIT License.
