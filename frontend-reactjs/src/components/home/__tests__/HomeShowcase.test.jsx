import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { LanguageProvider } from '../../../context/LanguageContext.jsx';
import HomeHero from '../HomeHero.jsx';
import InsidePreviewTabs from '../InsidePreviewTabs.jsx';
import HomeFaq from '../HomeFaq.jsx';
import ClosingCtaBanner from '../ClosingCtaBanner.jsx';
import CommunitySpotlight from '../CommunitySpotlight.jsx';
import CoursesAdventure from '../CoursesAdventure.jsx';
import EbookShowcase from '../EbookShowcase.jsx';
import MembershipSnapshot from '../MembershipSnapshot.jsx';
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
    renderInProviders(<HomeHero />);

    expect(
      screen.getByRole('heading', {
        name: /where ambitious builders learn, teach, and grow together/i
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /join the community/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /peek inside live circles/i })).toHaveAttribute('href', '/feed');
  });

  it('supports tab navigation inside the preview spotlight', async () => {
    const user = userEvent.setup();
    renderInProviders(<InsidePreviewTabs />);

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
        <MembershipSnapshot />
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
