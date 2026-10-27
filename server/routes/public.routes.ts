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

      // Public sanitization: hide collector phone numbers, mask exact private GPS decimals, pass general region
      const sanitizedSourceBatches = sourceBatches.map((b) => {
        const collector = db.getUserById(b.collectorId);
        return {
          batchNumber: b.batchNumber,
          herbName: b.herbName,
          botanicalName: b.botanicalName || 'Unverified Botanical Identity',
          botanicalVerificationStatus: b.botanicalVerificationStatus || (b.status === 'Approved' ? 'Certified Authentic' : 'Unverified'),
          region: b.region,
          collectionDate: b.collectionDate,
          qualityGrade: b.qualityGrade,
          status: b.status,
          collectorAffiliation: collector?.organization || 'Registered Wild Harvest Forager Collective',
        };
      });

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
          microbialCountCfu: t.microbialCountCfu,
          dnaBarcodeVerified: t.dnaBarcodeVerified,
          overallStatus: t.overallStatus,
          certificateHash: t.certificateHash,
        }));

      const allBatchesApproved = sourceBatches.every((b) => b.status === 'Approved' || b.status === 'Formulated');

      return res.json({
        type: 'PRODUCT',
        verified: true,
        certificationStatus: allBatchesApproved ? 'CERTIFIED_AUTHENTIC' : 'PARTIAL_VERIFICATION',
        statusBadge: allBatchesApproved ? 'Authenticity Certified • Retail Ready' : 'Under Review',
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
    const collector = db.getUserById(batch!.collectorId);
    const maskedPhone = collector?.phone
      ? collector.phone.replace(/(\+?\d{2,3}\s?\d{2})\d{4}(\d{2,4})/, '$1****$2')
      : undefined;

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
      leadPpm: t.leadPpm,
      arsenicPpm: t.arsenicPpm,
      cadmiumPpm: t.cadmiumPpm,
      mercuryPpm: t.mercuryPpm,
      microbialCountCfu: t.microbialCountCfu,
      dnaBarcodeVerified: t.dnaBarcodeVerified,
      overallStatus: t.overallStatus,
      certificateHash: t.certificateHash,
      txHash: t.txHash,
    }));

    const isApproved = batch!.status === 'Approved' || batch!.status === 'Formulated';
    const isRejected = batch!.status === 'Rejected';

    let certificationStatus = 'PENDING_VERIFICATION';
    let statusBadge = 'Stage 1: Harvested (Pending Laboratory Assay)';
    let warning: string | undefined =
      'Botanical species identity and purity parameters remain UNVERIFIED until tested by an accredited laboratory.';

    if (isApproved) {
      certificationStatus = 'CERTIFIED_AUTHENTIC';
      statusBadge = 'Authenticity Certified • Quality Passed';
      warning = undefined;
    } else if (isRejected) {
      certificationStatus = 'REJECTED_FAILED_TESTS';
      statusBadge = 'FAILED QUALITY TESTING - QUARANTINED';
      warning =
        'SAFETY ALERT: This herb batch failed laboratory pharmacopoeial standards and has been quarantined. Prohibited from human formulation.';
    } else if (batch!.status === 'InProcessing' || batch!.status === 'Processed') {
      certificationStatus = 'UNDER_PROCESSING';
      statusBadge = 'Stage 2: Processed (Pending Laboratory Assay)';
    } else if (batch!.status === 'InTesting') {
      certificationStatus = 'UNDER_TESTING';
      statusBadge = 'Stage 3: Undergoing Laboratory Analysis';
    }

    return res.json({
      type: 'BATCH',
      verified: true,
      certificationStatus,
      statusBadge,
      warning,
      isApproved,
      record: {
        batchNumber: batch!.batchNumber,
        herbName: batch!.herbName,
        botanicalName: batch!.botanicalName || 'Unverified Botanical Species',
        botanicalVerificationStatus: batch!.botanicalVerificationStatus || (isApproved ? 'Certified Authentic' : 'Unverified'),
        quantity: batch!.quantity || batch!.quantityKg,
        unit: batch!.unit || 'kg',
        quantityKg: batch!.quantityKg,
        collectionDate: batch!.collectionDate,
        collectionMethod: batch!.collectionMethod || 'Wild Collected',
        herbPart: batch!.herbPart || 'Whole Plant',
        region: batch!.region,
        elevationMeters: batch!.elevationMeters,
        harvestMethod: batch!.harvestMethod,
        qualityGrade: batch!.qualityGrade,
        status: batch!.status,
        blockchainTx: batch!.blockchainHash,
        blockNumber: batch!.blockNumber,
        // Publicly masked collector attribution
        collectorAffiliation: collector?.organization || 'Registered Medicinal Plant Forager Cooperative',
        collectorLocationRegion: collector?.location || batch!.region,
        collectorPhoneMasked: maskedPhone,
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
