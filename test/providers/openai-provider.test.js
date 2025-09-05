/**
 * Tests for OpenAI provider
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { OpenAIProvider } from '../../src/providers/openai-provider.js';

describe('OpenAIProvider', () => {
  let provider;
  let mockOpenAI;

  beforeEach(() => {
    // Mock OpenAI client
    mockOpenAI = {
      apiKey: 'test-api-key',
      chat: {
        completions: {
          create: mock.fn()
        }
      },
      models: {
        list: mock.fn()
      }
    };

    // Mock OpenAI constructor
    mock.method(global, 'OpenAI', () => mockOpenAI);
    
    provider = new OpenAIProvider('test-api-key');
    // Manually set the mocked client
    provider.client = mockOpenAI;
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      const testProvider = new OpenAIProvider('my-api-key');
      assert.ok(testProvider);
    });

    it('should initialize with empty string if no API key provided', () => {
      const testProvider = new OpenAIProvider();
      assert.ok(testProvider);
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is present', () => {
      assert.strictEqual(provider.isAvailable(), true);
    });

    it('should return false when API key is empty', () => {
      provider.client.apiKey = '';
      assert.strictEqual(provider.isAvailable(), false);
    });

    it('should return false when API key is null', () => {
      provider.client.apiKey = null;
      assert.strictEqual(provider.isAvailable(), false);
    });
  });

  describe('chatCompletion', () => {
    beforeEach(() => {
      mockOpenAI.chat.completions.create.mock.mockImplementation(async () => ({
        choices: [{
          message: {
            content: 'Test response'
          }
        }]
      }));
    });

    it('should handle basic chat completion', async () => {
      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 1000
      };

      const result = await provider.chatCompletion(params);
      
      assert.strictEqual(result, 'Test response');
      assert.strictEqual(mockOpenAI.chat.completions.create.mock.callCount(), 1);
      
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model, 'gpt-4');
      assert.strictEqual(callArgs.temperature, 0.7);
      assert.strictEqual(callArgs.max_tokens, 1000);
    });

    it('should handle GPT-5 series models with special parameters', async () => {
      const params = {
        model: 'gpt-5',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 1500
      };

      await provider.chatCompletion(params);
      
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.temperature, 1); // Should be forced to 1 for GPT-5
      assert.strictEqual(callArgs.max_completion_tokens, 1500);
      assert.strictEqual(callArgs.max_tokens, undefined);
    });

    it('should validate and clamp parameters', async () => {
      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: -1, // Below minimum
        maxTokens: 10000 // Above maximum
      };

      await provider.chatCompletion(params);
      
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.temperature, 0); // Clamped to minimum
      assert.strictEqual(callArgs.max_tokens, 4000); // Clamped to maximum
    });

    it('should handle invalid messages', async () => {
      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 123 }], // Invalid content type
        temperature: 0.7,
        maxTokens: 1000
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      }, /Message content must be a non-empty string/);
    });

    it('should sanitize message content', async () => {
      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: '  Hello\x00world  ' }],
        temperature: 0.7,
        maxTokens: 1000
      };

      await provider.chatCompletion(params);
      
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.messages[0].content, 'Helloworld');
    });
  });

  describe('listModels', () => {
    beforeEach(() => {
      mockOpenAI.models.list.mock.mockImplementation(async () => ({
        data: [
          { id: 'gpt-4' },
          { id: 'gpt-4-turbo' },
          { id: 'gpt-3.5-turbo' },
          { id: 'text-davinci-003' }, // Non-GPT model
          { id: 'gpt-5-preview' }
        ]
      }));
    });

    it('should return only GPT models', async () => {
      const models = await provider.listModels();
      
      assert.deepStrictEqual(models, [
        'gpt-4',
        'gpt-4-turbo', 
        'gpt-3.5-turbo',
        'gpt-5-preview'
      ]);
      assert.strictEqual(mockOpenAI.models.list.mock.callCount(), 1);
    });

    it('should handle API errors', async () => {
      mockOpenAI.models.list.mock.mockImplementation(async () => {
        throw new Error('API Error');
      });

      await assert.rejects(async () => {
        await provider.listModels();
      }, /API Error/);
    });

    it('should handle empty response', async () => {
      mockOpenAI.models.list.mock.mockImplementation(async () => ({
        data: []
      }));

      const models = await provider.listModels();
      assert.deepStrictEqual(models, []);
    });
  });

  describe('error handling', () => {
    it('should propagate API errors in chat completion', async () => {
      mockOpenAI.chat.completions.create.mock.mockImplementation(async () => {
        throw new Error('OpenAI API Error');
      });

      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 1000
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      }, /OpenAI API Error/);
    });

    it('should handle malformed API responses', async () => {
      mockOpenAI.chat.completions.create.mock.mockImplementation(async () => ({
        choices: [] // Empty choices array
      }));

      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 1000
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      });
    });
  });
});