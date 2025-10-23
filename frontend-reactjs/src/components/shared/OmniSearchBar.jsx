import PropTypes from 'prop-types';
import { useCallback } from 'react';

import SearchBar from '../SearchBar.jsx';
import { trackSearch } from '../../lib/analytics.js';

export default function OmniSearchBar({ value, onChange, onSubmit, loading, placeholder, ariaLabel, surface }) {
  const handleSubmit = useCallback(
    (event, submittedValue) => {
      const resolved = submittedValue ?? event?.target?.value ?? value ?? '';
      const trimmed = resolved.trim();
      onSubmit?.(trimmed);
      if (trimmed) {
        trackSearch(trimmed, { surface });
      }
    },
    [onSubmit, surface, value]
  );

  return (
    <SearchBar
      value={value}
      onChange={onChange}
      onSubmit={handleSubmit}
      placeholder={placeholder ?? 'Search courses, tutors, communities…'}
      loading={loading}
      ariaLabel={ariaLabel ?? 'Search across Edulure'}
    />
  );
}

OmniSearchBar.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  loading: PropTypes.bool,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
  surface: PropTypes.string
};

OmniSearchBar.defaultProps = {
  value: '',
  onChange: null,
  onSubmit: null,
  loading: false,
  placeholder: '',
  ariaLabel: '',
  surface: 'shell'
};
