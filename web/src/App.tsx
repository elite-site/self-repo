import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SubmissionForm } from './components/SubmissionForm';
import { ClubSidebar } from './components/ClubSidebar';
import { GuidelinesSection } from './components/GuidelinesSection';
import { UploadProgressBar } from './components/UploadProgressBar';
import { ConfirmationState } from './components/ConfirmationState';
import { AlertBanner } from './components/AlertBanner';
import { Footer } from './components/Footer';
import { SelfIntroductionSubmissionFormData } from './types';
import { api } from './services/api';
import axios from 'axios';

export const App: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadFiles, setUploadFiles] = useState<{ label: string; size: number }[]>([]);
  const [totalSizeText, setTotalSizeText] = useState('');
  const [confirmedStudentName, setConfirmedStudentName] = useState('');
  const [confirmedSubmissionId, setConfirmedSubmissionId] = useState('');
  const [errorMessage, setErrorMessage] = useState<{ title?: string; message: string } | null>(null);

  const handleFormSubmit = async (data: SelfIntroductionSubmissionFormData) => {
    setErrorMessage(null);
    setStatus('uploading');
    setUploadProgress(0);

    const filesList: { label: string; size: number }[] = [];
    if (data.video) {
      filesList.push({ label: 'Video Introduction Reel', size: data.video.size });
    }
    setUploadFiles(filesList);

    const totalPayloadBytes = data.video?.size || 0;
    setTotalBytes(totalPayloadBytes);
    setLoadedBytes(0);

    const formattedTotal = totalPayloadBytes > 1024 * 1024
      ? `${(totalPayloadBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(totalPayloadBytes / 1024).toFixed(0)} KB`;
    setTotalSizeText(formattedTotal);

    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('rollNo', data.rollNo);
    formData.append('year', String(data.year));
    formData.append('section', data.section);
    formData.append('email', data.email);
    formData.append('phoneNo', data.phoneNo);
    formData.append('category', 'SELF_INTRO');

    if (data.video) formData.append('video', data.video);

    try {
      const response = await api.submitEntry(formData, (progressEvent) => {
        setLoadedBytes(progressEvent.loaded);
        if (progressEvent.total) {
          setTotalBytes(progressEvent.total);
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      setConfirmedStudentName(response.name);
      setConfirmedSubmissionId(response.id);
      setStatus('success');
      const el = document.getElementById('main-content');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } catch (err: any) {
      setStatus('idle');
      setUploadProgress(0);

      if (axios.isAxiosError(err) && err.response) {
        const errorData = err.response.data;

        if (err.response.status === 409) {
          setErrorMessage({
            title: 'Video Already Submitted',
            message: errorData.message || "An introduction video has already been submitted for this roll number.",
          });
        } else if (err.response.status === 400) {
          setErrorMessage({
            title: 'Validation Error',
            message: errorData.message || 'Please check that your video is properly formatted (MP4, MOV, or WebM up to 25 MB).',
          });
        } else {
          setErrorMessage({
            title: 'Submission Error',
            message: errorData.message || 'Could not upload your introduction. Please check your internet connection and try again.',
          });
        }
      } else {
        setErrorMessage({
          title: 'Connection Error',
          message: 'Could not reach the server. Please verify your connection and try again.',
        });
      }

      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setUploadProgress(0);
    setConfirmedStudentName('');
    setConfirmedSubmissionId('');
    setErrorMessage(null);
  };

  const handleNavigate = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between">
      <div>
        <Navbar onNavigate={handleNavigate} />
        <HeroSection />

        <main id="main-content" className="max-w-7xl mx-auto px-6 sm:px-10 py-6 sm:py-10">
          {errorMessage && (
            <div className="mb-6">
              <AlertBanner
                type="error"
                title={errorMessage.title}
                message={errorMessage.message}
                onClose={() => setErrorMessage(null)}
              />
            </div>
          )}

          {status === 'success' ? (
            <ConfirmationState
              studentName={confirmedStudentName}
              submissionId={confirmedSubmissionId}
              onReset={handleReset}
            />
          ) : status === 'uploading' ? (
            <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in duration-200">
              <UploadProgressBar
                progress={uploadProgress}
                totalSizeText={totalSizeText}
                files={uploadFiles}
                loadedBytes={loadedBytes}
                totalBytes={totalBytes}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8">
                <SubmissionForm onSubmit={handleFormSubmit} isLoading={false} />
              </div>
              <div className="lg:col-span-4">
                <ClubSidebar />
              </div>
            </div>
          )}
        </main>

        <GuidelinesSection />
      </div>

      <Footer />
    </div>
  );
};
