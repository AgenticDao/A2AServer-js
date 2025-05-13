# Introduction to A2A Server

## What is A2A Server?

A2A Server is a TypeScript/JavaScript implementation of the Agent-to-Agent (A2A) communication protocol. This library enables developers to create agent services that can receive tasks from applications, process them asynchronously, and return results. The server handles all the necessary communication protocol details, allowing developers to focus on building the agent's core logic.

## Key Features

- **JSON-RPC 2.0 Compliant**: Implements the JSON-RPC 2.0 specification for structured communication.
- **Task Management**: Supports creating, querying, and canceling tasks.
- **Streaming Support**: Real-time updates via event streaming for long-running tasks.
- **Flexible Storage**: Pluggable storage backends with in-memory and file-based options included.
- **Artifact Handling**: Built-in support for generating and managing task artifacts.
- **Solana Integration**: Optional signature verification using Solana wallets for secure access.

## Architecture Overview

The A2A Server architecture follows a clean, modular design:

```
┌─────────────────┐     ┌─────────────────────┐
│                 │     │                     │
│  Client App     │◄────►  A2A Server         │
│  (JSON-RPC)     │     │  (Express.js)       │
│                 │     │                     │
└─────────────────┘     └──────────┬──────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │                     │
                         │  Task Handler       │
                         │  (Your Agent Logic) │
                         │                     │
                         └──────────┬──────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │                     │
                         │  Task Storage       │
                         │  (Memory or File)   │
                         │                     │
                         └─────────────────────┘
```

## Core Concepts

### Task

A task is the basic unit of work in the A2A protocol. Tasks have:
- A unique identifier
- A current status (submitted, working, completed, etc.)
- An optional collection of artifacts (outputs)
- Associated message history

### Handler

A task handler is an async generator function that contains your agent's core business logic. It:
- Receives context about the task to be performed
- Processes the task and yields updates as it works
- Generates artifacts and status updates
- Can check for cancellation requests

### JSON-RPC Endpoints

The server exposes several JSON-RPC methods:
- `tasks/send`: Submit a task and wait for completion
- `tasks/sendSubscribe`: Submit a task and receive streaming updates
- `tasks/get`: Get the current state of a task
- `tasks/cancel`: Cancel a running task

## Getting Started

To quickly get started with the A2A Server, see the [Getting Started](./getting-started.md) guide, which provides a step-by-step walkthrough of setting up your first agent using this library. 