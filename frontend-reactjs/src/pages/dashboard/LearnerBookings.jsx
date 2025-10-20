import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import {
  createTutorBookingRequest,
  exportTutorSchedule,
  updateTutorBooking,
  cancelTutorBooking
} from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LearnerBookings() {
  const { isLearner, section: data, refresh, loading, error } = useLearnerDashboardSection('tutorBookings');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [activeBookings, setActiveBookings] = useState([]);
  const [historicalBookings, setHistoricalBookings] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [bookingFormVisible, setBookingFormVisible] = useState(false);
  const [bookingFormMode, setBookingFormMode] = useState('create');
  const [bookingForm, setBookingForm] = useState({
    topic: 'Mentorship session',
    mentorPreference: '',
    preferredDate: '',
    notes: '',
    resourceLinks: ['']
  });
  const [bookingFormErrors, setBookingFormErrors] = useState([]);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [bookingFormStep, setBookingFormStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  useEffect(() => {
    setActiveBookings(Array.isArray(data?.active) ? data.active : []);
    setHistoricalBookings(Array.isArray(data?.history) ? data.history : []);
  }, [data]);

  useEffect(() => {
    if (error) {
      setStatusMessage({ type: 'error', message: error.message ?? 'Unable to load tutor bookings.' });
    }
  }, [error]);

  const disableActions = useMemo(() => pendingAction !== null, [pendingAction]);
  const statusOptions = useMemo(
    () => [
      { value: 'all', label: 'All statuses' },
      { value: 'requested', label: 'Requested' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ],
    []
  );

  const resetBookingForm = useCallback(() => {
    setBookingForm({
      topic: 'Mentorship session',
      mentorPreference: '',
      preferredDate: '',
      notes: '',
      resourceLinks: ['']
    });
    setBookingFormErrors([]);
    setEditingBookingId(null);
    setBookingFormMode('create');
    setBookingFormStep(1);
  }, []);

  const closeBookingForm = useCallback(() => {
    setBookingFormVisible(false);
    resetBookingForm();
  }, [resetBookingForm]);

  const openCreateForm = useCallback(() => {
    resetBookingForm();
    setBookingFormMode('create');
    setBookingFormVisible(true);
  }, [resetBookingForm]);

  const openEditForm = useCallback((booking) => {
    setBookingFormMode('edit');
    setEditingBookingId(booking.id);
    setBookingForm({
      topic: booking.topic ?? 'Mentorship session',
      mentorPreference: booking.mentor ?? '',
      preferredDate: booking.rawDate ?? '',
      notes: booking.notes ?? '',
      resourceLinks:
        Array.isArray(booking.resources) && booking.resources.length
          ? booking.resources.map((link) => link ?? '')
          : ['']
    });
    setBookingFormStep(1);
    setBookingFormVisible(true);
  }, []);

  const handleBookingFormChange = useCallback((event) => {
    const { name, value } = event.target;
    setBookingForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleBookingResourceChange = useCallback((index, value) => {
    setBookingForm((current) => {
      const next = Array.isArray(current.resourceLinks) ? [...current.resourceLinks] : [''];
      next[index] = value;
      return { ...current, resourceLinks: next };
    });
  }, []);

  const handleAddBookingResource = useCallback(() => {
    setBookingForm((current) => {
      const next = Array.isArray(current.resourceLinks) ? [...current.resourceLinks] : [];
      if (next.length >= 5) {
        return current;
      }
      return { ...current, resourceLinks: [...next, ''] };
    });
  }, []);

  const handleRemoveBookingResource = useCallback((index) => {
    setBookingForm((current) => {
      const next = Array.isArray(current.resourceLinks) ? [...current.resourceLinks] : [''];
      if (next.length === 1) {
        next[0] = '';
        return { ...current, resourceLinks: next };
      }
      next.splice(index, 1);
      return { ...current, resourceLinks: next.length ? next : [''] };
    });
  }, []);

  const validateBookingForm = useCallback(
    (scope = 'all') => {
      const errors = [];
      const allowStep = (step) => scope === 'all' || scope === step;
      if (allowStep(1)) {
        if (!bookingForm.topic || bookingForm.topic.trim().length < 3) {
          errors.push('Provide a detailed session focus to help your mentor prepare.');
        }
        if (!bookingForm.preferredDate) {
          errors.push('Select the preferred date and time for your session.');
        }
      }
      if (allowStep(2)) {
        const invalidLinks = (bookingForm.resourceLinks ?? [])
          .filter((link) => link && link.trim().length)
          .filter((link) => {
            try {
              const parsed = new URL(link);
              return !['http:', 'https:'].includes(parsed.protocol);
            } catch (error) {
              return true;
            }
          });
        if (invalidLinks.length) {
          errors.push('Resource links should be valid URLs starting with http or https.');
        }
      }
      setBookingFormErrors(errors);
      return errors.length === 0;
    },
    [bookingForm]
  );

  const handleAdvanceBookingForm = useCallback(() => {
    if (validateBookingForm(1)) {
      setBookingFormStep(2);
      setBookingFormErrors([]);
    }
  }, [validateBookingForm]);

  const handleRewindBookingForm = useCallback(() => {
    setBookingFormStep(1);
    setBookingFormErrors([]);
  }, []);

  const handleBookingFormSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage mentor bookings.' });
        return;
      }
      if (!validateBookingForm('all')) {
        return;
      }

      const payload = {
        topic: bookingForm.topic.trim(),
        preferredDate: bookingForm.preferredDate,
        mentorPreference: bookingForm.mentorPreference?.trim() || undefined,
        notes: bookingForm.notes?.trim() || undefined,
        resources: (bookingForm.resourceLinks ?? [])
          .map((link) => link?.trim())
          .filter((link) => link && link.length > 0)
      };

      if (bookingFormMode === 'create') {
        setPendingAction('create');
        setStatusMessage({ type: 'pending', message: 'Submitting your mentor booking request…' });
        try {
          const response = await createTutorBookingRequest({ token, payload });
          const acknowledgement = response?.data ?? {};
          const newBooking = {
            id: acknowledgement.reference ?? `request-${Date.now()}`,
            status: 'Requested',
            topic: acknowledgement.meta?.topic ?? payload.topic,
            mentor: acknowledgement.meta?.mentor ?? payload.mentorPreference ?? 'Mentor assigned soon',
            rawDate: acknowledgement.meta?.preferredDate ?? payload.preferredDate,
            date: acknowledgement.meta?.preferredDate
              ? new Date(acknowledgement.meta.preferredDate).toLocaleString()
              : new Date(payload.preferredDate).toLocaleString(),
            rating: null,
            notes: payload.notes ?? '',
            resources:
              Array.isArray(acknowledgement.meta?.resources) && acknowledgement.meta.resources.length
                ? acknowledgement.meta.resources
                : payload.resources ?? []
          };
          setActiveBookings((current) => [newBooking, ...current]);
          setStatusMessage({
            type: 'success',
            message: response?.message ?? 'Mentor booking request captured.'
          });
          closeBookingForm();
        } catch (requestError) {
          setStatusMessage({
            type: 'error',
            message:
              requestError instanceof Error
                ? requestError.message
                : 'We were unable to submit your mentor booking request.'
          });
        } finally {
          setPendingAction(null);
        }
        return;
      }

      setPendingAction(`update-${editingBookingId}`);
      setStatusMessage({ type: 'pending', message: 'Updating mentor booking details…' });
      try {
        await updateTutorBooking({ token, bookingId: editingBookingId, payload });
        setActiveBookings((current) =>
          current.map((booking) =>
            booking.id === editingBookingId
              ? {
                  ...booking,
                  topic: payload.topic,
                  mentor: payload.mentorPreference ?? booking.mentor,
                  rawDate: payload.preferredDate,
                  date: payload.preferredDate
                    ? new Date(payload.preferredDate).toLocaleString()
                    : booking.date,
                  notes: payload.notes ?? booking.notes,
                  resources: payload.resources ?? booking.resources ?? []
                }
              : booking
          )
        );
        setStatusMessage({ type: 'success', message: 'Mentor booking updated.' });
        closeBookingForm();
      } catch (updateError) {
        setStatusMessage({
          type: 'error',
          message:
            updateError instanceof Error
              ? updateError.message
              : 'We were unable to update the mentor booking.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [
      bookingForm,
      bookingFormMode,
      closeBookingForm,
      createTutorBookingRequest,
      editingBookingId,
      setActiveBookings,
      token,
      updateTutorBooking,
      validateBookingForm
    ]
  );

  const handleCancelBooking = useCallback(
    async (booking) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to cancel mentor bookings.' });
        return;
      }
      setPendingAction(`cancel-${booking.id}`);
      setStatusMessage({ type: 'pending', message: `Cancelling ${booking.topic}…` });
      try {
        await cancelTutorBooking({
          token,
          bookingId: booking.id,
          payload: { reason: 'Learner cancelled from dashboard' }
        });
        setActiveBookings((current) => current.filter((item) => item.id !== booking.id));
        setHistoricalBookings((current) => [
          {
            ...booking,
            status: 'Cancelled',
            date: booking.date,
            rating: booking.rating ?? '—'
          },
          ...current
        ]);
        setStatusMessage({ type: 'success', message: `${booking.topic} has been cancelled.` });
      } catch (cancelError) {
        setStatusMessage({
          type: 'error',
          message:
            cancelError instanceof Error
              ? cancelError.message
              : 'We were unable to cancel this booking.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [cancelTutorBooking, setActiveBookings, setHistoricalBookings, token]
  );

  const handleRequestSession = useCallback(async () => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to request a new mentor session.' });
      return;
    }

    setPendingAction('request');
    setStatusMessage({ type: 'pending', message: 'Submitting new tutor booking request…' });
    try {
      const response = await createTutorBookingRequest({
        token,
        payload: { topic: 'Mentorship session', preferredDate: new Date().toISOString() }
      });
      const acknowledgement = response?.data ?? {};
      const newBooking = {
        id: acknowledgement.reference ?? `request-${Date.now()}`,
        status: 'Requested',
        topic: acknowledgement.meta?.topic ?? 'Mentorship session',
        mentor: 'Mentor assigned soon',
        date: acknowledgement.meta?.preferredDate
          ? new Date(acknowledgement.meta.preferredDate).toLocaleString()
          : 'Scheduling',
        rating: null,
        resources: []
      };
      setActiveBookings((current) => [newBooking, ...current]);
      setStatusMessage({
        type: 'success',
        message: response?.message ?? 'Mentor booking request captured.'
      });
    } catch (requestError) {
      setStatusMessage({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'We were unable to submit your mentor booking request.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [token]);

  const handleExportAgenda = useCallback(async () => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to export your upcoming agenda.' });
      return;
    }

    setPendingAction('export');
    setStatusMessage({ type: 'pending', message: 'Preparing tutor agenda export…' });
    try {
      const response = await exportTutorSchedule({ token });
      const acknowledgement = response?.data ?? {};
      const downloadUrl = acknowledgement.meta?.downloadUrl ?? null;
      setStatusMessage({
        type: 'success',
        message:
          downloadUrl
            ? `Agenda export ready. Download from ${downloadUrl}.`
            : response?.message ?? 'Agenda export prepared.'
      });
    } catch (exportError) {
      setStatusMessage({
        type: 'error',
        message:
          exportError instanceof Error
            ? exportError.message
            : 'We were unable to export your mentor agenda.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [token]);

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
        description="Switch to the learner dashboard to review tutor bookings and mentorship history."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading tutor bookings"
        description="We are pulling the latest mentorship agenda for your learner dashboard."
      />
    );
  }

  if (!data) {
    return (
      <DashboardStateMessage
        title="No learner bookings"
        description="We couldn't locate any upcoming or historical tutor bookings. Refresh to retrieve the latest mentor agenda."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const filteredActive = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const normalizedStatus = statusFilter.toLowerCase();
    return activeBookings.filter((booking) => {
      const matchesStatus =
        normalizedStatus === 'all' ||
        (booking.status ?? '').toLowerCase().includes(normalizedStatus);
      if (!matchesStatus) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [booking.topic, booking.mentor, booking.notes, ...(booking.resources ?? [])]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystack.some((value) => value.includes(normalizedSearch));
    });
  }, [activeBookings, searchTerm, statusFilter]);

  const filteredHistory = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const normalizedStatus = statusFilter.toLowerCase();
    return historicalBookings.filter((booking) => {
      const matchesStatus =
        normalizedStatus === 'all' ||
        (booking.status ?? '').toLowerCase().includes(normalizedStatus);
      if (!matchesStatus) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [booking.topic, booking.mentor, booking.notes]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystack.some((value) => value.includes(normalizedSearch));
    });
  }, [historicalBookings, searchTerm, statusFilter]);

  const hasFilteredActive = filteredActive.length > 0;
  const hasFilteredHistory = filteredHistory.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Tutor bookings</h1>
          <p className="dashboard-subtitle">Coordinate sessions, briefs, and follow-ups with your mentor team.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="dashboard-primary-pill"
            onClick={openCreateForm}
            disabled={disableActions}
          >
            Request new session
          </button>
          <button
            type="button"
            className="dashboard-pill"
            onClick={handleRequestSession}
            disabled={disableActions}
          >
            Quick request
          </button>
        </div>
      </div>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Upcoming bookings</h2>
            <p className="text-sm text-slate-600">Briefs received, waiting on acceptance, or confirmed sessions.</p>
          </div>
          <button
            type="button"
            className="dashboard-pill"
            onClick={handleExportAgenda}
            disabled={disableActions}
          >
            Export agenda
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Search bookings
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter by mentor, topic, or resource"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Status filter
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end justify-end">
            <button
              type="button"
              className="dashboard-pill w-full justify-center px-4 py-2 text-xs"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {hasFilteredActive ? (
            filteredActive.map((item) => (
              <div key={item.id} className="dashboard-card-muted space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
                  <div>
                    <p className="dashboard-kicker">{item.status}</p>
                    <p className="text-sm font-semibold text-slate-900">{item.topic}</p>
                  <p className="text-xs text-slate-500">Mentor {item.mentor}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{item.date}</p>
                  {item.notes ? <p className="mt-1 italic text-slate-400">{item.notes}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  className="dashboard-pill px-3 py-1"
                  onClick={() => openEditForm(item)}
                  disabled={disableActions}
                >
                  Reschedule
                </button>
                <button type="button" className="dashboard-pill px-3 py-1">
                  Share prep notes
                </button>
                <button
                  type="button"
                  className="dashboard-pill bg-rose-50 text-rose-600 hover:bg-rose-100"
                  onClick={() => handleCancelBooking(item)}
                  disabled={disableActions}
                >
                  Cancel booking
                </button>
              </div>
              {Array.isArray(item.resources) && item.resources.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-xs text-slate-600">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Preparation resources</p>
                  <ul className="mt-2 space-y-2">
                    {item.resources.map((resource, index) => (
                      <li key={`${item.id}-resource-${index}`} className="flex items-center justify-between gap-3">
                        <span className="truncate">{resource}</span>
                        <a
                          href={resource}
                          target="_blank"
                          rel="noreferrer"
                          className="dashboard-pill px-3 py-1"
                        >
                          Open
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            ))
          ) : (
            <DashboardStateMessage
              title="No bookings match your filters"
              description="Adjust your search or status filters to surface upcoming mentorship sessions."
            />
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Completed sessions</h2>
        <table className="mt-4 w-full text-left text-sm text-slate-700">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3">Mentor</th>
              <th className="pb-3">Topic</th>
              <th className="pb-3">Date</th>
              <th className="pb-3 text-right">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {hasFilteredHistory ? (
              filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-primary/5">
                  <td className="py-3">{item.mentor}</td>
                  <td className="py-3 text-slate-600">{item.topic}</td>
                  <td className="py-3 text-slate-600">{item.date}</td>
                  <td className="py-3 text-right text-emerald-500">{item.rating}★</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-6 text-center text-sm text-slate-500">
                  No completed sessions match the current filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-3xl border px-5 py-4 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : statusMessage.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-primary/20 bg-primary/5 text-primary'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}

      {bookingFormVisible ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-primary-dark">
                  {bookingFormMode === 'create' ? 'New mentorship booking' : 'Update mentorship booking'}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {bookingFormMode === 'create' ? 'Tell us about the session' : 'Fine-tune the session brief'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Provide your ideal mentor, timing, and preparation notes so we can align the right expert.
                </p>
              </div>
              <button type="button" className="dashboard-pill" onClick={closeBookingForm}>
                Close
              </button>
            </div>

            {bookingFormErrors.length ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <ul className="list-disc space-y-1 pl-5">
                  {bookingFormErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form className="mt-6 space-y-6" onSubmit={handleBookingFormSubmit}>
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div className={`flex items-center gap-2 ${bookingFormStep === 1 ? 'text-primary' : ''}`}>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      bookingFormStep === 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    1
                  </span>
                  <span>Session details</span>
                </div>
                <span className="text-slate-300">—</span>
                <div className={`flex items-center gap-2 ${bookingFormStep === 2 ? 'text-primary' : ''}`}>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      bookingFormStep === 2 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    2
                  </span>
                  <span>Preparation</span>
                </div>
              </div>

              {bookingFormStep === 1 ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-900">
                    Session focus
                    <input
                      type="text"
                      name="topic"
                      required
                      value={bookingForm.topic}
                      onChange={handleBookingFormChange}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Example: AI interview preparation"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    Preferred mentor or specialty
                    <input
                      type="text"
                      name="mentorPreference"
                      value={bookingForm.mentorPreference}
                      onChange={handleBookingFormChange}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Name, timezone, or industry focus"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    Preferred date & time
                    <input
                      type="datetime-local"
                      name="preferredDate"
                      required
                      value={bookingForm.preferredDate}
                      onChange={handleBookingFormChange}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button type="button" className="dashboard-pill" onClick={closeBookingForm}>
                      Cancel
                    </button>
                    <button type="button" className="dashboard-primary-pill" onClick={handleAdvanceBookingForm}>
                      Continue to preparation
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-900">
                    Preparation notes (optional)
                    <textarea
                      name="notes"
                      value={bookingForm.notes}
                      onChange={handleBookingFormChange}
                      rows="4"
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Share agenda, links, or documents to fast-track the mentor brief."
                    />
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>Session resources</span>
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1"
                        onClick={handleAddBookingResource}
                      >
                        Add resource link
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Share prep docs, recordings, or slides that help your mentor accelerate the session.
                    </p>
                    <div className="space-y-3">
                      {(bookingForm.resourceLinks ?? ['']).map((link, index) => (
                        <div key={`resource-${index}`} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-center">
                          <input
                            type="url"
                            inputMode="url"
                            value={link}
                            onChange={(event) => handleBookingResourceChange(index, event.target.value)}
                            placeholder="https://resource-link"
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <div className="flex w-full justify-end gap-2 sm:w-auto">
                            <button
                              type="button"
                              className="dashboard-pill px-3 py-1"
                              onClick={() => handleRemoveBookingResource(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button type="button" className="dashboard-pill" onClick={handleRewindBookingForm}>
                      Back
                    </button>
                    <button type="button" className="dashboard-pill" onClick={closeBookingForm}>
                      Cancel
                    </button>
                    <button type="submit" className="dashboard-primary-pill" disabled={disableActions}>
                      {bookingFormMode === 'create' ? 'Submit booking request' : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
