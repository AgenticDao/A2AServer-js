# Creating a Simple Agent

This guide explains how to create a simple yet functional agent using the A2A Server library. We'll build a weather forecast agent that demonstrates key concepts like handling user inputs, generating artifacts, and managing task state.

## Prerequisites

Before starting, make sure you have:

- Completed the [Getting Started](./getting-started.md) guide
- Basic understanding of async generators in JavaScript/TypeScript
- Node.js v22.0+ and npm installed

## Agent Overview

Our weather forecast agent will:

1. Accept a city name from the user
2. Simulate fetching weather data
3. Return a forecast as text
4. Generate a JSON artifact with detailed data

## Project Setup

First, create a new project:

```bash
mkdir weather-agent
cd weather-agent
npm init -y
npm install a2a-server typescript ts-node @types/node @types/express
```

Create a TypeScript configuration:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "outDir": "./dist",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

Create the source file:

```
mkdir src
touch src/index.ts
```

## Implementing the Task Handler

Open `src/index.ts` and start by importing the required dependencies:

```typescript
import { A2AServer, TaskContext, TaskYieldUpdate, schema } from 'a2a-server';
```

Next, let's create a simple mock weather data function:

```typescript
// Mock weather data function
function getWeatherForecast(city: string): { 
  description: string; 
  temperature: number;
  humidity: number;
  windSpeed: number;
} {
  // In a real agent, this would call a weather API
  const forecasts = {
    'new york': { description: 'Partly cloudy', temperature: 72, humidity: 65, windSpeed: 8 },
    'london': { description: 'Rainy', temperature: 62, humidity: 80, windSpeed: 12 },
    'tokyo': { description: 'Sunny', temperature: 85, humidity: 70, windSpeed: 5 },
    'sydney': { description: 'Clear', temperature: 70, humidity: 60, windSpeed: 10 }
  };
  
  // Default forecast if city not found
  const defaultForecast = { description: 'Unknown', temperature: 70, humidity: 65, windSpeed: 7 };
  
  // Return forecast for city or default
  return forecasts[city.toLowerCase()] || defaultForecast;
}
```

Now, let's implement our weather agent's task handler:

```typescript
async function* weatherHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  try {
    // Get user input (city name)
    const userMsg = context.userMessage.parts.find(part => part.type === 'text')?.text || '';
    const city = userMsg.trim();
    
    // Log task information
    console.log(`Processing weather request for: ${city || 'unknown city'}`);
    
    // Check if city was provided
    if (!city) {
      yield {
        state: 'input-required',
        message: {
          role: 'agent',
          parts: [{ type: 'text', text: 'Please provide a city name for the weather forecast.' }]
        }
      };
      return;
    }
    
    // Acknowledge the request
    yield {
      state: 'working',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: `Checking weather forecast for ${city}...` }]
      }
    };
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check if task was cancelled during the "API call"
    if (context.isCancelled()) {
      yield {
        state: 'canceled',
        message: {
          role: 'agent',
          parts: [{ type: 'text', text: 'Weather forecast request cancelled.' }]
        }
      };
      return;
    }
    
    // Get the weather data
    const weather = getWeatherForecast(city);
    
    // Generate a detailed forecast text
    const forecastText = 
      `Weather Forecast for ${city}:\n` +
      `- Conditions: ${weather.description}\n` +
      `- Temperature: ${weather.temperature}°F\n` +
      `- Humidity: ${weather.humidity}%\n` +
      `- Wind Speed: ${weather.windSpeed} mph`;
    
    // Provide a JSON artifact with the data
    yield {
      name: 'forecast.json',
      mimeType: 'application/json',
      parts: [{ 
        type: 'data', 
        data: {
          city,
          forecast: weather,
          timestamp: new Date().toISOString()
        }
      }]
    };
    
    // Complete the task with a friendly message
    yield {
      state: 'completed',
      message: {
        role: 'agent',
        parts: [{ 
          type: 'text', 
          text: forecastText
        }]
      }
    };
    
  } catch (error) {
    console.error('Error in weather handler:', error);
    
    // Report the error to the user
    yield {
      state: 'failed',
      message: {
        role: 'agent',
        parts: [{ 
          type: 'text', 
          text: 'Sorry, I encountered an error while getting the weather forecast.' 
        }]
      }
    };
  }
}
```

## Setting Up the Server

Now, let's create and start the A2A Server with our weather handler:

```typescript
// Define agent metadata
const agentCard: schema.AgentCard = {
  name: 'Weather Forecast Agent',
  description: 'Provides weather forecasts for cities around the world',
  url: 'http://localhost:41241',
  version: '1.0.0',
  capabilities: {
    streaming: true
  },
  skills: [
    {
      id: 'weather-forecast',
      name: 'Weather Forecast',
      description: 'Get the current weather forecast for a city'
    }
  ]
};

// Create and start the server
const server = new A2AServer(weatherHandler, { card: agentCard });
server.start();

console.log('Weather Forecast Agent is running on http://localhost:41241');
console.log('Try sending a city name to get a weather forecast!');
```

## Running the Agent

Save the file and run your agent:

```bash
npx ts-node src/index.ts
```

## Testing the Agent

Test your agent using cURL:

```bash
curl -X POST http://localhost:41241 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "id": 1,
    "params": {
      "id": "task-123",
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "London"}]
      }
    }
  }'
```

You should receive a weather forecast for London with both a text response and a JSON artifact.

## Adding More Features

### Input Validation

Let's enhance our agent to validate city names:

```typescript
// Add input validation
if (city.length < 2) {
  yield {
    state: 'input-required',
    message: {
      role: 'agent',
      parts: [{ type: 'text', text: 'Please provide a valid city name with at least 2 characters.' }]
    }
  };
  return;
}
```

### Supporting Multiple Outputs

We can add support for different output formats:

```typescript
// Check if the user requested a specific format
const wantsJson = userMsg.toLowerCase().includes('json');

if (wantsJson) {
  // Return only JSON data in the message
  yield {
    state: 'completed',
    message: {
      role: 'agent',
      parts: [{ 
        type: 'data', 
        data: {
          city,
          forecast: weather,
          timestamp: new Date().toISOString()
        }
      }]
    }
  };
} else {
  // Return text format (default)
  yield {
    state: 'completed',
    message: {
      role: 'agent',
      parts: [{ 
        type: 'text', 
        text: forecastText
      }]
    }
  };
}
```

## Complete Agent Example

Here's the complete weather forecast agent implementation:

```typescript
import { A2AServer, TaskContext, TaskYieldUpdate, schema } from 'a2a-server';

// Mock weather data function
function getWeatherForecast(city: string): { 
  description: string; 
  temperature: number;
  humidity: number;
  windSpeed: number;
} {
  const forecasts = {
    'new york': { description: 'Partly cloudy', temperature: 72, humidity: 65, windSpeed: 8 },
    'london': { description: 'Rainy', temperature: 62, humidity: 80, windSpeed: 12 },
    'tokyo': { description: 'Sunny', temperature: 85, humidity: 70, windSpeed: 5 },
    'sydney': { description: 'Clear', temperature: 70, humidity: 60, windSpeed: 10 }
  };
  
  const defaultForecast = { description: 'Unknown', temperature: 70, humidity: 65, windSpeed: 7 };
  
  return forecasts[city.toLowerCase()] || defaultForecast;
}

async function* weatherHandler(
  context: TaskContext
): AsyncGenerator<TaskYieldUpdate, schema.Task | void, unknown> {
  try {
    // Get user input (city name)
    const userMsg = context.userMessage.parts.find(part => part.type === 'text')?.text || '';
    let city = userMsg.trim();
    
    // Check if city is in format "Weather in [city]"
    if (city.toLowerCase().startsWith('weather in ')) {
      city = city.substring('weather in '.length).trim();
    }
    
    console.log(`Processing weather request for: ${city || 'unknown city'}`);
    
    // Check if city was provided and is valid
    if (!city || city.length < 2) {
      yield {
        state: 'input-required',
        message: {
          role: 'agent',
          parts: [{ type: 'text', text: 'Please provide a valid city name for the weather forecast.' }]
        }
      };
      return;
    }
    
    // Acknowledge the request
    yield {
      state: 'working',
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: `Checking weather forecast for ${city}...` }]
      }
    };
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check if task was cancelled during the "API call"
    if (context.isCancelled()) {
      yield {
        state: 'canceled',
        message: {
          role: 'agent',
          parts: [{ type: 'text', text: 'Weather forecast request cancelled.' }]
        }
      };
      return;
    }
    
    // Get the weather data
    const weather = getWeatherForecast(city);
    
    // Generate a detailed forecast text
    const forecastText = 
      `Weather Forecast for ${city}:\n` +
      `- Conditions: ${weather.description}\n` +
      `- Temperature: ${weather.temperature}°F\n` +
      `- Humidity: ${weather.humidity}%\n` +
      `- Wind Speed: ${weather.windSpeed} mph`;
    
    // Check if the user requested a specific format
    const wantsJson = userMsg.toLowerCase().includes('json');
    
    // Provide a JSON artifact with the data in both cases
    yield {
      name: 'forecast.json',
      mimeType: 'application/json',
      parts: [{ 
        type: 'data', 
        data: {
          city,
          forecast: weather,
          timestamp: new Date().toISOString()
        }
      }]
    };
    
    // Return appropriate format based on user request
    if (wantsJson) {
      yield {
        state: 'completed',
        message: {
          role: 'agent',
          parts: [{ 
            type: 'data', 
            data: {
              city,
              forecast: weather,
              timestamp: new Date().toISOString()
            }
          }]
        }
      };
    } else {
      yield {
        state: 'completed',
        message: {
          role: 'agent',
          parts: [{ 
            type: 'text', 
            text: forecastText
          }]
        }
      };
    }
    
  } catch (error) {
    console.error('Error in weather handler:', error);
    
    // Report the error to the user
    yield {
      state: 'failed',
      message: {
        role: 'agent',
        parts: [{ 
          type: 'text', 
          text: 'Sorry, I encountered an error while getting the weather forecast.' 
        }]
      }
    };
  }
}

// Define agent metadata
const agentCard: schema.AgentCard = {
  name: 'Weather Forecast Agent',
  description: 'Provides weather forecasts for cities around the world',
  url: 'http://localhost:41241',
  version: '1.0.0',
  capabilities: {
    streaming: true
  },
  skills: [
    {
      id: 'weather-forecast',
      name: 'Weather Forecast',
      description: 'Get the current weather forecast for a city'
    }
  ]
};

// Create and start the server
const server = new A2AServer(weatherHandler, { card: agentCard });
server.start();

console.log('Weather Forecast Agent is running on http://localhost:41241');
console.log('Try sending a city name to get a weather forecast!');
```

## Next Steps

Now that you've built a simple agent, you can:

1. Connect to a real weather API instead of using mock data
2. Add more features like 5-day forecasts or weather maps
3. Implement more sophisticated input parsing for natural language queries
4. Add persistent storage for user preferences or recent searches

Refer to the [Advanced Usage](./advanced-usage.md) guide for more complex agent patterns. 