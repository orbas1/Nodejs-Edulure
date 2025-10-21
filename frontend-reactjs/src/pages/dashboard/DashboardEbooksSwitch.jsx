import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import LearnerEbooks from './LearnerEbooks.jsx';
import InstructorEbooks from './InstructorEbooks.jsx';

export default function DashboardEbooksSwitch() {
  const { role, refresh } = useOutletContext();

  if (role === 'instructor') {
    return <InstructorEbooks />;
  }

  if (role === 'learner') {
    return <LearnerEbooks />;
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
