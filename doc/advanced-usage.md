# Advanced Usage

This guide covers advanced usage patterns for the A2A Server, including techniques for building more complex agents, handling long-running tasks, implementing conversational state, and integrating with external services.

## Table of Contents

- [Conversation History and Context](#conversation-history-and-context)
- [Long-Running Tasks](#long-running-tasks)
- [Multi-Turn Conversations](#multi-turn-conversations)
- [External API Integration](#external-api-integration)
- [File Processing](#file-processing)
- [Deploying to Production](#deploying-to-production)

## Conversation History and Context

The `TaskContext` provides access to the conversation history, allowing your agent to maintain context across multiple turns:

```typescript
async function* contextAwareHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  // Get the full message history
  const history = context.history || [];
  
  // Count previous messages from the user
  const userMessageCount = history.filter(msg => msg.role === 'user').length;
  
  if (userMessageCount === 0) {
    // First message in conversation
    yield {
      state: 'working',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: 'Welcome! How can I help you today?' }]
      }
    };
  } else {
    // Reference previous context
    yield {
      state: 'working',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: `This is message ${userMessageCount + 1} in our conversation.` }]
      }
    };
  }
  
  // Process the current message...
  
  // Complete the task
  yield {
    state: 'completed',
    message: {
      role: 'agent',
      parts: [{ type: 'text', text: 'I have processed your request.' }]
    }
  };
}
```

### Session Management

You can group related tasks using the `sessionId` parameter:

```typescript
// Client code
const response = await fetch('http://localhost:41241', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tasks/send',
    id: 1,
    params: {
      id: 'task-123',
      sessionId: 'session-abc', // Group related tasks
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }]
      }
    }
  })
});
```

## Long-Running Tasks

For tasks that take a significant amount of time to complete, you can provide progress updates and handle cancellation gracefully:

```typescript
async function* longRunningTaskHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  const steps = 10;
  
  // Initial acknowledgment
  yield {
    state: 'working',
    message: {
      role: 'agent',
      parts: [{ type: 'text', text: 'Starting a long-running task...' }]
    }
  };
  
  // Process each step
  for (let i = 1; i <= steps; i++) {
    // Check for cancellation before each step
    if (context.isCancelled()) {
      yield { 
        state: 'canceled',
        message: { 
          role: 'agent', 
          parts: [{ type: 'text', text: `Task cancelled at step ${i}/${steps}` }] 
        }
      };
      return;
    }
    
    // Simulate work for this step
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Provide a progress update (still in 'working' state)
    const progress = Math.round((i / steps) * 100);
    yield {
      state: 'working',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: `Step ${i}/${steps} complete (${progress}%)` }]
      }
    };
    
    // Generate an intermediate artifact if applicable
    if (i % 3 === 0) {
      yield {
        name: `progress_report_${i}.txt`,
        parts: [{ type: 'text', text: `Progress report for step ${i}` }]
      };
    }
  }
  
  // Task completed
  yield {
    state: 'completed',
    message: {
      role: 'agent',
      parts: [{ type: 'text', text: 'Long-running task completed successfully!' }]
    }
  };
}
```

## Multi-Turn Conversations

You can build agents that require multiple interactions to complete a task:

```typescript
async function* multiTurnHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  const history = context.history || [];
  const userMessage = context.userMessage.parts.find(part => part.type === 'text')?.text || '';
  
  // Find the current stage of conversation
  // (In a real implementation, you might store this in task metadata)
  let stage = 'initial';
  
  // Find the last message from the agent to determine the stage
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === 'agent' && msg.metadata?.stage) {
      stage = msg.metadata.stage as string;
      break;
    }
  }
  
  if (stage === 'initial') {
    // First interaction - ask for name
    yield {
      state: 'input-required',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: 'What is your name?' }],
        metadata: { stage: 'name_requested' }
      }
    };
    return;
  }
  
  if (stage === 'name_requested') {
    // Got the name, now ask for age
    const name = userMessage;
    yield {
      state: 'input-required',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: `Nice to meet you, ${name}! How old are you?` }],
        metadata: { stage: 'age_requested', name }
      }
    };
    return;
  }
  
  if (stage === 'age_requested') {
    // Find name from earlier message
    let name = 'friend';
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.role === 'agent' && msg.metadata?.name) {
        name = msg.metadata.name as string;
        break;
      }
    }
    
    // Complete the conversation
    const age = userMessage;
    yield {
      state: 'completed',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: `Thanks ${name}! I've recorded that you are ${age} years old.` }]
      }
    };
  }
}
```

## External API Integration

Integrating with external APIs allows your agent to access real-world data or perform actions:

```typescript
import fetch from 'node-fetch';

async function* weatherApiHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  const city = context.userMessage.parts.find(part => part.type === 'text')?.text || '';
  
  if (!city) {
    yield {
      state: 'input-required',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: 'Please provide a city name.' }]
      }
    };
    return;
  }
  
  // Acknowledge the request
  yield {
    state: 'working',
    message: {
      role: 'agent',
      parts: [{ type: 'text', text: `Fetching weather data for ${city}...` }]
    }
  };
  
  try {
    // Call an external API (replace with your actual API key)
    const apiKey = process.env.WEATHER_API_KEY;
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(city)}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Create an artifact with the raw data
    yield {
      name: 'weather_data.json',
      mimeType: 'application/json',
      parts: [{ type: 'data', data }]
    };
    
    // Format a human-readable response
    const weatherText = 
      `Weather in ${data.location.name}, ${data.location.country}:\n` +
      `Temperature: ${data.current.temp_c}°C / ${data.current.temp_f}°F\n` +
      `Condition: ${data.current.condition.text}\n` +
      `Humidity: ${data.current.humidity}%\n` +
      `Wind: ${data.current.wind_kph} km/h`;
    
    // Complete the task
    yield {
      state: 'completed',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: weatherText }]
      }
    };
    
  } catch (error) {
    console.error('API error:', error);
    
    yield {
      state: 'failed',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: `Sorry, I couldn't fetch weather data: ${error.message}` }]
      }
    };
  }
}
```

## File Processing

The A2A protocol supports file inputs and outputs. Here's how to handle file data:

```typescript
async function* fileProcessingHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  // Look for file parts in the user message
  const fileParts = context.userMessage.parts.filter(part => part.type === 'file');
  
  if (fileParts.length === 0) {
    yield {
      state: 'input-required',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: 'Please upload a file to process.' }]
      }
    };
    return;
  }
  
  // Acknowledge receipt
  yield {
    state: 'working',
    message: {
      role: 'agent',
      parts: [{ type: 'text', text: `Processing ${fileParts.length} files...` }]
    }
  };
  
  // Process each file
  for (const part of fileParts) {
    const file = (part as schema.FilePart).file;
    
    // Handle both inline content and URLs
    let content: string | null = null;
    
    if ('bytes' in file && file.bytes) {
      // Decode base64 content
      content = Buffer.from(file.bytes, 'base64').toString('utf-8');
    } else if ('uri' in file && file.uri) {
      // Fetch content from URI
      try {
        const response = await fetch(file.uri);
        content = await response.text();
      } catch (error) {
        console.error(`Error fetching file from ${file.uri}:`, error);
      }
    }
    
    if (content) {
      // Process the file content...
      const processedContent = content.toUpperCase(); // Example transformation
      
      // Generate a processed file artifact
      yield {
        name: `processed_${file.name || 'file'}`,
        mimeType: file.mimeType || 'text/plain',
        parts: [{ type: 'text', text: processedContent }]
      };
    }
  }
  
  // Complete the task
  yield {
    state: 'completed',
    message: {
      role: 'agent',
      parts: [{ type: 'text', text: `Processed ${fileParts.length} files successfully.` }]
    }
  };
}
```

## Deploying to Production

When deploying your A2A Server to production, consider these best practices:

### 1. Use Environment Variables

Store configuration and sensitive data in environment variables:

```typescript
import { A2AServer, FileStore } from 'a2a-server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create the server with configuration from environment
const server = new A2AServer(myHandler, {
  taskStore: new FileStore({ dir: process.env.TASK_STORE_DIR || '.tasks' }),
  enableVerification: process.env.ENABLE_VERIFICATION === 'true',
});

// Listen on the port specified in the environment or default to 41241
const port = parseInt(process.env.PORT || '41241', 10);
server.start(port);
```

> **Note:** Ensure you're using Node.js 22.0 or higher for optimal performance and security.

### 2. Configure a Process Manager

Use a process manager like PM2 to keep your server running:

```bash
# Install PM2
npm install -g pm2

# Start your application
pm2 start dist/index.js --name "a2a-agent"

# Configure auto-restart
pm2 startup
pm2 save
```

### 3. Set Up HTTPS

In production, you should use HTTPS. Here's how to set it up with a reverse proxy like Nginx:

```nginx
# Example Nginx configuration
server {
    listen 443 ssl;
    server_name your-agent-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:41241;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Implement Monitoring

Add monitoring to track your agent's performance and errors:

```typescript
import { A2AServer } from 'a2a-server';
import * as prometheus from 'prom-client';

// Set up metrics
const requestCounter = new prometheus.Counter({
  name: 'a2a_requests_total',
  help: 'Total number of requests',
  labelNames: ['method']
});

const errorCounter = new prometheus.Counter({
  name: 'a2a_errors_total',
  help: 'Total number of errors',
  labelNames: ['type']
});

// Create a custom task handler that includes metrics
async function* monitoredHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  // Track the request
  requestCounter.inc({ method: 'task' });
  
  try {
    // Your handler logic here...
    yield {
      state: 'completed',
      message: { role: 'agent', parts: [{ type: 'text', text: 'Done!' }] }
    };
  } catch (error) {
    // Track errors
    errorCounter.inc({ type: error.name || 'unknown' });
    throw error;
  }
}

// Create the server
const server = new A2AServer(monitoredHandler);

// Add a metrics endpoint
const app = express();
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});

app.listen(9090, () => {
  console.log('Metrics available at http://localhost:9090/metrics');
});

// Start the A2A server
server.start();
```

### 5. Implement Rate Limiting

Protect your agent from abuse with rate limiting:

```typescript
import { A2AServer } from 'a2a-server';
import rateLimit from 'express-rate-limit';
import express from 'express';

// Create your handler
async function* myHandler(context: TaskContext) {
  // Handler implementation...
}

// Create the A2A Server
const server = new A2AServer(myHandler);

// Get the Express app from the server
const app = express();

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    jsonrpc: '2.0',
    id: null,
    error: {
      code: -32000,
      message: 'Too many requests, please try again later.'
    }
  }
});

// Apply the rate limiter to all requests
app.use(limiter);

// Mount the A2A Server endpoint
app.use('/', server.endpoint());

// Start the server
app.listen(41241, () => {
  console.log('Rate-limited A2A Server started on port 41241');
});
```

These advanced techniques will help you build more sophisticated, robust, and production-ready A2A Server agents. 