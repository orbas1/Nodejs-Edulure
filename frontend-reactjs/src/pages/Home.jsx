import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import StatsBar from '../components/StatsBar.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import Testimonials from '../components/Testimonials.jsx';

export default function Home() {
  return (
    <div>
      <PageHero
        title="Build, launch, and scale high-performing learning communities"
        description="Edulure powers the modern learning OS for operators who obsess over outcomes. Blend courses, community, live sessions, and analytics into one brandable experience."
        cta={
          <>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
            >
              Start Free Trial
            </Link>
            <Link
              to="/instructor"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
            >
              Become an Instructor
            </Link>
          </>
        }
      />
      <StatsBar />
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-slate-900">High-converting funnels, zero friction</h2>
            <p className="text-base leading-7 text-slate-600">
              Spin up multi-step onboarding experiences with integrated payments, upsells, and segmentation. Pair with growth
              experiments, A/B tests, and insights delivered directly to your team.
            </p>
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  •
                </span>
                Dynamic funnels for cohorts, memberships, and evergreen programs.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  •
                </span>
                Optimize conversions with behavioral triggers and calendar-based offers.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  •
                </span>
                Integrate with your CRM, analytics, and marketing stack instantly.
              </li>
            </ul>
            <div className="flex gap-4 text-sm font-semibold">
              <a href="#demo" className="text-primary hover:text-primary-dark">
                View conversion playbooks →
              </a>
              <a href="#enterprise" className="text-slate-600 hover:text-primary">
                Explore enterprise controls
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-10 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-accent/30 blur-2xl" />
            <div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white/70 shadow-2xl backdrop-blur">
              <img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
                alt="Conversion dashboard"
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      <FeatureGrid />
      <Testimonials />
      <section className="bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Launch your next flagship experience in days</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Edulure orchestrates everything from funnels to community moderation to analytics. Focus on strategy while we
              automate the workflows.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/feed"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
              >
                Explore the Live Feed
              </Link>
              <a
                href="/admin"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
              >
                View Admin Console
              </a>
            </div>
          </div>
          <div className="rounded-4xl border border-slate-200 bg-white p-10 shadow-card">
            <h3 className="text-xl font-semibold text-slate-900">Enterprise-grade reliability</h3>
            <ul className="mt-6 space-y-4 text-sm text-slate-600">
              <li>SSO + SAML 2.0, SOC 2 Type II readiness</li>
              <li>Fine-grained permissions across instructors, moderators, and admins</li>
              <li>Global CDN, 99.9% uptime, disaster recovery playbooks</li>
            </ul>
            <p className="mt-8 text-sm font-semibold text-slate-500">We onboard your team in under 48 hours.</p>
          </div>
        </div>
      </section>
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold text-slate-900">Ready to power your learning ecosystem?</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Join Edulure and access the infrastructure trusted by premium education operators worldwide.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
            >
              Claim your workspace
            </Link>
            <a
              href="mailto:hello@edulure.com"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
