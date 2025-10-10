import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';

export default function InstructorRegister() {
  return (
    <AuthCard
      title="Become an Edulure instructor"
      subtitle="Join the roster of expert educators shaping the next generation of communities and courses."
    >
      <form className="space-y-6">
        <FormField label="Full name" name="name" placeholder="Jordan Rivers" />
        <FormField label="Professional headline" name="headline" placeholder="Growth Strategist & Operator" />
        <FormField label="Portfolio or website" name="portfolio" placeholder="https://yourportfolio.com" />
        <FormField label="Areas of expertise" name="expertise" placeholder="Community Design, Funnel Strategy" />
        <FormField label="Audience size" name="audience" placeholder="Email list, social reach, membership numbers" />
        <FormField label="Upload introduction video" name="video">
          <input
            type="file"
            name="video"
            accept="video/*"
            className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500"
          />
        </FormField>
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
        >
          Submit instructor application
        </button>
      </form>
    </AuthCard>
  );
}
