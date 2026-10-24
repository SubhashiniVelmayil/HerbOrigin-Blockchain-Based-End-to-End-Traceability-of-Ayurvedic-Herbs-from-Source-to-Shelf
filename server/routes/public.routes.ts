import { Router } from 'express';
import { db } from '../db.js';
import { verifyRecordOnLedger, getBlockchainStatus } from '../blockchain.js';

export const publicRouter = Router();

// GET Public verification endpoint for QR code scans
publicRouter.get('/verify/:identifier', (req, res) => {
  try {
    const { identifier } = req.params;

    // Check if it's a batch or product
    const batch = db.getBatchById(identifier);
    const product = db.getProductById(identifier);

    if (!batch && !product) {
      return res.status(404).json({
        verified: false,
        error: `No authenticated Ayurvedic record found for code '${identifier}'. Beware of counterfeit products.`,
      });
    }

    const blockchainStatus = getBlockchainStatus();
    const ledgerVerification = verifyRecordOnLedger(identifier);

    if (product) {
      // Find source batches
      const sourceBatches = db.getBatches().filter((b) => product.batchIds.includes(b.id));

      // Public sanitization: hide collector phone numbers, exact private GPS decimals if sensitive, pass general region
      const sanitizedSourceBatches = sourceBatches.map((b) => ({
        batchNumber: b.batchNumber,
        herbName: b.herbName,
        botanicalName: b.botanicalName,
        region: b.region,
        collectionDate: b.collectionDate,
        qualityGrade: b.qualityGrade,
        status: b.status,
      }));

      // Gather certified lab tests for source batches
      const labTests = db
        .getLabTests()
        .filter((t) => product.batchIds.includes(t.batchId))
        .map((t) => ({
          batchNumber: t.batchNumber,
          labName: t.labName,
          testDate: t.testDate,
          activePhytochemical: t.activePhytochemical,
          activePhytochemicalPercent: t.activePhytochemicalPercent,
          moisturePercent: t.moisturePercent,
          pesticideResiduePpm: t.pesticideResiduePpm,
          heavyMetalsPass: t.heavyMetalsPass,
          overallStatus: t.overallStatus,
          certificateHash: t.certificateHash,
        }));

      return res.json({
        type: 'PRODUCT',
        verified: true,
        record: {
          productCode: product.productCode,
          productName: product.productName,
          ayurvedicFormulation: product.ayurvedicFormulation,
          manufacturedDate: product.manufacturedDate,
          expiryDate: product.expiryDate,
          manufacturerName: product.manufacturerName,
          packagingType: product.packagingType,
          dosageInstructions: product.dosageInstructions,
          blockchainTx: product.txHash,
          blockNumber: product.blockNumber,
        },
        sourceBatches: sanitizedSourceBatches,
        labTests,
        ledgerVerification,
        blockchainStatus,
      });
    }

    // It is a single batch
    const events = db.getEvents(batch!.id).map((e) => ({
      eventType: e.eventType,
      title: e.title,
      description: e.description,
      location: e.location,
      timestamp: e.timestamp,
      actorRole: e.actorRole,
      txHash: e.txHash,
    }));

    const labTests = db.getLabTests(batch!.id).map((t) => ({
      labName: t.labName,
      testDate: t.testDate,
      activePhytochemical: t.activePhytochemical,
      activePhytochemicalPercent: t.activePhytochemicalPercent,
      moisturePercent: t.moisturePercent,
      pesticideResiduePpm: t.pesticideResiduePpm,
      heavyMetalsPass: t.heavyMetalsPass,
      overallStatus: t.overallStatus,
      certificateHash: t.certificateHash,
      txHash: t.txHash,
    }));

    return res.json({
      type: 'BATCH',
      verified: true,
      record: {
        batchNumber: batch!.batchNumber,
        herbName: batch!.herbName,
        botanicalName: batch!.botanicalName,
        quantityKg: batch!.quantityKg,
        collectionDate: batch!.collectionDate,
        region: batch!.region,
        elevationMeters: batch!.elevationMeters,
        harvestMethod: batch!.harvestMethod,
        qualityGrade: batch!.qualityGrade,
        status: batch!.status,
        blockchainTx: batch!.blockchainHash,
        blockNumber: batch!.blockNumber,
        // Publicly approved collector identification (e.g. collective name or masked name)
        collectorAffiliation: 'Registered Wild Harvest Forager Collective',
      },
      events,
      labTests,
      ledgerVerification,
      blockchainStatus,
    });
  } catch (err: any) {
    console.error('Public verify error:', err);
    return res.status(500).json({ error: 'Failed to complete public traceability verification.' });
  }
});
