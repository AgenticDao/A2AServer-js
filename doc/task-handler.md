# Task Handler

The Task Handler is a crucial component in the A2A Server architecture. It contains the core business logic for processing tasks and is implemented as an async generator function.

## Interface Definition

```typescript
type TaskHandler = (
  context: TaskContext
) => AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown>;
```

A task handler:
1. Receives a `TaskContext` object with information about the task
2. Yields updates (`TaskYieldUpdate`) as it processes the task
3. Optionally returns a final task state when completed

## TaskContext

The `TaskContext` interface provides all the information and utilities needed to process a task:

```typescript
interface TaskContext {
  /** The current state of the task when the handler is invoked or resumed. */
  task: schema.Task;

  /** The specific user message that triggered this handler invocation. */
  userMessage: schema.Message;

  /** Function to check if cancellation has been requested for this task. */
  isCancelled(): boolean;

  /** The message history associated with the task up to this point. */
  history?: schema.Message[];
}
```

### Properties

- `task`: The current task object with its ID, status, and other metadata
- `userMessage`: The user message that triggered this task execution
- `history`: Array of previous messages in the conversation (optional)

### Methods

- `isCancelled()`: Returns a boolean indicating if the task has been requested to be cancelled

## TaskYieldUpdate

As the handler processes a task, it yields updates through the `TaskYieldUpdate` type, which can be either:

1. A status update (partial `TaskStatus` without timestamp)
2. An artifact to attach to the task

```typescript
type TaskYieldUpdate =
  | Omit<schema.TaskStatus, "timestamp">
  | schema.Artifact;
```

### Status Update Example

```typescript
// Yield a working status
yield {
  state: "working",
  message: { 
    role: "agent", 
    parts: [{ type: 'text', text: "Processing your request..." }] 
  }
};

// Yield a completed status
yield {
  state: "completed",
  message: { 
    role: "agent", 
    parts: [{ type: 'text', text: "Your task is complete!" }] 
  }
};
```

### Artifact Update Example

```typescript
// Yield a text artifact
yield {
  name: "results.txt",
  mimeType: "text/plain",
  parts: [{ 
    type: 'text', 
    text: "These are the analysis results..." 
  }]
};

// Yield a JSON data artifact
yield {
  name: "data.json",
  parts: [{ 
    type: 'data', 
    data: { 
      results: [1, 2, 3],
      summary: "Analysis complete" 
    } 
  }]
};
```

## Simple Task Handler Example

```typescript
import { TaskContext, TaskYieldUpdate, schema } from "@agenticdao/crypto-a2a-server";

async function* simpleTaskHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  console.log(`Processing task: ${context.task.id}`);
  
  // Acknowledge receipt of the task
  yield {
    state: "working",
    message: { 
      role: "agent", 
      parts: [{ type: 'text', text: "I'm working on your request..." }] 
    }
  };
  
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if task was cancelled during processing
  if (context.isCancelled()) {
    console.log(`Task ${context.task.id} was cancelled`);
    yield { 
      state: "canceled",
      message: { 
        role: "agent", 
        parts: [{ type: 'text', text: "Task cancelled." }] 
      }
    };
    return;
  }
  
  // Create an artifact with results
  yield {
    name: "result.txt",
    mimeType: "text/plain",
    parts: [{ 
      type: 'text', 
      text: `Processed task: ${context.task.id}\nUser message: ${context.userMessage.parts[0].text}` 
    }]
  };
  
  // Complete the task
  yield {
    state: "completed",
    message: { 
      role: "agent", 
      parts: [{ type: 'text', text: "I've completed your request!" }] 
    }
  };
}
```

## Advanced Usage

### Input Validation and Error Handling

```typescript
async function* validatingHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, void, unknown> {
  try {
    // Get user input
    const userInput = context.userMessage.parts[0].text;
    
    // Validate input
    if (!userInput || typeof userInput !== 'string') {
      yield {
        state: "failed",
        message: { 
          role: "agent", 
          parts: [{ type: 'text', text: "Invalid input. Please provide text." }] 
        }
      };
      return;
    }
    
    // Process valid input...
    
  } catch (error) {
    console.error(`Error processing task ${context.task.id}:`, error);
    
    yield {
      state: "failed",
      message: { 
        role: "agent", 
        parts: [{ type: 'text', text: "An error occurred while processing your request." }] 
      }
    };
  }
}
```

### Long-Running Tasks with Progress Updates

```typescript
async function* longRunningTaskHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, void, unknown> {
  const steps = 5;
  
  yield {
    state: "working",
    message: { 
      role: "agent", 
      parts: [{ type: 'text', text: "Starting a long-running task..." }] 
    }
  };
  
  for (let i = 1; i <= steps; i++) {
    // Check for cancellation
    if (context.isCancelled()) {
      yield { state: "canceled" };
      return;
    }
    
    // Simulate work for this step
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Report progress (intermediate message, not a state change)
    yield {
      state: "working",
      message: { 
        role: "agent", 
        parts: [{ type: 'text', text: `Step ${i}/${steps} complete (${Math.round(i/steps*100)}%)` }] 
      }
    };
    
    // Generate intermediate artifact
    yield {
      name: `step_${i}_results.txt`,
      parts: [{ type: 'text', text: `Results from step ${i}` }]
    };
  }
  
  yield {
    state: "completed",
    message: { 
      role: "agent", 
      parts: [{ type: 'text', text: "All steps completed successfully!" }] 
    }
  };
}
```

## Best Practices

1. **Always check for cancellation** periodically during long-running operations
2. **Provide informative status messages** to keep users informed
3. **Handle errors gracefully** and provide useful error messages
4. **Structure artifacts** with meaningful names and appropriate MIME types
5. **Use appropriate state updates** throughout the task lifecycle
6. **Keep memory usage in mind** for large tasks or artifacts 