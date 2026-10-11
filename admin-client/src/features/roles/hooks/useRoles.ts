import { useState, useEffect, useCallback } from 'react';
import { rolesApi } from '../api';
import { RolesResponse } from '../types';

export const useRoles = () => {
  const [data, setData] = useState<RolesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assigningAdminId, setAssigningAdminId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadRoles = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await rolesApi.getRoles();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load roles & permissions:', err);
      setError(err?.response?.data?.message || 'Failed to load security roles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleAssign = async (adminId: string, roleId: string) => {
    setAssigningAdminId(adminId);
    setSuccess(null);
    try {
      await rolesApi.assignRole(adminId, roleId);
      setSuccess('Security role assigned.');
      await loadRoles(true);
    } catch (err: any) {
      console.error('Failed to assign role:', err);
      setError(err?.response?.data?.message || 'Failed to assign role');
    } finally {
      setAssigningAdminId(null);
    }
  };

  const handleCreateRole = async (name: string, description?: string) => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await rolesApi.createRole({
        name: name.trim().toUpperCase().replace(/\s+/g, '_'),
        description: description?.trim() || undefined,
      });
      setIsModalOpen(false);
      setSuccess('Custom security role created.');
      await loadRoles(true);
    } catch (err: any) {
      console.error('Failed to create role:', err);
      setError(err?.response?.data?.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  return {
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
  };
};
