import HomeHero from '../components/home/HomeHero.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import InsidePreviewTabs from '../components/home/InsidePreviewTabs.jsx';
import Testimonials from '../components/Testimonials.jsx';

export default function Home() {
  return (
    <div className="bg-slate-50 text-slate-900">
      <HomeHero />
      <FeatureGrid />
      {/* Tutor spotlight section renders above this component when available. */}
      <InsidePreviewTabs />
      <Testimonials />
    </div>
  );
}
