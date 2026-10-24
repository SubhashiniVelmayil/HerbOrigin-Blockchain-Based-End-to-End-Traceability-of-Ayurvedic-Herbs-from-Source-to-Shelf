import React from 'react';
import {
  Leaf,
  Scale,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  TrendingUp,
  FlaskConical,
  Factory,
  Cog,
  QrCode,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';
import { HerbBatch, LedgerBlock } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface OverviewDashboardProps {
  stats: {
    totalBatches: number;
    totalQuantityKg: number;
    approvedBatches: number;
    pendingBatches: number;
    rejectedBatches: number;
    passRatePercent: number;
    totalProducts: number;
    totalBlocks: number;
    totalTransactions: number;
    rolesBreakdown: Record<string, number>;
  } | null;
  batches: HerbBatch[];
  ledger: LedgerBlock[];
  onNavigateTab: (tab: string) => void;
  onSelectBatch: (id: string) => void;
  onOpenPublicVerify: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  stats,
  batches,
  ledger,
  onNavigateTab,
  onSelectBatch,
  onOpenPublicVerify,
}) => {
  const { user, hasRole } = useAuth();
  const { t } = useLanguage();

  const totalBatches = stats?.totalBatches || batches.length;
  const totalVolume = stats?.totalQuantityKg || batches.reduce((acc, b) => acc + b.quantityKg, 0);
  const passRate = stats?.passRatePercent ?? 100;
  const blocksCount = stats?.totalBlocks || ledger.length;

  return (
    <div className="space-y-8">
      {/* Hero Welcome Card */}
      <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-zinc-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>AYUSH National Pharmacopoeia Compliance</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold font-serif leading-tight">
            {t('appName')}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            {t('appSubtitle')}. Every wild harvest, solar drying step, NABL laboratory assay, and medicine packaging event is anchored onto an immutable cryptographic Merkle ledger.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('batches')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
            >
              <span>Explore Herb Batches</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenPublicVerify}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-emerald-300" />
              <span>Verify Consumer QR</span>
            </button>
          </div>
        </div>

        {/* Decorative background leaf illustration */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <Leaf className="w-96 h-96 text-white" />
        </div>
      </div>

      {/* Dynamic Calculated Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold">{t('totalBatches')}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 font-serif">
            {totalBatches}
          </div>
          <p className="text-[11px] text-zinc-500">
            {stats?.pendingBatches || 0} in active pipeline
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold">{t('totalHarvestedKg')}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 font-serif">
            {totalVolume} <span className="text-sm font-normal text-zinc-500">kg</span>
          </div>
          <p className="text-[11px] text-zinc-500">Wild-harvested medicinal biomass</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold">{t('passRate')}</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-serif">
            {passRate}%
          </div>
          <p className="text-[11px] text-zinc-500">Heavy metal &amp; pesticide free</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold">{t('ledgerBlocks')}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 font-serif">
            {blocksCount}
          </div>
          <p className="text-[11px] text-zinc-500">Deterministic SHA-256 Merkle chain</p>
        </div>
      </div>

      {/* Stakeholder Workstation Portals */}
      <div className="space-y-4">
        <h3 className="text-base font-bold font-serif text-zinc-900">
          Role-Based Stakeholder Workstations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Collector */}
          <div
            onClick={() => onNavigateTab('collector')}
            className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                <Leaf className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 text-sm font-serif">Wild Herb Collector</h4>
              <p className="text-xs text-zinc-500 mt-1">
                Geo-tag wild medicinal plant harvests with live GPS, field photos, and Tamil/English voice notes.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span>Open Collector Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Processor */}
          <div
            onClick={() => onNavigateTab('processor')}
            className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                <Cog className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 text-sm font-serif">Herbal Processing Unit</h4>
              <p className="text-xs text-zinc-500 mt-1">
                Record solar dehydration, moisture reduction, grading, and low-temperature pulverization steps.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-amber-700">
              <span>Open Processor Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Lab Verifier */}
          <div
            onClick={() => onNavigateTab('lab')}
            className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-3">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 text-sm font-serif">Laboratory Verifier</h4>
              <p className="text-xs text-zinc-500 mt-1">
                Perform ICP-MS heavy metal tests, pesticide screening, and HPLC active marker concentration analysis.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-blue-700">
              <span>Open Lab Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 4: Manufacturer */}
          <div
            onClick={() => onNavigateTab('manufacturer')}
            className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center mb-3">
                <Factory className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 text-sm font-serif">Drug Manufacturer</h4>
              <p className="text-xs text-zinc-500 mt-1">
                Link certified batches into finished Ayurvedic formulations and generate customer transparency QR codes.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-indigo-700">
              <span>Open Mfg Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Herb Batches & Ledger Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Batches */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-serif text-zinc-900">
              Recently Harvested Herb Batches
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('batches')}
              className="text-xs text-emerald-700 hover:underline font-semibold"
            >
              View all ({batches.length})
            </button>
          </div>

          <div className="divide-y divide-zinc-100">
            {batches.slice(0, 4).map((b) => (
              <div
                key={b.id}
                onClick={() => onSelectBatch(b.id)}
                className="py-3 flex items-center justify-between gap-3 hover:bg-zinc-50 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.2 rounded">
                      {b.batchNumber}
                    </span>
                    <span className="font-bold text-zinc-900 text-xs font-serif">{b.herbName}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate max-w-sm mt-0.5">
                    {b.region} • {b.quantityKg} kg • Collector: {b.collectorName}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      b.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'InTesting'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {b.status}
                  </span>
                  <span className="block text-[10px] font-mono text-zinc-400 mt-1">
                    Blk #{b.blockNumber}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Recent Ledger Activity */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-serif text-zinc-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-700" />
              <span>Ledger Blocks</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('blockchain')}
              className="text-xs text-purple-700 hover:underline font-semibold"
            >
              Explorer
            </button>
          </div>

          <div className="space-y-3">
            {ledger
              .slice()
              .reverse()
              .slice(0, 4)
              .map((block) => (
                <div
                  key={block.blockHeight}
                  className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs space-y-1 font-mono"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-zinc-800">Block #{block.blockHeight}</span>
                    <span className="text-zinc-400">{block.transactionsCount} txs</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    Hash: {block.blockHash.substring(0, 22)}...
                  </div>
                  <div className="text-[10px] text-emerald-700 truncate">
                    Root: {block.merkleRoot.substring(0, 20)}...
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
