/**
 * MCP tool handlers - implements the logic for each tool
 */

export class ToolHandlers {
  constructor(openaiProvider, geminiProvider, wallBounceService) {
    this.openaiProvider = openaiProvider;
    this.geminiProvider = geminiProvider;
    this.wallBounceService = wallBounceService;
  }

  /**
   * Handle chat_with_gpt tool
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool response
   */
  async handleChatWithGPT(args) {
    const model = args.model || process.env.OPENAI_MODEL || 'gpt-4';
    const messages = args.messages;
    const temperature = args.temperature || 1.0;
    const maxTokens = args.max_tokens || 2500;

    const response = await this.openaiProvider.chatCompletion({
      model,
      messages,
      temperature,
      maxTokens
    });

    return {
      content: [
        {
          type: 'text',
          text: `**Model:** ${model}\n**Response:** ${response}`,
        },
      ],
    };
  }

  /**
   * Handle chat_with_gemini tool
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool response
   */
  async handleChatWithGemini(args) {
    const model = args.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash-001';
    const messages = args.messages;
    const temperature = args.temperature || 1.0;
    const maxOutputTokens = args.max_output_tokens || 2500;

    const response = await this.geminiProvider.chatCompletion({
      model,
      messages,
      temperature,
      maxOutputTokens
    });

    return {
      content: [
        {
          type: 'text',
          text: `**Model:** ${model}\n**Response:** ${response}`,
        },
      ],
    };
  }

  /**
   * Handle wall_bounce_chat tool
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool response
   */
  async handleWallBounceChat(args) {
    const topic = args.topic;
    const model1 = args.model1 || process.env.OPENAI_MODEL || 'gpt-4';
    const model2 = args.model2 || process.env.GEMINI_MODEL || 'gemini-2.0-flash-001';
    const rounds = args.rounds || 3;
    const temperature = args.temperature || 0.8;

    const discussionLog = await this.wallBounceService.conductWallBounce({
      topic,
      model1,
      model2,
      rounds,
      temperature
    });

    return {
      content: [
        {
          type: 'text',
          text: discussionLog,
        },
      ],
    };
  }

  /**
   * Handle list_models tool
   * @returns {Promise<Object>} Tool response
   */
  async handleListModels() {
    const openaiModels = this.openaiProvider.isAvailable() 
      ? await this.openaiProvider.listModels()
      : [];
    const geminiModels = this.geminiProvider.isAvailable() 
      ? this.geminiProvider.listModels()
      : [];

    const openaiModelList = openaiModels.map(m => `- ${m}`).join('\n');
    const geminiModelList = geminiModels.map(m => `- ${m}`).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Available OpenAI GPT models:**\n${openaiModelList}\n\n**Available Google Gemini models:**\n${geminiModelList}`,
        },
      ],
    };
  }

  /**
   * Route tool call to appropriate handler
   * @param {string} toolName - Name of the tool
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool response
   */
  async handleToolCall(toolName, args) {
    switch (toolName) {
      case 'chat_with_gpt':
        return await this.handleChatWithGPT(args);
      case 'chat_with_gemini':
        return await this.handleChatWithGemini(args);
      case 'wall_bounce_chat':
        return await this.handleWallBounceChat(args);
      case 'list_models':
        return await this.handleListModels();
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}