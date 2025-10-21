import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { createEbookPurchaseIntent, listMarketplaceEbooks } from '../../api/ebookApi.js';
import {
  resumeEbook,
  shareEbookHighlight,
  createLearnerLibraryEntry,
  updateLearnerLibraryEntry,
  deleteLearnerLibraryEntry
} from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import useMountedRef from '../../hooks/useMountedRef.js';

function normaliseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function MarketplaceCard({ ebook, highlight, onPurchase, pending }) {
  const downloads = ebook.analytics?.downloads ?? 0;
  const readers = ebook.analytics?.readers ?? 0;
  const purchases = ebook.analytics?.purchases ?? 0;
  const price = ebook.price?.formatted ?? 'Contact us';

  return (
    <div
      className={`flex h-full flex-col justify-between rounded-3xl border p-6 shadow-sm transition ${
        highlight
          ? 'border-primary/20 bg-gradient-to-br from-primary/10 via-white to-primary/5'
          : 'border-slate-200 bg-white hover:border-primary/40'
      }`}
    >
      <div className="space-y-3">
        <p className={`dashboard-kicker ${highlight ? 'text-primary-dark' : ''}`}>{highlight ? 'Featured drop' : 'Marketplace'}</p>
        <h2 className="text-lg font-semibold text-slate-900">{ebook.title}</h2>
        {ebook.subtitle ? <p className="text-sm text-slate-600">{ebook.subtitle}</p> : null}
        <div className="text-xs text-slate-500">
          <p>Downloads · {downloads.toLocaleString()}</p>
          <p>Active readers · {readers.toLocaleString()}</p>
          <p>Purchases · {purchases.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{price}</p>
          <p className="text-xs text-slate-500">Secure checkout powered by Edulure</p>
        </div>
        <button
          type="button"
          className={`dashboard-primary-pill px-4 py-2 text-xs ${pending ? 'pointer-events-none opacity-60' : ''}`}
          onClick={() => onPurchase(ebook)}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? 'Preparing…' : 'Secure checkout'}
        </button>
      </div>
    </div>
  );
}

MarketplaceCard.propTypes = {
  ebook: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    price: PropTypes.shape({ formatted: PropTypes.string }),
    analytics: PropTypes.shape({
      downloads: PropTypes.number,
      readers: PropTypes.number,
      purchases: PropTypes.number
    })
  }).isRequired,
  highlight: PropTypes.bool,
  onPurchase: PropTypes.func.isRequired,
  pending: PropTypes.bool
};

MarketplaceCard.defaultProps = {
  highlight: false,
  pending: false
};

export default function LearnerEbooks() {
  const { isLearner, section: ebooks, refresh, loading, error } = useLearnerDashboardSection('ebooks');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const mounted = useMountedRef();

  const [activeTab, setActiveTab] = useState('library');
  const [marketplace, setMarketplace] = useState([]);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState(null);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const [pendingPurchaseId, setPendingPurchaseId] = useState(null);
  const [libraryStatus, setLibraryStatus] = useState(null);
  const [pendingLibraryId, setPendingLibraryId] = useState(null);
  const [libraryEntries, setLibraryEntries] = useState([]);
  const [libraryFormVisible, setLibraryFormVisible] = useState(false);
  const [libraryFormMode, setLibraryFormMode] = useState('create');
  const [editingLibraryId, setEditingLibraryId] = useState(null);
  const [libraryFormErrors, setLibraryFormErrors] = useState([]);
  const [libraryForm, setLibraryForm] = useState({
    title: '',
    format: 'E-book',
    progress: 0,
    lastOpened: '',
    url: '',
    summary: '',
    author: '',
    coverUrl: '',
    tags: ''
  });
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryFormatFilter, setLibraryFormatFilter] = useState('all');
  const [libraryFormStep, setLibraryFormStep] = useState(1);
  const [highlightFormVisible, setHighlightFormVisible] = useState(false);
  const [highlightEntryId, setHighlightEntryId] = useState(null);
  const [highlightForm, setHighlightForm] = useState({
    snippet: '',
    context: '',
    recipients: '',
    shareWithCommunity: true
  });
  const [highlightErrors, setHighlightErrors] = useState([]);
  const [highlightPending, setHighlightPending] = useState(false);
  const [librarySort, setLibrarySort] = useState('recent');
  const [insightsRange, setInsightsRange] = useState('30');
  const [audioPreview, setAudioPreview] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingMarketplace(true);
    setMarketplaceError(null);
    listMarketplaceEbooks({ signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) {
          setMarketplace(response ?? []);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setMarketplaceError(error instanceof Error ? error : new Error('Unable to load marketplace'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingMarketplace(false);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (error) {
      setLibraryStatus({ type: 'error', message: error.message ?? 'Unable to load your library.' });
    }
  }, [error]);

  useEffect(() => {
    setLibraryEntries(Array.isArray(ebooks?.library) ? ebooks.library : []);
  }, [ebooks]);

  const library = libraryEntries;
  const availableFormats = useMemo(() => {
    const formats = new Set(['all']);
    libraryEntries.forEach((entry) => {
      if (entry.format) {
        formats.add(entry.format.toLowerCase());
      }
    });
    return Array.from(formats);
  }, [libraryEntries]);
  const filteredLibrary = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    const format = libraryFormatFilter.toLowerCase();
    const filtered = libraryEntries.filter((entry) => {
      const matchesFormat = format === 'all' || (entry.format ?? '').toLowerCase() === format;
      if (!matchesFormat) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [entry.title, entry.summary, entry.author, ...(normaliseTags(entry.tags) ?? [])]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystack.some((value) => value.includes(query));
    });
    const sorter = [...filtered];
    return sorter.sort((a, b) => {
      if (librarySort === 'title') {
        return String(a.title ?? '').localeCompare(String(b.title ?? ''));
      }
      if (librarySort === 'progress') {
        return Number(b.progress ?? 0) - Number(a.progress ?? 0);
      }
      const aDate = a.lastOpened ? new Date(a.lastOpened) : null;
      const bDate = b.lastOpened ? new Date(b.lastOpened) : null;
      const aTime = aDate && !Number.isNaN(aDate.getTime()) ? aDate.getTime() : 0;
      const bTime = bDate && !Number.isNaN(bDate.getTime()) ? bDate.getTime() : 0;
      return bTime - aTime;
    });
  }, [libraryEntries, libraryFormatFilter, libraryQuery, librarySort]);
  const hasFilteredLibrary = filteredLibrary.length > 0;
  const recommendations = useMemo(() => (ebooks?.recommendations ?? []).slice(0, 3), [ebooks?.recommendations]);
  const marketplaceHighlights = useMemo(() => marketplace.slice(0, 3), [marketplace]);
  const marketplaceCatalogue = useMemo(() => marketplace.slice(3, 12), [marketplace]);
  const readingInsights = useMemo(() => {
    const parsedRange = Number.parseInt(insightsRange, 10);
    const rangeDays = Number.isFinite(parsedRange) ? parsedRange : 30;
    const now = new Date();
    const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const entries = libraryEntries.filter((entry) => {
      if (!entry.lastOpened) {
        return true;
      }
      const parsed = new Date(entry.lastOpened);
      if (Number.isNaN(parsed.getTime())) {
        return true;
      }
      return parsed >= cutoff;
    });
    const completed = entries.filter((entry) => Number(entry.progress ?? 0) >= 95);
    const inProgress = entries.filter((entry) => {
      const progress = Number(entry.progress ?? 0);
      return progress > 0 && progress < 95;
    });
    const digitalNotes = entries.reduce(
      (total, entry) => total + (Array.isArray(entry.highlights) ? entry.highlights.length : 0),
      0
    );
    const audioCount = entries.filter((entry) => (entry.format ?? '').toLowerCase().includes('audio')).length;
      const avgProgress = entries.length
        ? Math.round(entries.reduce((total, entry) => total + Number(entry.progress ?? 0), 0) / entries.length)
        : 0;
    return {
      scope: entries.length,
      completed: completed.length,
      inProgress: inProgress.length,
      avgProgress,
      digitalNotes,
      audioCount
    };
  }, [insightsRange, libraryEntries]);
  const immersiveHighlight = useMemo(() => {
    for (const entry of libraryEntries) {
      const candidate = entry.previewUrl ?? entry.trailerUrl ?? entry.url ?? null;
      if (!candidate || typeof candidate !== 'string') {
        continue;
      }
      if (!/youtube|youtu\.be|vimeo|loom/.test(candidate.toLowerCase())) {
        continue;
      }
      let embedUrl = candidate;
      try {
        if (candidate.includes('youtube.com/watch')) {
          const parsed = new URL(candidate);
          const videoId = parsed.searchParams.get('v');
          if (videoId) {
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
          }
        } else if (candidate.includes('youtu.be/')) {
          const id = candidate.split('youtu.be/')[1]?.split(/[?&]/)[0];
          if (id) {
            embedUrl = `https://www.youtube.com/embed/${id}`;
          }
        } else if (candidate.includes('vimeo.com/')) {
          const id = candidate.split('vimeo.com/')[1]?.split(/[?&#]/)[0];
          if (id) {
            embedUrl = `https://player.vimeo.com/video/${id}`;
          }
        } else if (candidate.includes('loom.com/share/')) {
          const id = candidate.split('loom.com/share/')[1]?.split(/[?&#]/)[0];
          if (id) {
            embedUrl = `https://www.loom.com/embed/${id}`;
          }
        }
      } catch (error) {
        embedUrl = candidate;
      }

      return { entry, url: candidate, embedUrl };
    }
    return null;
  }, [libraryEntries]);

  useEffect(() => {
    if (activeTab !== 'marketplace' && purchaseStatus?.type !== 'success') {
      setPurchaseStatus(null);
      setPendingPurchaseId(null);
    }
  }, [activeTab, purchaseStatus]);

  const resetLibraryForm = useCallback(() => {
    setLibraryForm({
      title: '',
      format: 'E-book',
      progress: 0,
      lastOpened: '',
      url: '',
      summary: '',
      author: '',
      coverUrl: '',
      tags: ''
    });
    setEditingLibraryId(null);
    setLibraryFormMode('create');
    setLibraryFormErrors([]);
    setLibraryFormStep(1);
  }, []);

  const closeLibraryForm = useCallback(() => {
    setLibraryFormVisible(false);
    resetLibraryForm();
  }, [resetLibraryForm]);

  const openLibraryCreateForm = useCallback(() => {
    resetLibraryForm();
    setLibraryFormMode('create');
    setLibraryFormVisible(true);
  }, [resetLibraryForm]);

  const openLibraryEditForm = useCallback((entry) => {
    setLibraryFormMode('edit');
    setEditingLibraryId(entry.id);
    setLibraryForm({
      title: entry.title ?? '',
      format: entry.format ?? 'E-book',
      progress: Number.isFinite(entry.progress) ? entry.progress : Number(entry.progress ?? 0),
      lastOpened: entry.lastOpenedRaw ?? '',
      url: entry.url ?? entry.link ?? '',
      summary: entry.summary ?? '',
      author: entry.author ?? '',
      coverUrl: entry.coverUrl ?? entry.cover ?? '',
      tags: normaliseTags(entry.tags).join(', ')
    });
    setLibraryFormStep(1);
    setLibraryFormVisible(true);
  }, []);

  const handleLibraryFormChange = useCallback((event) => {
    const { name, value } = event.target;
    setLibraryForm((current) => ({ ...current, [name]: value }));
  }, []);

  const validateLibraryForm = useCallback(
    (scope = 'all') => {
      const errors = [];
      const allowStep = (step) => scope === 'all' || scope === step;
      if (allowStep(1)) {
        if (!libraryForm.title || libraryForm.title.trim().length < 3) {
          errors.push('Add a descriptive title so the resource is easy to recognise.');
        }
        const progressValue = Number(libraryForm.progress);
        if (Number.isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
          errors.push('Progress should be between 0 and 100%.');
        }
        if (libraryForm.author && libraryForm.author.trim().length < 3) {
          errors.push('Author names should be at least three characters long.');
        }
      }
      if (allowStep(2)) {
        if (!libraryForm.lastOpened) {
          errors.push('Capture the last opened date to keep your activity timeline accurate.');
        }
        const links = [libraryForm.url, libraryForm.coverUrl]
          .filter((link) => link && link.trim().length > 0)
          .map((link) => link.trim());
        const invalidLinks = links.filter((link) => {
          try {
            const parsed = new URL(link);
            return !['http:', 'https:'].includes(parsed.protocol);
          } catch (error) {
            return true;
          }
        });
        if (invalidLinks.length) {
          errors.push('Links should start with http or https.');
        }
      }
      setLibraryFormErrors(errors);
      return errors.length === 0;
    },
    [libraryForm]
  );

  const handleAdvanceLibraryFormStep = useCallback(() => {
    if (validateLibraryForm(1)) {
      setLibraryFormStep(2);
      setLibraryFormErrors([]);
    }
  }, [validateLibraryForm]);

  const handleRewindLibraryFormStep = useCallback(() => {
    setLibraryFormStep(1);
    setLibraryFormErrors([]);
  }, []);

  const handleLibraryFormSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setLibraryStatus({ type: 'error', message: 'Sign in again to manage your library.' });
        return;
      }
      if (!validateLibraryForm('all')) {
        return;
      }

      const tags = normaliseTags(libraryForm.tags);
      const payload = {
        title: libraryForm.title.trim(),
        format: libraryForm.format.trim(),
        progress: Math.min(100, Math.max(0, Number(libraryForm.progress))),
        lastOpened: libraryForm.lastOpened,
        url: libraryForm.url?.trim() || undefined,
        summary: libraryForm.summary?.trim() || undefined,
        author: libraryForm.author?.trim() || undefined,
        coverUrl: libraryForm.coverUrl?.trim() || undefined,
        tags: tags.length ? tags : undefined
      };

      if (libraryFormMode === 'create') {
        setPendingLibraryId('create');
        setLibraryStatus({ type: 'pending', message: `Adding ${payload.title} to your library…` });
        try {
          const response = await createLearnerLibraryEntry({ token, payload });
          const entry = response?.data ?? {};
          const newEntry = {
            id: entry.id ?? `library-${Date.now()}`,
            title: entry.title ?? payload.title,
            format: entry.format ?? payload.format,
            progress: entry.progress ?? payload.progress,
            lastOpened: entry.lastOpenedLabel ?? entry.lastOpened ?? payload.lastOpened,
            lastOpenedRaw: entry.lastOpened ?? payload.lastOpened,
            url: entry.url ?? payload.url,
            summary: entry.summary ?? payload.summary,
            author: entry.author ?? payload.author,
            coverUrl: entry.coverUrl ?? payload.coverUrl,
            tags: entry.tags ?? payload.tags ?? []
          };
          if (mounted.current) {
            setLibraryEntries((current) => [newEntry, ...current]);
            setLibraryStatus({ type: 'success', message: `${newEntry.title} added to your library.` });
            closeLibraryForm();
          }
        } catch (createError) {
          if (mounted.current) {
            setLibraryStatus({
              type: 'error',
              message:
                createError instanceof Error ? createError.message : 'We were unable to add the new resource.'
            });
          }
        } finally {
          if (mounted.current) {
            setPendingLibraryId(null);
          }
        }
        return;
      }

      setPendingLibraryId(editingLibraryId);
      setLibraryStatus({ type: 'pending', message: `Updating ${payload.title}…` });
      try {
        await updateLearnerLibraryEntry({ token, ebookId: editingLibraryId, payload });
        if (!mounted.current) {
          return;
        }
        setLibraryEntries((current) =>
          current.map((entry) =>
            entry.id === editingLibraryId
              ? {
                  ...entry,
                  title: payload.title,
                  format: payload.format,
                  progress: payload.progress,
                  lastOpened: new Date(payload.lastOpened).toLocaleDateString(),
                  lastOpenedRaw: payload.lastOpened,
                  url: payload.url ?? entry.url,
                  summary: payload.summary ?? entry.summary,
                  author: payload.author ?? entry.author,
                  coverUrl: payload.coverUrl ?? entry.coverUrl,
                  tags: payload.tags ?? entry.tags
                }
              : entry
          )
        );
        setLibraryStatus({ type: 'success', message: `${payload.title} updated.` });
        closeLibraryForm();
      } catch (updateError) {
        if (mounted.current) {
          setLibraryStatus({
            type: 'error',
            message: updateError instanceof Error ? updateError.message : 'We were unable to update the resource.'
          });
        }
      } finally {
        if (mounted.current) {
          setPendingLibraryId(null);
        }
      }
    },
    [
      closeLibraryForm,
      createLearnerLibraryEntry,
      editingLibraryId,
      libraryForm,
      libraryFormMode,
      mounted,
      setLibraryEntries,
      token,
      updateLearnerLibraryEntry,
      validateLibraryForm
    ]
  );

  const handleRemoveLibraryEntry = useCallback(
    async (entry) => {
      if (!token) {
        setLibraryStatus({ type: 'error', message: 'Sign in again to manage your library.' });
        return;
      }
      setPendingLibraryId(entry.id);
      setLibraryStatus({ type: 'pending', message: `Removing ${entry.title} from your library…` });
      try {
        await deleteLearnerLibraryEntry({ token, ebookId: entry.id });
        if (!mounted.current) {
          return;
        }
        setLibraryEntries((current) => current.filter((item) => item.id !== entry.id));
        setLibraryStatus({ type: 'success', message: `${entry.title} removed from your library.` });
      } catch (removeError) {
        if (mounted.current) {
          setLibraryStatus({
            type: 'error',
            message:
              removeError instanceof Error ? removeError.message : 'We were unable to remove the resource.'
          });
        }
      } finally {
        if (mounted.current) {
          setPendingLibraryId(null);
        }
      }
    },
    [deleteLearnerLibraryEntry, mounted, setLibraryEntries, token]
  );

  const handleCompleteLibraryEntry = useCallback(
    async (entry) => {
      if (!token) {
        setLibraryStatus({ type: 'error', message: 'Sign in again to update your progress.' });
        return;
      }
      setPendingLibraryId(entry.id);
      setLibraryStatus({ type: 'pending', message: `Marking ${entry.title} as completed…` });
      const payload = {
        progress: 100,
        lastOpened: new Date().toISOString()
      };
      try {
        await updateLearnerLibraryEntry({ token, ebookId: entry.id, payload });
        const readableDate = new Date(payload.lastOpened).toLocaleDateString();
        if (!mounted.current) {
          return;
        }
        setLibraryEntries((current) =>
          current.map((item) =>
            item.id === entry.id
              ? {
                  ...item,
                  progress: 100,
                  lastOpened: readableDate,
                  lastOpenedRaw: payload.lastOpened
                }
              : item
          )
        );
        setLibraryStatus({ type: 'success', message: `${entry.title} marked as completed.` });
      } catch (completeError) {
        if (mounted.current) {
          setLibraryStatus({
            type: 'error',
            message:
              completeError instanceof Error
                ? completeError.message
                : 'We were unable to update the reading progress.'
          });
        }
      } finally {
        if (mounted.current) {
          setPendingLibraryId(null);
        }
      }
    },
    [mounted, setLibraryEntries, setLibraryStatus, token, updateLearnerLibraryEntry]
  );

  const handleResumeLibraryEntry = useCallback(
    async (entry) => {
      if (!token) {
        setLibraryStatus({ type: 'error', message: 'Sign in again to resume your reading session.' });
        return;
      }
      setPendingLibraryId(entry.id);
      setLibraryStatus({ type: 'pending', message: `Reopening ${entry.title}…` });
      try {
        const response = await resumeEbook({ token, ebookId: entry.id });
        if (mounted.current) {
          setLibraryStatus({
            type: 'success',
            message: response?.message ?? `${entry.title} is ready to continue.`
          });
        }
      } catch (resumeError) {
        if (mounted.current) {
          setLibraryStatus({
            type: 'error',
            message:
              resumeError instanceof Error
                ? resumeError.message
                : 'We were unable to resume your e-book.'
          });
        }
      } finally {
        if (mounted.current) {
          setPendingLibraryId(null);
        }
      }
    },
    [mounted, resumeEbook, setLibraryStatus, setPendingLibraryId, token]
  );

  const closeAudioPreview = useCallback(() => {
    setAudioPreview(null);
  }, []);

  const openAudioPreview = useCallback(
    (entry) => {
      const candidate =
        entry.audioPreviewUrl ??
        entry.audioUrl ??
        (typeof entry.url === 'string' && /\.(mp3|m4a|wav|aac)$/i.test(entry.url) ? entry.url : null);
      if (!candidate) {
        setLibraryStatus({ type: 'error', message: 'This title does not include an audio preview yet.' });
        return;
      }
      setAudioPreview({ title: entry.title, url: candidate, author: entry.author ?? '' });
    },
    [setLibraryStatus]
  );

  const openHighlightForm = useCallback((entry) => {
    setHighlightEntryId(entry.id);
    setHighlightForm({
      snippet: '',
      context: '',
      recipients: '',
      shareWithCommunity: true
    });
    setHighlightErrors([]);
    setHighlightFormVisible(true);
  }, []);

  const closeHighlightForm = useCallback(() => {
    setHighlightEntryId(null);
    setHighlightFormVisible(false);
    setHighlightErrors([]);
    setHighlightPending(false);
  }, []);

  const handleHighlightFormChange = useCallback((event) => {
    const { name, type, checked, value } = event.target;
    setHighlightForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const validateHighlightForm = useCallback(() => {
    const errors = [];
    if (!highlightForm.snippet || highlightForm.snippet.trim().length < 10) {
      errors.push('Share at least a short excerpt to contextualise the highlight.');
    }
    const recipients = highlightForm.recipients
      .split(',')
      .map((recipient) => recipient.trim())
      .filter(Boolean);
    const invalidRecipients = recipients.filter((recipient) => !recipient.includes('@'));
    if (invalidRecipients.length) {
      errors.push('Recipient emails should include an @ symbol.');
    }
    setHighlightErrors(errors);
    return { valid: errors.length === 0, recipients };
  }, [highlightForm]);

  const handleHighlightFormSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setLibraryStatus({ type: 'error', message: 'Sign in again to share highlights.' });
        return;
      }
      const { valid, recipients } = validateHighlightForm();
      if (!valid) {
        return;
      }
      setHighlightPending(true);
      setLibraryStatus({ type: 'pending', message: 'Publishing your highlight to peers…' });
      try {
        const payload = {
          snippet: highlightForm.snippet.trim(),
          note: highlightForm.context?.trim() || undefined,
          shareWithCommunity: highlightForm.shareWithCommunity,
          recipients
        };
        const response = await shareEbookHighlight({ token, ebookId: highlightEntryId, payload });
        if (mounted.current) {
          setLibraryStatus({
            type: 'success',
            message: response?.message ?? 'Highlight shared with your selected contacts.'
          });
          closeHighlightForm();
        }
      } catch (shareError) {
        if (mounted.current) {
          setLibraryStatus({
            type: 'error',
            message: shareError instanceof Error ? shareError.message : 'We were unable to share your highlight.'
          });
        }
      } finally {
        if (mounted.current) {
          setHighlightPending(false);
        }
      }
    },
    [
      closeHighlightForm,
      highlightEntryId,
      highlightForm,
      mounted,
      shareEbookHighlight,
      token,
      validateHighlightForm
    ]
  );

  const handlePurchase = useCallback(
    async (ebook) => {
      if (!token) {
        setPurchaseStatus({ type: 'error', message: 'You need to be signed in to purchase this title.' });
        return;
      }
      setPendingPurchaseId(ebook.id);
      setPurchaseStatus({ type: 'pending', message: `Creating secure checkout for ${ebook.title}…` });
      try {
        const payload = await createEbookPurchaseIntent({
          token,
          ebookId: ebook.id,
          payload: { provider: 'stripe' }
        });
        const clientSecret = payload.payment?.clientSecret ?? null;
        const approvalUrl = payload.payment?.approvalUrl ?? null;
        const nextSteps =
          approvalUrl || clientSecret
            ? `Use the ${approvalUrl ? 'provided approval link' : 'Stripe client secret'} to complete payment.`
            : 'Proceed to checkout using the supplied payment ID.';
        if (mounted.current) {
          setPurchaseStatus({
            type: 'success',
            message: `Secure checkout created for ${ebook.title}. Reference ${
              payload.payment?.paymentId ?? 'N/A'
            }. ${nextSteps}`
          });
        }
      } catch (error) {
        if (mounted.current) {
          setPurchaseStatus({
            type: 'error',
            message: error instanceof Error ? error.message : 'Payment initialisation failed.'
          });
        }
      } finally {
        if (mounted.current) {
          setPendingPurchaseId(null);
        }
      }
    },
    [mounted, token]
  );

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
        description="Switch to your learner dashboard to review your e-book library and curated marketplace."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading learner library"
        description="We are pulling your saved e-books and recommendations."
      />
    );
  }

  if (!ebooks) {
    return (
      <DashboardStateMessage
        title="E-book Learnspace unavailable"
        description="We could not load your library insights. Refresh to try pulling the latest progress and highlights."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">E-book experiences</h1>
          <p className="dashboard-subtitle">
            Revisit your library or discover premium playbooks curated by trusted instructors.
          </p>
        </div>
        <div className="flex gap-2 rounded-full border border-slate-200 bg-white p-1 text-sm shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`rounded-full px-4 py-2 font-medium transition ${
              activeTab === 'library' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-primary'
            }`}
          >
            My library
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('marketplace')}
            className={`rounded-full px-4 py-2 font-medium transition ${
              activeTab === 'marketplace' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-primary'
            }`}
          >
            Marketplace
          </button>
        </div>
      </div>

      {activeTab === 'library' ? (
        <section className="space-y-6">
          {libraryStatus ? (
            <div
              className={`rounded-3xl border px-5 py-4 text-sm ${
                libraryStatus.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : libraryStatus.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-primary/20 bg-primary/5 text-primary'
              }`}
            >
              {libraryStatus.message}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Personal library</h2>
            <button type="button" className="dashboard-primary-pill" onClick={openLibraryCreateForm}>
              Add resource
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reading momentum</p>
                <h3 className="text-lg font-semibold text-slate-900">Learning cadence snapshot</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Track how many titles are active, wrapped up, and how deep your highlights go this season.
                </p>
              </div>
              <label className="flex flex-col text-xs font-medium text-slate-600 lg:w-48">
                Reporting window
                <select
                  value={insightsRange}
                  onChange={(event) => setInsightsRange(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="180">Last 6 months</option>
                </select>
              </label>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titles in focus</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{readingInsights.scope}</p>
                <p className="mt-1 text-xs text-slate-500">Opened within the selected window.</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-700">{readingInsights.completed}</p>
                <p className="mt-1 text-xs text-emerald-700/80">Fully finished and ready for recap.</p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Average progress</p>
                <p className="mt-2 text-2xl font-semibold text-primary">{readingInsights.avgProgress}%</p>
                <p className="mt-1 text-xs text-primary/80">Across all tracked titles in this period.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Highlights captured</p>
                <p className="mt-2 text-2xl font-semibold text-amber-700">{readingInsights.digitalNotes}</p>
                <p className="mt-1 text-xs text-amber-700/80">Clipped quotes &amp; annotations ({readingInsights.audioCount} audio titles).</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Search library
              <input
                type="search"
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder="Search title, author, or tags"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Format filter
              <select
                value={libraryFormatFilter}
                onChange={(event) => setLibraryFormatFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {availableFormats.map((format) => (
                  <option key={format} value={format}>
                    {format === 'all' ? 'All formats' : format.replace(/(^\w|[-_\s]\w)/g, (match) => match.toUpperCase())}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Sort order
              <select
                value={librarySort}
                onChange={(event) => setLibrarySort(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="recent">Recently opened</option>
                <option value="title">Title (A-Z)</option>
                <option value="progress">Progress</option>
              </select>
            </label>
            <div className="flex items-end justify-end">
              <button
                type="button"
                className="dashboard-pill w-full justify-center px-4 py-2 text-xs"
                onClick={() => {
                  setLibraryQuery('');
                  setLibraryFormatFilter('all');
                  setLibrarySort('recent');
                }}
              >
                Reset filters
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {library.length > 0 ? (
              hasFilteredLibrary ? (
                filteredLibrary.map((ebook) => (
                  <div key={ebook.id} className="dashboard-section flex flex-col">
                    <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                      {ebook.coverUrl ? (
                        <img
                          src={ebook.coverUrl}
                          alt="E-book cover art"
                          className="h-40 w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary/20 text-sm font-semibold text-primary">
                          {ebook.format}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="dashboard-kicker">{ebook.format}</p>
                      <h2 className="text-lg font-semibold text-slate-900">{ebook.title}</h2>
                      {ebook.author ? (
                        <p className="text-xs uppercase tracking-wide text-slate-500">{ebook.author}</p>
                      ) : null}
                      <p className="text-sm text-slate-600">
                        Last opened {ebook.lastOpened ?? new Date().toLocaleDateString()}
                      </p>
                      {ebook.summary ? <p className="text-xs text-slate-500">{ebook.summary}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                        {normaliseTags(ebook.tags).slice(0, 4).map((tag) => (
                          <span key={`${ebook.id}-${tag}`} className="dashboard-pill bg-white px-3 py-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                        style={{ width: `${Math.min(100, Number(ebook.progress ?? 0))}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {Math.min(100, Number(ebook.progress ?? 0))}% complete
                    </p>
                    {(ebook.audioPreviewUrl || ebook.audioUrl ||
                      (typeof ebook.url === 'string' && /\.(mp3|m4a|wav|aac)$/i.test(ebook.url))) && (
                      <p className="text-xs text-primary">Audio companion available</p>
                    )}
                    {ebook.url ? (
                      <a
                        href={ebook.url}
                        target="_blank"
                        rel="noreferrer"
                        className="dashboard-pill mt-3 inline-flex w-max items-center gap-2 px-3 py-1 text-xs"
                      >
                        Open resource
                      </a>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1"
                        onClick={() => handleResumeLibraryEntry(ebook)}
                        disabled={pendingLibraryId === ebook.id}
                      >
                        {pendingLibraryId === ebook.id ? 'Resuming…' : 'Continue reading'}
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1"
                        onClick={() => openHighlightForm(ebook)}
                        disabled={highlightPending && highlightEntryId === ebook.id}
                      >
                        {highlightPending && highlightEntryId === ebook.id ? 'Preparing…' : 'Share highlight'}
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1"
                        onClick={() => openLibraryEditForm(ebook)}
                      >
                        Edit details
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-emerald-600"
                        onClick={() => handleCompleteLibraryEntry(ebook)}
                        disabled={pendingLibraryId === ebook.id}
                      >
                        {pendingLibraryId === ebook.id ? 'Updating…' : 'Mark completed'}
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1"
                        onClick={() => openAudioPreview(ebook)}
                      >
                        Listen preview
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill bg-rose-50 text-rose-600 hover:bg-rose-100"
                        onClick={() => handleRemoveLibraryEntry(ebook)}
                        disabled={pendingLibraryId === ebook.id}
                      >
                        {pendingLibraryId === ebook.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <DashboardStateMessage
                  className="md:col-span-3"
                  title="No titles match your filters"
                  description="Adjust your search text or format filters to surface saved resources."
                  actionLabel="Reset filters"
                  onAction={() => {
                    setLibraryQuery('');
                    setLibraryFormatFilter('all');
                  }}
                />
              )
            ) : (
              <DashboardStateMessage
                className="md:col-span-3"
                title="No saved e-books yet"
                description="Import resources or sync from your reader integrations to populate this space."
                actionLabel="Refresh"
                onAction={() => refresh?.()}
              />
            )}
          </div>

          {immersiveHighlight ? (
            <div className="dashboard-section grid gap-6 lg:grid-cols-2 lg:items-center">
              <div className="space-y-3">
                <p className="dashboard-kicker text-primary">Immersive spotlight</p>
                <h3 className="text-xl font-semibold text-slate-900">{immersiveHighlight.entry.title}</h3>
                <p className="text-sm text-slate-600">
                  Step inside {immersiveHighlight.entry.title} with a curated trailer. Share it with your accountability group to
                  spark discussion before your next reading circle.
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{immersiveHighlight.entry.format}</span>
                  {immersiveHighlight.entry.author ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1">{immersiveHighlight.entry.author}</span>
                  ) : null}
                  <a
                    href={immersiveHighlight.url}
                    target="_blank"
                    rel="noreferrer"
                    className="dashboard-pill px-3 py-1"
                  >
                    Open in new tab
                  </a>
                </div>
              </div>
              <div className="aspect-video w-full overflow-hidden rounded-3xl border border-slate-200 shadow-inner">
                <iframe
                  title={`Preview for ${immersiveHighlight.entry.title}`}
                  src={immersiveHighlight.embedUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ) : null}

          {recommendations.length > 0 ? (
            <div className="dashboard-card border border-primary/20 bg-gradient-to-r from-primary/5 via-white to-primary/5 px-6 py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="dashboard-kicker text-primary-dark">Personalised next reads</p>
                  <h2 className="text-lg font-semibold text-slate-900">Curated titles to continue your momentum</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Hand-picked based on your current curriculum and the communities you are active in.
                  </p>
                </div>
                <Link to="/explorer?tab=ebooks" className="dashboard-primary-pill px-5 py-2 text-xs">
                  Explore catalogue
                </Link>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {recommendations.map((item) => (
                  <div
                    key={item.id ?? item.slug ?? item.title}
                    className="rounded-3xl border border-white/40 bg-white/80 p-5 shadow-sm"
                  >
                    <p className="dashboard-kicker text-slate-400">{item.category ?? 'Recommended'}</p>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">{item.title}</h3>
                    {item.subtitle ? <p className="mt-2 text-sm text-slate-600">{item.subtitle}</p> : null}
                    <p className="mt-4 text-xs text-slate-500">
                      Estimated {item.readingTime ?? item.readingTimeMinutes ?? '45'} minutes
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                      {normaliseTags(item.tags)
                        .slice(0, 3)
                        .map((tag) => (
                        <span key={tag} className="dashboard-pill bg-white px-3 py-1">
                          {tag}
                        </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="space-y-6">
          {marketplaceError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {marketplaceError.message}
            </div>
          ) : null}
          {loadingMarketplace ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="h-3 w-24 rounded-full bg-slate-200" />
                  <div className="mt-4 h-4 w-32 rounded-full bg-slate-200" />
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100" />
                  <div className="mt-2 h-2 w-3/4 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : marketplaceHighlights.length + marketplaceCatalogue.length > 0 ? (
            <div className="space-y-6">
              {marketplaceHighlights.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {marketplaceHighlights.map((ebook) => (
                    <MarketplaceCard
                      key={ebook.id}
                      ebook={ebook}
                      highlight
                      onPurchase={handlePurchase}
                      pending={pendingPurchaseId === ebook.id}
                    />
                  ))}
                </div>
              ) : null}

              {marketplaceCatalogue.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {marketplaceCatalogue.map((ebook) => (
                    <MarketplaceCard
                      key={ebook.id}
                      ebook={ebook}
                      onPurchase={handlePurchase}
                      pending={pendingPurchaseId === ebook.id}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <DashboardStateMessage
              title="Marketplace is getting ready"
              description="We are onboarding new author releases. Check back soon for fresh playbooks and frameworks."
              actionLabel="Refresh"
              onAction={() => refresh?.()}
            />
          )}

          {purchaseStatus ? (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-3xl border px-5 py-4 text-sm ${
                purchaseStatus.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : purchaseStatus.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-primary/20 bg-primary/5 text-primary'
              }`}
            >
              {purchaseStatus.message}
            </div>
          ) : null}
        </section>
      )}

      {libraryFormVisible ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-primary-dark">
                  {libraryFormMode === 'create' ? 'Add to library' : 'Update library resource'}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {libraryFormMode === 'create'
                    ? 'Capture new playbooks, handbooks, or notes'
                    : 'Refresh metadata for this resource'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Track reading progress, resource links, and summaries to keep your curriculum organised.
                </p>
              </div>
              <button type="button" className="dashboard-pill" onClick={closeLibraryForm}>
                Close
              </button>
            </div>

            {libraryFormErrors.length ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <ul className="list-disc space-y-1 pl-5">
                  {libraryFormErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form className="mt-6 space-y-6" onSubmit={handleLibraryFormSubmit}>
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div className={`flex items-center gap-2 ${libraryFormStep === 1 ? 'text-primary' : ''}`}>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      libraryFormStep === 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    1
                  </span>
                  <span>Resource basics</span>
                </div>
                <span className="text-slate-300">—</span>
                <div className={`flex items-center gap-2 ${libraryFormStep === 2 ? 'text-primary' : ''}`}>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      libraryFormStep === 2 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    2
                  </span>
                  <span>Enrichment</span>
                </div>
              </div>

              {libraryFormStep === 1 ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-900">
                    Title
                    <input
                      type="text"
                      name="title"
                      required
                      value={libraryForm.title}
                      onChange={handleLibraryFormChange}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Example: Product analytics teardown"
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-900">
                      Format
                      <input
                        type="text"
                        name="format"
                        value={libraryForm.format}
                        onChange={handleLibraryFormChange}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-900">
                      Author / creator
                      <input
                        type="text"
                        name="author"
                        value={libraryForm.author}
                        onChange={handleLibraryFormChange}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-900">
                      Progress (%)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        name="progress"
                        value={libraryForm.progress}
                        onChange={handleLibraryFormChange}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-900">
                      Last opened
                      <input
                        type="date"
                        name="lastOpened"
                        value={libraryForm.lastOpened}
                        onChange={handleLibraryFormChange}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button type="button" className="dashboard-pill" onClick={closeLibraryForm}>
                      Cancel
                    </button>
                    <button type="button" className="dashboard-primary-pill" onClick={handleAdvanceLibraryFormStep}>
                      Continue to enrichment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-900">
                    Resource link (optional)
                    <input
                      type="url"
                      name="url"
                      value={libraryForm.url}
                      onChange={handleLibraryFormChange}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="https://"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    Cover image URL (optional)
                    <input
                      type="url"
                      name="coverUrl"
                      value={libraryForm.coverUrl}
                      onChange={handleLibraryFormChange}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="https://"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    Tags (comma separated)
                    <input
                      type="text"
                      name="tags"
                      value={libraryForm.tags}
                      onChange={handleLibraryFormChange}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Leadership, Growth, Design"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    Summary
                    <textarea
                      name="summary"
                      rows="4"
                      value={libraryForm.summary}
                      onChange={handleLibraryFormChange}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="What makes this resource valuable?"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button type="button" className="dashboard-pill" onClick={handleRewindLibraryFormStep}>
                      Back
                    </button>
                    <button type="button" className="dashboard-pill" onClick={closeLibraryForm}>
                      Cancel
                    </button>
                    <button type="submit" className="dashboard-primary-pill" disabled={pendingLibraryId !== null}>
                      {libraryFormMode === 'create' ? 'Add to library' : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      ) : null}

      {audioPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-primary">Audio preview</p>
                <h2 className="text-xl font-semibold text-slate-900">{audioPreview.title}</h2>
                {audioPreview.author ? (
                  <p className="text-sm text-slate-500">Narrated by {audioPreview.author}</p>
                ) : null}
              </div>
              <button type="button" className="dashboard-pill" onClick={closeAudioPreview}>
                Close
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Press play to sample the audiobook edition and decide if you want to switch formats before your next session.
            </p>
            <audio controls className="mt-4 w-full" src={audioPreview.url} preload="metadata">
              <track kind="captions" />
              Your browser does not support the audio element.
            </audio>
            <div className="mt-4 flex justify-end">
              <a href={audioPreview.url} target="_blank" rel="noreferrer" className="dashboard-primary-pill px-4 py-2 text-xs">
                Open full audio
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {highlightFormVisible ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-primary-dark">Share highlight</p>
                <h2 className="text-xl font-semibold text-slate-900">Broadcast this insight</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Curate a snippet, add optional context, and choose whether to broadcast to your community.
                </p>
              </div>
              <button type="button" className="dashboard-pill" onClick={closeHighlightForm}>
                Close
              </button>
            </div>

            {highlightErrors.length ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <ul className="list-disc space-y-1 pl-5">
                  {highlightErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={handleHighlightFormSubmit}>
              <label className="block text-sm font-medium text-slate-900">
                Highlight snippet
                <textarea
                  name="snippet"
                  rows="4"
                  value={highlightForm.snippet}
                  onChange={handleHighlightFormChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Quote or excerpt you want to spotlight"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-900">
                Optional context
                <textarea
                  name="context"
                  rows="3"
                  value={highlightForm.context}
                  onChange={handleHighlightFormChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Add commentary for your peers"
                />
              </label>
              <label className="block text-sm font-medium text-slate-900">
                Email recipients (comma separated)
                <input
                  type="text"
                  name="recipients"
                  value={highlightForm.recipients}
                  onChange={handleHighlightFormChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="team@example.com, mentor@example.com"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="shareWithCommunity"
                  checked={highlightForm.shareWithCommunity}
                  onChange={handleHighlightFormChange}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                />
                Share with learner community feed
              </label>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button type="button" className="dashboard-pill" onClick={closeHighlightForm}>
                  Cancel
                </button>
                <button type="submit" className="dashboard-primary-pill" disabled={highlightPending}>
                  {highlightPending ? 'Sharing…' : 'Publish highlight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
