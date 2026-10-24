import { Router, Response } from 'express';
import { db, SupplyChainEventRecord } from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

export const eventRouter = Router();

// GET events for a batch
eventRouter.get('/batch/:batchId', (req, res) => {
  const { batchId } = req.params;
  const events = db.getEvents(batchId);
  return res.json({ events });
});

// POST add a supply chain event
eventRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { batchId, eventType, title, description, location } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: 'batchId is required.' });
    }

    const batch = db.getBatchById(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Referenced herb batch not found.' });
    }

    const validEventTypes: SupplyChainEventRecord['eventType'][] = [
      'COLLECTION',
      'TRANSPORT',
      'PROCESSING',
      'LAB_TEST',
      'FORMULATION',
      'PACKAGING',
      'DISPATCH',
    ];

    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        error: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`,
      });
    }

    // Role verification for specific events
    if (eventType === 'PROCESSING' && user.role !== 'Processor' && user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only Processors or Admins can record processing operations.' });
    }

    if (eventType === 'LAB_TEST' && user.role !== 'LabVerifier' && user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only Laboratory Verifiers or Admins can record laboratory events.' });
    }

    if (
      (eventType === 'FORMULATION' || eventType === 'PACKAGING' || eventType === 'DISPATCH') &&
      user.role !== 'Manufacturer' &&
      user.role !== 'Admin'
    ) {
      return res.status(403).json({ error: 'Only Manufacturers or Admins can record manufacturing/dispatch events.' });
    }

    // Record on ledger
    const ledgerTx = db.recordLedgerTransaction({
      type: `EVENT_${eventType}`,
      entityId: batch.id,
      description: `${eventType}: ${title || description} for batch ${batch.batchNumber}`,
      actor: user.id,
    });

    const userRecord = db.getUserById(user.id);

    const newEvent: SupplyChainEventRecord = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      eventType,
      title: title || `${eventType} Event Recorded`,
      description: description || 'Details logged on cryptographic supply chain ledger.',
      location: location || userRecord?.location || 'Herbal Processing Facility',
      recordedByUserId: user.id,
      recordedByName: user.fullName,
      actorRole: user.role,
      timestamp: new Date().toISOString(),
      txHash: ledgerTx.txHash,
      blockNumber: ledgerTx.blockNumber,
    };

    db.addEvent(newEvent);

    // Update batch status if needed
    if (eventType === 'PROCESSING' && batch.status === 'Collected') {
      db.updateBatch(batch.id, { status: 'InProcessing' });
    }

    db.addAuditLog({
      entityType: 'Event',
      entityId: newEvent.id,
      action: 'CREATE',
      performedByUserId: user.id,
      performedByName: user.fullName,
      role: user.role,
      details: `Added ${eventType} event for ${batch.batchNumber}`,
    });

    return res.status(201).json({
      message: 'Supply chain event recorded and anchored to blockchain ledger.',
      event: newEvent,
    });
  } catch (err: any) {
    console.error('Error adding supply chain event:', err);
    return res.status(500).json({ error: 'Failed to record event.' });
  }
});
