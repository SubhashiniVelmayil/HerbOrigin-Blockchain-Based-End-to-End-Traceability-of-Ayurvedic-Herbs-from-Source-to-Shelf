import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  FileCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Hash,
  Clock,
  Sparkles,
} from 'lucide-react';
import { LedgerBlock, BlockchainStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

export const BlockchainExplorer: React.FC = () => {
  const { t } = useLanguage();

  const [status, setStatus] = useState<BlockchainStatus | null>(null);
  const [blocks, setBlocks] = useState<LedgerBlock[]>([]);
  const [contractCode, setContractCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([api.getBlockchainStatus(), api.getLedgerBlocks(), api.getContractSource()])
      .then(([statusRes, blocksRes, contractRes]) => {
        if (!isMounted) return;
        setStatus(statusRes.status);
        setBlocks(blocksRes.blocks);
        setContractCode(contractRes.sourceCode);
      })
      .catch((err) => console.error('Error fetching blockchain state:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyContract = () => {
    navigator.clipboard.writeText(contractCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadContract = () => {
    const blob = new Blob([contractCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'HerbTraceability.sol';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-linear-to-r from-zinc-900 via-zinc-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-300">
            Cryptographic Provenance Engine
          </span>
        </div>
        <h2 className="text-2xl font-bold font-serif">{t('blockchainTitle')}</h2>
        <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl">
          {t('blockchainSubtitle')}
        </p>
      </div>

      {/* Honest Network Status Card */}
      {status && (
        <div
          className={`p-6 rounded-3xl border shadow-xs space-y-3 ${
            status.isDemoMode
              ? 'bg-amber-50/70 border-amber-300 text-amber-950'
              : 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  {status.modeLabel}
                </span>
                <h3 className="text-base font-bold font-serif">{status.networkName}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">
                Total Blocks: {blocks.length}
              </span>
              {status.contractAddress && (
                <a
                  href={status.explorerUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1 hover:underline"
                >
                  <span>{status.contractAddress.substring(0, 10)}...</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <p className="text-xs text-zinc-700 leading-relaxed">{status.description}</p>
        </div>
      )}

      {/* Live Blocks Explorer */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-serif text-zinc-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700" />
            <span>{t('blocksExplorer')} ({blocks.length} Blocks Mined)</span>
          </h3>
          <span className="text-[11px] text-zinc-500 font-mono">Consensus: SHA-256 Chained Hash</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading ledger blocks...</div>
        ) : (
          <div className="space-y-3">
            {blocks
              .slice()
              .reverse()
              .map((block) => {
                const isExpanded = expandedBlock === block.blockHeight;
                return (
                  <div
                    key={block.blockHeight}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50/60 overflow-hidden text-xs transition-colors hover:border-zinc-300"
                  >
                    <div
                      onClick={() => setExpandedBlock(isExpanded ? null : block.blockHeight)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center font-mono text-sm border border-emerald-200">
                          #{block.blockHeight}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-900">
                              Block #{block.blockHeight}
                            </span>
                            <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded font-mono">
                              {block.transactionsCount} txs
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-zinc-500 truncate max-w-xs block">
                            Hash: {block.blockHash.substring(0, 20)}...
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          {new Date(block.timestamp).toLocaleTimeString()}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-zinc-200 space-y-3 bg-zinc-50 text-[11px] font-mono">
                        <div>
                          <span className="text-zinc-500 block">Current Block Hash:</span>
                          <span className="break-all text-zinc-800 font-semibold">{block.blockHash}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Previous Block Hash:</span>
                          <span className="break-all text-zinc-600">{block.previousHash}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Merkle Tree Root:</span>
                          <span className="break-all text-emerald-700 font-bold">{block.merkleRoot}</span>
                        </div>

                        {/* Transactions inside this block */}
                        <div className="pt-2">
                          <span className="text-zinc-600 font-bold block mb-1">
                            Block Transactions ({block.transactions.length}):
                          </span>
                          <div className="space-y-1.5">
                            {block.transactions.map((tx, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-2.5 rounded-lg border border-zinc-200 text-[10px] space-y-0.5"
                              >
                                <div className="flex items-center justify-between text-zinc-500">
                                  <span className="font-bold text-zinc-800">{tx.type}</span>
                                  <span>{new Date(tx.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-zinc-700 font-sans">{tx.description}</p>
                                <div className="text-emerald-700 truncate">TxHash: {tx.txHash}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Smart Contract Source Code Viewer */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold font-serif text-zinc-900 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-700" />
              <span>{t('smartContractTitle')}</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Production Solidity Smart Contract (EVM / Polygon / Ethereum)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyContract}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-200"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadContract}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('downloadContract')}</span>
            </button>
          </div>
        </div>

        {/* Contract Code Pre block */}
        <div className="bg-zinc-950 text-zinc-300 rounded-2xl p-4 overflow-x-auto text-xs font-mono max-h-96 border border-zinc-800 leading-relaxed">
          <pre>{contractCode}</pre>
        </div>
      </div>

      {/* Step by Step Deployment Guide */}
      {status && status.contractDeploymentInstructions.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold font-serif text-zinc-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <span>{t('deploymentGuide')}</span>
          </h3>
          <p className="text-xs text-zinc-600">
            Follow these exact instructions to deploy HerbOrigin onto a public Ethereum testnet (Polygon Amoy or Sepolia) and switch out of Demo Mode:
          </p>

          <ol className="space-y-2 text-xs text-zinc-700 bg-zinc-50 p-5 rounded-2xl border border-zinc-200 list-decimal list-inside font-medium leading-relaxed">
            {status.contractDeploymentInstructions.map((step, idx) => (
              <li key={idx} className="pl-1">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
