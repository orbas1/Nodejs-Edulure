import HomeHero from '../components/home/HomeHero.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import PerksGrid from '../components/home/PerksGrid.jsx';
import Testimonials from '../components/Testimonials.jsx';

export default function Home() {
  return (
    <div className="bg-slate-50 text-slate-900">
      <HomeHero />
      <FeatureGrid />
      <PerksGrid />
      <Testimonials />
    </div>
  );
}
