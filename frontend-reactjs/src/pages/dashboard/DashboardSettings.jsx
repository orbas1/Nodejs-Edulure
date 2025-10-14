import { useMemo, useState } from 'react';
import { AdjustmentsHorizontalIcon, DevicePhoneMobileIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';
import { useOutletContext } from 'react-router-dom';

import DashboardSectionHeader from '../../components/dashboard/DashboardSectionHeader.jsx';

function ToggleRow({ label, description, value, onChange }) {
  return (
    <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:border-primary/40">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {description ? <span className="text-xs text-slate-500">{description}</span> : null}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
        <button
          type="button"
          onClick={onChange}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            value ? 'bg-primary' : 'bg-slate-200'
          }`}
          aria-pressed={value}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${value ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
      </div>
    </label>
  );
}

ToggleRow.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  value: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired
};

ToggleRow.defaultProps = {
  description: undefined
};

export default function DashboardSettings() {
  const { role, dashboard } = useOutletContext();
  const [notifications, setNotifications] = useState({
    email: true,
    sms: role === 'admin',
    push: true
  });
  const [security, setSecurity] = useState({
    mfa: dashboard?.security?.mfaEnabled ?? false,
    alerts: true
  });
  const [devices, setDevices] = useState(() => dashboard?.devices ?? []);

  const roleLabel = useMemo(() => {
    switch (role) {
      case 'instructor':
        return 'Instructor workspace';
      case 'admin':
        return 'Administrator workspace';
      default:
        return 'Learner workspace';
    }
  }, [role]);

  return (
    <div className="space-y-10">
      <DashboardSectionHeader
        eyebrow="Settings"
        title="Keep your workspace secure"
        description={`Manage how ${roleLabel.toLowerCase()} notifications, devices, and security safeguards operate.`}
        actions={
          <button type="button" className="dashboard-primary-pill">
            Save configuration
          </button>
        }
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="dashboard-section space-y-4">
          <div className="flex items-center gap-3">
            <AdjustmentsHorizontalIcon className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Notification strategy</h2>
              <p className="text-sm text-slate-600">Define how we should alert your teams about programme activity.</p>
            </div>
          </div>
          <ToggleRow
            label="Email updates"
            description="Send weekly digests and immediate alerts for high-priority changes."
            value={notifications.email}
            onChange={() =>
              setNotifications((prev) => ({
                ...prev,
                email: !prev.email
              }))
            }
          />
          <ToggleRow
            label="SMS escalations"
            description="Notify on-call instructors and admins when bookings or compliance issues require attention."
            value={notifications.sms}
            onChange={() =>
              setNotifications((prev) => ({
                ...prev,
                sms: !prev.sms
              }))
            }
          />
          <ToggleRow
            label="Push notifications"
            description="Deliver instant updates to the Edulure mobile app for learners and operators."
            value={notifications.push}
            onChange={() =>
              setNotifications((prev) => ({
                ...prev,
                push: !prev.push
              }))
            }
          />
        </div>

        <div className="dashboard-section space-y-4">
          <div className="flex items-center gap-3">
            <LockClosedIcon className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Security posture</h2>
              <p className="text-sm text-slate-600">Double down on multi-factor authentication and anomaly detection.</p>
            </div>
          </div>
          <ToggleRow
            label="Multi-factor authentication"
            description="Require verification across authenticator apps, security keys, or SMS for every sign-in."
            value={security.mfa}
            onChange={() =>
              setSecurity((prev) => ({
                ...prev,
                mfa: !prev.mfa
              }))
            }
          />
          <ToggleRow
            label="Risk alerts"
            description="Flag unrecognised devices, impossible travel, and policy breaches instantly."
            value={security.alerts}
            onChange={() =>
              setSecurity((prev) => ({
                ...prev,
                alerts: !prev.alerts
              }))
            }
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Latest status</p>
            <p className="mt-1 text-slate-500">
              {security.mfa ? 'MFA enforced for all members.' : 'MFA recommended but not enforced.'}
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-section space-y-5">
        <div className="flex items-center gap-3">
          <DevicePhoneMobileIcon className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Trusted devices</h2>
            <p className="text-sm text-slate-600">Review which laptops and mobile devices currently have workspace access.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(devices.length > 0 ? devices : [{ id: 'placeholder-1', label: 'MacBook Pro · Product team', lastSeen: '2 hours ago', location: 'London, UK', risk: 'Low' }]).map((device) => (
            <div key={device.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p className="text-sm font-semibold text-slate-900">{device.label}</p>
              <p className="mt-1 text-xs text-slate-500">Last active {device.lastSeen}</p>
              <p className="mt-1 text-xs text-slate-500">Location {device.location}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Risk {device.risk}</p>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-primary transition hover:text-primary-dark"
                onClick={() =>
                  setDevices((prev) => prev.filter((item) => item.id !== device.id))
                }
              >
                Revoke access
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
