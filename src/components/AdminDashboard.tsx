import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CheckCircle,
  XCircle,
  FileText,
  Activity,
  AlertCircle,
  Search,
  Filter,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { User, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadAdminData = () => {
    setLoading(true);
    Promise.all([api.getAdminUsers(), api.getAuditLogs()])
      .then(([usersRes, logsRes]) => {
        setUsers(usersRes.users);
        setAuditLogs(logsRes.logs);
      })
      .catch((err) => console.error('Admin data load failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleApproval = async (targetUser: User) => {
    try {
      const newStatus = !targetUser.isApproved;
      await api.updateAdminUserStatus(targetUser.id, { isApproved: newStatus });
      setActionMsg(`User ${targetUser.email} approval set to ${newStatus}`);
      loadAdminData();
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleChangeRole = async (targetUser: User, newRole: User['role']) => {
    try {
      await api.updateAdminUserStatus(targetUser.id, { role: newRole });
      setActionMsg(`User ${targetUser.email} role updated to ${newRole}`);
      loadAdminData();
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.role.toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.organization && u.organization.toLowerCase().includes(searchUser.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Banner */}
      <div className="bg-linear-to-r from-purple-900 via-indigo-950 to-zinc-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-purple-300" />
          <span className="text-xs font-semibold tracking-wider uppercase text-purple-200">
            System Administration & Governance
          </span>
        </div>
        <h2 className="text-2xl font-bold font-serif">{t('navAdmin')}</h2>
        <p className="text-xs sm:text-sm text-purple-100/90 mt-1 max-w-2xl">
          National Medicinal Plants Board (NMPB) & AYUSH Central Authority console for stakeholder management, role enforcement, and cryptographic auditability.
        </p>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* User Management Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold font-serif text-zinc-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-700" />
              <span>Registered Stakeholder Directory ({users.length})</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage live user profiles, approve pending collectors/labs, and assign permissions.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="Filter users..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider bg-zinc-50/50">
                  <th className="py-3 px-3">Stakeholder</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Affiliation / Region</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/70">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-900">{u.fullName}</div>
                      <div className="text-[11px] text-zinc-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u, e.target.value as any)}
                        disabled={u.id === user?.id} // Don't let admin demote self
                        className="text-xs border border-zinc-200 rounded-md px-2 py-1 bg-white font-medium focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Collector">Collector</option>
                        <option value="Processor">Processor</option>
                        <option value="LabVerifier">LabVerifier</option>
                        <option value="Manufacturer">Manufacturer</option>
                        <option value="Consumer">Consumer</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-zinc-600">
                      <div>{u.organization || 'Independent Stakeholder'}</div>
                      <div className="text-[11px] text-zinc-400">{u.location || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {u.isApproved ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {u.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.id !== user?.id && (
                        <button
                          type="button"
                          onClick={() => handleToggleApproval(u)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors border ${
                            u.isApproved
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isApproved ? 'Revoke Approval' : 'Approve User'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Real Audit Logs */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xs space-y-4">
        <h3 className="text-base font-bold font-serif text-zinc-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-700" />
          <span>Immutable Audit Log Trail ({auditLogs.length} Events)</span>
        </h3>
        <p className="text-xs text-zinc-500">
          Every creation, update, verification, and authentication event is strictly audited.
        </p>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700">
                    {log.action}
                  </span>
                  <span className="font-semibold text-zinc-800">
                    {log.entityType} ({log.entityId})
                  </span>
                </div>
                <p className="text-zinc-600 text-[11px]">{log.details}</p>
              </div>

              <div className="text-[10px] text-zinc-400 font-mono text-right whitespace-nowrap">
                <div>By: {log.performedByName} ({log.role})</div>
                <div>{new Date(log.timestamp).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
