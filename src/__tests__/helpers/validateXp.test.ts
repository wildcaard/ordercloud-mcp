import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateXp } from '../../ordercloud/helpers/index.js';

describe('validateXp', () => {
  it('should pass for valid XP object', () => {
    const xp = { key: 'value', number: 123, nested: { a: 1 } };
    
    assert.doesNotThrow(() => validateXp(xp), 'Should not throw for valid XP');
  });

  it('should pass for empty XP object', () => {
    assert.doesNotThrow(() => validateXp({}), 'Should not throw for empty object');
  });

  it('should pass for null', () => {
    assert.doesNotThrow(() => validateXp(null), 'Should not throw for null');
  });

  it('should pass for simple string', () => {
    assert.doesNotThrow(() => validateXp('test'), 'Should not throw for string');
  });

  it('should throw when XP exceeds 64KB', () => {
    // Create a string that exceeds 64KB
    const largeString = 'x'.repeat(65537);
    const xp = { data: largeString };
    
    assert.throws(
      () => validateXp(xp),
      /xpPatch exceeds maximum size of 65536 bytes/,
      'Should throw for oversized XP'
    );
  });

  it('should throw for keys starting with dollar sign', () => {
    const xp = { $invalid: 'value' };
    
    assert.throws(
      () => validateXp(xp),
      /xp keys starting with/,
      'Should throw for dollar sign keys'
    );
  });

  // Note: The current implementation only checks top-level keys, not nested keys
  it('should NOT throw for nested keys starting with dollar sign', () => {
    const xp = { nested: { $bad: 'value' } };
    
    // Current implementation doesn't recursively check nested objects
    assert.doesNotThrow(() => validateXp(xp), 'Currently does not check nested keys');
  });

  it('should allow keys that contain dollar sign but not start with it', () => {
    const xp = { my$key: 'value', test$field: 'test' };
    
    assert.doesNotThrow(() => validateXp(xp), 'Should allow dollar sign in middle of keys');
  });

  it('should handle arrays', () => {
    const xp = [1, 2, 3];
    
    assert.doesNotThrow(() => validateXp(xp), 'Should not throw for arrays');
  });

  it('should handle numbers', () => {
    const xp = 123;
    
    assert.doesNotThrow(() => validateXp(xp), 'Should not throw for numbers');
  });
});
