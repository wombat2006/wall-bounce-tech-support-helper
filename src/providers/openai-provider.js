/**
 * OpenAI provider module - handles all OpenAI API interactions
 */

import OpenAI from 'openai';
import { validateMessages, validateAndClampNumber } from '../utils/validation.js';

export class OpenAIProvider {
  constructor(apiKey) {
    this.client = new OpenAI({
      apiKey: apiKey || '',
    });
  }

  /**
   * Chat with OpenAI GPT models
   * @param {Object} params - Chat parameters
   * @returns {Promise<string>} Generated response
   */
  async chatCompletion(params) {
    const { model, messages, temperature, maxTokens } = params;
    
    console.error(`Calling OpenAI ${model}...`);
    
    // Validate messages
    const validatedMessages = validateMessages(messages);
    
    // Validate temperature and tokens
    let validatedTemperature = validateAndClampNumber(temperature, 0, 2, 1.0);
    const validatedMaxTokens = validateAndClampNumber(maxTokens, 1, 4000, 2500);
    
    // GPT-5 series specific handling
    const requestParams = {
      model,
      messages: validatedMessages,
      temperature: validatedTemperature,
    };
    
    if (model.includes('gpt-5')) {
      if (validatedTemperature !== 1) {
        console.error(`Note: ${model} only supports temperature=1, adjusting...`);
        validatedTemperature = 1;
        requestParams.temperature = 1;
      }
      requestParams.max_completion_tokens = validatedMaxTokens;
    } else {
      requestParams.max_tokens = validatedMaxTokens;
    }
    
    const completion = await this.client.chat.completions.create(requestParams);
    return completion.choices[0].message.content;
  }

  /**
   * List available OpenAI models
   * @returns {Promise<Array<string>>} Array of model names
   */
  async listModels() {
    const models = await this.client.models.list();
    return models.data
      .filter(m => m.id.includes('gpt'))
      .map(m => m.id);
  }

  /**
   * Check if provider is available
   * @returns {boolean} True if API key is configured
   */
  isAvailable() {
    return !!this.client.apiKey;
  }
}