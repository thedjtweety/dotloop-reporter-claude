import { describe, it, expect } from 'vitest';
import {
  getPipelineStatusColor,
  formatCurrency,
  type ProspectExportData,
} from './prospectExporter';

describe('Prospect Exporter Utilities', () => {
  describe('getPipelineStatusColor', () => {
    it('should return correct color for lead status', () => {
      expect(getPipelineStatusColor('lead')).toBe('#3b82f6');
    });

    it('should return correct color for contacted status', () => {
      expect(getPipelineStatusColor('contacted')).toBe('#06b6d4');
    });

    it('should return correct color for interviewing status', () => {
      expect(getPipelineStatusColor('interviewing')).toBe('#f59e0b');
    });

    it('should return correct color for offer_extended status', () => {
      expect(getPipelineStatusColor('offer_extended')).toBe('#8b5cf6');
    });

    it('should return correct color for onboarding status', () => {
      expect(getPipelineStatusColor('onboarding')).toBe('#10b981');
    });

    it('should return correct color for hired status', () => {
      expect(getPipelineStatusColor('hired')).toBe('#10b981');
    });

    it('should return correct color for declined status', () => {
      expect(getPipelineStatusColor('declined')).toBe('#ef4444');
    });

    it('should return default color for unknown status', () => {
      expect(getPipelineStatusColor('unknown')).toBe('#6b7280');
    });
  });

  describe('formatCurrency', () => {
    it('should format millions correctly', () => {
      expect(formatCurrency(1500000)).toBe('$1.5M');
    });

    it('should format thousands correctly', () => {
      expect(formatCurrency(500000)).toBe('$500K');
    });

    it('should format small amounts correctly', () => {
      expect(formatCurrency(500)).toBe('$500');
    });

    it('should return dash for undefined', () => {
      expect(formatCurrency(undefined)).toBe('-');
    });

    it('should return dash for zero', () => {
      expect(formatCurrency(0)).toBe('-');
    });

    it('should handle large amounts', () => {
      expect(formatCurrency(5000000)).toBe('$5.0M');
    });

    it('should handle 1 million exactly', () => {
      expect(formatCurrency(1000000)).toBe('$1.0M');
    });

    it('should handle 1 thousand exactly', () => {
      expect(formatCurrency(1000)).toBe('$1K');
    });
  });
});
