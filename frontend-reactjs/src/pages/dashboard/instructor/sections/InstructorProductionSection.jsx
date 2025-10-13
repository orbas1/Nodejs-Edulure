import PropTypes from 'prop-types';

const productionItemPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  owner: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  asset: PropTypes.string.isRequired
});

function ProductionCard({ asset }) {
  return (
    <li className="dashboard-card-muted p-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{asset.owner}</span>
        <span>{asset.status}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{asset.asset}</p>
    </li>
  );
}

ProductionCard.propTypes = {
  asset: productionItemPropType.isRequired
};

export default function InstructorProductionSection({ production }) {
  if (production.length === 0) return null;

  return (
    <section className="dashboard-section">
      <p className="dashboard-kicker">Production board</p>
      <ul className="mt-4 space-y-4">
        {production.map((asset) => (
          <ProductionCard key={asset.id} asset={asset} />
        ))}
      </ul>
    </section>
  );
}

InstructorProductionSection.propTypes = {
  production: PropTypes.arrayOf(productionItemPropType)
};

InstructorProductionSection.defaultProps = {
  production: []
};
