# Schema

The A2A Server uses a comprehensive type system to define the structure of tasks, messages, artifacts, and other core data structures. These schemas ensure type safety and provide a consistent interface for agent-to-app communication.

## Core Data Structures

### Task

A task represents a unit of work in the A2A protocol.

```typescript
interface Task {
  /**
   * Unique identifier for the task.
   */
  id: string;

  /**
   * Optional identifier for the session this task belongs to.
   */
  sessionId?: string | null;

  /**
   * The current status of the task.
   */
  status: TaskStatus;

  /**
   * Optional list of artifacts associated with the task (e.g., outputs, intermediate files).
   */
  artifacts?: Artifact[] | null;

  /**
   * Optional metadata associated with the task.
   */
  metadata?: Record<string, unknown> | null;
}
```

### TaskStatus

Represents the current state of a task.

```typescript
interface TaskStatus {
  /**
   * The current state of the task.
   */
  state: TaskState;

  /**
   * An optional message associated with the current status.
   */
  message?: Message | null;

  /**
   * The timestamp when this status was recorded (ISO 8601 format).
   */
  timestamp?: string;
}
```

### TaskState

The possible states a task can be in:

```typescript
type TaskState =
  | "submitted" // Initial state when a task is created
  | "working"   // The task is being processed
  | "input-required" // The task needs additional input from the user
  | "completed" // The task has been successfully completed
  | "canceled"  // The task was canceled before completion
  | "failed"    // The task encountered an error and couldn't be completed
  | "unknown";  // The task state cannot be determined
```

### Message

A message exchanged between a user and an agent.

```typescript
interface Message {
  /**
   * The role of the sender (user or agent).
   */
  role: "user" | "agent";

  /**
   * The content of the message, composed of one or more parts.
   */
  parts: Part[];

  /**
   * Optional metadata associated with the message.
   */
  metadata?: Record<string, unknown> | null;
}
```

### Part

Messages can contain different types of content, represented as parts:

```typescript
type Part = TextPart | FilePart | DataPart;
```

#### TextPart

```typescript
interface TextPart {
  type: "text";
  text: string;
  metadata?: Record<string, unknown> | null;
}
```

#### FilePart

```typescript
interface FilePart {
  type: "file";
  file: FileContent;
  metadata?: Record<string, unknown> | null;
}
```

#### DataPart

```typescript
interface DataPart {
  type: "data";
  data: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
}
```

### Artifact

An artifact is a piece of content produced by the agent:

```typescript
interface Artifact {
  /**
   * Optional name for the artifact.
   */
  name?: string | null;

  /**
   * Optional description of the artifact.
   */
  description?: string | null;

  /**
   * The constituent parts of the artifact.
   */
  parts: Part[];

  /**
   * Optional index for ordering artifacts.
   */
  index?: number;

  /**
   * Optional flag indicating if this artifact content should append to previous content.
   */
  append?: boolean | null;

  /**
   * Optional metadata associated with the artifact.
   */
  metadata?: Record<string, unknown> | null;

  /**
   * Optional flag indicating if this is the last chunk of data for this artifact.
   */
  lastChunk?: boolean | null;
}
```

## Agent Information

### AgentCard

Describes an agent's capabilities and metadata:

```typescript
interface AgentCard {
  /**
   * The name of the agent.
   */
  name: string;

  /**
   * An optional description of the agent.
   */
  description?: string | null;

  /**
   * The base URL endpoint for interacting with the agent.
   */
  url: string;

  /**
   * Information about the provider of the agent.
   */
  provider?: AgentProvider | null;

  /**
   * The version identifier for the agent or its API.
   */
  version: string;

  /**
   * An optional URL pointing to the agent's documentation.
   */
  documentationUrl?: string | null;

  /**
   * The capabilities supported by the agent.
   */
  capabilities: AgentCapabilities;

  /**
   * Authentication details required to interact with the agent.
   */
  authentication?: AgentAuthentication | null;

  /**
   * Default input modes supported by the agent (e.g., 'text', 'file', 'json').
   */
  defaultInputModes?: string[];

  /**
   * Default output modes supported by the agent (e.g., 'text', 'file', 'json').
   */
  defaultOutputModes?: string[];

  /**
   * List of specific skills offered by the agent.
   */
  skills: AgentSkill[];
}
```

### AgentCapabilities

```typescript
interface AgentCapabilities {
  /**
   * Indicates if the agent supports streaming responses.
   */
  streaming?: boolean;

  /**
   * Indicates if the agent supports push notification mechanisms.
   */
  pushNotifications?: boolean;

  /**
   * Indicates if the agent supports providing state transition history.
   */
  stateTransitionHistory?: boolean;
}
```

## JSON-RPC Protocol

The A2A Server implements the JSON-RPC 2.0 specification for structured communication.

### JSONRPCRequest

```typescript
interface JSONRPCRequest extends JSONRPCMessage {
  /**
   * The name of the method to be invoked.
   */
  method: string;

  /**
   * Parameters for the method.
   */
  params?: unknown;
}
```

### JSONRPCResponse

```typescript
interface JSONRPCResponse<R = unknown | null, E = unknown | null> extends JSONRPCMessage {
  /**
   * The result of the method invocation.
   */
  result: R;

  /**
   * An error object if an error occurred during the request.
   */
  error?: JSONRPCError<E> | null;
}
```

### JSON-RPC Error Codes

The A2A Server defines several standard error codes:

```typescript
// Standard JSON-RPC error codes
const ErrorCodeParseError = -32700;
const ErrorCodeInvalidRequest = -32600;
const ErrorCodeMethodNotFound = -32601;
const ErrorCodeInvalidParams = -32602;
const ErrorCodeInternalError = -32603;

// A2A-specific error codes
const ErrorCodeTaskNotFound = -32001;
const ErrorCodeTaskNotCancelable = -32002;
const ErrorCodePushNotificationNotSupported = -32003;
const ErrorCodeUnsupportedOperation = -32004;
```

## Using the Schema in Your Code

The schema types are exported from the A2A Server library, allowing you to use them in your own code:

```typescript
import { schema } from 'a2a-server';

// Create a new task
const task: schema.Task = {
  id: 'task-123',
  status: {
    state: 'submitted',
    timestamp: new Date().toISOString()
  }
};

// Create a user message
const message: schema.Message = {
  role: 'user',
  parts: [
    {
      type: 'text',
      text: 'Hello, agent!'
    }
  ]
};
```

These type definitions ensure consistent data structures throughout your agent implementation and help catch potential issues at compile time when using TypeScript. 