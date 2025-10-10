import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard.jsx';
import FormField from '../components/FormField.jsx';
import { httpClient } from '../api/httpClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    age: '',
    role: 'instructor',
    password: ''
  });
  const [intent, setIntent] = useState('courses');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        firstName: formState.firstName,
        lastName: formState.lastName,
        email: formState.email,
        password: formState.password,
        role: formState.role,
        age: formState.age ? Number(formState.age) : undefined,
        address: formState.address
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
      subtitle="Tell us about your team so we can personalize onboarding, communities, and growth playbooks."
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
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
        <FormField
          label="Address"
          name="address"
          placeholder="123 Learning Ave, London"
          value={formState.address}
          onChange={handleChange}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Age"
            type="number"
            name="age"
            placeholder="32"
            value={formState.age}
            onChange={handleChange}
          />
          <FormField label="Intent of use" name="intent">
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
        </div>
        <FormField
          label="Password"
          type="password"
          name="password"
          placeholder="Create a strong password"
          value={formState.password}
          onChange={handleChange}
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
        >
          {isSubmitting ? 'Provisioning workspace…' : 'Launch my workspace'}
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
