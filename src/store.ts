import fs from "fs/promises";
import path from "path";
import * as schema from "./schema";
import { A2AError } from "./error";
import {
  getCurrentTimestamp,
  isArtifactUpdate,
  isTaskStatusUpdate,
} from "./utils";

/**
 * Represents a task and its complete message history as a single entity.
 * Used for simplified storage and retrieval operations.
 */
export interface TaskAndHistory {
  /** The task object containing all task-related data and metadata. */
  task: schema.Task;
  /** The chronological message history associated with the task. */
  history: schema.Message[];
}

/**
 * Simplified interface for task storage providers.
 * Defines the contract that all storage implementations must fulfill.
 * Stores and retrieves both the task and its full message history together.
 */
export interface TaskStore {
  /**
   * Saves a task and its associated message history.
   * Overwrites existing data if the task ID exists.
   * @param data An object containing the task and its history.
   * @returns A promise resolving when the save operation is complete.
   * @throws May throw errors if storage operations fail.
   */
  save(data: TaskAndHistory): Promise<void>;

  /**
   * Loads a task and its history by task ID.
   * @param taskId The ID of the task to load.
   * @returns A promise resolving to an object containing the Task and its history, or null if not found.
   * @throws May throw errors if storage operations fail.
   */
  load(taskId: string): Promise<TaskAndHistory | null>;
}

// ========================
// InMemoryTaskStore
// ========================

/**
 * In-memory implementation of TaskStore.
 * Stores tasks and their histories in a Map for fast access.
 * Data is lost when the process terminates.
 */
export class InMemoryTaskStore implements TaskStore {
  /** Map storing task IDs to their corresponding task and history data. */
  private store: Map<string, TaskAndHistory> = new Map();

  /**
   * Loads a task and its history from the in-memory store.
   * @param taskId The ID of the task to load.
   * @returns A promise resolving to the task and its history, or null if not found.
   */
  async load(taskId: string): Promise<TaskAndHistory | null> {
    const entry = this.store.get(taskId);
    // Return copies to prevent external mutation
    return entry
      ? { task: { ...entry.task }, history: [...entry.history] }
      : null;
  }

  /**
   * Saves a task and its history to the in-memory store.
   * @param data The task and history data to save.
   * @returns A promise that resolves when the save operation is complete.
   */
  async save(data: TaskAndHistory): Promise<void> {
    // Store copies to prevent internal mutation if caller reuses objects
    this.store.set(data.task.id, {
      task: { ...data.task },
      history: [...data.history],
    });
  }
}

// ========================
// FileStore
// ========================

/**
 * File-based implementation of TaskStore.
 * Persists tasks and their histories as JSON files on disk.
 * Data is preserved between process restarts.
 */
export class FileStore implements TaskStore {
  /** Base directory where task files will be stored. */
  private baseDir: string;

  /**
   * Creates a new FileStore instance.
   * @param options Configuration options for the file store.
   * @param options.dir Optional directory path where task files will be stored (default: '.a2a-tasks').
   */
  constructor(options?: { dir?: string }) {
    // Default directory relative to the current working directory
    this.baseDir = options?.dir || ".a2a-tasks";
  }

  /**
   * Ensures the base storage directory exists, creating it if necessary.
   * @throws A2AError if directory creation fails.
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error: any) {
      throw A2AError.internalError(
        `Failed to create directory ${this.baseDir}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generates the file path for storing a task's main data.
   * @param taskId The ID of the task.
   * @returns Sanitized file path for the task data.
   */
  private getTaskFilePath(taskId: string): string {
    // Sanitize taskId to prevent directory traversal
    const safeTaskId = path.basename(taskId);
    return path.join(this.baseDir, `${safeTaskId}.json`);
  }

  /**
   * Generates the file path for storing a task's message history.
   * @param taskId The ID of the task.
   * @returns Sanitized file path for the task's history data.
   * @throws A2AError if taskId contains invalid characters.
   */
  private getHistoryFilePath(taskId: string): string {
    // Sanitize taskId
    const safeTaskId = path.basename(taskId);
    if (safeTaskId !== taskId || taskId.includes("..")) {
      throw A2AError.invalidParams(`Invalid Task ID format: ${taskId}`);
    }
    return path.join(this.baseDir, `${safeTaskId}.history.json`);
  }

  /**
   * Type guard to validate the structure of history file content.
   * @param content The content to validate.
   * @returns True if the content has the expected structure.
   */
  private isHistoryFileContent(
    content: any
  ): content is { messageHistory: schema.Message[] } {
    return (
      typeof content === "object" &&
      content !== null &&
      Array.isArray(content.messageHistory) &&
      // Optional: Add deeper validation of message structure if needed
      content.messageHistory.every(
        (msg: any) => typeof msg === "object" && msg.role && msg.parts
      )
    );
  }

  /**
   * Reads and parses a JSON file from disk.
   * @param filePath Path to the JSON file.
   * @returns Parsed JSON content, or null if the file doesn't exist.
   * @throws A2AError if file reading or parsing fails.
   */
  private async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      const data = await fs.readFile(filePath, "utf8");
      return JSON.parse(data) as T;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null; // File not found is not an error for loading
      }
      throw A2AError.internalError(
        `Failed to read file ${filePath}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Writes data to a JSON file on disk.
   * @param filePath Path where the file should be written.
   * @param data Data to serialize and write.
   * @throws A2AError if directory creation or file writing fails.
   */
  private async writeJsonFile(filePath: string, data: any): Promise<void> {
    try {
      await this.ensureDirectoryExists();
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (error: any) {
      throw A2AError.internalError(
        `Failed to write file ${filePath}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Loads a task and its history from disk.
   * @param taskId The ID of the task to load.
   * @returns The task and its history, or null if the task doesn't exist.
   * @throws A2AError if file operations fail.
   */
  async load(taskId: string): Promise<TaskAndHistory | null> {
    const taskFilePath = this.getTaskFilePath(taskId);
    const historyFilePath = this.getHistoryFilePath(taskId);

    // Read task file first - if it doesn't exist, the task doesn't exist.
    const task = await this.readJsonFile<schema.Task>(taskFilePath);
    if (!task) {
      return null; // Task not found
    }

    // Task exists, now try to read history. It might not exist yet.
    let history: schema.Message[] = [];
    try {
      const historyContent = await this.readJsonFile<unknown>(historyFilePath);
      // Validate the structure slightly
      if (this.isHistoryFileContent(historyContent)) {
        history = historyContent.messageHistory;
      } else if (historyContent !== null) {
        // Log a warning if the history file exists but is malformed
        console.warn(
          `[FileStore] Malformed history file found for task ${taskId} at ${historyFilePath}. Ignoring content.`
        );
        // Attempt to delete or rename the malformed file? Or just proceed with empty history.
        // For now, proceed with empty. A 'save' will overwrite it correctly later.
      }
      // If historyContent is null (file not found), history remains []
    } catch (error) {
      // Log error reading history but proceed with empty history
      console.error(
        `[FileStore] Error reading history file for task ${taskId}:`,
        error
      );
      // Proceed with empty history
    }

    return { task, history };
  }

  /**
   * Saves a task and its history to disk as separate JSON files.
   * @param data The task and history data to save.
   * @throws A2AError if file operations fail.
   */
  async save(data: TaskAndHistory): Promise<void> {
    const { task, history } = data;
    const taskFilePath = this.getTaskFilePath(task.id);
    const historyFilePath = this.getHistoryFilePath(task.id);

    // Ensure directory exists (writeJsonFile does this, but good practice)
    await this.ensureDirectoryExists();

    // Write both files - potentially in parallel
    await Promise.all([
      this.writeJsonFile(taskFilePath, task),
      this.writeJsonFile(historyFilePath, { messageHistory: history }),
    ]);
  }
}
