# Mianx.ai Roadmap - Body Script Part 1: Setup, Styles, TOC, Executive Summary, Phase Overview
import sys
import os
import hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents

# ━━ Cascade Palette ━━
PAGE_BG       = colors.HexColor('#f2f3f4')
SECTION_BG    = colors.HexColor('#e6e8e9')
CARD_BG       = colors.HexColor('#e9ebec')
TABLE_STRIPE  = colors.HexColor('#eff2f3')
HEADER_FILL   = colors.HexColor('#456676')
COVER_BLOCK   = colors.HexColor('#415b68')
BORDER        = colors.HexColor('#bec8cc')
ICON          = colors.HexColor('#51798c')
ACCENT        = colors.HexColor('#2b6887')
ACCENT_2      = colors.HexColor('#ba6143')
TEXT_PRIMARY   = colors.HexColor('#17191a')
TEXT_MUTED     = colors.HexColor('#81878a')
SEM_SUCCESS   = colors.HexColor('#467a57')
SEM_WARNING   = colors.HexColor('#a28449')
SEM_ERROR     = colors.HexColor('#a04c45')
SEM_INFO      = colors.HexColor('#426b94')

FONT_DIR = '/usr/share/fonts'
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

pdfmetrics.registerFont(TTFont('Inter', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Inter-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))
registerFontFamily('Inter', normal='Inter', bold='Inter-Bold')

# ━━ Styles ━━
styles = getSampleStyleSheet()

s_h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontName='Inter-Bold', fontSize=22, leading=28,
    textColor=HEADER_FILL, spaceBefore=18, spaceAfter=10)
s_h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontName='Inter-Bold', fontSize=16, leading=22,
    textColor=ACCENT, spaceBefore=14, spaceAfter=8)
s_h3 = ParagraphStyle('H3', parent=styles['Heading3'], fontName='Inter-Bold', fontSize=12, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6)
s_body = ParagraphStyle('Body', parent=styles['Normal'], fontName='Inter', fontSize=10, leading=15,
    textColor=TEXT_PRIMARY, spaceBefore=3, spaceAfter=5, alignment=TA_JUSTIFY)
s_body_sm = ParagraphStyle('BodySm', parent=s_body, fontSize=9, leading=13)
s_bullet = ParagraphStyle('Bullet', parent=s_body, leftIndent=18, bulletIndent=6,
    spaceBefore=2, spaceAfter=2)
s_kicker = ParagraphStyle('Kicker', fontName='Inter', fontSize=9, leading=12,
    textColor=TEXT_MUTED, letterSpacing=2)
s_caption = ParagraphStyle('Caption', fontName='Inter', fontSize=8, leading=11,
    textColor=TEXT_MUTED, alignment=TA_LEFT)
s_toc_h0 = ParagraphStyle('TOC0', fontName='Inter-Bold', fontSize=12, leading=20, leftIndent=0)
s_toc_h1 = ParagraphStyle('TOC1', fontName='Inter', fontSize=10, leading=18, leftIndent=20)

# ━━ TocDocTemplate ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

heading_counter = {}

def add_heading(text, style, level=0):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def make_table(headers, rows, col_widths=None):
    """Create a styled table with header row and alternating stripes."""
    avail = A4[0] - 60*mm
    if col_widths is None:
        n = len(headers)
        col_widths = [avail / n] * n
    header_para = [Paragraph(h, ParagraphStyle('th', fontName='Inter-Bold', fontSize=8, leading=11,
        textColor=colors.white, alignment=TA_LEFT)) for h in headers]
    data = [header_para]
    for row in rows:
        data.append([Paragraph(str(c), ParagraphStyle('td', fontName='Inter', fontSize=8, leading=11,
            textColor=TEXT_PRIMARY)) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Inter-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

def phase_header(phase_num, title, duration):
    """Create a phase header with number, title, and duration."""
    data = [[
        Paragraph(f'<b>PHASE {phase_num}</b>', ParagraphStyle('ph', fontName='Inter-Bold',
            fontSize=11, leading=14, textColor=colors.white)),
        Paragraph(f'<b>{title}</b>', ParagraphStyle('pt', fontName='Inter-Bold',
            fontSize=11, leading=14, textColor=colors.white)),
        Paragraph(f'{duration}', ParagraphStyle('pd', fontName='Inter',
            fontSize=10, leading=14, textColor=colors.white, alignment=1))  # TA_RIGHT=1
    ]]
    t = Table(data, colWidths=[75, 280, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t

def build_story():
    story = []
    avail_w = A4[0] - 60*mm

    # ── TABLE OF CONTENTS ──
    toc = TableOfContents()
    toc.levelStyles = [s_toc_h0, s_toc_h1]
    story.append(Paragraph('Table of Contents', s_h1))
    story.append(Spacer(1, 8))
    story.append(toc)
    story.append(PageBreak())

    # ── 1. EXECUTIVE SUMMARY ──
    story.append(add_heading('1. Executive Summary', s_h1, 0))
    story.append(Paragraph(
        'Mianx.ai is a multi-tenant, multi-domain, AI-native Business Operating System designed to serve as a universal platform foundation. Rather than building separate software products for each industry vertical, Mianx.ai provides a shared Core platform with pluggable Domain packages. The first production domain is Poultry OS, followed by Restaurant, Retail, and Manufacturing in future phases. This roadmap defines the complete implementation plan across 12 sequential phases spanning 32 weeks, covering every layer from database architecture and tenant isolation to AI agents, billing, automation, and the production frontend.',
        s_body))
    story.append(Paragraph(
        'The architecture follows a strict principle: <b>Build the Core once. Build unlimited Business OS products on top.</b> This means the Core must be domain-agnostic, fully tenant-isolated, and extensible enough that adding a new business domain requires zero changes to the Core itself. If the architecture supports Poultry cleanly without any Poultry-specific code inside Core, then the design is validated and ready for additional domains.',
        s_body))
    story.append(Paragraph(
        'Each phase in this roadmap includes specific deliverables, database tables to be created, API endpoints to be implemented, integration points, and a definition-of-done checklist. Phases are designed to be sequential because each builds on the foundation established by the previous phase. However, within each phase, tasks are organized for maximum parallelism where dependencies allow. The technology baseline uses Next.js with React and TypeScript on the frontend, Next.js server-side architecture for the backend, PostgreSQL via Supabase for the database, Supabase Auth for authentication, and a provider-agnostic AI abstraction layer for all artificial intelligence capabilities.',
        s_body))
    story.append(Spacer(1, 6))

    # ── 2. PHASE OVERVIEW ──
    story.append(add_heading('2. Phase Overview', s_h1, 0))
    story.append(Paragraph(
        'The following table provides a high-level summary of all 12 phases, their duration, primary focus area, and the key deliverable that marks the completion of each phase. This serves as a quick reference for project planning and milestone tracking. Each phase is described in detail in its own section later in this document, including specific tasks, database tables, dependencies, and success criteria.',
        s_body))
    story.append(Spacer(1, 6))

    overview_headers = ['Phase', 'Name', 'Duration', 'Primary Focus', 'Key Deliverable']
    overview_rows = [
        ['0', 'Project Foundation', 'Week 1-2', 'Setup and scaffolding', 'Runnable dev environment'],
        ['1', 'Database and Tenancy', 'Week 2-4', 'PostgreSQL schema and RLS', 'Tenant-isolated database'],
        ['2', 'Identity and Authorization', 'Week 4-6', 'Auth, RBAC, permissions', 'Secure access control system'],
        ['3', 'Domain and Module Engine', 'Week 6-8', 'Domain registry, manifests', 'Extensible domain framework'],
        ['4', 'AI Core Foundation', 'Week 8-12', 'AI router, agents, tools', 'Governed AI runtime'],
        ['5', 'Event and Automation', 'Week 12-14', 'Events, workflows, jobs', 'Reliable automation engine'],
        ['6', 'API and Integration', 'Week 14-16', 'APIs, webhooks, OAuth', 'External connectivity layer'],
        ['7', 'Billing and Entitlements', 'Week 16-18', 'Plans, subscriptions, usage', 'Commercial SaaS foundation'],
        ['8', 'Frontend Platform', 'Week 18-22', 'App shell, design system', 'Complete UI platform'],
        ['9', 'Observability and Ops', 'Week 22-24', 'Logging, monitoring, alerts', 'Operational visibility'],
        ['10', 'Poultry OS Domain', 'Week 24-30', 'Industry modules, agents', 'First production domain'],
        ['11', 'Production Readiness', 'Week 30-32', 'Security, testing, deploy', 'Production-ready system'],
    ]
    story.append(make_table(overview_headers, overview_rows,
        col_widths=[30, 85, 55, 130, 155]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 1: Phase overview with durations and key deliverables', s_caption))
    story.append(PageBreak())

    return story

if __name__ == '__main__':
    pass  # Will be called from main script