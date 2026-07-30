import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockPaymentOrder } from '../../lib/schemes/mock-gateway';

test('mock-gateway: forbid mock gateway in production environment', () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    assert.throws(
      () => {
        createMockPaymentOrder({
          orderId: 'test_123',
          amountPaise: 100000n,
          idempotencyKey: 'ik_test_123',
        });
      },
      {
        message: 'CRITICAL SECURITY VIOLATION: Mock payment gateway cannot operate in production environment!',
      }
    );
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  }
});
