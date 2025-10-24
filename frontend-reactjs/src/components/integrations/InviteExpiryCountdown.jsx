import PropTypes from 'prop-types';

function formatSegment(label, value) {
  if (value === undefined || value === null) {
    return null;
  }
  return (
    <div className="flex flex-col items-center rounded-2xl bg-slate-900 px-3 py-2 text-white">
      <span className="text-lg font-semibold leading-none">{String(value).padStart(2, '0')}</span>
      <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">{label}</span>
    </div>
  );
}

export default function InviteExpiryCountdown({ countdown }) {
  if (!countdown) {
    return null;
  }

  if (countdown.expired) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-700">
        Invitation expired
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {formatSegment('Days', countdown.days)}
      {formatSegment('Hours', countdown.hours)}
      {formatSegment('Minutes', countdown.minutes)}
      {formatSegment('Seconds', countdown.seconds)}
    </div>
  );
}

InviteExpiryCountdown.propTypes = {
  countdown: PropTypes.shape({
    expired: PropTypes.bool,
    days: PropTypes.number,
    hours: PropTypes.number,
    minutes: PropTypes.number,
    seconds: PropTypes.number
  })
};

InviteExpiryCountdown.defaultProps = {
  countdown: null
};
