import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  MapPin,
  Calendar,
  Scale,
  Droplets,
  ShieldCheck,
  Cpu,
  QrCode,
  FileText,
  Clock,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Edit,
  Trash2,
} from 'lucide-react';
import { HerbBatch, SupplyChainEvent, LabTest } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

interface BatchDetailModalProps {
  batchId: string | null;
  onClose: () => void;
  onEdit?: (batch: HerbBatch) => void;
  onDeleted?: (batchId: string) => void;
  onOpenPublicVerify: (code: string) => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  batchId,
  onClose,
  onEdit,
  onDeleted,
  onOpenPublicVerify,
}) => {
  const { user, hasRole } = useAuth();
  const { t } = useLanguage();

  const [batch, setBatch] = useState<HerbBatch | null>(null);
  const [events, setEvents] = useState<SupplyChainEvent[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;

    let isMounted = true;
    setLoading(true);

    api
      .getBatchById(batchId)
      .then((res) => {
        if (!isMounted) return;
        setBatch(res.batch);
        setEvents(res.events || []);
        setLabTests(res.labTests || []);

        // Generate QR code for public verification
        const publicUrl = `${window.location.origin}/?verify=${res.batch.batchNumber}`;
        QRCode.toDataURL(publicUrl, { width: 180, margin: 1 })
          .then((url) => isMounted && setQrDataUrl(url))
          .catch((err) => console.error('QR code generation failed:', err));
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load batch details');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [batchId]);

  if (!batchId) return null;

  const canEdit =
    user && (user.role === 'Admin' || (user.id === batch?.collectorId && batch?.status !== 'Approved'));

  const canDelete =
    user && (user.role === 'Admin' || (user.id === batch?.collectorId && batch?.status !== 'Approved'));

  const handleDelete = async () => {
    if (!batch) return;
    try {
      setDeleting(true);
      await api.deleteBatch(batch.id);
      if (onDeleted) onDeleted(batch.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-800 to-teal-950 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono bg-emerald-700/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-600">
                  {batch?.batchNumber || 'Loading...'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    batch?.status === 'Approved'
                      ? 'bg-emerald-500 text-white'
                      : batch?.status === 'Rejected'
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-400 text-zinc-900'
                  }`}
                >
                  {batch?.status}
                </span>
              </div>
              <h2 className="text-xl font-bold font-serif text-white">{batch?.herbName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-emerald-200/90 italic font-mono">
                  {batch?.botanicalName || "Botanical Species: Unverified"}
                </span>
                <span className="text-[10px] bg-amber-400/20 text-amber-200 px-1.5 py-0.2 rounded border border-amber-300/30">
                  {batch?.status === "Approved" ? "Certified" : "Unverified"}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {canEdit && onEdit && batch && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit(batch);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 border border-white/20 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{t('edit')}</span>
                </button>
              )}
              {canDelete && batch && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-rose-400/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('delete')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Box */}
        {confirmDelete && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 text-xs text-rose-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>
                <strong>Warning:</strong> Are you sure you want to delete batch <strong>{batch?.batchNumber}</strong>?
                This action is audited on the ledger.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1 bg-white border border-zinc-300 rounded text-zinc-700 hover:bg-zinc-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-3 py-1 bg-rose-600 text-white rounded hover:bg-rose-700 font-semibold"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Loading batch details...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">{error}</div>
        ) : batch ? (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Top Grid: Geo & Harvest Details + QR Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">{t('quantity')}</span>
                    <span className="font-bold text-zinc-900 text-sm">{batch.quantity || batch.quantityKg} {batch.unit || "kg"} ({batch.quantityKg} kg)</span>
                  </div>
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">{t('moisturePercent')}</span>
                    <span className="font-bold text-zinc-900 text-sm">{batch.moisturePercent}%</span>
                  </div>
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">{t('harvestDate')}</span>
                    <span className="font-medium text-zinc-800">{batch.collectionDate}</span>
                  </div>
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">Collector Identity</span>
                    <span className="font-medium text-zinc-800 truncate block">{batch.collectorName}</span>
                  </div>
                </div>

                                {/* Herb Part & Method */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">Collection Method</span>
                    <span className="font-semibold text-zinc-800">{batch.collectionMethod || "Wild Collected"}</span>
                  </div>
                  <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                    <span className="text-zinc-500 block text-[11px]">Plant Part</span>
                    <span className="font-semibold text-zinc-800">{batch.herbPart || "Whole Plant"}</span>
                  </div>
                </div>

                {batch.photoUrl && (
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs flex items-center gap-3">
                    <img src={batch.photoUrl} alt="Field Herb" className="w-16 h-16 object-cover rounded-lg border border-zinc-300 shadow-xs" />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">Field Documentation Photo</span>
                      <p className="text-[10px] text-zinc-500 italic">Field photo captured at harvest. Note: Physical photo does not constitute certified laboratory botanical verification.</p>
                    </div>
                  </div>
                )}

                {/* Geolocation Tagging */}
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold mb-1">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Geographical Reserve & Origin</span>
                  </div>
                  <p className="text-zinc-700">{batch.region}</p>
                  <div className="mt-1 flex items-center gap-4 text-[11px] font-mono text-emerald-700">
                    <span>
                      GPS: [{batch.gpsLatitude.toFixed(4)}, {batch.gpsLongitude.toFixed(4)}]
                    </span>
                    {batch.elevationMeters && <span>Elevation: {batch.elevationMeters}m MSL</span>}
                  </div>
                </div>

                {/* Harvest Method & Notes */}
                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs">
                  <span className="text-zinc-500 block text-[11px]">Harvest Method & Traditional Practice</span>
                  <p className="text-zinc-800 mt-0.5">{batch.harvestMethod}</p>
                  {batch.notes && <p className="text-zinc-600 text-[11px] italic mt-1">{batch.notes}</p>}
                </div>
              </div>

              {/* QR Code & Provenance Pass */}
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-semibold text-zinc-800 mb-2 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  Public Verification QR
                </span>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Batch QR Code" className="w-32 h-32 rounded-lg shadow-xs bg-white p-1" />
                ) : (
                  <div className="w-32 h-32 bg-zinc-200 rounded-lg animate-pulse" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    onOpenPublicVerify(batch.batchNumber);
                    onClose();
                  }}
                  className="mt-3 text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline"
                >
                  <span>Open Public Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Cryptographic Ledger Transaction Hash */}
            <div className="bg-zinc-900 text-zinc-300 p-3.5 rounded-xl text-xs space-y-1 font-mono">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  Cryptographic Ledger Block #{batch.blockNumber}
                </span>
                <span className="text-emerald-400 font-semibold">Chained & Immutable</span>
              </div>
              <div className="break-all text-[11px] text-zinc-200">TxHash: {batch.blockchainHash}</div>
            </div>

            {/* Laboratory Test Results if available */}
            {labTests.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-blue-600" />
                  {t('labCertificateTitle')} ({labTests.length})
                </h3>
                <div className="space-y-2">
                  {labTests.map((test) => (
                    <div key={test.id} className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-blue-900">{test.labName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            test.overallStatus === 'Approved'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {test.overallStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-500 block">Moisture:</span>
                          <span className="font-medium">{test.moisturePercent}%</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Pesticide:</span>
                          <span className="font-medium">{test.pesticideResiduePpm} ppm</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Heavy Metals:</span>
                          <span className="font-medium text-emerald-700">
                            {test.heavyMetalsPass ? 'Passed Limits' : 'Failed'}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">{test.activePhytochemical}:</span>
                          <span className="font-bold text-blue-800">{test.activePhytochemicalPercent}%</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-600 mt-2 italic">{test.notes}</p>
                      <div className="mt-2 text-[10px] font-mono text-zinc-500 break-all">
                        COA Hash: {test.certificateHash}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supply Chain Timeline */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                {t('timelineTitle')} ({events.length})
              </h3>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                {events.map((evt) => (
                  <div key={evt.id} className="relative text-xs">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-200" />
                    <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900">{evt.title}</span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-zinc-600 mt-1">{evt.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-zinc-500 font-mono">
                        <span>Location: {evt.location}</span>
                        <span>Role: {evt.actorRole}</span>
                        <span className="text-emerald-700 truncate max-w-[200px]">Tx: {evt.txHash}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
