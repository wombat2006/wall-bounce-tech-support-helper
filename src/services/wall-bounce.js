/**
 * Wall Bounce service - handles AI model conversations
 */

import { validateAndSanitizeInput, validateAndClampNumber } from '../utils/validation.js';

export class WallBounceService {
  constructor(openaiProvider, geminiProvider) {
    this.openaiProvider = openaiProvider;
    this.geminiProvider = geminiProvider;
  }

  /**
   * Conduct wall bounce conversation between AI models
   * @param {Object} params - Wall bounce parameters
   * @returns {Promise<string>} Discussion log in markdown format
   */
  async conductWallBounce(params) {
    const { topic, model1, model2, rounds, temperature } = params;

    // Validate required providers
    if (!this.openaiProvider.isAvailable()) {
      throw new Error('OpenAI provider is not available. Please configure OPENAI_API_KEY.');
    }
    
    if (!this.geminiProvider.isAvailable()) {
      throw new Error('Gemini provider is not available. Please configure GOOGLE_API_KEY.');
    }

    // Validate and sanitize inputs
    const sanitizedTopic = validateAndSanitizeInput(topic, 1000);
    const validatedRounds = validateAndClampNumber(rounds, 1, 10, 3);
    const validatedTemperature = validateAndClampNumber(temperature, 0, 2, 0.8);

    console.error(`Starting wall bounce chat between ${model1} and ${model2} for ${validatedRounds} rounds...`);
    
    let conversation = [];
    let discussionLog = `# Wall Bounce Discussion: ${sanitizedTopic}\n\n`;
    
    // Initial prompt for the first model
    const initialPrompt = this.createInitialPrompt(sanitizedTopic);
    conversation.push({ role: 'user', content: initialPrompt });
    
    try {
      for (let round = 1; round <= validatedRounds; round++) {
        discussionLog += `## Round ${round}\n\n`;
        
        // OpenAI model response
        console.error(`Round ${round}: Calling ${model1}...`);
        const openaiResponse = await this.getOpenAIResponse(
          model1, 
          conversation, 
          validatedTemperature
        );
        
        discussionLog += `### ${model1}:\n${openaiResponse}\n\n`;
        conversation.push({ role: 'assistant', content: openaiResponse });
        
        // Gemini model response
        console.error(`Round ${round}: Calling ${model2}...`);
        const geminiPrompt = this.createGeminiPrompt(openaiResponse);
        const geminiResponse = await this.getGeminiResponse(
          model2,
          geminiPrompt,
          validatedTemperature
        );
        
        discussionLog += `### ${model2}:\n${geminiResponse}\n\n`;
        
        // Update conversation for next round
        const nextPrompt = `別の専門家からの応答: "${geminiResponse}"\n\nこの応答を踏まえて、さらに議論を発展させてください。`;
        conversation.push({ role: 'user', content: nextPrompt });
      }
      
      discussionLog += this.createSummary(model1, model2, validatedRounds, sanitizedTopic);
      return discussionLog;
      
    } catch (error) {
      console.error('Wall bounce error:', error);
      return `壁打ちセッション中にエラーが発生しました: ${error.message}\n\n現在までの議論:\n${discussionLog}`;
    }
  }

  /**
   * Create initial prompt for the first model
   * @param {string} topic - Discussion topic
   * @returns {string} Initial prompt
   */
  createInitialPrompt(topic) {
    return `あなたは技術的な議論や問題解決に参加している専門家です。以下のトピックについて、建設的で洞察に富んだ議論を行ってください。別のAIモデルとの対話を通じて、アイデアを発展させ、新しい視点を提供してください。

トピック: ${topic}

このトピックについてあなたの最初の見解や質問を述べてください。`;
  }

  /**
   * Create prompt for Gemini model response
   * @param {string} previousResponse - Previous model's response
   * @returns {string} Gemini prompt
   */
  createGeminiPrompt(previousResponse) {
    return `あなたは技術的な議論に参加している別の専門家です。前のAIモデルの発言に対して応答し、議論を発展させてください。異なる視点や代替案を提供し、建設的な対話を続けてください。

前のモデルの発言:
"${previousResponse}"

この発言に対するあなたの応答、質問、または追加の洞察を提供してください。`;
  }

  /**
   * Get response from OpenAI model
   * @param {string} model - Model name
   * @param {Array} conversation - Conversation history
   * @param {number} temperature - Temperature setting
   * @returns {Promise<string>} Model response
   */
  async getOpenAIResponse(model, conversation, temperature) {
    return await this.openaiProvider.chatCompletion({
      model,
      messages: conversation,
      temperature,
      maxTokens: 1500
    });
  }

  /**
   * Get response from Gemini model
   * @param {string} model - Model name
   * @param {string} prompt - Input prompt
   * @param {number} temperature - Temperature setting
   * @returns {Promise<string>} Model response
   */
  async getGeminiResponse(model, prompt, temperature) {
    return await this.geminiProvider.generateContent({
      model,
      prompt,
      temperature,
      maxOutputTokens: 1500
    });
  }

  /**
   * Create discussion summary
   * @param {string} model1 - First model name
   * @param {string} model2 - Second model name
   * @param {number} rounds - Number of rounds
   * @param {string} topic - Discussion topic
   * @returns {string} Summary text
   */
  createSummary(model1, model2, rounds, topic) {
    return `## Summary\n\nこの壁打ちセッションでは、${model1}と${model2}が${rounds}ラウンドにわたって「${topic}」について議論しました。両モデルが異なる視点と専門知識を提供し、包括的な対話が行われました。`;
  }
}