import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

export async function listProjects(studentId: string) {
  try {
    const projects = await prisma.project.findMany({
      where: { studentId },
      orderBy: { displayOrder: 'asc' },
      take: 100,
    });
    return projects.map((p) => ({
      ...p,
      techStack: p.technologies,
      videoUrl: p.driveVideoUrl,
    }));
  } catch (err: any) {
    console.error(`[project.service:listProjects] Failed to list projects for studentId=${studentId}:`, err);
    throw err;
  }
}

export async function createProject(
  studentId: string,
  data: {
    title: any;
    description: any;
    technologies: any[];
    githubUrl: string | null;
    driveVideoUrl: string | null;
  }
) {
  try {
    const [count, maxOrderProj] = await Promise.all([
      prisma.project.count({ where: { studentId } }),
      prisma.project.findFirst({
        where: { studentId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      }),
    ]);

    if (count >= 5) {
      throw new AppError('LIMIT_EXCEEDED', 'Max 5 projects allowed.', 400, 'project.service:createProject');
    }

    const displayOrder = maxOrderProj ? maxOrderProj.displayOrder + 1 : 0;

    const project = await prisma.project.create({
      data: {
        studentId,
        title: data.title,
        description: data.description,
        technologies: data.technologies,
        githubUrl: data.githubUrl,
        driveVideoUrl: data.driveVideoUrl,
        displayOrder,
        status: 'PENDING',
        isPublic: false,
      },
    });

    return {
      ...project,
      techStack: project.technologies,
      videoUrl: project.driveVideoUrl,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[project.service:createProject] Failed to create project for studentId=${studentId}:`, err);
    throw err;
  }
}

export async function reorderProjects(studentId: string, ids: string[]) {
  try {
    await prisma.$transaction(
      ids.map((id: string, index: number) =>
        prisma.project.updateMany({
          where: { id, studentId },
          data: { displayOrder: index },
        })
      )
    );
    return { message: 'Reordered successfully' };
  } catch (err: any) {
    console.error(`[project.service:reorderProjects] Failed to reorder projects for studentId=${studentId}:`, err);
    throw err;
  }
}

export async function updateProject(studentId: string, id: string, updateData: any) {
  try {
    const proj = await prisma.project.updateMany({
      where: { id, studentId },
      data: updateData,
    });
    if (proj.count === 0) {
      throw new AppError('NOT_FOUND', 'Project not found', 404, 'project.service:updateProject');
    }
    return { message: 'Updated successfully' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[project.service:updateProject] Failed to update project id=${id} for studentId=${studentId}:`, err);
    throw err;
  }
}

export async function deleteProject(studentId: string, id: string) {
  try {
    const proj = await prisma.project.deleteMany({
      where: { id, studentId },
    });
    if (proj.count === 0) {
      throw new AppError('NOT_FOUND', 'Project not found', 404, 'project.service:deleteProject');
    }
    return { message: 'Deleted successfully' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[project.service:deleteProject] Failed to delete project id=${id} for studentId=${studentId}:`, err);
    throw err;
  }
}
