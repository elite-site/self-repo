import React from 'react';
import { ShieldCheck, RefreshCw, Plus, CheckCircle, AlertCircle, Key, Lock } from 'lucide-react';
import { useRoles } from '../hooks/useRoles';
import { RolesCardsGrid } from '../components/RolesCardsGrid';
import { PermissionsMatrixTable } from '../components/PermissionsMatrixTable';
import { AdminAccountsTable } from '../components/AdminAccountsTable';
import { CreateRoleModal } from '../components/CreateRoleModal';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

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
      <div className="flex flex-col items-center justify-center min-h-[450px] animate-fade-in">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-ink-muted">Loading access control matrix…</p>
      </div>
    );
  }

  const roles = data?.roles || [];
  const admins = data?.admins || [];

  return (
    <div className="space-y-8 animate-fade-in-up text-left">
      {/* 1. TOP ASYMMETRICAL OVERVIEW */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Access Governance (RBAC)</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink font-sans">
                Roles & Permissions Matrix
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
                Multi-tier privilege enforcement for departmental administrators, coordinators, and review officers
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadRoles(true)}
                disabled={refreshing}
                className="btn btn-secondary min-h-[40px] px-3.5 inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary min-h-[40px] px-4 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Role</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Defined Roles</span>
              <span className="text-2xl font-bold text-ink font-mono">{roles.length}</span>
            </div>
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Admin Accounts</span>
              <span className="text-2xl font-bold text-brand font-mono">{admins.length}</span>
            </div>
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Security Tier</span>
              <span className="text-2xl font-bold text-status-approved font-mono">RBAC L3</span>
            </div>
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Token Guard</span>
              <span className="text-2xl font-bold text-ink font-mono">HttpOnly</span>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Lock size={13} />
                  RBAC Boundary
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  Enforced
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Strict Privilege Isolation</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Capabilities are verified on every protected API endpoint (SEC-1). UI elements dynamically adapt while backend middleware confirms exact role membership.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Primary Role</span>
                  <span className="font-bold text-ink text-sm">SUPER_ADMIN</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Session Vault</span>
                  <span className="font-bold text-status-approved text-sm">JWT Cookie</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <Key size={14} className="text-brand shrink-0" />
              <span>Immutable super-admin protection active</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {success && (
        <div className="p-4 rounded-xl bg-status-approved/10 border border-status-approved/20 flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-status-approved shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="font-bold underline text-status-approved cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-status-rejected/10 border border-status-rejected/20 flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-rejected shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline text-status-rejected cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. ROLES TIERS CARDS */}
      <RolesCardsGrid roles={roles} />

      {/* 3. PERMISSION CAPABILITY MATRIX TABLE */}
      <PermissionsMatrixTable />

      {/* 4. ADMINISTRATOR ACCOUNTS & ROLE ASSIGNMENT TABLE */}
      <AdminAccountsTable
        admins={admins}
        roles={roles}
        assigningAdminId={assigningAdminId}
        onAssign={handleAssign}
      />

      {/* 5. CREATE ROLE MODAL */}
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
