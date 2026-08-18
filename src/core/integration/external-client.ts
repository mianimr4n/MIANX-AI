/**
 * @module core/integration/external-client
 * Utility for making authenticated HTTP requests to external APIs.
 * Supports both OAuth-based and API key-based authentication.
 */

import { db } from '@/lib/db';
import type { OAuthProviderType, ExternalApiRequest, ExternalApiResponse } from './types';
import { getOAuthConnection } from './oauth';

/**
 * Make an authenticated request to an external API using a stored OAuth connection.
 *
 * @param organizationId - The organization's OAuth connection to use
 * @param provider - The OAuth provider to authenticate with
 * @param request - The HTTP request configuration
 * @returns The response data, status, and headers
 */
export async function fetchWithOAuth<T = unknown>(
  organizationId: string,
  provider: OAuthProviderType,
  request: ExternalApiRequest,
): Promise<ExternalApiResponse<T>> {
  // Find the most recent active connection for this provider
  const connections = await db.oAuthConnection.findMany({
    where: { organizationId, provider, status: 'active' },
    orderBy: { updatedAt: 'desc' },
    take: 1,
  });

  if (connections.length === 0) {
    throw new Error(`No active ${provider} OAuth connection found for organization ${organizationId}`);
  }

  const connection = connections[0];

  // Check token expiry
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
    throw new Error(`OAuth token for ${provider} has expired. Refresh required.`);
  }

  // Update lastUsedAt
  db.oAuthConnection.update({
    where: { id: connection.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${connection.accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mianx.ai-ExternalClient/1.0',
    ...request.headers,
  };

  const response = await fetch(request.url, {
    method: request.method,
    headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
    signal: AbortSignal.timeout(request.timeoutMs ?? 30_000),
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let data: T;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await response.json() as T;
  } else {
    data = await response.text() as unknown as T;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    headers: responseHeaders,
  };
}

/**
 * Make a simple authenticated request using a raw Bearer token.
 * Useful for ad-hoc external API calls.
 */
export async function fetchWithBearerToken<T = unknown>(
  request: ExternalApiRequest,
  token: string,
): Promise<ExternalApiResponse<T>> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mianx.ai-ExternalClient/1.0',
    ...request.headers,
  };

  const response = await fetch(request.url, {
    method: request.method,
    headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
    signal: AbortSignal.timeout(request.timeoutMs ?? 30_000),
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let data: T;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await response.json() as T;
  } else {
    data = await response.text() as unknown as T;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    headers: responseHeaders,
  };
}
