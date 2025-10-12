import { useOutletContext } from 'react-router-dom';
import LearnerEbooks from './LearnerEbooks.jsx';
import InstructorEbooks from './InstructorEbooks.jsx';

export default function DashboardEbooksSwitch() {
  const { role } = useOutletContext();
  return role === 'instructor' ? <InstructorEbooks /> : <LearnerEbooks />;
}
