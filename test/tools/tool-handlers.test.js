/**
 * Tests for tool handlers
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ToolHandlers } from '../../src/tools/tool-handlers.js';

describe('ToolHandlers', () => {
  let handlers;
  let mockOpenAIProvider;
  let mockGeminiProvider;
  let mockWallBounceService;

  beforeEach(() => {
    // Mock OpenAI provider
    mockOpenAIProvider = {
      isAvailable: mock.fn(() => true),
      chatCompletion: mock.fn(),
      listModels: mock.fn()
    };

    // Mock Gemini provider
    mockGeminiProvider = {
      isAvailable: mock.fn(() => true),
      chatCompletion: mock.fn(),
      listModels: mock.fn()
    };

    // Mock Wall Bounce service
    mockWallBounceService = {
      conductWallBounce: mock.fn()
    };

    handlers = new ToolHandlers(
      mockOpenAIProvider,
      mockGeminiProvider,
      mockWallBounceService
    );
  });

  describe('constructor', () => {
    it('should initialize with all dependencies', () => {
      assert.ok(handlers);
      assert.strictEqual(handlers.openaiProvider, mockOpenAIProvider);
      assert.strictEqual(handlers.geminiProvider, mockGeminiProvider);
      assert.strictEqual(handlers.wallBounceService, mockWallBounceService);
    });
  });

  describe('handleChatWithGPT', () => {
    beforeEach(() => {
      mockOpenAIProvider.chatCompletion.mock.mockImplementation(async () => 
        'GPT response'
      );
    });

    it('should handle chat with GPT request', async () => {
      const args = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 1000
      };

      const result = await handlers.handleChatWithGPT(args);

      assert.ok(result.content);
      assert.strictEqual(result.content[0].type, 'text');
      assert.ok(result.content[0].text.includes('GPT response'));
      assert.ok(result.content[0].text.includes('gpt-4'));

      assert.strictEqual(mockOpenAIProvider.chatCompletion.mock.callCount(), 1);
      const callArgs = mockOpenAIProvider.chatCompletion.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model, 'gpt-4');
      assert.strictEqual(callArgs.temperature, 0.7);
      assert.strictEqual(callArgs.maxTokens, 1000);
    });

    it('should use default model from environment', async () => {
      process.env.OPENAI_MODEL = 'gpt-3.5-turbo';
      
      const args = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await handlers.handleChatWithGPT(args);

      const callArgs = mockOpenAIProvider.chatCompletion.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model, 'gpt-3.5-turbo');
    });

    it('should use fallback default model', async () => {
      delete process.env.OPENAI_MODEL;
      
      const args = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await handlers.handleChatWithGPT(args);

      const callArgs = mockOpenAIProvider.chatCompletion.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model, 'gpt-4');
    });

    it('should handle provider errors', async () => {
      mockOpenAIProvider.chatCompletion.mock.mockImplementation(async () => {
        throw new Error('OpenAI API Error');
      });

      const args = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await assert.rejects(async () => {
        await handlers.handleChatWithGPT(args);
      }, /OpenAI API Error/);
    });
  });

  describe('handleChatWithGemini', () => {
    beforeEach(() => {
      mockGeminiProvider.chatCompletion.mock.mockImplementation(async () => 
        'Gemini response'
      );
    });

    it('should handle chat with Gemini request', async () => {
      const args = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.8,
        max_output_tokens: 1500
      };

      const result = await handlers.handleChatWithGemini(args);

      assert.ok(result.content);
      assert.strictEqual(result.content[0].type, 'text');
      assert.ok(result.content[0].text.includes('Gemini response'));
      assert.ok(result.content[0].text.includes('gemini-1.5-pro'));

      assert.strictEqual(mockGeminiProvider.chatCompletion.mock.callCount(), 1);
      const callArgs = mockGeminiProvider.chatCompletion.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model, 'gemini-1.5-pro');
      assert.strictEqual(callArgs.temperature, 0.8);
      assert.strictEqual(callArgs.maxOutputTokens, 1500);
    });

    it('should use default Gemini model', async () => {
      const args = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await handlers.handleChatWithGemini(args);

      const callArgs = mockGeminiProvider.chatCompletion.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model, 'gemini-2.0-flash-001');
    });

    it('should handle provider errors', async () => {
      mockGeminiProvider.chatCompletion.mock.mockImplementation(async () => {
        throw new Error('Gemini API Error');
      });

      const args = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await assert.rejects(async () => {
        await handlers.handleChatWithGemini(args);
      }, /Gemini API Error/);
    });
  });

  describe('handleWallBounceChat', () => {
    beforeEach(() => {
      mockWallBounceService.conductWallBounce.mock.mockImplementation(async () => 
        '# Wall Bounce Discussion: Test Topic\n\n## Summary\nTest completed successfully.'
      );
    });

    it('should handle wall bounce chat request', async () => {
      const args = {
        topic: 'AI Ethics',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 3,
        temperature: 0.8
      };

      const result = await handlers.handleWallBounceChat(args);

      assert.ok(result.content);
      assert.strictEqual(result.content[0].type, 'text');
      assert.ok(result.content[0].text.includes('Wall Bounce Discussion'));
      assert.ok(result.content[0].text.includes('Summary'));

      assert.strictEqual(mockWallBounceService.conductWallBounce.mock.callCount(), 1);
      const callArgs = mockWallBounceService.conductWallBounce.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.topic, 'AI Ethics');
      assert.strictEqual(callArgs.model1, 'gpt-4');
      assert.strictEqual(callArgs.model2, 'gemini-1.5-pro');
      assert.strictEqual(callArgs.rounds, 3);
      assert.strictEqual(callArgs.temperature, 0.8);
    });

    it('should use default models', async () => {
      const args = {
        topic: 'Test Topic'
      };

      await handlers.handleWallBounceChat(args);

      const callArgs = mockWallBounceService.conductWallBounce.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model1, 'gpt-4');
      assert.strictEqual(callArgs.model2, 'gemini-2.0-flash-001');
      assert.strictEqual(callArgs.rounds, 3);
      assert.strictEqual(callArgs.temperature, 0.8);
    });

    it('should handle service errors', async () => {
      mockWallBounceService.conductWallBounce.mock.mockImplementation(async () => {
        throw new Error('Wall Bounce Service Error');
      });

      const args = {
        topic: 'Test Topic'
      };

      await assert.rejects(async () => {
        await handlers.handleWallBounceChat(args);
      }, /Wall Bounce Service Error/);
    });
  });

  describe('handleListModels', () => {
    beforeEach(() => {
      mockOpenAIProvider.listModels.mock.mockImplementation(async () => 
        ['gpt-4', 'gpt-3.5-turbo']
      );
      mockGeminiProvider.listModels.mock.mockImplementation(() => 
        ['gemini-2.0-flash-001', 'gemini-1.5-pro']
      );
    });

    it('should list models from both providers when available', async () => {
      const result = await handlers.handleListModels();

      assert.ok(result.content);
      assert.strictEqual(result.content[0].type, 'text');
      
      const text = result.content[0].text;
      assert.ok(text.includes('Available OpenAI GPT models'));
      assert.ok(text.includes('Available Google Gemini models'));
      assert.ok(text.includes('gpt-4'));
      assert.ok(text.includes('gemini-2.0-flash-001'));

      assert.strictEqual(mockOpenAIProvider.listModels.mock.callCount(), 1);
      assert.strictEqual(mockGeminiProvider.listModels.mock.callCount(), 1);
    });

    it('should handle unavailable OpenAI provider', async () => {
      mockOpenAIProvider.isAvailable.mock.mockImplementation(() => false);

      const result = await handlers.handleListModels();

      const text = result.content[0].text;
      assert.ok(text.includes('Available OpenAI GPT models'));
      assert.ok(text.includes('Available Google Gemini models'));
      assert.ok(text.includes('gemini-2.0-flash-001'));

      assert.strictEqual(mockOpenAIProvider.listModels.mock.callCount(), 0);
      assert.strictEqual(mockGeminiProvider.listModels.mock.callCount(), 1);
    });

    it('should handle unavailable Gemini provider', async () => {
      mockGeminiProvider.isAvailable.mock.mockImplementation(() => false);

      const result = await handlers.handleListModels();

      const text = result.content[0].text;
      assert.ok(text.includes('Available OpenAI GPT models'));
      assert.ok(text.includes('Available Google Gemini models'));
      assert.ok(text.includes('gpt-4'));

      assert.strictEqual(mockOpenAIProvider.listModels.mock.callCount(), 1);
      assert.strictEqual(mockGeminiProvider.listModels.mock.callCount(), 1);
    });

    it('should handle OpenAI API errors', async () => {
      mockOpenAIProvider.listModels.mock.mockImplementation(async () => {
        throw new Error('OpenAI List Models Error');
      });

      await assert.rejects(async () => {
        await handlers.handleListModels();
      }, /OpenAI List Models Error/);
    });
  });

  describe('handleToolCall', () => {
    beforeEach(() => {
      mockOpenAIProvider.chatCompletion.mock.mockImplementation(async () => 'GPT response');
      mockGeminiProvider.chatCompletion.mock.mockImplementation(async () => 'Gemini response');
      mockWallBounceService.conductWallBounce.mock.mockImplementation(async () => 'Wall bounce result');
      mockOpenAIProvider.listModels.mock.mockImplementation(async () => ['gpt-4']);
      mockGeminiProvider.listModels.mock.mockImplementation(() => ['gemini-2.0-flash-001']);
    });

    it('should route chat_with_gpt to correct handler', async () => {
      const args = { messages: [{ role: 'user', content: 'Hello' }] };
      const result = await handlers.handleToolCall('chat_with_gpt', args);

      assert.ok(result.content[0].text.includes('GPT response'));
      assert.strictEqual(mockOpenAIProvider.chatCompletion.mock.callCount(), 1);
    });

    it('should route chat_with_gemini to correct handler', async () => {
      const args = { messages: [{ role: 'user', content: 'Hello' }] };
      const result = await handlers.handleToolCall('chat_with_gemini', args);

      assert.ok(result.content[0].text.includes('Gemini response'));
      assert.strictEqual(mockGeminiProvider.chatCompletion.mock.callCount(), 1);
    });

    it('should route wall_bounce_chat to correct handler', async () => {
      const args = { topic: 'Test topic' };
      const result = await handlers.handleToolCall('wall_bounce_chat', args);

      assert.ok(result.content[0].text.includes('Wall bounce result'));
      assert.strictEqual(mockWallBounceService.conductWallBounce.mock.callCount(), 1);
    });

    it('should route list_models to correct handler', async () => {
      const result = await handlers.handleToolCall('list_models', {});

      assert.ok(result.content[0].text.includes('Available'));
      assert.strictEqual(mockOpenAIProvider.listModels.mock.callCount(), 1);
      assert.strictEqual(mockGeminiProvider.listModels.mock.callCount(), 1);
    });

    it('should throw error for unknown tool', async () => {
      await assert.rejects(async () => {
        await handlers.handleToolCall('unknown_tool', {});
      }, /Unknown tool: unknown_tool/);
    });

    it('should propagate handler errors', async () => {
      mockOpenAIProvider.chatCompletion.mock.mockImplementation(async () => {
        throw new Error('Handler error');
      });

      const args = { messages: [{ role: 'user', content: 'Hello' }] };
      
      await assert.rejects(async () => {
        await handlers.handleToolCall('chat_with_gpt', args);
      }, /Handler error/);
    });
  });
});