# Coder Agent

A code generation agent that leverages OpenAI models through LangChain to create code files based on natural language prompts. Built as an A2A-compliant server for seamless integration with agent platforms.

## Features

- **AI-Powered Code Generation**: Utilizes OpenAI models to generate high-quality code from text prompts
- **Multi-File Output**: Can generate multiple code files in a single request
- **Streaming Response**: Delivers code progressively via the A2A protocol
- **Configurable**: Easily customizable through environment variables
- **Error Handling**: Robust error handling with detailed logging

## Prerequisites

- Node.js v22 or later
- OpenAI API key

## Setup

1. Clone the repository
2. Navigate to the `samples/coderAgent` directory
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
OPENAI_MODEL=gpt-4o               # Model to use for code generation
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

Send requests to the agent using the A2A protocol. Example prompts:

- "Create a React component for a todo list"
- "Write a Python function to calculate Fibonacci numbers"
- "Generate a REST API in Express.js for a blog"
- "Create a TypeScript interface for a user profile"

## Code Structure

- `src/index.ts`: Main server implementation and A2A integration
- `src/generator.ts`: Core code generation logic using LangChain
- `src/openai.ts`: OpenAI model configuration
- `src/code-format.ts`: Code extraction and formatting utilities
- `src/config.ts`: Configuration management

## Architecture

The coder agent follows a straightforward architecture:

1. **Request Processing**: Accepts user requests via A2A protocol
2. **Message Conversion**: Converts A2A messages to LangChain format
3. **Code Generation**: Uses OpenAI to generate code based on prompts
4. **Code Extraction**: Parses markdown code blocks into separate files
5. **Response Streaming**: Delivers files back to the client progressively

## Customization

To customize the agent's behavior:

1. **Change the model**: Update `OPENAI_MODEL` in your `.env` file
2. **Modify system prompt**: Edit the prompt in `src/code-format.ts`
3. **Adjust temperature**: Change `OPENAI_TEMPERATURE` for more/less creative responses
4. **Add capabilities**: Extend the agent card in `src/index.ts`

## Development

To build the project for production:

```bash
npm run build
```

To run the production build:

```bash
npm start
```

## License

This project is licensed under the MIT License.
