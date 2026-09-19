import React, { useState, useRef } from 'react';
import { Video, Upload, X, AlertCircle, Check, Loader2, Film, UserRound, Mail, Phone, Hash, CalendarDays } from 'lucide-react';
import { SelfIntroductionSubmissionFormData } from '../types';

interface SubmissionFormProps {
  onSubmit: (data: SelfIntroductionSubmissionFormData) => Promise<void>;
  isLoading: boolean;
}

const MAX_VIDEO_SIZE_MB = 25;
const VIDEO_EXTS = ['mp4', 'mov', 'webm'];
const YEARS = [2, 3, 4];
const SECTIONS = ['A', 'B'];

interface FormState {
  name: string;
  rollNo: string;
  year: string;
  section: string;
  email: string;
  phoneNo: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  rollNo: '',
  year: '',
  section: '',
  email: '',
  phoneNo: '',
};

export const SubmissionForm: React.FC<SubmissionFormProps> = ({ onSubmit, isLoading }) => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [video, setVideo] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!VIDEO_EXTS.includes(ext)) {
        setFieldErrors((prev) => ({
          ...prev,
          video: 'Unsupported file format. Please upload MP4, MOV, or WebM video up to 25 MB.',
        }));
        setVideo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const maxSizeBytes = MAX_VIDEO_SIZE_MB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setFieldErrors((prev) => ({
          ...prev,
          video: `Video file is too large. Maximum size is ${MAX_VIDEO_SIZE_MB} MB.`,
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
    if (!form.name.trim() || form.name.trim().length < 2) errors.name = 'Please enter your full name';
    if (!form.rollNo.trim()) errors.rollNo = 'Roll Number is required';
    else if (!/^[A-Za-z0-9]+$/.test(form.rollNo.trim())) errors.rollNo = 'Roll number should contain only letters and numbers';
    if (!form.year) errors.year = 'Please select your year';
    if (!form.section) errors.section = 'Please select your section';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Please enter a valid email address';
    if (!form.phoneNo.trim()) errors.phoneNo = 'Phone number is required';
    else if (!/^\+?\d{10,15}$/.test(form.phoneNo.trim())) errors.phoneNo = 'Please enter a valid phone number (10-15 digits)';
    if (!video) errors.video = 'Please upload your introduction video';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      name: form.name.trim(),
      rollNo: form.rollNo.trim().toUpperCase(),
      year: parseInt(form.year, 10),
      section: form.section.toUpperCase(),
      email: form.email.trim().toLowerCase(),
      phoneNo: form.phoneNo.trim(),
      video,
    });
  };

  const inputClass = (key: string) =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-all ${
      fieldErrors[key] ? 'border-red-500 bg-red-50/20' : 'border-neutral-200 focus:border-elite-red'
    }`;

  const selectClass = (key: string) =>
    `w-full px-4 py-3 rounded-xl border text-sm bg-white focus:outline-none transition-all cursor-pointer ${
      fieldErrors[key] ? 'border-red-500 bg-red-50/20' : 'border-neutral-200 focus:border-elite-red'
    }`;

  const fieldError = (key: string) =>
    fieldErrors[key] ? <p className="text-[11px] text-elite-red font-medium">{fieldErrors[key]}</p> : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-left bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm">
      {/* SECTION 1: STUDENT DETAILS */}
      <div className="space-y-5">
        <div className="border-b border-neutral-100 pb-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-elite-black font-display tracking-tight">
            1. Your Details
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Enter your personal details below. All fields are required.
          </p>
        </div>

        {/* FULL NAME */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
            Full Name <span className="text-elite-red">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <UserRound className="w-4 h-4 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="e.g. A. Nandini"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className={`${inputClass('name')} pl-10`}
            />
          </div>
          {fieldError('name')}
        </div>

        {/* ROLL NUMBER */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
            Roll Number <span className="text-elite-red">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Hash className="w-4 h-4 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="e.g. 25K61A1202"
              value={form.rollNo}
              onChange={(e) => setField('rollNo', e.target.value.toUpperCase())}
              className={`${inputClass('rollNo')} pl-10 font-mono`}
            />
          </div>
          {fieldError('rollNo')}
        </div>

        {/* YEAR & SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
              Year <span className="text-elite-red">*</span>
            </label>
            <select
              value={form.year}
              onChange={(e) => setField('year', e.target.value)}
              className={selectClass('year')}
            >
              <option value="">Select Year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y === 2 ? '2nd Year' : y === 3 ? '3rd Year' : '4th Year'}
                </option>
              ))}
            </select>
            {fieldError('year')}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
              Section <span className="text-elite-red">*</span>
            </label>
            <select
              value={form.section}
              onChange={(e) => setField('section', e.target.value)}
              className={selectClass('section')}
            >
              <option value="">Select Section</option>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </select>
            {fieldError('section')}
          </div>
        </div>

        {/* EMAIL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
            Email Address <span className="text-elite-red">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="w-4 h-4 text-neutral-400" />
            </div>
            <input
              type="email"
              placeholder="e.g. nandini@sasi.ac.in"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              className={`${inputClass('email')} pl-10`}
            />
          </div>
          {fieldError('email')}
        </div>

        {/* PHONE NO */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
            Phone Number <span className="text-elite-red">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone className="w-4 h-4 text-neutral-400" />
            </div>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={form.phoneNo}
              onChange={(e) => setField('phoneNo', e.target.value)}
              className={`${inputClass('phoneNo')} pl-10 font-mono`}
            />
          </div>
          {fieldError('phoneNo')}
        </div>
      </div>

      {/* SECTION 2: INTRODUCTION VIDEO SUBMISSION */}
      <div className="space-y-5 pt-4">
        <div className="border-b border-neutral-100 pb-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-elite-black font-display tracking-tight flex items-center gap-2">
            <Film className="w-6 h-6 text-elite-red" />
            <span>2. Introduction Video</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Submit a single <strong>Video</strong> introduction. Maximum 1 file (up to {MAX_VIDEO_SIZE_MB}MB).
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
                Supported: MP4, MOV, WEBM (Max {MAX_VIDEO_SIZE_MB}MB)
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
              <span>SUBMITTING VIDEO...</span>
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