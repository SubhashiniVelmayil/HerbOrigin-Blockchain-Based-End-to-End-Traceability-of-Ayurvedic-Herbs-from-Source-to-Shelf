import React, { useState } from 'react';
import {
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Send,
  Sparkles,
  Droplets,
  Microscope,
} from 'lucide-react';
import { HerbBatch } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

interface LabVerifierModuleProps {
  batches: HerbBatch[];
  onTestSubmitted: () => void;
  onOpenAuth: () => void;
}

export const LabVerifierModule: React.FC<LabVerifierModuleProps> = ({
  batches,
  onTestSubmitted,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [labName, setLabName] = useState(
    user?.organization || 'AyurCert Central Phytochemical Testing Labs (NABL Accredited)'
  );
  const [moisturePercent, setMoisturePercent] = useState('8.2');
  const [pesticideResiduePpm, setPesticideResiduePpm] = useState('0.003');
  const [heavyMetalsPass, setHeavyMetalsPass] = useState(true);
  const [ashValuePercent, setAshValuePercent] = useState('5.4');
  const [activePhytochemical, setActivePhytochemical] = useState('Withanolides A & B (HPLC)');
  const [activePhytochemicalPercent, setActivePhytochemicalPercent] = useState('2.15');
  const [overallStatus, setOverallStatus] = useState<'Approved' | 'Rejected' | 'Quarantined'>('Approved');
  const [notes, setNotes] = useState(
    'Meets and exceeds Ayurvedic Pharmacopoeia of India (API) standards. Purity: Grade A organic medicinal quality.'
  );

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  const handleBatchChange = (id: string) => {
    setSelectedBatchId(id);
    const b = batches.find((x) => x.id === id);
    if (b) {
      if (b.herbName.toLowerCase().includes('ashwagandha')) {
        setActivePhytochemical('Withanolides A & B (HPLC)');
        setActivePhytochemicalPercent('2.15');
      } else if (b.herbName.toLowerCase().includes('tulsi')) {
        setActivePhytochemical('Eugenol & Ursolic Acid (GC-MS)');
        setActivePhytochemicalPercent('1.45');
      } else if (b.herbName.toLowerCase().includes('brahmi')) {
        setActivePhytochemical('Bacosides A & B (HPTLC)');
        setActivePhytochemicalPercent('3.80');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user) {
      onOpenAuth();
      return;
    }

    if (!selectedBatchId) {
      setErrorMsg('Please select a batch to test.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        batchId: selectedBatchId,
        labName: labName.trim(),
        moisturePercent: parseFloat(moisturePercent),
        pesticideResiduePpm: parseFloat(pesticideResiduePpm),
        heavyMetalsPass,
        ashValuePercent: parseFloat(ashValuePercent),
        activePhytochemical: activePhytochemical.trim(),
        activePhytochemicalPercent: parseFloat(activePhytochemicalPercent),
        overallStatus,
        notes: notes.trim(),
      };

      const res = await api.addLabTest(payload);
      setSuccessMsg(`Laboratory Certificate issued! Batch ${selectedBatch?.batchNumber} status set to ${res.batchStatus}.`);
      setTimeout(() => {
        onTestSubmitted();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit laboratory test certificate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-linear-to-r from-blue-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-900/10">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical className="w-5 h-5 text-blue-300" />
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-200">
            NABL / AYUSH Quality Certification
          </span>
        </div>
        <h2 className="text-2xl font-bold font-serif">{t('labTitle')}</h2>
        <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-2xl">
          {t('labSubtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xs space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Batch Selection */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('selectBatch')} *</label>
          <select
            value={selectedBatchId}
            onChange={(e) => handleBatchChange(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber} — {b.herbName} ({b.botanicalName}) [Current Status: {b.status}]
              </option>
            ))}
          </select>
        </div>

        {selectedBatch && (
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/70 text-xs text-blue-900 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-zinc-500 block text-[11px]">Species:</span>
              <span className="font-bold">{selectedBatch.herbName}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Harvest Date:</span>
              <span className="font-medium">{selectedBatch.collectionDate}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Region:</span>
              <span className="font-medium truncate block">{selectedBatch.region}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Initial Grade:</span>
              <span className="font-bold">{selectedBatch.qualityGrade}</span>
            </div>
          </div>
        )}

        {/* Accredited Lab Name */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('testingLabName')} *</label>
          <input
            type="text"
            required
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            placeholder="e.g. AyurCert Central Phytochemical Testing Labs (NABL Accredited)"
            className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Section: Physicochemical Analysis */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <Microscope className="w-4 h-4 text-blue-600" />
            Physicochemical Parameters (Ayurvedic Pharmacopoeia)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('testedMoisture')} *</label>
              <input
                type="number"
                step="0.01"
                required
                value={moisturePercent}
                onChange={(e) => setMoisturePercent(e.target.value)}
                placeholder="8.2"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('pesticideResidue')} *</label>
              <input
                type="number"
                step="0.001"
                required
                value={pesticideResiduePpm}
                onChange={(e) => setPesticideResiduePpm(e.target.value)}
                placeholder="0.003"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('ashValue')} *</label>
              <input
                type="number"
                step="0.1"
                required
                value={ashValuePercent}
                onChange={(e) => setAshValuePercent(e.target.value)}
                placeholder="5.4"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Heavy Metals Compliance Switch */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-800">{t('heavyMetalsCheck')}</p>
              <p className="text-[11px] text-zinc-500">
                Lead (&lt;10ppm), Arsenic (&lt;3ppm), Cadmium (&lt;0.3ppm), Mercury (&lt;1ppm) tested via ICP-MS
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={heavyMetalsPass}
                onChange={(e) => setHeavyMetalsPass(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Section: Phytochemical Assay */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Active Phytochemical Assay (High-Performance Liquid Chromatography)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('activeMarkerName')} *</label>
              <input
                type="text"
                required
                value={activePhytochemical}
                onChange={(e) => setActivePhytochemical(e.target.value)}
                placeholder="e.g. Withanolides A & B (HPLC)"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('activeMarkerPercent')} *</label>
              <input
                type="number"
                step="0.01"
                required
                value={activePhytochemicalPercent}
                onChange={(e) => setActivePhytochemicalPercent(e.target.value)}
                placeholder="2.15"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Decision & Notes */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('verificationDecision')} *</label>
              <select
                value={overallStatus}
                onChange={(e) => setOverallStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-bold"
              >
                <option value="Approved">Approved (Certified Therapeutic Grade)</option>
                <option value="Rejected">Rejected (Exceeds Contaminant Limits)</option>
                <option value="Quarantined">Quarantined (Secondary Assay Required)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('labNotes')}</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-800/20 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{loading ? 'Certifying...' : t('submitLabCertBtn')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
