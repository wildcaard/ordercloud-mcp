import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildListQuery } from '../../ordercloud/helpers/index.js';

describe('buildListQuery', () => {
  it('should build query with all parameters', () => {
    const result = buildListQuery({
      search: 'test',
      filters: { Status: 'Active', Type: 'Product' },
      page: 2,
      pageSize: 50,
      sortBy: 'Name',
    });

    assert.deepStrictEqual(result, {
      search: 'test',
      page: 2,
      pageSize: 50,
      sortBy: 'Name',
      Status: 'Active',
      Type: 'Product',
    });
  });

  it('should build query with only search', () => {
    const result = buildListQuery({ search: 'test' });

    assert.deepStrictEqual(result, { search: 'test' });
  });

  it('should build query with only filters', () => {
    const result = buildListQuery({ filters: { Status: 'Active' } });

    assert.deepStrictEqual(result, { Status: 'Active' });
  });

  it('should build query with pagination only', () => {
    const result = buildListQuery({ page: 1, pageSize: 10 });

    assert.deepStrictEqual(result, { page: 1, pageSize: 10 });
  });

  it('should build empty query when no params', () => {
    const result = buildListQuery({});

    assert.deepStrictEqual(result, {});
  });

  it('should handle multiple filters', () => {
    const result = buildListQuery({
      filters: {
        Status: 'Active',
        Category: 'Electronics',
        Brand: 'Apple',
      },
    });

    assert.deepStrictEqual(result, {
      Status: 'Active',
      Category: 'Electronics',
      Brand: 'Apple',
    });
  });

  it('should handle sortBy parameter', () => {
    const result = buildListQuery({ sortBy: 'CreatedDate' });

    assert.deepStrictEqual(result, { sortBy: 'CreatedDate' });
  });
});
