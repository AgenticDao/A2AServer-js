# A2AServer Class

The `A2AServer` class is the core component of the @agenticdao/crypto-a2a-server library. It provides an Express-based server that implements the A2A protocol, handling incoming JSON-RPC requests, managing tasks, and communicating with the task handler.

## Import

```typescript
import { A2AServer } from "@agenticdao/crypto-a2a-server";
```

## Constructor

```typescript
constructor(handler: TaskHandler, options: A2AServerOptions = {})
```

### Parameters

- `handler`: A `TaskHandler` function that processes tasks. This is the core business logic of your agent.
- `options`: An optional configuration object with the following properties:
  - `taskStore`: An implementation of the `TaskStore` interface. Defaults to `InMemoryTaskStore`.
  - `cors`: CORS configuration options or boolean/string. Defaults to allowing all origins.
  - `basePath`: Base path for the A2A endpoint. Defaults to '/'.
  - `card`: An `AgentCard` object describing the agent's metadata.
  - `enableVerification`: Whether to enable Solana signature verification. Defaults to false.

## Methods

### start

```typescript
start(port = 41241): express.Express
```

Starts the Express server listening on the specified port, sets up routes, middleware, and error handlers.

**Parameters:**
- `port`: Port number to listen on. Defaults to 41241.

**Returns:**
- The running Express application instance.

### endpoint

```typescript
endpoint(): RequestHandler
```

Returns an Express middleware handler that can be mounted on an existing Express application.

**Returns:**
- An Express `RequestHandler` that processes A2A JSON-RPC requests.

## JSON-RPC Methods

The A2AServer implements the following JSON-RPC methods as specified by the A2A protocol:

### tasks/send

Submits a task to the agent and waits for it to complete before returning a response.

**Parameters:**
- `id`: A unique identifier for the task.
- `sessionId`: Optional identifier for grouping related tasks.
- `message`: The user message that triggers the task.
- `metadata`: Optional metadata for the task.

**Response:**
- The completed task object with results.

### tasks/sendSubscribe

Submits a task to the agent and establishes a streaming connection for real-time updates.

**Parameters:**
- Same as `tasks/send`.

**Response:**
- Streams task status and artifact updates as they occur.

### tasks/get

Retrieves the current state of a task.

**Parameters:**
- `id`: The unique identifier of the task to retrieve.
- `historyLength`: Optional parameter to limit the amount of history returned.

**Response:**
- The current state of the requested task.

### tasks/cancel

Attempts to cancel a running task.

**Parameters:**
- `id`: The unique identifier of the task to cancel.

**Response:**
- The updated task state after the cancellation attempt.

## Internal Architecture

The A2AServer maintains the following key components:

- **Task Store**: Persists tasks and their history.
- **Task Handler**: Processes tasks with custom business logic.
- **Express Server**: Handles HTTP requests and responses.
- **Active Cancellations**: Tracks tasks that have been requested to cancel.
- **Solana Verification**: Optional component for verifying request signatures.

## Example Usage

```typescript
import { A2AServer, TaskContext, TaskYieldUpdate, schema } from "@agenticdao/crypto-a2a-server";

// Define your agent's logic
async function* myHandler(context: TaskContext): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  // Initial response
  yield {
    state: "working",
    message: { 
      role: "agent", 
      parts: [{ type: 'text', text: "Working on it..." }] 
    }
  };

  // Process the task...
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check for cancellation
  if (context.isCancelled()) {
    yield { state: "canceled" };
    return;
  }

  // Return a result
  yield {
    state: "completed",
    message: { 
      role: "agent", 
      parts: [{ type: 'text', text: "Done!" }] 
    }
  };
}

// Create and start the server
const server = new A2AServer(myHandler);
server.start(41241);
console.log("A2A Server started on port 41241");
```

## Advanced Configuration

### Custom Task Store

```typescript
import { A2AServer, FileStore } from "@agenticdao/crypto-a2a-server";

// Use file-based storage
const store = new FileStore({ dir: "my-tasks" });
const server = new A2AServer(myHandler, { taskStore: store });
```

### With Solana Verification

```typescript
import { A2AServer } from "@agenticdao/crypto-a2a-server";

// Enable Solana signature verification
const server = new A2AServer(myHandler, { 
  enableVerification: true
});

// Set environment variables:
// AGENT_NFT_ADDRESS - The NFT mint address representing this agent
// AGENT_MARKET_ADDRESS - The Solana program address for the agent market
// WALLET_PRIVATE_KEY - The private key for the agent's wallet
// SOLANA_RPC_URL - URL for the Solana RPC node
```

### Custom Agent Card

```typescript
import { A2AServer, schema } from "@agenticdao/crypto-a2a-server";

const agentCard: schema.AgentCard = {
  name: "My AI Agent",
  description: "A smart assistant for your needs",
  url: "https://myagent.example.com",
  version: "1.0.0",
  capabilities: {
    streaming: true
  },
  skills: [
    {
      id: "text-processing",
      name: "Text Processing",
      description: "Process and analyze text"
    }
  ]
};

const server = new A2AServer(myHandler, { card: agentCard });
``` 