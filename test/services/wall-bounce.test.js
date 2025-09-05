/**
 * Tests for Wall Bounce service
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { WallBounceService } from '../../src/services/wall-bounce.js';

describe('WallBounceService', () => {
  let service;
  let mockOpenAIProvider;
  let mockGeminiProvider;

  beforeEach(() => {
    // Mock OpenAI provider
    mockOpenAIProvider = {
      isAvailable: mock.fn(() => true),
      chatCompletion: mock.fn()
    };

    // Mock Gemini provider
    mockGeminiProvider = {
      isAvailable: mock.fn(() => true),
      generateContent: mock.fn()
    };

    service = new WallBounceService(mockOpenAIProvider, mockGeminiProvider);
  });

  describe('constructor', () => {
    it('should initialize with providers', () => {
      assert.ok(service);
      assert.strictEqual(service.openaiProvider, mockOpenAIProvider);
      assert.strictEqual(service.geminiProvider, mockGeminiProvider);
    });
  });

  describe('createInitialPrompt', () => {
    it('should create proper initial prompt with topic', () => {
      const topic = 'AI safety';
      const prompt = service.createInitialPrompt(topic);
      
      assert.ok(prompt.includes(topic));
      assert.ok(prompt.includes('専門家'));
      assert.ok(prompt.includes('議論'));
    });

    it('should handle special characters in topic', () => {
      const topic = 'AI & ML: Future "trends"';
      const prompt = service.createInitialPrompt(topic);
      
      assert.ok(prompt.includes(topic));
    });
  });

  describe('createGeminiPrompt', () => {
    it('should create proper Gemini prompt with previous response', () => {
      const previousResponse = 'AI is important for the future';
      const prompt = service.createGeminiPrompt(previousResponse);
      
      assert.ok(prompt.includes(previousResponse));
      assert.ok(prompt.includes('別の専門家'));
      assert.ok(prompt.includes('応答'));
    });

    it('should handle long previous responses', () => {
      const previousResponse = 'A'.repeat(1000);
      const prompt = service.createGeminiPrompt(previousResponse);
      
      assert.ok(prompt.includes(previousResponse));
    });
  });

  describe('createSummary', () => {
    it('should create proper summary with all parameters', () => {
      const model1 = 'gpt-4';
      const model2 = 'gemini-1.5-pro';
      const rounds = 3;
      const topic = 'Machine Learning';
      
      const summary = service.createSummary(model1, model2, rounds, topic);
      
      assert.ok(summary.includes(model1));
      assert.ok(summary.includes(model2));
      assert.ok(summary.includes(rounds.toString()));
      assert.ok(summary.includes(topic));
      assert.ok(summary.includes('Summary'));
    });
  });

  describe('getOpenAIResponse', () => {
    beforeEach(() => {
      mockOpenAIProvider.chatCompletion.mock.mockImplementation(async () => 
        'OpenAI response'
      );
    });

    it('should call OpenAI provider with correct parameters', async () => {
      const model = 'gpt-4';
      const conversation = [{ role: 'user', content: 'Hello' }];
      const temperature = 0.8;

      const result = await service.getOpenAIResponse(model, conversation, temperature);

      assert.strictEqual(result, 'OpenAI response');
      assert.strictEqual(mockOpenAIProvider.chatCompletion.mock.callCount(), 1);
      
      const callArgs = mockOpenAIProvider.chatCompletion.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model, model);
      assert.strictEqual(callArgs.messages, conversation);
      assert.strictEqual(callArgs.temperature, temperature);
      assert.strictEqual(callArgs.maxTokens, 1500);
    });

    it('should handle API errors', async () => {
      mockOpenAIProvider.chatCompletion.mock.mockImplementation(async () => {
        throw new Error('OpenAI API Error');
      });

      await assert.rejects(async () => {
        await service.getOpenAIResponse('gpt-4', [], 0.8);
      }, /OpenAI API Error/);
    });
  });

  describe('getGeminiResponse', () => {
    beforeEach(() => {
      mockGeminiProvider.generateContent.mock.mockImplementation(async () => 
        'Gemini response'
      );
    });

    it('should call Gemini provider with correct parameters', async () => {
      const model = 'gemini-1.5-pro';
      const prompt = 'Test prompt';
      const temperature = 0.8;

      const result = await service.getGeminiResponse(model, prompt, temperature);

      assert.strictEqual(result, 'Gemini response');
      assert.strictEqual(mockGeminiProvider.generateContent.mock.callCount(), 1);
      
      const callArgs = mockGeminiProvider.generateContent.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.model, model);
      assert.strictEqual(callArgs.prompt, prompt);
      assert.strictEqual(callArgs.temperature, temperature);
      assert.strictEqual(callArgs.maxOutputTokens, 1500);
    });

    it('should handle API errors', async () => {
      mockGeminiProvider.generateContent.mock.mockImplementation(async () => {
        throw new Error('Gemini API Error');
      });

      await assert.rejects(async () => {
        await service.getGeminiResponse('gemini-1.5-pro', 'test', 0.8);
      }, /Gemini API Error/);
    });
  });

  describe('conductWallBounce', () => {
    beforeEach(() => {
      mockOpenAIProvider.chatCompletion.mock.mockImplementation(async (params) => 
        `OpenAI response from ${params.model}`
      );
      mockGeminiProvider.generateContent.mock.mockImplementation(async (params) => 
        `Gemini response from ${params.model}`
      );
    });

    it('should conduct full wall bounce conversation', async () => {
      const params = {
        topic: 'AI Ethics',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 2,
        temperature: 0.8
      };

      const result = await service.conductWallBounce(params);

      assert.ok(typeof result === 'string');
      assert.ok(result.includes('AI Ethics'));
      assert.ok(result.includes('Round 1'));
      assert.ok(result.includes('Round 2'));
      assert.ok(result.includes('gpt-4'));
      assert.ok(result.includes('gemini-1.5-pro'));
      assert.ok(result.includes('Summary'));

      // Check that both providers were called
      assert.strictEqual(mockOpenAIProvider.chatCompletion.mock.callCount(), 2);
      assert.strictEqual(mockGeminiProvider.generateContent.mock.callCount(), 2);
    });

    it('should validate and sanitize input topic', async () => {
      const params = {
        topic: '  AI\x00Ethics  ',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 1,
        temperature: 0.8
      };

      const result = await service.conductWallBounce(params);

      // Check that sanitized topic appears in result
      assert.ok(result.includes('AIEthics'));
      assert.ok(!result.includes('\x00'));
    });

    it('should clamp rounds parameter', async () => {
      const params = {
        topic: 'AI Ethics',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 15, // Above maximum
        temperature: 0.8
      };

      const result = await service.conductWallBounce(params);

      // Should be clamped to 10 rounds maximum
      const roundCount = (result.match(/## Round/g) || []).length;
      assert.ok(roundCount <= 10);
    });

    it('should clamp temperature parameter', async () => {
      const params = {
        topic: 'AI Ethics',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 1,
        temperature: 5 // Above maximum
      };

      await service.conductWallBounce(params);

      // Check that clamped temperature was used
      const openaiCall = mockOpenAIProvider.chatCompletion.mock.calls[0].arguments[0];
      assert.strictEqual(openaiCall.temperature, 2); // Clamped to maximum
    });

    it('should throw error when OpenAI provider is not available', async () => {
      mockOpenAIProvider.isAvailable.mock.mockImplementation(() => false);

      const params = {
        topic: 'AI Ethics',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 1,
        temperature: 0.8
      };

      await assert.rejects(async () => {
        await service.conductWallBounce(params);
      }, /OpenAI provider is not available/);
    });

    it('should throw error when Gemini provider is not available', async () => {
      mockGeminiProvider.isAvailable.mock.mockImplementation(() => false);

      const params = {
        topic: 'AI Ethics',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 1,
        temperature: 0.8
      };

      await assert.rejects(async () => {
        await service.conductWallBounce(params);
      }, /Gemini provider is not available/);
    });

    it('should handle errors during conversation and return partial result', async () => {
      mockOpenAIProvider.chatCompletion.mock.mockImplementationOnce(async () => 
        'First OpenAI response'
      );
      mockGeminiProvider.generateContent.mock.mockImplementationOnce(async () => {
        throw new Error('Gemini API Error');
      });

      const params = {
        topic: 'AI Ethics',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 1,
        temperature: 0.8
      };

      const result = await service.conductWallBounce(params);

      assert.ok(result.includes('エラーが発生しました'));
      assert.ok(result.includes('Gemini API Error'));
      assert.ok(result.includes('First OpenAI response')); // Partial result included
    });

    it('should handle empty topic after sanitization', async () => {
      const params = {
        topic: '\x00\x08', // Will be empty after sanitization
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 1,
        temperature: 0.8
      };

      await assert.rejects(async () => {
        await service.conductWallBounce(params);
      }, /Input cannot be empty after sanitization/);
    });
  });
});