/**
 * @module core/integration/types
 * Type definitions for the API & Integration module.
 * Covers API keys, webhooks, OAuth connections, and external API clients.
 */

// ── API Key Types ─────────────────────────────────────────────

export interface CreateApiKeyData {
  organizationId: string;
  name: string;
  expiresAt?: Date;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  key: string;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
}

// ── Webhook Types ─────────────────────────────────────────────

export interface CreateWebhookData {
  organizationId: string;
  name: string;
  url: string;
  eventTypes: string[];
  secret?: string;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  eventTypes?: string[];
  secret?: string;
  status?: 'active' | 'disabled';
}

export interface WebhookPayload {
  id: string;
  eventType: string;
  eventVersion: string;
  organizationId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ── OAuth Types ───────────────────────────────────────────────

export type OAuthProviderType = 'google' | 'github' | 'stripe' | 'custom';

export interface OAuthConfig {
  provider: OAuthProviderType;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
}

export interface StoreOAuthData {
  organizationId: string;
  provider: OAuthProviderType;
  externalAccountId?: string;
  externalAccountName?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface OAuthConnectionInfo {
  id: string;
  provider: OAuthProviderType;
  externalAccountId: string | null;
  externalAccountName: string | null;
  status: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

// ── External API Types ─────────────────────────────────────────

export interface ExternalApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface ExternalApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  headers: Record<string, string>;
}

// ── Pagination ───────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
