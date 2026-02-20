#!/usr/bin/env python3
"""
Professional Commission Disbursement Authorization (CDA) PDF Generator
Matches the format from the sample CDA document
"""

import sys
import json
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from datetime import datetime

def format_currency(amount):
    """Format number as currency"""
    return f"${amount:,.2f}"

def generate_cda_pdf(data, output_path):
    """
    Generate a professional CDA PDF
    
    Args:
        data: Dictionary containing CDA data
        output_path: Path to save the PDF
    """
    # Create PDF document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    # Container for PDF elements
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e3a5f'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#1e3a5f'),
        spaceAfter=6,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica'
    )
    
    # Title
    title = Paragraph("COMMISSION DISBURSEMENT REQUEST & AUTHORIZATION", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.2*inch))
    
    # Transaction Summary Section
    elements.append(Paragraph("TRANSACTION SUMMARY", heading_style))
    
    transaction_data = [
        ['Property Address:', data.get('propertyAddress', '')],
        ['Sale Price:', format_currency(data.get('salePrice', 0))],
        ['Total Commission Rate:', f"{data.get('totalCommissionRate', 0):.2f}%"],
        ['Gross Commission:', format_currency(data['calculation']['grossCommission'])],
    ]
    
    transaction_table = Table(transaction_data, colWidths=[2*inch, 4*inch])
    transaction_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1e3a5f')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(transaction_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Commission Breakdown Section
    elements.append(Paragraph("COMMISSION BREAKDOWN", heading_style))
    
    calc = data['calculation']
    
    breakdown_data = [
        ['', 'Selling Side', 'Listing Side', 'Total'],
        ['Gross Commission', 
         format_currency(calc['sellingGrossCommission']),
         format_currency(calc['listingGrossCommission']),
         format_currency(calc['grossCommission'])],
    ]
    
    # Add referral fees if present
    if calc.get('sellingReferralFee', 0) > 0 or calc.get('listingReferralFee', 0) > 0:
        breakdown_data.append([
            f"Referral Fee ({data.get('referralCompanyName', 'N/A')})",
            format_currency(-calc.get('sellingReferralFee', 0)) if calc.get('sellingReferralFee', 0) > 0 else '-',
            format_currency(-calc.get('listingReferralFee', 0)) if calc.get('listingReferralFee', 0) > 0 else '-',
            format_currency(-(calc.get('sellingReferralFee', 0) + calc.get('listingReferralFee', 0)))
        ])
    
    # Add other adjustments if present
    if calc.get('sellingOtherAdjustmentsTotal', 0) != 0 or calc.get('listingOtherAdjustmentsTotal', 0) != 0:
        breakdown_data.append([
            'Other Adjustments',
            format_currency(calc.get('sellingOtherAdjustmentsTotal', 0)),
            format_currency(calc.get('listingOtherAdjustmentsTotal', 0)),
            format_currency(calc.get('sellingOtherAdjustmentsTotal', 0) + calc.get('listingOtherAdjustmentsTotal', 0))
        ])
    
    breakdown_data.append([
        'Commission After Fees',
        format_currency(calc['sellingCommissionAfterFees']),
        format_currency(calc['listingCommissionAfterFees']),
        format_currency(calc['sellingCommissionAfterFees'] + calc['listingCommissionAfterFees'])
    ])
    
    breakdown_table = Table(breakdown_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    breakdown_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8f0f7')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0f0f0')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(breakdown_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Disbursement Instructions Section
    elements.append(Paragraph("DISBURSEMENT INSTRUCTIONS", heading_style))
    
    disbursement_data = [
        ['Payee', 'Amount', 'Payment Method'],
    ]
    
    # Selling Side
    if calc['sellingAgent1Commission'] > 0:
        disbursement_data.append([
            f"{data.get('sellingAgent1Name', '')} (Selling Agent)",
            format_currency(calc['sellingAgent1Commission']),
            'Wire/Check'
        ])
    
    if calc.get('sellingAgent2Commission', 0) > 0:
        disbursement_data.append([
            f"{data.get('sellingAgent2Name', '')} (Selling Agent 2)",
            format_currency(calc['sellingAgent2Commission']),
            'Wire/Check'
        ])
    
    if calc['sellingBrokerageCommission'] > 0:
        disbursement_data.append([
            'Selling Brokerage',
            format_currency(calc['sellingBrokerageCommission']),
            'Wire/Check'
        ])
    
    # Listing Side
    if calc['listingAgent1Commission'] > 0:
        disbursement_data.append([
            f"{data.get('listingAgent1Name', '')} (Listing Agent)",
            format_currency(calc['listingAgent1Commission']),
            'Wire/Check'
        ])
    
    if calc.get('listingAgent2Commission', 0) > 0:
        disbursement_data.append([
            f"{data.get('listingAgent2Name', '')} (Listing Agent 2)",
            format_currency(calc['listingAgent2Commission']),
            'Wire/Check'
        ])
    
    if calc['listingBrokerageCommission'] > 0:
        disbursement_data.append([
            'Listing Brokerage',
            format_currency(calc['listingBrokerageCommission']),
            'Wire/Check'
        ])
    
    # Total row
    total_disbursement = (
        calc['sellingAgent1Commission'] +
        calc.get('sellingAgent2Commission', 0) +
        calc['sellingBrokerageCommission'] +
        calc['listingAgent1Commission'] +
        calc.get('listingAgent2Commission', 0) +
        calc['listingBrokerageCommission']
    )
    
    disbursement_data.append([
        'TOTAL DISBURSEMENT',
        format_currency(total_disbursement),
        ''
    ])
    
    disbursement_table = Table(disbursement_data, colWidths=[3.5*inch, 1.5*inch, 1.5*inch])
    disbursement_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8f0f7')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#10b981')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(disbursement_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Validation Notice
    if calc.get('isValid', False):
        validation_text = f"✓ Total Disbursement ({format_currency(total_disbursement)}) matches Gross Commission ({format_currency(calc['grossCommission'])})"
        validation_para = Paragraph(
            f'<font color="green"><b>{validation_text}</b></font>',
            normal_style
        )
        elements.append(validation_para)
        elements.append(Spacer(1, 0.2*inch))
    
    # Signature Section
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("AUTHORIZATION", heading_style))
    
    signature_data = [
        ['Managing Broker Signature:', '_' * 50, 'Date:', '_' * 20],
        ['', '', '', ''],
        ['Agent Signature:', '_' * 50, 'Date:', '_' * 20],
        ['', '', '', ''],
        ['Title Company Representative:', '_' * 50, 'Date:', '_' * 20],
    ]
    
    signature_table = Table(signature_data, colWidths=[1.5*inch, 3*inch, 0.6*inch, 1.4*inch])
    signature_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    
    elements.append(signature_table)
    
    # Footer
    elements.append(Spacer(1, 0.3*inch))
    footer_text = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')} | Dotloop Reporter - Independent Project"
    footer_para = Paragraph(
        f'<font size="8" color="gray">{footer_text}</font>',
        ParagraphStyle('Footer', parent=normal_style, alignment=TA_CENTER)
    )
    elements.append(footer_para)
    
    # Build PDF
    doc.build(elements)
    
    return output_path

def main():
    """Main entry point for CLI usage"""
    if len(sys.argv) < 3:
        print("Usage: python generate_cda_pdf.py <input_json> <output_pdf>")
        sys.exit(1)
    
    input_json_path = sys.argv[1]
    output_pdf_path = sys.argv[2]
    
    # Read input JSON
    with open(input_json_path, 'r') as f:
        data = json.load(f)
    
    # Generate PDF
    generate_cda_pdf(data, output_pdf_path)
    
    print(f"CDA PDF generated successfully: {output_pdf_path}")

if __name__ == '__main__':
    main()
