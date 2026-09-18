import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  RotateCw,
} from 'lucide-react';
import { EmailLogEntry, EmailPreviewData, Submission } from '../types';
import { adminApi } from '../services/api';

interface EmailCenterProps {
  activeEventId: string;
}

export const EmailCenter: React.FC<EmailCenterProps> = ({ activeEventId }) => {
  const [templateType, setTemplateType] = useState<'WINNER' | 'PARTICIPANT_THANKYOU'>('WINNER');
  const [selectedSubmissions, setSelectedSubmissions] = useState<Submission[]>([]);
  const [nonSelectedSubmissions, setNonSelectedSubmissions] = useState<Submission[]>([]);
  const [previewData, setPreviewData] = useState<EmailPreviewData | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  // Duplicate Warning Modal
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);
  const [sendResult, setSendResult] = useState<any | null>(null);

  // Logs
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);

  // Fetch recipients
  const loadRecipients = async () => {
    try {
      const [resWinners, resNonWinners] = await Promise.all([
        adminApi.getSubmissions({ eventId: activeEventId, isWinner: true, limit: 200 }),
        adminApi.getSubmissions({ eventId: activeEventId, isWinner: false, limit: 500 }),
      ]);
      setSelectedSubmissions(resWinners.data);
      setNonSelectedSubmissions(resNonWinners.data);
    } catch (err) {
      console.error('Failed to load recipients', err);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await adminApi.getEmailLogs(activeEventId);
      setLogs(res.logs);
    } catch (err) {
      console.error('Failed to load logs', err);
    }
  };

  useEffect(() => {
    loadRecipients();
    loadLogs();
  }, [activeEventId]);

  // Open Preview Modal
  const handleOpenPreview = async (type: 'WINNER' | 'PARTICIPANT_THANKYOU') => {
    setTemplateType(type);
    setPreviewLoading(true);
    setPreviewModalOpen(true);
    try {
      const list = type === 'WINNER' ? selectedSubmissions : nonSelectedSubmissions;
      const sampleId = list[0]?.id || undefined;
      const res = await adminApi.previewEmail(type, sampleId);
      setPreviewData(res);
    } catch (err) {
      alert('Failed to generate template preview.');
      setPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Dispatch Email
  const handleSendEmails = async (type: 'WINNER' | 'PARTICIPANT_THANKYOU', force = false) => {
    const list = type === 'WINNER' ? selectedSubmissions : nonSelectedSubmissions;
    if (list.length === 0) {
      alert(`No recipients found for this email category.`);
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to send ${type === 'WINNER' ? 'Selection' : 'Thank-You'} emails to ${list.length} applicants?`
    );
    if (!confirmed) return;

    setSendLoading(true);
    setDuplicateWarning(null);
    setSendResult(null);

    try {
      const ids = list.map((s) => s.id);
      const res = await adminApi.sendEmails(type, ids, force);

      if (res.warning) {
        setDuplicateWarning(res);
      } else {
        setSendResult(res);
        setPreviewModalOpen(false);
        loadLogs();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error occurred while sending emails.');
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="space-y-10 text-left">
      {/* 1. HEADER */}
      <div className="border-b border-neutral-200 pb-5">
        <div className="text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
          Applicant Communications
        </div>
        <h1 className="text-3xl font-extrabold text-elite-black font-display tracking-tight mt-1">
          EMAIL NOTIFICATIONS
        </h1>
        <p className="text-xs text-neutral-500 mt-1 font-normal">
          Review template previews, confirm recipient lists, and dispatch official communications.
        </p>
      </div>

      {/* Result / Confirmation Banner */}
      {sendResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Emails Dispatched: </span>
              <span>Successfully sent {sendResult.sent} emails.</span>
            </div>
          </div>
          <button
            onClick={() => setSendResult(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. TWO MAIN EMAIL WORKFLOW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: SELECTION EMAIL */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-red-50 text-elite-red border border-red-200">
                Official Invitation
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                {selectedSubmissions.length} Selected Applicants
              </span>
            </div>

            <h3 className="text-lg font-bold text-elite-black font-display">
              Selection Congratulatory Email
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed font-normal">
              Notifies chosen candidates of their acceptance into ELITE Self Introduction with details about orientation and onboarding.
            </p>

            <div className="text-xs text-neutral-500 font-mono bg-[#fafafa] p-2.5 rounded border border-neutral-200">
              Subject: 🏆 Congratulations! You have been selected for ELITE Self Introduction
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => handleOpenPreview('WINNER')}
              className="flex-1 py-2.5 px-4 bg-[#fafafa] hover:bg-neutral-100 border border-neutral-200 rounded-lg text-xs font-bold text-neutral-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-elite-red" />
              <span>Preview Email</span>
            </button>

            <button
              onClick={() => handleSendEmails('WINNER')}
              disabled={sendLoading || selectedSubmissions.length === 0}
              className="flex-1 py-2.5 px-4 bg-elite-red hover:bg-elite-darkred text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Selection Emails</span>
            </button>
          </div>
        </div>

        {/* CARD 2: PARTICIPANT THANK-YOU EMAIL */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                Participation Notice
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                {nonSelectedSubmissions.length} Non-Selected Applicants
              </span>
            </div>

            <h3 className="text-lg font-bold text-elite-black font-display">
              Participant Thank-You Email
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed font-normal">
              Sends an appreciation message to all participants thanking them for sharing their work and encouraging future engagement in club workshops.
            </p>

            <div className="text-xs text-neutral-500 font-mono bg-[#fafafa] p-2.5 rounded border border-neutral-200">
              Subject: Thank You for Applying to ELITE Self Introduction
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => handleOpenPreview('PARTICIPANT_THANKYOU')}
              className="flex-1 py-2.5 px-4 bg-[#fafafa] hover:bg-neutral-100 border border-neutral-200 rounded-lg text-xs font-bold text-neutral-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-elite-red" />
              <span>Preview Email</span>
            </button>

            <button
              onClick={() => handleSendEmails('PARTICIPANT_THANKYOU')}
              disabled={sendLoading || nonSelectedSubmissions.length === 0}
              className="flex-1 py-2.5 px-4 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Thank-You Emails</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. EMAIL DELIVERY LOGS & STATUS */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm space-y-0">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-[#fafafa]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-elite-red" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
              Delivery Logs & History
            </h2>
          </div>

          <button
            onClick={loadLogs}
            className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
            title="Refresh Logs"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            No email notifications have been dispatched yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fafafa] border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Recipient</th>
                  <th className="py-3 px-4">Template Type</th>
                  <th className="py-3 px-4">Dispatched At</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="py-3 px-5">
                      <div className="font-mono text-neutral-800 text-[11px]">
                        Ref: {log.submissionId.substring(0, 16)}...
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {log.templateType === 'WINNER' ? (
                        <span className="text-elite-red font-bold">Selection Email</span>
                      ) : (
                        <span className="text-neutral-600">Participant Thank-You</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {log.status === 'SENT' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                          ✓ Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[11px]">
                          ⚠ Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. PREVIEW MODAL */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in duration-150">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2 text-xs font-bold text-elite-black font-display uppercase tracking-wide">
                <Mail className="w-4 h-4 text-elite-red" />
                <span>Email Template Preview</span>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {previewLoading ? (
                <div className="p-16 text-center text-xs text-neutral-500">
                  Generating rendered preview...
                </div>
              ) : previewData ? (
                <>
                  <div className="bg-[#fafafa] border border-neutral-200 rounded-lg p-3 space-y-1 text-xs text-neutral-700">
                    <div>
                      <span className="font-semibold text-neutral-500">Subject: </span>
                      <span className="font-bold text-elite-black">{previewData.subject}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-500">Sample Recipient: </span>
                      <span className="font-mono text-neutral-800">{previewData.recipientName} ({previewData.recipientEmail})</span>
                    </div>
                  </div>

                  <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
                    <iframe
                      srcDoc={previewData.html}
                      title="Rendered Email Preview"
                      className="w-full h-96 border-none"
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="p-4 border-t border-neutral-200 bg-[#fafafa] flex items-center justify-end gap-3">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-lg text-xs font-bold text-neutral-800 transition-colors cursor-pointer"
              >
                Close Preview
              </button>

              <button
                onClick={() => handleSendEmails(templateType)}
                disabled={sendLoading}
                className="px-6 py-2 bg-elite-red hover:bg-elite-darkred rounded-lg text-xs font-bold uppercase tracking-wider text-white transition-colors shadow-sm cursor-pointer"
              >
                {sendLoading ? 'Sending...' : 'Confirm & Dispatch Emails'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DUPLICATE SEND WARNING MODAL */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-red-300 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-elite-red flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-elite-black font-display">
                  Duplicate Email Notification
                </h3>
                <p className="text-xs text-neutral-500">
                  Some recipients have already received an email.
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              {duplicateWarning.alreadySentCount} of {duplicateWarning.total} applicants were already emailed. Would you like to proceed and resend?
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setDuplicateWarning(null)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendEmails(templateType, true)}
                className="px-4 py-2 bg-elite-red hover:bg-elite-darkred text-white rounded-lg text-xs font-bold uppercase cursor-pointer"
              >
                Yes, Resend Emails
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
