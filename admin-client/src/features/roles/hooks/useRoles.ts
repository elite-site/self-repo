import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rolesApi } from '../api/index';
import { RolesResponse } from '../types';

export const ADMIN_ROLES_QUERY_KEY = ['admin', 'roles'] as const;

export const useRoles = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assigningAdminId, setAssigningAdminId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const query = useQuery<RolesResponse>({
    queryKey: ADMIN_ROLES_QUERY_KEY,
    queryFn: () => rolesApi.getRoles(),
  });

  useEffect(() => {
    if (query.isError) {
      setError((query.error as any)?.response?.data?.message || 'Failed to load security roles');
    } else if (query.isSuccess) {
      setError(null);
    }
  }, [query.isError, query.isSuccess, query.error]);

  const loadRoles = useCallback(
    async (_isManual = false) => {
      setError(null);
      await query.refetch();
    },
    [query],
  );

  const handleAssign = async (adminId: string, roleId: string) => {
    setAssigningAdminId(adminId);
    setSuccess(null);
    try {
      await rolesApi.assignRole(adminId, roleId);
      setSuccess('Security role assigned.');
      await query.refetch();
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
      await query.refetch();
    } catch (err: any) {
      console.error('Failed to create role:', err);
      setError(err?.response?.data?.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  return {
    data: query.data ?? null,
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
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
