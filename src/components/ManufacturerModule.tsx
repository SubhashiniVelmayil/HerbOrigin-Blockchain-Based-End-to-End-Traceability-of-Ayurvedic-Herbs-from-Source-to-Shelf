import React, { useState } from 'react';
import QRCode from 'qrcode';
import {
  Factory,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Layers,
  Send,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { HerbBatch, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

interface ManufacturerModuleProps {
  batches: HerbBatch[];
  products: Product[];
  onProductCreated: () => void;
  onOpenAuth: () => void;
  onOpenPublicVerify: (code: string) => void;
}

export const ManufacturerModule: React.FC<ManufacturerModuleProps> = ({
  batches,
  products,
  onProductCreated,
  onOpenAuth,
  onOpenPublicVerify,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [productName, setProductName] = useState('');
  const [ayurvedicFormulation, setAyurvedicFormulation] = useState('Classical Ayurvedic Herbal Churna / Vati / Taila');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [quantityUnits, setQuantityUnits] = useState('500');
  const [packagingType, setPackagingType] = useState('Amber Glass Jar with Nitrogen Flush Tamper-Evident Seal');
  const [dosageInstructions, setDosageInstructions] = useState('');
  const [shelfLifeMonths, setShelfLifeMonths] = useState('24');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const approvedBatches = batches.filter((b) => b.status === 'Approved');

  const handleToggleBatch = (id: string) => {
    setSelectedBatchIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (next.length > 0 && !productName) {
        const first = batches.find((b) => b.id === next[0]);
        if (first) {
          setProductName(`Shuddha ${first.herbName} Extract Formulation`);
          setDosageInstructions(`3-6g with warm water or honey twice daily after meals.`);
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user) {
      onOpenAuth();
      return;
    }

    if (!productName.trim()) {
      setErrorMsg('Product commercial name is required.');
      return;
    }

    if (selectedBatchIds.length === 0) {
      setErrorMsg('Please select at least one certified source herb batch to link to this medicine formulation.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        productName: productName.trim(),
        ayurvedicFormulation: ayurvedicFormulation.trim(),
        batchIds: selectedBatchIds,
        quantityUnits: parseInt(quantityUnits, 10),
        packagingType: packagingType.trim(),
        dosageInstructions: dosageInstructions.trim(),
        shelfLifeMonths: parseInt(shelfLifeMonths, 10),
      };

      const res = await api.createProduct(payload);
      setCreatedProduct(res.product);

      // Generate QR
      const verifyUrl = `${window.location.origin}/?verify=${res.product.productCode}`;
      const dataUrl = await QRCode.toDataURL(verifyUrl, { width: 220, margin: 1 });
      setQrCodeUrl(dataUrl);

      setSuccessMsg(`Ayurvedic formulation ${res.product.productCode} manufactured and registered!`);
      onProductCreated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register formulation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-linear-to-r from-indigo-800 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-indigo-900/10">
        <div className="flex items-center gap-2 mb-2">
          <Factory className="w-5 h-5 text-indigo-300" />
          <span className="text-xs font-semibold tracking-wider uppercase text-indigo-200">
            GMP Manufacturing & Formulation Unit
          </span>
        </div>
        <h2 className="text-2xl font-bold font-serif">{t('mfgTitle')}</h2>
        <p className="text-xs sm:text-sm text-indigo-100/90 mt-1 max-w-2xl">
          {t('mfgSubtitle')}
        </p>
      </div>

      {/* Success QR Card */}
      {createdProduct && qrCodeUrl && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-center gap-6 animate-in fade-in zoom-in-95">
          <img src={qrCodeUrl} alt="Product QR" className="w-36 h-36 bg-white p-2 rounded-2xl shadow-sm" />
          <div className="space-y-1 text-xs">
            <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">
              Ready for Retail Packaging
            </span>
            <h3 className="text-base font-bold text-emerald-950 font-serif">{createdProduct.productName}</h3>
            <p className="font-mono text-emerald-800 font-semibold">{createdProduct.productCode}</p>
            <p className="text-zinc-600">
              Formulation: {createdProduct.ayurvedicFormulation} • Units: {createdProduct.quantityUnits}
            </p>
            <p className="text-zinc-600">
              Linked Batches: {createdProduct.batchNumbers.join(', ')}
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenPublicVerify(createdProduct.productCode)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <span>Test Public Verification Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulation Form */}
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

        {/* Section 1: Product Branding */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('productCommercialName')} *</label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Shuddha Ashwagandha Churna"
              className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('ayurvedicFormulationType')} *</label>
            <input
              type="text"
              required
              value={ayurvedicFormulation}
              onChange={(e) => setAyurvedicFormulation(e.target.value)}
              placeholder="e.g. Classical Asava/Arishta or Churna"
              className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Section 2: Link Certified Herb Batches */}
        <div className="space-y-3 pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-zinc-700">{t('linkBatches')} *</label>
            <span className="text-[11px] text-zinc-500">
              Only Lab Certified (Approved) batches are permissible for formulation.
            </span>
          </div>

          {approvedBatches.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              No laboratory-approved batches currently available. Please complete a Lab Verification test first.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1">
              {approvedBatches.map((b) => {
                const isSelected = selectedBatchIds.includes(b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => handleToggleBatch(b.id)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-semibold ring-1 ring-indigo-400'
                        : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <div>
                      <span className="font-mono text-[11px] block">{b.batchNumber}</span>
                      <p className="font-serif">{b.herbName}</p>
                      <span className="text-[10px] text-zinc-500 font-normal">
                        Qty: {b.quantityKg} kg • Region: {b.region}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Quantity, Packaging, Dosage */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-100">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('unitsManufactured')} *</label>
            <input
              type="number"
              min="1"
              required
              value={quantityUnits}
              onChange={(e) => setQuantityUnits(e.target.value)}
              placeholder="500"
              className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('packagingTypeLabel')}</label>
            <input
              type="text"
              value={packagingType}
              onChange={(e) => setPackagingType(e.target.value)}
              placeholder="e.g. Amber Glass Jar"
              className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Shelf Life (Months)</label>
            <input
              type="number"
              min="1"
              value={shelfLifeMonths}
              onChange={(e) => setShelfLifeMonths(e.target.value)}
              placeholder="24"
              className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('dosageInstructionsLabel')}</label>
          <input
            type="text"
            value={dosageInstructions}
            onChange={(e) => setDosageInstructions(e.target.value)}
            placeholder="e.g. 3-6g twice daily with warm milk or as directed by an Ayurvedic physician."
            className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-800/20 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            <PackageCheck className="w-4 h-4" />
            <span>{loading ? 'Compounding & Generating QR...' : t('generateQrProductBtn')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
