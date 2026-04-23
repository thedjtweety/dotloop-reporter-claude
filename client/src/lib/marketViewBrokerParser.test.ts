import { describe, it, expect } from 'vitest';
import {
  parseMarketViewBrokerCSV,
  validateMarketViewBrokerCSV,
  calculateProspectStats,
  type MarketViewBrokerProspect,
} from './marketViewBrokerParser';

const sampleCSV = `"","","","","","","","(c) 2026 MarketStats by ShowingTime Plus, LLC. Data Provided by DEMO as of 4/14/2026. Information deemed reliable, but not guaranteed. Data last updated: 4/12/2026.","","","","","","","",""
"Search Agents , No Filter  From: 04/01/2025 To: 03/31/2026 Order By: Total Volume Descending","","","","","","","","","","","","","","",""
"Agents","","Offices","List Side","","Sales Side","","Total","","Mls Id","Primary Phone","Mobile Phone","Email","Agent Address","Office Location","Office Mls Id"
"First Name","Last Name","","Units","Volume","Units","Volume","Units","Volume","","","","","","",""
"Market Totals:","Market Totals:","","78246","31842444339","79240","32328654159","157486","64171098498","","","","","","",""
"Lewis","Berry","Unassigned Realtors","13.5","3859995.5","2927.5","1188061822","2941","1191921817.5","4422588","312-555-9436","312-555-9436","Lewis.Berry@example.com","4736 Island Park Dr, ,    ","Minneapolis","4368023"
"Lucy","Chang","Keathley Realtors","171","70573460.5","172.5","66956693","343.5","137530153.5","4565952","612-555-7441","612-555-7441","Lucy.Chang@example.com","4736 Island Park Dr, Plymouth, MI 55441","Plymouth","4376375"
"Belinda","Hurley","Fargo Real Estate Agency","1","537283.5","387.5","136982847.5","388.5","137520131","462996480","312-555-9436","312-555-9436","Belinda.Hurley@example.com","4736 Island Park Dr, ,    ","Fargo","475526153"`;

describe('Market View Broker Parser', () => {
  describe('parseMarketViewBrokerCSV', () => {
    it('should parse valid Market View Broker CSV', () => {
      const { prospects, errors } = parseMarketViewBrokerCSV(sampleCSV);
      
      expect(errors).toHaveLength(0);
      expect(prospects.length).toBeGreaterThan(0);
      expect(prospects[0]).toMatchObject({
        firstName: 'Lewis',
        lastName: 'Berry',
        email: 'Lewis.Berry@example.com',
        office: 'Unassigned Realtors',
      });
    });

    it('should parse agent production data correctly', () => {
      const { prospects } = parseMarketViewBrokerCSV(sampleCSV);
      const lewis = prospects[0];

      expect(lewis.listSideUnits).toBe(13.5);
      expect(lewis.listSideVolume).toBe(3859995.5);
      expect(lewis.salesSideUnits).toBe(2927.5);
      expect(lewis.salesSideVolume).toBe(1188061822);
      expect(lewis.totalUnits).toBe(2941);
      expect(lewis.totalVolume).toBe(1191921817.5);
    });

    it('should skip Market Totals row', () => {
      const { prospects } = parseMarketViewBrokerCSV(sampleCSV);
      const hasTotals = prospects.some(p => p.firstName.toLowerCase() === 'market totals');
      expect(hasTotals).toBe(false);
    });

    it('should handle empty CSV', () => {
      const { prospects, errors } = parseMarketViewBrokerCSV('');
      expect(prospects).toHaveLength(0);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle malformed CSV', () => {
      const { prospects, errors } = parseMarketViewBrokerCSV('invalid,data');
      expect(prospects).toHaveLength(0);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should parse multiple prospects', () => {
      const { prospects } = parseMarketViewBrokerCSV(sampleCSV);
      expect(prospects.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle missing optional fields', () => {
      const { prospects } = parseMarketViewBrokerCSV(sampleCSV);
      expect(prospects[0].mlsId).toBeDefined();
    });
  });

  describe('validateMarketViewBrokerCSV', () => {
    it('should validate correct CSV format', () => {
      const { valid, errors } = validateMarketViewBrokerCSV(sampleCSV);
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty CSV', () => {
      const { valid, errors } = validateMarketViewBrokerCSV('');
      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject CSV without required headers', () => {
      const { valid, errors } = validateMarketViewBrokerCSV('invalid,data\nmore,data');
      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject CSV that is too short', () => {
      const { valid, errors } = validateMarketViewBrokerCSV('line1\nline2');
      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('calculateProspectStats', () => {
    it('should calculate stats for prospects', () => {
      const { prospects } = parseMarketViewBrokerCSV(sampleCSV);
      const stats = calculateProspectStats(prospects);

      expect(stats.totalProspects).toBe(prospects.length);
      expect(stats.totalVolume).toBeGreaterThan(0);
      expect(stats.avgVolume).toBeGreaterThan(0);
      expect(stats.topProspects.length).toBeGreaterThan(0);
    });

    it('should identify top prospects by volume', () => {
      const { prospects } = parseMarketViewBrokerCSV(sampleCSV);
      const stats = calculateProspectStats(prospects);

      expect(stats.topProspects[0].totalVolume).toBeGreaterThanOrEqual(
        stats.topProspects[1]?.totalVolume || 0
      );
    });

    it('should group prospects by office', () => {
      const { prospects } = parseMarketViewBrokerCSV(sampleCSV);
      const stats = calculateProspectStats(prospects);

      expect(Object.keys(stats.byOffice).length).toBeGreaterThan(0);
      Object.values(stats.byOffice).forEach(office => {
        expect(office.count).toBeGreaterThan(0);
        expect(office.volume).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle empty prospect list', () => {
      const stats = calculateProspectStats([]);
      expect(stats.totalProspects).toBe(0);
      expect(stats.avgVolume).toBe(0);
    });
  });
});
