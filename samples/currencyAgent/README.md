# Currency Exchange Agent

A specialized currency exchange rate agent built with LangChain and LangGraph that provides accurate exchange rate information through the Frankfurter API. Implemented as an A2A-compliant server for seamless integration with agent platforms.

## Features

- **Real-Time Exchange Rates**: Fetches up-to-date currency exchange rates
- **Historical Exchange Data**: Supports querying rates from specific dates
- **Multiple Currency Support**: Handles conversions between major world currencies
- **Structured Data Response**: Returns both human-readable text and structured data
- **Guided Interaction**: Requests additional information when input is incomplete
- **Streaming Response**: Delivers information progressively via the A2A protocol
- **Input Validation**: Verifies currency codes and provides helpful error messages

## Prerequisites

- Node.js v22.0+ or higher
- OpenAI API key

## Setup

1. Clone the repository
2. Navigate to the `samples/currencyAgent` directory
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

# Optional with defaults
OPENAI_MODEL=gpt-4o               # Model to use for currency queries
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

- "What is the exchange rate between USD and EUR?"
- "How much is 1 Euro in Japanese Yen?"
- "Check yesterday's GBP to CNY exchange rate"
- "Convert USD to CNY"

## Code Structure

- `src/index.ts`: Main server implementation and A2A integration
- `src/agent.ts`: Core currency agent implementation using LangGraph
- `src/openai.ts`: OpenAI model configuration
- `src/config.ts`: Configuration management

## Architecture

The currency agent follows a graph-based architecture using LangGraph:

1. **Request Processing**: Accepts user queries via A2A protocol
2. **Information Extraction**: Identifies currency codes and dates from queries
3. **API Integration**: Connects to Frankfurter API to fetch exchange rates
4. **Response Formatting**: Formats exchange data into human-readable text and structured data
5. **State Management**: Manages conversational state to handle missing information

## How It Works

1. The agent receives a natural language query about currency exchange rates
2. It extracts the source currency, target currency, and optionally a date
3. If information is incomplete, it asks the user for the missing details
4. Once all required information is available, it queries the Frankfurter API
5. The exchange rate data is formatted into a user-friendly response
6. Both the text explanation and structured data are sent back to the client

## Error Handling

The agent handles various error conditions:

- **Missing Currency Codes**: Prompts the user to provide both source and target currencies
- **Invalid Currency Codes**: Provides a list of valid currency codes
- **API Errors**: Handles and explains API errors in user-friendly terms
- **Non-Currency Queries**: Politely declines to answer non-currency related questions

## License

This project is licensed under the MIT License.
