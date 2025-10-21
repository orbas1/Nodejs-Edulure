import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import ProfileIdentityEditor from '../../../../components/profile/ProfileIdentityEditor.jsx';
import { fetchCurrentUser, updateCurrentUser } from '../../../../api/userApi.js';
import { useAuth } from '../../../../context/AuthContext.jsx';
import { isAbortError } from '../../../../utils/errors.js';

const emptyForm = {
  firstName: '',
  lastName: '',
  displayName: '',
  tagline: '',
  location: '',
  bio: '',
  avatarUrl: '',
  bannerUrl: '',
  socialLinks: [{ label: '', url: '', handle: '' }],
  address: {
    line1: '',
    line2: '',
    city: '',
    region: '',
    postalCode: '',
    country: ''
  }
};

function normaliseAddress(address) {
  if (!address || typeof address !== 'object') {
    return { ...emptyForm.address };
  }
  return {
    line1: address.line1 ?? address.address_line_1 ?? '',
    line2: address.line2 ?? address.address_line_2 ?? '',
    city: address.city ?? address.locality ?? '',
    region: address.region ?? address.state ?? '',
    postalCode: address.postalCode ?? address.postal_code ?? '',
    country: address.country ?? ''
  };
}

function normaliseSocialLinks(socialLinks) {
  if (!Array.isArray(socialLinks) || socialLinks.length === 0) {
    return [{ label: '', url: '', handle: '' }];
  }
  const links = socialLinks
    .filter((link) => link && typeof link === 'object')
    .map((link) => ({
      label: link.label ?? '',
      url: link.url ?? '',
      handle: link.handle ?? ''
    }));
  return links.length ? links : [{ label: '', url: '', handle: '' }];
}

function buildFormFromUser(user) {
  if (!user) {
    return { ...emptyForm };
  }

  const profile = typeof user.profile === 'object' && user.profile !== null ? user.profile : {};

  return {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    displayName:
      profile.displayName && profile.displayName.trim().length > 0
        ? profile.displayName.trim()
        : `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    tagline: profile.tagline ?? '',
    location: profile.location ?? '',
    bio: profile.bio ?? '',
    avatarUrl: profile.avatarUrl ?? '',
    bannerUrl: profile.bannerUrl ?? '',
    socialLinks: normaliseSocialLinks(profile.socialLinks),
    address: normaliseAddress(user.address)
  };
}

function hasChanged(initial, next) {
  return JSON.stringify(initial) !== JSON.stringify(next);
}

function normaliseScopes(values) {
  return new Set(
    (Array.isArray(values) ? values : values ? [values] : [])
      .map((value) => value?.toString().toLowerCase())
      .filter(Boolean)
  );
}

function sanitiseHttpUrl(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (error) {
    try {
      const fallback = new URL(`https://${trimmed}`);
      if (!['http:', 'https:'].includes(fallback.protocol)) {
        return null;
      }
      return fallback.toString();
    } catch (secondaryError) {
      return null;
    }
  }
}

function sanitiseSocialLink(link) {
  if (!link || typeof link !== 'object') {
    return null;
  }
  const url = sanitiseHttpUrl(link.url);
  if (!url) {
    return null;
  }
  const label = link.label?.trim?.() ?? '';
  const handle = link.handle?.trim?.() ?? '';
  return {
    label: label.length > 0 ? label : null,
    url,
    handle: handle.length > 0 ? handle : null
  };
}

export default function LearnerProfileEditor({ onProfileUpdated }) {
  const { session, setSession } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const userScopes = useMemo(() => normaliseScopes(session?.user?.scopes ?? session?.user?.permissions), [session]);
  const userRoles = useMemo(() => normaliseScopes(session?.user?.roles ?? session?.user?.role), [session]);
  const canManageProfile = useMemo(() => {
    if (!session?.user) {
      return false;
    }
    if (userRoles.size === 0 && userScopes.size === 0) {
      return true;
    }
    if (userRoles.has('admin') || userRoles.has('learner')) {
      return true;
    }
    const permittedScopes = ['profile:write', 'profile:update', 'learner.profile.write'];
    return permittedScopes.some((scope) => userScopes.has(scope));
  }, [session, userRoles, userScopes]);

  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const profileRequestRef = useRef(null);
  const submitRequestRef = useRef(null);

  const canSubmit = useMemo(() => hasChanged(initialForm, form) && !saving, [initialForm, form, saving]);

  const loadProfile = useCallback(async () => {
    if (!token || !canManageProfile) {
      setForm(emptyForm);
      setInitialForm(emptyForm);
      return;
    }

    profileRequestRef.current?.abort();
    const controller = new AbortController();
    profileRequestRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCurrentUser({ token, signal: controller.signal });
      const user = response?.data ?? null;
      const nextForm = buildFormFromUser(user);
      if (!controller.signal.aborted) {
        setForm(nextForm);
        setInitialForm(nextForm);
      }
    } catch (loadError) {
      if (!isAbortError(loadError)) {
        setError(loadError?.message ?? 'Unable to load profile details.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [token, canManageProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => () => {
    profileRequestRef.current?.abort();
    submitRequestRef.current?.abort();
  }, []);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value ?? '' }));
  }, []);

  const updateAddress = useCallback((field, value) => {
    setForm((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value ?? ''
      }
    }));
  }, []);

  const updateSocialLink = useCallback((index, link) => {
    setForm((prev) => {
      const nextLinks = [...(prev.socialLinks ?? [])];
      nextLinks[index] = link;
      return { ...prev, socialLinks: nextLinks };
    });
  }, []);

  const addSocialLink = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      socialLinks: [...(prev.socialLinks ?? []), { label: '', url: '', handle: '' }]
    }));
  }, []);

  const removeSocialLink = useCallback((index) => {
    setForm((prev) => {
      const nextLinks = [...(prev.socialLinks ?? [])];
      if (nextLinks.length <= 1) {
        nextLinks[0] = { label: '', url: '', handle: '' };
      } else {
        nextLinks.splice(index, 1);
      }
      return { ...prev, socialLinks: nextLinks };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!token || saving || !canSubmit || !canManageProfile) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    submitRequestRef.current?.abort();
    const controller = new AbortController();
    submitRequestRef.current = controller;
    try {
      const payload = {
        firstName: form.firstName || null,
        lastName: form.lastName || null,
        profile: {
          displayName: form.displayName || null,
          tagline: form.tagline || null,
          location: form.location || null,
          bio: form.bio || null,
          avatarUrl: form.avatarUrl || null,
          bannerUrl: form.bannerUrl || null,
          socialLinks: (form.socialLinks ?? [])
            .map((link) => sanitiseSocialLink(link))
            .filter(Boolean),
          metadata: { updatedFrom: 'learner-dashboard' }
        },
        address: {
          line1: form.address.line1 || null,
          line2: form.address.line2 || null,
          city: form.address.city || null,
          region: form.address.region || null,
          postalCode: form.address.postalCode || null,
          country: form.address.country || null
        }
      };

      const response = await updateCurrentUser({ token, payload, signal: controller.signal });
      const updatedUser = response?.data ?? null;
      if (!controller.signal.aborted) {
        if (updatedUser) {
          setInitialForm(buildFormFromUser(updatedUser));
          setForm(buildFormFromUser(updatedUser));
          if (session) {
            setSession({ ...session, user: updatedUser });
          }
        }
        setSuccess(response?.message ?? 'Profile updated successfully.');
        if (typeof onProfileUpdated === 'function') {
          onProfileUpdated();
        }
      }
    } catch (submitError) {
      if (!isAbortError(submitError)) {
        setError(submitError?.message ?? 'Unable to save profile changes.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setSaving(false);
      }
    }
  }, [token, canManageProfile, form, saving, canSubmit, session, setSession, onProfileUpdated]);

  if (!token) {
    return null;
  }

  if (!canManageProfile) {
    return (
      <div className="dashboard-section text-sm text-slate-500">
        Your organisation has granted you view-only access. Contact an administrator to update your learner profile.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-section animate-pulse text-sm text-slate-500">
        Loading your profile details…
      </div>
    );
  }

  return (
    <ProfileIdentityEditor
      form={form}
      onFieldChange={updateField}
      onAddressChange={updateAddress}
      onSocialLinkChange={updateSocialLink}
      onAddSocialLink={addSocialLink}
      onRemoveSocialLink={removeSocialLink}
      onSubmit={handleSubmit}
      isSaving={saving}
      canSubmit={canSubmit}
      error={error}
      success={success}
    />
  );
}

LearnerProfileEditor.propTypes = {
  onProfileUpdated: PropTypes.func
};

LearnerProfileEditor.defaultProps = {
  onProfileUpdated: undefined
};
