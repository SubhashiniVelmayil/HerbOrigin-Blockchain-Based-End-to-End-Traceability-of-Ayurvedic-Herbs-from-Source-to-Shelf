import { Router } from 'express';
import { db } from '../db.js';
import {
  getBlockchainStatus,
  getContractSourceCode,
  verifyRecordOnLedger,
} from '../blockchain.js';

export const blockchainRouter = Router();

// GET honest blockchain network status
blockchainRouter.get('/status', (req, res) => {
  const status = getBlockchainStatus();
  return res.json({ status });
});

// GET all blocks and ledger state
blockchainRouter.get('/blocks', (req, res) => {
  const ledger = db.getLedger();
  return res.json({ blocks: ledger, totalBlocks: ledger.length });
});

// GET Solidity smart contract source
blockchainRouter.get('/contract', (req, res) => {
  const sourceCode = getContractSourceCode();
  return res.json({
    contractName: 'HerbTraceability.sol',
    compilerVersion: '0.8.20',
    license: 'MIT',
    sourceCode,
  });
});

// GET Cryptographic verification for batch or product
blockchainRouter.get('/verify/:identifier', (req, res) => {
  const { identifier } = req.params;
  const result = verifyRecordOnLedger(identifier);
  return res.json({ result });
});
