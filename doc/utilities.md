# Utilities

The A2A Server includes several utility functions that provide common functionality used throughout the codebase. These utilities help with validating data types, generating timestamps, and type checking.

## Timestamp Utilities

### getCurrentTimestamp

```typescript
function getCurrentTimestamp(): string
```

Generates a timestamp in ISO 8601 format, which is used for recording when task status changes occur.

**Returns:**
- A string containing the current timestamp in ISO 8601 format (e.g., `"2023-10-25T14:30:45.123Z"`)

**Example:**
```typescript
import { getCurrentTimestamp } from "@agenticdao/crypto-a2a-server/utils";

// Record when a task status changed
const statusUpdate = {
  state: "working",
  message: { /* ... */ },
  timestamp: getCurrentTimestamp()
};
```

## Type Checking Utilities

### isObject

```typescript
function isObject(value: unknown): value is Record<string, any>
```

Checks if a value is a plain JavaScript object (not an array or null).

**Parameters:**
- `value`: The value to check

**Returns:**
- `true` if the value is a plain object, `false` otherwise

**Example:**
```typescript
import { isObject } from "@agenticdao/crypto-a2a-server/utils";

const value1 = { name: "test" };
const value2 = ["test"];
const value3 = null;

isObject(value1); // true
isObject(value2); // false
isObject(value3); // false
```

### isTaskStatusUpdate

```typescript
function isTaskStatusUpdate(update: any): update is Omit<import("./schema").TaskStatus, "timestamp">
```

Type guard to check if an object is a task status update (has 'state' property and lacks 'parts').

**Parameters:**
- `update`: The object to check

**Returns:**
- `true` if the object conforms to the TaskStatus structure, `false` otherwise

**Example:**
```typescript
import { isTaskStatusUpdate } from "@agenticdao/crypto-a2a-server/utils";

const update1 = { state: "working", message: { /* ... */ } };
const update2 = { name: "result.txt", parts: [{ /* ... */ }] };

isTaskStatusUpdate(update1); // true
isTaskStatusUpdate(update2); // false
```

### isArtifactUpdate

```typescript
function isArtifactUpdate(update: any): update is import("./schema").Artifact
```

Type guard to check if an object is an artifact update (has 'parts' property).

**Parameters:**
- `update`: The object to check

**Returns:**
- `true` if the object conforms to the Artifact structure, `false` otherwise

**Example:**
```typescript
import { isArtifactUpdate } from "@agenticdao/crypto-a2a-server/utils";

const update1 = { state: "working", message: { /* ... */ } };
const update2 = { name: "result.txt", parts: [{ /* ... */ }] };

isArtifactUpdate(update1); // false
isArtifactUpdate(update2); // true
```

## Using Utilities in Task Handlers

These utilities are primarily used internally by the A2A Server, but you can also use them in your task handlers if needed:

```typescript
import { getCurrentTimestamp, isObject } from "@agenticdao/crypto-a2a-server/utils";

async function* myTaskHandler(context: TaskContext): AsyncGenerator<TaskYieldUpdate, void, unknown> {
  // Get the current timestamp
  console.log(`Starting task at ${getCurrentTimestamp()}`);
  
  // Check if user provided an object in metadata
  const metadata = context.task.metadata;
  const hasConfig = metadata && isObject(metadata.config);
  
  if (hasConfig) {
    // Process with config...
  } else {
    // Use default settings...
  }
  
  // Rest of handler...
}
```

## Implementation Details

The utility functions are implemented with a focus on simplicity and performance:

```typescript
// Sample implementation of getCurrentTimestamp
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Sample implementation of isObject
export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

These straightforward implementations ensure consistent behavior throughout the application.

## Best Practices

1. **Use type guards for safe type checking**: The `isTaskStatusUpdate` and `isArtifactUpdate` functions help ensure type safety when working with the `TaskYieldUpdate` union type.

2. **Consistent timestamp format**: Always use `getCurrentTimestamp()` for generating timestamps to ensure a consistent format throughout the application.

3. **Safe property access**: When accessing properties of unknown objects, use type guards like `isObject` to avoid type errors. 