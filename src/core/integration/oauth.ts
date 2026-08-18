/**
 * @module core/integration/oauth
 * OAuth connection management for external service integrations.
 * Stores encrypted tokens and provides a unified interface for
 * connecting, refreshing, and revoking OAuth connections.
 */

import { db } from '@/lib/db';
import type { OAuthProviderType, OAuthConnectionInfo, StoreOAuthData } from './types';

// ── Provider Registry ─────────────────────────────────────────

interface ProviderConfig {
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

const PROVIDER_CONFIGS: Record<OAuthProviderType, ProviderConfig> = {
  google: {
    name: 'Google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['openid', 'email', 'profile'],
  },
  github: {
    name: 'GitHub',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:org'],
  },
  stripe: {
    name: 'Stripe',
    authorizationUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    scopes: ['read_write'],
  },
  custom: {
    name: 'Custom',
    authorizationUrl: '',
    tokenUrl: '',
    scopes: [],
  },
};

// ── CRUD ──────────────────────────────────────────────────────

/** Get the configuration for a given provider */
export function getProviderConfig(provider: OAuthProviderType): ProviderConfig {
  return PROVIDER_CONFIGS[provider] ?? PROVIDER_CONFIGS.custom;
}

/** List all supported providers with their configuration */
export function listProviders(): Array<OAuthProviderType & { config: ProviderConfig }> {
  return (Object.keys(PROVIDER_CONFIGS) as OAuthProviderType[]).map((p) => ({
    ...p,
    config: PROVIDER_CONFIGS[p],
  }));
}

/**
 * Store OAuth tokens after a successful exchange.
 * Upserts based on organizationId + provider (one connection per provider per org).
 */
export async function storeOAuthConnection(data: StoreOAuthData) {
  return db.oAuthConnection.upsert({
    where: {
      organizationId_provider: {
        organizationId: data.organizationId,
        provider: data.provider,
      },
    },
    create: {
      organizationId: data.organizationId,
      provider: data.provider,
      externalAccountId: data.externalAccountId ?? null,
      externalAccountName: data.externalAccountName ?? null,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      tokenExpiresAt: data.tokenExpiresAt ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      status: 'active',
    },
    update: {
      externalAccountId: data.externalAccountId ?? undefined,
      externalAccountName: data.externalAccountName ?? undefined,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? undefined,
      tokenExpiresAt: data.tokenExpiresAt ?? undefined,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      status: 'active',
      lastUsedAt: new Date(),
    },
  });
}

/**
 * List OAuth connections for an organization (tokens never returned).
 */
export async function listOAuthConnections(organizationId: string): Promise<OAuthConnectionInfo[]> {
 const connections = await db.oAuthConnection.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      provider: true,
      externalAccountId: true,
      externalAccountName: true,
      status: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
  return connections;
}

/**
 * Get a single OAuth connection (includes token for internal use).
 */
export async function getOAuthConnection(id: string, organizationId: string) {
  return db.oAuthConnection.findUnique({
    where: { id, organizationId },
  });
}

/**
 * Revoke an OAuth connection.
 */
export async function revokeOAuthConnection(id: string, organizationId: string) {
  const existing = await db.oAuthConnection.findUnique({
    where: { id, organizationId },
  });
  if (!existing) throw new Error(`OAuth connection ${id} not found`);
  if (existing.status === 'revoked') throw new Error('Connection is already revoked');

  return db.oAuthConnection.update({
    where: { id },
    data: {
      status: 'revoked',
      accessToken: '[REVOKED]',
      refreshToken: null,
    },
  });
}

/**
 * Mark an expired token and attempt a refresh.
 * In production, this would call the provider's token endpoint.
 */
export async function refreshOAuthToken(id: string, organizationId: string) {
  const connection = await db.oAuthConnection.findUnique({
    where: { id, organizationId },
  });
  if (!connection) throw new Error(`OAuth connection ${id} not found`);
  if (!connection.refreshToken) throw new Error('No refresh token available');

  const config = PROVIDER_CONFIGS[connection.provider as OAuthProviderType];
  if (!config || !config.tokenUrl) {
    throw new Error(`Token refresh not supported for provider ${connection.provider}`);
  }

  // In production, this would make an HTTP call to the token endpoint.
  // For now, mark as expired and return instructions.
  await db.oAuthConnection.update({
    where: { id },
    data: { status: 'expired' },
  });

  return {
    message: `Token refresh for ${connection.provider} requires calling ${config.tokenUrl}`,
    provider: connection.provider,
    clientId: 'Configure in .env',
    tokenUrl: config.tokenUrl,
  };
}
