import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/outline';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function getOptionLabel(definition, rawValue) {
  if (!definition?.options) return rawValue;
  const match = definition.options.find((option) => option.value === rawValue);
  return match ? match.label : rawValue;
}

function formatRangeValue(rawValue) {
  if (!rawValue || (rawValue.min == null && rawValue.max == null)) {
    return null;
  }
  const { min, max } = rawValue;
  if (min != null && max != null) {
    return `${min} – ${max}`;
  }
  if (min != null) {
    return `≥ ${min}`;
  }
  if (max != null) {
    return `≤ ${max}`;
  }
  return null;
}

const MAX_MULTI_CHIPS = 12;

export function buildFilterChips(filters = {}, definitions = []) {
  const definitionMap = new Map(definitions.map((item) => [item.key, item]));
  const chips = [];

  Object.entries(filters).forEach(([key, rawValue]) => {
    const definition = definitionMap.get(key);
    if (!definition) {
      return;
    }
    const label = definition.label ?? key;

    if (definition.type === 'multi' && Array.isArray(rawValue)) {
      rawValue
        .filter((value) => value !== null && value !== undefined && value !== '')
        .slice(0, MAX_MULTI_CHIPS)
        .forEach((value) => {
          const displayValue = getOptionLabel(definition, value);
          chips.push({
            id: `${key}:${value}`,
            key,
            label,
            displayValue,
            rawValue: value,
            type: definition.type
          });
        });
      return;
    }

    if (definition.type === 'range') {
      const displayValue = formatRangeValue(rawValue);
      if (displayValue) {
        chips.push({
          id: `${key}:range`,
          key,
          label,
          displayValue,
          rawValue,
          type: definition.type
        });
      }
      return;
    }

    if (definition.type === 'boolean') {
      if (rawValue) {
        chips.push({
          id: `${key}:true`,
          key,
          label,
          displayValue: 'Enabled',
          rawValue,
          type: definition.type
        });
      }
      return;
    }

    if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
      const displayValue = getOptionLabel(definition, rawValue) ?? rawValue;
      chips.push({
        id: `${key}:${displayValue}`,
        key,
        label,
        displayValue,
        rawValue,
        type: definition.type
      });
    }
  });

  return chips;
}

export default function FilterChips({ filters, definitions, chips, onRemove, onClearAll }) {
  const resolvedChips = useMemo(
    () => chips ?? buildFilterChips(filters, definitions),
    [chips, filters, definitions]
  );

  if (!resolvedChips.length) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {resolvedChips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onRemove(chip)}
          className={classNames(
            'group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
            'border-primary/30 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10'
          )}
        >
          <span className="truncate">
            {chip.label}: {chip.displayValue}
          </span>
          <XMarkIcon className="h-4 w-4 transition group-hover:rotate-90" />
          <span className="sr-only">Remove {chip.label}</span>
        </button>
      ))}
      {onClearAll ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary"
          onClick={onClearAll}
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}

FilterChips.propTypes = {
  filters: PropTypes.object,
  definitions: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      options: PropTypes.array
    })
  ),
  chips: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      displayValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      rawValue: PropTypes.any,
      type: PropTypes.string
    })
  ),
  onRemove: PropTypes.func.isRequired,
  onClearAll: PropTypes.func
};

FilterChips.defaultProps = {
  filters: {},
  definitions: [],
  chips: null,
  onClearAll: null
};

