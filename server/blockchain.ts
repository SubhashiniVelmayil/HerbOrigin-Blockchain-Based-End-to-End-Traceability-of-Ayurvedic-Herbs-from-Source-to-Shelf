import fs from 'node:fs';
import path from 'node:path';
import { db } from './db.js';

export interface BlockchainNetworkConfig {
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

export function getBlockchainStatus(): BlockchainNetworkConfig {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const contractAddress = process.env.HERBORIGIN_CONTRACT_ADDRESS;
  const chainId = process.env.BLOCKCHAIN_CHAIN_ID ? parseInt(process.env.BLOCKCHAIN_CHAIN_ID, 10) : null;

  const isLive = Boolean(rpcUrl && contractAddress);

  if (isLive) {
    return {
      networkName: process.env.BLOCKCHAIN_NETWORK_NAME || 'Polygon Amoy Testnet (Proof of Stake)',
      chainId: chainId || 80002,
      rpcUrlConfigured: true,
      contractAddress: contractAddress || null,
      explorerUrl: `https://amoy.polygonscan.com/address/${contractAddress}`,
      isDemoMode: false,
      modeLabel: 'LIVE_TESTNET',
      description: 'Connected to on-chain smart contract with decentralized gas-metered execution.',
      contractDeploymentInstructions: [],
    };
  }

  return {
    networkName: 'HerbOrigin Cryptographic Merkle Chain (Deterministic Local Ledger)',
    chainId: null,
    rpcUrlConfigured: false,
    contractAddress: null,
    explorerUrl: null,
    isDemoMode: true,
    modeLabel: 'DEMO_MODE_CRYPTOGRAPHIC_LEDGER',
    description:
      'Honest Demo Mode: Currently recording real SHA-256 cryptographic hashes chained into verifiable Merkle blocks on the backend ledger. Smart contract deployment to Polygon Amoy or Sepolia is ready.',
    contractDeploymentInstructions: [
      '1. Open Remix IDE (https://remix.ethereum.org) or your Hardhat/Foundry workspace.',
      '2. Copy the Solidity contract from HerbTraceability.sol (/contracts/HerbTraceability.sol).',
      '3. Compile using Solidity Compiler 0.8.20+ with EVM version "cancun" or "paris".',
      '4. Connect MetaMask to Polygon Amoy Testnet (ChainID 80002) or Ethereum Sepolia.',
      '5. Deploy HerbTraceability.sol and obtain the deployed Contract Address.',
      '6. Set the environment variables in your server configuration:',
      '   - BLOCKCHAIN_RPC_URL="https://rpc-amoy.polygon.technology"',
      '   - HERBORIGIN_CONTRACT_ADDRESS="0xYourDeployedContractAddress"',
      '   - BLOCKCHAIN_NETWORK_NAME="Polygon Amoy Testnet"',
      '   - BLOCKCHAIN_CHAIN_ID=80002',
      '7. Restart server: HerbOrigin will automatically switch from Local Cryptographic Demo Mode to Live On-Chain mode!',
    ],
  };
}

export function getContractSourceCode(): string {
  try {
    const contractPath = path.resolve(process.cwd(), 'contracts', 'HerbTraceability.sol');
    if (fs.existsSync(contractPath)) {
      return fs.readFileSync(contractPath, 'utf-8');
    }
  } catch (err) {
    console.error('Failed to read contract file:', err);
  }
  return '// Solidity contract HerbTraceability.sol';
}

export function verifyRecordOnLedger(identifier: string) {
  const ledger = db.getLedger();
  const batches = db.getBatches();
  const products = db.getProducts();

  const batch = batches.find((b) => b.id === identifier || b.batchNumber === identifier);
  const product = products.find((p) => p.id === identifier || p.productCode === identifier);

  const targetTx = batch ? batch.blockchainHash : product ? product.txHash : identifier;

  for (const block of ledger) {
    const foundTx = block.transactions.find((tx) => tx.txHash === targetTx || tx.entityId === identifier);
    if (foundTx) {
      return {
        verified: true,
        blockHeight: block.blockHeight,
        blockHash: block.blockHash,
        previousHash: block.previousHash,
        merkleRoot: block.merkleRoot,
        timestamp: block.timestamp,
        transaction: foundTx,
        status: 'Cryptographically Verified on Ledger',
      };
    }
  }

  return {
    verified: false,
    message: 'Identifier or transaction hash not found in current ledger blocks',
  };
}
