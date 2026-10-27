import React, { useState } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Scale,
  QrCode,
  Eye,
  Edit,
  Trash2,
  Plus,
  ShieldCheck,
  AlertCircle,
  Leaf,
  Layers,
} from 'lucide-react';
import { HerbBatch, BatchStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface BatchListProps {
  batches: HerbBatch[];
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onSelectBatch: (id: string) => void;
  onEditBatch?: (batch: HerbBatch) => void;
  onDeleteBatch?: (id: string) => void;
  onNavigateToCollector: () => void;
}

export const BatchList: React.FC<BatchListProps> = ({
  batches,
  loading,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onSelectBatch,
  onEditBatch,
  onDeleteBatch,
  onNavigateToCollector,
}) => {
  const { user, hasRole } = useAuth();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [onlyMyBatches, setOnlyMyBatches] = useState<boolean>(user?.role === 'Collector');

  const myBatchesCount = user ? batches.filter((b) => b.collectorId === user.id).length : 0;
  const displayedBatches =
    onlyMyBatches && user && user.role === 'Collector'
      ? batches.filter((b) => b.collectorId === user.id)
      : batches;

  const getStatusBadge = (status: BatchStatus) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'InTesting':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'InProcessing':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Collected':
        return 'bg-lime-100 text-lime-800 border-lime-300';
      case 'Formulated':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Collector Filter Header */}
      {user && user.role === 'Collector' && (
        <div className="flex items-center justify-between bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/70 text-xs">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-700" />
            <span className="font-semibold text-emerald-950">Farmer Workstation Filter:</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOnlyMyBatches(true)}
              className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
                onlyMyBatches
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              My Harvest Batches ({myBatchesCount})
            </button>
            <button
              type="button"
              onClick={() => setOnlyMyBatches(false)}
              className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
                !onlyMyBatches
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              All Registry Batches ({batches.length})
            </button>
          </div>
        </div>
      )}

      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className="w-full pl-10 pr-4 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-zinc-50/50"
          />
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-zinc-700 focus:outline-hidden font-medium"
            >
              <option value="ALL">{t('allStatuses')}</option>
              <option value="Collected">Harvested (Collected)</option>
              <option value="InProcessing">In Processing</option>
              <option value="InTesting">In Lab Testing</option>
              <option value="Approved">Certified Approved</option>
              <option value="Formulated">Formulated into Product</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Add New Batch Button */}
          {(hasRole(['Collector']) || !user) && (
            <button
              type="button"
              onClick={onNavigateToCollector}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t("registerNewHerbBatch")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500">Loading batches...</div>
      ) : displayedBatches.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-zinc-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Leaf className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-800">No herb batches match your filter criteria</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your search terms or clearing status filters.'
              : 'Be the first to register a sustainable wild-harvested herb batch onto the cryptographic ledger.'}
          </p>
          {(hasRole(['Collector']) || !user) && (
            <button
              type="button"
              onClick={onNavigateToCollector}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800"
            >
              <Plus className="w-4 h-4" />
              <span>{t("registerNewHerbBatch")}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedBatches.map((b) => {
            const canEdit =
              user && (user.role === 'Admin' || (user.id === b.collectorId && b.status !== 'Approved'));
            const canDelete =
              user && (user.role === 'Admin' || (user.id === b.collectorId && b.status !== 'Approved'));

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Batch Number + Status Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {b.batchNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                        b.status
                      )}`}
                    >
                      {b.status}
                    </span>
                  </div>

                  {/* Herb Name & Botanical */}
                  <h3 className="text-base font-bold text-zinc-900 font-serif leading-snug">{b.herbName}</h3>
                  <p className="text-xs text-emerald-800 italic font-mono mb-3">{b.botanicalName}</p>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 mb-3 bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100">
                    <div className="flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{b.quantityKg} kg</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{b.collectionDate}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{b.region}</span>
                    </div>
                  </div>

                  {/* Collector attribution */}
                  <div className="text-[11px] text-zinc-500 mb-4 flex items-center justify-between">
                    <span>Collector: {b.collectorName}</span>
                    <span className="font-mono text-emerald-700 text-[10px]">Blk #{b.blockNumber}</span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectBatch(b.id)}
                    className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-200/60"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{t('viewDetails')}</span>
                  </button>

                  {canEdit && onEditBatch && (
                    <button
                      type="button"
                      onClick={() => onEditBatch(b)}
                      title="Edit Batch"
                      className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg border border-zinc-200"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canDelete && onDeleteBatch && (
                    <button
                      type="button"
                      onClick={() => onDeleteBatch(b.id)}
                      title="Delete Batch"
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
