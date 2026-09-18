import React, { useState, useEffect, useRef } from 'react';
import { Video, Upload, X, AlertCircle, Check, Loader2, Film } from 'lucide-react';
import { SelfIntroductionSubmissionFormData } from '../types';
import { api } from '../services/api';

interface SubmissionFormProps {
  onSubmit: (data: SelfIntroductionSubmissionFormData) => Promise<void>;
  isLoading: boolean;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({ onSubmit, isLoading }) => {
  const [branches, setBranches] = useState<string[]>(['IT']);
  const [sections, setSections] = useState<string[]>(['A', 'B']);
  const [years, setYears] = useState<number[]>([2, 3, 4]);

  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [branch, setBranch] = useState('IT');
  const [section, setSection] = useState('A');
  const [year, setYear] = useState<number>(2);

  const [video, setVideo] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadOptions() {
      const [bList, sList, yList] = await Promise.all([
        api.getBranches(),
        api.getSections(),
        api.getYears(),
      ]);
      if (bList.length) setBranches(bList);
      if (sList.length) setSections(sList);
      if (yList.length) setYears(yList);
    }
    loadOptions();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      const videoExts = ['mp4', 'mov', 'webm'];

      if (!videoExts.includes(ext)) {
        setFieldErrors((prev) => ({
          ...prev,
          video: 'Unsupported file format. Please upload MP4, MOV, or WebM video up to 80 MB.',
        }));
        setVideo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const maxSizeBytes = 80 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setFieldErrors((prev) => ({
          ...prev,
          video: 'Video file is too large. Maximum size is 80 MB.',
        }));
        setVideo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setVideo(file);
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy.video;
        return copy;
      });
    }
  };

  const removeVideo = () => {
    setVideo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!name.trim()) errors.name = 'Full Name is required';
    if (!rollNo.trim()) errors.rollNo = 'Roll Number is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) errors.email = 'A valid email address is required';
    if (!video) {
      errors.video = 'Please upload 1 Video introduction reel';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      name: name.trim(),
      rollNo: rollNo.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      branch,
      section,
      year,
      video,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-left bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm">
      {/* SECTION 1: APPLICANT DETAILS */}
      <div className="space-y-5">
        <div className="border-b border-neutral-100 pb-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-elite-black font-display tracking-tight">
            1. Student Information
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Enter your official college details. Please verify your email address.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
              Full Name <span className="text-elite-red">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-all ${
                fieldErrors.name ? 'border-red-500 bg-red-50/20' : 'border-neutral-200 focus:border-elite-red'
              }`}
            />
            {fieldErrors.name && <p className="text-[11px] text-elite-red font-medium">{fieldErrors.name}</p>}
          </div>

          {/* Roll Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
              Roll Number <span className="text-elite-red">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 25K61A1202"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value.toUpperCase())}
              className={`w-full px-4 py-3 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                fieldErrors.rollNo ? 'border-red-500 bg-red-50/20' : 'border-neutral-200 focus:border-elite-red'
              }`}
            />
            {fieldErrors.rollNo && <p className="text-[11px] text-elite-red font-medium">{fieldErrors.rollNo}</p>}
          </div>

          {/* Email Address */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
              Email Address <span className="text-elite-red">*</span>
            </label>
            <input
              type="email"
              placeholder="e.g. janesmith@sasi.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-all ${
                fieldErrors.email ? 'border-red-500 bg-red-50/20' : 'border-neutral-200 focus:border-elite-red'
              }`}
            />
            {fieldErrors.email && <p className="text-[11px] text-elite-red font-medium">{fieldErrors.email}</p>}
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
              Department / Branch
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-elite-red bg-white"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Year & Section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-elite-red bg-white"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-elite-red bg-white"
              >
                {sections.map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: INTRODUCTION VIDEO SUBMISSION */}
      <div className="space-y-5 pt-4">
        <div className="border-b border-neutral-100 pb-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-elite-black font-display tracking-tight flex items-center gap-2">
            <Film className="w-6 h-6 text-elite-red" />
            <span>2. Introduction Submission</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Submit a single <strong>Video</strong> introduction. Maximum 1 file (up to 80MB).
          </p>
        </div>

        {/* FILE DROPZONE */}
        <div className="space-y-2 pt-2">
          {!video ? (
            <label className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              fieldErrors.video ? 'border-red-400 bg-red-50/20' : 'border-neutral-300 hover:border-elite-red bg-neutral-50/50'
            }`}>
              <input
                type="file"
                ref={fileInputRef}
                accept=".mp4,.mov,.webm,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-red-50 text-elite-red flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-elite-black">
                Click or drag video introduction here
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Supported: MP4, MOV, WEBM (Max 80MB)
              </p>
            </label>
          ) : (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-elite-red flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-elite-black truncate">{video.name}</p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    {(video.size / (1024 * 1024)).toFixed(1)} MB • VIDEO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeVideo}
                className="p-2 rounded-lg bg-neutral-200 hover:bg-red-100 hover:text-elite-red text-neutral-600 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {fieldErrors.video && (
            <div className="flex items-center gap-1.5 text-xs text-elite-red font-medium pt-1">
              <AlertCircle className="w-4 h-4" />
              <span>{fieldErrors.video}</span>
            </div>
          )}
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-6 bg-elite-red hover:bg-elite-darkred text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>SUBMITTING APPLICATION...</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>SUBMIT SELF INTRODUCTION</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
