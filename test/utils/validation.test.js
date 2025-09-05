/**
 * Tests for validation utilities
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  validateAndSanitizeInput, 
  validateMessages, 
  validateAndClampNumber 
} from '../../src/utils/validation.js';

describe('Validation Utils', () => {
  describe('validateAndSanitizeInput', () => {
    it('should return valid input unchanged', () => {
      const input = 'Hello world';
      const result = validateAndSanitizeInput(input);
      assert.strictEqual(result, 'Hello world');
    });

    it('should trim whitespace', () => {
      const input = '  Hello world  ';
      const result = validateAndSanitizeInput(input);
      assert.strictEqual(result, 'Hello world');
    });

    it('should remove control characters', () => {
      const input = 'Hello\x00\x08world\x1F';
      const result = validateAndSanitizeInput(input);
      assert.strictEqual(result, 'Helloworld');
    });

    it('should throw error for non-string input', () => {
      assert.throws(() => {
        validateAndSanitizeInput(123);
      }, /Input must be a non-empty string/);
    });

    it('should throw error for null input', () => {
      assert.throws(() => {
        validateAndSanitizeInput(null);
      }, /Input must be a non-empty string/);
    });

    it('should throw error for empty input after sanitization', () => {
      assert.throws(() => {
        validateAndSanitizeInput('\x00\x08');
      }, /Input cannot be empty after sanitization/);
    });

    it('should enforce max length', () => {
      const longInput = 'a'.repeat(1000);
      assert.throws(() => {
        validateAndSanitizeInput(longInput, 500);
      }, /Input too long. Maximum 500 characters allowed/);
    });

    it('should accept input within max length', () => {
      const input = 'a'.repeat(100);
      const result = validateAndSanitizeInput(input, 500);
      assert.strictEqual(result, input);
    });
  });

  describe('validateMessages', () => {
    it('should validate valid messages array', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' }
      ];
      const result = validateMessages(messages);
      assert.deepStrictEqual(result, messages);
    });

    it('should throw error for non-array input', () => {
      assert.throws(() => {
        validateMessages('not an array');
      }, /Messages must be an array/);
    });

    it('should throw error for message without content', () => {
      const messages = [{ role: 'user' }];
      assert.throws(() => {
        validateMessages(messages);
      }, /Message content must be a non-empty string/);
    });

    it('should throw error for message with non-string content', () => {
      const messages = [{ role: 'user', content: 123 }];
      assert.throws(() => {
        validateMessages(messages);
      }, /Message content must be a non-empty string/);
    });

    it('should sanitize message content', () => {
      const messages = [{ role: 'user', content: '  Hello\x00world  ' }];
      const result = validateMessages(messages);
      assert.strictEqual(result[0].content, 'Helloworld');
    });

    it('should preserve other message properties', () => {
      const messages = [{ 
        role: 'user', 
        content: 'Hello',
        timestamp: '2024-01-01'
      }];
      const result = validateMessages(messages);
      assert.strictEqual(result[0].timestamp, '2024-01-01');
    });
  });

  describe('validateAndClampNumber', () => {
    it('should return value within range unchanged', () => {
      const result = validateAndClampNumber(0.5, 0, 1, 0.8);
      assert.strictEqual(result, 0.5);
    });

    it('should clamp value above maximum', () => {
      const result = validateAndClampNumber(2.5, 0, 2, 1);
      assert.strictEqual(result, 2);
    });

    it('should clamp value below minimum', () => {
      const result = validateAndClampNumber(-0.5, 0, 2, 1);
      assert.strictEqual(result, 0);
    });

    it('should use default for non-number input', () => {
      const result = validateAndClampNumber('not a number', 0, 2, 1.5);
      assert.strictEqual(result, 1.5);
    });

    it('should use default for null input', () => {
      const result = validateAndClampNumber(null, 0, 2, 1.2);
      assert.strictEqual(result, 1.2);
    });

    it('should use default for undefined input', () => {
      const result = validateAndClampNumber(undefined, 0, 2, 0.3);
      assert.strictEqual(result, 0.3);
    });

    it('should handle edge case where min equals max', () => {
      const result = validateAndClampNumber(5, 1, 1, 1);
      assert.strictEqual(result, 1);
    });
  });
});