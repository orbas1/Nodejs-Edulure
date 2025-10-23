import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import SocialSignOn from '../components/SocialSignOn.jsx';
import AuthForm from '../components/auth/AuthForm.jsx';
import { API_BASE_URL, httpClient } from '../api/httpClient.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  defaultPasswordPolicy,
  evaluatePassword,
  summarisePasswordRequirements,
  validateRegistration
} from '../utils/validation/auth.js';

const SOCIAL_ROUTES = {
  google: '/auth/oauth/google',
  apple: '/auth/oauth/apple',
  facebook: '/auth/oauth/facebook',
  linkedin: '/auth/oauth/linkedin'
};

const ROLE_OPTIONS = [
  { value: 'instructor', label: 'Instructor' },
  { value: 'user', label: 'Learner' }
];

const DEFAULT_ROLE = ROLE_OPTIONS[0]?.value ?? 'instructor';
const ENFORCED_TWO_FACTOR_ROLES = new Set();
const ADMIN_REQUEST_NOTE =
  "Need administrator access? Contact your organisation's Edulure operations representative to provision it securely.";

const PERSONA_MESSAGING = {
  instructor: {
    id: 'persona-instructor',
    title: 'Instructors go live faster',
    description:
      'Course templates, subscription bundles, and pre-built automation launch alongside your new Learnspace so you can start monetising immediately.'
  },
  user: {
    id: 'persona-learner',
    title: 'Learners join curated communities',
    description:
      'We pre-load recommended courses, tutors, and community invites based on your interests so the first login already feels personal.'
  }
};

const SOCIAL_PROOF = [
  {
    quote: '“Our instructors converted at 42% higher after this streamlined signup.”',
    attribution: 'Maya · Community Operations Lead'
  },
  {
    quote: '“Learners land on dashboards that already know their goals—retention is up double digits.”',
    attribution: 'Jordan · Growth Strategist'
  }
];

const DEFAULT_FORM_VALUES = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: DEFAULT_ROLE,
  age: '',
  address: {
    streetAddress: '',
    addressLine2: '',
    town: '',
    city: '',
    country: '',
    postcode: ''
  },
  interestTags: '',
  communityInvites: ''
};

function normaliseListFromInput(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function buildDraftPayload(values, persona, agreeToTerms) {
  if (!values) return null;
  const interestTags = normaliseListFromInput(values.interestTags);
  const communityInvites = normaliseListFromInput(values.communityInvites);
  const completed = [];
  if (values.firstName && values.email) completed.push('profile');
  if (interestTags.length) completed.push('interests');
  if (communityInvites.length) completed.push('community-invites');
  if (agreeToTerms) completed.push('terms-accepted');

  if (!completed.length && !values.role && !persona?.id) {
    return null;
  }

  return {
    persona: persona?.id ?? persona?.title ?? values.role ?? null,
    roleIntent: values.role ?? null,
    interestTags,
    communityInvites,
    progress: {
      step: 'registration',
      completed
    }
  };
}

export default function Register() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(ENFORCED_TWO_FACTOR_ROLES.has(DEFAULT_ROLE));
  const [twoFactorLocked, setTwoFactorLocked] = useState(ENFORCED_TWO_FACTOR_ROLES.has(DEFAULT_ROLE));
  const [twoFactorEnrollment, setTwoFactorEnrollment] = useState(null);
  const [passwordPolicy, setPasswordPolicy] = useState(defaultPasswordPolicy);
  const [passwordEvaluation, setPasswordEvaluation] = useState(evaluatePassword('', defaultPasswordPolicy));
  const [formStatus, setFormStatus] = useState({ message: null, tone: 'info' });
  const [personaHighlight, setPersonaHighlight] = useState(PERSONA_MESSAGING[DEFAULT_ROLE]);
  const [initialValues, setInitialValues] = useState(DEFAULT_FORM_VALUES);
  const formValuesRef = useRef(DEFAULT_FORM_VALUES);
  const [valuesVersion, setValuesVersion] = useState(0);
  const draftFingerprintRef = useRef(null);

  usePageMetadata({
    title: 'Create your Edulure account',
    description:
      'Register to access Edulure courses, communities, live classrooms, and analytics dashboards with built-in security controls.',
    canonicalPath: '/register',
    robots: 'noindex, nofollow',
    analytics: {
      page_type: 'register',
      enforced_two_factor_roles: ENFORCED_TWO_FACTOR_ROLES.size
    }
  });

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

  useEffect(() => {
    let isMounted = true;
    httpClient
      .get('/auth/password-policy')
      .then((response) => {
        const policy = response?.data?.policy ?? defaultPasswordPolicy;
        if (!isMounted) return;
        setPasswordPolicy({ ...defaultPasswordPolicy, ...policy });
        setPasswordEvaluation(evaluatePassword(formValuesRef.current.password ?? '', { ...defaultPasswordPolicy, ...policy }));
      })
      .catch(() => {
        setPasswordPolicy(defaultPasswordPolicy);
        setPasswordEvaluation(evaluatePassword(formValuesRef.current.password ?? '', defaultPasswordPolicy));
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }
    let cancelled = false;
    httpClient
      .get('/dashboard/learner/onboarding/draft')
      .then((response) => {
        if (cancelled) return;
        const draft = response?.data ?? {};
        const loadedValues = {
          ...DEFAULT_FORM_VALUES,
          role: draft.roleIntent ?? DEFAULT_ROLE,
          interestTags: draft.interestTags?.join(', ') ?? '',
          communityInvites: draft.communityInvites?.join(', ') ?? ''
        };
        formValuesRef.current = loadedValues;
        setInitialValues(loadedValues);
        setPersonaHighlight(PERSONA_MESSAGING[loadedValues.role] ?? PERSONA_MESSAGING[DEFAULT_ROLE]);
        const enforced = ENFORCED_TWO_FACTOR_ROLES.has(loadedValues.role);
        setTwoFactorLocked(enforced);
        setTwoFactorEnabled((prev) => (enforced ? true : prev));
        setValuesVersion((version) => version + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleValuesChange = useCallback(
    (nextValues, meta) => {
      formValuesRef.current = nextValues;
      setValuesVersion((version) => version + 1);
      if (meta.field === 'password') {
        setPasswordEvaluation(evaluatePassword(meta.value ?? '', passwordPolicy));
      }
      if (meta.field === 'role') {
        const enforced = ENFORCED_TWO_FACTOR_ROLES.has(meta.value);
        setTwoFactorLocked(enforced);
        setTwoFactorEnabled((prev) => (enforced ? true : prev));
        setTwoFactorEnrollment(null);
        setPersonaHighlight(PERSONA_MESSAGING[meta.value] ?? PERSONA_MESSAGING[DEFAULT_ROLE]);
      }
    },
    [passwordPolicy]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }
    const payload = buildDraftPayload(formValuesRef.current, personaHighlight, agreeToTerms);
    if (!payload) {
      return undefined;
    }
    const fingerprint = JSON.stringify(payload);
    if (fingerprint === draftFingerprintRef.current) {
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        await httpClient.put('/dashboard/learner/onboarding/bootstrap', payload);
        draftFingerprintRef.current = fingerprint;
      } catch (error) {
        console.warn('Failed to save onboarding draft', error);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [valuesVersion, isAuthenticated, personaHighlight, agreeToTerms]);

  const passwordRequirements = useMemo(() => summarisePasswordRequirements(passwordPolicy), [passwordPolicy]);

  const fields = useMemo(
    () => [
      {
        name: 'firstName',
        label: 'First name',
        placeholder: 'Alex',
        autoComplete: 'given-name',
        required: true
      },
      {
        name: 'lastName',
        label: 'Last name',
        placeholder: 'Morgan',
        autoComplete: 'family-name',
        required: true
      },
      {
        name: 'email',
        label: 'Email address',
        type: 'email',
        placeholder: 'you@company.com',
        autoComplete: 'email',
        required: true
      },
      {
        name: 'role',
        label: 'Role',
        component: 'select',
        options: ROLE_OPTIONS,
        helper: ADMIN_REQUEST_NOTE
      },
      {
        name: 'age',
        label: 'Age',
        type: 'number',
        placeholder: 'Optional',
        min: '16',
        required: false
      },
      {
        name: 'address.streetAddress',
        label: 'Street address',
        placeholder: '123 Example Street',
        required: false
      },
      {
        name: 'address.addressLine2',
        label: 'Address line 2',
        placeholder: 'Apartment, suite, etc.',
        required: false
      },
      {
        name: 'address.town',
        label: 'Town',
        placeholder: 'Town',
        required: false
      },
      {
        name: 'address.city',
        label: 'City',
        placeholder: 'City',
        required: false
      },
      {
        name: 'address.country',
        label: 'Country',
        placeholder: 'Country',
        required: false
      },
      {
        name: 'address.postcode',
        label: 'Postcode',
        placeholder: 'Postal code',
        required: false
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'Create a secure password',
        helper: `Use at least ${passwordPolicy.minLength} characters with upper, lower, number, and symbol.`,
        required: true
      },
      {
        name: 'confirmPassword',
        label: 'Confirm password',
        type: 'password',
        placeholder: 'Re-enter your password',
        required: true
      },
      {
        name: 'interestTags',
        label: 'Interest tags',
        placeholder: 'Marketing Ops, Community Growth',
        required: false,
        helper: 'Comma-separated interests so onboarding can tailor recommendations.'
      },
      {
        name: 'communityInvites',
        label: 'Community invite codes',
        placeholder: 'Optional invite codes, separated by commas',
        required: false,
        helper: 'Paste invite codes to auto-join relevant communities after signup.'
      }
    ],
    [passwordPolicy]
  );

  const handleSubmit = useCallback(
    async (values) => {
      formValuesRef.current = values;
      setFormStatus({ message: null, tone: 'info' });
      setTwoFactorEnrollment(null);

      if (!agreeToTerms) {
        return { formError: 'You must accept the terms to create an account.' };
      }

      const ageValue = values.age?.trim?.() ?? values.age ?? '';
      const age = ageValue ? Number.parseInt(ageValue, 10) : undefined;
      if (ageValue && Number.isNaN(age)) {
        return { formError: 'Age must be a number.' };
      }

      const normalizedAddress = Object.entries(values.address ?? {}).reduce((acc, [key, fieldValue]) => {
        if (typeof fieldValue !== 'string') {
          return acc;
        }
        const trimmed = fieldValue.trim();
        if (trimmed) {
          acc[key] = trimmed;
        }
        return acc;
      }, {});

      setIsSubmitting(true);
      try {
        const requestBody = {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
          role: values.role,
          ...(age ? { age } : {}),
          ...(Object.keys(normalizedAddress).length ? { address: normalizedAddress } : {}),
          twoFactor: { enabled: twoFactorLocked ? true : twoFactorEnabled }
        };
        const response = await httpClient.post('/auth/register', requestBody);
        const result = response?.data ?? {};
        setTwoFactorEnrollment(result.twoFactor ?? null);
        if (result.twoFactor?.enabled) {
          setTwoFactorEnabled(true);
          setTwoFactorLocked(Boolean(result.twoFactor.enforced));
        }
        const verificationStatus = result.verification?.status ?? null;
        const baseMessage =
          verificationStatus === 'pending'
            ? 'Account created. Check your inbox to verify your email before signing in.'
            : 'Account created successfully.';
        const securityMessage = result.twoFactor?.enabled
          ? ' Email one-time codes are now active and will be sent whenever you sign in.'
          : '';
        setFormStatus({ message: `${baseMessage}${securityMessage}`.trim(), tone: 'success' });
        setTimeout(() => navigate('/login'), 1600);
        return { status: 'handled' };
      } catch (err) {
        const message = err?.original?.response?.data?.message ?? err?.message ?? 'Unable to create your account right now.';
        return { formError: message };
      } finally {
        setIsSubmitting(false);
      }
    },
    [agreeToTerms, twoFactorEnabled, twoFactorLocked, navigate]
  );

  return (
    <AuthCard
      title="Create your Edulure Learnspace"
      subtitle="Tell us about yourself so we can tailor onboarding for your communities, instructors, and learners."
    >
      <div className="space-y-8">
        <AuthForm
          fields={fields}
          initialValues={initialValues}
          validator={(values) => validateRegistration(values, passwordPolicy)}
          onSubmit={handleSubmit}
          onValuesChange={handleValuesChange}
          submitLabel="Launch Learnspace"
          busyLabel="Creating account…"
          isSubmitting={isSubmitting}
          status={formStatus.message}
          statusTone={formStatus.tone}
          showProgress
          progressLabel="Registration completeness"
          beforeFields={
            <div className="rounded-3xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-slate-600 shadow-inner">
              <p className="text-sm font-semibold text-primary">{personaHighlight.title}</p>
              <p className="mt-1 text-xs text-slate-500">{personaHighlight.description}</p>
            </div>
          }
          renderFields={({ Field }) => (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field name="firstName" />
                <Field name="lastName" />
              </div>
              <Field name="email" />
              <Field name="role" />
              <Field name="age" />
              <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-5 shadow-inner">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Address (optional)</p>
                  <p className="text-xs text-slate-500">Provide as much detail as possible to help us tailor regional onboarding.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field name="address.streetAddress" />
                  <Field name="address.addressLine2" />
                  <Field name="address.town" />
                  <Field name="address.city" />
                  <Field name="address.country" />
                  <Field name="address.postcode" />
                </div>
              </div>
              <Field name="password" />
              <Field name="confirmPassword" />
              <Field name="interestTags" />
              <Field name="communityInvites" />
            </div>
          )}
          afterFields={
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-5 shadow-inner">
                <p className="text-sm font-semibold text-slate-700">Password requirements</p>
                <ul className="mt-3 space-y-2 text-xs">
                  {passwordRequirements.map((requirement) => {
                    const requirementMet = (() => {
                      switch (requirement) {
                        case `At least ${passwordPolicy.minLength} characters`:
                          return passwordEvaluation.lengthOk;
                        case 'One uppercase letter':
                          return passwordEvaluation.upperOk;
                        case 'One lowercase letter':
                          return passwordEvaluation.lowerOk;
                        case 'One digit':
                          return passwordEvaluation.numberOk;
                        case 'One special character':
                          return passwordEvaluation.symbolOk;
                        default:
                          return false;
                      }
                    })();
                    return (
                      <li
                        key={requirement}
                        className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${
                          requirementMet
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        <span>{requirement}</span>
                        <span className="text-sm font-semibold">{requirementMet ? '✔' : '•'}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-5 shadow-inner">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700">Multi-factor authentication</p>
                    <p className="text-xs text-slate-500">
                      Secure your account with email-delivered one-time passcodes.
                      {twoFactorLocked
                        ? ' This role requires multi-factor authentication on every sign in.'
                        : ' Opt in now to receive sign-in codes by email whenever you log in.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={twoFactorLocked ? true : twoFactorEnabled}
                      aria-disabled={twoFactorLocked}
                      onClick={() => {
                        if (twoFactorLocked) return;
                        setTwoFactorEnabled((prev) => !prev);
                      }}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60 ${
                        (twoFactorLocked ? true : twoFactorEnabled) ? 'bg-primary' : 'bg-slate-300'
                      } ${twoFactorLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition ${
                          (twoFactorLocked ? true : twoFactorEnabled) ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-semibold text-slate-600">
                      {twoFactorLocked ? 'Required' : twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                {!twoFactorLocked && !twoFactorEnabled ? (
                  <p className="text-xs text-slate-400">
                    Turn this on to have email one-time codes enabled right after registration.
                  </p>
                ) : null}
              </div>
              {twoFactorEnrollment?.enabled ? (
                <div className="space-y-4 rounded-3xl border border-primary/30 bg-white/90 px-6 py-6 shadow-card ring-1 ring-primary/10">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-primary">Email codes are ready</p>
                    <p className="text-xs text-slate-500">
                      We will send a six-digit security code to {formValuesRef.current.email || 'your email'} on every sign in.
                      Check your inbox (and spam folder) when prompted.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
                  >
                    Proceed to secure login
                  </button>
                </div>
              ) : null}
              <label className="flex items-start gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={agreeToTerms}
                  onChange={(event) => setAgreeToTerms(event.target.checked)}
                />
                <span>
                  I agree to the Edulure{' '}
                  <a href="/terms" className="font-semibold text-primary" target="_blank" rel="noreferrer">
                    terms of use
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="font-semibold text-primary" target="_blank" rel="noreferrer">
                    privacy policy
                  </a>
                  .
                </span>
              </label>
            </div>
          }
        />
        <div className="space-y-6">
          <div className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/90 px-5 py-5 shadow-inner">
            <p className="text-sm font-semibold text-slate-700">Why new Edulure accounts convert</p>
            <ul className="space-y-3 text-xs text-slate-500">
              {SOCIAL_PROOF.map((item) => (
                <li key={item.quote} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                  <p className="italic">{item.quote}</p>
                  <p className="mt-2 font-semibold text-slate-600">{item.attribution}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="relative flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                or try an alternative login
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <SocialSignOn onSelect={handleSocialSignOn} />
          </div>
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthCard>
  );
}
