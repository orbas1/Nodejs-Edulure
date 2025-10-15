import { Routes, Route } from 'react-router-dom';
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
import Blog from './pages/Blog.jsx';
import BlogPost from './pages/BlogPost.jsx';
import Communities from './pages/Communities.jsx';
import ProtectedRoute from './components/routing/ProtectedRoute.jsx';
import DashboardEntryRedirect from './components/routing/DashboardEntryRedirect.jsx';
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
import DashboardAffiliate from './pages/dashboard/DashboardAffiliate.jsx';
import DashboardLiveClassesSwitch from './pages/dashboard/DashboardLiveClassesSwitch.jsx';
import InstructorCommunityCreate from './pages/dashboard/InstructorCommunityCreate.jsx';
import InstructorCommunityManage from './pages/dashboard/InstructorCommunityManage.jsx';
import InstructorCommunityWebinars from './pages/dashboard/InstructorCommunityWebinars.jsx';
import InstructorCommunityPodcasts from './pages/dashboard/InstructorCommunityPodcasts.jsx';
import InstructorCourseCreate from './pages/dashboard/InstructorCourseCreate.jsx';
import InstructorCourseLibrary from './pages/dashboard/InstructorCourseLibrary.jsx';
import InstructorCourseManage from './pages/dashboard/InstructorCourseManage.jsx';
import InstructorCreationStudio from './pages/dashboard/InstructorCreationStudio.jsx';
import InstructorLessonSchedule from './pages/dashboard/InstructorLessonSchedule.jsx';
import InstructorTutorSchedule from './pages/dashboard/InstructorTutorSchedule.jsx';
import InstructorTutorManagement from './pages/dashboard/InstructorTutorManagement.jsx';
import InstructorServiceSuite from './pages/dashboard/InstructorServiceSuite.jsx';
import InstructorProjects from './pages/dashboard/InstructorProjects.jsx';
import InstructorEbookCreate from './pages/dashboard/InstructorEbookCreate.jsx';
import FixnadoAds from './pages/dashboard/FixnadoAds.jsx';
import InstructorPricing from './pages/dashboard/InstructorPricing.jsx';
import DashboardInbox from './pages/dashboard/DashboardInbox.jsx';
import DashboardAssessments from './pages/dashboard/DashboardAssessments.jsx';
import DashboardSettings from './pages/dashboard/DashboardSettings.jsx';
import FieldServices from './pages/dashboard/FieldServices.jsx';
import AdminOperator from './pages/dashboard/AdminOperator.jsx';
import AdminGovernance from './pages/dashboard/AdminGovernance.jsx';
import CommunityOperations from './pages/dashboard/community/CommunityOperations.jsx';
import CommunityProgramming from './pages/dashboard/community/CommunityProgramming.jsx';
import CommunityMonetisation from './pages/dashboard/community/CommunityMonetisation.jsx';
import CommunitySafety from './pages/dashboard/community/CommunitySafety.jsx';
import CommunityCommunications from './pages/dashboard/community/CommunityCommunications.jsx';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/instructor" element={<InstructorRegister />} />
        <Route
          path="/communities"
          element={(
            <ProtectedRoute allowedRoles={['admin', 'moderator', 'owner', 'member', 'non-member']}>
              <Communities />
            </ProtectedRoute>
          )}
        />
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
            <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
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
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Route>
      <Route path="/dashboard" element={<DashboardEntryRedirect />} />
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
        <Route path="assessments" element={<DashboardAssessments />} />
        <Route path="live-classes" element={<DashboardLiveClassesSwitch />} />
        <Route path="calendar" element={<DashboardCalendar />} />
        <Route path="bookings" element={<DashboardBookingsSwitch />} />
        <Route path="ebooks" element={<DashboardEbooksSwitch />} />
        <Route path="financial" element={<LearnerFinancial />} />
        <Route path="affiliate" element={<DashboardAffiliate />} />
        <Route path="become-instructor" element={<BecomeInstructor />} />
        <Route path="field-services" element={<FieldServices />} />
        <Route
          path="operations"
          element={(
            <ProtectedRoute allowedRoles={['community']}>
              <CommunityOperations />
            </ProtectedRoute>
          )}
        />
        <Route
          path="programming"
          element={(
            <ProtectedRoute allowedRoles={['community']}>
              <CommunityProgramming />
            </ProtectedRoute>
          )}
        />
        <Route
          path="monetisation"
          element={(
            <ProtectedRoute allowedRoles={['community']}>
              <CommunityMonetisation />
            </ProtectedRoute>
          )}
        />
        <Route
          path="safety"
          element={(
            <ProtectedRoute allowedRoles={['community']}>
              <CommunitySafety />
            </ProtectedRoute>
          )}
        />
        <Route
          path="communications"
          element={(
            <ProtectedRoute allowedRoles={['community']}>
              <CommunityCommunications />
            </ProtectedRoute>
          )}
        />
        <Route path="communities/create" element={<InstructorCommunityCreate />} />
        <Route path="communities/manage" element={<InstructorCommunityManage />} />
        <Route path="communities/webinars" element={<InstructorCommunityWebinars />} />
        <Route path="communities/podcasts" element={<InstructorCommunityPodcasts />} />
        <Route
          path="creation-studio"
          element={(
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorCreationStudio />
            </ProtectedRoute>
          )}
        />
        <Route path="courses/create" element={<InstructorCourseCreate />} />
        <Route path="courses/library" element={<InstructorCourseLibrary />} />
        <Route path="courses/manage" element={<InstructorCourseManage />} />
        <Route path="inbox" element={<DashboardInbox />} />
        <Route path="pricing" element={<InstructorPricing />} />
        <Route path="lesson-schedule" element={<InstructorLessonSchedule />} />
        <Route path="tutor-schedule" element={<InstructorTutorSchedule />} />
        <Route path="tutor-management" element={<InstructorTutorManagement />} />
        <Route
          path="operator"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOperator />
            </ProtectedRoute>
          )}
        />
        <Route
          path="governance"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminGovernance />
            </ProtectedRoute>
          )}
        />
        <Route
          path="services"
          element={(
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorServiceSuite />
            </ProtectedRoute>
          )}
        />
        <Route
          path="projects"
          element={(
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorProjects />
            </ProtectedRoute>
          )}
        />
        <Route
          path="ebooks/create"
          element={(
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorEbookCreate />
            </ProtectedRoute>
          )}
        />
        <Route path="ads" element={<FixnadoAds />} />
        <Route path="settings" element={<DashboardSettings />} />
        <Route
          path="ads"
          element={(
            <ProtectedRoute allowedRoles={['instructor']}>
              <FixnadoAds />
            </ProtectedRoute>
          )}
        />
      </Route>
    </Routes>
  );
}

export default App;
