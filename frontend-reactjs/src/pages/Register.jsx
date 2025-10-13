import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import { API_BASE_URL, httpClient } from '../api/httpClient.js';
import { useAuth } from '../context/AuthContext.jsx';

const EXPERIENCE_OPTIONS = [
  { value: 'emerging', label: 'Emerging instructor (0-2 years)' },
  { value: 'established', label: 'Established instructor (3-7 years)' },
  { value: 'veteran', label: 'Veteran instructor (8+ years)' }
];

const SOCIAL_ROUTES = {
  google: '/auth/oauth/google',
  apple: '/auth/oauth/apple',
  facebook: '/auth/oauth/facebook',
  linkedin: '/auth/oauth/linkedin'
};

const FOCUS_AREA_OPTIONS = [
  'Revenue operations',
  'Community-led growth',
  'Technology skills',
  'Creative entrepreneurship',
  'Leadership development',
  'Career acceleration',
  'Certification prep',
  'Academic tutoring'
];

export default function Register() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'instructor',
    phone: '',
    backupPhone: '',
    recoveryEmail: '',
    organization: '',
    jobTitle: '',
    website: '',
    linkedin: '',
    twitter: '',
    country: '',
    timezone: '',
    address: '',
    city: '',
    stateRegion: '',
    postalCode: '',
    languages: '',
    teachingModalities: '',
    bio: '',
    qualifications: '',
    experienceLevel: EXPERIENCE_OPTIONS[1].value,
    idType: 'passport',
    idNumber: '',
    idExpiry: '',
    documentIssuingCountry: '',
    idFront: null,
    idBack: null,
    idSelfie: null,
    proofOfAddress: null,
    preferredContact: 'email',
    preferredLoginNotification: 'email',
    trustStatement: '',
    googleWorkspaceDomain: ''
  });
  const [intent, setIntent] = useState('courses');
  const [focusAreas, setFocusAreas] = useState(['Community-led growth']);
  const [twoFactorMethod, setTwoFactorMethod] = useState('google-authenticator');
  const [agreements, setAgreements] = useState({ marketing: true, updates: true, terms: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const oauthBase = useMemo(() => {
    if (!API_BASE_URL) return '';
    return API_BASE_URL.replace(/\/$/, '').replace(/\/?api$/, '');
  }, []);

  const handleSocialSignOn = useCallback(
    (provider) => {
      const route = SOCIAL_ROUTES[provider];
      if (!route) return;
      const destination = `${oauthBase}${route}`;
      if (typeof window !== 'undefined') {
        window.location.assign(destination);
      }
    },
    [oauthBase]
  );

  const experienceLabel = useMemo(
    () => EXPERIENCE_OPTIONS.find((option) => option.value === formState.experienceLevel)?.label ?? '',
    [formState.experienceLevel]
  );

  const toggleFocusArea = (area) => {
    setFocusAreas((prev) => {
      if (prev.includes(area)) {
        return prev.filter((item) => item !== area);
      }
      return [...prev, area];
    });
  };

  const handleChange = (event) => {
    const { name, value, type, files } = event.target;
    if (!name) return;
    const nextValue = type === 'file' ? (files && files.length > 1 ? Array.from(files) : files?.[0] ?? null) : value;
    setFormState((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (formState.password !== formState.confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    if (!agreements.terms) {
      setError('You must accept the terms to create an account.');
      setIsSubmitting(false);
      return;
    }

    try {
      const addressSegments = [formState.address, formState.city, formState.stateRegion, formState.postalCode]
        .map((segment) => segment?.trim())
        .filter(Boolean);
      const payload = {
        firstName: formState.firstName,
        lastName: formState.lastName,
        email: formState.email,
        password: formState.password,
        role: formState.role,
        address: addressSegments.join(', '),
        phone: formState.phone,
        organization: formState.organization,
        jobTitle: formState.jobTitle,
        intent,
        security: {
          twoFactorMethod,
          recoveryEmail: formState.recoveryEmail,
          backupPhone: formState.backupPhone,
          preferredLoginNotification: formState.preferredLoginNotification
        },
        profile: {
          website: formState.website,
          linkedin: formState.linkedin,
          twitter: formState.twitter,
          bio: formState.bio,
          qualifications: formState.qualifications,
          experienceLevel: formState.experienceLevel,
          languages: formState.languages
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          teachingModalities: formState.teachingModalities
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          focusAreas,
          country: formState.country,
          timezone: formState.timezone,
          trustStatement: formState.trustStatement,
          googleWorkspaceDomain: formState.googleWorkspaceDomain
        },
        compliance: {
          idType: formState.idType,
          idNumber: formState.idNumber,
          idExpiry: formState.idExpiry,
          issuingCountry: formState.documentIssuingCountry,
          preferredContact: formState.preferredContact,
          marketingOptIn: agreements.marketing,
          productUpdatesOptIn: agreements.updates,
          documents: {
            front:
              formState.idFront && typeof formState.idFront === 'object'
                ? { name: formState.idFront.name, type: formState.idFront.type }
                : null,
            back:
              formState.idBack && typeof formState.idBack === 'object'
                ? { name: formState.idBack.name, type: formState.idBack.type }
                : null,
            selfie:
              formState.idSelfie && typeof formState.idSelfie === 'object'
                ? { name: formState.idSelfie.name, type: formState.idSelfie.type }
                : null,
            proofOfAddress:
              formState.proofOfAddress && typeof formState.proofOfAddress === 'object'
                ? { name: formState.proofOfAddress.name, type: formState.proofOfAddress.type }
                : null
          }
        }
      };

      const response = await httpClient.post('/auth/register', payload);
      if (response?.data) {
        setSession(response.data);
        navigate('/content');
      }
    } catch (err) {
      setError(err.message ?? 'Unable to create workspace right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your Edulure workspace"
      subtitle="Tell us about your expertise so we can personalise onboarding, compliance, and growth playbooks."
    >
      <div className="space-y-8">
        <SocialSignOn onSelect={handleSocialSignOn} />
        <div className="relative flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">or continue with credentials</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-inner">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Founders & instructors</h2>
              <p className="mt-1 text-sm text-slate-500">We set up your workspace with the right permissions and compliance requirements.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="First name"
                name="firstName"
                placeholder="Alex"
                value={formState.firstName}
                onChange={handleChange}
                required
              />
              <FormField
                label="Last name"
                name="lastName"
                placeholder="Morgan"
                value={formState.lastName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Email address"
                type="email"
                name="email"
                placeholder="founder@brand.com"
                value={formState.email}
                onChange={handleChange}
                required
              />
              <FormField label="Role" name="role">
                <select
                  name="role"
                  value={formState.role}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="instructor">Instructor</option>
                  <option value="user">Learner</option>
                  <option value="admin">Administrator</option>
                </select>
              </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                label="Primary phone"
                name="phone"
                placeholder="+44 7700 900123"
                value={formState.phone}
                onChange={handleChange}
              />
              <FormField
                label="Backup phone"
                name="backupPhone"
                placeholder="Optional backup number"
                value={formState.backupPhone}
                onChange={handleChange}
              />
              <FormField
                label="Recovery email"
                type="email"
                name="recoveryEmail"
                placeholder="security@brand.com"
                value={formState.recoveryEmail}
                onChange={handleChange}
                helper="Used for account recovery & alerts."
              />
            </div>
          </section>

          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-inner">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Professional profile</h2>
              <p className="mt-1 text-sm text-slate-500">Showcase what you teach and how you support your community.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Organisation"
                name="organization"
                placeholder="Growth Operator"
                value={formState.organization}
                onChange={handleChange}
              />
              <FormField
                label="Job title"
                name="jobTitle"
                placeholder="Founder & Instructor"
                value={formState.jobTitle}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Website"
                name="website"
                placeholder="https://edulure.com"
                value={formState.website}
                onChange={handleChange}
              />
              <FormField
                label="LinkedIn"
                name="linkedin"
                placeholder="https://linkedin.com/in/you"
                value={formState.linkedin}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Twitter / X"
                name="twitter"
                placeholder="https://twitter.com/you"
                value={formState.twitter}
                onChange={handleChange}
              />
              <FormField
                label="Google Workspace domain"
                name="googleWorkspaceDomain"
                placeholder="yourcompany.com"
                value={formState.googleWorkspaceDomain}
                onChange={handleChange}
                helper="Required for enterprise SSO enablement."
              />
            </div>
            <FormField label="Experience level" name="experienceLevel">
              <select
                name="experienceLevel"
                value={formState.experienceLevel}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <p className="rounded-2xl bg-primary/5 px-4 py-3 text-xs text-primary">{experienceLabel}</p>
            <FormField label="Professional bio" name="bio">
              <textarea
                name="bio"
                value={formState.bio}
                onChange={handleChange}
                rows={4}
                placeholder="Summarise your expertise, unique methodology, and the transformations you drive."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
            <FormField label="Qualifications" name="qualifications">
              <textarea
                name="qualifications"
                value={formState.qualifications}
                onChange={handleChange}
                rows={3}
                placeholder="Degrees, certifications, awards, publications"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
            <div>
              <span className="text-sm font-semibold text-slate-600">Focus areas</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {FOCUS_AREA_OPTIONS.map((area) => {
                  const isSelected = focusAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleFocusArea(area)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary/60'
                      }`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Languages"
                name="languages"
                placeholder="English, Spanish"
                value={formState.languages}
                onChange={handleChange}
                helper="Comma-separated"
              />
              <FormField
                label="Teaching modalities"
                name="teachingModalities"
                placeholder="Live cohort, async course, 1:1 advisory"
                value={formState.teachingModalities}
                onChange={handleChange}
              />
            </div>
            <FormField label="Trust statement" name="trustStatement">
              <textarea
                name="trustStatement"
                value={formState.trustStatement}
                onChange={handleChange}
                rows={3}
                placeholder="Share the promise you make to every learner."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
          </section>

          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-inner">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Location & preferences</h2>
              <p className="mt-1 text-sm text-slate-500">Helps us calculate taxes, payment schedules, and best session times.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Country"
                name="country"
                placeholder="United Kingdom"
                value={formState.country}
                onChange={handleChange}
              />
              <FormField
                label="Timezone"
                name="timezone"
                placeholder="Europe/London"
                value={formState.timezone}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Address"
                name="address"
                placeholder="123 Learning Ave"
                value={formState.address}
                onChange={handleChange}
              />
              <FormField
                label="City"
                name="city"
                placeholder="London"
                value={formState.city}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Region / State"
                name="stateRegion"
                placeholder="Greater London"
                value={formState.stateRegion}
                onChange={handleChange}
              />
              <FormField
                label="Postal code"
                name="postalCode"
                placeholder="SW1A 1AA"
                value={formState.postalCode}
                onChange={handleChange}
              />
            </div>
            <FormField label="Preferred contact channel" name="preferredContact">
              <select
                name="preferredContact"
                value={formState.preferredContact}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone call</option>
              </select>
            </FormField>
          </section>

          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-inner">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Identity verification</h2>
              <p className="mt-1 text-sm text-slate-500">Upload official documentation to unlock payouts, high-trust features, and tutoring.</p>
            </div>
            <FormField label="Government ID type" name="idType">
              <select
                name="idType"
                value={formState.idType}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="passport">Passport</option>
                <option value="drivers-licence">Driver licence</option>
                <option value="national-id">National identity card</option>
                <option value="residence-permit">Residence permit</option>
              </select>
            </FormField>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                label="ID number"
                name="idNumber"
                placeholder="Passport or ID reference"
                value={formState.idNumber}
                onChange={handleChange}
                required
              />
              <FormField
                label="Expiry date"
                type="date"
                name="idExpiry"
                value={formState.idExpiry}
                onChange={handleChange}
                required
              />
              <FormField
                label="Issuing country"
                name="documentIssuingCountry"
                placeholder="United Kingdom"
                value={formState.documentIssuingCountry}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                label="ID front image"
                name="idFront"
                helper={
                  formState.idFront && typeof formState.idFront === 'object'
                    ? `Selected: ${formState.idFront.name}`
                    : 'Upload a clear colour photo (JPG/PNG up to 10MB)'
                }
              >
                <input
                  type="file"
                  name="idFront"
                  accept="image/*"
                  className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                  onChange={handleChange}
                  required
                />
              </FormField>
              <FormField
                label="ID back image"
                name="idBack"
                helper={
                  formState.idBack && typeof formState.idBack === 'object'
                    ? `Selected: ${formState.idBack.name}`
                    : 'Capture the reverse side with holograms visible'
                }
              >
                <input
                  type="file"
                  name="idBack"
                  accept="image/*"
                  className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                  onChange={handleChange}
                  required
                />
              </FormField>
              <FormField
                label="Selfie with ID"
                name="idSelfie"
                helper={
                  formState.idSelfie && typeof formState.idSelfie === 'object'
                    ? `Selected: ${formState.idSelfie.name}`
                    : 'Hold the ID next to your face in good lighting'
                }
              >
                <input
                  type="file"
                  name="idSelfie"
                  accept="image/*"
                  className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                  onChange={handleChange}
                  required
                />
              </FormField>
            </div>
            <FormField
              label="Proof of address"
              name="proofOfAddress"
              helper={
                formState.proofOfAddress && typeof formState.proofOfAddress === 'object'
                  ? `Selected: ${formState.proofOfAddress.name}`
                  : 'Recent utility bill or bank statement (PDF or image)'
              }
            >
              <input
                type="file"
                name="proofOfAddress"
                accept="application/pdf,image/*"
                className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                onChange={handleChange}
              />
            </FormField>
          </section>

          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-inner">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Security preferences</h2>
              <p className="mt-1 text-sm text-slate-500">We enforce MFA out of the box for every account.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600">
                <input
                  type="radio"
                  name="twoFactorMethod"
                  value="google-authenticator"
                  checked={twoFactorMethod === 'google-authenticator'}
                  onChange={(event) => setTwoFactorMethod(event.target.value)}
                />
                Google Authenticator
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600">
                <input
                  type="radio"
                  name="twoFactorMethod"
                  value="email"
                  checked={twoFactorMethod === 'email'}
                  onChange={(event) => setTwoFactorMethod(event.target.value)}
                />
                Email OTP
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600">
                <input
                  type="radio"
                  name="twoFactorMethod"
                  value="sms"
                  checked={twoFactorMethod === 'sms'}
                  onChange={(event) => setTwoFactorMethod(event.target.value)}
                />
                SMS fallback
              </label>
            </div>
            <FormField label="Login notifications" name="preferredLoginNotification">
              <select
                name="preferredLoginNotification"
                value={formState.preferredLoginNotification}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="email">Email every login</option>
                <option value="push">Push notification</option>
                <option value="weekly-digest">Weekly security digest</option>
              </select>
            </FormField>
            <p className="rounded-2xl bg-primary/5 px-4 py-3 text-xs text-primary">
              You&apos;ll get a QR code during your first login to pair Google Authenticator or 1Password.
            </p>
          </section>

          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-inner">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Learning goals</h2>
              <p className="mt-1 text-sm text-slate-500">We curate the experience around your current priorities.</p>
            </div>
            <FormField label="Primary intent" name="intent">
              <select
                name="intent"
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="courses">Courses</option>
                <option value="community">Community</option>
                <option value="video">Video Library</option>
                <option value="lessons">Live Lessons</option>
                <option value="coaching">Coaching</option>
              </select>
            </FormField>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-inner text-sm text-slate-600">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreements.marketing}
                onChange={(event) => setAgreements((prev) => ({ ...prev, marketing: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>
                Yes, I&apos;d like to receive curated marketing resources, case studies, and inspiration from Edulure.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreements.updates}
                onChange={(event) => setAgreements((prev) => ({ ...prev, updates: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>Keep me posted on new features, beta programmes, and community opportunities.</span>
            </label>
            <label className="flex items-start gap-3 font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={agreements.terms}
                onChange={(event) => setAgreements((prev) => ({ ...prev, terms: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>
                I agree to the{' '}
                <a href="/terms" className="text-primary">Terms &amp; Conditions</a> and{' '}
                <a href="/privacy" className="text-primary">Privacy Policy</a>.
              </span>
            </label>
          </section>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Create password"
                type="password"
                name="password"
                placeholder="Create a strong password"
                value={formState.password}
                onChange={handleChange}
                required
              />
              <FormField
                label="Confirm password"
                type="password"
                name="confirmPassword"
                placeholder="Repeat your password"
                value={formState.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
            >
              {isSubmitting ? 'Provisioning workspace…' : 'Launch my workspace'}
            </button>
            <p className="text-sm text-slate-500">
              Already onboard?{' '}
              <a href="/login" className="font-semibold text-primary">
                Log in
              </a>
            </p>
          </div>
        </form>
      </div>
    </AuthCard>
  );
}
