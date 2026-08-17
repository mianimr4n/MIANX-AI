#!/usr/bin/env python3
"""Mianx.ai Roadmap PDF Generator - Main Script"""
import sys, os

sys.path.insert(0, os.path.dirname(__file__))
from body_part1 import (
    build_story, s_h1, s_h2, s_h3, s_body, s_bullet, s_caption,
    make_table, phase_header, TocDocTemplate, PAGE_BG, TEXT_PRIMARY,
    A4, Paragraph, Spacer, PageBreak, KeepTogether, HRFlowable,
    ACCENT, TEXT_MUTED, HEADER_FILL, add_heading
)
from body_part2 import add_phases_0_5
from body_part3 import add_phases_6_9
from body_part4 import add_phases_10_11

OUTPUT_PATH = '/home/z/my-project/download/MIANX_AI_Development_Roadmap_v1.0.pdf'

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

story = build_story()
story = add_phases_0_5(story, s_h1, s_h2, s_h3, s_body, s_bullet, s_caption,
    make_table, phase_header, Paragraph, Spacer, PageBreak, KeepTogether,
    HRFlowable, ACCENT, TEXT_MUTED, add_heading)
story = add_phases_6_9(story, s_h1, s_h2, s_h3, s_body, s_bullet, s_caption,
    make_table, phase_header, Paragraph, Spacer, PageBreak, KeepTogether,
    HRFlowable, ACCENT, TEXT_MUTED, add_heading)
story = add_phases_10_11(story, s_h1, s_h2, s_h3, s_body, s_bullet, s_caption,
    make_table, phase_header, Paragraph, Spacer, PageBreak, KeepTogether,
    HRFlowable, ACCENT, TEXT_MUTED, TEXT_PRIMARY, HEADER_FILL)

doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=60,
    rightMargin=60,
    topMargin=50,
    bottomMargin=50,
    title='MIANX.AI Core Platform - Development Roadmap v1.0',
    author='Mianx.ai',
    subject='Phase-by-phase implementation plan for the multi-tenant, multi-domain, AI-native business operating system'
)

def add_page_number(canvas, doc):
    page_num = canvas.getPageNumber()
    canvas.saveState()
    canvas.setFont('Inter', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(A4[0] / 2, 25, f'Page {page_num}')
    canvas.drawString(60, 25, 'MIANX.AI Roadmap v1.0')
    canvas.restoreState()

doc.multiBuild(story, onFirstPage=lambda c, d: None, onLaterPages=add_page_number)
print(f'Body PDF generated: {OUTPUT_PATH}')