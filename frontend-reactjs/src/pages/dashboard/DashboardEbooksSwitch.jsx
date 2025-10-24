import { useEffect } from 'react';

import DashboardSwitcherHeader from '../../components/dashboard/DashboardSwitcherHeader.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import useDashboardSurface from '../../hooks/useDashboardSurface.js';
import LearnerEbooks from './LearnerEbooks.jsx';
import InstructorEbooks from './InstructorEbooks.jsx';

export default function DashboardEbooksSwitch() {
  const { role, surface, trackView, refresh } = useDashboardSurface('ebooks', {
    origin: 'dashboard-ebooks-switch'
  });

  useEffect(() => {
    trackView();
  }, [trackView]);

  if (role === 'instructor') {
    return (
      <div className="space-y-6">
        <DashboardSwitcherHeader surface={surface} onRefresh={refresh} />
        <InstructorEbooks />
      </div>
    );
  }

  if (role === 'learner') {
    return (
      <div className="space-y-6">
        <DashboardSwitcherHeader surface={surface} onRefresh={refresh} />
        <LearnerEbooks />
      </div>
    );
  }

  const copyByRole = {
    admin: {
      title: 'Operational Learnspaces do not host e-books',
      description:
        'Admin dashboards manage catalog licensing in Governance. Switch to a learner or instructor Learnspace to browse and publish titles.'
    },
    operator: {
      title: 'Operational Learnspaces do not host e-books',
      description:
        'Operator dashboards orchestrate launches but cannot access the reader. Switch to a learner or instructor Learnspace to review catalogues.'
    },
    community: {
      title: 'Operational Learnspaces do not host e-books',
      description:
        'Community Learnspaces surface curated highlights. Switch to a learner or instructor Learnspace to open the full e-book library.'
    }
  };

  const copy = copyByRole[role] ?? {
    title: 'E-book Learnspace unavailable',
    description:
      'Only learner and instructor dashboards can access the e-book experiences. Switch to an eligible Learnspace to continue.'
  };

  return (
    <DashboardStateMessage
      title={copy.title}
      description={copy.description}
      actionLabel="Refresh dashboards"
      onAction={() => refresh?.()}
    />
  );
}
