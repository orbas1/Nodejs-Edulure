import HomeHero from '../components/home/HomeHero.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import Testimonials from '../components/Testimonials.jsx';
import TutorArcade from '../components/home/TutorArcade.jsx';

export default function Home() {
  return (
    <div className="bg-slate-50 text-slate-900">
      <HomeHero />
      <FeatureGrid />
      <TutorArcade />
      <Testimonials />
    </div>
  );
}
