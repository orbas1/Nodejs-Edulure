import PropTypes from 'prop-types';

function flattenNav(navGroups) {
  return navGroups.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.label ?? null }))
  );
}

export default function AdminShell({
  title,
  subtitle,
  navGroups,
  headerActions,
  asideFooter,
  onNavSelect,
  children
}) {
  const flattenedNav = flattenNav(navGroups);

  const handleAnchorClick = (event, item) => {
    if (typeof onNavSelect === 'function') {
      event.preventDefault();
      onNavSelect(item.id);
      return;
    }
    if (!item.id) {
      return;
    }
    const target = document.getElementById(item.id);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white/90 backdrop-blur lg:flex">
        <div className="border-b border-slate-200 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Edulure</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-2 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <nav className="flex-1 space-y-4 px-4 py-6" aria-label="Admin sections">
          {navGroups.map((group) => (
            <div key={group.label ?? group.items[0]?.id} className="space-y-2">
              {group.label ? (
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="flex flex-col rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-primary/10 hover:text-primary"
                      onClick={(event) => handleAnchorClick(event, item)}
                    >
                      <span>{item.label}</span>
                      {item.helper ? (
                        <span className="text-xs font-normal text-slate-400">{item.helper}</span>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        {asideFooter ? <div className="border-t border-slate-200 px-6 py-6">{asideFooter}</div> : null}
      </aside>
      <section className="flex-1 py-16">
        <div className="mx-auto w-full max-w-6xl px-6">
          <nav className="mb-8 flex gap-2 overflow-x-auto rounded-full border border-slate-200 bg-white/90 p-2 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm lg:hidden">
            {flattenedNav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-primary/10 hover:text-primary"
                onClick={(event) => handleAnchorClick(event, item)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
              {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
            </div>
            {headerActions ? <div className="flex flex-wrap gap-3">{headerActions}</div> : null}
          </header>
          <div className="mt-10 flex flex-col gap-10">{children}</div>
        </div>
      </section>
    </div>
  );
}

const navItemShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  helper: PropTypes.string
});

AdminShell.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  navGroups: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      items: PropTypes.arrayOf(navItemShape).isRequired
    })
  ).isRequired,
  headerActions: PropTypes.node,
  asideFooter: PropTypes.node,
  onNavSelect: PropTypes.func,
  children: PropTypes.node.isRequired
};

AdminShell.defaultProps = {
  subtitle: null,
  headerActions: null,
  asideFooter: null,
  onNavSelect: null
};
