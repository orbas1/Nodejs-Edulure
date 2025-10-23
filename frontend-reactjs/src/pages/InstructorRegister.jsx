import { useMemo, useState } from 'react';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';
import AuthForm from '../components/auth/AuthForm.jsx';
import usePageMetadata from '../hooks/usePageMetadata.js';
import { validateInstructorApplication } from '../utils/validation/auth.js';

export default function InstructorRegister() {
  const [formStatus, setFormStatus] = useState({ message: null, tone: 'info' });

  usePageMetadata({
    title: 'Instructor onboarding · Edulure',
    description:
      'Apply to become an Edulure instructor and unlock course publishing, community leadership, and revenue-sharing programmes.',
    canonicalPath: '/instructor/register',
    robots: 'noindex, nofollow',
    keywords: ['instructor onboarding', 'apply to teach', 'edulure instructor'],
    analytics: {
      page_type: 'instructor_register'
    }
  });

  const fields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Full name',
        placeholder: 'Jordan Rivers',
        required: true
      },
      {
        name: 'headline',
        label: 'Professional headline',
        placeholder: 'Growth Strategist & Operator',
        required: true
      },
      {
        name: 'portfolio',
        label: 'Portfolio or website',
        placeholder: 'https://yourportfolio.com',
        required: true
      },
      {
        name: 'expertise',
        label: 'Areas of expertise',
        placeholder: 'Community Design, Funnel Strategy',
        required: true
      },
      {
        name: 'audience',
        label: 'Audience size',
        placeholder: 'Email list, social reach, membership numbers',
        required: false
      },
      {
        name: 'focusTopics',
        label: 'Focus topics',
        placeholder: 'Comma-separated topics you teach most often',
        required: false,
        helper: 'Helps us match you with learners searching for niche expertise.'
      },
      {
        name: 'introVideo',
        label: 'Upload introduction video',
        required: false,
        render: ({ value, error, onChange }) => (
          <FormField label="Upload introduction video" name="introVideo" required={false} error={error}>
            <input
              type="file"
              name="introVideo"
              accept="video/*"
              className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500"
              onChange={(event) => onChange(event.target.files?.[0] ?? value ?? null)}
            />
          </FormField>
        )
      }
    ],
    []
  );

  const handleSubmit = async () => {
    setFormStatus({
      message: 'Application submitted. Our team will review it within two business days and email next steps.',
      tone: 'success'
    });
    return { status: 'handled' };
  };

  return (
    <AuthCard
      title="Become an Edulure instructor"
      subtitle="Join the roster of expert educators shaping the next generation of communities and courses."
    >
      <AuthForm
        fields={fields}
        initialValues={{}}
        validator={validateInstructorApplication}
        onSubmit={handleSubmit}
        submitLabel="Submit instructor application"
        busyLabel="Submitting…"
        status={formStatus.message}
        statusTone={formStatus.tone}
        showProgress
        progressLabel="Application completeness"
      />
    </AuthCard>
  );
}
