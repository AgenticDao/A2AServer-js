# LangGraph Coder Agent

An A2A-compliant coding assistant built with LangChain, LangGraph, and OpenAI models.

## Features

- Uses LangGraph for a multi-step code generation workflow
- Leverages OpenAI models for high-quality code generation
- Implements a validation step to ensure code completeness
- A2A-compliant interface for easy integration

## Setup

1. Clone the repository
2. Navigate to the `samples/coderAgent` directory
3. Copy `.env.example` to `.env` and add your OpenAI API key
4. Install dependencies:
   ```bash
   npm install
   ```
5. Build the project:
   ```bash
   npm run build
   ```

## Usage

Start the server:

```bash
npm start
```

This will start an A2A-compliant server on port 41241 (or the port specified in your `.env`).

## Sending Requests

Using curl:

```bash
curl -X POST http://localhost:41241 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "id": 1,
    "params": {
      "id": "task-123",
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "Write a Node.js function that reads a CSV file and converts it to JSON."}]
      }
    }
  }'
```

## How It Works

The agent uses a LangGraph workflow with the following nodes:

1. **Code Generator**: Creates code based on the user's request
2. **Task Completer**: Checks if the generated code fulfills the requirements

If the code is incomplete, the workflow loops back to the code generator to refine the solution.

## Architecture

- `config.ts`: Environment and configuration settings
- `llm.ts`: OpenAI integration with LangChain
- `coderAgent.ts`: LangGraph workflow definition
- `index.ts`: A2A server implementation

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: Server port (default: 41241)
- `MODEL_NAME`: OpenAI model to use (default: gpt-4o)
