/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { OverviewDashboard } from './components/OverviewDashboard';
import { BatchList } from './components/BatchList';
import { BatchDetailModal } from './components/BatchDetailModal';
import { CollectorModule } from './components/CollectorModule';
import { ProcessorModule } from './components/ProcessorModule';
import { LabVerifierModule } from './components/LabVerifierModule';
import { ManufacturerModule } from './components/ManufacturerModule';
import { PublicVerifyModal } from './components/PublicVerifyModal';
import { BlockchainExplorer } from './components/BlockchainExplorer';
import { AdminDashboard } from './components/AdminDashboard';
import { E2ETestRunner } from './components/E2ETestRunner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { api } from './services/api';
import { HerbBatch, Product, LedgerBlock } from './types';
import { OfflineManager } from './services/offline';

function MainApp() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [batches, setBatches] = useState<HerbBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<LedgerBlock[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Search & Filter state
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultMode, setAuthDefaultMode] = useState<'login' | 'register'>('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [editingBatch, setEditingBatch] = useState<HerbBatch | null>(null);
  const [publicVerifyOpen, setPublicVerifyOpen] = useState(false);
  const [publicVerifyCode, setPublicVerifyCode] = useState<string>('');

  // Handle URL query parameter for QR code scanning e.g. `?verify=HO-ASH-2025-001`
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const verifyParam = params.get('verify');
      if (verifyParam) {
        setPublicVerifyCode(verifyParam);
        setPublicVerifyOpen(true);
      }
    }
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [batchesRes, productsRes, ledgerRes, statsRes] = await Promise.all([
        api.getBatches({ search: search || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined }),
        api.getProducts(),
        api.getLedgerBlocks(),
        api.getStats(),
      ]);
      setBatches(batchesRes.batches);
      setProducts(productsRes.products);
      setLedger(ledgerRes.blocks);
      setStats(statsRes.metrics);
    } catch (err) {
      console.error('Error loading app data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const handleEditBatch = (batch: HerbBatch) => {
    setEditingBatch(batch);
    setActiveTab('collector');
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await api.deleteBatch(batchId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete batch');
    }
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthDefaultMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenPublicVerify = (code: string = '') => {
    setPublicVerifyCode(code);
    setPublicVerifyOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-100/70 text-zinc-900 font-sans flex flex-col">
      {/* Main App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (editingBatch && tab !== 'collector') {
            setEditingBatch(null);
          }
          setActiveTab(tab);
        }}
        onOpenAuth={() => handleOpenAuth('login')}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenPublicVerify={() => handleOpenPublicVerify('')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewDashboard
            stats={stats}
            batches={batches}
            ledger={ledger}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectBatch={(id) => setSelectedBatchId(id)}
            onOpenPublicVerify={() => handleOpenPublicVerify('')}
          />
        )}

        {activeTab === 'batches' && (
          <BatchList
            batches={batches}
            loading={loadingData}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onSelectBatch={(id) => setSelectedBatchId(id)}
            onEditBatch={handleEditBatch}
            onDeleteBatch={handleDeleteBatch}
            onNavigateToCollector={() => {
              setEditingBatch(null);
              setActiveTab('collector');
            }}
          />
        )}

        {activeTab === 'collector' && (
          <CollectorModule
            editingBatch={editingBatch}
            onCancelEdit={() => {
              setEditingBatch(null);
              setActiveTab('batches');
            }}
            onBatchCreated={(newBatch) => {
              setEditingBatch(null);
              loadData();
              if (newBatch) {
                setSelectedBatchId(newBatch.id);
              }
              setActiveTab('batches');
            }}
            onSelectBatch={(id) => setSelectedBatchId(id)}
            onOpenAuth={() => handleOpenAuth('login')}
          />
        )}

        {activeTab === 'processor' && (
          <ProcessorModule
            batches={batches}
            onEventAdded={() => {
              loadData();
              setActiveTab('batches');
            }}
            onOpenAuth={() => handleOpenAuth('login')}
          />
        )}

        {activeTab === 'lab' && (
          <LabVerifierModule
            batches={batches}
            onTestSubmitted={() => {
              loadData();
              setActiveTab('batches');
            }}
            onOpenAuth={() => handleOpenAuth('login')}
          />
        )}

        {activeTab === 'manufacturer' && (
          <ManufacturerModule
            batches={batches}
            products={products}
            onProductCreated={() => loadData()}
            onOpenAuth={() => handleOpenAuth('login')}
            onOpenPublicVerify={(code) => handleOpenPublicVerify(code)}
          />
        )}

        {activeTab === 'blockchain' && <BlockchainExplorer />}

        {activeTab === 'admin' && <AdminDashboard />}

        {activeTab === 'tests' && <E2ETestRunner onTestsFinished={() => loadData()} />}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authDefaultMode}
      />

      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      <BatchDetailModal
        batchId={selectedBatchId}
        onClose={() => setSelectedBatchId(null)}
        onEdit={(b) => handleEditBatch(b)}
        onDeleted={() => {
          setSelectedBatchId(null);
          loadData();
        }}
        onOpenPublicVerify={(code) => handleOpenPublicVerify(code)}
      />

      <PublicVerifyModal
        isOpen={publicVerifyOpen}
        onClose={() => {
          setPublicVerifyOpen(false);
          setPublicVerifyCode('');
        }}
        initialCode={publicVerifyCode}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-6 text-xs text-zinc-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-800 font-serif">HerbOrigin</span>
            <span>•</span>
            <span>{t('appSubtitle')}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>NMPB &amp; AYUSH Pharmacopoeia Architecture</span>
            <span>•</span>
            <span className="text-emerald-700 font-mono font-medium">Cryptographic Ledger v2.4</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}
