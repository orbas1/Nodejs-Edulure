import { useOutletContext } from 'react-router-dom';
import LearnerBookings from './LearnerBookings.jsx';
import InstructorTutorBookings from './InstructorTutorBookings.jsx';

export default function DashboardBookingsSwitch() {
  const { role } = useOutletContext();
  return role === 'instructor' ? <InstructorTutorBookings /> : <LearnerBookings />;
}
