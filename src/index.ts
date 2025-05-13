/**
 * Main entry point for the A2A Server V2 library.
 * Exports the server class, store implementations, and core types.
 * This module provides a convenient way to import all necessary components
 * for creating and running an A2A-compliant server.
 */

// Export the main server class and its options
export { A2AServer } from "./server";
export type { A2AServerOptions } from "./server";

// Export handler-related types
export type { TaskHandler, TaskContext, TaskYieldUpdate } from "./handler";

// Export store-related types and implementations
export type { TaskStore } from "./store";
export { InMemoryTaskStore, FileStore } from "./store";

// Export the custom error class
export { A2AError } from "./error";

// Re-export all schema types for convenience
export * as schema from "./schema";
