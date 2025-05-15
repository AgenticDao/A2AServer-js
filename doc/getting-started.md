# Getting Started with Crypto A2A Server

This guide will walk you through the process of setting up and running a basic Crypto A2A Server agent. You'll learn how to install the library, create a simple task handler, and test your agent.

## Prerequisites

- Node.js v22.0+ or higher
- npm or yarn
- Basic knowledge of TypeScript/JavaScript and async programming

## Installation

Start by creating a new directory for your project:

```bash
mkdir my-a2a-agent
cd my-a2a-agent
```

Initialize a new npm project:

```bash
npm init -y
```

Install the required dependencies:

```bash
npm install @agenticdao/crypto-a2a-server express typescript ts-node @types/node @types/express
```

Create a TypeScript configuration file (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "outDir": "./dist",
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Project Structure

Create the following directory structure:

```
my-a2a-agent/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Environment Variables

Create a `.env` file in your project root to configure your agent. Below are the important environment variables:

```
# Required only if signature verification is enabled
AGENT_NFT_ADDRESS=                      # NFT mint address representing this agent
AGENT_MARKET_ADDRESS=                   # Solana program address for the agent market
WALLET_PRIVATE_KEY=                     # Private key for the agent's wallet
SOLANA_RPC_URL=                         # URL for the Solana RPC node
```

For security reasons, never commit your `.env` file to version control. Consider creating a `.env.example` file with dummy values as a template.

## Creating a Simple Agent

Now, let's create a simple echo agent that responds to user messages. Open `src/index.ts` and add the following code:

```typescript
import { A2AServer, TaskContext, TaskYieldUpdate, schema } from '@agenticdao/crypto-a2a-server';

// Define the agent's task handler
async function* echoHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  console.log(`Received task: ${context.task.id}`);
  
  // Extract the user's message text
  const userMessage = context.userMessage.parts.find(part => part.type === 'text')?.text || '';
  console.log(`User message: ${userMessage}`);
  
  // Send an initial "working" status
  yield {
    state: 'working',
    message: {
      role: 'agent',
      parts: [{ type: 'text', text: 'Processing your message...' }]
    }
  };
  
  // Simulate some work with a delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if the task was cancelled
  if (context.isCancelled()) {
    console.log(`Task ${context.task.id} was cancelled`);
    yield { 
      state: 'canceled',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: 'Operation cancelled.' }]
      }
    };
    return;
  }
  
  // Generate a response
  yield {
    state: 'completed',
    message: {
      role: 'agent',
      parts: [{ 
        type: 'text',
        text: `Echo: ${userMessage}`
      }]
    }
  };
}

// Create and start the server
const server = new A2AServer(echoHandler);

// Start the server on the default port (41241)
server.start();

console.log('A2A Server started on http://localhost:41241');
```

## Running Your Agent

Run your agent using ts-node:

```bash
npx ts-node src/index.ts
```

You should see the message:

```
A2A Server started on http://localhost:41241
```

## Testing with cURL

You can test your agent using cURL. Open a new terminal window and run:

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
        "parts": [{"type": "text", "text": "Hello, agent!"}]
      }
    }
  }'
```

You should receive a response like:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "id": "task-123",
    "status": {
      "state": "completed",
      "message": {
        "role": "agent",
        "parts": [{"type": "text", "text": "Echo: Hello, agent!"}]
      },
      "timestamp": "2023-10-27T15:42:10.123Z"
    }
  }
}
```

## Testing Streaming Responses

To test streaming responses, use the `tasks/sendSubscribe` method:

```bash
curl -N -X POST http://localhost:41241 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/sendSubscribe",
    "id": 2,
    "params": {
      "id": "task-456",
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "Hello with streaming!"}]
      }
    }
  }'
```

You should receive a series of streaming responses showing the progress of the task.

## Adding Task Artifacts

Let's modify our handler to generate an artifact. Update the `echoHandler` function:

```typescript
async function* echoHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  // ... existing code ...
  
  // After the initial status update, add an artifact
  yield {
    name: 'echo.txt',
    mimeType: 'text/plain',
    parts: [{ 
      type: 'text', 
      text: `You said: ${userMessage}` 
    }]
  };
  
  // ... rest of the code ...
}
```

## Using File Storage

By default, the A2A Server uses in-memory storage, which means task data is lost when the server restarts. To persist tasks to disk, use the `FileStore`:

```typescript
import { A2AServer, FileStore, TaskContext, TaskYieldUpdate, schema } from '@agenticdao/crypto-a2a-server';

// Create a file store
const store = new FileStore({ dir: '.my-agent-tasks' });

// Create the server with the file store
const server = new A2AServer(echoHandler, { taskStore: store });
```

## Next Steps

Now that you have a basic agent running, you can:

1. Enhance your task handler with more sophisticated logic
2. Add proper error handling
3. Deploy your agent to a server
4. Add custom agent metadata with the `card` option

## Complete Example with Agent Card

Here's a more complete example that includes an agent card and error handling:

```typescript
import { A2AServer, FileStore, TaskContext, TaskYieldUpdate, schema } from '@agenticdao/crypto-a2a-server';

async function* enhancedHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  try {
    console.log(`Handling task: ${context.task.id}`);
    
    // Get user message
    const userMessage = context.userMessage.parts.find(part => part.type === 'text')?.text || '';
    
    // Acknowledge receipt
    yield {
      state: 'working',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: 'Processing your request...' }]
      }
    };
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check for cancellation
    if (context.isCancelled()) {
      yield { state: 'canceled' };
      return;
    }
    
    // Create an artifact
    yield {
      name: 'response.txt',
      mimeType: 'text/plain',
      parts: [{ type: 'text', text: `Echo: ${userMessage}` }]
    };
    
    // Complete the task
    yield {
      state: 'completed',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: `I've processed your message: "${userMessage}"` }]
      }
    };
  } catch (error) {
    console.error('Error in task handler:', error);
    
    // Report failure
    yield {
      state: 'failed',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: 'An error occurred while processing your request.' }]
      }
    };
  }
}

// Define agent capabilities and metadata
const agentCard: schema.AgentCard = {
  name: 'Echo Agent',
  description: 'A simple agent that echoes back user messages',
  url: 'http://localhost:41241',
  version: '1.0.0',
  documentationUrl: 'https://github.com/yourusername/my-a2a-agent',
  provider: {
    organization: 'Your Organization',
    url: 'https://yourwebsite.com'
  },
  capabilities: {
    streaming: true
  },
  skills: [
    {
      id: 'echo',
      name: 'Echo',
      description: 'Echoes back user messages'
    }
  ]
};

// Create file store for persistence
const store = new FileStore({ dir: '.my-agent-tasks' });

// Create and start the server
const server = new A2AServer(enhancedHandler, {
  taskStore: store,
  card: agentCard
});

// Start the server
server.start(41241);

console.log('Enhanced A2A Server started on http://localhost:41241');
console.log('Agent card available at http://localhost:41241/.well-known/agent.json');
```

Visit `http://localhost:41241/.well-known/agent.json` in your browser to see your agent's card information. 