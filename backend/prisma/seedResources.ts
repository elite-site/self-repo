import { PrismaClient, ResourceType } from '@prisma/client';

export const SAMPLE_RESOURCES = [
  {
    title: 'Engineering Mathematics - I (Calculus & Linear Algebra Notes)',
    year: 1,
    semester: 1,
    subject: 'Mathematics - I',
    type: ResourceType.NOTES,
    driveLink: 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J_Sem1_MathNotes/view',
    uploadedBy: 'Coordinator (Dr. Rao)',
  },
  {
    title: 'Problem Solving & Programming in C Lab Manual',
    year: 1,
    semester: 1,
    subject: 'Programming in C',
    type: ResourceType.LAB_MANUAL,
    driveLink: 'https://drive.google.com/file/d/1B2C3D4E5F6G7H8I9J0K_Sem1_CLabManual/view',
    uploadedBy: 'Coordinator (Prof. Sharma)',
  },
  {
    title: 'Data Structures & Algorithms Course Syllabus 2026',
    year: 1,
    semester: 2,
    subject: 'Data Structures',
    type: ResourceType.SYLLABUS,
    driveLink: 'https://drive.google.com/file/d/1C2D3E4F5G6H7I8J9K0L_Sem2_DSSyllabus/view',
    uploadedBy: 'Admin',
  },
  {
    title: 'Data Structures Complete Lecture Slides (Trees & Graphs)',
    year: 1,
    semester: 2,
    subject: 'Data Structures',
    type: ResourceType.PPT,
    driveLink: 'https://drive.google.com/file/d/1D2E3F4G5H6I7J8K9L0M_Sem2_DSPPT/view',
    uploadedBy: 'Coordinator (Dr. Rao)',
  },
  {
    title: 'Digital Logic Design Previous Year Question Papers (2022-2025)',
    year: 2,
    semester: 3,
    subject: 'Digital Logic Design',
    type: ResourceType.QUESTION_PAPER,
    driveLink: 'https://drive.google.com/file/d/1E2F3G4H5I6J7K8L9M0N_Sem3_DLDQP/view',
    uploadedBy: 'Admin',
  },
  {
    title: 'Object Oriented Programming through Java Lecture Notes',
    year: 2,
    semester: 3,
    subject: 'Java Programming',
    type: ResourceType.NOTES,
    driveLink: 'https://drive.google.com/file/d/1F2G3H4I5J6K7L8M9N0O_Sem3_JavaNotes/view',
    uploadedBy: 'Coordinator (Prof. Sharma)',
  },
  {
    title: 'Database Management Systems SQL & Normalization Handouts',
    year: 2,
    semester: 4,
    subject: 'Database Management Systems',
    type: ResourceType.NOTES,
    driveLink: 'https://drive.google.com/file/d/1G2H3I4J5K6L7M8N9O0P_Sem4_DBMSNotes/view',
    uploadedBy: 'Coordinator (Dr. Rao)',
  },
  {
    title: 'Computer Networks Mid-Term & End-Sem Solved Question Papers',
    year: 3,
    semester: 5,
    subject: 'Computer Networks',
    type: ResourceType.QUESTION_PAPER,
    driveLink: 'https://drive.google.com/file/d/1H2I3J4K5L6M7N8O9P0Q_Sem5_CNQP/view',
    uploadedBy: 'Admin',
  },
  {
    title: 'Full Stack Web Technologies Lab Exercises & Code Solutions',
    year: 3,
    semester: 6,
    subject: 'Web Technologies',
    type: ResourceType.LAB_MANUAL,
    driveLink: 'https://drive.google.com/file/d/1I2J3K4L5M6N7O8P9Q0R_Sem6_WebTechLab/view',
    uploadedBy: 'Coordinator (Prof. Sharma)',
  },
  {
    title: 'Cloud Computing Architecture & AWS Services Presentation',
    year: 4,
    semester: 7,
    subject: 'Cloud Computing',
    type: ResourceType.PPT,
    driveLink: 'https://drive.google.com/file/d/1J2K3L4M5N6O7P8Q9R0S_Sem7_CloudPPT/view',
    uploadedBy: 'Admin',
  },
  {
    title: 'Deep Learning & Neural Networks Comprehensive Review Notes',
    year: 4,
    semester: 8,
    subject: 'Deep Learning',
    type: ResourceType.NOTES,
    driveLink: 'https://drive.google.com/file/d/1K2L3M4N5O6P7Q8R9S0T_Sem8_DeepLearning/view',
    uploadedBy: 'Coordinator (Dr. Rao)',
  },
];

export async function seedResources(prisma: PrismaClient) {
  console.log('📚 Seeding sample study resources across semesters 1 to 8...');
  let count = 0;
  for (const item of SAMPLE_RESOURCES) {
    const existing = await prisma.resource.findFirst({
      where: { title: item.title, semester: item.semester },
    });
    if (!existing) {
      await prisma.resource.create({
        data: item,
      });
      count++;
    }
  }
  console.log(`  ✓ ${count} new sample study resources seeded (${SAMPLE_RESOURCES.length} total)`);
}
