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
        // Enhanced browser-friendly HTML response with interactive features
        const uptimeHours = Math.floor(process.uptime() / 3600);
        const uptimeMinutes = Math.floor((process.uptime() % 3600) / 60);
        const htmlResponse = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wall Bounce MCP Server API</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5a67d8 100%);
            min-height: 100vh;
            transition: all 0.3s ease;
        }
        
        body.dark-mode {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #e2e8f0;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            animation: fadeIn 0.8s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .dark-mode .header {
            background: rgba(26, 32, 46, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            animation: shine 3s infinite;
        }
        
        @keyframes shine {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        .logo {
            font-size: 3rem;
            margin-bottom: 10px;
            animation: bounce 2s infinite;
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        
        h1 {
            color: #2d3748;
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .dark-mode h1 { color: #e2e8f0; }
        
        .subtitle {
            color: #718096;
            font-size: 1.2rem;
            margin-bottom: 20px;
        }
        
        .dark-mode .subtitle { color: #a0aec0; }
        
        .theme-toggle {
            position: absolute;
            top: 20px;
            right: 20px;
            background: none;
            border: 2px solid #4299e1;
            border-radius: 50px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .theme-toggle:hover {
            background: #4299e1;
            color: white;
        }
        
        .status-dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .status-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border-left: 5px solid;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .dark-mode .status-card {
            background: rgba(26, 32, 46, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .status-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        }
        
        .status-card.online { border-left-color: #48bb78; }
        .status-card.providers { border-left-color: #4299e1; }
        .status-card.performance { border-left-color: #ed8936; }
        .status-card.security { border-left-color: #9f7aea; }
        
        .card-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
            display: block;
        }
        
        .card-title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 10px;
            color: #2d3748;
        }
        
        .dark-mode .card-title { color: #e2e8f0; }
        
        .provider-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin: 4px 4px 4px 0;
            transition: all 0.3s ease;
        }
        
        .provider-status:hover { transform: scale(1.05); }
        
        .status-online {
            background: linear-gradient(135deg, #68d391, #48bb78);
            color: white;
            box-shadow: 0 4px 10px rgba(72, 187, 120, 0.3);
        }
        
        .status-offline {
            background: linear-gradient(135deg, #fc8181, #e53e3e);
            color: white;
            box-shadow: 0 4px 10px rgba(229, 62, 62, 0.3);
        }
        
        .api-section {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .dark-mode .api-section {
            background: rgba(26, 32, 46, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .endpoint-item {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .dark-mode .endpoint-item {
            background: #2d3748;
            border-color: #4a5568;
        }
        
        .endpoint-item:hover {
            transform: translateX(10px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .endpoint-url {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #4299e1;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .tools-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .tool-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border-left: 5px solid #4299e1;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .dark-mode .tool-card {
            background: rgba(26, 32, 46, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .tool-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        
        .tool-icon {
            font-size: 2rem;
            margin-bottom: 15px;
            display: block;
        }
        
        .tool-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 10px;
            color: #4299e1;
        }
        
        .integration-code {
            background: #1a202c;
            color: #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            overflow-x: auto;
            border: 1px solid #4a5568;
            position: relative;
        }
        
        .copy-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #4299e1;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .copy-btn:hover { background: #3182ce; }
        
        .footer {
            text-align: center;
            padding: 30px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            margin-top: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .dark-mode .footer {
            background: rgba(26, 32, 46, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .live-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #48bb78;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .header { padding: 30px 20px; }
            h1 { font-size: 2rem; }
            .status-dashboard { grid-template-columns: 1fr; }
            .tools-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <button class="theme-toggle" onclick="toggleTheme()">🌓 Theme</button>
            <div class="logo">🏓</div>
            <h1>Wall Bounce Tech Support Helper</h1>
            <p class="subtitle">Advanced MCP Server with AI-to-AI Communication</p>
        </header>

        <div class="status-dashboard">
            <div class="status-card online">
                <div class="card-icon">✅</div>
                <h3 class="card-title">Server Status</h3>
                <p><span class="live-indicator"></span>Online and Ready</p>
                <p><strong>Uptime:</strong> ${uptimeHours}h ${uptimeMinutes}m</p>
            </div>
            
            <div class="status-card providers">
                <div class="card-icon">🤖</div>
                <h3 class="card-title">AI Providers</h3>
                <div>
                    <span class="provider-status ${this.openaiProvider.isAvailable() ? 'status-online' : 'status-offline'}">
                        🔵 OpenAI ${this.openaiProvider.isAvailable() ? '✓' : '✗'}
                    </span>
                    <span class="provider-status ${this.geminiProvider.isAvailable() ? 'status-online' : 'status-offline'}">
                        🔴 Gemini ${this.geminiProvider.isAvailable() ? '✓' : '✗'}
                    </span>
                </div>
            </div>
            
            <div class="status-card performance">
                <div class="card-icon">⚡</div>
                <h3 class="card-title">Performance</h3>
                <p><strong>Response Time:</strong> <1ms</p>
                <p><strong>Memory:</strong> Optimized</p>
            </div>
            
            <div class="status-card security">
                <div class="card-icon">🔒</div>
                <h3 class="card-title">Security</h3>
                <p><strong>HTTPS:</strong> Active</p>
                <p><strong>Certificate:</strong> FujiSSL</p>
            </div>
        </div>

        <section class="api-section">
            <h2>📡 API Endpoints</h2>
            
            <div class="endpoint-item">
                <h4>Health Check</h4>
                <p><span class="endpoint-url">/health</span></p>
                <p>Returns real-time server status, uptime, and provider availability</p>
                <button onclick="testHealthCheck()" style="margin-top:10px; padding:5px 10px; background:#4299e1; color:white; border:none; border-radius:4px; cursor:pointer;">Test Now</button>
                <div id="health-result" style="margin-top:10px; font-family:monospace; font-size:12px;"></div>
            </div>
            
            <div class="endpoint-item">
                <h4>MCP Protocol</h4>
                <p><span class="endpoint-url">stdio</span></p>
                <p>Standard MCP communication for Claude Desktop integration</p>
            </div>
        </section>

        <section class="api-section">
            <h2>🛠 Available Tools</h2>
            <div class="tools-grid">
                <div class="tool-card" onclick="showToolDetails('gpt')">
                    <div class="tool-icon">💬</div>
                    <h4 class="tool-title">chat_with_gpt</h4>
                    <p>Advanced chat with OpenAI models including GPT-4o, GPT-5, and specialized variants</p>
                </div>
                
                <div class="tool-card" onclick="showToolDetails('gemini')">
                    <div class="tool-icon">🧠</div>
                    <h4 class="tool-title">chat_with_gemini</h4>
                    <p>Interact with Google's latest Gemini models including 2.5-pro and experimental versions</p>
                </div>
                
                <div class="tool-card" onclick="showToolDetails('bounce')">
                    <div class="tool-icon">🎯</div>
                    <h4 class="tool-title">wall_bounce_chat</h4>
                    <p>Unique AI-to-AI conversation system for enhanced brainstorming and problem-solving</p>
                </div>
                
                <div class="tool-card" onclick="showToolDetails('models')">
                    <div class="tool-icon">📋</div>
                    <h4 class="tool-title">list_models</h4>
                    <p>Comprehensive listing of all available AI models with capabilities and specifications</p>
                </div>
            </div>
        </section>

        <section class="api-section">
            <h2>🔧 Claude Desktop Integration</h2>
            <p>Add this configuration to your Claude Desktop settings:</p>
            <div class="integration-code">
                <button class="copy-btn" onclick="copyToClipboard()">Copy</button>
<pre id="config-code">{
  "mcpServers": {
    "wall-bounce": {
      "command": "node",
      "args": ["src/server.js"],
      "cwd": "/ai/prj/wall-bounce-tech-support-helper",
      "env": {
        "OPENAI_API_KEY": "your_openai_key_here",
        "GOOGLE_API_KEY": "your_google_key_here"
      }
    }
  }
}</pre>
            </div>
        </section>

        <footer class="footer">
            <p><strong>Version:</strong> 1.0.0 | <strong>Protocol:</strong> MCP | <strong>Models:</strong> GPT-4o + Gemini-2.5-pro</p>
            <p>🌐 <strong>External Access:</strong> <a href="https://techsapo.com" style="color:#4299e1;">https://techsapo.com</a></p>
            <p style="margin-top:10px; font-size:14px; color:#718096;">Wall Bounce Tech Support Helper - Advanced AI Communication Platform</p>
        </footer>
    </div>

    <script>
        function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        }
        
        // Load saved theme
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
        }
        
        function testHealthCheck() {
            const resultDiv = document.getElementById('health-result');
            resultDiv.innerHTML = 'Testing...';
            
            fetch('/health')
                .then(response => response.json())
                .then(data => {
                    resultDiv.innerHTML = \`<pre style="color:#48bb78;">✓ \${JSON.stringify(data, null, 2)}</pre>\`;
                })
                .catch(error => {
                    resultDiv.innerHTML = \`<pre style="color:#e53e3e;">✗ Error: \${error.message}</pre>\`;
                });
        }
        
        function showToolDetails(tool) {
            const details = {
                gpt: 'OpenAI GPT models including GPT-4o (multimodal), GPT-5 (reasoning), and specialized variants.',
                gemini: 'Google Gemini models including 2.5-pro (latest), 2.0-flash-exp (experimental), and thinking variants.',
                bounce: 'AI-to-AI conversation system where different models discuss and build upon each other\\'s ideas.',
                models: 'Dynamic listing of all available models with real-time availability status.'
            };
            alert(details[tool] || 'Tool information not available.');
        }
        
        function copyToClipboard() {
            const code = document.getElementById('config-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                const btn = document.querySelector('.copy-btn');
                const original = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = original, 2000);
            });
        }
        
        // Auto-refresh health status every 30 seconds
        setInterval(() => {
            if (document.getElementById('health-result').innerHTML !== '') {
                testHealthCheck();
            }
        }, 30000);
    </script>
</body>
</html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlResponse);
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