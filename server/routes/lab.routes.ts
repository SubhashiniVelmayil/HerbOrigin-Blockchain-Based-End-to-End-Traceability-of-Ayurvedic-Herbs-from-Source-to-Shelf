import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db, LabTestRecord, SupplyChainEventRecord } from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

export const labRouter = Router();

// GET all lab tests
labRouter.get('/', (req, res) => {
  try {
    const list = db.getLabTests();
    return res.json({ labTests: list, total: list.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve laboratory tests.' });
  }
});

// GET lab tests for a batch
labRouter.get('/batch/:batchId', (req, res) => {
  const { batchId } = req.params;
  const tests = db.getLabTests(batchId);
  return res.json({ labTests: tests });
});

// POST Record Lab Test Result
labRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== 'LabVerifier' && user.role !== 'Admin') {
      return res.status(403).json({
        error: `Only accredited Laboratory Verifiers or Admins can submit chemical verification certificates. Current role: ${user.role}`,
      });
    }

    const {
      batchId,
      labName,
      moisturePercent,
      pesticideResiduePpm,
      heavyMetalsPass,
      leadPpm,
      arsenicPpm,
      cadmiumPpm,
      mercuryPpm,
      microbialCountCfu,
      dnaBarcodeVerified,
      ashValuePercent,
      activePhytochemical,
      activePhytochemicalPercent,
      overallStatus,
      confirmedBotanicalName,
      notes,
    } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: 'batchId is required.' });
    }

    const batch = db.getBatchById(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Referenced herb batch not found.' });
    }

    const effectiveLabName = (labName && typeof labName === 'string' && labName.trim()) || user.organization || `${user.fullName} Lab`;
    if (!effectiveLabName) {
      return res.status(400).json({ error: 'Accredited testing laboratory name is required.' });
    }

    const parsedMoisture = parseFloat(moisturePercent);
    if (isNaN(parsedMoisture) || parsedMoisture < 0 || parsedMoisture > 100) {
      return res.status(400).json({ error: 'Valid moisture percentage is required.' });
    }

    const parsedPesticide = parseFloat(pesticideResiduePpm);
    if (isNaN(parsedPesticide) || parsedPesticide < 0) {
      return res.status(400).json({ error: 'Valid pesticide residue value in PPM is required.' });
    }

    const parsedAsh = parseFloat(ashValuePercent);
    if (isNaN(parsedAsh) || parsedAsh < 0) {
      return res.status(400).json({ error: 'Valid total ash percentage is required.' });
    }

    const parsedPhytoPercent = parseFloat(activePhytochemicalPercent);
    if (isNaN(parsedPhytoPercent) || parsedPhytoPercent < 0) {
      return res.status(400).json({ error: 'Valid active phytochemical percentage is required.' });
    }

    const parsedMicrobial = microbialCountCfu !== undefined ? parseFloat(microbialCountCfu) : undefined;
    const parsedLead = leadPpm !== undefined ? parseFloat(leadPpm) : undefined;
    const parsedArsenic = arsenicPpm !== undefined ? parseFloat(arsenicPpm) : undefined;
    const parsedCadmium = cadmiumPpm !== undefined ? parseFloat(cadmiumPpm) : undefined;
    const parsedMercury = mercuryPpm !== undefined ? parseFloat(mercuryPpm) : undefined;

    const validStatuses = ['Approved', 'Rejected', 'Quarantined'];
    const status = validStatuses.includes(overallStatus) ? overallStatus : 'Approved';

    const testId = `lab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const certHash = crypto
      .createHash('sha256')
      .update(`CERT_${batch.batchNumber}_${effectiveLabName}_${parsedMoisture}_${parsedPhytoPercent}_${Date.now()}`)
      .digest('hex');

    const ledgerTx = db.recordLedgerTransaction({
      type: 'LAB_VERIFICATION',
      entityId: testId,
      description: `Lab test [${status}] by ${effectiveLabName} for batch ${batch.batchNumber}: Phytochemical ${activePhytochemical} = ${parsedPhytoPercent}%`,
      actor: user.id,
    });

    const newLabTest: LabTestRecord = {
      id: testId,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      testDate: new Date().toISOString().split('T')[0],
      labName: effectiveLabName,
      verifierUserId: user.id,
      verifierName: user.fullName,
      moisturePercent: parsedMoisture,
      pesticideResiduePpm: parsedPesticide,
      heavyMetalsPass: Boolean(heavyMetalsPass),
      leadPpm: parsedLead,
      arsenicPpm: parsedArsenic,
      cadmiumPpm: parsedCadmium,
      mercuryPpm: parsedMercury,
      microbialCountCfu: parsedMicrobial,
      dnaBarcodeVerified: Boolean(dnaBarcodeVerified),
      ashValuePercent: parsedAsh,
      activePhytochemical: activePhytochemical ? String(activePhytochemical).trim() : 'Active Phytochemical Marker (HPLC)',
      activePhytochemicalPercent: parsedPhytoPercent,
      overallStatus: status as any,
      notes: notes ? String(notes).trim() : 'Complies with Ayurvedic Pharmacopoeia of India (API) standards.',
      certificateHash: certHash,
      txHash: ledgerTx.txHash,
      blockNumber: ledgerTx.blockNumber,
      createdAt: new Date().toISOString(),
    };

    db.addLabTest(newLabTest);

    // Update batch status and botanical verification status
    const newBatchStatus = status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'InTesting';
    const batchUpdates: Partial<HerbBatchRecord> = { status: newBatchStatus };
    if (status === 'Approved') {
      batchUpdates.botanicalVerificationStatus = 'Certified Authentic';
      if (confirmedBotanicalName && typeof confirmedBotanicalName === 'string' && confirmedBotanicalName.trim().length > 0) {
        batchUpdates.botanicalName = confirmedBotanicalName.trim();
      }
    } else if (status === 'Rejected') {
      batchUpdates.botanicalVerificationStatus = 'Rejected';
    }
    db.updateBatch(batch.id, batchUpdates);

    // Add supply chain event
    const event: SupplyChainEventRecord = {
      id: `evt_lab_${Date.now()}`,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      eventType: 'LAB_TEST',
      title: `Lab Verification: ${status.toUpperCase()}`,
      description: `Tested by ${labName}. Purity status: ${status}. Active marker: ${newLabTest.activePhytochemical} (${parsedPhytoPercent}%). Heavy metals: ${heavyMetalsPass ? 'Passed' : 'Failed'}. Microbial: ${parsedMicrobial !== undefined ? parsedMicrobial + ' CFU/g' : 'Tested'}. Certificate: ${certHash.substring(0, 16)}...`,
      location: labName,
      recordedByUserId: user.id,
      recordedByName: user.fullName,
      actorRole: user.role,
      timestamp: new Date().toISOString(),
      evidenceHash: certHash,
      txHash: ledgerTx.txHash,
      blockNumber: ledgerTx.blockNumber,
    };
    db.addEvent(event);

    db.addAuditLog({
      entityType: 'LabTest',
      entityId: newLabTest.id,
      action: 'VERIFY',
      performedByUserId: user.id,
      performedByName: user.fullName,
      role: user.role,
      details: `Submitted lab verification for ${batch.batchNumber}: Status=${status}, Phytochemical=${parsedPhytoPercent}%`,
    });

    return res.status(201).json({
      message: 'Laboratory test certificate issued and recorded on blockchain ledger.',
      labTest: newLabTest,
      batchStatus: newBatchStatus,
    });
  } catch (err: any) {
    console.error('Error recording lab test:', err);
    return res.status(500).json({ error: 'Failed to record laboratory verification.' });
  }
});
