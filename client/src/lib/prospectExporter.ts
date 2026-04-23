import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ProspectExportData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  primaryPhone?: string;
  mobilePhone?: string;
  office?: string;
  pipelineStatus: string;
  totalVolume?: number;
  totalUnits?: number;
}

/**
 * Export prospects to CSV format
 */
export function exportProspectsToCSV(prospects: ProspectExportData[], filename: string = 'prospects.csv') {
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Primary Phone',
    'Mobile Phone',
    'Office',
    'Pipeline Status',
    'Total Volume',
    'Total Units',
  ];

  const rows = prospects.map(p => [
    p.firstName,
    p.lastName,
    p.email,
    p.primaryPhone || '',
    p.mobilePhone || '',
    p.office || '',
    p.pipelineStatus,
    p.totalVolume || '',
    p.totalUnits || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const str = String(cell);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/**
 * Export prospects to PDF format
 */
export function exportProspectsToPDF(prospects: ProspectExportData[], filename: string = 'prospects.pdf') {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text('Prospect List', 14, 15);
  
  // Add metadata
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);
  doc.text(`Total Prospects: ${prospects.length}`, 14, 32);
  
  // Reset text color
  doc.setTextColor(0);

  // Prepare table data
  const tableData = prospects.map(p => [
    `${p.firstName} ${p.lastName}`,
    p.email,
    p.primaryPhone || p.mobilePhone || '-',
    p.office || '-',
    p.pipelineStatus,
    p.totalVolume ? `$${(p.totalVolume / 1000).toFixed(0)}K` : '-',
    p.totalUnits || '-',
  ]);

  // Add table
  autoTable(doc, {
    head: [['Name', 'Email', 'Phone', 'Office', 'Status', 'Volume', 'Units']],
    body: tableData,
    startY: 40,
    margin: { top: 40, right: 14, bottom: 14, left: 14 },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [255, 140, 0], // Orange
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 40 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 },
      6: { cellWidth: 15 },
    },
  });

  // Save PDF
  doc.save(filename);
}

/**
 * Get pipeline status badge color
 */
export function getPipelineStatusColor(status: string): string {
  const colors: Record<string, string> = {
    lead: '#3b82f6',
    contacted: '#06b6d4',
    interviewing: '#f59e0b',
    offer_extended: '#8b5cf6',
    onboarding: '#10b981',
    hired: '#10b981',
    declined: '#ef4444',
  };
  return colors[status] || '#6b7280';
}

/**
 * Format currency
 */
export function formatCurrency(value?: number): string {
  if (!value) return '-';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}
