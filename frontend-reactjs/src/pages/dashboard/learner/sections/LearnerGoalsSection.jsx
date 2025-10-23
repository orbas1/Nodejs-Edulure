import PropTypes from 'prop-types';

import LearnerGoalsWidget from '../../../../components/dashboard/LearnerGoalsWidget.jsx';

export default function LearnerGoalsSection({ goals, onAddGoal, className }) {
  return <LearnerGoalsWidget goals={goals} onAddGoal={onAddGoal} className={className} />;
}

LearnerGoalsSection.propTypes = {
  goals: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      subtitle: PropTypes.string,
      status: PropTypes.string,
      remainingLessons: PropTypes.number,
      focusMinutesPerWeek: PropTypes.number,
      dueLabel: PropTypes.string,
      progressPercent: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    })
  ),
  onAddGoal: PropTypes.func,
  className: PropTypes.string
};

LearnerGoalsSection.defaultProps = {
  goals: [],
  onAddGoal: null,
  className: ''
};
