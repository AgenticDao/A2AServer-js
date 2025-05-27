# Emoji Generation Agent

A specialized emoji generation agent built with LangChain and LangGraph that creates custom emoji images based on user descriptions. Implemented as an A2A-compliant server for seamless integration with agent platforms.

## Features

- **Custom Emoji Generation**: Creates unique emoji images based on natural language descriptions
- **AI-Powered Image Creation**: Uses advanced image generation models to create high-quality emojis
- **Real-Time Generation**: Generates emojis on-demand with streaming responses
- **Image URL Extraction**: Automatically extracts and provides direct image URLs
- **Download Links**: Provides convenient download links for generated emojis
- **Structured Data Response**: Returns both human-readable responses and structured emoji data
- **Streaming Response**: Delivers information progressively via the A2A protocol
- **Input Validation**: Validates user prompts and provides helpful guidance

## Prerequisites

- Node.js v22.0+ or higher
- OpenAI API key
- Image Generation Service API access

## Setup

1. Clone the repository
2. Navigate to the `samples/emojiAgent` directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file with your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   IMAGE_SERVICE_API_BASE=https://your-image-service-api.com
   IMAGE_SERVICE_API_KEY=your_image_service_api_key_here
   IMAGE_SERVICE_MODEL=gpt-4o-image
   ```

## Configuration

The agent can be configured through environment variables in the `.env` file:

```
# Required
OPENAI_API_KEY=your_openai_api_key_here
IMAGE_SERVICE_API_BASE=https://your-image-service-api.com
IMAGE_SERVICE_API_KEY=your_image_service_api_key_here
IMAGE_SERVICE_MODEL=gpt-4o-image

# Optional with defaults
OPENAI_MODEL=gpt-4o               # Model to use for response generation
OPENAI_API_BASE=                  # Custom API endpoint (leave empty for OpenAI default)
OPENAI_TEMPERATURE=0.2            # Creativity level (0.0-1.0)
PORT=41241                        # Server port
HOST=localhost                    # Server host
LOG_LEVEL=info                    # Logging verbosity
```

## Usage

Start the development server:

```bash
npm run dev
```

The server will be available at `http://localhost:41241` (or your configured port).

Send requests to the agent using the A2A protocol. Example queries:

- "Generate a happy cat with sunglasses"
- "Create an emoji of a dancing robot"
- "Make a sleepy panda emoji"
- "Generate a rocket ship emoji with stars"
- "Create an emoji of a black man with a question mark"

## Code Structure

- `src/index.ts`: Main server implementation and A2A integration
- `src/agent.ts`: Core emoji generation agent implementation using LangGraph
- `src/openai.ts`: OpenAI model configuration
- `src/config.ts`: Configuration management

## Architecture

The emoji generation agent follows a graph-based architecture using LangGraph:

1. **Request Processing**: Accepts user queries via A2A protocol
2. **Prompt Processing**: Analyzes and refines user descriptions for optimal emoji generation
3. **Image Generation**: Connects to the image generation service to create custom emojis
4. **URL Extraction**: Extracts image URLs from the service response
5. **Response Formatting**: Formats the response with image URLs and download links
6. **State Management**: Manages conversational state to handle unclear requests

## How It Works

1. The agent receives a natural language description of the desired emoji
2. It processes and refines the description for optimal image generation
3. If the description is unclear, it asks the user for more specific details
4. Once the description is clear, it sends a request to the image generation service
5. The service generates the emoji and returns it in a structured response
6. The agent extracts the first image URL from the response
7. Both the generated emoji image and structured data are sent back to the client

## Image Generation Service Integration

The agent integrates with an external image generation service that expects:

**Request Format:**
```json
{
    "stream": false,
    "model": "gpt-4o-image",
    "messages": [
        {
            "content": "You are a emoji generate service to help user create a emoji picture",
            "role": "system"
        },
        {
            "content": "generate a emoji describing a black man with \"?\".",
            "role": "user"
        }
    ]
}
```

**Response Format:**
The service returns a response containing image URLs in markdown format, which the agent automatically extracts.

**Timeout Configuration:**
The agent is configured with a 2-minute timeout for image generation requests, as the service typically takes around 1 minute to generate high-quality emoji images. If a request times out, the agent will provide a helpful error message suggesting the user try again or use a simpler prompt.

## Error Handling

The agent handles various error conditions:

- **Missing Description**: Prompts the user to provide a description for the emoji
- **Unclear Description**: Asks for more specific details about the desired emoji
- **Request Timeout**: Handles cases where image generation takes longer than 2 minutes
- **Image Generation Errors**: Provides clear explanations for any generation errors
- **API Rate Limits**: Handles and explains API rate limiting in user-friendly terms
- **Service Unavailable**: Informs users when the image generation service is unavailable
- **Invalid Responses**: Handles cases where the service doesn't return expected image URLs

## Response Format

The agent returns responses in multiple formats:

1. **Text Response**: Human-readable description of the generated emoji
2. **Image Data**: Structured data containing:
   - Original prompt
   - Image URL
   - Download URL
   - Generation timestamp
   - Model used
3. **Image Display**: Direct image embedding for immediate viewing
4. **Download Link**: Convenient link for downloading the generated emoji

## License

This project is licensed under the MIT License.
