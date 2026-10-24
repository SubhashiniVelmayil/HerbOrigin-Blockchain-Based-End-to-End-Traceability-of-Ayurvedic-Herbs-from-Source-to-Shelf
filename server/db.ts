import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: 'Admin' | 'Collector' | 'Processor' | 'LabVerifier' | 'Manufacturer' | 'Consumer';
  phone?: string;
  organization?: string;
  location?: string;
  licenseNumber?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface HerbBatchRecord {
  id: string;
  batchNumber: string;
  herbName: string;
  botanicalName: string;
  quantityKg: number;
  moisturePercent: number;
  collectionDate: string;
  collectorId: string;
  collectorName: string;
  gpsLatitude: number;
  gpsLongitude: number;
  region: string;
  elevationMeters?: number;
  harvestMethod: string;
  qualityGrade: string; // 'A', 'B', 'Pending'
  photoUrl?: string;
  notes?: string;
  status: 'Collected' | 'InProcessing' | 'Processed' | 'InTesting' | 'Approved' | 'Rejected' | 'Formulated';
  blockchainHash: string;
  blockNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyChainEventRecord {
  id: string;
  batchId: string;
  batchNumber: string;
  eventType: 'COLLECTION' | 'TRANSPORT' | 'PROCESSING' | 'LAB_TEST' | 'FORMULATION' | 'PACKAGING' | 'DISPATCH';
  title: string;
  description: string;
  location: string;
  recordedByUserId: string;
  recordedByName: string;
  actorRole: string;
  timestamp: string;
  evidenceHash?: string;
  txHash: string;
  blockNumber: number;
}

export interface LabTestRecord {
  id: string;
  batchId: string;
  batchNumber: string;
  testDate: string;
  labName: string;
  verifierUserId: string;
  verifierName: string;
  moisturePercent: number; // Max allowable per API e.g. 8-12%
  pesticideResiduePpm: number; // ppm limit e.g. < 0.05
  heavyMetalsPass: boolean; // Lead, Arsenic, Cadmium, Mercury within limits
  ashValuePercent: number;
  activePhytochemical: string; // e.g. Withanolides A & B
  activePhytochemicalPercent: number; // e.g. 1.85%
  overallStatus: 'Approved' | 'Rejected' | 'Quarantined';
  notes: string;
  certificateHash: string;
  txHash: string;
  blockNumber: number;
  createdAt: string;
}

export interface ProductRecord {
  id: string;
  productCode: string;
  productName: string;
  ayurvedicFormulation: string; // e.g., 'Ashwagandharishta (Asava/Arishta)'
  batchIds: string[];
  batchNumbers: string[];
  manufacturedDate: string;
  expiryDate: string;
  manufacturerUserId: string;
  manufacturerName: string;
  quantityUnits: number;
  packagingType: string;
  dosageInstructions?: string;
  txHash: string;
  blockNumber: number;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  entityType: 'User' | 'Batch' | 'Event' | 'LabTest' | 'Product';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VERIFY' | 'LOGIN' | 'PASSWORD_RESET';
  performedByUserId: string;
  performedByName: string;
  role: string;
  timestamp: string;
  details: string;
}

export interface LedgerBlock {
  blockHeight: number;
  timestamp: string;
  previousHash: string;
  blockHash: string;
  merkleRoot: string;
  transactionsCount: number;
  transactions: {
    txHash: string;
    type: string;
    entityId: string;
    description: string;
    actor: string;
    timestamp: string;
  }[];
}

export interface DatabaseSchema {
  users: UserRecord[];
  batches: HerbBatchRecord[];
  events: SupplyChainEventRecord[];
  labTests: LabTestRecord[];
  products: ProductRecord[];
  auditLogs: AuditLogRecord[];
  ledger: LedgerBlock[];
  passwordResetTokens: { token: string; email: string; expiresAt: string }[];
}

function calculateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

class Database {
  private data: DatabaseSchema;
  private isWriting = false;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadDatabase();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(content);
      } catch (err) {
        console.error('Failed to parse database.json, re-initializing', err);
      }
    }
    const initial = this.getSeedData();
    this.saveDataDirect(initial);
    return initial;
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      this.ensureDirectory();
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }

  public save() {
    this.saveDataDirect(this.data);
  }

  private getSeedData(): DatabaseSchema {
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync('Password123!', salt);
    const collectorPasswordHash = bcrypt.hashSync('Password123!', salt);
    const labPasswordHash = bcrypt.hashSync('Password123!', salt);

    const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const block1Hash = calculateHash(`block_1_${Date.now()}_${genesisHash}`);

    const adminUser: UserRecord = {
      id: 'usr_admin_001',
      fullName: 'Dr. K. Ramanathan',
      email: 'admin@herborigin.gov.in',
      passwordHash: adminPasswordHash,
      role: 'Admin',
      phone: '+91 98401 23456',
      organization: 'National Medicinal Plants Board (NMPB)',
      location: 'New Delhi & Chennai',
      isApproved: true,
      createdAt: new Date().toISOString(),
    };

    const collectorUser: UserRecord = {
      id: 'usr_collector_001',
      fullName: 'Murugan Palanisamy',
      email: 'murugan@westernghatsherbs.org',
      passwordHash: collectorPasswordHash,
      role: 'Collector',
      phone: '+91 94432 10987',
      organization: 'Anaimalai Tribal Herbal Foragers Collective',
      location: 'Valparai, Western Ghats, Tamil Nadu',
      licenseNumber: 'TN-WGF-2024-889',
      isApproved: true,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    };

    const labUser: UserRecord = {
      id: 'usr_lab_001',
      fullName: 'Dr. Ananya Sundaram, Ph.D.',
      email: 'ananya@ayurcertlabs.in',
      passwordHash: labPasswordHash,
      role: 'LabVerifier',
      phone: '+91 98840 99881',
      organization: 'AyurCert Central Phytochemical Testing Labs',
      location: 'Bengaluru, Karnataka',
      licenseNumber: 'NABL-AYUSH-1049',
      isApproved: true,
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    };

    const batch1Id = 'batch_ash_001';
    const batch1Tx = calculateHash(`tx_batch_ash_001_${collectorUser.id}`);
    const batch1: HerbBatchRecord = {
      id: batch1Id,
      batchNumber: 'HO-ASH-2025-001',
      herbName: 'Ashwagandha (Indian Ginseng)',
      botanicalName: 'Withania somnifera',
      quantityKg: 120,
      moisturePercent: 8.4,
      collectionDate: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0],
      collectorId: collectorUser.id,
      collectorName: collectorUser.fullName,
      gpsLatitude: 10.3256,
      gpsLongitude: 76.9538,
      region: 'Anaimalai Rainforest Reserve, Valparai, Tamil Nadu',
      elevationMeters: 1050,
      harvestMethod: 'Sustainable Hand-Harvest of Mature Roots (Wild-Crafted)',
      qualityGrade: 'A',
      photoUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80',
      notes: 'Harvested under waxing moon as per Vrkshayurveda traditions. Sun-dried on bamboo mats.',
      status: 'Approved',
      blockchainHash: batch1Tx,
      blockNumber: 1,
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    };

    const batch2Id = 'batch_tulsi_002';
    const batch2Tx = calculateHash(`tx_batch_tulsi_002_${collectorUser.id}`);
    const batch2: HerbBatchRecord = {
      id: batch2Id,
      batchNumber: 'HO-TUL-2025-002',
      herbName: 'Krishna Tulsi (Holy Basil)',
      botanicalName: 'Ocimum sanctum',
      quantityKg: 85,
      moisturePercent: 9.1,
      collectionDate: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
      collectorId: collectorUser.id,
      collectorName: collectorUser.fullName,
      gpsLatitude: 11.4064,
      gpsLongitude: 76.6932,
      region: 'Nilgiri Biosphere Reserve, Tamil Nadu',
      elevationMeters: 1800,
      harvestMethod: 'Selective Leaf Plucking at Dawn',
      qualityGrade: 'A',
      photoUrl: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=800&q=80',
      notes: 'High essential oil concentration; dark purple Krishna variety.',
      status: 'InTesting',
      blockchainHash: batch2Tx,
      blockNumber: 1,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    };

    const events: SupplyChainEventRecord[] = [
      {
        id: 'evt_001',
        batchId: batch1.id,
        batchNumber: batch1.batchNumber,
        eventType: 'COLLECTION',
        title: 'Wild Harvest Completed & Geo-Tagged',
        description: 'Roots carefully excavated, soil gently shaken off, washed in natural stream water.',
        location: batch1.region,
        recordedByUserId: collectorUser.id,
        recordedByName: collectorUser.fullName,
        actorRole: 'Collector',
        timestamp: new Date(Date.now() - 86400000 * 6).toISOString(),
        txHash: batch1Tx,
        blockNumber: 1,
      },
      {
        id: 'evt_002',
        batchId: batch1.id,
        batchNumber: batch1.batchNumber,
        eventType: 'PROCESSING',
        title: 'Shade Drying & Primary Pulverizing',
        description: 'Moisture reduced to 8.4% in temperature-monitored solar dehydrator (<45°C) to preserve withanolides.',
        location: 'Coimbatore Herbal Processing Hub',
        recordedByUserId: collectorUser.id,
        recordedByName: collectorUser.fullName,
        actorRole: 'Processor',
        timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
        txHash: calculateHash(`tx_evt_proc_${batch1.id}`),
        blockNumber: 1,
      },
      {
        id: 'evt_003',
        batchId: batch1.id,
        batchNumber: batch1.batchNumber,
        eventType: 'LAB_TEST',
        title: 'Ayurvedic Pharmacopoeia Compliance Certificate Issued',
        description: 'Passed HPLC analysis for Withanolides (2.12%), zero heavy metals, zero pesticide residue.',
        location: labUser.organization || 'AyurCert Labs',
        recordedByUserId: labUser.id,
        recordedByName: labUser.fullName,
        actorRole: 'LabVerifier',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        txHash: calculateHash(`tx_evt_lab_${batch1.id}`),
        blockNumber: 1,
      },
    ];

    const labTests: LabTestRecord[] = [
      {
        id: 'lab_test_001',
        batchId: batch1.id,
        batchNumber: batch1.batchNumber,
        testDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
        labName: 'AyurCert Central Phytochemical Testing Labs (NABL Accredited)',
        verifierUserId: labUser.id,
        verifierName: labUser.fullName,
        moisturePercent: 8.4,
        pesticideResiduePpm: 0.002, // Well below 0.05 limit
        heavyMetalsPass: true,
        ashValuePercent: 5.8,
        activePhytochemical: 'Withanolides A & B (HPLC)',
        activePhytochemicalPercent: 2.12,
        overallStatus: 'Approved',
        notes: 'Exceeds standard pharmacopoeial purity threshold of 1.5%. Premium therapeutic grade.',
        certificateHash: calculateHash(`cert_${batch1.batchNumber}_${labUser.id}`),
        txHash: calculateHash(`tx_lab_${batch1.batchNumber}`),
        blockNumber: 1,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ];

    const products: ProductRecord[] = [
      {
        id: 'prod_ash_001',
        productCode: 'PRD-ASH-CHURNA-500',
        productName: 'Shuddha Ashwagandha Root Churna (Grade A Organic)',
        ayurvedicFormulation: 'Ashwagandha Churna (Single Herb Powder)',
        batchIds: [batch1.id],
        batchNumbers: [batch1.batchNumber],
        manufacturedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 86400000 * 365 * 2).toISOString().split('T')[0],
        manufacturerUserId: adminUser.id,
        manufacturerName: 'Vaidya Herbals Ayurvedic Pharmacy Ltd.',
        quantityUnits: 500,
        packagingType: 'Amber Glass Jar with Nitrogen Flush Tamper-Evident Seal',
        dosageInstructions: '3-6g with warm cow milk or honey twice daily before meals.',
        txHash: calculateHash(`prod_tx_${batch1.id}`),
        blockNumber: 1,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    const ledger: LedgerBlock[] = [
      {
        blockHeight: 0,
        timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        blockHash: genesisHash,
        merkleRoot: 'GENESIS_BLOCK_ROOT_HERBORIGIN',
        transactionsCount: 1,
        transactions: [
          {
            txHash: '0x0000genesis',
            type: 'GENESIS',
            entityId: 'ROOT',
            description: 'HerbOrigin Ayurvedic Blockchain Genesis Block Initialized',
            actor: 'SYSTEM_ORACLE',
            timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
          },
        ],
      },
      {
        blockHeight: 1,
        timestamp: new Date(Date.now() - 86400000 * 6).toISOString(),
        previousHash: genesisHash,
        blockHash: block1Hash,
        merkleRoot: calculateHash(`${batch1Tx}+${batch2Tx}`),
        transactionsCount: 3,
        transactions: [
          {
            txHash: batch1Tx,
            type: 'BATCH_REGISTRATION',
            entityId: batch1.id,
            description: `Batch ${batch1.batchNumber} created by ${collectorUser.fullName}`,
            actor: collectorUser.id,
            timestamp: batch1.createdAt,
          },
          {
            txHash: batch2Tx,
            type: 'BATCH_REGISTRATION',
            entityId: batch2.id,
            description: `Batch ${batch2.batchNumber} created by ${collectorUser.fullName}`,
            actor: collectorUser.id,
            timestamp: batch2.createdAt,
          },
        ],
      },
    ];

    return {
      users: [adminUser, collectorUser, labUser],
      batches: [batch1, batch2],
      events,
      labTests,
      products,
      auditLogs: [
        {
          id: 'log_001',
          entityType: 'User',
          entityId: adminUser.id,
          action: 'CREATE',
          performedByUserId: 'SYSTEM',
          performedByName: 'System Init',
          role: 'Admin',
          timestamp: new Date().toISOString(),
          details: 'Default Administrator account bootstrapped',
        },
      ],
      ledger,
      passwordResetTokens: [],
    };
  }

  // Database Accessors
  public getUsers(): UserRecord[] {
    return this.data.users;
  }

  public getUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): UserRecord | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public addUser(user: UserRecord): UserRecord {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<UserRecord>): UserRecord | undefined {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.save();
    return this.data.users[idx];
  }

  public getBatches(): HerbBatchRecord[] {
    return this.data.batches;
  }

  public getBatchById(idOrBatchNumber: string): HerbBatchRecord | undefined {
    return this.data.batches.find(
      (b) => b.id === idOrBatchNumber || b.batchNumber.toLowerCase() === idOrBatchNumber.toLowerCase()
    );
  }

  public addBatch(batch: HerbBatchRecord): HerbBatchRecord {
    this.data.batches.unshift(batch);
    this.save();
    return batch;
  }

  public updateBatch(id: string, updates: Partial<HerbBatchRecord>): HerbBatchRecord | undefined {
    const idx = this.data.batches.findIndex((b) => b.id === id);
    if (idx === -1) return undefined;
    this.data.batches[idx] = {
      ...this.data.batches[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.batches[idx];
  }

  public deleteBatch(id: string): boolean {
    const idx = this.data.batches.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    this.data.batches.splice(idx, 1);
    // Also clean up events or keep audit
    this.save();
    return true;
  }

  public getEvents(batchId?: string): SupplyChainEventRecord[] {
    if (batchId) {
      return this.data.events.filter((e) => e.batchId === batchId);
    }
    return this.data.events;
  }

  public addEvent(event: SupplyChainEventRecord): SupplyChainEventRecord {
    this.data.events.push(event);
    this.save();
    return event;
  }

  public getLabTests(batchId?: string): LabTestRecord[] {
    if (batchId) {
      return this.data.labTests.filter((t) => t.batchId === batchId);
    }
    return this.data.labTests;
  }

  public addLabTest(test: LabTestRecord): LabTestRecord {
    this.data.labTests.unshift(test);
    this.save();
    return test;
  }

  public getProducts(): ProductRecord[] {
    return this.data.products;
  }

  public getProductById(idOrCode: string): ProductRecord | undefined {
    return this.data.products.find(
      (p) => p.id === idOrCode || p.productCode.toLowerCase() === idOrCode.toLowerCase()
    );
  }

  public addProduct(product: ProductRecord): ProductRecord {
    this.data.products.unshift(product);
    this.save();
    return product;
  }

  public getAuditLogs(): AuditLogRecord[] {
    return this.data.auditLogs;
  }

  public addAuditLog(log: Omit<AuditLogRecord, 'id' | 'timestamp'>): AuditLogRecord {
    const newLog: AuditLogRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.auditLogs.unshift(newLog);
    // Keep max 200 logs
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs.pop();
    }
    this.save();
    return newLog;
  }

  public getLedger(): LedgerBlock[] {
    return this.data.ledger;
  }

  public recordLedgerTransaction(tx: {
    type: string;
    entityId: string;
    description: string;
    actor: string;
  }): { txHash: string; blockNumber: number } {
    const txHash = '0x' + calculateHash(`${tx.type}_${tx.entityId}_${Date.now()}_${tx.actor}`);
    const latestBlock = this.data.ledger[this.data.ledger.length - 1];

    const newTx = {
      txHash,
      type: tx.type,
      entityId: tx.entityId,
      description: tx.description,
      actor: tx.actor,
      timestamp: new Date().toISOString(),
    };

    if (latestBlock.transactions.length < 5) {
      latestBlock.transactions.push(newTx);
      latestBlock.transactionsCount = latestBlock.transactions.length;
      latestBlock.merkleRoot = calculateHash(
        latestBlock.transactions.map((t) => t.txHash).join('+')
      );
      this.save();
      return { txHash, blockNumber: latestBlock.blockHeight };
    }

    // Mine new block
    const newHeight = latestBlock.blockHeight + 1;
    const newBlockHash =
      '0x' + calculateHash(`block_${newHeight}_${latestBlock.blockHash}_${Date.now()}`);
    const newBlock: LedgerBlock = {
      blockHeight: newHeight,
      timestamp: new Date().toISOString(),
      previousHash: latestBlock.blockHash,
      blockHash: newBlockHash,
      merkleRoot: calculateHash(txHash),
      transactionsCount: 1,
      transactions: [newTx],
    };
    this.data.ledger.push(newBlock);
    this.save();
    return { txHash, blockNumber: newHeight };
  }

  public savePasswordResetToken(email: string, token: string, expiresAt: string) {
    this.data.passwordResetTokens = this.data.passwordResetTokens.filter(
      (t) => t.email.toLowerCase() !== email.toLowerCase()
    );
    this.data.passwordResetTokens.push({ email, token, expiresAt });
    this.save();
  }

  public verifyPasswordResetToken(token: string): string | null {
    const record = this.data.passwordResetTokens.find(
      (t) => t.token === token && new Date(t.expiresAt) > new Date()
    );
    return record ? record.email : null;
  }

  public removePasswordResetToken(token: string) {
    this.data.passwordResetTokens = this.data.passwordResetTokens.filter((t) => t.token !== token);
    this.save();
  }
}

export const db = new Database();
