/**
 * Input validation and sanitization utilities
 */

/**
 * Validates and sanitizes input strings
 * @param {string} input - Input to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized input
 * @throws {Error} If input is invalid
 */
export function validateAndSanitizeInput(input, maxLength = 10000) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }
  
  // Basic sanitization - remove potentially harmful characters
  const sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  
  if (sanitized.length === 0) {
    throw new Error('Input cannot be empty after sanitization');
  }
  
  if (sanitized.length > maxLength) {
    throw new Error(`Input too long. Maximum ${maxLength} characters allowed`);
  }
  
  return sanitized;
}

/**
 * Validates and converts messages to a standard format
 * @param {Array} messages - Array of message objects
 * @returns {Array} Validated and converted messages
 */
export function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new Error('Messages must be an array');
  }
  
  return messages.map(msg => {
    if (!msg.content || typeof msg.content !== 'string') {
      throw new Error('Message content must be a non-empty string');
    }
    
    const sanitizedContent = validateAndSanitizeInput(msg.content);
    return { ...msg, content: sanitizedContent };
  });
}

/**
 * Validates and clamps numeric parameters
 * @param {number} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Clamped value
 */
export function validateAndClampNumber(value, min, max, defaultValue) {
  const num = typeof value === 'number' ? value : defaultValue;
  return Math.min(Math.max(num, min), max);
}