import { Router, Response } from 'express';
import { db, HerbBatchRecord, SupplyChainEventRecord } from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

export const batchRouter = Router();

// GET all batches with search, filters, pagination
batchRouter.get('/', (req, res) => {
  try {
    const { search, status, herbName, collectorId } = req.query;
    let list = db.getBatches();

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.batchNumber.toLowerCase().includes(q) ||
          b.herbName.toLowerCase().includes(q) ||
          b.botanicalName.toLowerCase().includes(q) ||
          b.region.toLowerCase().includes(q) ||
          b.collectorName.toLowerCase().includes(q)
      );
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      list = list.filter((b) => b.status === status);
    }

    if (herbName && typeof herbName === 'string' && herbName !== 'ALL') {
      list = list.filter((b) => b.herbName.toLowerCase().includes(herbName.toLowerCase()));
    }

    if (collectorId && typeof collectorId === 'string') {
      list = list.filter((b) => b.collectorId === collectorId);
    }

    return res.json({ batches: list, total: list.length });
  } catch (err: any) {
    console.error('Error fetching batches:', err);
    return res.status(500).json({ error: 'Failed to retrieve herb batches.' });
  }
});

// GET batch by ID or Batch Number
batchRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const batch = db.getBatchById(id);

  if (!batch) {
    return res.status(404).json({ error: `Herb batch '${id}' was not found.` });
  }

  const events = db.getEvents(batch.id);
  const labTests = db.getLabTests(batch.id);

  return res.json({ batch, events, labTests });
});

// POST Create new Batch
batchRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== 'Collector' && user.role !== 'Admin') {
      return res.status(403).json({
        error: `Only registered Collectors or Admins can register new herb batches. Current role: ${user.role}`,
      });
    }

    const {
      herbName,
      botanicalName,
      quantityKg,
      moisturePercent,
      collectionDate,
      gpsLatitude,
      gpsLongitude,
      region,
      elevationMeters,
      harvestMethod,
      qualityGrade,
      photoUrl,
      notes,
    } = req.body;

    // Validation
    if (!herbName || typeof herbName !== 'string' || herbName.trim().length === 0) {
      return res.status(400).json({ error: 'Herb Common Name is required.' });
    }

    if (!botanicalName || typeof botanicalName !== 'string' || botanicalName.trim().length === 0) {
      return res.status(400).json({ error: 'Botanical / Ayurvedic species name is required.' });
    }

    const parsedQty = parseFloat(quantityKg);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a valid positive number in kilograms.' });
    }

    const parsedMoisture = parseFloat(moisturePercent);
    if (isNaN(parsedMoisture) || parsedMoisture < 0 || parsedMoisture > 100) {
      return res.status(400).json({ error: 'Moisture percentage must be between 0 and 100%.' });
    }

    if (!collectionDate) {
      return res.status(400).json({ error: 'Harvest / Collection date is required.' });
    }

    const parsedLat = parseFloat(gpsLatitude);
    const parsedLng = parseFloat(gpsLongitude);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ error: 'Valid GPS latitude and longitude coordinates are required for geo-tagging.' });
    }

    if (!region || typeof region !== 'string' || region.trim().length === 0) {
      return res.status(400).json({ error: 'Geographical origin region is required.' });
    }

    // Generate unique batch number
    const prefix = herbName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'HRB');
    const year = new Date().getFullYear();
    const count = db.getBatches().length + 1;
    const batchNumber = `HO-${prefix}-${year}-${String(count).padStart(3, '0')}`;

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Record on cryptographic blockchain ledger
    const ledgerTx = db.recordLedgerTransaction({
      type: 'BATCH_REGISTRATION',
      entityId: batchId,
      description: `New wild herb batch ${batchNumber} (${herbName}) harvested at ${region}`,
      actor: user.id,
    });

    const newBatch: HerbBatchRecord = {
      id: batchId,
      batchNumber,
      herbName: herbName.trim(),
      botanicalName: botanicalName.trim(),
      quantityKg: parsedQty,
      moisturePercent: parsedMoisture,
      collectionDate: String(collectionDate).split('T')[0],
      collectorId: user.id,
      collectorName: user.fullName,
      gpsLatitude: parsedLat,
      gpsLongitude: parsedLng,
      region: region.trim(),
      elevationMeters: elevationMeters ? parseFloat(elevationMeters) : undefined,
      harvestMethod: harvestMethod ? String(harvestMethod).trim() : 'Manual Sustainable Wild Plucking',
      qualityGrade: qualityGrade || 'Pending',
      photoUrl: photoUrl || undefined,
      notes: notes ? String(notes).trim() : undefined,
      status: 'Collected',
      blockchainHash: ledgerTx.txHash,
      blockNumber: ledgerTx.blockNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.addBatch(newBatch);

    // Initial event
    const initialEvent: SupplyChainEventRecord = {
      id: `evt_${Date.now()}_harvest`,
      batchId: newBatch.id,
      batchNumber: newBatch.batchNumber,
      eventType: 'COLLECTION',
      title: 'Harvest Tagged & Geolocation Bound',
      description: `Harvested by ${user.fullName} (${parsedQty} kg) at coordinates [${parsedLat}, ${parsedLng}].`,
      location: newBatch.region,
      recordedByUserId: user.id,
      recordedByName: user.fullName,
      actorRole: user.role,
      timestamp: new Date().toISOString(),
      txHash: ledgerTx.txHash,
      blockNumber: ledgerTx.blockNumber,
    };
    db.addEvent(initialEvent);

    db.addAuditLog({
      entityType: 'Batch',
      entityId: newBatch.id,
      action: 'CREATE',
      performedByUserId: user.id,
      performedByName: user.fullName,
      role: user.role,
      details: `Created batch ${newBatch.batchNumber} with txHash ${ledgerTx.txHash}`,
    });

    return res.status(201).json({
      message: 'Herb batch registered successfully with blockchain provenance entry.',
      batch: newBatch,
      event: initialEvent,
    });
  } catch (err: any) {
    console.error('Error creating batch:', err);
    return res.status(500).json({ error: 'Failed to create herb batch.' });
  }
});

// PUT Update existing Batch
batchRouter.put('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const existing = db.getBatchById(id);

    if (!existing) {
      return res.status(404).json({ error: `Batch ${id} not found.` });
    }

    // Role check: Admin can update any; Collector can only update own batches
    if (user.role !== 'Admin' && existing.collectorId !== user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this herb batch.' });
    }

    // If batch is already Approved by lab, non-admin cannot tamper with physical measurements
    if (existing.status === 'Approved' && user.role !== 'Admin') {
      return res.status(400).json({
        error: 'This batch has already been certified by Laboratory Verification. Verified records are locked against unverified modifications.',
      });
    }

    const {
      herbName,
      botanicalName,
      quantityKg,
      moisturePercent,
      harvestMethod,
      qualityGrade,
      notes,
      status,
      region,
      elevationMeters,
    } = req.body;

    const updates: Partial<HerbBatchRecord> = {};
    if (herbName) updates.herbName = String(herbName).trim();
    if (botanicalName) updates.botanicalName = String(botanicalName).trim();
    if (quantityKg !== undefined) updates.quantityKg = parseFloat(quantityKg);
    if (moisturePercent !== undefined) updates.moisturePercent = parseFloat(moisturePercent);
    if (harvestMethod !== undefined) updates.harvestMethod = String(harvestMethod).trim();
    if (qualityGrade !== undefined) updates.qualityGrade = String(qualityGrade).trim();
    if (notes !== undefined) updates.notes = String(notes).trim();
    if (region !== undefined) updates.region = String(region).trim();
    if (elevationMeters !== undefined) updates.elevationMeters = parseFloat(elevationMeters);
    if (status && user.role === 'Admin') updates.status = status;

    const updated = db.updateBatch(existing.id, updates);

    // Record ledger update
    const ledgerTx = db.recordLedgerTransaction({
      type: 'BATCH_UPDATE',
      entityId: existing.id,
      description: `Batch ${existing.batchNumber} updated by ${user.fullName}`,
      actor: user.id,
    });

    db.addAuditLog({
      entityType: 'Batch',
      entityId: existing.id,
      action: 'UPDATE',
      performedByUserId: user.id,
      performedByName: user.fullName,
      role: user.role,
      details: `Updated batch ${existing.batchNumber}: fields changed [${Object.keys(updates).join(', ')}]`,
    });

    return res.json({
      message: 'Batch updated successfully.',
      batch: updated,
      txHash: ledgerTx.txHash,
    });
  } catch (err: any) {
    console.error('Error updating batch:', err);
    return res.status(500).json({ error: 'Failed to update batch.' });
  }
});

// DELETE Batch (Authorized Admin or original collector if unapproved)
batchRouter.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const existing = db.getBatchById(id);

    if (!existing) {
      return res.status(404).json({ error: `Batch ${id} not found.` });
    }

    if (user.role !== 'Admin' && existing.collectorId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this batch.' });
    }

    if (existing.status === 'Approved' && user.role !== 'Admin') {
      return res.status(400).json({
        error: 'Approved batches with lab certificates cannot be deleted. Contact Admin to archive.',
      });
    }

    const batchNumber = existing.batchNumber;
    const success = db.deleteBatch(existing.id);

    if (!success) {
      return res.status(500).json({ error: 'Failed to delete record.' });
    }

    db.addAuditLog({
      entityType: 'Batch',
      entityId: existing.id,
      action: 'DELETE',
      performedByUserId: user.id,
      performedByName: user.fullName,
      role: user.role,
      details: `Batch ${batchNumber} deleted from active database`,
    });

    return res.json({ message: `Herb batch ${batchNumber} has been permanently deleted.` });
  } catch (err: any) {
    console.error('Error deleting batch:', err);
    return res.status(500).json({ error: 'Failed to delete batch.' });
  }
});
