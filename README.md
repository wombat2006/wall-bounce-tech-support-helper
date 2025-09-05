# Wall Bounce Tech Support Helper

A Model Context Protocol (MCP) server that provides integration with both OpenAI's GPT models and Google's Gemini models, featuring innovative "wall bounce" conversations for enhanced brainstorming and problem-solving.

## Features

- **Multi-AI Integration**: Chat with OpenAI GPT models (GPT-4, GPT-5, etc.) and Google Gemini models
- **Wall Bounce Conversations**: Automatic back-and-forth discussions between different AI models for deeper insights
- **GPT-5 Optimization**: Proper parameter handling for GPT-5 series models
- **Flexible Configuration**: Configurable temperature, token limits, and model selection
- **Comprehensive Logging**: Detailed error handling and conversation tracking
- **Multi-language Support**: Supports both English and Japanese interactions

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd wall-bounce-tech-support-helper
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```
Edit `.env` and add your API keys:
```
# OpenAI Configuration
OPENAI_API_KEY=your_actual_openai_api_key_here
OPENAI_MODEL=gpt-4

# Google AI Configuration
GOOGLE_API_KEY=your_actual_google_api_key_here
GEMINI_MODEL=gemini-1.5-pro
```

## Usage

### Quick Start with Interactive Setup

1. Run the interactive setup to configure API keys:
```bash
npx wall-bounce-mcp setup
```

2. Start the server:
```bash
npm start
```

### Production Deployment

#### Option 1: PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2 using ecosystem config
pm2 start ecosystem.config.js

# Monitor
pm2 status
pm2 logs wall-bounce-mcp
pm2 monit

# Auto-restart on system reboot
pm2 startup
pm2 save
```

#### Option 2: Docker
```bash
# Build image
docker build -t wall-bounce-mcp .

# Run container
docker run -d --name wall-bounce-mcp \
  --env-file .env \
  -p 3000:3000 \
  wall-bounce-mcp

# Check health
curl http://localhost:3000/health
```

#### Option 3: Direct Usage
```bash
# Basic start
npm start

# With custom port and log level
PORT=3001 LOG_LEVEL=debug npm start
```

### Health Check

The server includes a built-in health check endpoint:

```bash
# Check if server is running
curl http://localhost:3000/health

# Or use the CLI
npx wall-bounce-mcp health
```

The server will start and listen for MCP protocol messages via stdio, while also providing an HTTP health check endpoint.

## Production Deployment

### Automated Deployment

Use the included deployment script for automated setup:

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will guide you through choosing the best deployment method for your environment.

### Manual Deployment Options

#### Option 1: Docker Compose (Full Stack)
```bash
# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Start full stack with nginx reverse proxy
docker-compose up -d

# Access via reverse proxy
curl https://yourdomain.com/health
```

#### Option 2: Systemd Service
```bash
# Copy service file
sudo cp wall-bounce-mcp.service /etc/systemd/system/

# Enable and start service
sudo systemctl enable wall-bounce-mcp
sudo systemctl start wall-bounce-mcp

# Check status
sudo systemctl status wall-bounce-mcp
```

### Nginx Reverse Proxy

The included `nginx.conf` provides:
- HTTPS termination
- Security headers
- Health check proxying at `/health`
- API proxying at `/api/wall-bounce/`
- CORS support

### Public Access URLs

When deployed with domain configuration:
- **Health Check**: `https://yourdomain.com/health`
- **API Endpoint**: `https://yourdomain.com/api/wall-bounce/`
- **Direct Access**: `http://your-ip:3003/data/health`

## Available Tools

### chat_with_gpt
Chat with OpenAI GPT models.

**Parameters:**
- `model` (string, optional): Model to use (default: gpt-4)
  - Supported: gpt-4, gpt-4o, gpt-5, gpt-5-mini, gpt-5-2025-08-07, etc.
- `messages` (array, required): Array of message objects with `role` and `content`
- `temperature` (number, optional): Sampling temperature 0-2 (default: 1.0)
- `max_tokens` (number, optional): Maximum tokens in response (default: 2500)

### chat_with_gemini
Chat with Google Gemini models.

**Parameters:**
- `model` (string, optional): Gemini model to use (default: gemini-1.5-pro)
  - Supported: gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash, etc.
- `messages` (array, required): Array of message objects with `role` and `content`
- `temperature` (number, optional): Sampling temperature 0-2 (default: 1.0)
- `max_output_tokens` (number, optional): Maximum tokens in response (default: 2500)

### wall_bounce_chat
🎯 **The main feature!** Conduct automatic back-and-forth conversations between AI models for enhanced brainstorming.

**Parameters:**
- `topic` (string, required): Topic or question to discuss
- `model1` (string, optional): First AI model (OpenAI model, default: gpt-4)
- `model2` (string, optional): Second AI model (Gemini model, default: gemini-1.5-pro)
- `rounds` (number, optional): Number of discussion rounds (default: 3)
- `temperature` (number, optional): Sampling temperature 0-2 (default: 0.8)

**Example:**
```json
{
  "topic": "How to optimize database performance for high-traffic web applications",
  "model1": "gpt-4",
  "model2": "gemini-1.5-pro",
  "rounds": 4,
  "temperature": 0.8
}
```

### list_models
List all available OpenAI GPT and Google Gemini models.

**Parameters:** None

## Model-Specific Notes

- **GPT-5 series**: Only supports temperature=1.0. The server automatically adjusts if a different temperature is provided.
- **GPT-5 series**: Uses `max_completion_tokens` parameter instead of `max_tokens`.
- **Other models**: Use standard `max_tokens` parameter.

## Wall Bounce Feature

The **wall_bounce_chat** tool is the core innovation of this project. It facilitates structured conversations between different AI models, allowing for:

- **Multi-perspective Analysis**: Different models provide unique viewpoints on the same topic
- **Enhanced Problem-solving**: Models build upon each other's ideas and challenge assumptions
- **Creative Brainstorming**: Cross-pollination of ideas between different AI architectures
- **Comprehensive Coverage**: Topics are explored from multiple angles automatically

### How It Works

1. **Initial Prompt**: The first model receives the topic and provides its initial analysis
2. **Response Chain**: The second model responds to the first model's output
3. **Iterative Discussion**: This continues for the specified number of rounds
4. **Structured Output**: All exchanges are formatted in a readable markdown discussion log

## Architecture

This project follows the **Single Responsibility Principle** with a modular architecture:

```
src/
├── server.js              # Main server entry point
├── providers/             # AI provider integrations
│   ├── openai-provider.js    # OpenAI API wrapper
│   └── gemini-provider.js    # Google Gemini API wrapper
├── services/              # Business logic services
│   └── wall-bounce.js        # Wall bounce conversation logic
├── tools/                 # MCP tool definitions and handlers
│   ├── tool-definitions.js   # Tool schema definitions
│   └── tool-handlers.js      # Tool implementation logic
└── utils/                 # Utility functions
    └── validation.js         # Input validation and sanitization
```

### Key Design Principles

- **Single Responsibility**: Each module has one clear purpose
- **Dependency Injection**: Services receive their dependencies via constructor
- **Error Isolation**: Errors are handled at appropriate boundaries
- **Testability**: Modular design enables easy unit testing

## Testing

This project includes comprehensive test coverage across all components:

### Test Structure
```
test/
├── utils/                    # Utility function tests
│   └── validation.test.js       # Input validation & sanitization
├── providers/               # AI provider integration tests
│   ├── openai-provider.test.js  # OpenAI API wrapper tests
│   └── gemini-provider.test.js  # Gemini API wrapper tests
├── services/               # Business logic tests
│   └── wall-bounce.test.js      # Wall bounce conversation logic
├── tools/                  # MCP tool tests
│   └── tool-handlers.test.js    # Tool implementation tests
├── integration/            # Real API integration tests
│   └── api-integration.test.js  # Actual API calls (.env required)
└── error-handling/         # Comprehensive error scenarios
    └── error-scenarios.test.js  # Network, validation, edge cases
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Categories

1. **Unit Tests**: Test individual modules in isolation with mocks
2. **Integration Tests**: Test actual API calls (requires valid .env configuration)
3. **Error Handling**: Test failure scenarios, edge cases, and resilience
4. **Validation Tests**: Test input sanitization and parameter validation

### Test Coverage

- **127 total tests** across 46 test suites
- Coverage includes happy paths, error cases, and edge conditions
- Integration tests validate real API behavior when keys are configured
- Comprehensive error scenario testing for production resilience

## Development

The server is built using:
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) - MCP TypeScript SDK
- [openai](https://github.com/openai/openai-node) - Official OpenAI Node.js library
- [@google/genai](https://github.com/googleapis/js-genai) - Google GenAI JavaScript SDK
- [dotenv](https://github.com/motdotla/dotenv) - Environment variable management

## License

MIT

## Security

- Never commit your `.env` file or API keys to version control
- Keep your OpenAI API key secure and rotate it regularly
- Monitor your OpenAI API usage to prevent unexpected charges