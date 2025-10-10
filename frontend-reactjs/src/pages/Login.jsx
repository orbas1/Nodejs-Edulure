import { Link } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';

export default function Login() {
  return (
    <AuthCard
      title="Welcome back to Edulure"
      subtitle="Securely access your learning operating system with MFA across email or Google Authenticator."
    >
      <form className="space-y-6">
        <FormField label="Email address" type="email" name="email" placeholder="you@company.com" />
        <FormField label="Password" type="password" name="password" placeholder="••••••••" />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="2FA Email Code" name="emailCode" placeholder="Enter 6-digit code" />
          <FormField label="Google Authenticator" name="googleCode" placeholder="Enter 6-digit code" />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
        >
          Log in securely
        </button>
        <div className="flex flex-wrap justify-between gap-4 text-sm text-slate-500">
          <Link to="/reset" className="font-semibold text-primary">
            Forgot password?
          </Link>
          <p>
            New to Edulure?{' '}
            <Link to="/register" className="font-semibold text-primary">
              Create your account
            </Link>
          </p>
        </div>
      </form>
    </AuthCard>
  );
}
