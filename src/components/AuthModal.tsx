import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Shield,
  Building,
  MapPin,
  FileBadge,
  KeyRound,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const { login, register, error, clearError } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('Collector');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [adminSecretKey, setAdminSecretKey] = useState('');

  // Reset Token Info
  const [generatedResetToken, setGeneratedResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    clearError();
    setFormError(null);
    setSuccessMsg(null);
    onClose();
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'Empty', color: 'bg-zinc-200', score: 0 };
    if (pwd.length < 6) return { label: 'Weak (min 6 chars)', color: 'bg-rose-500', score: 1 };
    const hasNum = /\d/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    if (pwd.length >= 8 && hasNum && hasSpecial) {
      return { label: 'Strong', color: 'bg-emerald-500', score: 3 };
    }
    return { label: 'Medium', color: 'bg-amber-500', score: 2 };
  };

  const strength = getPasswordStrength(password);

  const [showDemoBox, setShowDemoBox] = useState(false);

  const fillQuickCredentials = (presetRole: 'Admin' | 'Collector' | 'Processor' | 'Lab' | 'Manufacturer') => {
    clearError();
    setFormError(null);
    setMode('login');
    if (presetRole === 'Admin') {
      setEmail('admin@herborigin.gov.in');
      setPassword('Password123!');
    } else if (presetRole === 'Collector') {
      setEmail('murugan@westernghatsherbs.org');
      setPassword('Password123!');
    } else if (presetRole === 'Processor') {
      setEmail('processor@ayurtrace.org');
      setPassword('Password123!');
    } else if (presetRole === 'Lab') {
      setEmail('ananya@ayurcertlabs.in');
      setPassword('Password123!');
    } else if (presetRole === 'Manufacturer') {
      setEmail('mfg@vaidyaherbals.com');
      setPassword('Password123!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormError(null);
    setSuccessMsg(null);

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setFormError('Please enter both email and password.');
        return;
      }
      try {
        setLoading(true);
        await login(email.trim(), password);
        setSuccessMsg('Logged in successfully!');
        setTimeout(() => handleClose(), 600);
      } catch (err: any) {
        setFormError(err.message || 'Login failed. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'register') {
      if (!fullName.trim()) {
        setFormError('Full name is required.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setFormError('A valid email address is required.');
        return;
      }
      if (password.length < 6) {
        setFormError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Password and Confirm Password do not match.');
        return;
      }
      if (role === 'Admin' && !adminSecretKey.trim()) {
        setFormError('Administrator account requires the Admin Security Key (NMPB-HERBORIGIN-ADMIN-2025).');
        return;
      }

      try {
        setLoading(true);
        await register({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          role,
          phone: phone.trim() || undefined,
          organization: organization.trim() || undefined,
          location: location.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          adminSecretKey: adminSecretKey.trim() || undefined,
        });
        setSuccessMsg('Account registered successfully!');
        setTimeout(() => handleClose(), 700);
      } catch (err: any) {
        setFormError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'forgot') {
      if (!generatedResetToken) {
        if (!email.trim()) {
          setFormError('Please provide registered email.');
          return;
        }
        try {
          setLoading(true);
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to request reset token');
          if (data.resetToken) {
            setGeneratedResetToken(data.resetToken);
            setSuccessMsg('Security reset token generated! Please set your new password below.');
          } else {
            setSuccessMsg(data.message);
          }
        } catch (err: any) {
          setFormError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        if (!newPassword || newPassword.length < 6) {
          setFormError('New password must be at least 6 characters.');
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setFormError('Passwords do not match.');
          return;
        }
        try {
          setLoading(true);
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: generatedResetToken,
              newPassword,
              confirmPassword: confirmNewPassword,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to reset password');
          setSuccessMsg('Password changed successfully! You may now sign in.');
          setTimeout(() => {
            setMode('login');
            setGeneratedResetToken(null);
            setPassword(newPassword);
          }, 1200);
        } catch (err: any) {
          setFormError(err.message);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white p-6 relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-emerald-300" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-200">
              HerbOrigin Secure Identity
            </span>
          </div>
          <h2 className="text-xl font-bold font-serif">
            {mode === 'login'
              ? t('welcomeBack')
              : mode === 'register'
              ? t('createYourAccount')
              : t('resetPassword')}
          </h2>
          <p className="text-xs text-emerald-100/80 mt-1">
            {mode === 'login'
              ? 'Sign in to access your role-based Ayurvedic supply chain workstation.'
              : mode === 'register'
              ? 'Register with your verified stakeholder role in the herbal supply chain.'
              : 'Recover your account credentials securely.'}
          </p>
        </div>



        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode: LOGIN */}
          {mode === 'login' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('emailLabel')}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. collector@westernghatsherbs.org"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700">{t('passwordLabel')}</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setFormError(null);
                    }}
                    className="text-[11px] text-emerald-700 hover:underline"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Mode: REGISTER */}
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('fullNameLabel')} *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Murugan Palanisamy"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('emailLabel')} *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="murugan@herbs.org"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('roleLabel')} *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                >
                  <option value="Collector">{t('roleCollector')}</option>
                  <option value="Processor">{t('roleProcessor')}</option>
                  <option value="LabVerifier">{t('roleLabVerifier')}</option>
                  <option value="Manufacturer">{t('roleManufacturer')}</option>
                  <option value="Consumer">{t('roleConsumer')}</option>
                  <option value="Admin">{t('roleAdmin')} (Requires Key)</option>
                </select>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Each role receives dedicated cryptographic workstations for harvest tagging, lab testing, or formulation.
                </p>
              </div>

              {/* Admin Secret Key Guard */}
              {role === 'Admin' && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <label className="block text-xs font-semibold text-purple-900 mb-1">
                    {t('adminSecretLabel')} *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-purple-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={adminSecretKey}
                      onChange={(e) => setAdminSecretKey(e.target.value)}
                      placeholder="Enter Admin Security Key (e.g. NMPB-HERBORIGIN-ADMIN-2025)"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                  <p className="text-[10px] text-purple-700 mt-1">
                    Default dev key: <code className="font-mono bg-purple-100 px-1 rounded">NMPB-HERBORIGIN-ADMIN-2025</code>
                  </p>
                </div>
              )}

              {/* Organization & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('organizationLabel')}</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Tribal Forager Cooperative"
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('locationLabel')}</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Nilgiris, Tamil Nadu"
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Phone & License */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('phoneLabel')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98400 12345"
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('licenseLabel')}</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. AYUSH-TN-4091"
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('passwordLabel')} *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {password && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1 flex-1 bg-zinc-200 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color}`} style={{ width: `${(strength.score / 3) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-zinc-500">{strength.label}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('confirmPasswordLabel')} *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </>
          )}

          {/* Mode: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <div className="space-y-3">
              {!generatedResetToken ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('emailLabel')} *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="registered@email.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                  <div className="text-[11px] font-mono text-emerald-800 break-all bg-emerald-100 p-2 rounded">
                    Token: {generatedResetToken}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('enterNewPassword')}</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 chars"
                      className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">{t('confirmPasswordLabel')}</label>
                    <input
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md shadow-emerald-700/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Processing...</span>
            ) : mode === 'login' ? (
              t('signIn')
            ) : mode === 'register' ? (
              t('signUp')
            ) : generatedResetToken ? (
              t('saveChanges')
            ) : (
              t('sendResetLink')
            )}
          </button>

          {/* Mode Switch Footer */}
          <div className="text-center pt-2 text-xs text-zinc-600">
            {mode === 'login' ? (
              <p>
                {t('dontHaveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setFormError(null);
                  }}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  {t('signUp')}
                </button>
              </p>
            ) : (
              <p>
                {t('alreadyHaveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setFormError(null);
                  }}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  {t('signIn')}
                </button>
              </p>
            )}
          </div>

          {/* Collapsible Demo Mode Box */}
          <div className="pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setShowDemoBox(!showDemoBox)}
              className="w-full py-1 text-center text-[11px] text-zinc-500 hover:text-emerald-800 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{showDemoBox ? 'Hide Demo Sandbox Accounts' : 'Looking for evaluation accounts? Click to view Demo Sandbox'}</span>
            </button>
            {showDemoBox && (
              <div className="mt-2 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/70 text-[11px] space-y-2">
                <div className="flex items-center justify-between text-emerald-900 font-semibold">
                  <span>Demo Sandbox Stakeholder Accounts:</span>
                  <span className="text-[10px] bg-emerald-200/80 px-1.5 py-0.2 rounded text-emerald-900 font-bold uppercase">Evaluation Only</span>
                </div>
                <p className="text-zinc-600 text-[10px]">
                  You can self-register any unique account above with full database persistence. Or click below to test with pre-configured sandbox credentials:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('Collector')}
                    className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-semibold text-[10px] border border-emerald-300"
                  >
                    🌿 Farmer / Collector
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('Processor')}
                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-semibold text-[10px] border border-amber-300"
                  >
                    ⚙️ Processor
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('Lab')}
                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded font-semibold text-[10px] border border-blue-300"
                  >
                    🔬 Lab Verifier
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('Manufacturer')}
                    className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded font-semibold text-[10px] border border-indigo-300"
                  >
                    🏭 Manufacturer
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('Admin')}
                    className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded font-semibold text-[10px] border border-purple-300"
                  >
                    🛡️ Admin
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
