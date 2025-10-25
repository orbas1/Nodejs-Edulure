import { Link } from 'react-router-dom';

import HomeSection from './HomeSection.jsx';
import edulureLogo from '../../assets/brand/edulure-logo.svg';

const QUICK_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/courses', label: 'Courses' },
  { to: '/live-classrooms', label: 'Live classrooms' },
  { to: '/blog', label: 'Blog' }
];

const RESOURCE_LINKS = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/legal/contact', label: 'Contact' },
  { to: '/handbook/navigation-annex', label: 'Product handbook' }
];

export default function LandingFooter() {
  return (
    <footer className="bg-slate-900 text-slate-200">
      <HomeSection
        as="div"
        size="wide"
        pad="relaxed"
        className="grid gap-12 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]"
      >
        <div className="space-y-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={edulureLogo} alt="Edulure" className="h-9 w-auto" />
          </Link>
          <p className="max-w-sm text-sm text-slate-400">
            Edulure gives learning businesses a single operating system for communities, curriculum, and revenue. Build once and
            keep every cohort engaged from day one.
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Explore</h2>
          <nav className="grid gap-2 text-sm text-slate-300" aria-label="Quick links">
            {QUICK_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Resources</h2>
          <nav className="grid gap-2 text-sm text-slate-300" aria-label="Resources">
            {RESOURCE_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </HomeSection>
      <div className="border-t border-slate-800">
        <HomeSection as="div" size="wide" pad="tight" className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Edulure. Built for modern learning businesses.</p>
          <p>
            Need support? <a href="mailto:support@edulure.com" className="font-semibold text-primary hover:text-primary/80">support@edulure.com</a>
          </p>
        </HomeSection>
      </div>
    </footer>
  );
}
