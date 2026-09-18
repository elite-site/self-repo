import React, { useState, useRef } from 'react';
import { Video, Upload, X, AlertCircle, Check, Loader2, Film, UserRound, Search } from 'lucide-react';
import { SelfIntroductionSubmissionFormData, StudentInfo } from '../types';
import { api } from '../services/api';

interface SubmissionFormProps {
  onSubmit: (data: SelfIntroductionSubmissionFormData) => Promise<void>;
  isLoading: boolean;
}

const MAX_VIDEO_SIZE_MB = 25;
const VIDEO_EXTS = ['mp4', 'mov', 'webm'];

export const SubmissionForm: React.FC<SubmissionFormProps> = ({ onSubmit, isLoading }) => {
  const [rollNo, setRollNo] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [video, setVideo] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const findStudent = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = rollNo.trim().toUpperCase();
    if (!trimmed) {
      setLookupError('Please enter your roll number.');
      return;
    }

    setSearching(true);
    setLookupError(null);
    setStudent(null);
    setAlreadySubmitted(false);
    setVideo(null);
    try {
      const res = await api.lookupStudent(trimmed);
      setStudent(res.student);
      if (res.submission?.hasVideo) {
        setHasVideo(true);
        setAlreadySubmitted(true);
      } else {
        setHasVideo(false);
        setAlreadySubmitted(false);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setLookupError('No student found with this roll number. Please verify and try again.');
      } else {
        setLookupError('Could not verify your roll number. Please check the connection and try again.');
      }
    } finally {
      setSearching(false);
    }
  };

  const resetLookup = () => {
    setStudent(null);
    setHasVideo(false);
    setAlreadySubmitted(false);
    setVideo(null);
    setFieldErrors({});
    setRollNo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    if (!rollNo.trim()) errors.rollNo = 'Roll Number is required';
    if (!student) errors.rollNo = 'Please verify your roll number first';
    if (!video) errors.video = 'Please upload your introduction video';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      rollNo: rollNo.trim().toUpperCase(),
      video,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-left bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm">
      {/* SECTION 1: ROLL NUMBER & AUTO-FILLED STUDENT DETAILS */}
      <div className="space-y-5">
        <div className="border-b border-neutral-100 pb-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-elite-black font-display tracking-tight">
            1. Student Details
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Enter your roll number. Your name, branch, section, year and email are auto-filled from the student list.
          </p>
        </div>

        {/* ROLL NUMBER LOOKUP */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-elite-darkgray">
            Roll Number <span className="text-elite-red">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 25K61A1202"
              value={rollNo}
              disabled={Boolean(student) || alreadySubmitted}
              onChange={(e) => setRollNo(e.target.value.toUpperCase())}
              className={`w-full px-4 py-3 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                fieldErrors.rollNo ? 'border-red-500 bg-red-50/20' : 'border-neutral-200 focus:border-elite-red'
              } ${student || alreadySubmitted ? 'bg-neutral-100 opacity-70' : ''}`}
            />
            {!student && !alreadySubmitted && (
              <button
                type="button"
                onClick={() => findStudent()}
                disabled={searching}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-elite-red hover:bg-elite-darkred text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-60 shadow-md shadow-red-600/20"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="hidden sm:inline">{searching ? 'Checking...' : 'Fetch Details'}</span>
              </button>
            )}
          </div>
          {lookupError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium pt-1">
              <AlertCircle className="w-4 h-4" />
              {lookupError}
            </p>
          )}
          {fieldErrors.rollNo && !student && (
            <p className="text-[11px] text-elite-red font-medium">{fieldErrors.rollNo}</p>
          )}
        </div>

        {/* AUTO-FILLED STUDENT DETAILS CARD */}
        {student && (
          <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" />
                Details verified from student list
              </div>
              <button
                type="button"
                onClick={resetLookup}
                className="text-xs text-neutral-500 hover:text-elite-red font-semibold cursor-pointer"
              >
                Use different roll number
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white border border-neutral-200 rounded-xl p-3 col-span-2 sm:col-span-3">
                <div className="text-neutral-400 uppercase text-[10px] font-semibold">Full Name</div>
                <div className="text-neutral-900 font-bold mt-0.5 flex items-center gap-1.5">
                  <UserRound className="w-4 h-4 text-elite-red" />
                  {student.name}
                </div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-3">
                <div className="text-neutral-400 uppercase text-[10px] font-semibold">Branch</div>
                <div className="text-neutral-900 font-semibold mt-0.5">{student.branch}</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-3">
                <div className="text-neutral-400 uppercase text-[10px] font-semibold">Section</div>
                <div className="text-neutral-900 font-semibold mt-0.5">{student.section}</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-3">
                <div className="text-neutral-400 uppercase text-[10px] font-semibold">Year</div>
                <div className="text-neutral-900 font-semibold mt-0.5">{student.year}</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-3 col-span-2 sm:col-span-3">
                <div className="text-neutral-400 uppercase text-[10px] font-semibold">Email</div>
                <div className="text-neutral-900 font-semibold mt-0.5 break-all">{student.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* ALREADY SUBMITTED BLOCK */}
        {alreadySubmitted && (
          <div className="bg-neutral-100 border border-neutral-200 rounded-2xl p-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-elite-black">
              Your introduction video has already been submitted.
            </p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              If you need to upload a new video, please contact the coordinators to remove the current one.
            </p>
            <button
              type="button"
              onClick={resetLookup}
              className="mt-3 inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold hover:border-neutral-300 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Check another roll number
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: INTRODUCTION VIDEO SUBMISSION */}
      {student && !alreadySubmitted && (
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
      )}

      {/* SUBMIT BUTTON */}
      {student && !alreadySubmitted && (
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
      )}
    </form>
  );
};