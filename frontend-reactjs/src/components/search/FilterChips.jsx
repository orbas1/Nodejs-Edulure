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

function appendUnit(value, unit) {
  if (!unit || value === null || value === undefined) {
    return value;
  }
  return `${value} ${unit}`;
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
        .slice(0, 12)
        .forEach((value) => {
          const displayValue = appendUnit(getOptionLabel(definition, value), definition.unit);
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
      const displayValue = appendUnit(formatRangeValue(rawValue), definition.unit);
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
      const displayValue = appendUnit(getOptionLabel(definition, rawValue) ?? rawValue, definition.unit);
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

export default function FilterChips({ filters, definitions, chips, onRemove }) {
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
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onRemove(chip);
            }
          }}
          className={classNames(
            'group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
            'border-primary/30 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10'
          )}
          aria-label={`Remove ${chip.label} filter ${chip.displayValue}`}
        >
          <span className="truncate">
            {chip.label}: {chip.displayValue}
          </span>
          <XMarkIcon className="h-4 w-4 transition group-hover:rotate-90" />
          <span className="sr-only">Remove {chip.label}</span>
        </button>
      ))}
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
      options: PropTypes.array,
      unit: PropTypes.string
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
  onRemove: PropTypes.func.isRequired
};

FilterChips.defaultProps = {
  filters: {},
  definitions: [],
  chips: null
};

