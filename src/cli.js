#!/usr/bin/env node
import { program } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

program
  .name('wall-bounce-mcp')
  .description('Wall Bounce Tech Support Helper MCP Server')
  .version('1.0.0');

program
  .command('setup')
  .description('Interactive setup for API keys and configuration')
  .action(async () => {
    console.log('🚀 Wall Bounce MCP Server Setup\n');
    
    const questions = [
      {
        type: 'input',
        name: 'openaiApiKey',
        message: 'Enter your OpenAI API Key:',
        validate: (input) => input.length > 0 || 'API key is required'
      },
      {
        type: 'list',
        name: 'openaiModel',
        message: 'Select OpenAI model:',
        choices: ['gpt-4', 'gpt-4o', 'gpt-5', 'gpt-5-mini'],
        default: 'gpt-4'
      },
      {
        type: 'input',
        name: 'googleApiKey',
        message: 'Enter your Google AI API Key (optional):',
        default: ''
      },
      {
        type: 'list',
        name: 'geminiModel',
        message: 'Select Gemini model:',
        choices: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        default: 'gemini-2.0-flash',
        when: (answers) => answers.googleApiKey.length > 0
      }
    ];

    try {
      const answers = await inquirer.prompt(questions);
      
      const envContent = `# OpenAI API Configuration
OPENAI_API_KEY=${answers.openaiApiKey}
OPENAI_MODEL=${answers.openaiModel}

# Google AI Configuration (Get from https://ai.google.dev/)
GOOGLE_API_KEY=${answers.googleApiKey || 'your_google_api_key_here'}
GEMINI_MODEL=${answers.geminiModel || 'gemini-2.0-flash'}
`;

      const envPath = path.join(process.cwd(), '.env');
      fs.writeFileSync(envPath, envContent);
      
      console.log('\n✅ Configuration saved to .env file');
      console.log('🔒 Remember to keep your API keys secure and never commit them to version control');
      console.log('\n🚀 You can now start the server with: npm start');
      console.log('📚 Or use PM2 for production: pm2 start src/server.js --name "wall-bounce-mcp"');
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the MCP server')
  .option('--port <port>', 'Port number for health check endpoint', '3000')
  .option('--log-level <level>', 'Log level (error, warn, info, debug)', 'info')
  .action((options) => {
    process.env.PORT = options.port;
    process.env.LOG_LEVEL = options.logLevel;
    
    // Import and start server
    import('./server.js').catch(error => {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    });
  });

program
  .command('health')
  .description('Check server health')
  .option('--port <port>', 'Server port', '3000')
  .action(async (options) => {
    try {
      const response = await fetch(`http://localhost:${options.port}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Server is healthy:', data);
      } else {
        console.log('❌ Server health check failed:', response.status);
        process.exit(1);
      }
    } catch (error) {
      console.log('❌ Cannot connect to server:', error.message);
      process.exit(1);
    }
  });

if (process.argv.length === 2) {
  // No command provided, show help
  program.help();
} else {
  program.parse();
}