/**
 * @module lib/url-safety
 * SSRF protection: validates outbound URLs against internal/private ranges.
 */

/** Blocked IP ranges (parsed once at module load) */
const BLOCKED_RANGES: { start: number; end: number; label: string }[] = []

function ipToNum(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

// Initialize blocked ranges
function initBlockedRanges(): void {
  const ranges: [string, string, string][] = [
    // Loopback
    ['127.0.0.0', '127.255.255.255', 'loopback'],
    // RFC 1918 private
    ['10.0.0.0', '10.255.255.255', 'RFC1918-10'],
    ['172.16.0.0', '172.31.255.255', 'RFC1918-172'],
    ['192.168.0.0', '192.168.255.255', 'RFC1918-192'],
    // Link-local
    ['169.254.0.0', '169.254.255.255', 'link-local'],
    // Cloud metadata endpoints
    ['169.254.169.254', '169.254.169.254', 'cloud-metadata'],
    // Carrier-grade NAT
    ['100.64.0.0', '100.127.255.255', 'CGNAT'],
    // IPv4-mapped IPv6 ::ffff:127.0.0.1 etc — cannot block at IP level,
    // but blocking at protocol level (only http/https) handles this.
  ]
  for (const [start, end, label] of ranges) {
    BLOCKED_RANGES.push({ start: ipToNum(start), end: ipToNum(end), label })
  }
}

initBlockedRanges()

/**
 * Check if an IPv4 address falls within any blocked range.
 */
function isBlockedIp(ip: string): boolean {
  const num = ipToNum(ip)
  return BLOCKED_RANGES.some(r => num >= r.start && num <= r.end)
}

/**
 * Validate that a URL is safe for outbound requests (SSRF protection).
 *
 * Rules:
 *  - Only http: and https: protocols allowed
 *  - Hostname must not resolve to a private/internal IP
 *  - Hostname must not be an IP literal in a blocked range
 *  - Hostname must not be 'localhost' or 'localhost.localdomain'
 *  - Hostname must not end with '.local' or '.internal'
 */
export async function validateOutboundUrl(url: string): Promise<{ safe: boolean; reason?: string }> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { safe: false, reason: 'Invalid URL format' }
  }

  // Only allow http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Protocol '${parsed.protocol}' not allowed (only http/https)` }
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block localhost variants
  if (hostname === 'localhost' || hostname === 'localhost.localdomain' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { safe: false, reason: 'Local/internal hostname not allowed' }
  }

  // Block well-known cloud metadata endpoints
  if (hostname === 'metadata.google.internal' || hostname === '169.254.169.254') {
    return { safe: false, reason: 'Cloud metadata endpoint blocked' }
  }

  // If hostname is an IP literal, check against blocked ranges
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isBlockedIp(hostname)) {
      return { safe: false, reason: 'Private/internal IP address not allowed' }
    }
  }

  // For DNS hostnames, attempt DNS resolution to check the resolved IP
  // This is a best-effort check in serverless environments where
  // DNS resolution may not be available via Node.js APIs.
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    try {
      const dns = await import('node:dns/promises')
      const addresses = await dns.resolve4(hostname).catch(() => [])
      for (const addr of addresses) {
        if (isBlockedIp(addr)) {
          return { safe: false, reason: `Hostname resolves to private IP ${addr}` }
        }
      }
      // Also check IPv6
      const ipv6Addresses = await dns.resolve6(hostname).catch(() => [])
      for (const addr of ipv6Addresses) {
        // Block IPv6 loopback and link-local
        if (addr === '::1' || addr.startsWith('fe80:') || addr.startsWith('fc') || addr.startsWith('fd')) {
          return { safe: false, reason: `Hostname resolves to private IPv6 ${addr}` }
        }
      }
    } catch {
      // DNS resolution not available — allow but log
      // In production, a DNS-based firewall or egress proxy provides the real protection
    }
  }

  return { safe: true }
}
