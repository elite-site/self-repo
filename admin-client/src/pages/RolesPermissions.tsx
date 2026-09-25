import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { RolesResponse } from '../types';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Users,
  Key,
  Shield,
  X,
  Check,
} from 'lucide-react';

export const RolesPermissions: React.FC = () => {
  const [data, setData] = useState<RolesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Role Assignment State
  const [assigningAdminId, setAssigningAdminId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const loadRoles = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getRoles();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load roles & permissions:', err);
      setError(err?.response?.data?.message || 'Failed to load security roles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleAssign = async (adminId: string, roleId: string) => {
    setAssigningAdminId(adminId);
    setSuccess(null);
    try {
      await adminApi.assignRole(adminId, roleId);
      setSuccess('Security role assigned successfully.');
      await loadRoles(true);
    } catch (err: any) {
      console.error('Failed to assign role:', err);
      setError(err?.response?.data?.message || 'Failed to assign role');
    } finally {
      setAssigningAdminId(null);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await adminApi.createRole({
        name: newRoleName.trim().toUpperCase().replace(/\s+/g, '_'),
        description: newRoleDesc.trim() || undefined,
      });
      setIsModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setSuccess('Custom security role created.');
      await loadRoles(true);
    } catch (err: any) {
      console.error('Failed to create role:', err);
      setError(err?.response?.data?.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-3 border-elite-red border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Loading access control matrix...</p>
      </div>
    );
  }

  const roles = data?.roles || [];
  const admins = data?.admins || [];

  const defaultModules = [
    { name: 'Dashboard & Submissions', superAdmin: true, admin: true, moderator: true },
    { name: 'Student Portfolio Moderation', superAdmin: true, admin: true, moderator: true },
    { name: 'Event Registration & Teams', superAdmin: true, admin: true, moderator: false },
    { name: 'Campus Voting Management', superAdmin: true, admin: true, moderator: false },
    { name: 'Email Automations & Dispatches', superAdmin: true, admin: true, moderator: false },
    { name: 'Storage & Drive Infrastructure', superAdmin: true, admin: false, moderator: false },
    { name: 'Roles & Audit Security Logs', superAdmin: true, admin: false, moderator: false },
    { name: 'Institutional Portal Settings', superAdmin: true, admin: false, moderator: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-elite-red" />
            Roles & Access Permissions (RBAC)
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Role-Based Access Control matrix governing administrative privileges across portal features.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadRoles(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-elite-red' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-elite-red text-white text-xs font-bold rounded-lg hover:bg-elite-red-dark transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Role
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="font-bold underline text-emerald-700 dark:text-emerald-300">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline text-rose-700 dark:text-rose-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Roles Cards Grid */}
      <div>
        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
          <Key className="w-4 h-4 text-elite-red" />
          Defined System Roles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => {
            const assignedCount = role.assignments?.length || 0;
            return (
              <div
                key={role.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                      {role.name}
                    </span>
                    {role.isSystem && (
                      <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        System Built-in
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                    {role.description || 'Custom administrative privilege bundle.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    {assignedCount} Assigned {assignedCount === 1 ? 'Admin' : 'Admins'}
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Full Scope
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission Capability Matrix Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Module Authorization Matrix
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Operational boundary across core portal components
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 uppercase font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-5 py-3">Feature Domain</th>
                <th className="px-5 py-3 text-center">SUPER_ADMIN</th>
                <th className="px-5 py-3 text-center">ADMIN</th>
                <th className="px-5 py-3 text-center">MODERATOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
              {defaultModules.map((mod) => (
                <tr key={mod.name} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-neutral-900 dark:text-neutral-100">
                    {mod.name}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {mod.admin ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {mod.moderator ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Administrator Accounts & Active Role Assignment Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Administrator Accounts & Role Assignment
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Assigned credentials with administrative access to this portal instance
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
            {admins.length} Organizers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 uppercase font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-5 py-3">Username</th>
                <th className="px-5 py-3">Email Address</th>
                <th className="px-5 py-3">System Access Role</th>
                <th className="px-5 py-3">Assigned Role Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
              {admins.map((adm) => {
                const isAssigning = assigningAdminId === adm.id;
                return (
                  <tr key={adm.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-neutral-900 dark:text-white">
                      {adm.username}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-neutral-600 dark:text-neutral-400">
                      {adm.email}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                        {adm.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        disabled={isAssigning}
                        defaultValue={roles.find((r) => r.assignments?.some((a) => a.adminId === adm.id))?.id || ''}
                        onChange={(e) => {
                          if (e.target.value) handleAssign(adm.id, e.target.value);
                        }}
                        className="px-2.5 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-elite-red"
                      >
                        <option value="">Default ({adm.role})</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-elite-red" />
                Create Custom Security Role
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Role Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EVENT_COORDINATOR"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline the responsibilities and scope for this role..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
                />
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-bold text-white bg-elite-red rounded-lg hover:bg-elite-red-dark transition-colors disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
