import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import Profile from '../Profile.jsx';

const fetchVerificationSummaryMock = vi.hoisted(() => vi.fn());
const requestVerificationUploadMock = vi.hoisted(() => vi.fn());
const attachVerificationDocumentMock = vi.hoisted(() => vi.fn());
const submitVerificationPackageMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const useConsentRecordsMock = vi.hoisted(() => vi.fn());

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../hooks/useConsentRecords.js', () => ({
  __esModule: true,
  default: useConsentRecordsMock
}));

vi.mock('../../api/verificationApi.js', () => ({
  __esModule: true,
  fetchVerificationSummary: fetchVerificationSummaryMock,
  requestVerificationUpload: requestVerificationUploadMock,
  attachVerificationDocument: attachVerificationDocumentMock,
  submitVerificationPackage: submitVerificationPackageMock
}));

describe('<Profile /> verification workflow', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'crypto', {
      value: {
        subtle: {
          digest: vi.fn(() => Promise.resolve(new Uint8Array(32).buffer))
        }
      },
      configurable: true
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      session: {
        user: { id: 99 },
        tokens: { accessToken: 'access-123' }
      }
    });
    useConsentRecordsMock.mockReturnValue({
      consents: [],
      loading: false,
      error: null,
      revokeConsent: vi.fn()
    });
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true }));
  });

  it('requests upload instructions, uploads files, and attaches verification documents', async () => {
    const initialSummary = {
      status: 'collecting',
      documentsRequired: 3,
      documentsSubmitted: 0,
      requiredDocuments: [
        { type: 'government_id_front', label: 'Front of ID', description: 'Upload the front of your document.' },
        { type: 'government_id_back', label: 'Back of ID', description: 'Upload the back of your document.' },
        { type: 'identity_selfie', label: 'Selfie with ID', description: 'Take a selfie holding the ID.' }
      ],
      outstandingDocuments: [
        { type: 'government_id_front' },
        { type: 'government_id_back' },
        { type: 'identity_selfie' }
      ],
      documents: []
    };
    const updatedSummary = {
      ...initialSummary,
      documentsSubmitted: 1,
      outstandingDocuments: [
        { type: 'government_id_back' },
        { type: 'identity_selfie' }
      ],
      documents: [
        {
          type: 'government_id_front',
          fileName: 'front.png',
          status: 'pending_review'
        }
      ]
    };

    fetchVerificationSummaryMock.mockResolvedValueOnce(initialSummary).mockResolvedValue(updatedSummary);
    requestVerificationUploadMock.mockResolvedValue({
      upload: {
        url: 'https://uploads.example.com/front',
        bucket: 'kyc-bucket',
        key: 'users/99/front.png'
      }
    });
    attachVerificationDocumentMock.mockResolvedValue({});

    render(<Profile />);

    const frontInput = await screen.findByLabelText('Front of ID');
    await userEvent.upload(frontInput, new File(['content'], 'front.png', { type: 'image/png' }));

    await waitFor(() => expect(requestVerificationUploadMock).toHaveBeenCalledTimes(1));
    expect(requestVerificationUploadMock).toHaveBeenCalledWith({
      token: 'access-123',
      payload: expect.objectContaining({
        documentType: 'government_id_front',
        fileName: 'front.png',
        mimeType: 'image/png'
      })
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://uploads.example.com/front',
      expect.objectContaining({ method: 'PUT' })
    );
    expect(attachVerificationDocumentMock).toHaveBeenCalledWith({
      token: 'access-123',
      payload: expect.objectContaining({
        documentType: 'government_id_front',
        storageBucket: 'kyc-bucket',
        storageKey: 'users/99/front.png',
        fileName: 'front.png',
        checksumSha256: expect.any(String)
      })
    });

    await waitFor(() => expect(fetchVerificationSummaryMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Document uploaded successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/Uploaded front/i)).toBeInTheDocument();
  });

  it('submits the verification package when all documents are attached', async () => {
    const readySummary = {
      status: 'collecting',
      documentsRequired: 3,
      documentsSubmitted: 3,
      outstandingDocuments: [],
      requiredDocuments: [
        { type: 'government_id_front', label: 'Front of ID' },
        { type: 'government_id_back', label: 'Back of ID' },
        { type: 'identity_selfie', label: 'Selfie with ID' }
      ],
      documents: [
        { type: 'government_id_front', fileName: 'front.png', status: 'approved' },
        { type: 'government_id_back', fileName: 'back.png', status: 'approved' },
        { type: 'identity_selfie', fileName: 'selfie.png', status: 'approved' }
      ]
    };

    fetchVerificationSummaryMock.mockResolvedValue(readySummary);
    submitVerificationPackageMock.mockResolvedValue({});

    render(<Profile />);

    const submitButton = await screen.findByRole('button', { name: 'Submit for review' });
    expect(submitButton).toBeEnabled();

    await userEvent.click(submitButton);

    await waitFor(() => expect(submitVerificationPackageMock).toHaveBeenCalledWith({ token: 'access-123' }));
    expect(fetchVerificationSummaryMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/Verification submitted for review/i)).toBeInTheDocument();
  });
});

