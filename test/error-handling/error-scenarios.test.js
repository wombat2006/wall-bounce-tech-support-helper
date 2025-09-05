/**
 * Comprehensive error handling tests
 * Tests various failure scenarios and edge cases
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { OpenAIProvider } from '../../src/providers/openai-provider.js';
import { GeminiProvider } from '../../src/providers/gemini-provider.js';
import { WallBounceService } from '../../src/services/wall-bounce.js';
import { ToolHandlers } from '../../src/tools/tool-handlers.js';

describe('Error Handling Scenarios', () => {
  describe('Network and API Failures', () => {
    let provider;

    beforeEach(() => {
      provider = new OpenAIProvider('test-key');
    });

    it('should handle network timeout errors', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: mock.fn(async () => {
              const error = new Error('Request timeout');
              error.code = 'ECONNABORTED';
              throw error;
            })
          }
        }
      };
      provider.client = mockClient;

      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 100
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      }, /Request timeout/);
    });

    it('should handle rate limiting errors (429)', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: mock.fn(async () => {
              const error = new Error('Rate limit exceeded');
              error.status = 429;
              error.code = 'rate_limit_exceeded';
              throw error;
            })
          }
        }
      };
      provider.client = mockClient;

      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 100
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      }, /Rate limit exceeded/);
    });

    it('should handle quota exceeded errors', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: mock.fn(async () => {
              const error = new Error('Quota exceeded');
              error.status = 429;
              error.code = 'insufficient_quota';
              throw error;
            })
          }
        }
      };
      provider.client = mockClient;

      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 100
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      }, /Quota exceeded/);
    });

    it('should handle invalid API key errors (401)', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: mock.fn(async () => {
              const error = new Error('Invalid API key');
              error.status = 401;
              error.code = 'invalid_api_key';
              throw error;
            })
          }
        }
      };
      provider.client = mockClient;

      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 100
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      }, /Invalid API key/);
    });
  });

  describe('Malformed API Responses', () => {
    let provider;

    beforeEach(() => {
      provider = new OpenAIProvider('test-key');
    });

    it('should handle missing choices in response', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: mock.fn(async () => ({
              // Missing choices array
              id: 'test-id',
              object: 'chat.completion'
            }))
          }
        }
      };
      provider.client = mockClient;

      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 100
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      });
    });

    it('should handle empty choices array', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: mock.fn(async () => ({
              choices: [] // Empty choices
            }))
          }
        }
      };
      provider.client = mockClient;

      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 100
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      });
    });

    it('should handle malformed choice structure', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: mock.fn(async () => ({
              choices: [{
                // Missing message field
                index: 0,
                finish_reason: 'stop'
              }]
            }))
          }
        }
      };
      provider.client = mockClient;

      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 100
      };

      await assert.rejects(async () => {
        await provider.chatCompletion(params);
      });
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long input strings', async () => {
      // Import directly to test static method
      const { validateAndSanitizeInput } = await import('../../src/utils/validation.js');
      
      const longInput = 'A'.repeat(50000);
      
      assert.throws(() => {
        validateAndSanitizeInput(longInput, 1000);
      }, /Input too long/);
    });

    it('should handle input with only control characters', async () => {
      const { validateAndSanitizeInput } = await import('../../src/utils/validation.js');
      
      const controlCharsOnly = '\x00\x01\x02\x03\x04\x05';
      
      assert.throws(() => {
        validateAndSanitizeInput(controlCharsOnly);
      }, /Input cannot be empty after sanitization/);
    });

    it('should handle deeply nested message structures', async () => {
      const { validateMessages } = await import('../../src/utils/validation.js');
      
      const deeplyNested = [];
      for (let i = 0; i < 10000; i++) {
        deeplyNested.push({ role: 'user', content: `Message ${i}` });
      }
      
      // Should not throw, but might be slow
      const result = validateMessages(deeplyNested);
      assert.strictEqual(result.length, 10000);
    });

    it('should handle circular references in messages', async () => {
      const { validateMessages } = await import('../../src/utils/validation.js');
      
      const circularMessage = { role: 'user', content: 'Hello' };
      circularMessage.self = circularMessage; // Circular reference
      
      // Should still work as we only validate specific properties
      const result = validateMessages([circularMessage]);
      assert.strictEqual(result[0].content, 'Hello');
      assert.ok(result[0].self); // Circular ref preserved
    });
  });

  describe('Wall Bounce Service Error Scenarios', () => {
    let service;
    let mockOpenAI;
    let mockGemini;

    beforeEach(() => {
      mockOpenAI = {
        isAvailable: mock.fn(() => true),
        chatCompletion: mock.fn()
      };
      mockGemini = {
        isAvailable: mock.fn(() => true),
        generateContent: mock.fn()
      };
      
      service = new WallBounceService(mockOpenAI, mockGemini);
    });

    it('should handle OpenAI failure mid-conversation', async () => {
      mockOpenAI.chatCompletion
        .mock.mockImplementationOnce(async () => 'First response')
        .mock.mockImplementationOnce(async () => {
          throw new Error('OpenAI failed on second call');
        });
      
      mockGemini.generateContent.mock.mockImplementation(async () => 'Gemini response');

      const params = {
        topic: 'Test topic',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 2,
        temperature: 0.8
      };

      const result = await service.conductWallBounce(params);
      
      assert.ok(result.includes('エラーが発生しました'));
      assert.ok(result.includes('OpenAI failed on second call'));
      assert.ok(result.includes('First response')); // Partial result preserved
    });

    it('should handle Gemini failure mid-conversation', async () => {
      mockOpenAI.chatCompletion.mock.mockImplementation(async () => 'OpenAI response');
      mockGemini.generateContent
        .mock.mockImplementationOnce(async () => 'First Gemini response')
        .mock.mockImplementationOnce(async () => {
          throw new Error('Gemini failed on second call');
        });

      const params = {
        topic: 'Test topic',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 2,
        temperature: 0.8
      };

      const result = await service.conductWallBounce(params);
      
      assert.ok(result.includes('エラーが発生しました'));
      assert.ok(result.includes('Gemini failed on second call'));
      assert.ok(result.includes('First Gemini response'));
    });

    it('should handle complete provider unavailability during execution', async () => {
      mockOpenAI.isAvailable.mock.mockImplementation(() => false);

      const params = {
        topic: 'Test topic',
        model1: 'gpt-4',
        model2: 'gemini-1.5-pro',
        rounds: 1,
        temperature: 0.8
      };

      await assert.rejects(async () => {
        await service.conductWallBounce(params);
      }, /OpenAI provider is not available/);
    });
  });

  describe('Tool Handler Error Propagation', () => {
    let handlers;
    let mockOpenAI;
    let mockGemini;
    let mockWallBounce;

    beforeEach(() => {
      mockOpenAI = {
        isAvailable: mock.fn(() => true),
        chatCompletion: mock.fn(),
        listModels: mock.fn()
      };
      mockGemini = {
        isAvailable: mock.fn(() => true),
        chatCompletion: mock.fn(),
        listModels: mock.fn()
      };
      mockWallBounce = {
        conductWallBounce: mock.fn()
      };
      
      handlers = new ToolHandlers(mockOpenAI, mockGemini, mockWallBounce);
    });

    it('should properly propagate validation errors', async () => {
      const args = {
        messages: [{ role: 'user', content: 123 }] // Invalid content type
      };

      await assert.rejects(async () => {
        await handlers.handleChatWithGPT(args);
      }, /Message content must be a non-empty string/);
    });

    it('should handle concurrent API failures', async () => {
      mockOpenAI.listModels.mock.mockImplementation(async () => {
        throw new Error('OpenAI list failed');
      });
      mockGemini.listModels.mock.mockImplementation(() => {
        throw new Error('Gemini list failed');
      });

      await assert.rejects(async () => {
        await handlers.handleListModels();
      }, /OpenAI list failed/);
    });

    it('should handle partial failures in list_models', async () => {
      mockOpenAI.listModels.mock.mockImplementation(async () => ['gpt-4']);
      mockGemini.isAvailable.mock.mockImplementation(() => false);

      const result = await handlers.handleListModels();
      
      assert.ok(result.content[0].text.includes('gpt-4'));
      assert.ok(result.content[0].text.includes('Available Google Gemini models'));
    });
  });

  describe('Memory and Resource Limits', () => {
    it('should handle memory pressure gracefully', async () => {
      const provider = new OpenAIProvider('test-key');
      
      // Create a very large messages array
      const largeMessages = [];
      for (let i = 0; i < 1000; i++) {
        largeMessages.push({
          role: 'user',
          content: 'A'.repeat(1000) // 1000 chars each
        });
      }

      const mockClient = {
        chat: {
          completions: {
            create: mock.fn(async () => ({
              choices: [{ message: { content: 'Response' } }]
            }))
          }
        }
      };
      provider.client = mockClient;

      const params = {
        model: 'gpt-4',
        messages: largeMessages,
        temperature: 0.5,
        maxTokens: 100
      };

      // Should complete without memory issues
      const result = await provider.chatCompletion(params);
      assert.strictEqual(result, 'Response');
    });

    it('should handle extremely long topic strings in wall bounce', async () => {
      const service = new WallBounceService(
        { isAvailable: () => true, chatCompletion: async () => 'Response' },
        { isAvailable: () => true, generateContent: async () => 'Response' }
      );

      const longTopic = 'A'.repeat(2000); // Very long topic

      await assert.rejects(async () => {
        await service.conductWallBounce({
          topic: longTopic,
          model1: 'gpt-4',
          model2: 'gemini-1.5-pro',
          rounds: 1,
          temperature: 0.8
        });
      }, /Input too long/);
    });
  });

  describe('Concurrent Access and Race Conditions', () => {
    it('should handle multiple simultaneous API calls', async () => {
      const provider = new OpenAIProvider('test-key');
      const mockClient = {
        chat: {
          completions: {
            create: mock.fn(async () => ({
              choices: [{ message: { content: 'Concurrent response' } }]
            }))
          }
        }
      };
      provider.client = mockClient;

      const params = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 100
      };

      // Launch multiple concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(provider.chatCompletion(params));
      }

      const results = await Promise.all(promises);
      
      assert.strictEqual(results.length, 10);
      results.forEach(result => {
        assert.strictEqual(result, 'Concurrent response');
      });
    });
  });
});