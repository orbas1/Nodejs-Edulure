import { Navigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext.jsx';

export default function DashboardEntryRedirect() {
  const { activeRole, roles } = useDashboard();
  const fallbackRole = roles[0]?.id ?? 'learner';
  const targetRole = activeRole ?? fallbackRole;

  return <Navigate to={`/dashboard/${targetRole}`} replace />;
}
