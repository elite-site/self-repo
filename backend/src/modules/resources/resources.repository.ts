import { prisma } from '../../infrastructure/prisma';
import type { ResourceType } from '@prisma/client';
import type { CreateResourcePayload, UpdateResourcePayload } from './resources.types';

export async function findStudentYearAndSemester(studentId: string): Promise<{
  id: string;
  year: number;
  semester: number | null;
  name: string;
  rollNo: string;
} | null> {
  return prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      year: true,
      semester: true,
      name: true,
      rollNo: true,
    },
  });
}

export async function findResourcesBySemesters(options: {
  semesters: number[];
  type?: ResourceType;
  search?: string;
}) {
  const where: any = {
    semester: { in: options.semesters },
  };

  if (options.type) {
    where.type = options.type;
  }

  if (options.search) {
    const term = options.search.trim();
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { subject: { contains: term, mode: 'insensitive' } },
    ];
  }

  return prisma.resource.findMany({
    where,
    orderBy: [
      { subject: 'asc' },
      { createdAt: 'desc' },
    ],
  });
}

export async function findAdminResources(options: {
  year?: number;
  semester?: number;
  subject?: string;
  type?: ResourceType;
  search?: string;
}) {
  const where: any = {};

  if (options.year) {
    where.year = options.year;
  }

  if (options.semester) {
    where.semester = options.semester;
  }

  if (options.subject) {
    where.subject = { contains: options.subject, mode: 'insensitive' };
  }

  if (options.type) {
    where.type = options.type;
  }

  if (options.search) {
    const term = options.search.trim();
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { subject: { contains: term, mode: 'insensitive' } },
    ];
  }

  return prisma.resource.findMany({
    where,
    orderBy: [
      { year: 'asc' },
      { semester: 'asc' },
      { subject: 'asc' },
      { createdAt: 'desc' },
    ],
  });
}

export async function findResourceById(id: string) {
  return prisma.resource.findUnique({
    where: { id },
  });
}

export async function createResource(
  data: CreateResourcePayload & { uploadedBy: string }
) {
  return prisma.resource.create({
    data: {
      title: data.title,
      year: data.year,
      semester: data.semester,
      subject: data.subject,
      type: data.type,
      driveLink: data.drive_link || data.driveLink || '',
      uploadedBy: data.uploadedBy,
    },
  });
}

export async function updateResource(id: string, data: UpdateResourcePayload) {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.year !== undefined) updateData.year = data.year;
  if (data.semester !== undefined) updateData.semester = data.semester;
  if (data.subject !== undefined) updateData.subject = data.subject;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.drive_link !== undefined || data.driveLink !== undefined) {
    updateData.driveLink = data.drive_link || data.driveLink;
  }

  return prisma.resource.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteResource(id: string) {
  return prisma.resource.delete({
    where: { id },
  });
}
