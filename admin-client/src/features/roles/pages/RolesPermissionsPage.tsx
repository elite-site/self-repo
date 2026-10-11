import React from 'react';
import { ShieldCheck, RefreshCw, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { useRoles } from '../hooks/useRoles';
import { RolesCardsGrid } from '../components/RolesCardsGrid';
import { PermissionsMatrixTable } from '../components/PermissionsMatrixTable';
import { AdminAccountsTable } from '../components/AdminAccountsTable';
import { CreateRoleModal } from '../components/CreateRoleModal';

export const RolesPermissionsPage: React.FC = () => {
  const {
    data,
    loading,
    refreshing,
    error,
    setError,
    success,
    setSuccess,
    assigningAdminId,
    isModalOpen,
    setIsModalOpen,
    creating,
    loadRoles,
    handleAssign,
    handleCreateRole,
  } = useRoles();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-ink-muted">Loading access control matrix…</p>
      </div>
    );
  }

  const roles = data?.roles || [];
  const admins = data?.admins || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-ink-brand" />
            Roles & Access Permissions (RBAC)
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Role-Based Access Control matrix governing administrative privileges across portal features.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadRoles(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-ink-secondary bg-surface border border-edge-strong rounded-lg hover:bg-surface-sunken transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-ink-brand' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-on-primary text-xs font-bold rounded-lg hover:bg-brand-hover transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Role
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-status-bg-approved border border-edge flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-status-approved shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="font-bold underline text-status-approved">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-status-bg-rejected border border-edge flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-rejected shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline text-status-rejected">
            Dismiss
          </button>
        </div>
      )}

      {/* Roles Cards Grid */}
      <RolesCardsGrid roles={roles} />

      {/* Permission Capability Matrix Table */}
      <PermissionsMatrixTable />

      {/* Administrator Accounts & Active Role Assignment Table */}
      <AdminAccountsTable
        admins={admins}
        roles={roles}
        assigningAdminId={assigningAdminId}
        onAssign={handleAssign}
      />

      {/* Create Role Modal */}
      <CreateRoleModal
        isOpen={isModalOpen}
        creating={creating}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateRole}
      />
    </div>
  );
};

export default RolesPermissionsPage;
