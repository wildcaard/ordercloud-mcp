import { describe, it } from 'node:test';
import assert from 'node:assert';
import { deepMerge } from '../../ordercloud/helpers/index.js';

describe('deepMerge', () => {
  it('should merge two flat objects', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    
    const result = deepMerge(target, source);
    
    assert.deepStrictEqual(result, { a: 1, b: 3, c: 4 });
  });

  it('should deeply merge nested objects', () => {
    const target = { a: { x: 1, y: 2 } };
    const source = { a: { y: 3, z: 4 } };
    
    const result = deepMerge(target, source);
    
    assert.deepStrictEqual(result, { a: { x: 1, y: 3, z: 4 } });
  });

  it('should replace arrays instead of merging', () => {
    const target = { items: [1, 2, 3] };
    const source = { items: [4, 5] };
    
    const result = deepMerge(target, source);
    
    assert.deepStrictEqual(result, { items: [4, 5] });
  });

  it('should handle empty objects', () => {
    const target = {};
    const source = { a: 1 };
    
    const result = deepMerge(target, source);
    
    assert.deepStrictEqual(result, { a: 1 });
  });

  it('should not modify original objects', () => {
    const target = { a: { x: 1 } };
    const source = { a: { y: 2 } };
    
    deepMerge(target, source);
    
    assert.deepStrictEqual(target, { a: { x: 1 } });
    assert.deepStrictEqual(source, { a: { y: 2 } });
  });

  it('should handle primitive values in source', () => {
    const target = { a: { x: 1 } };
    const source = { a: 'string' };
    
    const result = deepMerge(target, source);
    
    assert.deepStrictEqual(result, { a: 'string' });
  });

  it('should handle multiple levels of nesting', () => {
    const target = { a: { b: { c: 1 } } };
    const source = { a: { b: { d: 2 }, e: 3 } };
    
    const result = deepMerge(target, source);
    
    assert.deepStrictEqual(result, { a: { b: { c: 1, d: 2 }, e: 3 } });
  });
});
