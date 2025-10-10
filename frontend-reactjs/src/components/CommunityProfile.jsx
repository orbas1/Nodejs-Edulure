import PropTypes from 'prop-types';

import { leaderboards } from '../data/mockData.js';

export default function CommunityProfile({ community }) {
  if (!community || community.id === 'all') {
    return (
      <div className="rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center text-sm text-slate-600">
        <p>Select a community to unlock tailored leaderboards, calendars, and invite links.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <img src={community.image} alt={community.name} className="h-40 w-full object-cover" />
        <div className="space-y-4 p-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{community.name}</h3>
            <p className="text-sm text-slate-500">{community.description}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <div>
              <span className="block text-xs uppercase tracking-wide text-slate-400">Members</span>
              <span className="font-semibold text-slate-900">{community.members.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wide text-slate-400">Online</span>
              <span className="font-semibold text-primary">{community.online.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wide text-slate-400">Admins</span>
              <span className="font-semibold text-slate-900">{community.admins}</span>
            </div>
          </div>
          <a
            href={community.link}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
          >
            Visit Community Hub
          </a>
        </div>
      </div>
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Leaderboards</h4>
        {leaderboards.map((board) => (
          <div key={board.name} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h5 className="text-sm font-semibold text-slate-900">{board.name}</h5>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {board.topMembers.map((member) => (
                <li key={member.name} className="flex items-center justify-between">
                  <span>{member.name}</span>
                  <span className="font-semibold text-primary">{member.score}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

CommunityProfile.propTypes = {
  community: PropTypes.shape({
    id: PropTypes.string,
    image: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    members: PropTypes.number,
    online: PropTypes.number,
    admins: PropTypes.string,
    link: PropTypes.string
  })
};
