# Storage

The A2A Server implements a flexible storage system for persisting tasks and their associated message history. This allows the server to handle restarts, track progress, and maintain conversation context over time.

## TaskStore Interface

All storage implementations must implement the `TaskStore` interface:

```typescript
interface TaskStore {
  /**
   * Saves a task and its associated message history.
   * @param data An object containing the task and its history.
   * @returns A promise resolving when the save operation is complete.
   */
  save(data: TaskAndHistory): Promise<void>;

  /**
   * Loads a task and its history by task ID.
   * @param taskId The ID of the task to load.
   * @returns A promise resolving to the task and its history, or null if not found.
   */
  load(taskId: string): Promise<TaskAndHistory | null>;
}
```

The `TaskAndHistory` type combines a task with its message history:

```typescript
interface TaskAndHistory {
  /** The task object containing all task-related data and metadata. */
  task: schema.Task;
  /** The chronological message history associated with the task. */
  history: schema.Message[];
}
```

## Built-in Storage Implementations

### InMemoryTaskStore

The `InMemoryTaskStore` stores tasks and their history in memory. This is the default storage option for the A2A Server.

#### Features

- **Fast access**: In-memory storage provides quick read and write operations
- **Simple implementation**: No external dependencies or configuration needed
- **Automatic cleanup**: Memory usage is contained within the Node.js process

#### Limitations

- **Volatility**: Data is lost when the server restarts
- **Scalability**: Limited by available system memory
- **No persistence**: Not suitable for production environments where task state must survive server restarts

#### Usage

```typescript
import { A2AServer, InMemoryTaskStore } from '@agenticdao/crypto-a2a-server';

// Create a new in-memory store
const store = new InMemoryTaskStore();

// Create server with the store
const server = new A2AServer(myHandler, { taskStore: store });
```

### FileStore

The `FileStore` persists tasks and their history as JSON files on disk. This provides durability across server restarts.

#### Features

- **Persistence**: Data survives server restarts
- **Human-readable**: Stored as JSON files that can be manually inspected
- **No database required**: Uses the filesystem for storage
- **Automatic directory creation**: Creates storage directory if it doesn't exist

#### Configuration Options

```typescript
interface FileStoreOptions {
  /** Directory where task files will be stored (default: '.a2a-tasks') */
  dir?: string;
}
```

#### Usage

```typescript
import { A2AServer, FileStore } from '@agenticdao/crypto-a2a-server';

// Create a file store with custom directory
const store = new FileStore({ dir: 'my-task-storage' });

// Create server with the store
const server = new A2AServer(myHandler, { taskStore: store });
```

#### File Storage Structure

The `FileStore` saves each task as two separate JSON files:
1. `{taskId}.json` - Contains the task data
2. `{taskId}.history.json` - Contains the message history

This separation allows for efficient updates and reading of just the task state or just the history when needed.

## Implementing Custom Storage

You can implement custom storage backends by creating a class that implements the `TaskStore` interface. This allows you to use databases, cloud storage, or other persistence options.

### Example: MongoDB Storage

```typescript
import { TaskStore, TaskAndHistory } from '@agenticdao/crypto-a2a-server';
import { MongoClient, Db } from 'mongodb';

export class MongoTaskStore implements TaskStore {
  private client: MongoClient;
  private db: Db;
  private collection: string;
  
  constructor(connectionString: string, dbName: string, collection = 'tasks') {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(dbName);
    this.collection = collection;
  }
  
  async initialize(): Promise<void> {
    await this.client.connect();
    // Create indexes or setup collection
  }
  
  async save(data: TaskAndHistory): Promise<void> {
    // Combine task and history into a single document
    const document = {
      _id: data.task.id,
      task: data.task,
      history: data.history,
      updatedAt: new Date()
    };
    
    await this.db.collection(this.collection).updateOne(
      { _id: data.task.id },
      { $set: document },
      { upsert: true }
    );
  }
  
  async load(taskId: string): Promise<TaskAndHistory | null> {
    const document = await this.db.collection(this.collection).findOne({ _id: taskId });
    
    if (!document) {
      return null;
    }
    
    return {
      task: document.task,
      history: document.history
    };
  }
  
  async close(): Promise<void> {
    await this.client.close();
  }
}
```

### Storage Best Practices

1. **Implement atomic updates** to prevent data corruption
2. **Handle concurrent access** for multi-instance deployments
3. **Sanitize task IDs** to prevent security issues (e.g., path traversal)
4. **Consider performance** for applications with many tasks
5. **Implement cleanup/retention policies** for long-running services 