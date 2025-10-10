import { useMemo, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import SkewedMenu from '../components/SkewedMenu.jsx';
import FeedComposer from '../components/FeedComposer.jsx';
import FeedCard from '../components/FeedCard.jsx';
import CommunityProfile from '../components/CommunityProfile.jsx';
import { communities, feedPosts } from '../data/mockData.js';

export default function Feed() {
  const [selectedCommunity, setSelectedCommunity] = useState(communities[0]);
  const [activeMenuItem, setActiveMenuItem] = useState('Communities');

  const menuState = useMemo(() => (selectedCommunity.id === 'all' ? 'all' : 'community'), [selectedCommunity]);

  return (
    <div className="bg-slate-50/70 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6">
        <TopBar
          communities={communities}
          selectedCommunity={selectedCommunity}
          onCommunityChange={(community) => setSelectedCommunity(community)}
        />
        <SkewedMenu activeState={menuState} activeItem={activeMenuItem} onSelect={setActiveMenuItem} />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
          <div className="space-y-6">
            <FeedComposer />
            <div className="space-y-4">
              {feedPosts.map((post) => (
                <FeedCard key={post.id} post={post} />
              ))}
              <button className="w-full rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary/5">
                Load more updates
              </button>
            </div>
          </div>
          <CommunityProfile community={selectedCommunity} />
        </div>
      </div>
    </div>
  );
}
