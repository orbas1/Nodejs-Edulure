import PropTypes from 'prop-types';
import clsx from 'clsx';

import DashboardSectionHeader from '../dashboard/DashboardSectionHeader.jsx';

function NavigationList({ navigation, title }) {
  if (!navigation.length) {
    return null;
  }

  return (
    <nav aria-label={`${title} sections`} className="lg:w-64">
      <ol className="sticky top-24 space-y-2 rounded-3xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
        {navigation.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={clsx(
                'block rounded-2xl px-3 py-2 font-medium transition',
                'text-slate-600 hover:bg-primary/10 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'
              )}
            >
              {item.label}
            </a>
            {item.helper ? <p className="px-3 text-xs text-slate-400">{item.helper}</p> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

NavigationList.propTypes = {
  navigation: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      helper: PropTypes.string
    })
  ).isRequired,
  title: PropTypes.string.isRequired
};

export default function SettingsLayout({
  eyebrow,
  title,
  description,
  actions,
  navigation,
  intro,
  sidecar,
  children
}) {
  const safeNavigation = Array.isArray(navigation)
    ? navigation.filter((entry) => entry && entry.id && entry.label)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <DashboardSectionHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="flex flex-col gap-8 lg:flex-row">
        <NavigationList navigation={safeNavigation} title={title ?? 'Settings'} />
        <div className="flex-1 space-y-8">
          {intro}
          {children}
        </div>
        {sidecar ? <aside className="lg:w-72 lg:flex-none">{sidecar}</aside> : null}
      </div>
    </div>
  );
}

SettingsLayout.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actions: PropTypes.node,
  navigation: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      helper: PropTypes.string
    })
  ),
  intro: PropTypes.node,
  sidecar: PropTypes.node,
  children: PropTypes.node
};

SettingsLayout.defaultProps = {
  eyebrow: undefined,
  description: undefined,
  actions: null,
  navigation: [],
  intro: null,
  sidecar: null,
  children: null
};
