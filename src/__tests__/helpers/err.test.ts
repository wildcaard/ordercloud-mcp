import { describe, it } from 'node:test';
import assert from 'node:assert';
import { err } from '../../ordercloud/helpers/index.js';
import { OrderCloudError } from '../../ordercloud/client.js';

describe('err', () => {
  it('should format an OrderCloudError correctly', () => {
    const error = new OrderCloudError('Test error', 400, { field: 'value' });
    const result = err(error);
    
    assert.strictEqual(result.isError, true, 'Should be marked as error');
    assert.ok(result.content.length === 1, 'Should have one content item');
    assert.ok(result.content[0].type === 'text', 'Content should be text type');
    
    const parsed = JSON.parse(result.content[0].text);
    assert.strictEqual(parsed.ok, false, 'Should have ok: false');
    assert.strictEqual(parsed.error.message, 'Test error');
    assert.strictEqual(parsed.error.status, 400);
    assert.deepStrictEqual(parsed.error.details, { field: 'value' });
  });

  it('should format a generic Error correctly', () => {
    const error = new Error('Generic error');
    const result = err(error);
    
    assert.strictEqual(result.isError, true, 'Should be marked as error');
    const parsed = JSON.parse(result.content[0].text);
    assert.strictEqual(parsed.ok, false);
    assert.strictEqual(parsed.error.message, 'Generic error');
  });

  it('should format a string error correctly', () => {
    const result = err('String error message');
    
    assert.strictEqual(result.isError, true, 'Should be marked as error');
    const parsed = JSON.parse(result.content[0].text);
    assert.strictEqual(parsed.ok, false);
    assert.strictEqual(parsed.error.message, 'String error message');
  });

  it('should handle unknown error types', () => {
    const result = err(123);
    
    assert.strictEqual(result.isError, true, 'Should be marked as error');
    const parsed = JSON.parse(result.content[0].text);
    assert.strictEqual(parsed.ok, false);
    assert.strictEqual(parsed.error.message, '123');
  });
});
