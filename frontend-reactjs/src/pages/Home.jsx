import HomeHero from '../components/home/HomeHero.jsx';
import CommunitySpotlight from '../components/home/CommunitySpotlight.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import InsidePreviewTabs from '../components/home/InsidePreviewTabs.jsx';
import Testimonials from '../components/Testimonials.jsx';
import TutorArcade from '../components/home/TutorArcade.jsx';
import CoursesAdventure from '../components/home/CoursesAdventure.jsx';
import EbookShowcase from '../components/home/EbookShowcase.jsx';

export default function Home() {
  return (
    <div className="bg-slate-50 text-slate-900">
      <HomeHero />
      <CommunitySpotlight />
      <FeatureGrid />
      {/* Tutor spotlight section renders above this component when available. */}
      <InsidePreviewTabs />
      <TutorArcade />
      <EbookShowcase />
      <Testimonials />
      <CoursesAdventure />
    </div>
  );
}
