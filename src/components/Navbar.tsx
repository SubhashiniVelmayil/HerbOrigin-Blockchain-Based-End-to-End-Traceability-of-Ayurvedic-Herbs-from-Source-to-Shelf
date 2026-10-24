import React, { useState, useEffect } from 'react';
import {
  Leaf,
  ShieldCheck,
  Globe,
  Wifi,
  WifiOff,
  LogOut,
  User as UserIcon,
  Layers,
  FlaskConical,
  Factory,
  Cpu,
  QrCode,
  Sliders,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { OfflineManager, OfflineDraft } from '../services/offline';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenPublicVerify: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenProfile,
  onOpenPublicVerify,
}) => {
  const { user, logout, hasRole } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isOnline, setIsOnline] = useState<boolean>(OfflineManager.isOnline());
  const [draftsCount, setDraftsCount] = useState<number>(OfflineManager.getDrafts().length);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const unsub = OfflineManager.subscribe((status) => {
      setIsOnline(status);
      setDraftsCount(OfflineManager.getDrafts().length);
    });
    return unsub;
  }, []);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Collector':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Processor':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LabVerifier':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Manufacturer':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-300';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200 shadow-xs">
      {/* Top Banner for Blockchain & Network Honesty */}
      <div className="bg-emerald-900 text-emerald-100 text-xs py-1 px-4 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium">
            Ayurvedic Herb Provenance Protocol • Immutable Cryptographic Ledger
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-emerald-300" />
            <span>Honest Mode: SHA-256 Chained Blocks (Sepolia / Amoy Ready)</span>
          </span>
          <span className="flex items-center gap-1">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-300">
                <Wifi className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-300 font-semibold">
                <WifiOff className="w-3 h-3" /> Offline Draft Mode
              </span>
            )}
          </span>
          {draftsCount > 0 && (
            <span className="bg-amber-500 text-black px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {draftsCount} Drafts Queued
            </span>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <Leaf className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">HerbOrigin</h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  AYUSH Trace
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 hidden sm:block truncate max-w-md">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Right Action Tools: Language Switcher, Public QR, Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  language === 'en'
                    ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  language === 'ta'
                    ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                தமிழ்
              </button>
            </div>

            {/* Public QR Verification Shortcut */}
            <button
              type="button"
              onClick={onOpenPublicVerify}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline">{t('navPublicVerify')}</span>
            </button>

            {/* User Account / Auth Button */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 border border-zinc-200 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-zinc-900 leading-tight max-w-[120px] truncate">
                      {user.fullName}
                    </p>
                    <span
                      className={`inline-block text-[10px] px-1.5 py-0.2 rounded border font-medium ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-zinc-200 py-1.5 z-50 text-xs"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-zinc-100">
                      <p className="font-semibold text-zinc-900 truncate">{user.fullName}</p>
                      <p className="text-zinc-500 text-[11px] truncate">{user.email}</p>
                      <span
                        className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded border font-medium ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenProfile}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700"
                    >
                      <UserIcon className="w-4 h-4 text-zinc-400" />
                      {t('profile')}
                    </button>

                    <button
                      type="button"
                      onClick={() => logout()}
                      className="w-full text-left px-3 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 border-t border-zinc-100"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      {t('signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>{t('signIn')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-zinc-100 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            {t('navOverview')}
          </button>

          <button
            onClick={() => setActiveTab('batches')}
            className={`px-3 py-1.5 font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'batches'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            {t('navBatches')}
          </button>

          {/* Collector Module: accessible to Collector or Admin */}
          {(hasRole(['Collector']) || !user) && (
            <button
              onClick={() => setActiveTab('collector')}
              className={`px-3 py-1.5 font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'collector'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              🌿 {t('navCollector')}
            </button>
          )}

          {/* Processor Module */}
          {(hasRole(['Processor']) || !user) && (
            <button
              onClick={() => setActiveTab('processor')}
              className={`px-3 py-1.5 font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'processor'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              ⚙️ {t('navProcessor')}
            </button>
          )}

          {/* Lab Verifier Module */}
          {(hasRole(['LabVerifier']) || !user) && (
            <button
              onClick={() => setActiveTab('lab')}
              className={`px-3 py-1.5 font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'lab'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              🔬 {t('navLabVerifier')}
            </button>
          )}

          {/* Manufacturer Module */}
          {(hasRole(['Manufacturer']) || !user) && (
            <button
              onClick={() => setActiveTab('manufacturer')}
              className={`px-3 py-1.5 font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'manufacturer'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              🏭 {t('navManufacturer')}
            </button>
          )}

          {/* Blockchain & Smart Contract Explorer */}
          <button
            onClick={() => setActiveTab('blockchain')}
            className={`px-3 py-1.5 font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'blockchain'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            ⛓️ {t('navBlockchain')}
          </button>

          {/* Admin Dashboard */}
          {hasRole(['Admin']) && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'admin'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              🛡️ {t('navAdmin')}
            </button>
          )}

          {/* Automated E2E Test Suite */}
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1.5 font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'tests'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 font-semibold'
            }`}
          >
            ✅ {t('navE2ETests')}
          </button>
        </div>
      </div>
    </header>
  );
};
