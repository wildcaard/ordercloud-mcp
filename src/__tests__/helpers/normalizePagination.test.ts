import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizePagination, OcList } from '../../ordercloud/helpers/index.js';

describe('normalizePagination', () => {
  it('should normalize pagination with full metadata', () => {
    const raw: OcList<{ id: string }> = {
      Items: [{ id: '1' }, { id: '2' }],
      Meta: {
        Page: 2,
        PageSize: 10,
        TotalCount: 50,
        TotalPages: 5,
      },
    };

    const result = normalizePagination(raw);

    assert.strictEqual(result.items.length, 2, 'Should have 2 items');
    assert.strictEqual(result.meta.page, 2);
    assert.strictEqual(result.meta.pageSize, 10);
    assert.strictEqual(result.meta.totalCount, 50);
    assert.strictEqual(result.meta.totalPages, 5);
  });

  it('should handle empty items', () => {
    const raw: OcList<unknown> = {
      Items: [],
      Meta: {
        Page: 1,
        PageSize: 20,
        TotalCount: 0,
        TotalPages: 0,
      },
    };

    const result = normalizePagination(raw);

    assert.strictEqual(result.items.length, 0, 'Should have 0 items');
    assert.strictEqual(result.meta.totalCount, 0);
  });

  it('should handle single item', () => {
    const raw: OcList<{ name: string }> = {
      Items: [{ name: 'Test' }],
      Meta: {
        Page: 1,
        PageSize: 1,
        TotalCount: 1,
        TotalPages: 1,
      },
    };

    const result = normalizePagination(raw);

    assert.strictEqual(result.items.length, 1, 'Should have 1 item');
    assert.deepStrictEqual(result.items[0], { name: 'Test' });
    assert.strictEqual(result.meta.page, 1);
    assert.strictEqual(result.meta.totalPages, 1);
  });
});
