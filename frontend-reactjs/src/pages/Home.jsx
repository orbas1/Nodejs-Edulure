import HomeHero from '../components/home/HomeHero.jsx';
import CommunitySpotlight from '../components/home/CommunitySpotlight.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import Testimonials from '../components/Testimonials.jsx';
import EbookShowcase from '../components/home/EbookShowcase.jsx';

export default function Home() {
  return (
    <div className="bg-slate-50 text-slate-900">
      <HomeHero />
      <CommunitySpotlight />
      <FeatureGrid />
      <EbookShowcase />
      <Testimonials />
    </div>
  );
}
