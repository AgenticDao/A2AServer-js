import * as schema from "./schema.js";

/**
 * Custom error class for A2A server operations, incorporating JSON-RPC error codes.
 * Provides a standardized way to create, manage, and format errors according to the JSON-RPC specification.
 */
export class A2AError extends Error {
  public code: schema.KnownErrorCode | number;
  public data?: unknown;
  public taskId?: string; // Optional task ID context

  /**
   * Creates a new A2AError instance.
   * @param code The JSON-RPC error code.
   * @param message The error message.
   * @param data Additional error data (optional).
   * @param taskId Associated task ID for context (optional).
   */
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
    this.taskId = taskId; // Store associated task ID if provided
  }

  /**
   * Formats the error into a standard JSON-RPC error object structure.
   * @returns A JSON-RPC compliant error object ready for serialization.
   */
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

  // Static factory methods for common errors

  /**
   * Creates an error for JSON parsing failures.
   * @param message Detailed error message.
   * @param data Additional error context (optional).
   * @returns A new A2AError instance with the appropriate error code.
   */
  static parseError(message: string, data?: unknown): A2AError {
    return new A2AError(schema.ErrorCodeParseError, message, data);
  }

  /**
   * Creates an error for invalid JSON-RPC request structure.
   * @param message Detailed error message.
   * @param data Additional error context (optional).
   * @returns A new A2AError instance with the appropriate error code.
   */
  static invalidRequest(message: string, data?: unknown): A2AError {
    return new A2AError(schema.ErrorCodeInvalidRequest, message, data);
  }

  /**
   * Creates an error for undefined methods.
   * @param method The method name that was not found.
   * @returns A new A2AError instance with the appropriate error code.
   */
  static methodNotFound(method: string): A2AError {
    return new A2AError(
      schema.ErrorCodeMethodNotFound,
      `Method not found: ${method}`
    );
  }

  /**
   * Creates an error for invalid method parameters.
   * @param message Detailed error message.
   * @param data Additional error context (optional).
   * @returns A new A2AError instance with the appropriate error code.
   */
  static invalidParams(message: string, data?: unknown): A2AError {
    return new A2AError(schema.ErrorCodeInvalidParams, message, data);
  }

  /**
   * Creates an error for internal server issues.
   * @param message Detailed error message.
   * @param data Additional error context (optional).
   * @returns A new A2AError instance with the appropriate error code.
   */
  static internalError(message: string, data?: unknown): A2AError {
    return new A2AError(schema.ErrorCodeInternalError, message, data);
  }

  /**
   * Creates an error for task not found scenarios.
   * @param taskId The ID of the task that wasn't found.
   * @returns A new A2AError instance with the appropriate error code.
   */
  static taskNotFound(taskId: string): A2AError {
    return new A2AError(
      schema.ErrorCodeTaskNotFound,
      `Task not found: ${taskId}`,
      undefined,
      taskId
    );
  }

  /**
   * Creates an error for tasks that cannot be canceled.
   * @param taskId The ID of the task that cannot be canceled.
   * @returns A new A2AError instance with the appropriate error code.
   */
  static taskNotCancelable(taskId: string): A2AError {
    return new A2AError(
      schema.ErrorCodeTaskNotCancelable,
      `Task not cancelable: ${taskId}`,
      undefined,
      taskId
    );
  }

  /**
   * Creates an error for when push notifications are not supported.
   * @returns A new A2AError instance with the appropriate error code.
   */
  static pushNotificationNotSupported(): A2AError {
    return new A2AError(
      schema.ErrorCodePushNotificationNotSupported,
      "Push Notification is not supported"
    );
  }

  /**
   * Creates an error for unsupported operations.
   * @param operation The name of the unsupported operation.
   * @returns A new A2AError instance with the appropriate error code.
   */
  static unsupportedOperation(operation: string): A2AError {
    return new A2AError(
      schema.ErrorCodeUnsupportedOperation,
      `Unsupported operation: ${operation}`
    );
  }
}
