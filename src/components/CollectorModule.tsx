import React, { useState, useEffect } from 'react';
import {
  Leaf,
  MapPin,
  Mic,
  MicOff,
  Camera,
  Calendar,
  Scale,
  Droplets,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Navigation,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { OfflineManager } from '../services/offline';

interface CollectorModuleProps {
  onBatchCreated: () => void;
  onOpenAuth: () => void;
  editingBatch?: any;
  onCancelEdit?: () => void;
}

const HERB_SUGGESTIONS = [
  {
    commonName: 'Ashwagandha (Indian Ginseng)',
    botanicalName: 'Withania somnifera',
    defaultRegion: 'Anaimalai Rainforest Reserve, Tamil Nadu',
    idealMoisture: 8.5,
    method: 'Sustainable Root Extraction leaving crown buds intact',
  },
  {
    commonName: 'Krishna Tulsi (Holy Basil)',
    botanicalName: 'Ocimum sanctum',
    defaultRegion: 'Nilgiri Biosphere Reserve, Tamil Nadu',
    idealMoisture: 9.0,
    method: 'Selective Tender Leaf & Aerial Top Plucking at Sunrise',
  },
  {
    commonName: 'Brahmi (Water Hyssop)',
    botanicalName: 'Bacopa monnieri',
    defaultRegion: 'Western Ghats Wet Riparian Corridors, Kerala/TN',
    idealMoisture: 10.0,
    method: 'Whole Herb Sustainable Hand Harvesting from wetland buffers',
  },
  {
    commonName: 'Shatavari (Wild Asparagus)',
    botanicalName: 'Asparagus racemosus',
    defaultRegion: 'Agasthyamalai Biosphere Reserve, Tamil Nadu',
    idealMoisture: 8.0,
    method: 'Tuberous Root Harvest with replanting of secondary rhizomes',
  },
  {
    commonName: 'Guduchi / Giloy (Amrita)',
    botanicalName: 'Tinospora cordifolia',
    defaultRegion: 'Kolli Hills Forest Fringe, Namakkal, Tamil Nadu',
    idealMoisture: 9.5,
    method: 'Mature Stem Cutting leaving base root stock intact',
  },
  {
    commonName: 'Neem / Veppilai (Margosa)',
    botanicalName: 'Azadirachta indica',
    defaultRegion: 'Cauvery River Basin Organic Groves, Tamil Nadu',
    idealMoisture: 8.0,
    method: 'Wild Leaf Harvest without damaging tree canopies',
  },
];

export const CollectorModule: React.FC<CollectorModuleProps> = ({
  onBatchCreated,
  onOpenAuth,
  editingBatch,
  onCancelEdit,
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const [herbName, setHerbName] = useState(editingBatch?.herbName || '');
  const [botanicalName, setBotanicalName] = useState(editingBatch?.botanicalName || '');
  const [quantityKg, setQuantityKg] = useState(editingBatch?.quantityKg ? String(editingBatch.quantityKg) : '');
  const [moisturePercent, setMoisturePercent] = useState(
    editingBatch?.moisturePercent ? String(editingBatch.moisturePercent) : '8.5'
  );
  const [collectionDate, setCollectionDate] = useState(
    editingBatch?.collectionDate || new Date().toISOString().split('T')[0]
  );
  const [gpsLatitude, setGpsLatitude] = useState(editingBatch?.gpsLatitude ? String(editingBatch.gpsLatitude) : '10.3256');
  const [gpsLongitude, setGpsLongitude] = useState(
    editingBatch?.gpsLongitude ? String(editingBatch.gpsLongitude) : '76.9538'
  );
  const [region, setRegion] = useState(editingBatch?.region || 'Anaimalai Rainforest Reserve, Valparai, Tamil Nadu');
  const [elevationMeters, setElevationMeters] = useState(
    editingBatch?.elevationMeters ? String(editingBatch.elevationMeters) : '1050'
  );
  const [harvestMethod, setHarvestMethod] = useState(
    editingBatch?.harvestMethod || 'Sustainable Hand Harvesting of Mature Roots'
  );
  const [qualityGrade, setQualityGrade] = useState(editingBatch?.qualityGrade || 'A');
  const [photoUrl, setPhotoUrl] = useState(
    editingBatch?.photoUrl || 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80'
  );
  const [notes, setNotes] = useState(editingBatch?.notes || '');

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSpeechSupported(Boolean(SpeechRecognition));
    }
  }, []);

  const handleSelectSuggestion = (item: (typeof HERB_SUGGESTIONS)[0]) => {
    setHerbName(item.commonName);
    setBotanicalName(item.botanicalName);
    setRegion(item.defaultRegion);
    setMoisturePercent(String(item.idealMoisture));
    setHarvestMethod(item.method);
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLatitude(pos.coords.latitude.toFixed(6));
        setGpsLongitude(pos.coords.longitude.toFixed(6));
        if (pos.coords.altitude) {
          setElevationMeters(Math.round(pos.coords.altitude).toString());
        }
        setDetectingGps(false);
      },
      (err) => {
        console.warn('Geolocation lookup notice:', err.message);
        // Graceful fallback coordinates for Western Ghats biodiversity hotspot
        setGpsLatitude('11.4064');
        setGpsLongitude('76.6932');
        setElevationMeters('1820');
        setDetectingGps(false);
      },
      { timeout: 7000 }
    );
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not available in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNotes((prev: string) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
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

    if (!herbName.trim() || !botanicalName.trim()) {
      setErrorMsg('Common and botanical species names are required.');
      return;
    }

    const payload = {
      herbName: herbName.trim(),
      botanicalName: botanicalName.trim(),
      quantityKg: parseFloat(quantityKg),
      moisturePercent: parseFloat(moisturePercent),
      collectionDate,
      gpsLatitude: parseFloat(gpsLatitude),
      gpsLongitude: parseFloat(gpsLongitude),
      region: region.trim(),
      elevationMeters: elevationMeters ? parseFloat(elevationMeters) : undefined,
      harvestMethod: harvestMethod.trim(),
      qualityGrade,
      photoUrl: photoUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    setLoading(true);

    try {
      if (!OfflineManager.isOnline()) {
        // Save to offline draft queue
        OfflineManager.saveDraft('BATCH', payload);
        setSuccessMsg('Offline Mode Active: Batch queued in local drafts. It will automatically sync when connection returns!');
        setTimeout(() => {
          onBatchCreated();
        }, 1500);
        return;
      }

      if (editingBatch) {
        await api.updateBatch(editingBatch.id, payload);
        setSuccessMsg(`Batch ${editingBatch.batchNumber} updated successfully!`);
      } else {
        const res = await api.createBatch(payload);
        setSuccessMsg(`Batch ${res.batch.batchNumber} registered and anchored to blockchain ledger!`);
      }

      setTimeout(() => {
        onBatchCreated();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit batch record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-emerald-900/10">
        <div className="flex items-center gap-2 mb-2">
          <Leaf className="w-5 h-5 text-emerald-300" />
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-200">
            {editingBatch ? 'Modify Batch Record' : 'Collector Geo-Tagging Protocol'}
          </span>
        </div>
        <h2 className="text-2xl font-bold font-serif">{t('collectorTitle')}</h2>
        <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
          {t('collectorSubtitle')}
        </p>
      </div>

      {/* Suggested Species Quick Select */}
      {!editingBatch && (
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Ayurvedic Pharmacopoeia Common Species (Click to auto-populate):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {HERB_SUGGESTIONS.map((item) => (
              <button
                key={item.commonName}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="px-3 py-1.5 text-xs rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-medium border border-emerald-200/80 transition-colors flex items-center gap-1.5"
              >
                <span>{item.commonName}</span>
                <span className="text-[10px] text-emerald-700 italic font-mono">({item.botanicalName})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Form */}
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

        {/* Section 1: Herb Species Identification */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-600" />
            1. Herb Species & Botanical Classification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('herbCommonName')} *</label>
              <input
                type="text"
                required
                value={herbName}
                onChange={(e) => setHerbName(e.target.value)}
                placeholder="e.g. Ashwagandha (Indian Ginseng)"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('botanicalName')} *</label>
              <input
                type="text"
                required
                value={botanicalName}
                onChange={(e) => setBotanicalName(e.target.value)}
                placeholder="e.g. Withania somnifera"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono italic"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Weight, Moisture, Date */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            2. Harvest Volume & Field Moisture
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('quantityKg')} *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
                placeholder="e.g. 120"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('moisturePercent')} *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={moisturePercent}
                onChange={(e) => setMoisturePercent(e.target.value)}
                placeholder="e.g. 8.5"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('harvestDate')} *</label>
              <input
                type="date"
                required
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Geolocation Coordinates */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              3. Origin Geolocation & Biodiversity Reserve
            </h3>

            <button
              type="button"
              onClick={handleDetectGps}
              disabled={detectingGps}
              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-emerald-200 transition-colors"
            >
              <Navigation className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
              <span>{detectingGps ? 'Acquiring GPS...' : t('autoDetectGps')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('regionLabel')} *</label>
              <input
                type="text"
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Anaimalai Rainforest Reserve, Valparai, Tamil Nadu"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">GPS Latitude *</label>
              <input
                type="text"
                required
                value={gpsLatitude}
                onChange={(e) => setGpsLatitude(e.target.value)}
                placeholder="e.g. 10.3256"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">GPS Longitude *</label>
              <input
                type="text"
                required
                value={gpsLongitude}
                onChange={(e) => setGpsLongitude(e.target.value)}
                placeholder="e.g. 76.9538"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Harvest Practice, Voice & Field Notes */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              4. Sustainable Harvesting & Field Notes
            </h3>

            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? t('voiceListening') : t('voiceInputBtn')}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('harvestMethod')}</label>
              <input
                type="text"
                value={harvestMethod}
                onChange={(e) => setHarvestMethod(e.target.value)}
                placeholder="e.g. Sustainable Hand-Harvest of Mature Roots"
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('photoUrlLabel')}</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('fieldNotes')}</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record weather conditions, soil context, traditional lunar phase harvesting, or voice transcripts..."
              className="w-full p-3 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-100">
          {editingBatch && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-5 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl"
            >
              {t('cancel')}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>
              {loading
                ? 'Submitting to Ledger...'
                : editingBatch
                ? 'Save Updated Batch'
                : t('submitBatchBtn')}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
