import HomeHero from '../components/home/HomeHero.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import Testimonials from '../components/Testimonials.jsx';
import MembershipSnapshot from '../components/home/MembershipSnapshot.jsx';
import HomeFaq from '../components/home/HomeFaq.jsx';
import ClosingCtaBanner from '../components/home/ClosingCtaBanner.jsx';

export default function Home() {
  return (
    <div className="bg-slate-50 text-slate-900">
      <HomeHero />
      <FeatureGrid />
      <Testimonials />
      <MembershipSnapshot />
      <HomeFaq />
      <ClosingCtaBanner />
    </div>
  );
}
