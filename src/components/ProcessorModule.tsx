import React, { useState } from 'react';
import {
  Cog,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  Layers,
  Building,
  Send,
  Droplets,
  ArrowRight,
} from 'lucide-react';
import { HerbBatch } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

interface ProcessorModuleProps {
  batches: HerbBatch[];
  onEventAdded: () => void;
  onOpenAuth: () => void;
}

export const ProcessorModule: React.FC<ProcessorModuleProps> = ({
  batches,
  onEventAdded,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const eligibleBatches = batches.filter((b) => b.status === 'Collected' || b.status === 'InProcessing');
  const availableBatches = eligibleBatches.length > 0 ? eligibleBatches : batches;

  const [selectedBatchId, setSelectedBatchId] = useState<string>(availableBatches[0]?.id || '');
  const [processingType, setProcessingType] = useState('Solar Dehydration & Moisture Reduction');
  const [facilityLocation, setFacilityLocation] = useState(
    user?.location || user?.organization || 'Coimbatore Certified Ayurvedic Primary Processing Center'
  );
  const [temperatureCelsius, setTemperatureCelsius] = useState('42');
  const [reducedMoisture, setReducedMoisture] = useState('7.8');
  const [equipmentDetails, setEquipmentDetails] = useState('Indirect Solar Tunnel Dryer with HEPA air intake');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedBatch = availableBatches.find((b) => b.id === selectedBatchId) || batches.find((b) => b.id === selectedBatchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user) {
      onOpenAuth();
      return;
    }

    if (!selectedBatchId) {
      setErrorMsg('Please select a batch to record processing for.');
      return;
    }

    setLoading(true);

    try {
      const description = `${processingType}: Processed at ${facilityLocation}. Temp: ${temperatureCelsius}°C. Resulting moisture: ${reducedMoisture}%. Equipment: ${equipmentDetails}. ${notes}`;

      await api.addEvent({
        batchId: selectedBatchId,
        eventType: 'PROCESSING',
        title: `Processing: ${processingType}`,
        description,
        location: facilityLocation,
      });

      // Update moisture on batch if lowered
      if (reducedMoisture) {
        await api.updateBatch(selectedBatchId, {
          moisturePercent: parseFloat(reducedMoisture),
          status: 'Processed',
        });
      }

      setSuccessMsg(`Processing step successfully recorded on cryptographic ledger for batch ${selectedBatch?.batchNumber}!`);
      setTimeout(() => {
        onEventAdded();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record processing step.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-linear-to-r from-amber-700 to-orange-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-amber-900/10">
        <div className="flex items-center gap-2 mb-2">
          <Cog className="w-5 h-5 text-amber-300 animate-spin-slow" />
          <span className="text-xs font-semibold tracking-wider uppercase text-amber-200">
            Post-Harvest Processing Station
          </span>
        </div>
        <h2 className="text-2xl font-bold font-serif">{t('processorTitle')}</h2>
        <p className="text-xs sm:text-sm text-amber-100/90 mt-1 max-w-2xl">
          {t('processorSubtitle')}
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
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber} — {b.herbName} ({b.quantityKg} kg, Moisture: {b.moisturePercent}%, Status: {b.status})
              </option>
            ))}
          </select>
        </div>

        {selectedBatch && (
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/70 text-xs text-amber-900 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-zinc-500 block text-[11px]">Species:</span>
              <span className="font-bold">{selectedBatch.herbName}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Harvest Moisture:</span>
              <span className="font-bold">{selectedBatch.moisturePercent}%</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Harvest Region:</span>
              <span className="font-medium truncate block">{selectedBatch.region}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Current Status:</span>
              <span className="font-semibold uppercase text-amber-800">{selectedBatch.status}</span>
            </div>
          </div>
        )}

        {/* Processing Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('processingAction')} *</label>
            <select
              value={processingType}
              onChange={(e) => setProcessingType(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
            >
              <option value="Solar Dehydration & Moisture Reduction">Solar Dehydration & Moisture Reduction</option>
              <option value="Treated Water Ultrasonic Cleaning">Treated Water Ultrasonic Cleaning</option>
              <option value="Coarse Grinding & Pulverizing (Mesh 40-60)">Coarse Grinding & Pulverizing (Mesh 40-60)</option>
              <option value="Optical Density Sorting & Foreign Matter Removal">Optical Density Sorting & Foreign Matter Removal</option>
              <option value="Low-Temperature Vacuum Desiccation">Low-Temperature Vacuum Desiccation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('processingFacility')} *</label>
            <input
              type="text"
              required
              value={facilityLocation}
              onChange={(e) => setFacilityLocation(e.target.value)}
              placeholder="e.g. Coimbatore Certified Ayurvedic Processing Hub"
              className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Temperature & Moisture Reduction */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Drying Temp (°C)</label>
            <div className="relative">
              <Thermometer className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="number"
                step="0.5"
                value={temperatureCelsius}
                onChange={(e) => setTemperatureCelsius(e.target.value)}
                placeholder="42"
                className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
            <span className="text-[10px] text-zinc-500">API Standard: Must stay &lt; 45°C</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Target Reduced Moisture (%)</label>
            <div className="relative">
              <Droplets className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="number"
                step="0.1"
                value={reducedMoisture}
                onChange={(e) => setReducedMoisture(e.target.value)}
                placeholder="7.8"
                className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
            <span className="text-[10px] text-zinc-500">Target: 7-9% safe storage</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Equipment / Apparatus</label>
            <input
              type="text"
              value={equipmentDetails}
              onChange={(e) => setEquipmentDetails(e.target.value)}
              placeholder="e.g. Solar Tunnel Dryer"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Detailed Notes */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('processNotes')}</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-800/20 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Recording...' : t('recordProcessBtn')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
