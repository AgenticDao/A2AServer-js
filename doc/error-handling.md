# Error Handling

The A2A Server includes a comprehensive error handling system for managing, tracking, and reporting errors in a JSON-RPC compliant format. This document outlines how errors are structured, created, and handled throughout the system.

## A2AError Class

The core of the error handling system is the `A2AError` class, which extends JavaScript's native `Error` class:

```typescript
export class A2AError extends Error {
  public code: schema.KnownErrorCode | number;
  public data?: unknown;
  public taskId?: string; // Optional task ID context

  constructor(
    code: schema.KnownErrorCode | number,
    message: string,
    data?: unknown,
    taskId?: string
  ) {
    super(message);
    this.name = "A2AError";
    this.code = code;
    this.data = data;
    this.taskId = taskId;
  }

  // Additional methods and static factories...
}
```

This class encapsulates:
- The error code (matching JSON-RPC error codes)
- A descriptive message
- Optional additional context data
- Optional task ID for task-specific errors

## Error Codes

The A2A Server uses standard JSON-RPC error codes plus custom codes for agent-specific scenarios:

| Code | Constant | Description |
|------|----------|-------------|
| -32700 | ErrorCodeParseError | Invalid JSON was received |
| -32600 | ErrorCodeInvalidRequest | The JSON sent is not a valid Request object |
| -32601 | ErrorCodeMethodNotFound | The method does not exist / is not available |
| -32602 | ErrorCodeInvalidParams | Invalid method parameter(s) |
| -32603 | ErrorCodeInternalError | Internal JSON-RPC error |
| -32001 | ErrorCodeTaskNotFound | The requested task ID could not be found |
| -32002 | ErrorCodeTaskNotCancelable | The task cannot be canceled (e.g., already completed) |
| -32003 | ErrorCodePushNotificationNotSupported | Push notifications are not supported by this agent |
| -32004 | ErrorCodeUnsupportedOperation | The requested operation is not supported |

## Creating Errors

The `A2AError` class provides static factory methods for creating specific error types:

```typescript
// For invalid parameters
A2AError.invalidParams("Missing required field 'id'");

// For task not found
A2AError.taskNotFound("task-123");

// For internal errors
A2AError.internalError("Database connection failed", errorObject);
```

These factories ensure consistent error codes and messaging throughout the application.

## Converting to JSON-RPC Error Format

The `A2AError` class includes a method to convert the error to the standard JSON-RPC error format:

```typescript
toJSONRPCError(): schema.JSONRPCError<unknown> {
  const errorObject: schema.JSONRPCError<unknown> = {
    code: this.code,
    message: this.message,
  };
  if (this.data !== undefined) {
    errorObject.data = this.data;
  }
  return errorObject;
}
```

This method is used internally by the server to format errors in responses.

## Server-side Error Handling

The A2A Server includes a global error handler middleware that catches and processes errors:

1. Errors are caught by the Express error handler
2. `A2AError` instances are formatted as JSON-RPC errors
3. Other errors are converted to internal errors with appropriate codes
4. Error responses are sent back to the client

## Common Error Scenarios

### Invalid JSON-RPC Request

When a malformed request is received:

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32600,
    "message": "Invalid Request: missing 'jsonrpc' or 'method' field"
  }
}
```

### Task Not Found

When a request references a non-existent task:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32001,
    "message": "Task not found: task-123"
  }
}
```

### Method Not Supported

When a client calls an unsupported method:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32601,
    "message": "Method not found: tasks/unknownMethod"
  }
}
```

## Error Handling in Task Handlers

When writing task handlers, you can yield failed states to indicate errors:

```typescript
async function* myTaskHandler(context: TaskContext): AsyncGenerator<TaskYieldUpdate, void, unknown> {
  try {
    // Task processing logic...
    
    // If an error condition is detected:
    if (invalidCondition) {
      yield {
        state: "failed",
        message: {
          role: "agent",
          parts: [{ 
            type: "text", 
            text: "Could not process your request due to invalid input." 
          }]
        }
      };
      return; // End the generator
    }
    
    // Continue normal processing...
    
  } catch (error) {
    console.error("Unhandled error in task handler:", error);
    
    // Convert to task failure
    yield {
      state: "failed",
      message: {
        role: "agent",
        parts: [{ 
          type: "text", 
          text: "An unexpected error occurred while processing your request." 
        }]
      }
    };
  }
}
```

## Best Practices

1. **Use appropriate error types**: Choose the most specific error type for each situation
2. **Include meaningful messages**: Error messages should be clear and actionable
3. **Add context data when helpful**: Include relevant data for debugging in the `data` field
4. **Log errors consistently**: Maintain good logging for server-side diagnostics
5. **Handle expected errors gracefully**: Convert expected exceptions into appropriate error responses
6. **Let middleware handle unexpected errors**: The global error handler will catch and format uncaught exceptions

## Error Handling for Client Applications

Client applications consuming the A2A Server should:

1. Check for error responses in all JSON-RPC replies
2. Handle error codes appropriately
3. Present useful error messages to users
4. Implement retry logic for transient errors when appropriate 