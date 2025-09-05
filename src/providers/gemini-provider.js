/**
 * Google Gemini provider module - handles all Gemini API interactions
 */

import { GoogleGenAI } from '@google/genai';
import { validateMessages, validateAndClampNumber } from '../utils/validation.js';

export class GeminiProvider {
  constructor(apiKey) {
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.availableModels = [
      'gemini-2.0-flash-001',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro-002',
      'gemini-1.5-flash-001',
      'gemini-1.5-flash-002'
    ];
  }

  /**
   * Convert OpenAI-style messages to Gemini format
   * @param {Array} messages - Array of message objects
   * @returns {Array} Converted messages
   */
  convertMessages(messages) {
    return messages.map(msg => {
      if (msg.role === 'system') {
        return { role: 'system', content: msg.content };
      } else if (msg.role === 'user') {
        return { role: 'user', content: msg.content };
      } else if (msg.role === 'assistant') {
        return { role: 'model', content: msg.content };
      }
      return { ...msg };
    });
  }

  /**
   * Chat with Google Gemini models
   * @param {Object} params - Chat parameters
   * @returns {Promise<string>} Generated response
   */
  async chatCompletion(params) {
    if (!this.isAvailable()) {
      throw new Error('Gemini integration not available. Please configure GOOGLE_API_KEY.');
    }

    const { model, messages, temperature, maxOutputTokens } = params;
    
    console.error(`Calling Google Gemini ${model}...`);
    
    // Validate messages and convert to Gemini format
    const validatedMessages = validateMessages(messages);
    const convertedMessages = this.convertMessages(validatedMessages);
    
    // Validate parameters
    const validatedTemperature = validateAndClampNumber(temperature, 0, 2, 1.0);
    const validatedMaxTokens = validateAndClampNumber(maxOutputTokens, 1, 8192, 2500);
    
    const result = await this.client.models.generateContent({
      model,
      contents: convertedMessages,
      config: {
        temperature: validatedTemperature,
        maxOutputTokens: validatedMaxTokens,
      }
    });
    
    return result.text;
  }

  /**
   * Generate content for single prompt (used in wall bounce)
   * @param {Object} params - Generation parameters
   * @returns {Promise<string>} Generated response
   */
  async generateContent(params) {
    if (!this.isAvailable()) {
      throw new Error('Gemini integration not available. Please configure GOOGLE_API_KEY.');
    }

    const { model, prompt, temperature, maxOutputTokens } = params;
    
    const validatedTemperature = validateAndClampNumber(temperature, 0, 2, 0.8);
    const validatedMaxTokens = validateAndClampNumber(maxOutputTokens, 1, 8192, 1500);
    
    const result = await this.client.models.generateContent({
      model,
      contents: [{ role: 'user', content: prompt }],
      config: {
        temperature: validatedTemperature,
        maxOutputTokens: validatedMaxTokens,
      }
    });
    
    return result.text;
  }

  /**
   * List available Gemini models
   * @returns {Array<string>} Array of model names
   */
  listModels() {
    return [...this.availableModels];
  }

  /**
   * Check if provider is available
   * @returns {boolean} True if API key is configured
   */
  isAvailable() {
    return !!this.client;
  }
}