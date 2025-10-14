import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import InstructorRegister from './pages/InstructorRegister.jsx';
import Feed from './pages/Feed.jsx';
import Profile from './pages/Profile.jsx';
import Explorer from './pages/Explorer.jsx';
import Analytics from './pages/Analytics.jsx';
import Admin from './pages/Admin.jsx';
import ContentLibrary from './pages/ContentLibrary.jsx';
import About from './pages/About.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import ProtectedRoute from './components/routing/ProtectedRoute.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import DashboardHome from './pages/dashboard/DashboardHome.jsx';
import LearnerCommunities from './pages/dashboard/LearnerCommunities.jsx';
import LearnerCourses from './pages/dashboard/LearnerCourses.jsx';
import CourseViewer from './pages/dashboard/CourseViewer.jsx';
import DashboardCalendar from './pages/dashboard/DashboardCalendar.jsx';
import DashboardBookingsSwitch from './pages/dashboard/DashboardBookingsSwitch.jsx';
import DashboardEbooksSwitch from './pages/dashboard/DashboardEbooksSwitch.jsx';
import LearnerFinancial from './pages/dashboard/LearnerFinancial.jsx';
import BecomeInstructor from './pages/dashboard/BecomeInstructor.jsx';
import InstructorCommunityCreate from './pages/dashboard/InstructorCommunityCreate.jsx';
import InstructorCommunityManage from './pages/dashboard/InstructorCommunityManage.jsx';
import InstructorCommunityWebinars from './pages/dashboard/InstructorCommunityWebinars.jsx';
import InstructorCommunityPodcasts from './pages/dashboard/InstructorCommunityPodcasts.jsx';
import InstructorCourseCreate from './pages/dashboard/InstructorCourseCreate.jsx';
import InstructorCourseLibrary from './pages/dashboard/InstructorCourseLibrary.jsx';
import InstructorCourseManage from './pages/dashboard/InstructorCourseManage.jsx';
import InstructorLessonSchedule from './pages/dashboard/InstructorLessonSchedule.jsx';
import InstructorTutorSchedule from './pages/dashboard/InstructorTutorSchedule.jsx';
import InstructorEbookCreate from './pages/dashboard/InstructorEbookCreate.jsx';
import InstructorAds from './pages/dashboard/InstructorAds.jsx';
import InstructorPricing from './pages/dashboard/InstructorPricing.jsx';
import DashboardInbox from './pages/dashboard/DashboardInbox.jsx';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/instructor" element={<InstructorRegister />} />
        <Route
          path="/feed"
          element={(
            <ProtectedRoute allowedRoles={['learner', 'instructor', 'admin', 'moderator']}>
              <Feed />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/explorer"
          element={(
            <ProtectedRoute>
              <Explorer />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/analytics"
          element={(
            <ProtectedRoute allowedRoles={['instructor', 'admin']}>
              <Analytics />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <Admin />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/content"
          element={(
            <ProtectedRoute allowedRoles={['instructor', 'admin']}>
              <ContentLibrary />
            </ProtectedRoute>
          )}
        />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Route>
      <Route path="/dashboard" element={<Navigate to="/dashboard/learner" replace />} />
      <Route
        path="/dashboard/:role"
        element={(
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<DashboardHome />} />
        <Route path="communities" element={<LearnerCommunities />} />
        <Route path="courses" element={<LearnerCourses />} />
        <Route path="courses/:courseId" element={<CourseViewer />} />
        <Route path="calendar" element={<DashboardCalendar />} />
        <Route path="bookings" element={<DashboardBookingsSwitch />} />
        <Route path="ebooks" element={<DashboardEbooksSwitch />} />
        <Route path="financial" element={<LearnerFinancial />} />
        <Route path="become-instructor" element={<BecomeInstructor />} />
        <Route path="communities/create" element={<InstructorCommunityCreate />} />
        <Route path="communities/manage" element={<InstructorCommunityManage />} />
        <Route path="communities/webinars" element={<InstructorCommunityWebinars />} />
        <Route path="communities/podcasts" element={<InstructorCommunityPodcasts />} />
        <Route path="courses/create" element={<InstructorCourseCreate />} />
        <Route path="courses/library" element={<InstructorCourseLibrary />} />
        <Route path="courses/manage" element={<InstructorCourseManage />} />
        <Route path="inbox" element={<DashboardInbox />} />
        <Route path="pricing" element={<InstructorPricing />} />
        <Route path="lesson-schedule" element={<InstructorLessonSchedule />} />
        <Route path="tutor-schedule" element={<InstructorTutorSchedule />} />
        <Route path="ebooks/create" element={<InstructorEbookCreate />} />
        <Route path="ads" element={<InstructorAds />} />
      </Route>
    </Routes>
  );
}

export default App;
