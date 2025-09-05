/**
 * Tests for Gemini provider
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { GeminiProvider } from '../../src/providers/gemini-provider.js';

describe('GeminiProvider', () => {
  let provider;
  let mockGoogleGenAI;
  let mockModels;

  beforeEach(() => {
    // Mock models object
    mockModels = {
      generateContent: mock.fn()
    };

    // Mock GoogleGenAI client
    mockGoogleGenAI = {
      models: mockModels
    };

    // Mock GoogleGenAI constructor
    mock.method(global, 'GoogleGenAI', () => mockGoogleGenAI);
    
    provider = new GeminiProvider('test-api-key');
    // Manually set the mocked client
    provider.client = mockGoogleGenAI;
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      const testProvider = new GeminiProvider('my-api-key');
      assert.ok(testProvider);
      assert.ok(testProvider.client);
    });

    it('should initialize as null if no API key provided', () => {
      const testProvider = new GeminiProvider();
      assert.strictEqual(testProvider.client, null);
    });

    it('should have predefined available models', () => {
      assert.ok(Array.isArray(provider.availableModels));
      assert.ok(provider.availableModels.length > 0);
      assert.ok(provider.availableModels.includes('gemini-2.0-flash-001'));
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is configured', () => {
      assert.strictEqual(provider.isAvailable(), true);
    });

    it('should return false when API key is not configured', () => {
      const testProvider = new GeminiProvider();
      assert.strictEqual(testProvider.isAvailable(), false);
    });
  });

  describe('convertMessages', () => {
    it('should convert OpenAI-style messages to Gemini format', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' }
      ];

      const converted = provider.convertMessages(messages);
      
      assert.deepStrictEqual(converted, [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hi there' }
      ]);
    });

    it('should preserve unknown roles', () => {
      const messages = [
        { role: 'custom', content: 'Custom message' }
      ];

      const converted = provider.convertMessages(messages);
      
      assert.deepStrictEqual(converted, [
        { role: 'custom', content: 'Custom message' }
      ]);
    });

    it('should preserve other message properties', () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01' }
      ];

      const converted = provider.convertMessages(messages);
      
      assert.strictEqual(converted[0].timestamp, '2024-01-01');
    });
  });

  describe('chatCompletion', () => {
    beforeEach(() => {
      mockModels.generateContent.mock.mockImplementation(async () => ({
        text: 'Test Gemini response'
      }));
    });

    it('should handle basic chat completion', async () => {
      const params = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxOutputTokens: 1000
      };

      const result = await provider.chatCompletion(params);
      
      assert.strictEqual(result, 'Test Gemini response');
      assert.strictEqual(mockModels.generateContent.mock.callCount(), 1);
      
      const callArgs = mockModels.generateContent.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model, 'gemini-1.5-pro');
      assert.strictEqual(callArgs.config.temperature, 0.7);
      assert.strictEqual(callArgs.config.maxOutputTokens, 1000);
    });

    it('should validate and clamp parameters', async () => {
      const params = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: -1, // Below minimum
        maxOutputTokens: 10000 // Above maximum
      };

      await provider.chatCompletion(params);
      
      const callArgs = mockModels.generateContent.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.config.temperature, 0); // Clamped to minimum
      assert.strictEqual(callArgs.config.maxOutputTokens, 8192); // Clamped to maximum
    });

    it('should convert and validate messages', async () => {
      const params = {
        model: 'gemini-1.5-pro',
        messages: [
          { role: 'assistant', content: '  Hello\x00world  ' }
        ],
        temperature: 0.7,
        maxOutputTokens: 1000
      };

      await provider.chatCompletion(params);
      
      const callArgs = mockModels.generateContent.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.contents[0].role, 'model'); // Converted from assistant
      assert.strictEqual(callArgs.contents[0].content, 'Helloworld'); // Sanitized
    });

    it('should throw error when not available', async () => {
      const unavailableProvider = new GeminiProvider();
      
      await assert.rejects(async () => {
        await unavailableProvider.chatCompletion({
          model: 'gemini-1.5-pro',
          messages: [{ role: 'user', content: 'Hello' }]
        });
      }, /Gemini integration not available/);
    });

    it('should handle API errors', async () => {
      mockModels.generateContent.mock.mockImplementation(async () => {
        throw new Error('Gemini API Error');
      });

      const params = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxOutputTokens: 1000
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      }, /Gemini API Error/);
    });
  });

  describe('generateContent', () => {
    beforeEach(() => {
      mockModels.generateContent.mock.mockImplementation(async () => ({
        text: 'Generated content response'
      }));
    });

    it('should handle single prompt generation', async () => {
      const params = {
        model: 'gemini-1.5-pro',
        prompt: 'Write a story',
        temperature: 0.8,
        maxOutputTokens: 1500
      };

      const result = await provider.generateContent(params);
      
      assert.strictEqual(result, 'Generated content response');
      assert.strictEqual(mockModels.generateContent.mock.callCount(), 1);
      
      const callArgs = mockModels.generateContent.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model, 'gemini-1.5-pro');
      assert.deepStrictEqual(callArgs.contents, [{ role: 'user', content: 'Write a story' }]);
      assert.strictEqual(callArgs.config.temperature, 0.8);
      assert.strictEqual(callArgs.config.maxOutputTokens, 1500);
    });

    it('should validate and clamp parameters', async () => {
      const params = {
        model: 'gemini-1.5-pro',
        prompt: 'Test prompt',
        temperature: 3, // Above maximum
        maxOutputTokens: -100 // Below minimum
      };

      await provider.generateContent(params);
      
      const callArgs = mockModels.generateContent.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.config.temperature, 2); // Clamped to maximum
      assert.strictEqual(callArgs.config.maxOutputTokens, 1); // Clamped to minimum
    });

    it('should throw error when not available', async () => {
      const unavailableProvider = new GeminiProvider();
      
      await assert.rejects(async () => {
        await unavailableProvider.generateContent({
          model: 'gemini-1.5-pro',
          prompt: 'Test prompt'
        });
      }, /Gemini integration not available/);
    });
  });

  describe('listModels', () => {
    it('should return copy of available models', () => {
      const models = provider.listModels();
      
      assert.ok(Array.isArray(models));
      assert.ok(models.length > 0);
      assert.notStrictEqual(models, provider.availableModels); // Should be a copy
      assert.deepStrictEqual(models, provider.availableModels);
    });

    it('should include expected models', () => {
      const models = provider.listModels();
      
      assert.ok(models.includes('gemini-2.0-flash-001'));
      assert.ok(models.includes('gemini-1.5-pro-latest'));
      assert.ok(models.includes('gemini-1.5-flash-001'));
    });
  });
});