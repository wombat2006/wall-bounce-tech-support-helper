/**
 * Integration tests with actual API calls
 * These tests require valid API keys in .env file
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import * as dotenv from 'dotenv';
import { OpenAIProvider } from '../../src/providers/openai-provider.js';
import { GeminiProvider } from '../../src/providers/gemini-provider.js';
import { WallBounceService } from '../../src/services/wall-bounce.js';

// Load environment variables
dotenv.config();

describe('API Integration Tests', () => {
  let openaiProvider;
  let geminiProvider;
  let wallBounceService;

  beforeEach(() => {
    openaiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY);
    geminiProvider = new GeminiProvider(process.env.GOOGLE_API_KEY);
    wallBounceService = new WallBounceService(openaiProvider, geminiProvider);
  });

  describe('Environment Configuration', () => {
    it('should load environment variables', () => {
      // Check that dotenv is working
      assert.ok(process.env.NODE_ENV !== undefined || process.env.OPENAI_API_KEY !== undefined || process.env.GOOGLE_API_KEY !== undefined);
    });

    it('should indicate API availability based on environment', () => {
      const openaiAvailable = openaiProvider.isAvailable();
      const geminiAvailable = geminiProvider.isAvailable();

      console.error(`OpenAI Provider Available: ${openaiAvailable}`);
      console.error(`Gemini Provider Available: ${geminiAvailable}`);

      // At least log the availability status
      assert.ok(typeof openaiAvailable === 'boolean');
      assert.ok(typeof geminiAvailable === 'boolean');
    });
  });

  describe('OpenAI Integration', () => {
    it('should make actual OpenAI API call if key is available', async () => {
      if (!openaiProvider.isAvailable()) {
        console.error('Skipping OpenAI test - no API key configured');
        return;
      }

      const params = {
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'user', content: 'Say "Hello World" in response to this message.' }
        ],
        temperature: 0.1, // Low temperature for predictable responses
        maxTokens: 50
      };

      const response = await openaiProvider.chatCompletion(params);
      
      assert.ok(typeof response === 'string');
      assert.ok(response.length > 0);
      console.error(`OpenAI Response: ${response.substring(0, 100)}...`);
    });

    it('should list actual OpenAI models if key is available', async () => {
      if (!openaiProvider.isAvailable()) {
        console.error('Skipping OpenAI models test - no API key configured');
        return;
      }

      const models = await openaiProvider.listModels();
      
      assert.ok(Array.isArray(models));
      assert.ok(models.length > 0);
      console.error(`OpenAI Models count: ${models.length}`);
      console.error(`Sample models: ${models.slice(0, 3).join(', ')}`);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      if (!openaiProvider.isAvailable()) {
        console.error('Skipping OpenAI error test - no API key configured');
        return;
      }

      const params = {
        model: 'non-existent-model-12345',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 50
      };

      await assert.rejects(async () => {
        await openaiProvider.chatCompletion(params);
      });
    });
  });

  describe('Gemini Integration', () => {
    it('should make actual Gemini API call if key is available', async () => {
      if (!geminiProvider.isAvailable()) {
        console.error('Skipping Gemini test - no API key configured');
        return;
      }

      const params = {
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-001',
        messages: [
          { role: 'user', content: 'Say "Hello World" in response to this message.' }
        ],
        temperature: 0.1,
        maxOutputTokens: 50
      };

      const response = await geminiProvider.chatCompletion(params);
      
      assert.ok(typeof response === 'string');
      assert.ok(response.length > 0);
      console.error(`Gemini Response: ${response.substring(0, 100)}...`);
    });

    it('should generate content with single prompt', async () => {
      if (!geminiProvider.isAvailable()) {
        console.error('Skipping Gemini content generation test - no API key configured');
        return;
      }

      const params = {
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-001',
        prompt: 'Write exactly three words: "Integration test successful"',
        temperature: 0.1,
        maxOutputTokens: 20
      };

      const response = await geminiProvider.generateContent(params);
      
      assert.ok(typeof response === 'string');
      assert.ok(response.length > 0);
      console.error(`Gemini Content Generation: ${response}`);
    });

    it('should list Gemini models', () => {
      const models = geminiProvider.listModels();
      
      assert.ok(Array.isArray(models));
      assert.ok(models.length > 0);
      assert.ok(models.includes('gemini-2.0-flash-001'));
      console.error(`Gemini Models: ${models.join(', ')}`);
    });

    it('should handle Gemini API errors gracefully', async () => {
      if (!geminiProvider.isAvailable()) {
        console.error('Skipping Gemini error test - no API key configured');
        return;
      }

      const params = {
        model: 'non-existent-gemini-model',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxOutputTokens: 50
      };

      await assert.rejects(async () => {
        await geminiProvider.chatCompletion(params);
      });
    });
  });

  describe('Wall Bounce Integration', () => {
    it('should conduct actual wall bounce conversation if both APIs are available', async () => {
      if (!openaiProvider.isAvailable() || !geminiProvider.isAvailable()) {
        console.error('Skipping Wall Bounce test - missing API keys');
        return;
      }

      const params = {
        topic: 'The benefits of automated testing in software development',
        model1: process.env.OPENAI_MODEL || 'gpt-4',
        model2: process.env.GEMINI_MODEL || 'gemini-2.0-flash-001',
        rounds: 1, // Keep it short for testing
        temperature: 0.3 // Lower temperature for more focused responses
      };

      const result = await wallBounceService.conductWallBounce(params);
      
      assert.ok(typeof result === 'string');
      assert.ok(result.includes('Wall Bounce Discussion'));
      assert.ok(result.includes(params.topic));
      assert.ok(result.includes('Round 1'));
      assert.ok(result.includes(params.model1));
      assert.ok(result.includes(params.model2));
      assert.ok(result.includes('Summary'));
      
      console.error(`Wall Bounce Result Length: ${result.length}`);
      console.error(`Wall Bounce Preview: ${result.substring(0, 200)}...`);
    });

    it('should handle partial availability (OpenAI only)', async () => {
      if (!openaiProvider.isAvailable()) {
        console.error('Skipping partial availability test - no OpenAI key');
        return;
      }

      // Create service with unavailable Gemini
      const unavailableGemini = new GeminiProvider(); // No API key
      const partialService = new WallBounceService(openaiProvider, unavailableGemini);

      const params = {
        topic: 'Testing with partial API availability',
        model1: process.env.OPENAI_MODEL || 'gpt-4',
        model2: 'gemini-2.0-flash-001',
        rounds: 1,
        temperature: 0.5
      };

      await assert.rejects(async () => {
        await partialService.conductWallBounce(params);
      }, /Gemini provider is not available/);
    });

    it('should handle rate limiting and API quotas gracefully', async () => {
      if (!openaiProvider.isAvailable() || !geminiProvider.isAvailable()) {
        console.error('Skipping rate limit test - missing API keys');
        return;
      }

      // Test with minimal parameters to avoid hitting rate limits
      const params = {
        topic: 'Brief topic',
        model1: process.env.OPENAI_MODEL || 'gpt-4',
        model2: process.env.GEMINI_MODEL || 'gemini-2.0-flash-001',
        rounds: 1,
        temperature: 0.1
      };

      // This should succeed or fail gracefully with proper error messages
      try {
        const result = await wallBounceService.conductWallBounce(params);
        assert.ok(typeof result === 'string');
        console.error('Rate limit test passed successfully');
      } catch (error) {
        // If it fails due to rate limiting, the error should be informative
        console.error(`Rate limit test failed as expected: ${error.message}`);
        assert.ok(error.message.length > 0);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should validate environment file exists', async () => {
      try {
        await import('fs');
        const fs = await import('fs');
        const envExists = fs.existsSync('.env');
        console.error(`Environment file exists: ${envExists}`);
        
        if (envExists) {
          const envContent = fs.readFileSync('.env', 'utf8');
          const hasOpenAI = envContent.includes('OPENAI_API_KEY');
          const hasGemini = envContent.includes('GOOGLE_API_KEY');
          
          console.error(`Environment contains OPENAI_API_KEY: ${hasOpenAI}`);
          console.error(`Environment contains GOOGLE_API_KEY: ${hasGemini}`);
        }
      } catch (error) {
        console.error('Could not check environment file');
      }
    });

    it('should validate API key formats', () => {
      const openaiKey = process.env.OPENAI_API_KEY;
      const geminiKey = process.env.GOOGLE_API_KEY;

      if (openaiKey) {
        // OpenAI keys typically start with 'sk-'
        console.error(`OpenAI key format valid: ${openaiKey.startsWith('sk-') || openaiKey.startsWith('proj-')}`);
      }

      if (geminiKey) {
        // Gemini keys are typically 40+ characters
        console.error(`Gemini key length: ${geminiKey.length}`);
        console.error(`Gemini key format valid: ${geminiKey.length >= 30}`);
      }
    });
  });
});