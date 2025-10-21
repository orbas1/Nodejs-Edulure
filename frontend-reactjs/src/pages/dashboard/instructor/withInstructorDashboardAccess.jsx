import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';
import { resolveInstructorAccess } from './instructorAccess.js';

export default function withInstructorDashboardAccess(Component) {
  function GuardedComponent(props) {
    const outletContext = useOutletContext();
    const role = outletContext?.role ?? null;
    const access = resolveInstructorAccess(role);

    if (!access.granted) {
      return (
        <DashboardStateMessage
          variant={access.message.variant}
          title={access.message.title}
          description={access.message.description}
        />
      );
    }

    return <Component {...props} />;
  }

  GuardedComponent.displayName = `WithInstructorDashboardAccess(${Component.displayName ?? Component.name ?? 'Component'})`;
  GuardedComponent.propTypes = Component.propTypes;
  GuardedComponent.defaultProps = Component.defaultProps;

  return GuardedComponent;
}
