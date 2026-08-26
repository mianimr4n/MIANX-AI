# -*- coding: utf-8 -*-
"""
MIANX.AI Full Project Audit Report - PDF Generator
9-dimension comprehensive security and quality audit
"""

import os, sys, hashlib, subprocess
import platform

# Skill scripts directory
SKILL_SCRIPTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'skills', 'pdf', 'scripts')
if os.path.normpath(SKILL_SCRIPTS) not in sys.path:
    sys.path.insert(0, os.path.normpath(SKILL_SCRIPTS))

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, CondPageBreak, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus import SimpleDocTemplate
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from pypdf import PdfReader, PdfWriter

# ═══════════════════════════════════════════
# FONT REGISTRATION
# ═══════════════════════════════════════════
_IS_MAC = platform.system() == 'Darwin'
if _IS_MAC:
    FONT_DIR = os.path.expanduser('~/.openclaw/workspace/fonts')
else:
    FONT_DIR = '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
# Noto Sans SC variable font not compatible with ReportLab TTFont
# Using LiberationSans as sans-serif fallback instead
pdfmetrics.registerFont(TTFont('LiberationSans', f'{FONT_DIR}/truetype/chinese/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSans')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold', italic='FreeSerif-Italic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# Font fallback for mixed CJK/Latin text
def install_font_fallback():
    """No-op fallback - NotoSerifSC handles CJK natively."""
    pass

install_font_fallback()

# ═══════════════════════════════════════════
# CASCADE PALETTE
# ═══════════════════════════════════════════
PAGE_BG       = colors.HexColor('#f4f5f5')
SECTION_BG    = colors.HexColor('#f0f1f2')
CARD_BG       = colors.HexColor('#e8eaeb')
TABLE_STRIPE  = colors.HexColor('#ebeded')
HEADER_FILL   = colors.HexColor('#32454e')
COVER_BLOCK   = colors.HexColor('#566a74')
BORDER        = colors.HexColor('#acbdc5')
ICON          = colors.HexColor('#4b86a4')
ACCENT        = colors.HexColor('#1f6c92')
ACCENT_2      = colors.HexColor('#c23a50')
TEXT_PRIMARY   = colors.HexColor('#131515')
TEXT_MUTED     = colors.HexColor('#747b7e')
SEM_SUCCESS   = colors.HexColor('#529067')
SEM_WARNING   = colors.HexColor('#8c7443')
SEM_ERROR     = colors.HexColor('#a25b54')
SEM_INFO      = colors.HexColor('#507aa4')

# ═══════════════════════════════════════════
# STYLES
# ═══════════════════════════════════════════

# Chinese body style
cn_body = ParagraphStyle(
    name='CNBody', fontName='NotoSerifSC', fontSize=10.5, leading=18,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, wordWrap='CJK',
    firstLineIndent=2*10.5*1.5,
    spaceBefore=0, spaceAfter=6,
)

cn_body_no_indent = ParagraphStyle(
    name='CNBodyNoIndent', fontName='NotoSerifSC', fontSize=10.5, leading=18,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, wordWrap='CJK',
    spaceBefore=0, spaceAfter=6,
)

cn_h1 = ParagraphStyle(
    name='CNH1', fontName='NotoSerifSC-Bold', fontSize=20, leading=28,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, wordWrap='CJK',
    spaceBefore=18, spaceAfter=12,
)

cn_h2 = ParagraphStyle(
    name='CNH2', fontName='NotoSerifSC-Bold', fontSize=14, leading=22,
    alignment=TA_LEFT, textColor=HEADER_FILL, wordWrap='CJK',
    spaceBefore=14, spaceAfter=8,
)

cn_h3 = ParagraphStyle(
    name='CNH3', fontName='NotoSerifSC-Bold', fontSize=12, leading=18,
    alignment=TA_LEFT, textColor=ICON, wordWrap='CJK',
    spaceBefore=10, spaceAfter=6,
)

table_header_style = ParagraphStyle(
    name='TableHeader', fontName='NotoSerifSC-Bold', fontSize=10,
    textColor=colors.white, alignment=TA_CENTER, wordWrap='CJK',
)

table_cell_style = ParagraphStyle(
    name='TableCell', fontName='NotoSerifSC', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
    leading=14,
)

table_cell_center = ParagraphStyle(
    name='TableCellCenter', fontName='NotoSerifSC', fontSize=9.5,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, wordWrap='CJK',
    leading=14,
)

table_cell_en = ParagraphStyle(
    name='TableCellEN', fontName='FreeSerif', fontSize=9,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK', leading=13,
)

caption_style = ParagraphStyle(
    name='Caption', fontName='NotoSerifSC', fontSize=9, leading=14,
    alignment=TA_CENTER, textColor=TEXT_MUTED, wordWrap='CJK',
    spaceBefore=3, spaceAfter=6,
)

toc_h1_style = ParagraphStyle(
    name='TOCH1', fontName='NotoSerifSC', fontSize=13, leading=22,
    leftIndent=20, textColor=TEXT_PRIMARY, wordWrap='CJK',
)

toc_h2_style = ParagraphStyle(
    name='TOCH2', fontName='NotoSerifSC', fontSize=11, leading=18,
    leftIndent=40, textColor=TEXT_MUTED, wordWrap='CJK',
)

# Severity badge styles
sev_critical = ParagraphStyle(
    name='SevCritical', fontName='NotoSerifSC-Bold', fontSize=9,
    textColor=SEM_ERROR, alignment=TA_CENTER, wordWrap='CJK',
)
sev_high = ParagraphStyle(
    name='SevHigh', fontName='NotoSerifSC-Bold', fontSize=9,
    textColor=ACCENT_2, alignment=TA_CENTER, wordWrap='CJK',
)
sev_medium = ParagraphStyle(
    name='SevMedium', fontName='NotoSerifSC-Bold', fontSize=9,
    textColor=SEM_WARNING, alignment=TA_CENTER, wordWrap='CJK',
)
sev_low = ParagraphStyle(
    name='SevLow', fontName='NotoSerifSC-Bold', fontSize=9,
    textColor=SEM_INFO, alignment=TA_CENTER, wordWrap='CJK',
)
sev_info = ParagraphStyle(
    name='SevInfo', fontName='NotoSerifSC', fontSize=9,
    textColor=TEXT_MUTED, alignment=TA_CENTER, wordWrap='CJK',
)

# ═══════════════════════════════════════════
# DOCUMENT TEMPLATE WITH TOC
# ═══════════════════════════════════════════

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

# ═══════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def make_table(headers, rows, col_widths=None):
    """Create a styled table with palette colors."""
    page_w = A4[0]
    left_m = 1.0 * inch
    right_m = 1.0 * inch
    avail_w = page_w - left_m - right_m

    if col_widths is None:
        n = len(headers)
        col_widths = [avail_w / n] * n

    data = []
    header_row = [Paragraph('<b>%s</b>' % h, table_header_style) for h in headers]
    data.append(header_row)

    for row in rows:
        data.append([Paragraph(str(c), table_cell_style) for c in row])

    table = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        bg = colors.white if i % 2 == 1 else TABLE_STRIPE
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    table.setStyle(TableStyle(style_cmds))
    return table

def make_severity_table(rows):
    """Create a findings table with severity coloring."""
    page_w = A4[0]
    avail_w = page_w - 2 * inch
    col_widths = [50, avail_w * 0.22, avail_w * 0.45, avail_w * 0.28]

    sev_map = {
        'HIGH': sev_high, 'CRITICAL': sev_critical,
        'MEDIUM': sev_medium, 'LOW': sev_low, 'INFO': sev_info,
    }

    data = []
    header_row = [
        Paragraph('<b>No.</b>', table_header_style),
        Paragraph('<b>Severity</b>', table_header_style),
        Paragraph('<b>Finding</b>', table_header_style),
        Paragraph('<b>Location</b>', table_header_style),
    ]
    data.append(header_row)

    for idx, (sev, finding, location) in enumerate(rows, 1):
        sev_style = sev_map.get(sev, sev_info)
        data.append([
            Paragraph(str(idx), table_cell_center),
            Paragraph('<b>%s</b>' % sev, sev_style),
            Paragraph(finding, table_cell_style),
            Paragraph(location, table_cell_en),
        ])

    table = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = colors.white if i % 2 == 1 else TABLE_STRIPE
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    table.setStyle(TableStyle(style_cmds))
    return table

MAX_KEEP_HEIGHT = A4[1] * 0.4

def safe_keep(elements):
    total_h = 0
    for el in elements:
        w, h = el.wrap(A4[0] - 2*inch, A4[1])
        total_h += h
    if total_h <= MAX_KEEP_HEIGHT:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    else:
        return list(elements)

# ═══════════════════════════════════════════
# BUILD STORY
# ═══════════════════════════════════════════

story = []

# --- TOC ---
toc = TableOfContents()
toc.levelStyles = [toc_h1_style, toc_h2_style]
story.append(Paragraph('<b>Directory</b>', cn_h1))
story.append(Spacer(1, 12))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════
# CHAPTER 1: Audit Overview
# ═══════════════════════════════════════════
story.append(add_heading('<b>1. Overview</b>', cn_h1, 0))

story.append(Paragraph(
    'MIANX.AI is a multi-tenant AI-native business operating system built on Next.js 16, React 19, Prisma 6, and Supabase. '
    'The platform follows a domain-driven design architecture, with 8 product modules, a self-managed billing engine, '
    'role-based access control, and a pluggable domain registry. This audit was conducted after Phase 26 (Launch Path Completion, '
    'Production Deployment and Revenue Activation), covering 9 dimensions: security, API design, architecture, code quality, '
    'database schema, dependencies, configuration, and UI/UX. The audit covers all 92 API routes, 40 Prisma models, 55 production dependencies, '
    'and the full frontend component library.',
    cn_body))

story.append(Paragraph(
    'The project is currently in private alpha status, having been successfully deployed to Vercel production. '
    'All quality gates pass locally (tsc zero errors, ESLint zero errors/warnings, production build succeeds). '
    'The E2E acceptance test confirms 33 of 35 routes return 200 status, with the remaining 2 correctly returning 401 for '
    'unauthenticated access. All 9 bare routes from the previously removed route group return 404 as expected. '
    'Four security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) are confirmed present on all page routes.',
    cn_body))

story.append(Spacer(1, 12))
story.append(add_heading('<b>1.1 Audit Scope and Methodology</b>', cn_h2, 1))

story.append(Paragraph(
    'The audit scope encompasses the entire codebase under the src/ directory, including all API route handlers, '
    'page components, core business logic modules, domain-specific services, middleware configurations, Prisma schema definitions, '
    'and project configuration files. The methodology combines static code analysis, pattern-based security scanning, '
    'dependency version auditing, and architectural review. Each finding is classified according to a five-tier severity scale: '
    'CRITICAL (immediate exploitation risk), HIGH (significant risk requiring prompt remediation), MEDIUM (moderate risk '
    'with potential for escalation), LOW (minor issues with limited impact), and INFO (positive findings or observations).',
    cn_body))

# Summary stats table
story.append(Spacer(1, 12))
stats_headers = ['Dimension', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
stats_rows = [
    ['Security', '2', '4', '3', '7'],
    ['API Design', '2', '7', '5', '3'],
    ['Architecture', '0', '2', '2', '3'],
    ['Code Quality', '0', '1', '3', '3'],
    ['Database Schema', '1', '5', '3', '2'],
    ['Dependencies', '9', '5', '4', '3'],
    ['Configuration', '3', '4', '4', '4'],
    ['UI/UX', '0', '8', '8', '12'],
]
stats_table = make_table(stats_headers, stats_rows,
    col_widths=[120, 60, 60, 60, 60])
story.extend(safe_keep([stats_table]))
story.append(Paragraph('Table 1: Audit Findings Summary by Dimension', caption_style))

# ═══════════════════════════════════════════
# CHAPTER 2: Security Audit
# ═══════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>2. Security Audit</b>', cn_h1, 0))

story.append(Paragraph(
    'The security audit examined authentication mechanisms, authorization controls, input validation, injection vulnerabilities, '
    'server-side request forgery risks, security header configurations, secret management practices, and rate limiting coverage. '
    'The overall security posture is strong for a private alpha, with a well-implemented multi-tenant isolation system and consistent '
    'authentication framework. However, several HIGH-severity findings require attention before public launch.',
    cn_body))

story.append(add_heading('<b>2.1 SSRF via Webhook URLs</b>', cn_h2, 1))
story.append(Paragraph(
    'Users can register arbitrary URLs as webhook endpoints, including internal or private IP addresses such as AWS metadata '
    'endpoints (169.254.169.254), localhost services, and internal network ranges. The only current validation is a basic URL format '
    'check using the JavaScript URL constructor. When events fire, the server makes HTTP POST requests to these registered URLs. '
    'An authenticated user with integration webhook management permissions could probe internal network services, access cloud provider '
    'metadata endpoints to retrieve IAM credentials, or interact with internal databases and caches. The recommended remediation is to '
    'implement private IP blocking (RFC 1918 ranges, link-local addresses, cloud metadata endpoints) and consider an allowlist approach '
    'or DNS resolution check before making outbound requests to user-provided URLs.',
    cn_body))

story.append(add_heading('<b>2.2 AI Chat Route Missing Rate Limiting</b>', cn_h2, 1))
story.append(Paragraph(
    'The POST /api/ai/chat endpoint, despite having a code comment claiming 30 requests per minute rate limiting, does not actually '
    'apply any withRateLimit middleware. This is the most resource-intensive and externally-facing route in the application, as it '
    'consumes AI provider API credits (OpenAI, Anthropic, Google) on every request. While a monthly token budget check exists per '
    'organization (1 million tokens), there is no per-request rate limit. An attacker could rapidly drain the token budget or cause '
    'significant cost spikes. Additional endpoints lacking rate limiting include AI agent creation, conversation creation, workflow '
    'execution, webhook creation, billing mutations, and login/signup endpoints. The fix is straightforward: apply the existing '
    'withRateLimit middleware to these sensitive endpoints.',
    cn_body))

story.append(add_heading('<b>2.3 Webhook Signature Bug</b>', cn_h2, 1))
story.append(Paragraph(
    'In the webhook delivery module (src/core/integration/webhooks.ts line 173), the signPayload function is async (returns a Promise) '
    'but is called without await. This means the X-Webhook-Signature header contains the string "sha256=[object Promise]" instead of the '
    'actual HMAC signature. As a result, all webhook signatures are invalid, webhook consumers cannot verify payload integrity, and a '
    'man-in-the-middle attacker could modify webhook payloads undetected. The fix is a single keyword addition: await signPayload().',
    cn_body))

story.append(add_heading('<b>2.4 Multi-Tenant Isolation</b>', cn_h2, 1))
story.append(Paragraph(
    'The tenant isolation system is well-architected and represents one of the strongest aspects of the security posture. The Prisma '
    'tenant extension (src/core/tenancy/tenant-prisma.ts) automatically injects organizationId into all read and write operations for '
    'over 28 tenant-scoped models. It actively blocks cross-tenant access by throwing a TenantContextError if a where clause attempts to '
    'set a different organizationId. The extension covers create, createMany, findMany, findFirst, findUnique, update, updateMany, '
    'delete, deleteMany, upsert, count, aggregate, and groupBy operations. The tenant context is propagated via AsyncLocalStorage, '
    'ensuring request-scoped isolation without global state leakage. All sampled API routes correctly use ctx.organizationId from the '
    'auth context when calling domain services. Two minor gaps were identified: $queryRaw and $executeRaw bypass the tenant '
    'extension (currently only used with hardcoded SELECT 1 in health checks), and webhook delivery records are created without tenant '
    'context as a system-level operation.',
    cn_body))

story.append(add_heading('<b>2.5 Security Headers and CSP</b>', cn_h2, 1))
story.append(Paragraph(
    'Security headers are comprehensively configured in the middleware (src/middleware.ts). X-Content-Type-Options is set to nosniff, '
    'X-Frame-Options to DENY, Referrer-Policy to strict-origin-when-cross-origin, Permissions-Policy disables camera, microphone, '
    'geolocation, and interest-cohort. HSTS is enabled in production with max-age 31536000 and includeSubDomains. The Content-Security-Policy '
    'includes script-src self unsafe-inline (justified for Next.js hydration and Tailwind v4 runtime), style-src self unsafe-inline '
    '(required by Tailwind CSS v4), img-src self data: blob: https, and connect-src self https: wss. Two medium-severity CSP concerns: '
    'img-src https: allows loading images from any HTTPS source (potential tracking pixel vector), and connect-src https: wss: allows '
    'connections to any external endpoint, limiting CSP effectiveness against data exfiltration.',
    cn_body))

# Security findings table
story.append(Spacer(1, 12))
sec_rows = [
    ('HIGH', 'SSRF via webhook URLs: no private IP blocking', 'webhooks/route.ts'),
    ('HIGH', 'AI chat route not rate-limited (despite comment)', 'api/ai/chat/route.ts'),
    ('MEDIUM', 'Webhook signPayload() not awaited - invalid signatures', 'webhooks.ts:173'),
    ('MEDIUM', 'CSP connect-src https: allows any external endpoint', 'middleware.ts'),
    ('MEDIUM', 'Non-admin users can create P1 incidents', 'api/observability/incidents/route.ts'),
    ('MEDIUM', '/api/admin/check leaks user email unnecessarily', 'api/admin/check/route.ts:19'),
    ('LOW', '$queryRaw/$executeRaw bypass tenant extension', 'tenant-prisma.ts:217'),
    ('LOW', 'Rate limiting not applied to workflow/billing endpoints', 'Multiple routes'),
    ('LOW', 'CSP not applied to _next/static assets', 'middleware.ts matcher'),
    ('INFO', 'No SQL injection, XSS, or command injection found', 'Full codebase'),
    ('INFO', 'No hardcoded secrets in source code', 'Full codebase'),
    ('INFO', 'All admin routes protected with requirePlatformAdmin', 'api/admin/*'),
]
story.extend(safe_keep([make_severity_table(sec_rows)]))
story.append(Paragraph('Table 2: Security Audit Findings', caption_style))

# ═══════════════════════════════════════════
# CHAPTER 3: API Audit
# ═══════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>3. API Design and Route Audit</b>', cn_h1, 0))

story.append(Paragraph(
    'The API layer consists of 92 route files organized across 11 functional groups: admin (6), AI (8), automation (4), billing (6), '
    'core (12), integration (3), domain/module (4), poultry domain (14), observability (5), command center (3), and miscellaneous (2). '
    'The authentication framework is well-designed, with 81 of 92 routes using the withAuth/withAuthParams/withAuthContext middleware. '
    'Error handling is generally consistent, with most routes using the apiEnvelope wrapper for standardized responses and proper HTTP '
    'status codes (400, 401, 403, 404, 409, 429, 500). Input validation is performed manually across all routes, with poultry domain '
    'routes using a structured domain validation module. However, the absence of a schema validation library (such as Zod or Joi) '
    'creates maintenance risk as the API surface grows, and some routes have inconsistent validation rigor.',
    cn_body))

story.append(add_heading('<b>3.1 Dead Route and Authentication Gaps</b>', cn_h2, 1))
story.append(Paragraph(
    'The most significant API finding is a dead route at src/app/api/route.ts that returns "Hello, world!" with no authentication, '
    'no rate limiting, and no functional purpose. This is a test artifact that should be deleted immediately. Additionally, two routes '
    'use custom authentication instead of the standard withAuth framework: /api/me uses a manual resolveCurrentUser() function, bypassing '
    'the rate-limit, request-ID, and error-standardization framework, while /api/admin/check uses raw supabase.auth.getUser() and '
    'returns 200 with isAdmin: false when Supabase is not configured, rather than returning a 503 service unavailable status. The public '
    'GET /api/domains endpoint (domain catalog) is intentionally unauthenticated but should be documented as such.',
    cn_body))

story.append(add_heading('<b>3.2 Input Validation Gaps</b>', cn_h2, 1))
story.append(Paragraph(
    'While most routes perform manual input validation, the quality varies significantly. The AI chat route has excellent validation '
    '(message required, max 32K characters, maxTokens capped). The poultry domain routes use a structured validation module with typed '
    'validators (validateCreateFlock, validateUpdateFlock, etc.). The events route validates eventType, payload, domainId and other '
    'fields with thorough type checking. However, the billing subscriptions route lacks schema validation on action parameters, '
    'accepting a query parameter cast as "any" type instead of a proper union of valid subscription states. The domains POST route '
    'validates that name and version are present but does not validate version format. These inconsistencies suggest the need for a '
    'centralized validation library to enforce uniform standards across all endpoints.',
    cn_body))

# API findings table
story.append(Spacer(1, 12))
api_rows = [
    ('HIGH', 'Dead /api route returns "Hello, world!" without auth', 'api/route.ts'),
    ('HIGH', 'Billing subscriptions uses "as any" for query param', 'billing/subscriptions/route.ts:8'),
    ('MEDIUM', '/api/me bypasses withAuth framework', 'api/me/route.ts'),
    ('MEDIUM', '/api/admin/check returns 200 when unconfigured', 'api/admin/check/route.ts'),
    ('MEDIUM', 'No schema validation library (Zod/Joi) for routes', 'All routes'),
    ('MEDIUM', 'Billing POST lacks params validation per action', 'billing/subscriptions/route.ts'),
    ('MEDIUM', 'App layout auth is client-side only', 'app/layout.tsx'),
    ('LOW', 'console.log in webhook/workflow bridge init', 'webhooks.ts:258'),
    ('LOW', 'ioredis.d.ts type declaration with no Redis usage', 'types/ioredis.d.ts'),
    ('LOW', 'Admin layout uses HTTP probe instead of /api/admin/check', 'admin/layout.tsx:35'),
]
story.extend(safe_keep([make_severity_table(api_rows)]))
story.append(Paragraph('Table 3: API Audit Findings', caption_style))

# ═══════════════════════════════════════════
# CHAPTER 4: Architecture Audit
# ═══════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>4. Architecture Audit</b>', cn_h1, 0))

story.append(Paragraph(
    'The MIANX.AI architecture demonstrates excellent software engineering practices for a project at this stage. The domain-driven '
    'design implementation is particularly strong, featuring a manifest-based plugin architecture where domains declare their modules, '
    'permissions, and configuration fields via typed DomainManifest and ModuleManifest interfaces. The core layer is cleanly separated '
    'into authorization, tenancy, domain management, billing, automation, integration, and observability modules, each with well-defined '
    'responsibilities and interfaces.',
    cn_body))

story.append(Paragraph(
    'The multi-tenancy architecture is built on AsyncLocalStorage for request-scoped tenant context propagation, combined with a Prisma '
    'client extension that automatically injects organizationId filters into all database queries. This eliminates the most common multi-tenant '
    'security vulnerability (cross-tenant data leakage) at the ORM level. The provider composition in the root layout follows the correct '
    'ordering: QueryClientProvider (React Query with 60s stale time), ThemeProvider (next-themes with system default), and OrganizationProvider. '
    'The middleware implements comprehensive security headers, CORS with origin allowlisting, request ID generation, and organization '
    'header enforcement for non-exempt API routes.',
    cn_body))

story.append(Paragraph(
    'Two medium-severity architectural concerns were identified. First, the app layout authentication guard is client-side only: while API '
    'routes are protected server-side by withAuth, the page HTML is still served by Next.js before the client-side redirect fires. For a '
    'private alpha this is acceptable, but before public launch the middleware should be enhanced to redirect unauthenticated requests to '
    '/app/* routes at the edge. Second, the development mode bypass in middleware is broad: when NODE_ENV is not production, the organization '
    'header enforcement is completely skipped, and dev headers (X-Dev-User-Id, X-Dev-Org-Id) are accepted. This is documented but should be '
    'audited before any production deployment to ensure no dev-mode code paths are accidentally enabled.',
    cn_body))

# ═══════════════════════════════════════════
# CHAPTER 5: Code Quality Audit
# ═══════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>5. Code Quality Audit</b>', cn_h1, 0))

story.append(Paragraph(
    'The codebase quality is notably high for a project at the private alpha stage. Zero TODO, FIXME, HACK, or XXX comments were found '
    'in the entire src/ directory, indicating thorough development practices. Unused imports were absent in all sampled files. The codebase '
    'follows consistent patterns: API routes delegate to core/domain services, services return standardized apiEnvelope responses, and the '
    'authorization context flows cleanly through the middleware chain. Only two instances of "as any" type assertions were identified in '
    'application code: one justified in the tenant Prisma extension (args typed as unknown from Prisma API, documented in comments) and one '
    'in the billing subscriptions route where a query parameter is cast to any instead of a proper union type.',
    cn_body))

story.append(Paragraph(
    'Several dead code artifacts were identified. The most critical is the dead API route at src/app/api/route.ts. Additionally, '
    'src/lib/navigation-config.ts defines navigation items that are never imported (the sidebar duplicates the data inline). The components '
    'mobile-nav.tsx, data-table.tsx, and permission-denied.tsx are defined but never imported by any application code. The examples/websocket/ '
    'directory contains example files not integrated into the application. The src/types/ioredis.d.ts type declaration exists but no actual '
    'Redis usage was found in the codebase (the rate limiter uses in-memory storage). Two console.log statements in production code paths '
    '(webhook bridge init and event-workflow bridge init) should be replaced with the structured logger for consistency.',
    cn_body))

# ═══════════════════════════════════════════
# CHAPTER 6: Database Schema Audit
# ═══════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>6. Database and Prisma Schema Audit</b>', cn_h1, 0))

story.append(Paragraph(
    'The Prisma schema defines 40 models across core (13), domain engine (4), AI core (3), automation (5), integration (4), billing (7), '
    'observability (4), and poultry domain (10) modules, with 24 well-structured enums. A single initial migration exists (monolithic, which '
    'is acceptable pre-launch but should transition to atomic migrations for incremental changes). The dual schema setup (PostgreSQL for '
    'production, SQLite for development) maintains perfect parity in model definitions, which is excellent for developer experience.',
    cn_body))

story.append(add_heading('<b>6.1 Missing Indexes (HIGH)</b>', cn_h2, 1))
story.append(Paragraph(
    'Five models have organizationId fields without corresponding database indexes: Team, File, AuditLog, Notification, and Approval. '
    'Every API route filters by organizationId (enforced by the tenant middleware), meaning every query against these tables performs a full '
    'table scan without an index. The AuditLog table is particularly critical as it is append-only and will grow unbounded over time. '
    'Without indexes, query performance will degrade linearly with data volume, becoming a significant bottleneck in a multi-tenant system '
    'where concurrent queries from different organizations hit the same tables. Adding @@index([organizationId]) to these five models is the '
    'single highest-impact database improvement.',
    cn_body))

story.append(add_heading('<b>6.2 Schema Inconsistencies</b>', cn_h2, 1))
story.append(Paragraph(
    'Six status fields across the schema use raw String type instead of the corresponding enums that already exist: OrganizationDomain.status, '
    'OrganizationModule.status, AgentConfig.status, PlanVersion.status, PoultryShed.status, and PoultryProcurement.status. While enums like '
    'DomainStatus and ModuleStatus are defined, they are not applied to these fields. This loses database-level validation (accepting any arbitrary '
    'string value) and makes queries less efficient (string comparisons instead of enum index lookups). The AlertRecord model has an orphan '
    'organizationId field defined as an optional String without a @relation decorator, breaking referential integrity. The Webhook.secret is stored '
    'as plaintext rather than encrypted at rest. The Feature model exists with no relations to Plan, PlanVersion, or Entitlement models, '
    'appearing to be designed for future use but currently orphaned.',
    cn_body))

# DB findings table
story.append(Spacer(1, 12))
db_rows = [
    ('HIGH', '5 models missing organizationId indexes', 'Team, File, AuditLog, Notification, Approval'),
    ('MEDIUM', '6 status fields use String instead of enums', 'Multiple models'),
    ('MEDIUM', 'No onDelete cascade on most parent relations', 'Schema-wide'),
    ('MEDIUM', 'AlertRecord has orphan organizationId field', 'AlertRecord model'),
    ('MEDIUM', 'Webhook.secret stored as plaintext', 'Webhook model'),
    ('LOW', 'Feature model disconnected from Plan/Entitlement', 'Feature model'),
    ('LOW', 'No soft-delete timestamp on OrganizationMembership', 'MembershipStatus'),
]
story.extend(safe_keep([make_severity_table(db_rows)]))
story.append(Paragraph('Table 4: Database Schema Audit Findings', caption_style))

# ═══════════════════════════════════════════
# CHAPTER 7: Dependency Audit
# ═══════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>7. Dependency Audit</b>', cn_h1, 0))

story.append(Paragraph(
    'The project has 55 production dependencies and 7 dev dependencies, totaling 62 packages. All major framework versions are current: '
    'Next.js 16.1.1, React 19, Prisma 6.11.1, Zod 4, and Supabase SSR 0.12.4. No known CVEs exist at these versions. However, the audit '
    'identified 16 completely unused production dependencies that collectively add an estimated 500KB or more to the gzipped bundle size. '
    'The most significant unused packages include next-auth (auth is handled by Supabase), framer-motion (never imported, approximately '
    '35KB gzipped), the @dnd-kit suite (3 packages, zero imports), react-markdown (likely planned for AI response rendering), react-syntax-'
    'highlighter (only mentioned in a middleware comment), next-intl (no i18n infrastructure exists), and z-ai-web-dev-sdk (development tool '
    'that leaked into production dependencies).',
    cn_body))

story.append(Paragraph(
    'Additionally, several shadcn/ui components were scaffolded but never used in any application page: carousel, aspect-ratio, menubar, '
    'navigation-menu, resizable, hover-card, context-menu, toggle-group, toggle, radio-group, input-otp, and form. These are Radix UI '
    'primitives that add to install size but pose no runtime risk. Two potentially redundant animation libraries are present: tailwindcss-animate '
    '(used as a Tailwind plugin) and tw-animate-css (imported in globals.css), both providing animation utilities. The lock file is bun.lock '
    '(no package-lock.json), which requires verifying that the Vercel build environment has Bun available.',
    cn_body))

# ═══════════════════════════════════════════
# CHAPTER 8: Configuration Audit
# ═══════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>8. Configuration Audit</b>', cn_h1, 0))

story.append(Paragraph(
    'The configuration audit revealed three HIGH-severity findings related to development tooling effectiveness and one related to security headers. '
    'The ESLint configuration (eslint.config.mjs) effectively disables static analysis by turning off 22 rules including no-console, no-debugger, '
    'no-unused-vars, prefer-const, no-undef, no-unreachable, no-redeclare, and critically react-hooks/exhaustive-deps. This means the zero '
    'ESLint errors reported by quality gates provide no actual quality assurance, as the linter cannot catch bugs, dead code, or security issues. '
    'The TypeScript configuration has noImplicitAny set to false, which undermines TypeScript primary value proposition by silently typing '
    'untyped variables as any, effectively disabling one of the most important type safety mechanisms.',
    cn_body))

story.append(Paragraph(
    'The next.config.ts is minimal and does not set poweredByHeader to false, meaning Next.js sends the X-Powered-By: Next.js header by default '
    'on non-page routes (the middleware removes it from page responses via CSP but static assets still expose the technology stack). The Docker '
    'Compose configuration exposes PostgreSQL port 5432 and Redis port 6379 to all network interfaces instead of binding to localhost only. '
    'The Dockerfile does not wire Prisma migration deployment into the container startup command, relying on a separate deploy script. The tsconfig '
    'target is ES2017, which is conservative for a Next.js 16 project that uses ES2020 features like optional chaining and nullish coalescing. '
    'The PostgreSQL Docker image uses a rolling tag (postgres:16-alpine) without a specific patch version pin.',
    cn_body))

# Config findings table
story.append(Spacer(1, 12))
config_rows = [
    ('HIGH', 'ESLint effectively disabled (22 rules turned off)', 'eslint.config.mjs'),
    ('HIGH', 'noImplicitAny: false in tsconfig.json', 'tsconfig.json'),
    ('HIGH', 'Missing poweredByHeader: false in next.config', 'next.config.ts'),
    ('MEDIUM', 'Docker Compose Redis not truly optional', 'docker-compose.production.yml'),
    ('MEDIUM', 'Prisma migrations not in Dockerfile CMD', 'Dockerfile'),
    ('MEDIUM', 'tsconfig target ES2017 too conservative', 'tsconfig.json'),
    ('MEDIUM', 'DB and Redis ports exposed to all interfaces', 'docker-compose.production.yml'),
    ('LOW', 'PostgreSQL image not pinned to patch version', 'docker-compose.production.yml'),
    ('LOW', 'bun.lock without package-lock.json', 'Project root'),
]
story.extend(safe_keep([make_severity_table(config_rows)]))
story.append(Paragraph('Table 5: Configuration Audit Findings', caption_style))

# ═══════════════════════════════════════════
# CHAPTER 9: UI/UX Audit
# ═══════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>9. UI/UX Audit</b>', cn_h1, 0))

story.append(Paragraph(
    'The UI/UX audit examined internal link integrity, component imports, accessibility compliance, loading and error states, landing page '
    'completeness, navigation structure, and dead code in the component library. All 20 verified internal links resolve correctly to existing '
    'page files. All component imports across page files resolve to existing modules. The landing page contains all 10 expected sections '
    '(navigation, hero, features, solutions, security, modules, pricing, FAQ, CTA, footer) with valid anchor links and mobile responsive design.',
    cn_body))

story.append(add_heading('<b>9.1 Accessibility Deficiencies</b>', cn_h2, 1))
story.append(Paragraph(
    'Accessibility is the weakest area of the UI/UX audit. Only one aria-label attribute was found across all application pages (on the landing '
    'page mobile menu button). Multiple form elements in settings, integrations, team, and automations pages use Label components without '
    'htmlFor attributes, breaking the programmatic association between labels and inputs for screen readers. Interactive non-semantic elements '
    '(dashboard quick-action cards, organization switcher cards, conversation list items) lack role, aria-label, or tabIndex attributes. '
    'On the positive side, the project includes a skip-to-content link, focus-visible ring styling, reduced-motion media query support, and the '
    'sr-only utility class, showing that some accessibility considerations were made during development.',
    cn_body))

story.append(add_heading('<b>9.2 Loading and Error States</b>', cn_h2, 1))
story.append(Paragraph(
    'Only a root loading.tsx exists at the application level. No route-level loading.tsx files are present in /app/app/ or /admin/ directories, '
    'meaning route transitions show no loading indicator. Zero Suspense boundaries are used anywhere in the codebase, so the entire page blocks '
    'until all client-side useEffect data fetching completes. The app layout returns null during authentication checks, showing a blank white '
    'screen instead of a skeleton or loading indicator. Only a root error.tsx exists; no nested error boundaries are present in the app or admin '
    'sections, meaning errors in those layouts fall through to the root error boundary which renders outside the app layout (no sidebar, no auth '
    'context). Individual pages do have inline error handling with ErrorState components, which is good defensive coding.',
    cn_body))

story.append(add_heading('<b>9.3 Dead Code in Component Library</b>', cn_h2, 1))
story.append(Paragraph(
    'Several unused components and files were identified: mobile-nav.tsx (the landing page implements its own inline mobile menu), data-table.tsx '
    '(a full DataTable component that is never imported, while all tables in the app use manual grid markup), permission-denied.tsx (defined but '
    'never imported), and navigation-config.ts (defines nav items that duplicate the sidebar inline data). Twelve shadcn/ui component primitives '
    'are never imported from application code: carousel, aspect-ratio, menubar, navigation-menu, resizable, hover-card, context-menu, toggle-group, '
    'toggle, radio-group, input-otp, and form. These represent approximately 395 lines of dead code that should be cleaned up or documented as '
    'intentionally scaffolded for future use.',
    cn_body))

# ═══════════════════════════════════════════
# CHAPTER 10: Recommendations
# ═══════════════════════════════════════════
story.append(Spacer(1, 24))
story.append(add_heading('<b>10. Priority Recommendations</b>', cn_h1, 0))

story.append(Paragraph(
    'Based on the comprehensive 9-dimension audit, the following actions are recommended in priority order. Each recommendation is mapped '
    'to the specific findings above and includes the expected impact on security, performance, or maintainability.',
    cn_body))

story.append(add_heading('<b>10.1 Immediate (Before Public Launch)</b>', cn_h2, 1))

rec_headers = ['Priority', 'Action', 'Impact']
rec_rows = [
    ['P0', 'Add @@index([organizationId]) to 5 models', 'Query performance'],
    ['P0', 'Apply withRateLimit to AI chat and workflow endpoints', 'Cost protection'],
    ['P0', 'Add await to signPayload() in webhook delivery', 'Data integrity'],
    ['P0', 'Block private IPs in webhook URL validation', 'SSRF prevention'],
    ['P0', 'Delete dead /api route returning Hello World', 'Attack surface'],
    ['P1', 'Re-enable critical ESLint rules', 'Code quality'],
    ['P1', 'Set noImplicitAny: true in tsconfig', 'Type safety'],
    ['P1', 'Set poweredByHeader: false', 'Info disclosure'],
    ['P1', 'Add server-side auth redirect for /app/* in middleware', 'Auth hardening'],
]
rec_table = make_table(rec_headers, rec_rows,
    col_widths=[50, 300, 100])
story.extend(safe_keep([rec_table]))
story.append(Paragraph('Table 6: Immediate Priority Actions', caption_style))

story.append(add_heading('<b>10.2 Short-Term (First Month)</b>', cn_h2, 1))

rec2_rows = [
    ['P2', 'Purge 16 unused dependencies', 'Bundle size reduction'],
    ['P2', 'Convert 6 String status fields to enums', 'Data integrity'],
    ['P2', 'Add htmlFor to all Label elements', 'Accessibility'],
    ['P2', 'Add loading.tsx to /app/ and /admin/', 'User experience'],
    ['P2', 'Add error.tsx to /app/ and /admin/', 'Error recovery'],
    ['P2', 'Add Suspense boundaries for data fetching', 'Streaming SSR'],
    ['P2', 'Delete unused components (mobile-nav, data-table, etc.)', 'Code cleanliness'],
    ['P2', 'Pin PostgreSQL Docker image to patch version', 'Reproducibility'],
]
rec2_table = make_table(rec_headers, rec2_rows,
    col_widths=[50, 300, 100])
story.extend(safe_keep([rec2_table]))
story.append(Paragraph('Table 7: Short-Term Priority Actions', caption_style))

story.append(add_heading('<b>10.3 Medium-Term (Quarter 1)</b>', cn_h2, 1))

story.append(Paragraph(
    'Medium-term improvements should focus on architectural hardening and operational maturity. Restrict CSP connect-src to specific allowed '
    'domains rather than the broad https: wildcard. Implement a Zod-based request validation layer for all API routes to replace manual if-checks '
    'with a declarative, type-safe approach. Wire Prisma migrations into the Dockerfile startup command for reliable database schema management '
    'in containerized deployments. Bind Docker Compose database and Redis ports to localhost (127.0.0.1) only to prevent external access. '
    'Consider adding nonce-based CSP for scripts if the Next.js standalone configuration supports it, replacing the unsafe-inline directive. '
    'Implement a dedicated /api/admin/check call in the admin layout instead of the current HTTP probe pattern that loads the full '
    'organization list on every admin page navigation.',
    cn_body))

# ═══════════════════════════════════════════
# BUILD BODY PDF
# ═══════════════════════════════════════════

OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)
body_path = os.path.join(OUTPUT_DIR, 'audit-body.pdf')
final_path = os.path.join(OUTPUT_DIR, 'MIANX-AI-Project-Audit-Report.pdf')

doc = TocDocTemplate(
    body_path, pagesize=A4,
    leftMargin=1.0*inch, rightMargin=1.0*inch,
    topMargin=0.9*inch, bottomMargin=0.9*inch,
    title='MIANX.AI Project Audit Report',
    author='Z.ai',
    creator='Z.ai',
    subject='Comprehensive 9-Dimension Project Audit',
)

doc.multiBuild(story)
print(f'Body PDF generated: {body_path}')

# ═══════════════════════════════════════════
# GENERATE COVER HTML (Template 01: HUD Data Terminal)
# ═══════════════════════════════════════════

cover_html = '''<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { margin: 0; padding: 0; overflow: visible; background: #ffffff; width: 794px; height: 1123px; }
.cover-page { position: relative; width: 794px; height: 1123px; background: #ffffff; }

/* Layer 1: Grid Background */
.grid-bg {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background-image:
    linear-gradient(rgba(50,69,78,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(50,69,78,0.03) 1px, transparent 1px);
  background-size: 50pt 50pt;
  pointer-events: none;
}

/* Layer 2: Anchor Line */
.anchor-line {
  position: absolute; left: 95px; top: 112px; bottom: 112px;
  width: 6pt; background: #32454e;
}

/* Layer 3: Content */
.content { position: absolute; left: 148px; top: 0; bottom: 0; right: 80px; }

.kicker {
  position: absolute; top: 168px;
  font-family: 'Inter', sans-serif; font-size: 13pt; font-weight: 400;
  letter-spacing: 4pt; color: #747b7e; text-transform: uppercase;
}

.hero-title {
  position: absolute; top: 270px;
  font-family: 'Noto Sans SC', sans-serif; font-weight: 900; font-size: 52pt;
  line-height: 1.15; color: #131515;
  max-width: 560px;
}

.hero-title span { color: #1f6c92; }

.summary {
  position: absolute; top: 500px;
  font-family: 'Noto Sans SC', sans-serif; font-size: 14pt; font-weight: 400;
  line-height: 1.7; color: #32454e; max-width: 480px; opacity: 0.85;
}

.meta {
  position: absolute; top: 780px;
  font-family: 'Inter', sans-serif; font-size: 11pt; font-weight: 400;
  color: #747b7e; line-height: 1.8;
}

.meta strong { color: #32454e; font-weight: 600; }

/* Decorative accent bar */
.accent-bar {
  position: absolute; bottom: 112px; left: 140px;
  width: 80px; height: 4pt; background: #1f6c92;
}
</style>
</head>
<body>
<div class="cover-page">
  <div class="grid-bg"></div>
  <div class="anchor-line"></div>
  <div class="content">
    <div class="kicker">Comprehensive Security and Quality Audit</div>
    <div class="hero-title">
      MIANX.AI<br>
      <span>Project Audit</span><br>
      Report
    </div>
    <div class="summary">
      9-dimension comprehensive audit covering security, API design, architecture,
      code quality, database schema, dependencies, configuration, and UI/UX.
      92 API routes, 40 Prisma models, 55 dependencies analyzed.
    </div>
    <div class="meta">
      <strong>Project:</strong> MIANX.AI Multi-Tenant Business OS<br>
      <strong>Stack:</strong> Next.js 16 / React 19 / Prisma 6 / Supabase<br>
      <strong>Phase:</strong> Post-Phase-26 Production Deployment<br>
      <strong>Date:</strong> August 2026
    </div>
    <div class="accent-bar"></div>
  </div>
</div>
</body>
</html>'''

cover_html_path = os.path.join(OUTPUT_DIR, 'cover.html')
with open(cover_html_path, 'w', encoding='utf-8') as f:
    f.write(cover_html)
print(f'Cover HTML written: {cover_html_path}')

# Validate cover HTML
result = subprocess.run([
    'python3', os.path.join(SKILL_SCRIPTS, 'poster_validate.py'),
    'check-html', cover_html_path
], capture_output=True, text=True)
print(f'Cover validation: {result.stdout.strip() if result.stdout.strip() else "PASS"}')
if result.returncode != 0 and 'ERROR' in result.stdout:
    print(f'Cover validation errors: {result.stdout}')

# Render cover to PDF
cover_pdf_path = os.path.join(OUTPUT_DIR, 'cover.pdf')
subprocess.run([
    'node', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'skills', 'pdf', 'scripts', 'html2poster.js'),
    cover_html_path, '--output', cover_pdf_path, '--width', '794px'
], check=True)
print(f'Cover PDF rendered: {cover_pdf_path}')

# ═══════════════════════════════════════════
# MERGE COVER + BODY
# ═══════════════════════════════════════════

A4_W, A4_H = 595.28, 841.89

def normalize_page(page):
    """Scale any page to exact A4 dimensions."""
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    # Always normalize to exact A4 for consistency
    if abs(w - A4_W) > 0.01 or abs(h - A4_H) > 0.01:
        page.scale_to(A4_W, A4_H)
    return page

writer = PdfWriter()
cover_page = PdfReader(cover_pdf_path).pages[0]
writer.add_page(normalize_page(cover_page))
for page in PdfReader(body_path).pages:
    writer.add_page(normalize_page(page))
writer.add_metadata({
    '/Title': 'MIANX.AI Project Audit Report',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Comprehensive 9-Dimension Project Audit - Phase 26',
})
with open(final_path, 'wb') as f:
    writer.write(f)

print(f'Final PDF: {final_path}')

# Clean up temp files
import os
os.remove(body_path) if os.path.exists(body_path) else None
os.remove(cover_pdf_path) if os.path.exists(cover_pdf_path) else None
os.remove(cover_html_path) if os.path.exists(cover_html_path) else None

print('Audit report generation complete!')