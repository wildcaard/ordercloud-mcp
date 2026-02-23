import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ok } from '../../ordercloud/helpers/index.js';

describe('ok', () => {
  it('should return a success response with data', () => {
    const result = ok({ id: '123', name: 'Test' });
    
    assert.ok(result.content.length === 1, 'Should have one content item');
    assert.ok(result.content[0].type === 'text', 'Content should be text type');
    
    const parsed = JSON.parse(result.content[0].text);
    assert.strictEqual(parsed.ok, true);
    assert.deepStrictEqual(parsed.data, { id: '123', name: 'Test' });
  });

  it('should handle null data', () => {
    const result = ok(null);
    
    const parsed = JSON.parse(result.content[0].text);
    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.data, null);
  });

  it('should handle array data', () => {
    const result = ok([1, 2, 3]);
    
    const parsed = JSON.parse(result.content[0].text);
    assert.strictEqual(parsed.ok, true);
    assert.deepStrictEqual(parsed.data, [1, 2, 3]);
  });

  it('should handle empty object', () => {
    const result = ok({});
    
    const parsed = JSON.parse(result.content[0].text);
    assert.strictEqual(parsed.ok, true);
    assert.deepStrictEqual(parsed.data, {});
  });
});
