import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import {
  attachVerificationDocument,
  requestVerificationUpload,
  submitVerificationPackage
} from '../../api/verificationApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

function computeProgress(verification) {
  if (!verification) return 0;
  if (!verification.documentsRequired) return 0;
  const ratio = (verification.documentsSubmitted ?? 0) / verification.documentsRequired;
  return Math.min(100, Math.round(ratio * 100));
}

function resolveStatusBadge(status) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'pending_review':
      return 'bg-sky-100 text-sky-700 border border-sky-200';
    case 'resubmission_required':
    case 'rejected':
      return 'bg-rose-100 text-rose-700 border border-rose-200';
    default:
      return 'bg-amber-100 text-amber-700 border border-amber-200';
  }
}

async function computeChecksum(file) {
  if (!('crypto' in window) || !window.crypto?.subtle) {
    throw new Error('Secure hashing is not available in this browser');
  }
  const buffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function formatDate(value) {
  if (!value) return 'Not yet reviewed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function VerificationStatusCard({ verification, onRefresh }) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [selectedType, setSelectedType] = useState(
    verification?.outstandingDocuments?.[0]?.type ?? verification?.requiredDocuments?.[0]?.type ?? null
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const progress = useMemo(() => computeProgress(verification), [verification]);
  const outstanding = useMemo(() => verification?.outstandingDocuments ?? [], [verification]);
  const documents = useMemo(() => verification?.documents ?? [], [verification]);
  const requiredDocuments = useMemo(() => verification?.requiredDocuments ?? [], [verification]);
  const canSubmit = useMemo(() => {
    if (!verification) return false;
    const readyStatuses = ['collecting', 'submitted', 'resubmission_required'];
    return (
      readyStatuses.includes(verification.status) &&
      (verification.documentsSubmitted ?? 0) >= (verification.documentsRequired ?? 0)
    );
  }, [verification]);

  const statusBadge = resolveStatusBadge(verification?.status ?? 'collecting');

  useEffect(() => {
    const availableTypes = outstanding.length ? outstanding : requiredDocuments;
    if (availableTypes.length === 0) {
      return;
    }
    if (!availableTypes.some((doc) => doc.type === selectedType)) {
      setSelectedType(availableTypes[0].type);
    }
  }, [outstanding, requiredDocuments, selectedType]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] ?? null);
    setSuccessMessage(null);
    setError(null);
  };

  const handleDocumentTypeChange = (event) => {
    setSelectedType(event.target.value);
    setSuccessMessage(null);
    setError(null);
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setUploading(false);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!token) {
      setError('You need to be signed in to upload verification documents.');
      return;
    }
    if (!selectedType) {
      setError('Select the document type you are uploading.');
      return;
    }
    if (!selectedFile) {
      setError('Choose a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const checksum = await computeChecksum(selectedFile);
      const uploadInstruction = await requestVerificationUpload({
        token,
        payload: {
          documentType: selectedType,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          sizeBytes: selectedFile.size
        }
      });

      await fetch(uploadInstruction.upload.url, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream'
        },
        body: selectedFile
      });

      await attachVerificationDocument({
        token,
        payload: {
          documentType: selectedType,
          storageBucket: uploadInstruction.upload.bucket,
          storageKey: uploadInstruction.upload.key,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          sizeBytes: selectedFile.size,
          checksumSha256: checksum
        }
      });

      setSuccessMessage('Document uploaded successfully.');
      resetUploadState();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (uploadError) {
      const message = uploadError?.message ?? 'Failed to upload verification document';
      setError(message);
      resetUploadState();
    }
  };

  const handleSubmitForReview = async () => {
    if (!token) {
      setError('You need to be signed in to submit verification.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await submitVerificationPackage({ token });
      setSuccessMessage('Verification submitted for review.');
      if (onRefresh) {
        await onRefresh();
      }
    } catch (submitError) {
      const message = submitError?.message ?? 'Unable to submit verification for review';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!verification) {
    return null;
  }

  return (
    <section className="dashboard-section" aria-live="polite">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="dashboard-kicker">Identity verification</p>
          <h2 className="text-xl font-semibold text-slate-900">Compliance readiness</h2>
          <p className="mt-2 text-sm text-slate-600">
            Provide government ID and liveness checks so payouts and classroom access remain uninterrupted. We&rsquo;ll email you as
            soon as compliance completes the review.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadge}`}>
          <span>{verification.status?.replace(/_/g, ' ') ?? 'collecting'}</span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              {verification.documentsSubmitted ?? 0} of {verification.documentsRequired ?? requiredDocuments.length} documents
              uploaded
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk score</dt>
            <dd className="mt-2 text-lg font-semibold text-slate-900">{Number(verification.riskScore ?? 0).toFixed(1)}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manual review</dt>
            <dd className="mt-2 text-sm text-slate-700">
              {verification.needsManualReview ? 'Queued for compliance specialist' : 'Automated checks clear'}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last submitted</dt>
            <dd className="mt-2 text-sm text-slate-700">{formatDate(verification.lastSubmittedAt)}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last reviewed</dt>
            <dd className="mt-2 text-sm text-slate-700">{formatDate(verification.lastReviewedAt)}</dd>
          </div>
        </dl>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Outstanding documents</h3>
            {outstanding.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-600">All required documents uploaded.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {outstanding.map((doc) => (
                  <li key={doc.type} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <span>
                      <strong className="text-slate-900">{doc.label}</strong>
                      <br />
                      <span className="text-xs text-slate-500">{doc.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={handleUpload}>
            <h3 className="text-sm font-semibold text-slate-900">Upload document</h3>
            <label htmlFor="verification-doc-type" className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Document type
            </label>
            <select
              id="verification-doc-type"
              value={selectedType ?? ''}
              onChange={handleDocumentTypeChange}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {requiredDocuments.map((doc) => (
                <option key={doc.type} value={doc.type}>
                  {doc.label}
                </option>
              ))}
              {requiredDocuments.length === 0 ? <option value="">No requirements available</option> : null}
            </select>

            <label
              htmlFor="verification-file"
              className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              File
            </label>
            <input
              id="verification-file"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
            />

            <button
              type="submit"
              disabled={uploading}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/40"
            >
              {uploading ? 'Uploading…' : 'Upload document'}
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              {documents.map((doc) => (
                <tr key={doc.id ?? doc.type}>
                  <td className="px-4 py-3 font-medium text-slate-900">{doc.fileName ?? doc.type}</td>
                  <td className="px-4 py-3 capitalize">{doc.status?.replace(/_/g, ' ') ?? 'pending'}</td>
                  <td className="px-4 py-3">{formatDate(doc.submittedAt)}</td>
                  <td className="px-4 py-3">{doc.reviewedAt ? formatDate(doc.reviewedAt) : 'Waiting review'}</td>
                </tr>
              ))}
              {documents.length === 0 ? (
                <tr>
                  <td className="px-4 py-3" colSpan="4">
                    <span className="text-sm text-slate-500">Upload your first document to start the review.</span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Compliance contact: <span className="font-semibold text-slate-700">compliance@edulure.com</span>
          </p>
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={!canSubmit || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
        </div>
      </div>
    </section>
  );
}

VerificationStatusCard.propTypes = {
  verification: PropTypes.shape({
    status: PropTypes.string,
    reference: PropTypes.string,
    documentsRequired: PropTypes.number,
    documentsSubmitted: PropTypes.number,
    requiredDocuments: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        description: PropTypes.string
      })
    ),
    outstandingDocuments: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired
      })
    ),
    riskScore: PropTypes.number,
    needsManualReview: PropTypes.bool,
    lastSubmittedAt: PropTypes.string,
    lastReviewedAt: PropTypes.string,
    documents: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        type: PropTypes.string,
        status: PropTypes.string,
        fileName: PropTypes.string,
        submittedAt: PropTypes.string,
        reviewedAt: PropTypes.string
      })
    )
  }),
  onRefresh: PropTypes.func
};

VerificationStatusCard.defaultProps = {
  verification: null,
  onRefresh: null
};
