import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

function computeSegments(targetDate, now) {
  const difference = targetDate.getTime() - now.getTime();
  if (Number.isNaN(difference) || difference <= 0) {
    return {
      complete: true,
      segments: [
        { label: 'Days', value: '00' },
        { label: 'Hours', value: '00' },
        { label: 'Minutes', value: '00' },
        { label: 'Seconds', value: '00' }
      ]
    };
  }

  const days = Math.floor(difference / DAY);
  const hours = Math.floor((difference % DAY) / HOUR);
  const minutes = Math.floor((difference % HOUR) / MINUTE);
  const seconds = Math.floor((difference % MINUTE) / SECOND);

  const pad = (value) => String(value).padStart(2, '0');

  return {
    complete: false,
    segments: [
      { label: 'Days', value: pad(days) },
      { label: 'Hours', value: pad(hours) },
      { label: 'Minutes', value: pad(minutes) },
      { label: 'Seconds', value: pad(seconds) }
    ]
  };
}

export default function CountdownTimer({ targetTime, label = 'Session begins in', onComplete }) {
  const targetDate = useMemo(() => {
    if (!targetTime) {
      return null;
    }
    const parsed = targetTime instanceof Date ? targetTime : new Date(targetTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [targetTime]);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!targetDate) {
      return undefined;
    }

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const { complete, segments } = useMemo(() => {
    if (!targetDate) {
      return { complete: true, segments: [] };
    }
    return computeSegments(targetDate, now);
  }, [now, targetDate]);

  useEffect(() => {
    if (!complete) {
      return undefined;
    }
    if (typeof onComplete === 'function') {
      onComplete();
    }
    return undefined;
  }, [complete, onComplete]);

  if (!targetDate) {
    return null;
  }

  if (complete) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span>Live now</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-3" role="timer" aria-live="polite">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="flex min-w-[64px] flex-col items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-white"
          >
            <span className="text-2xl font-semibold tabular-nums" aria-hidden="true">
              {segment.value}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              {segment.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

CountdownTimer.propTypes = {
  targetTime: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]),
  label: PropTypes.string,
  onComplete: PropTypes.func
};
