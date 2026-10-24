import { Router, Response } from 'express';
import { db, ProductRecord, SupplyChainEventRecord } from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';

export const productRouter = Router();

// GET all products
productRouter.get('/', (req, res) => {
  try {
    const products = db.getProducts();
    return res.json({ products, total: products.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve products.' });
  }
});

// GET product by ID or Code
productRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const product = db.getProductById(id);
  if (!product) {
    return res.status(404).json({ error: `Product '${id}' not found.` });
  }

  // Also include the linked batch details
  const batches = db.getBatches().filter((b) => product.batchIds.includes(b.id));

  return res.json({ product, batches });
});

// POST Create new Product (Manufacturer or Admin)
productRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== 'Manufacturer' && user.role !== 'Admin') {
      return res.status(403).json({
        error: `Only licensed Manufacturers or Admins can register finished Ayurvedic formulations. Current role: ${user.role}`,
      });
    }

    const {
      productName,
      ayurvedicFormulation,
      batchIds,
      quantityUnits,
      packagingType,
      dosageInstructions,
      shelfLifeMonths,
    } = req.body;

    if (!productName || typeof productName !== 'string' || productName.trim().length === 0) {
      return res.status(400).json({ error: 'Ayurvedic product commercial name is required.' });
    }

    if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
      return res.status(400).json({ error: 'At least one source herb batch must be linked to this formulation.' });
    }

    // Verify batches exist
    const allBatches = db.getBatches();
    const linkedBatches = allBatches.filter((b) => batchIds.includes(b.id));

    if (linkedBatches.length === 0) {
      return res.status(400).json({ error: 'None of the provided source batch IDs exist.' });
    }

    // Warning / check if any unapproved batch is being formulated
    const unapproved = linkedBatches.filter((b) => b.status !== 'Approved');
    if (unapproved.length > 0 && user.role !== 'Admin') {
      return res.status(400).json({
        error: `Batch ${unapproved.map((b) => b.batchNumber).join(', ')} is not yet laboratory certified (Approved). Finished formulation requires certified source ingredients.`,
      });
    }

    const parsedUnits = parseInt(quantityUnits, 10);
    if (isNaN(parsedUnits) || parsedUnits <= 0) {
      return res.status(400).json({ error: 'Valid manufactured quantity units count is required.' });
    }

    const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const productCode = `PRD-${productName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'AYU')}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const months = shelfLifeMonths ? parseInt(shelfLifeMonths, 10) : 24;
    const manufacturedDate = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 86400000 * 30 * months).toISOString().split('T')[0];

    const ledgerTx = db.recordLedgerTransaction({
      type: 'MANUFACTURING_PRODUCT',
      entityId: productId,
      description: `Product ${productCode} (${productName}) manufactured from batches: ${linkedBatches.map((b) => b.batchNumber).join(', ')}`,
      actor: user.id,
    });

    const newProduct: ProductRecord = {
      id: productId,
      productCode,
      productName: productName.trim(),
      ayurvedicFormulation: ayurvedicFormulation ? String(ayurvedicFormulation).trim() : 'Classical Ayurvedic Churna/Vati/Asava',
      batchIds: linkedBatches.map((b) => b.id),
      batchNumbers: linkedBatches.map((b) => b.batchNumber),
      manufacturedDate,
      expiryDate: expiry,
      manufacturerUserId: user.id,
      manufacturerName: user.fullName,
      quantityUnits: parsedUnits,
      packagingType: packagingType ? String(packagingType).trim() : 'Eco-Friendly Tamper-Proof Amber Glass',
      dosageInstructions: dosageInstructions ? String(dosageInstructions).trim() : undefined,
      txHash: ledgerTx.txHash,
      blockNumber: ledgerTx.blockNumber,
      createdAt: new Date().toISOString(),
    };

    db.addProduct(newProduct);

    const userRecord = db.getUserById(user.id);

    // Update batch status to Formulated
    for (const b of linkedBatches) {
      db.updateBatch(b.id, { status: 'Formulated' });

      const formEvent: SupplyChainEventRecord = {
        id: `evt_form_${Date.now()}_${b.id}`,
        batchId: b.id,
        batchNumber: b.batchNumber,
        eventType: 'FORMULATION',
        title: `Compounded into Finished Product ${newProduct.productCode}`,
        description: `Formulated into ${newProduct.productName} by ${user.fullName} (${userRecord?.organization || 'Licensed Ayurvedic Pharmacy'}).`,
        location: userRecord?.location || 'GMP-Certified Manufacturing Unit',
        recordedByUserId: user.id,
        recordedByName: user.fullName,
        actorRole: user.role,
        timestamp: new Date().toISOString(),
        txHash: ledgerTx.txHash,
        blockNumber: ledgerTx.blockNumber,
      };
      db.addEvent(formEvent);
    }

    db.addAuditLog({
      entityType: 'Product',
      entityId: newProduct.id,
      action: 'CREATE',
      performedByUserId: user.id,
      performedByName: user.fullName,
      role: user.role,
      details: `Registered finished product ${newProduct.productCode} (${newProduct.productName})`,
    });

    return res.status(201).json({
      message: 'Ayurvedic product registered, batches linked, and QR verification issued.',
      product: newProduct,
    });
  } catch (err: any) {
    console.error('Error creating product:', err);
    return res.status(500).json({ error: 'Failed to create product.' });
  }
});
