# A2A Server (JS)

This directory contains a TypeScript server implementation for the Agent-to-Agent (A2A) communication protocol, built using Express.js.

## Table of Contents

- [Project Structure](#project-structure)
- [Installation](#installation)
- [Basic Usage (Conceptual)](#basic-usage-conceptual)
- [Simple Example](#simple-example)
- [API Reference](#api-reference)
  - [A2AServer](#a2aserver)
  - [Storage Options](#storage-options)
    - [InMemoryTaskStore](#inmemorytaskstore)
    - [FileStore](#filestore)
  - [TaskHandler](#taskhandler)
- [JSON-RPC Endpoints](#json-rpc-endpoints)
- [Security](#security)
  - [Solana Signature Verification](#solana-signature-verification)
- [Testing with cURL](#testing-with-curl)
  - [Method 1: Using Fixed Task IDs](#method-1-using-fixed-task-ids)
  - [Method 2: Using Generated UUIDs](#method-2-using-generated-uuids)

## Project Structure

- `src/` - Source code directory
  - `server.ts` - Core server implementation handling JSON-RPC requests
  - `store.ts` - Task storage implementations (in-memory and file-based)
  - `handler.ts` - Task handler interface definitions
  - `error.ts` - Custom error classes for A2A protocol
  - `utils.ts` - Utility functions for timestamps and type checking
  - `schema.js` - Type definitions for the A2A protocol
  - `index.ts` - Main exports from the library

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Basic Usage (Conceptual)

```typescript
import {
  A2AServer,
  InMemoryTaskStore,
  TaskContext,
  TaskYieldUpdate,
  schema,
} from "./index"; // Assuming imports from the server package

// 1. Define your agent's logic as a TaskHandler
async function* myAgentLogic(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  console.log(`Handling task: ${context.task.id}`);
  yield {
    state: "working",
    message: { 
      role: "agent", 
      parts: [{ type: 'text', text: "Processing..." }] 
    },
  };

  // Simulate work...
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (context.isCancelled()) {
    console.log("Task cancelled!");
    yield { state: "canceled" };
    return;
  }

  // Yield an artifact
  yield {
    name: "result.txt",
    mimeType: "text/plain",
    parts: [{ type: 'text', text: `Task ${context.task.id} completed.` }],
  };

  // Yield final status
  yield {
    state: "completed",
    message: { 
      role: "agent", 
      parts: [{ type: 'text', text: "Done!" }] 
    },
  };
}

// 2. Create and start the server
const store = new InMemoryTaskStore(); // Or new FileStore()
const server = new A2AServer(myAgentLogic, { taskStore: store });

server.start(); // Starts listening on default port 41241

console.log("A2A Server started.");
```

## Simple Example

Here's a more streamlined example of creating a basic agent:

```typescript
import { A2AServer, TaskContext, TaskYieldUpdate, schema } from './index.js';

async function* mySimpleHandler(context: TaskContext): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  console.log(`Handling task ${context.task.id}`);
  
  // Send working status with a message
  yield { 
    state: 'working', 
    message: { 
      role: 'agent', 
      parts: [{ type: 'text', text: 'Working on it...' }] 
    } 
  };

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Check if task was cancelled
  if (context.isCancelled()) {
     console.log("Task cancelled!");
     return;
  }

  // Generate an artifact
  yield {
    name: 'output.txt',
    parts: [{ type: 'text', text: `Result for task ${context.task.id}` }],
  };

  // Mark task as completed
  yield { 
    state: 'completed', 
    message: { 
      role: 'agent', 
      parts: [{ type: 'text', text: 'Done!' }] 
    } 
  };
}

// Create and start the server with default settings
const server = new A2AServer(mySimpleHandler);
server.start();

console.log("Example server started on port 41241");
```

## API Reference

### A2AServer

The main server class that handles A2A protocol requests.

```typescript
const server = new A2AServer(taskHandler, options);
```

**Options:**
- `taskStore`: Implementation of `TaskStore` (defaults to `InMemoryTaskStore`)
- `cors`: CORS configuration (defaults to allowing all origins)
- `basePath`: Base path for the API endpoint (defaults to '/')
- `card`: Agent card metadata
- `enableSignatureVerification`: Enable Solana wallet signature verification (defaults to false)

### Storage Options

#### InMemoryTaskStore

Stores tasks in memory. Data is lost when the server is restarted.

```typescript
const store = new InMemoryTaskStore();
```

#### FileStore

Persists tasks to the filesystem.

```typescript
const store = new FileStore({ dir: '.a2a-tasks' });
```

### TaskHandler

Your agent's core logic is implemented as an async generator function:

```typescript
async function* myHandler(context: TaskContext): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  // Your agent logic here
}
```

The handler receives a `TaskContext` with:
- `task`: Current task state
- `userMessage`: The message that triggered this task
- `history`: All previous messages in the conversation
- `isCancelled()`: Function to check if the task was cancelled

## JSON-RPC Endpoints

The server implements these A2A protocol endpoints:

- `tasks/send`: Submit a task and wait for completion
- `tasks/sendSubscribe`: Submit a task and receive streaming updates
- `tasks/get`: Get the current state of a task
- `tasks/cancel`: Cancel a running task

## Security

### Solana Signature Verification

The server can be configured to require Solana wallet signature verification for all requests. When enabled, clients must include three headers with each request:

- `X-A2A-Verify-Signature`: The signature in base64 format
- `X-A2A-Verify-Message`: The original message that was signed
- `X-A2A-Verify-PublicKey`: The Solana public key that signed the message

To enable signature verification:

```typescript
const server = new A2AServer(myHandler, {
  enableSignatureVerification: true
});
```

Example client-side signing code (using @solana/web3.js and a browser wallet):

```typescript
import { Connection, PublicKey } from '@solana/web3.js';

async function signAndSendRequest(endpoint, jsonRpcPayload) {
  // Get the wallet adapter from your app (this depends on your wallet integration)
  const wallet = getWallet();
  
  // Create a message to sign (e.g., combination of timestamp and request data)
  const message = `${Date.now()}-${JSON.stringify(jsonRpcPayload)}`;
  
  // Sign the message with wallet
  const encodedMessage = new TextEncoder().encode(message);
  const signature = await wallet.signMessage(encodedMessage);
  
  // Convert signature to base64
  const signatureBase64 = Buffer.from(signature).toString('base64');
  
  // Send the request with verification headers
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-A2A-Verify-Signature': signatureBase64,
      'X-A2A-Verify-Message': message,
      'X-A2A-Verify-PublicKey': wallet.publicKey.toString()
    },
    body: JSON.stringify(jsonRpcPayload)
  });
  
  return await response.json();
}
```

If any of the verification headers are missing or the signature is invalid, the server will respond with a 403 Forbidden error.

## Testing with cURL

### Method 1: Using Fixed Task IDs

```bash
# Send a task
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

# Subscribe to streaming updates
curl -N -X POST http://localhost:41241 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/sendSubscribe",
    "id": 2,
    "params": {
      "id": "task-124",
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "Process this with streaming."}]
      }
    }
  }'
```

### Method 2: Using Generated UUIDs

On macOS/Linux systems, you can use the `uuidgen` command to create unique IDs:

```bash
# Send a task with a generated UUID
curl -X POST http://localhost:41241 -H "Content-Type: application/json" -d \
'{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "id": 1,
  "params": {
    "id": "'$(uuidgen)'",
    "message": {
      "role": "user",
      "parts": [{"type": "text", "text": "Please do the thing."}]
    }
  }
}'

# Send and subscribe with a generated UUID
curl -N -X POST http://localhost:41241 -H "Content-Type: application/json" -d \
'{
  "jsonrpc": "2.0",
  "method": "tasks/sendSubscribe",
  "id": 2,
  "params": {
     "id": "'$(uuidgen)'",
     "message": {
       "role": "user",
       "parts": [{"type": "text", "text": "Please do the streaming thing."}]
     }
   }
}'
```

This server implementation provides a foundation for building A2A-compliant agents in TypeScript.
