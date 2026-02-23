import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveResourcePath } from '../../ordercloud/helpers/index.js';

describe('resolveResourcePath', () => {
  it('should resolve Product path', () => {
    const result = resolveResourcePath('Product', { productId: 'prod-123' });
    
    assert.strictEqual(result, '/v1/products/prod-123');
  });

  it('should resolve Category path', () => {
    const result = resolveResourcePath('Category', {
      catalogId: 'cat-1',
      categoryId: 'cat-2',
    });
    
    assert.strictEqual(result, '/v1/catalogs/cat-1/categories/cat-2');
  });

  it('should resolve Order path with default direction', () => {
    const result = resolveResourcePath('Order', { orderId: 'order-123' });
    
    assert.strictEqual(result, '/v1/orders/Incoming/order-123');
  });

  it('should resolve Order path with explicit direction', () => {
    const result = resolveResourcePath('Order', {
      orderId: 'order-123',
      direction: 'Outgoing',
    });
    
    assert.strictEqual(result, '/v1/orders/Outgoing/order-123');
  });

  it('should resolve User path', () => {
    const result = resolveResourcePath('User', {
      buyerId: 'buyer-1',
      userId: 'user-2',
    });
    
    assert.strictEqual(result, '/v1/buyers/buyer-1/users/user-2');
  });

  it('should resolve Buyer path', () => {
    const result = resolveResourcePath('Buyer', { buyerId: 'buyer-123' });
    
    assert.strictEqual(result, '/v1/buyers/buyer-123');
  });

  it('should throw for unknown resource type', () => {
    assert.throws(
      () => resolveResourcePath('Unknown' as any, {}),
      /Unknown resource type: Unknown/,
      'Should throw for unknown type'
    );
  });
});
