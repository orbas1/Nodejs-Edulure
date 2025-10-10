import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [formState, setFormState] = useState({ email: '', password: '', emailCode: '', googleCode: '' });
  const [error, setError] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ email: formState.email, password: formState.password });
      navigate('/content');
    } catch (err) {
      setError(err.message ?? 'Unable to sign in. Please try again.');
    }
  };

  return (
    <AuthCard
      title="Welcome back to Edulure"
      subtitle="Securely access your learning operating system with MFA across email or Google Authenticator."
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <FormField
          label="Email address"
          type="email"
          name="email"
          value={formState.email}
          onChange={handleChange}
          placeholder="you@company.com"
          required
        />
        <FormField
          label="Password"
          type="password"
          name="password"
          value={formState.password}
          onChange={handleChange}
          placeholder="••••••••"
          required
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="2FA Email Code"
            name="emailCode"
            placeholder="Enter 6-digit code"
            value={formState.emailCode}
            onChange={handleChange}
          />
          <FormField
            label="Google Authenticator"
            name="googleCode"
            placeholder="Enter 6-digit code"
            value={formState.googleCode}
            onChange={handleChange}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
        >
          {isLoading ? 'Authenticating…' : 'Log in securely'}
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
