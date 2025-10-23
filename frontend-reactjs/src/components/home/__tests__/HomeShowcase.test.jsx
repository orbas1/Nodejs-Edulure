import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { LanguageProvider } from '../../../context/LanguageContext.jsx';
import MarketingHero from '../../marketing/MarketingHero.jsx';
import ProductPreviewTabs from '../../marketing/ProductPreviewTabs.jsx';
import PlanHighlights from '../../marketing/PlanHighlights.jsx';
import HomeFaq from '../HomeFaq.jsx';
import ClosingCtaBanner from '../ClosingCtaBanner.jsx';
import CommunitySpotlight from '../CommunitySpotlight.jsx';
import CoursesAdventure from '../CoursesAdventure.jsx';
import EbookShowcase from '../EbookShowcase.jsx';
import PerksGrid from '../PerksGrid.jsx';
import TutorArcade from '../TutorArcade.jsx';

function renderInProviders(ui) {
  return render(
    <LanguageProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </LanguageProvider>
  );
}

describe('Home landing experiences', () => {
  it('renders the hero with key calls-to-action', () => {
    renderInProviders(
      <MarketingHero
        eyebrow="Learning community & marketplace"
        statusLabel="Built for cohort-based learning"
        languageSelector={{
          desktop: <span data-testid="language-desktop" />,
          mobile: <span data-testid="language-mobile" />
        }}
        chips={['Communities', 'Courses']}
        headline="Where ambitious builders learn, teach, and grow together."
        subheadline="Swap playbooks, host live jams, and grow with peers on Edulure."
        primaryAction={{ to: '/register', label: 'Join the community' }}
        secondaryAction={{ to: '/feed', label: 'Peek inside live circles' }}
        tertiaryAction={{ href: '#instructor', label: "I'm an instructor" }}
        rightPanel={<div data-testid="hero-panel" />}
      />
    );

    expect(screen.getByRole('heading', { name: /where ambitious builders/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /join the community/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /peek inside live circles/i })).toHaveAttribute('href', '/feed');
    expect(screen.getByTestId('language-desktop')).toBeInTheDocument();
    expect(screen.getByTestId('language-mobile')).toBeInTheDocument();
  });

  it('supports tab navigation inside the preview spotlight', async () => {
    const user = userEvent.setup();
    renderInProviders(
      <ProductPreviewTabs
        helper="Spotlights from this week’s launches"
        title="Preview hub"
        subtitle="Toggle between product surfaces"
        cta={{ to: '/register', label: 'Browse all spaces' }}
        footnote="Fresh previews rotate every Monday at 09:00 UTC."
        tablistLabel="Preview categories"
        tabs={[
          {
            key: 'communities',
            label: 'Communities',
            caption: 'Threaded clubhouses with rituals built in.',
            description: 'Spin up themed rooms, layer rituals, and keep every cohort pulsing with guided prompts that surface fresh wins.',
            highlights: ['Guided weekly prompts', 'Moderation cues baked in', 'Members see wins instantly'],
            image: { src: 'preview-communities.svg', alt: 'Communities preview' }
          },
          {
            key: 'courses',
            label: 'Courses',
            caption: 'Story-based curricula without the spreadsheets.',
            description: 'Design multi-week arcs and publish refreshes without exporting a single syllabus spreadsheet.',
            highlights: ['Drag-and-drop modules', 'Completion signals live', 'Scope updates in real time'],
            image: { src: 'preview-courses.svg', alt: 'Courses preview' }
          }
        ]}
      />
    );

    expect(screen.getByRole('tab', { name: /communities/i })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: /courses/i }));

    expect(screen.getByRole('tab', { name: /courses/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /courses/i })).toHaveTextContent(/drag-and-drop modules/i);
  });

  it('expands and collapses FAQ entries accessibly', async () => {
    const user = userEvent.setup();
    renderInProviders(<HomeFaq />);

    const firstQuestion = screen.getByRole('button', { name: /how quickly can i orbit/i });
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');

    await user.click(firstQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps supporting sections populated with localized content', () => {
    renderInProviders(
      <>
        <CommunitySpotlight />
        <CoursesAdventure />
        <EbookShowcase />
        <PlanHighlights
          eyebrow="Commission snapshot"
          title="Flat commissions, zero monthly fees"
          subtitle="Operate on transparent usage-based pricing designed for modern learning businesses."
          plans={[
            {
              id: 'communityTutor',
              icon: '🤝',
              heading: 'Community + tutor bundles',
              tagline: 'Keep partners paid without spinning up new tooling.',
              price: '25% commission per transaction',
              features: ['Guided onboarding', 'Shared payouts', 'Spotlight boosts'],
              note: 'Applies automatically across this revenue channel.'
            },
            {
              id: 'catalogue',
              icon: '📚',
              heading: 'Course catalogue',
              tagline: 'Publish evergreen paths with session replays baked in.',
              price: '12% commission per enrollment',
              features: ['Rich media lessons', 'Auto-updated syllabi'],
              note: 'Applies automatically across this revenue channel.'
            },
            {
              id: 'liveDonations',
              icon: '🎤',
              heading: 'Live donation drives',
              tagline: 'Spin up telethon-style moments with real-time receipts.',
              price: '5% commission per donation',
              features: ['Live ticker overlays', 'Backstage chat'],
              note: 'Applies automatically across this revenue channel.'
            }
          ]}
          cta={{ to: '/register', label: 'Launch your workspace', icon: '✨' }}
          disclaimer="Commission defaults include a 25% affiliate share and non-custodial settlement."
        />
        <PerksGrid />
        <TutorArcade />
        <ClosingCtaBanner />
      </>
    );

    expect(screen.getAllByRole('article').length).toBeGreaterThan(6);
    expect(screen.getByText(/queue up your next breakthrough session/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see full pricing/i })).toHaveAttribute('href', '/pricing');
    expect(screen.getByRole('link', { name: /start as a learner/i })).toHaveAttribute('href', '/register');
  });
});
