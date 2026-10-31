import * as adminRepo from '../admin.repository';
import { NotFoundError } from '../../../utils/appError';

export async function listRoles() {
  return adminRepo.findAllRoles();
}

export async function createRole(name: string, description?: string) {
  return adminRepo.createRole(name, description);
}

export async function updateRole(id: string, description?: string) {
  return adminRepo.updateRole(id, description);
}

export async function deleteRole(id: string) {
  return adminRepo.deleteRole(id);
}

export async function assignRole(adminId: string, roleId: string) {
  const [admin, role] = await Promise.all([
    adminRepo.findAdminUserById(adminId),
    adminRepo.findRoleById(roleId),
  ]);
  if (!admin) {
    throw new NotFoundError('Admin user not found');
  }
  if (!role) {
    throw new NotFoundError('Role not found');
  }
  return adminRepo.createRoleAssignment(adminId, roleId);
}

export async function listPermissions(roleId?: string) {
  if (roleId) return adminRepo.findRolePermissions(roleId);
  return [];
}

export async function listAdmins() {
  return adminRepo.findAllAdminUsers();
}

export async function createAdmin(data: any) {
  return adminRepo.createAdminUser(data);
}

export async function updateAdmin(id: string, data: any) {
  return adminRepo.updateAdminUser(id, data);
}

export async function deleteAdmin(id: string) {
  return adminRepo.deleteAdminUser(id);
}
