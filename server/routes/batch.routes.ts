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
          (b.botanicalName && b.botanicalName.toLowerCase().includes(q)) ||
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

// POST Create new Batch - Farmer-Friendly Herb Registration
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
      quantity,
      quantityKg,
      unit,
      moisturePercent,
      collectionDate,
      collectionTime,
      collectionMethod,
      herbPart,
      farmerNotes,
      notes,
      gpsLatitude,
      gpsLongitude,
      locationAccuracyMeters,
      locationSource,
      isLocationConfirmed,
      region,
      elevationMeters,
      harvestMethod,
      qualityGrade,
      photoUrl,
    } = req.body;

    // A. Herb Information Validation
    if (!herbName || typeof herbName !== 'string' || herbName.trim().length === 0) {
      return res.status(400).json({ error: 'Common / Local Herb Name is required.' });
    }

    // Botanical name is strictly OPTIONAL for farmers
    const trimmedBotanical = botanicalName && typeof botanicalName === 'string' && botanicalName.trim().length > 0
      ? botanicalName.trim()
      : undefined;

    // B. Harvest Information Validation
    const rawQty = quantity !== undefined ? parseFloat(quantity) : parseFloat(quantityKg);
    if (isNaN(rawQty) || rawQty <= 0) {
      return res.status(400).json({ error: 'Harvest quantity must be a positive numeric value greater than zero.' });
    }

    const weightUnit: 'kg' | 'g' = unit === 'g' ? 'g' : 'kg';
    const normalizedQuantityKg = weightUnit === 'g' ? Math.round((rawQty / 1000) * 1000) / 1000 : rawQty;

    const parsedMoisture = moisturePercent !== undefined && !isNaN(parseFloat(moisturePercent))
      ? parseFloat(moisturePercent)
      : 8.5; // reasonable standard safe baseline if freshly harvested

    if (!collectionDate) {
      return res.status(400).json({ error: 'Harvest / Collection date is required.' });
    }

    // C. Accurate Location & Confirmation Validation
    const parsedLat = parseFloat(gpsLatitude ?? req.body.location?.latitude ?? req.body.latitude);
    const parsedLng = parseFloat(gpsLongitude ?? req.body.location?.longitude ?? req.body.longitude);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({
        error: 'Collection location coordinates are required. Please use Get Current Location or pin on the interactive map.',
      });
    }

    const confirmed = isLocationConfirmed ?? req.body.location?.isLocationConfirmed ?? req.body.locationConfirmed;
    if (!confirmed) {
      return res.status(400).json({
        error: 'Please confirm the collection location by clicking "Confirm Collection Location" before saving.',
      });
    }

    const regionText = region || req.body.location?.region || 'Local Collection Area';
    if (!regionText || typeof regionText !== 'string' || regionText.trim().length === 0) {
      return res.status(400).json({ error: 'Collection location description or regional name is required.' });
    }

    // Generate collision-resistant database-backed Batch ID (e.g. HERB-2026-000001)
    const batchNumber = db.generateNextBatchNumber();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Record on cryptographic blockchain ledger
    const ledgerTx = db.recordLedgerTransaction({
      type: 'BATCH_REGISTRATION',
      entityId: batchId,
      description: `New herb batch ${batchNumber} (${herbName.trim()}) harvested by ${user.fullName} at ${region.trim()}`,
      actor: user.id,
    });

    const newBatch: HerbBatchRecord = {
      id: batchId,
      batchNumber,
      herbName: herbName.trim(),
      botanicalName: trimmedBotanical,
      botanicalVerificationStatus: 'Unverified',
      collectionMethod: collectionMethod === 'Cultivated' ? 'Cultivated' : 'Wild Collected',
      herbPart: herbPart || 'Whole Plant',
      quantity: rawQty,
      unit: weightUnit,
      quantityKg: normalizedQuantityKg,
      moisturePercent: parsedMoisture,
      collectionDate: String(collectionDate).split('T')[0],
      collectionTime: collectionTime ? String(collectionTime).trim() : undefined,
      collectorId: user.id,
      collectorName: user.fullName,
      gpsLatitude: parsedLat,
      gpsLongitude: parsedLng,
      locationAccuracyMeters: locationAccuracyMeters ? parseFloat(locationAccuracyMeters) : undefined,
      locationSource: locationSource || 'GPS_DEVICE',
      isLocationConfirmed: true,
      locationConfirmedAt: new Date().toISOString(),
      region: (regionText || region || 'Local Collection Area').trim(),
      elevationMeters: elevationMeters ? parseFloat(elevationMeters) : undefined,
      harvestMethod: harvestMethod ? String(harvestMethod).trim() : (collectionMethod === 'Cultivated' ? 'Sustainable Organic Farm Cultivation' : 'Sustainable Hand-Harvested Wild Foraging'),
      qualityGrade: qualityGrade || 'Pending',
      photoUrl: photoUrl || undefined,
      photoVerificationNote: photoUrl ? 'Field Documentation - Unverified Botanical Identification' : undefined,
      farmerNotes: farmerNotes ? String(farmerNotes).trim() : undefined,
      notes: notes ? String(notes).trim() : (farmerNotes ? String(farmerNotes).trim() : undefined),
      status: 'Collected',
      blockchainHash: ledgerTx.txHash,
      blockNumber: ledgerTx.blockNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.addBatch(newBatch);

    // Initial Stage 1: Harvesting / Collection event
    const initialEvent: SupplyChainEventRecord = {
      id: `evt_${Date.now()}_harvest`,
      batchId: newBatch.id,
      batchNumber: newBatch.batchNumber,
      eventType: 'COLLECTION',
      title: 'Stage 1: Harvesting / Collection',
      description: `Herb harvested by ${user.fullName}. Quantity: ${rawQty} ${weightUnit}. Method: ${newBatch.collectionMethod}. Part: ${newBatch.herbPart}. Location: ${newBatch.region} [GPS: ${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)}${locationAccuracyMeters ? `, ±${Math.round(locationAccuracyMeters)}m` : ''}]. Botanical status: Unverified.`,
      location: newBatch.region,
      recordedByUserId: user.id,
      recordedByName: user.fullName,
      actorRole: user.role,
      timestamp: new Date().toISOString(),
      evidenceHash: photoUrl ? 'FIELD_PHOTO_ATTACHED' : undefined,
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
      details: `Created batch ${newBatch.batchNumber} (${newBatch.herbName}) with txHash ${ledgerTx.txHash}`,
    });

    return res.status(201).json({
      message: `Herb batch registered successfully with unique ID ${newBatch.batchNumber}!`,
      batch: newBatch,
      batchNumber: newBatch.batchNumber,
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
      quantity,
      quantityKg,
      unit,
      moisturePercent,
      harvestMethod,
      qualityGrade,
      notes,
      farmerNotes,
      status,
      region,
      elevationMeters,
      collectionMethod,
      herbPart,
    } = req.body;

    const updates: Partial<HerbBatchRecord> = {};
    if (herbName) updates.herbName = String(herbName).trim();
    if (botanicalName !== undefined) updates.botanicalName = String(botanicalName).trim() || undefined;
    if (collectionMethod) updates.collectionMethod = collectionMethod;
    if (herbPart) updates.herbPart = herbPart;

    if (quantity !== undefined) {
      const q = parseFloat(quantity);
      if (!isNaN(q) && q > 0) {
        updates.quantity = q;
        const u = unit || existing.unit || 'kg';
        updates.unit = u;
        updates.quantityKg = u === 'g' ? Math.round((q / 1000) * 1000) / 1000 : q;
      }
    } else if (quantityKg !== undefined) {
      const q = parseFloat(quantityKg);
      if (!isNaN(q) && q > 0) {
        updates.quantityKg = q;
        updates.quantity = q;
      }
    }

    if (moisturePercent !== undefined) updates.moisturePercent = parseFloat(moisturePercent);
    if (harvestMethod !== undefined) updates.harvestMethod = String(harvestMethod).trim();
    if (qualityGrade !== undefined) updates.qualityGrade = String(qualityGrade).trim();
    if (notes !== undefined) updates.notes = String(notes).trim();
    if (farmerNotes !== undefined) updates.farmerNotes = String(farmerNotes).trim();
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
