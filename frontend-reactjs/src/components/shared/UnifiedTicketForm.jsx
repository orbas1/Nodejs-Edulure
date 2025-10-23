import PropTypes from 'prop-types';

import TicketForm from '../support/TicketForm.jsx';

const DEFAULT_PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent — outage' },
  { value: 'high', label: 'High — blocking work' },
  { value: 'normal', label: 'Normal — needs follow-up' },
  { value: 'low', label: 'Low — feedback' }
];

const DEFAULT_CATEGORY_OPTIONS = ['General', 'Billing', 'Communities', 'Courses'];

export default function UnifiedTicketForm({
  open,
  onClose,
  onSubmit,
  categoryOptions,
  priorityOptions,
  serviceWindow,
  firstResponseMinutes,
  defaultCategory,
  defaultPriority
}) {
  return (
    <TicketForm
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      categoryOptions={categoryOptions ?? DEFAULT_CATEGORY_OPTIONS}
      priorityOptions={priorityOptions ?? DEFAULT_PRIORITY_OPTIONS}
      serviceWindow={serviceWindow ?? 'Weekdays 8am–8pm'}
      firstResponseMinutes={firstResponseMinutes ?? 45}
      defaultCategory={defaultCategory}
      defaultPriority={defaultPriority}
    />
  );
}

UnifiedTicketForm.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
  categoryOptions: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
  priorityOptions: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
  serviceWindow: PropTypes.string,
  firstResponseMinutes: PropTypes.number,
  defaultCategory: PropTypes.string,
  defaultPriority: PropTypes.string
};

UnifiedTicketForm.defaultProps = {
  open: false,
  onClose: null,
  onSubmit: null,
  categoryOptions: null,
  priorityOptions: null,
  serviceWindow: null,
  firstResponseMinutes: null,
  defaultCategory: undefined,
  defaultPriority: undefined
};
