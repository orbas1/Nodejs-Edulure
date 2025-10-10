import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';

export default function Register() {
  return (
    <AuthCard
      title="Create your Edulure workspace"
      subtitle="Tell us about your team so we can personalize onboarding, communities, and growth playbooks."
    >
      <form className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Full name" name="name" placeholder="Alex Morgan" />
          <FormField label="Email address" type="email" name="email" placeholder="founder@brand.com" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Company" name="company" placeholder="Edulure" />
          <FormField label="Role" name="role" placeholder="Founder, Instructor, Ops..." />
        </div>
        <FormField label="Address" name="address" placeholder="123 Learning Ave, London" />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Age" type="number" name="age" placeholder="32" />
          <FormField label="Intent of use" name="intent">
            <select
              name="intent"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="courses">Courses</option>
              <option value="community">Community</option>
              <option value="video">Video Library</option>
              <option value="lessons">Live Lessons</option>
              <option value="coaching">Coaching</option>
            </select>
          </FormField>
        </div>
        <FormField label="Password" type="password" name="password" placeholder="Create a strong password" />
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
        >
          Launch my workspace
        </button>
        <p className="text-sm text-slate-500">
          Already onboard?{' '}
          <a href="/login" className="font-semibold text-primary">
            Log in
          </a>
        </p>
      </form>
    </AuthCard>
  );
}
