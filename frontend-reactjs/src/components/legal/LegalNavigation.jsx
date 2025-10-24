import PropTypes from 'prop-types';
import clsx from 'clsx';

export function LegalNavigationSelect({ id, sections, activeSection, onChange, className }) {
  if (!sections.length) {
    return null;
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        Select a section
      </label>
      <select
        id={id}
        value={activeSection ?? sections[0].id}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.heading}
          </option>
        ))}
      </select>
    </div>
  );
}

LegalNavigationSelect.propTypes = {
  id: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      heading: PropTypes.string.isRequired
    })
  ).isRequired,
  activeSection: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string
};

LegalNavigationSelect.defaultProps = {
  activeSection: null,
  className: ''
};

function extractSectionNumber(heading) {
  if (typeof heading !== 'string') {
    return { number: null, label: heading };
  }
  const match = heading.match(/^([0-9]+)\.\s*(.*)$/);
  if (!match) {
    return { number: null, label: heading };
  }
  return { number: match[1], label: match[2] || heading };
}

export function LegalNavigationList({
  sections,
  activeSection,
  onAnchorClick,
  className,
  listClassName
}) {
  if (!sections.length) {
    return null;
  }

  return (
    <nav className={clsx('space-y-2 text-sm', className)} aria-label="In-page navigation">
      {sections.map((section) => {
        const { number, label } = extractSectionNumber(section.heading);
        const isActive = activeSection === section.id;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(event) => {
              if (onAnchorClick) {
                onAnchorClick(event, section.id);
              }
            }}
            className={clsx(
              'flex items-center gap-3 rounded-2xl px-4 py-3 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
              isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              listClassName
            )}
            aria-current={isActive ? 'true' : undefined}
          >
            {number ? (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
                {number}
              </span>
            ) : null}
            <span className="flex-1 leading-snug">{label ?? section.heading}</span>
          </a>
        );
      })}
    </nav>
  );
}

LegalNavigationList.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      heading: PropTypes.string.isRequired
    })
  ).isRequired,
  activeSection: PropTypes.string,
  onAnchorClick: PropTypes.func,
  className: PropTypes.string,
  listClassName: PropTypes.string
};

LegalNavigationList.defaultProps = {
  activeSection: null,
  onAnchorClick: undefined,
  className: '',
  listClassName: ''
};
