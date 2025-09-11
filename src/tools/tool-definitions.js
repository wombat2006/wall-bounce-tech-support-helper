/**
 * MCP tool definitions - defines all available tools for the server
 */

export const toolDefinitions = [
  {
    name: 'chat_with_gpt',
    description: 'Chat with OpenAI GPT models (e.g., gpt-5-2025-08-07, GPT-5, GPT-5-mini, GPT-4o, GPT-4, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Model to use (e.g., gpt-5, gpt-5-mini, gpt-4o, gpt-4, etc.)',
          default: process.env.OPENAI_MODEL || 'gpt-4o',
        },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['system', 'user', 'assistant'],
              },
              content: {
                type: 'string',
              },
            },
            required: ['role', 'content'],
          },
          description: 'Array of messages for the conversation',
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature (0-2)',
          default: 1.0,
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum tokens in response',
          default: 2500,
        },
      },
      required: ['messages'],
    },
  },
  {
    name: 'chat_with_gemini',
    description: 'Chat with Google Gemini models (e.g., gemini-2.5-pro, gemini-2.0-flash-thinking-exp-1219, gemini-2.0-flash-exp, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Gemini model to use (e.g., gemini-2.5-pro, gemini-2.0-flash-thinking-exp-1219, gemini-2.0-flash-exp)',
          default: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
        },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['user', 'model'],
              },
              content: {
                type: 'string',
              },
            },
            required: ['role', 'content'],
          },
          description: 'Array of messages for the conversation',
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature (0-2)',
          default: 1.0,
        },
        max_output_tokens: {
          type: 'number',
          description: 'Maximum tokens in response',
          default: 2500,
        },
      },
      required: ['messages'],
    },
  },
  {
    name: 'wall_bounce_chat',
    description: 'Wall bounce conversation - automatic back-and-forth discussion with AI models for brainstorming and problem-solving',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Topic or question to discuss',
        },
        model1: {
          type: 'string',
          description: 'First AI model to use (OpenAI model name)',
          default: process.env.OPENAI_MODEL || 'gpt-4o',
        },
        model2: {
          type: 'string',
          description: 'Second AI model to use (Gemini model name)',
          default: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
        },
        rounds: {
          type: 'number',
          description: 'Number of discussion rounds',
          default: 3,
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature (0-2)',
          default: 0.8,
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'list_models',
    description: 'List available OpenAI and Gemini models',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];