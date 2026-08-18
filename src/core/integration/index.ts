/**
 * @module core/integration
 * Barrel export for the API & Integration module.
 * Provides API key management, webhook delivery, OAuth connections,
 * and external API client utilities.
 */

// ── Types ─────────────────────────────────────────────────────
export type {
  ApiKeyResponse,
  CreateApiKeyData,
  CreateWebhookData,
  ExternalApiRequest,
  ExternalApiResponse,
  OAuthConfig,
  OAuthConnectionInfo,
  OAuthProviderType,
  PaginatedResult,
  StoreOAuthData,
  UpdateWebhookData,
  WebhookPayload,
} from './types';

// ── API Keys ───────────────────────────────────────────────────
export {
  createApiKey,
  verifyApiKey,
  listApiKeys,
  revokeApiKey,
} from './api-keys';

// ── Webhooks ─────────────────────────────────────────────────
export {
  createWebhook,
  listWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  testWebhook,
  generateWebhookSecret,
  signPayload,
  initWebhookBridge,
} from './webhooks';

// ── OAuth ──────────────────────────────────────────────────────
export {
  getProviderConfig,
  listProviders,
  storeOAuthConnection,
  listOAuthConnections,
  getOAuthConnection,
  revokeOAuthConnection,
  refreshOAuthToken,
} from './oauth';

// ── External Client ───────────────────────────────────────────
export {
  fetchWithOAuth,
  fetchWithBearerToken,
} from './external-client';
