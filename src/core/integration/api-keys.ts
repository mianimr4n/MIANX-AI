/**
 * @module core/integration/api-keys
 * API key management for programmatic access.
 * Keys are stored as SHA-256 hashes; the full key is returned only on creation.
 * Format: mk_live_<32 random chars>
 */

import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import type { CreateApiKeyData, ApiKeyResponse } from './types';

const KEY_PREFIX = 'mk_live_';
const KEY_LENGTH = 32;

/** Hash an API key using SHA-256 for secure storage */
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Generate a new random API key */
function generateKey(): string {
  const bytes = randomBytes(KEY_LENGTH);
  return KEY_PREFIX + bytes.toString('hex');
}

/** Extract the display prefix (first 8 chars after prefix) for identification */
function extractPrefix(fullKey: string): string {
  return fullKey.substring(KEY_PREFIX.length, KEY_PREFIX.length + 8);
}

/**
 * Create a new API key. The full key is returned ONLY in this response.
 *
 * @param data - API key creation payload
 * @returns The created key record with the full plaintext key
 */
export async function createApiKey(data: CreateApiKeyData): Promise<ApiKeyResponse> {
  const fullKey = generateKey();
  const prefix = extractPrefix(fullKey);
  const keyHash = hashKey(fullKey);

  const record = await db.apiKey.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      prefix,
      keyHash,
      expiresAt: data.expiresAt ?? null,
      status: 'active',
    },
  });

  return {
    id: record.id,
    name: record.name,
    prefix,
    key: fullKey,
    status: record.status,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  };
}

/**
 * Verify an API key by hashing the provided key and matching against stored hash.
 * Also checks expiration and updates lastUsedAt.
 *
 * @param fullKey - The full API key provided by the client
 * @param organizationId - The organization scope
 * @returns The API key record if valid, null otherwise
 */
export async function verifyApiKey(
  fullKey: string,
  organizationId: string,
) {
  const keyHash = hashKey(fullKey);
  const prefix = extractPrefix(fullKey);

  const record = await db.apiKey.findUnique({
    where: { organizationId_prefix: { organizationId, prefix } },
  });

  if (!record) return null;
  if (record.status !== 'active') return null;
  if (record.keyHash !== keyHash) return null;
  if (record.expiresAt && record.expiresAt < new Date()) {
    await db.apiKey.update({ where: { id: record.id }, data: { status: 'expired' } });
    return null;
  }

  // Update last used timestamp (fire-and-forget)
  db.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return record;
}

/**
 * List API keys for an organization (never returns the key hash).
 *
 * @param organizationId - The organization to list keys for
 * @returns Array of API key records (without keyHash)
 */
export async function listApiKeys(organizationId: string) {
  return db.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      prefix: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Revoke an API key.
 *
 * @param id - The API key ID
 * @param organizationId - Organization scope
 * @returns The revoked key record
 */
export async function revokeApiKey(id: string, organizationId: string) {
  const existing = await db.apiKey.findUnique({
    where: { id, organizationId },
  });
  if (!existing) throw new Error(`API key ${id} not found`);
  if (existing.status === 'revoked') throw new Error(`API key ${id} is already revoked`);

  return db.apiKey.update({
    where: { id },
    data: { status: 'revoked' },
  });
}

export { hashKey, generateKey, extractPrefix, KEY_PREFIX };
