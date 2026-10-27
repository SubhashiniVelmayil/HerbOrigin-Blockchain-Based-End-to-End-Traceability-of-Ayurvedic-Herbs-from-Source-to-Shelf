import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Leaf,
  FlaskConical,
  Clock,
  MapPin,
  Cpu,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

interface PublicVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const PublicVerifyModal: React.FC<PublicVerifyModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
}) => {
  const { t } = useLanguage();

  const [inputCode, setInputCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode);
      handleVerify(initialCode);
    }
  }, [initialCode]);

  if (!isOpen) return null;

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || inputCode).trim();
    if (!code) {
      setError('Please enter a batch number or product code to verify.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.verifyPublicQr(code);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Verification record not found or unauthenticated code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-zinc-950 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-200">
              HerbOrigin Public Verification Portal
            </span>
          </div>
          <h2 className="text-xl font-bold font-serif">{t('publicVerifyTitle')}</h2>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
            {t('publicVerifySubtitle')}
          </p>
        </div>

        {/* Search input bar */}
        <div className="p-6 bg-zinc-50 border-b border-zinc-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="e.g. HO-ASH-2025-001 or PRD-ASH-CHURNA-500"
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? 'Verifying...' : t('verifyBtn')}
            </button>
          </form>

          {/* Helper hint */}
          <div className="flex items-center justify-between mt-2.5 text-xs text-zinc-500">
            <span>Enter any authentic Herb Batch Number (e.g. <code className="font-mono text-zinc-700 font-semibold">HERB-2026-...</code>) or Product Code (<code className="font-mono text-zinc-700 font-semibold">PRD-...</code>)</span>
          </div>
        </div>

        {/* Result Area */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
          {error && (
            <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs space-y-2 text-center animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-rose-900">{t('counterfeitWarning')}</h4>
              <p className="text-rose-700 max-w-md mx-auto leading-relaxed">{error}</p>
              <div className="pt-2 text-[11px] text-rose-600 font-mono">
                Code verified against immutable blockchain state: Unauthenticated / Not Recorded.
              </div>
            </div>
          )}

          {result && result.verified && (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
              {/* Authenticity / Status Card */}
              <div
                className={`border-2 rounded-3xl p-6 shadow-sm relative overflow-hidden ${
                  result.certificationStatus === 'CERTIFIED_AUTHENTIC'
                    ? 'bg-linear-to-br from-emerald-50 to-teal-50 border-emerald-400'
                    : result.certificationStatus === 'REJECTED_FAILED_TESTS'
                    ? 'bg-linear-to-br from-rose-50 to-orange-50 border-rose-400'
                    : 'bg-linear-to-br from-amber-50 to-yellow-50 border-amber-400'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          result.certificationStatus === 'CERTIFIED_AUTHENTIC'
                            ? 'bg-emerald-500 animate-pulse'
                            : result.certificationStatus === 'REJECTED_FAILED_TESTS'
                            ? 'bg-rose-500'
                            : 'bg-amber-500 animate-ping'
                        }`}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 font-mono">
                        {result.type === 'PRODUCT' ? 'Finished Ayurvedic Medicine' : 'Raw Medicinal Herb Batch'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 font-serif">
                      {result.record.productName || result.record.herbName}
                    </h3>
                    <p className="text-xs text-zinc-700 font-mono italic">
                      {result.record.botanicalName || result.record.ayurvedicFormulation}
                    </p>
                  </div>

                  <div className="flex flex-col items-start sm:items-end">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 text-white rounded-full text-xs font-bold shadow-xs ${
                        result.certificationStatus === 'CERTIFIED_AUTHENTIC'
                          ? 'bg-emerald-700'
                          : result.certificationStatus === 'REJECTED_FAILED_TESTS'
                          ? 'bg-rose-700'
                          : 'bg-amber-600'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{result.statusBadge}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1 font-mono">
                      Code: {result.record.productCode || result.record.batchNumber}
                    </span>
                  </div>
                </div>

                {/* Honest Warning if Unverified or Rejected */}
                {result.warning && (
                  <div className="mt-3 p-3 rounded-xl bg-white/80 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>{result.warning}</span>
                  </div>
                )}

                {/* Privacy Protected Safe Location Banner */}
                <div className="mt-4 pt-3 border-t border-zinc-200/60 flex items-start justify-between gap-2 text-[11px] text-zinc-700">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>
                      Origin: <strong>{result.record.region}</strong> • Cooperative:{' '}
                      <strong>{result.record.collectorAffiliation}</strong>
                    </span>
                  </div>
                  {result.record.collectorPhoneMasked && (
                    <span className="font-mono text-zinc-500">Phone: {result.record.collectorPhoneMasked}</span>
                  )}
                </div>
              </div>

              {/* Lab Test Results */}
              {result.labTests && result.labTests.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-blue-600" />
                    {t('labCertificateTitle')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.labTests.map((tItem: any, idx: number) => (
                      <div key={idx} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-900">{tItem.labName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                            {tItem.overallStatus}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600">
                          <div>Moisture: {tItem.moisturePercent}%</div>
                          <div>Pesticide: {tItem.pesticideResiduePpm} ppm</div>
                          <div>Heavy Metals: {tItem.heavyMetalsPass ? 'Passed (ICP-MS)' : 'Failed'}</div>
                          <div className="font-semibold text-blue-800">
                            {tItem.activePhytochemical}: {tItem.activePhytochemicalPercent}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Batches if it's a finished product */}
              {result.sourceBatches && result.sourceBatches.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                    Source Wild-Harvested Herbs Linked
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.sourceBatches.map((sb: any, idx: number) => (
                      <div key={idx} className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-xs">
                        <span className="font-mono text-[10px] text-emerald-800 font-bold">{sb.batchNumber}</span>
                        <p className="font-bold text-zinc-900">{sb.herbName}</p>
                        <p className="text-[11px] italic font-mono text-zinc-600">{sb.botanicalName}</p>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          Origin: {sb.region} • Harvest Date: {sb.collectionDate}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provenance Blockchain Timeline */}
              {result.events && result.events.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    {t('timelineTitle')}
                  </h4>
                  <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                    {result.events.map((evt: any, idx: number) => (
                      <div key={idx} className="relative text-xs">
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-200" />
                        <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-900">{evt.title}</span>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(evt.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-zinc-600 text-[11px] mt-0.5">{evt.description}</p>
                          <div className="mt-1 text-[10px] font-mono text-emerald-800 truncate">
                            Tx: {evt.txHash}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cryptographic Ledger Proof Box */}
              <div className="bg-zinc-900 text-zinc-200 p-4 rounded-2xl text-xs space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[11px] text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    Cryptographic Ledger Verification Status
                  </span>
                  <span>Block #{result.record.blockNumber}</span>
                </div>
                <div className="text-[10px] text-zinc-400 break-all">
                  Transaction Hash: {result.record.blockchainTx}
                </div>
                <p className="text-[10px] text-zinc-400 pt-1">
                  Chained on HerbOrigin Merkle Tree with deterministic SHA-256 block hashing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
