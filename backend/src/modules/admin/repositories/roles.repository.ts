import { prisma } from '../../../infrastructure/prisma';

export async function findAllRoles() {
  return prisma.role.findMany({
    include: {
      permissions: true,
      assignments: { include: { admin: { select: { id: true, username: true, email: true, role: true } } } },
    },
  });
}

export async function findRoleById(id: string) {
  return prisma.role.findUnique({
    where: { id },
    include: {
      permissions: true,
    },
  });
}

export async function findAdminUserById(id: string) {
  return prisma.adminUser.findUnique({
    where: { id },
    select: { id: true },
  });
}

export async function createRoleAssignment(adminId: string, roleId: string) {
  return prisma.roleAssignment.create({
    data: { adminId, roleId },
    select: {
      adminId: true,
      roleId: true,
      assignedAt: true,
      admin: { select: { id: true, username: true, email: true } },
      role: { select: { id: true, name: true } },
    },
  });
}

export async function createRole(name: string, description?: string) {
  return prisma.role.create({
    data: {
      name,
      description,
      isSystem: false,
    },
  });
}

export async function updateRole(id: string, description?: string) {
  return prisma.role.update({
    where: { id },
    data: { description },
  });
}

export async function deleteRole(id: string) {
  return prisma.role.delete({ where: { id } });
}

export async function findRolePermissions(roleId: string) {
  return prisma.rolePermission.findMany({
    where: { roleId },
  });
}

export async function findAllAdminUsers() {
  return prisma.adminUser.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function createAdminUser(data: any) {
  return prisma.adminUser.create({ data });
}

export async function updateAdminUser(id: string, data: any) {
  return prisma.adminUser.update({ where: { id }, data });
}

export async function deleteAdminUser(id: string) {
  return prisma.adminUser.delete({ where: { id } });
}
