import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import ProfileIdentityEditor from '../../../../components/profile/ProfileIdentityEditor.jsx';
import { fetchCurrentUser, updateCurrentUser } from '../../../../api/userApi.js';
import { useAuth } from '../../../../context/AuthContext.jsx';

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

export default function LearnerProfileEditor({ onProfileUpdated }) {
  const { session, setSession } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canSubmit = useMemo(() => hasChanged(initialForm, form) && !saving, [initialForm, form, saving]);

  const loadProfile = useCallback(async () => {
    if (!token) {
      setForm(emptyForm);
      setInitialForm(emptyForm);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchCurrentUser({ token });
      const user = response?.data ?? null;
      const nextForm = buildFormFromUser(user);
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (loadError) {
      setError(loadError?.message ?? 'Unable to load profile details.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
    if (!token || saving || !canSubmit) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
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
            .filter((link) => link && typeof link.url === 'string' && link.url.trim().length > 0)
            .map((link) => ({
              label: link.label?.trim() || null,
              url: link.url.trim(),
              handle: link.handle?.trim() || null
            })),
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

      const response = await updateCurrentUser({ token, payload });
      const updatedUser = response?.data ?? null;
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
    } catch (submitError) {
      setError(submitError?.message ?? 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  }, [token, form, saving, canSubmit, session, setSession, onProfileUpdated]);

  if (!token) {
    return null;
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
