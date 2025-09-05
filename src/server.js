#!/usr/bin/env node
/**
 * Wall Bounce Tech Support Helper - MCP Server
 * Main server entry point with modular architecture
 */

import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { OpenAIProvider } from './providers/openai-provider.js';
import { GeminiProvider } from './providers/gemini-provider.js';
import { WallBounceService } from './services/wall-bounce.js';
import { ToolHandlers } from './tools/tool-handlers.js';
import { toolDefinitions } from './tools/tool-definitions.js';

// Load environment variables
dotenv.config();

/**
 * Main application class - orchestrates all components
 */
class WallBounceApp {
  constructor() {
    this.initializeProviders();
    this.initializeServices();
    this.initializeServer();
    this.setupRequestHandlers();
  }

  /**
   * Initialize AI providers
   */
  initializeProviders() {
    this.openaiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY);
    this.geminiProvider = new GeminiProvider(process.env.GOOGLE_API_KEY);

    // Log provider status
    if (!this.geminiProvider.isAvailable()) {
      console.error('Warning: GOOGLE_API_KEY not found. Gemini features will be disabled.');
    }
    
    if (!this.openaiProvider.isAvailable()) {
      console.error('Warning: OPENAI_API_KEY not found. OpenAI features will be disabled.');
    }
  }

  /**
   * Initialize services
   */
  initializeServices() {
    this.wallBounceService = new WallBounceService(
      this.openaiProvider,
      this.geminiProvider
    );
    
    this.toolHandlers = new ToolHandlers(
      this.openaiProvider,
      this.geminiProvider,
      this.wallBounceService
    );
  }

  /**
   * Initialize MCP server
   */
  initializeServer() {
    this.server = new Server(
      {
        name: 'mcp-openai-gemini',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  }

  /**
   * Setup MCP request handlers
   */
  setupRequestHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: toolDefinitions,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        return await this.toolHandlers.handleToolCall(name, args);
      } catch (error) {
        console.error('Error:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  /**
   * Setup HTTP health check server
   */
  setupHealthServer() {
    const port = process.env.PORT || 3000;
    const logLevel = process.env.LOG_LEVEL || 'info';
    
    this.healthServer = createServer((req, res) => {
      if (req.url === '/health' || req.url === '/data/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          uptime: process.uptime(),
          openai: this.openaiProvider.isAvailable(),
          gemini: this.geminiProvider.isAvailable()
        }));
      } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Wall Bounce MCP Server is running');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    this.healthServer.listen(port, () => {
      if (logLevel === 'info' || logLevel === 'debug') {
        console.error(`[INFO] Health check server listening on http://localhost:${port}`);
        console.error(`[INFO] MCP Server providers: OpenAI=${this.openaiProvider.isAvailable()}, Gemini=${this.geminiProvider.isAvailable()}`);
      }
    });
  }

  /**
   * Start the server
   */
  async start() {
    // Setup health check HTTP server
    this.setupHealthServer();
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    
    // Start MCP server on stdio
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    const logLevel = process.env.LOG_LEVEL || 'info';
    if (logLevel === 'info' || logLevel === 'debug') {
      console.error('[INFO] MCP Wall Bounce Tech Support Helper server started');
    }
  }

  /**
   * Graceful shutdown handler
   */
  gracefulShutdown(signal) {
    const logLevel = process.env.LOG_LEVEL || 'info';
    if (logLevel === 'info' || logLevel === 'debug') {
      console.error(`[INFO] Received ${signal}. Graceful shutdown starting...`);
    }
    
    if (this.healthServer) {
      this.healthServer.close(() => {
        if (logLevel === 'info' || logLevel === 'debug') {
          console.error('[INFO] Health server closed');
        }
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    const app = new WallBounceApp();
    await app.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});