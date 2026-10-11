import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudentsTable } from '../components/StudentsTable';
import { StudentDetailPage } from './StudentDetailPage';
import { ACTIVE_EVENT_ID } from '@/shared/layout/Sidebar';

export const StudentsPage: React.FC = () => {
  const { studentId: paramStudentId } = useParams<{ studentId?: string }>();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const navigate = useNavigate();

  const currentId = paramStudentId || selectedStudentId;

  if (currentId) {
    return (
      <StudentDetailPage
        studentId={currentId}
        onBack={() => {
          setSelectedStudentId(null);
          navigate('/admin/students');
        }}
      />
    );
  }

  return (
    <StudentsTable
      activeEventId={ACTIVE_EVENT_ID}
      onSelectStudent={(id) => {
        setSelectedStudentId(id);
        navigate(`/admin/students/${id}`);
      }}
    />
  );
};

export default StudentsPage;
