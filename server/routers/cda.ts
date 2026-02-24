import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { calculateCDA } from '../lib/cda-calculator';
import { PythonShell } from 'python-shell';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const otherAdjustmentSchema = z.object({
  description: z.string(),
  amount: z.number(),
});

const cdaInputSchema = z.object({
  propertyAddress: z.string(),
  salePrice: z.number().positive(),
  totalCommissionRate: z.number().positive(),
  sellingSplitPercent: z.number().min(0).max(100),
  listingSplitPercent: z.number().min(0).max(100),
  
  sellingAgent1Name: z.string(),
  sellingAgent1SplitPercent: z.number().min(0).max(100),
  sellingAgent2Name: z.string().optional(),
  sellingAgent2SplitPercent: z.number().min(0).max(100).optional(),
  sellingBrokerSplitPercent: z.number().min(0).max(100),
  sellingOtherAdjustments: z.array(otherAdjustmentSchema),
  
  listingAgent1Name: z.string(),
  listingAgent1SplitPercent: z.number().min(0).max(100),
  listingAgent2Name: z.string().optional(),
  listingAgent2SplitPercent: z.number().min(0).max(100).optional(),
  listingBrokerSplitPercent: z.number().min(0).max(100),
  listingOtherAdjustments: z.array(otherAdjustmentSchema),
  
  referralPercent: z.number().min(0).max(100).optional(),
  referralType: z.enum(['selling', 'listing']).optional(),
  referralCompanyName: z.string().optional(),
});

export const cdaRouter = router({
  calculate: publicProcedure
    .input(cdaInputSchema)
    .mutation(async ({ input }) => {
      console.log('[CDA Calculate] Received input:', input);
      const result = calculateCDA(input);
      return result;
    }),
    
  generatePDF: publicProcedure
    .input(cdaInputSchema)
    .mutation(async ({ input }) => {
      // First calculate to ensure valid data
      const calculation = calculateCDA(input);
      
      if (!calculation.isValid) {
        throw new Error(`Invalid CDA data: ${calculation.validationErrors.join(', ')}`);
      }
      
      // Prepare data for Python script
      const cdaData = {
        ...input,
        calculation,
      };
      
      // Create temporary files
      const tmpDir = os.tmpdir();
      const inputJsonPath = path.join(tmpDir, `cda_input_${Date.now()}.json`);
      const outputPdfPath = path.join(tmpDir, `cda_output_${Date.now()}.pdf`);
      
      try {
        // Write input JSON
        await fs.writeFile(inputJsonPath, JSON.stringify(cdaData, null, 2));
        
        // Run Python script
        const scriptPath = path.join(__dirname, '../scripts/generate_cda_pdf.py');
        await PythonShell.run(scriptPath, {
          args: [inputJsonPath, outputPdfPath],
          pythonPath: 'python3',
        });
        
        // Read generated PDF
        const pdfBuffer = await fs.readFile(outputPdfPath);
        const pdfBase64 = pdfBuffer.toString('base64');
        
        // Clean up temporary files
        await fs.unlink(inputJsonPath);
        await fs.unlink(outputPdfPath);
        
        return {
          success: true,
          pdfBase64,
          calculation,
        };
      } catch (error) {
        // Clean up on error
        try {
          await fs.unlink(inputJsonPath);
          await fs.unlink(outputPdfPath);
        } catch {}
        
        throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
});
