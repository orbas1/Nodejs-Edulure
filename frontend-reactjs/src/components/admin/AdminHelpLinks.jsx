import PropTypes from 'prop-types';

export default function AdminHelpLinks({ links }) {
  if (!links?.length) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Operations handbook</h3>
      <p className="mt-1 text-xs text-slate-500">
        Pair admin actions with the latest operator playbooks and escalation protocols.
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {links.map((link) => (
          <li key={link.id} className="rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3">
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary transition hover:underline"
            >
              {link.title}
            </a>
            {link.description ? <p className="mt-1 text-xs text-slate-500">{link.description}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

AdminHelpLinks.propTypes = {
  links: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      href: PropTypes.string.isRequired
    })
  )
};

AdminHelpLinks.defaultProps = {
  links: []
};
