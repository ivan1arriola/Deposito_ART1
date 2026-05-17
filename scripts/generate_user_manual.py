#!/usr/bin/env python3
import os
import re
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Flowable, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INPUT_FILE = os.path.join(ROOT_DIR, "public", "docs", "manual-usuario-final.md")
OUTPUT_FILE = os.path.join(ROOT_DIR, "public", "docs", "manual-usuario-final.pdf")

# Colores institucionales
COLOR_PRIMARY = colors.HexColor("#1f2937") # Gris Pizarra Oscuro
COLOR_SECONDARY = colors.HexColor("#2d3421") # Verde Oliva Oscuro
COLOR_ACCENT = colors.HexColor("#1f7a4d") # Verde Militar / Esmeralda
COLOR_GOLD = colors.HexColor("#d4aa26") # Dorado Militar
COLOR_SURFACE = colors.HexColor("#f8fafc")
COLOR_BORDER = colors.HexColor("#cbd5e1")
COLOR_TEXT = colors.HexColor("#334155")
COLOR_MUTED = colors.HexColor("#64748b")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            return  # Portada sin encabezado ni pie de página

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(COLOR_MUTED)

        # Encabezado
        self.drawString(18 * mm, 297 * mm - 12 * mm, "DEPÓSITO ART1")
        self.setFont("Helvetica", 8)
        self.drawRightString(210 * mm - 18 * mm, 297 * mm - 12 * mm, "Manual Operativo para Usuario Final")
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.5)
        self.line(18 * mm, 297 * mm - 14 * mm, 210 * mm - 18 * mm, 297 * mm - 14 * mm)

        # Pie de página
        self.line(18 * mm, 16 * mm, 210 * mm - 18 * mm, 16 * mm)
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawString(18 * mm, 11 * mm, page_str)
        self.drawRightString(210 * mm - 18 * mm, 11 * mm, "Depósito General - Grupo de Artillería 105mm No. 1")
        self.restoreState()

class PageRecorder(Flowable):
    def __init__(self, section_name, page_map):
        Flowable.__init__(self)
        self.section_name = section_name
        self.page_map = page_map

    def wrap(self, availWidth, availHeight):
        return 0, 0

    def draw(self):
        self.page_map[self.section_name] = self.canv._pageNumber

def clean_markdown(text):
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.*?)__', r'<b>\1</b>', text)
    text = re.sub(r'`([^`]+)`', r'<font face="Courier" color="#b91c1c">\1</font>', text)
    return text.strip()

def parse_metadata(lines):
    meta = {}
    for line in lines[:20]:
        m = re.match(r"^\*\*(.*?):\*\*\s*(.*)$", line.strip())
        if m:
            key = m.group(1).strip().lower()
            val = clean_markdown(m.group(2).strip())
            meta[key] = val
    return meta

def extract_sections(lines):
    sections = []
    for line in lines:
        m = re.match(r"^##\s+(\d+\.\s+.*)$", line.strip())
        if m:
            sections.append(m.group(1).strip())
    return sections

def build_cover(styles, meta):
    flowables = [Spacer(1, 35 * mm)]
    
    flowables.append(Paragraph("DEPÓSITO ART1", styles["CoverTitle"]))
    flowables.append(Spacer(1, 4 * mm))
    flowables.append(Paragraph("Manual Operativo y Guía Institucional para Usuario Final", styles["CoverSubtitle"]))
    flowables.append(Spacer(1, 10 * mm))
    
    flowables.append(HRFlowable(width="40%", thickness=3, color=COLOR_GOLD, spaceBefore=0, spaceAfter=25 * mm, hAlign="CENTER"))
    
    meta_html = f"""
    <b>Sistema Operativo:</b> {meta.get("sistema", "Depósito ART1")}<br/><br/>
    <b>Versión de Referencia:</b> {meta.get("versión de referencia", "5.5.4")}<br/><br/>
    <b>Fecha de Actualización:</b> {meta.get("fecha", "17/05/2026")}<br/><br/>
    <b>Público Objetivo:</b> {meta.get("dirigido a", "Personal operativo y administrativo del Depósito General")}
    """
    meta_table = Table([[Paragraph(meta_html, styles["CoverMeta"])]], colWidths=[150 * mm])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), COLOR_SURFACE),
        ('BOX', (0,0), (-1,-1), 1, COLOR_BORDER),
        ('PADDING', (0,0), (-1,-1), 18),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    
    flowables.append(meta_table)
    flowables.append(PageBreak())
    return flowables

def build_index(sections, page_map, styles):
    index_data = []
    for sec in sections:
        p_num = page_map.get(sec, "-")
        anchor = "sec_" + re.sub(r'[^a-zA-Z0-9]+', '_', sec)
        p_title = Paragraph(f"<a href='#{anchor}'><font color='#1f2937'><b>{sec}</b></font></a>", styles["IndexItem"])
        p_dots = Paragraph("<font color='#cbd5e1'>. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .</font>", styles["IndexDots"])
        p_page = Paragraph(f"<a href='#{anchor}'><font color='#1f7a4d'><b>pág. {p_num}</b></font></a>", styles["IndexPage"])
        index_data.append([p_title, p_dots, p_page])

    t = Table(index_data, colWidths=[80 * mm, 74 * mm, 20 * mm])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    return t

def parse_markdown_to_flowables(lines, styles, page_map):
    flowables = []
    sections = extract_sections(lines)
    meta = parse_metadata(lines)
    
    flowables.extend(build_cover(styles, meta))
    
    idx = 0
    in_code = False
    code_block = []
    
    while idx < len(lines):
        line = lines[idx]
        stripped = line.strip()
        
        # Ignorar título general y metadatos iniciales
        if idx < 10 and (stripped.startswith("# ") or stripped.startswith("**")):
            idx += 1
            continue
            
        if not stripped:
            idx += 1
            continue
            
        # Bloques de código
        if stripped.startswith("```"):
            if not in_code:
                in_code = True
                code_block = []
            else:
                in_code = False
                code_text = "\n".join(code_block)
                p = Paragraph(clean_markdown(code_text.replace("\n", "<br/>").replace(" ", "&nbsp;")), styles["CodeStyle"])
                t = Table([[p]], colWidths=[174 * mm])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
                    ('BOX', (0,0), (-1,-1), 1, COLOR_BORDER),
                    ('PADDING', (0,0), (-1,-1), 10),
                ]))
                flowables.append(Spacer(1, 3 * mm))
                flowables.append(t)
                flowables.append(Spacer(1, 5 * mm))
            idx += 1
            continue
            
        if in_code:
            code_block.append(line) # Preservar indentación original en código
            idx += 1
            continue
            
        # Tablas
        if stripped.startswith("|"):
            table_rows = []
            while idx < len(lines) and lines[idx].strip().startswith("|"):
                r = [c.strip() for c in lines[idx].strip().strip("|").split("|")]
                if not all(c == "" or set(c).issubset({'-', ':', ' '}) for c in r):
                    table_rows.append([clean_markdown(c) for c in r])
                idx += 1
            if table_rows:
                col_count = len(table_rows[0])
                col_w = [174 * mm / col_count] * col_count
                if col_count == 2: col_w = [45 * mm, 129 * mm]
                elif col_count == 3: col_w = [40 * mm, 45 * mm, 89 * mm]
                
                t_data = []
                for r_idx, r in enumerate(table_rows):
                    row_p = [Paragraph(f"<b>{c}</b>" if r_idx==0 else c, styles["TableHeader" if r_idx==0 else "TableCell"]) for c in r]
                    t_data.append(row_p)
                t = Table(t_data, colWidths=col_w)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), COLOR_SECONDARY),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('INNERGRID', (0,0), (-1,-1), 0.5, COLOR_BORDER),
                    ('BOX', (0,0), (-1,-1), 1, COLOR_SECONDARY),
                    ('PADDING', (0,0), (-1,-1), 7),
                ]))
                for i in range(1, len(table_rows)):
                    if i % 2 == 0:
                        t.setStyle(TableStyle([('BACKGROUND', (0,i), (-1,i), COLOR_SURFACE)]))
                flowables.append(Spacer(1, 4 * mm))
                flowables.append(t)
                flowables.append(Spacer(1, 6 * mm))
            continue
            
        # Títulos
        m_h = re.match(r"^(#{2,3})\s+(.*)$", stripped)
        if m_h:
            h_level = len(m_h.group(1))
            h_text = clean_markdown(m_h.group(2))
            
            if h_level == 2 and ("Índice" in h_text or "Indice" in h_text):
                h_p = Paragraph("Índice General", styles["ManualHeading1"])
                hr = HRFlowable(width="100%", thickness=1.5, color=COLOR_ACCENT, spaceBefore=4, spaceAfter=8)
                flowables.append(KeepTogether([h_p, hr]))
                flowables.append(Spacer(1, 4 * mm))
                flowables.append(build_index(sections, page_map, styles))
                flowables.append(PageBreak())
                
                # Avanzar las líneas del índice estático en markdown para no repetirlas en texto
                idx += 1
                while idx < len(lines) and (not lines[idx].strip() or re.match(r"^\d+\.\s+", lines[idx].strip())):
                    idx += 1
                continue
                
            elif h_level == 2:
                anchor = "sec_" + re.sub(r'[^a-zA-Z0-9]+', '_', h_text)
                flowables.append(PageRecorder(h_text, page_map))
                h_p = Paragraph(f"<a name='{anchor}'/>{h_text}", styles["ManualHeading1"])
                hr = HRFlowable(width="100%", thickness=1.5, color=COLOR_ACCENT, spaceBefore=4, spaceAfter=10)
                flowables.append(KeepTogether([h_p, hr]))
                flowables.append(Spacer(1, 3 * mm))
            else:
                h_p = Paragraph(h_text, styles["ManualHeading2"])
                flowables.append(KeepTogether([h_p, Spacer(1, 2 * mm)]))
                
            idx += 1
            continue
            
        # Listas
        m_ol = re.match(r"^(\d+)\.\s+(.*)$", stripped)
        m_ul = re.match(r"^-\s+(.*)$", stripped)
        if m_ol or m_ul:
            prefix = f"<b>{m_ol.group(1)}.</b>" if m_ol else "<font color='#1f7a4d'><b>•</b></font>"
            content = clean_markdown(m_ol.group(2) if m_ol else m_ul.group(1))
            p = Paragraph(f"{prefix}&nbsp;&nbsp;{content}", styles["ListStyle"])
            flowables.append(p)
            flowables.append(Spacer(1, 2 * mm))
            idx += 1
            continue
            
        # Párrafos normales
        p = Paragraph(clean_markdown(stripped), styles["ManualBody"])
        flowables.append(p)
        flowables.append(Spacer(1, 3.5 * mm))
        idx += 1
        
    return flowables

def generate_pdf():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: No se encontró el archivo {INPUT_FILE}")
        sys.exit(1)
        
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    styles = getSampleStyleSheet()
    
    # Configuración de estilos institucionales
    styles.add(ParagraphStyle('CoverTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=32, leading=38, textColor=COLOR_PRIMARY, alignment=1))
    styles.add(ParagraphStyle('CoverSubtitle', parent=styles['Normal'], fontName='Helvetica', fontSize=15, leading=20, textColor=COLOR_TEXT, alignment=1))
    styles.add(ParagraphStyle('CoverMeta', parent=styles['Normal'], fontName='Helvetica', fontSize=11, leading=18, textColor=COLOR_PRIMARY, alignment=1))
    
    styles.add(ParagraphStyle('ManualHeading1', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=COLOR_PRIMARY, spaceBefore=18, keepWithNext=True))
    styles.add(ParagraphStyle('ManualHeading2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=COLOR_SECONDARY, spaceBefore=14, keepWithNext=True))
    
    styles.add(ParagraphStyle('ManualBody', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=15, textColor=COLOR_TEXT, alignment=4)) # Justificado
    styles.add(ParagraphStyle('ListStyle', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, textColor=COLOR_TEXT, leftIndent=12, firstLineIndent=-12))
    styles.add(ParagraphStyle('CodeStyle', parent=styles['Normal'], fontName='Courier', fontSize=9, leading=13, textColor=COLOR_PRIMARY))
    
    styles.add(ParagraphStyle('TableHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.white))
    styles.add(ParagraphStyle('TableCell', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=12, textColor=COLOR_TEXT))
    
    styles.add(ParagraphStyle('IndexItem', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=COLOR_PRIMARY))
    styles.add(ParagraphStyle('IndexDots', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, alignment=0))
    styles.add(ParagraphStyle('IndexPage', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=COLOR_ACCENT, alignment=2))

    doc = SimpleDocTemplate(
        OUTPUT_FILE,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=22 * mm
    )

    page_map = {}

    # Pasada 1: Generar flowables y construir documento para capturar páginas en page_map
    print("Iniciando Pasada 1 (Cálculo de paginación institucional)...")
    flowables_pass1 = parse_markdown_to_flowables(lines, styles, page_map)
    doc.build(flowables_pass1, canvasmaker=NumberedCanvas)

    # Pasada 2: Generar flowables con el índice con páginas correctas
    print("Iniciando Pasada 2 (Generación de PDF definitivo con Índice preciso)...")
    flowables_pass2 = parse_markdown_to_flowables(lines, styles, page_map)
    doc.build(flowables_pass2, canvasmaker=NumberedCanvas)

    size_kb = os.path.getsize(OUTPUT_FILE) // 1024
    print(f"¡Éxito! Manual Institucional PDF generado correctamente: {OUTPUT_FILE} ({size_kb} KB)")

if __name__ == "__main__":
    generate_pdf()
