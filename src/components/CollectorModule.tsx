import React, { useState, useEffect, useRef } from 'react';
import {
  Leaf,
  MapPin,
  Mic,
  MicOff,
  Camera,
  Calendar,
  Scale,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Clock,
  Upload,
  Trash2,
  RefreshCw,
  Info,
  Check,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { OfflineManager } from '../services/offline';
import { HERB_CATALOGUE, HerbCatalogueItem } from '../data/herbCatalogue';
import { InteractiveLocationPicker, LocationConfirmation } from './InteractiveLocationPicker';
import { HerbBatch } from '../types';

interface CollectorModuleProps {
  onBatchCreated: (batch?: HerbBatch) => void;
  onOpenAuth: () => void;
  editingBatch?: any;
  onCancelEdit?: () => void;
  onSelectBatch?: (id: string) => void;
}

export const CollectorModule: React.FC<CollectorModuleProps> = ({
  onBatchCreated,
  onOpenAuth,
  editingBatch,
  onCancelEdit,
  onSelectBatch,
}) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  // A. Herb Information
  const [herbName, setHerbName] = useState(editingBatch?.herbName || '');
  const [botanicalName, setBotanicalName] = useState(editingBatch?.botanicalName || '');
  const [suggestedBotanical, setSuggestedBotanical] = useState<string | null>(null);
  const [collectionMethod, setCollectionMethod] = useState<'Cultivated' | 'Wild Collected'>(
    editingBatch?.collectionMethod || 'Wild Collected'
  );
  const [herbPart, setHerbPart] = useState<'Leaves' | 'Roots' | 'Stem' | 'Bark' | 'Flowers' | 'Seeds' | 'Whole Plant' | 'Other'>(
    editingBatch?.herbPart || 'Leaves'
  );

  // Autocomplete state
  const [showCatalogueDropdown, setShowCatalogueDropdown] = useState(false);
  const [filteredCatalogue, setFilteredCatalogue] = useState<HerbCatalogueItem[]>(HERB_CATALOGUE);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // B. Harvest Information
  const [quantity, setQuantity] = useState<string>(
    editingBatch?.quantity ? String(editingBatch.quantity) : editingBatch?.quantityKg ? String(editingBatch.quantityKg) : ''
  );
  const [unit, setUnit] = useState<'kg' | 'g'>(editingBatch?.unit || 'kg');
  const [collectionDate, setCollectionDate] = useState<string>(
    editingBatch?.collectionDate || new Date().toISOString().split('T')[0]
  );
  const [collectionTime, setCollectionTime] = useState<string>(
    editingBatch?.collectionTime || new Date().toTimeString().slice(0, 5)
  );
  const [farmerNotes, setFarmerNotes] = useState<string>(editingBatch?.farmerNotes || editingBatch?.notes || '');

  // C. Location Confirmation State
  const [confirmedLocation, setConfirmedLocation] = useState<LocationConfirmation | null>(
    editingBatch?.isLocationConfirmed
      ? {
          latitude: editingBatch.gpsLatitude,
          longitude: editingBatch.gpsLongitude,
          accuracyMeters: editingBatch.locationAccuracyMeters ?? null,
          locationSource: editingBatch.locationSource || 'MAP_PINPOINT',
          isConfirmed: true,
          confirmedAt: editingBatch.locationConfirmedAt || null,
          regionText: editingBatch.region,
        }
      : null
  );

  // D. Herb Photo
  const [photoDataUrl, setPhotoDataUrl] = useState<string>(editingBatch?.photoUrl || '');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Submission / Modal States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdBatch, setCreatedBatch] = useState<HerbBatch | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSpeechSupported(Boolean(SpeechRec));
    }
  }, []);

  // Close catalogue dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCatalogueDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter catalogue as user types
  const handleHerbNameChange = (val: string) => {
    setHerbName(val);
    if (!val.trim()) {
      setFilteredCatalogue(HERB_CATALOGUE);
      setShowCatalogueDropdown(false);
      return;
    }
    const q = val.toLowerCase();
    const matches = HERB_CATALOGUE.filter(
      (item) =>
        item.commonNameEn.toLowerCase().includes(q) ||
        item.commonNameTa.toLowerCase().includes(q) ||
        item.suggestedBotanical.toLowerCase().includes(q)
    );
    setFilteredCatalogue(matches);
    setShowCatalogueDropdown(matches.length > 0);
  };

  const handleSelectCatalogueItem = (item: HerbCatalogueItem) => {
    const chosenName = language === 'ta' ? item.commonNameTa : item.commonNameEn;
    setHerbName(chosenName);
    setSuggestedBotanical(item.suggestedBotanical);
    setBotanicalName(item.suggestedBotanical);
    setHerbPart(item.commonPart);
    setCollectionMethod(item.defaultMethod);
    setShowCatalogueDropdown(false);
  };

  // Photo handlers
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(language === 'ta' ? 'தயவுசெய்து சரியான படக் கோப்பைத் தேர்ந்தெடுக்கவும்.' : 'Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(language === 'ta' ? 'புகைப்பட அளவு 5MB-க்கு குறைவாக இருக்க வேண்டும்.' : 'Image file size must be less than 5MB.');
      return;
    }

    setPhotoFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoDataUrl(event.target.result as string);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoDataUrl('');
    setPhotoFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Voice recognition toggle
  const toggleVoiceInput = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech recognition is not available in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setFarmerNotes((prev: string) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user) {
      onOpenAuth();
      return;
    }

    // 1. Validate Herb Name
    if (!herbName.trim()) {
      setErrorMsg(language === 'ta' ? 'மூலிகையின் பொதுப் பெயர் அவசியம்.' : 'Common / Local Herb Name is required.');
      return;
    }

    // 2. Validate Quantity
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMsg(
        language === 'ta'
          ? 'அறுவடை அளவு பூஜ்ஜியத்தை விட அதிகமான நேர்மறை எண்ணாக இருக்க வேண்டும்.'
          : 'Quantity must be a positive numeric value greater than zero.'
      );
      return;
    }

    // 3. Validate Date
    if (!collectionDate) {
      setErrorMsg(language === 'ta' ? 'அறுவடைத் தேதி அவசியம்.' : 'Harvest / Collection Date is required.');
      return;
    }

    // 4. Validate Location Confirmation
    if (!confirmedLocation || !confirmedLocation.isConfirmed) {
      setErrorMsg(
        language === 'ta'
          ? 'தயவுசெய்து "சேகரிப்பு இடத்தை உறுதிப்படுத்து" பொத்தானை அழுத்தி இருப்பிடத்தை உறுதிசெய்யவும்.'
          : 'Please confirm your collection location by clicking "Confirm Collection Location" before saving.'
      );
      return;
    }

    const payload = {
      herbName: herbName.trim(),
      botanicalName: botanicalName.trim() || undefined,
      quantity: parsedQty,
      unit,
      quantityKg: unit === 'g' ? Math.round((parsedQty / 1000) * 1000) / 1000 : parsedQty,
      collectionDate,
      collectionTime: collectionTime.trim() || undefined,
      collectionMethod,
      herbPart,
      farmerNotes: farmerNotes.trim() || undefined,
      notes: farmerNotes.trim() || undefined,
      gpsLatitude: confirmedLocation.latitude,
      gpsLongitude: confirmedLocation.longitude,
      locationAccuracyMeters: confirmedLocation.accuracyMeters,
      locationSource: confirmedLocation.locationSource,
      isLocationConfirmed: true,
      region: confirmedLocation.regionText,
      photoUrl: photoDataUrl || undefined,
    };

    setLoading(true);

    try {
      if (!OfflineManager.isOnline()) {
        OfflineManager.saveDraft('BATCH', payload);
        alert(
          language === 'ta'
            ? 'ஆஃப்லைன் முறை: சாதனம் இணையத்தில் இணைந்ததும் தொகுதி ஒத்திசைக்கப்படும்.'
            : 'Offline mode active: Batch queued in local drafts and will sync when online!'
        );
        onBatchCreated();
        return;
      }

      if (editingBatch) {
        const res = await api.updateBatch(editingBatch.id, payload);
        alert(
          language === 'ta'
            ? `தொகுதி ${editingBatch.batchNumber} வெற்றிகரமாக மாற்றப்பட்டது!`
            : `Batch ${editingBatch.batchNumber} updated successfully!`
        );
        onBatchCreated(res.batch);
      } else {
        const res = await api.createBatch(payload);
        setCreatedBatch(res.batch);
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save herb batch record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-linear-to-r from-emerald-800 via-teal-900 to-zinc-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Leaf className="w-5 h-5 text-emerald-300" />
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-200">
            {language === 'ta' ? 'உழவர் மூலிகைப் பதிவு மையம்' : 'Farmer-Friendly Herb Registration Module'}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif">
          {editingBatch ? (language === 'ta' ? 'மூலிகைத் தொகுதியைத் திருத்து' : 'Edit Herb Batch Record') : t('collectorTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
          {t('collectorSubtitle')}
        </p>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xs space-y-8">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Section A: Herb Information */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-600" />
              <span>A. {language === 'ta' ? 'மூலிகை விவரங்கள்' : 'Herb Information'}</span>
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">Step 1 of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Common / Local Herb Name with Autocomplete */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                {t('commonHerbName')} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={herbName}
                  onChange={(e) => handleHerbNameChange(e.target.value)}
                  onFocus={() => setShowCatalogueDropdown(true)}
                  placeholder={
                    language === 'ta'
                      ? 'எ.கா: துளசி, அஸ்வகந்தா, வேம்பு, மஞ்சள்...'
                      : 'e.g. Tulsi, Ashwagandha, Neem, Amla, Turmeric...'
                  }
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCatalogueDropdown(!showCatalogueDropdown)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showCatalogueDropdown && filteredCatalogue.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-zinc-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-zinc-100">
                  <div className="px-3 py-1.5 bg-zinc-50 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {language === 'ta' ? 'பரிந்துரைக்கப்பட்ட மூலிகைகள்' : 'Reference Catalogue Herbs'}
                  </div>
                  {filteredCatalogue.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectCatalogueItem(item)}
                      className="px-3.5 py-2 hover:bg-emerald-50/70 cursor-pointer text-xs flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-bold text-zinc-900 block">
                          {language === 'ta' ? item.commonNameTa : item.commonNameEn}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {language === 'ta' ? item.commonNameEn : item.commonNameTa} • Part: {item.commonPart}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-700 italic font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {item.suggestedBotanical}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botanical / Scientific Name (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700">
                  {t('botanicalNameOptional')}
                </label>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.2 rounded border border-amber-200">
                  Unverified
                </span>
              </div>
              <input
                type="text"
                value={botanicalName}
                onChange={(e) => setBotanicalName(e.target.value)}
                placeholder="e.g. Ocimum sanctum (Optional for farmer)"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono italic text-zinc-700"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                {language === 'ta'
                  ? 'விவசாயி தாவரவியல் பெயரை நிரப்ப வேண்டிய கட்டாயமில்லை. இது ஆய்வகத்தில் சரிபார்க்கப்படும் வரை "Unverified" என்று இருக்கும்.'
                  : 'Farmers are not forced to enter botanical names. Botanical identity remains "Unverified" until certified by an accredited laboratory.'}
              </p>
            </div>
          </div>

          {/* Collection Method and Plant Part */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Collection Method */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                {t('collectionMethod')} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCollectionMethod('Wild Collected')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    collectionMethod === 'Wild Collected'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                  }`}
                >
                  🌿 {t('wildCollected')}
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionMethod('Cultivated')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    collectionMethod === 'Cultivated'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                  }`}
                >
                  🌱 {t('cultivated')}
                </button>
              </div>
            </div>

            {/* Herb Plant Part */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                {t('herbPart')} *
              </label>
              <select
                value={herbPart}
                onChange={(e) => setHerbPart(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
              >
                <option value="Leaves">{t('partLeaves')}</option>
                <option value="Roots">{t('partRoots')}</option>
                <option value="Stem">{t('partStem')}</option>
                <option value="Bark">{t('partBark')}</option>
                <option value="Flowers">{t('partFlowers')}</option>
                <option value="Seeds">{t('partSeeds')}</option>
                <option value="Whole Plant">{t('partWholePlant')}</option>
                <option value="Other">{t('partOther')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section B: Harvest Information */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>B. {language === 'ta' ? 'அறுவடை தகவல்கள்' : 'Harvest Information'}</span>
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">Step 2 of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Quantity and Unit */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                {t('quantity')} *
              </label>
              <div className="flex rounded-xl shadow-xs overflow-hidden border border-zinc-300 focus-within:ring-2 focus-within:ring-emerald-500">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 text-xs bg-white focus:outline-hidden font-bold text-zinc-900"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as 'kg' | 'g')}
                  className="bg-zinc-100 border-l border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-700 focus:outline-hidden"
                >
                  <option value="kg">kg (கிலோ)</option>
                  <option value="g">g (கிராம்)</option>
                </select>
              </div>
            </div>

            {/* Collection Date */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                {t('collectionDate')} *
              </label>
              <input
                type="date"
                required
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Collection Time */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                {t('collectionTime')}
              </label>
              <input
                type="time"
                value={collectionTime}
                onChange={(e) => setCollectionTime(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Farmer Notes with Voice Support */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700">
                {t('farmerNotes')}
              </label>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-700" />}
                  <span>{isListening ? t('voiceListening') : t('voiceInputBtn')}</span>
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={farmerNotes}
              onChange={(e) => setFarmerNotes(e.target.value)}
              placeholder={
                language === 'ta'
                  ? 'விவசாயி குறிப்புகள்: வானிலை, அறுவடை முறை, நிலத்தின் தன்மை அல்லது பாரம்பரிய அவதானிப்புகள்...'
                  : 'Farmer notes: soil observations, morning dew harvest, weather, traditional lunar context...'
              }
              className="w-full p-3 text-xs bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Section C: Accurate GPS Location & Map Confirmation */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>C. {language === 'ta' ? 'துல்லியமான ஜிபிஎஸ் மற்றும் வரைபட உறுதிப்படுத்தல்' : 'Accurate GPS & Map Confirmation'}</span>
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">Step 3 of 4</span>
          </div>

          {/* Interactive Leaflet Location Picker with High Accuracy Geolocation */}
          <InteractiveLocationPicker
            initialLat={editingBatch?.gpsLatitude}
            initialLng={editingBatch?.gpsLongitude}
            initialRegion={editingBatch?.region}
            onLocationConfirmed={(loc) => {
              setConfirmedLocation(loc);
              setErrorMsg(null);
            }}
          />
        </div>

        {/* Section D: Herb Photo Upload & Camera Capture */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>D. {t('herbPhotoUpload')}</span>
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">Step 4 of 4</span>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] text-zinc-500 italic">
              {t('photoFieldDocumentationNote')}
            </p>

            {photoDataUrl ? (
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={photoDataUrl}
                  alt="Herb Field Preview"
                  className="w-32 h-32 object-cover rounded-xl shadow-xs border border-zinc-300 bg-white"
                />
                <div className="space-y-2 text-xs flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-zinc-900">
                      {language === 'ta' ? 'புகைப்படம் இணைக்கப்பட்டது' : 'Field Photo Attached'}
                    </span>
                  </div>
                  {photoFileName && <p className="text-[11px] text-zinc-500 font-mono">{photoFileName}</p>}
                  <p className="text-[11px] text-zinc-600">
                    {language === 'ta'
                      ? 'கள புகைப்படம் தொகுதி ஆவணத்தில் பாதுகாப்பாக சேமிக்கப்படும்.'
                      : 'Image is stored persistently with the batch traceability record.'}
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{language === 'ta' ? 'மாற்று' : 'Replace Photo'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-rose-200"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t('delete')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Upload File Button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-zinc-300 hover:border-emerald-600 rounded-2xl text-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-emerald-50/30 flex flex-col items-center justify-center space-y-1.5"
                >
                  <Upload className="w-6 h-6 text-emerald-700" />
                  <span className="text-xs font-bold text-zinc-800">{t('uploadPhotoFile')}</span>
                  <span className="text-[10px] text-zinc-400">JPG, PNG, WebP (Max 5MB)</span>
                </div>

                {/* Mobile Camera Button */}
                <div
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-zinc-300 hover:border-emerald-600 rounded-2xl text-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-emerald-50/30 flex flex-col items-center justify-center space-y-1.5"
                >
                  <Camera className="w-6 h-6 text-emerald-700" />
                  <span className="text-xs font-bold text-zinc-800">{t('takePhoto')}</span>
                  <span className="text-[10px] text-zinc-400">Mobile Camera Capture</span>
                </div>
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoFileChange}
            />
          </div>
        </div>

        {/* Action Buttons: Cancel and Submit */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-100">
          <div className="text-xs text-zinc-500">
            {confirmedLocation?.isConfirmed ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Location Confirmed: {confirmedLocation.regionText} [GPS: {confirmedLocation.latitude.toFixed(4)}, {confirmedLocation.longitude.toFixed(4)}]
                </span>
              </span>
            ) : (
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Location confirmation required before saving.</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
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
              className="w-full sm:w-auto px-8 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-700/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>
                {loading
                  ? 'Saving Batch...'
                  : editingBatch
                  ? (language === 'ta' ? 'தொகுதியைச் சேமி' : 'Save Batch Updates')
                  : t('saveHerbBatch')}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* Success Modal Showing Unique Batch ID & Traceability Stage 1 */}
      {showSuccessModal && createdBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-zinc-200 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-1">
                {t('stage1HarvestEvent')}
              </span>
              <h3 className="text-xl font-bold font-serif text-zinc-900">{t('batchSavedSuccess')}</h3>
              <p className="text-xs text-zinc-500">
                {language === 'ta'
                  ? 'புதிய மூலிகைத் தொகுதி பிளாக்செயின் கணக்குப் புத்தகத்தில் வெற்றிகரமாகப் பதியப்பட்டது.'
                  : 'New herb batch has been created and securely anchored to the cryptographic ledger.'}
              </p>
            </div>

            {/* Generated Unique Batch ID Display */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-emerald-950 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                {t('uniqueBatchIdNotice')}
              </span>
              <div className="text-2xl font-black font-mono tracking-wider text-emerald-900">
                {createdBatch.batchNumber}
              </div>
              <p className="text-[10px] text-emerald-700">
                Use this unique identifier throughout processing, laboratory testing, manufacturing, and consumer QR verification.
              </p>
            </div>

            {/* Batch Snapshot */}
            <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-left text-xs space-y-1.5 text-zinc-700">
              <div className="flex justify-between">
                <span className="text-zinc-500">Herb:</span>
                <span className="font-bold text-zinc-900">{createdBatch.herbName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Quantity:</span>
                <span className="font-semibold">{createdBatch.quantity} {createdBatch.unit || 'kg'} ({createdBatch.quantityKg} kg)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Confirmed Origin:</span>
                <span className="font-semibold truncate max-w-xs">{createdBatch.region}</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono text-emerald-800 pt-1 border-t border-zinc-200">
                <span>Ledger Tx:</span>
                <span className="truncate max-w-[200px]">{createdBatch.blockchainHash}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onSelectBatch) onSelectBatch(createdBatch.id);
                  onBatchCreated(createdBatch);
                }}
                className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {t('viewDetails')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  // Reset form for registering another batch
                  setHerbName('');
                  setBotanicalName('');
                  setQuantity('');
                  setFarmerNotes('');
                  setPhotoDataUrl('');
                  setConfirmedLocation(null);
                  onBatchCreated();
                }}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition-all border border-zinc-200"
              >
                {language === 'ta' ? '+ மற்றொரு தொகுதியைப் பதிவு செய்க' : '+ Register Another Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
