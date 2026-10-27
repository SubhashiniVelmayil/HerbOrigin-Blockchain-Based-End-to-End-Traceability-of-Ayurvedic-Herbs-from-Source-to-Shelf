export type UserRole =
  | 'Admin'
  | 'Collector'
  | 'Processor'
  | 'LabVerifier'
  | 'Manufacturer'
  | 'Consumer';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  organization?: string;
  location?: string;
  licenseNumber?: string;
  isApproved: boolean;
  createdAt: string;
}

export type BatchStatus =
  | 'Collected'
  | 'InProcessing'
  | 'Processed'
  | 'InTesting'
  | 'Approved'
  | 'Rejected'
  | 'Formulated';

export type CollectionMethod = 'Cultivated' | 'Wild Collected';
export type HerbPart =
  | 'Leaves'
  | 'Roots'
  | 'Stem'
  | 'Bark'
  | 'Flowers'
  | 'Seeds'
  | 'Whole Plant'
  | 'Other';
export type WeightUnit = 'kg' | 'g';
export type LocationSource = 'GPS_DEVICE' | 'MAP_PINPOINT' | 'MANUAL_ENTRY';
export type BotanicalVerificationStatus = 'Unverified' | 'Certified Authentic' | 'Rejected';

export interface HerbBatch {
  id: string;
  batchNumber: string;
  herbName: string;
  botanicalName?: string;
  botanicalVerificationStatus?: BotanicalVerificationStatus;
  collectionMethod?: CollectionMethod;
  herbPart?: HerbPart;
  quantity?: number;
  unit?: WeightUnit;
  quantityKg: number;
  moisturePercent: number;
  collectionDate: string;
  collectionTime?: string;
  collectorId: string;
  collectorName: string;
  gpsLatitude: number;
  gpsLongitude: number;
  locationAccuracyMeters?: number;
  locationSource?: LocationSource;
  isLocationConfirmed?: boolean;
  locationConfirmedAt?: string;
  region: string;
  elevationMeters?: number;
  harvestMethod: string;
  qualityGrade: string;
  photoUrl?: string;
  photoVerificationNote?: string;
  notes?: string;
  farmerNotes?: string;
  status: BatchStatus;
  blockchainHash: string;
  blockNumber: number;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyChainEvent {
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
  isDemo?: boolean;
}

export interface LabTest {
  id: string;
  batchId: string;
  batchNumber: string;
  testDate: string;
  labName: string;
  verifierUserId: string;
  verifierName: string;
  moisturePercent: number;
  pesticideResiduePpm: number;
  heavyMetalsPass: boolean;
  leadPpm?: number;
  arsenicPpm?: number;
  cadmiumPpm?: number;
  mercuryPpm?: number;
  microbialCountCfu?: number;
  dnaBarcodeVerified?: boolean;
  ashValuePercent: number;
  activePhytochemical: string;
  activePhytochemicalPercent: number;
  overallStatus: 'Approved' | 'Rejected' | 'Quarantined';
  notes: string;
  certificateHash: string;
  txHash: string;
  blockNumber: number;
  isDemo?: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  productCode: string;
  productName: string;
  ayurvedicFormulation: string;
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

export interface AuditLog {
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

export interface BlockchainStatus {
  networkName: string;
  chainId: number | null;
  rpcUrlConfigured: boolean;
  contractAddress: string | null;
  explorerUrl: string | null;
  isDemoMode: boolean;
  modeLabel: string;
  description: string;
  contractDeploymentInstructions: string[];
}
