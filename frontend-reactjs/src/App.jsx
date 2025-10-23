import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import ProtectedRoute from './components/routing/ProtectedRoute.jsx';
import DashboardEntryRedirect from './components/routing/DashboardEntryRedirect.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import RouteLoading from './components/loading/RouteLoading.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const InstructorRegister = lazy(() => import('./pages/InstructorRegister.jsx'));
const Feed = lazy(() => import('./pages/Feed.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Explorer = lazy(() => import('./pages/Explorer.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const ContentLibrary = lazy(() => import('./pages/ContentLibrary.jsx'));
const LiveClassrooms = lazy(() => import('./pages/LiveClassrooms.jsx'));
const Ebooks = lazy(() => import('./pages/Ebooks.jsx'));
const Courses = lazy(() => import('./pages/Courses.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));
const Blog = lazy(() => import('./pages/Blog.jsx'));
const BlogPost = lazy(() => import('./pages/BlogPost.jsx'));
const Communities = lazy(() => import('./pages/Communities.jsx'));
const TutorProfile = lazy(() => import('./pages/TutorProfile.jsx'));
const IntegrationCredentialInvite = lazy(() => import('./pages/IntegrationCredentialInvite.jsx'));
const Setup = lazy(() => import('./pages/Setup.jsx'));

const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome.jsx'));
const LearnerCommunities = lazy(() => import('./pages/dashboard/LearnerCommunities.jsx'));
const LearnerCourses = lazy(() => import('./pages/dashboard/LearnerCourses.jsx'));
const CourseViewer = lazy(() => import('./pages/dashboard/CourseViewer.jsx'));
const DashboardCalendar = lazy(() => import('./pages/dashboard/DashboardCalendar.jsx'));
const DashboardBookingsSwitch = lazy(() => import('./pages/dashboard/DashboardBookingsSwitch.jsx'));
const DashboardEbooksSwitch = lazy(() => import('./pages/dashboard/DashboardEbooksSwitch.jsx'));
const LearnerFinancial = lazy(() => import('./pages/dashboard/LearnerFinancial.jsx'));
const LearnerGrowth = lazy(() => import('./pages/dashboard/LearnerGrowth.jsx'));
const BecomeInstructor = lazy(() => import('./pages/dashboard/BecomeInstructor.jsx'));
const DashboardAffiliate = lazy(() => import('./pages/dashboard/DashboardAffiliate.jsx'));
const DashboardLiveClassesSwitch = lazy(() => import('./pages/dashboard/DashboardLiveClassesSwitch.jsx'));
const InstructorCommunityCreate = lazy(() => import('./pages/dashboard/InstructorCommunityCreate.jsx'));
const InstructorCommunityManage = lazy(() => import('./pages/dashboard/InstructorCommunityManage.jsx'));
const InstructorCommunityChats = lazy(() => import('./pages/dashboard/InstructorCommunityChats.jsx'));
const InstructorCommunityWebinars = lazy(() => import('./pages/dashboard/InstructorCommunityWebinars.jsx'));
const InstructorCommunityPodcasts = lazy(() => import('./pages/dashboard/InstructorCommunityPodcasts.jsx'));
const InstructorCommunityOperations = lazy(() => import('./pages/dashboard/InstructorCommunityOperations.jsx'));
const InstructorCourseCreate = lazy(() => import('./pages/dashboard/InstructorCourseCreate.jsx'));
const InstructorCourseLibrary = lazy(() => import('./pages/dashboard/InstructorCourseLibrary.jsx'));
const InstructorCourseManage = lazy(() => import('./pages/dashboard/InstructorCourseManage.jsx'));
const InstructorCreationStudio = lazy(() => import('./pages/dashboard/InstructorCreationStudio.jsx'));
const InstructorLessonSchedule = lazy(() => import('./pages/dashboard/InstructorLessonSchedule.jsx'));
const InstructorTutorSchedule = lazy(() => import('./pages/dashboard/InstructorTutorSchedule.jsx'));
const InstructorTutorManagement = lazy(() => import('./pages/dashboard/InstructorTutorManagement.jsx'));
const InstructorServiceSuite = lazy(() => import('./pages/dashboard/InstructorServiceSuite.jsx'));
const InstructorProjects = lazy(() => import('./pages/dashboard/InstructorProjects.jsx'));
const InstructorEbookCreate = lazy(() => import('./pages/dashboard/InstructorEbookCreate.jsx'));
const InstructorGrowth = lazy(() => import('./pages/dashboard/InstructorGrowth.jsx'));
const EdulureAds = lazy(() => import('./pages/dashboard/EdulureAds.jsx'));
const InstructorPricing = lazy(() => import('./pages/dashboard/InstructorPricing.jsx'));
const DashboardInbox = lazy(() => import('./pages/dashboard/DashboardInbox.jsx'));
const DashboardAssessments = lazy(() => import('./pages/dashboard/DashboardAssessments.jsx'));
const DashboardSettings = lazy(() => import('./pages/dashboard/DashboardSettings.jsx'));
const FieldServices = lazy(() => import('./pages/dashboard/FieldServices.jsx'));
const AdminOperator = lazy(() => import('./pages/dashboard/AdminOperator.jsx'));
const AdminGovernance = lazy(() => import('./pages/dashboard/AdminGovernance.jsx'));
const AdminIntegrations = lazy(() => import('./pages/dashboard/AdminIntegrations.jsx'));
const AdminFinanceMonetisation = lazy(() => import('./pages/dashboard/admin/AdminFinanceMonetisation.jsx'));
const AdminSupportHub = lazy(() => import('./pages/dashboard/admin/AdminSupportHub.jsx'));
const AdminTrustSafety = lazy(() => import('./pages/dashboard/admin/AdminTrustSafety.jsx'));
const AdminControl = lazy(() => import('./pages/dashboard/AdminControl.jsx'));
const CommunityOperations = lazy(() => import('./pages/dashboard/community/CommunityOperations.jsx'));
const CommunityProgramming = lazy(() => import('./pages/dashboard/community/CommunityProgramming.jsx'));
const CommunityMonetisation = lazy(() => import('./pages/dashboard/community/CommunityMonetisation.jsx'));
const CommunitySafety = lazy(() => import('./pages/dashboard/community/CommunitySafety.jsx'));
const CommunityCommunications = lazy(() => import('./pages/dashboard/community/CommunityCommunications.jsx'));
const LearnerSocial = lazy(() => import('./pages/dashboard/LearnerSocial.jsx'));
const LearnerCommunityChats = lazy(() => import('./pages/dashboard/LearnerCommunityChats.jsx'));
const LearnerSupport = lazy(() => import('./pages/dashboard/LearnerSupport.jsx'));
const LearnerSettings = lazy(() => import('./pages/dashboard/LearnerSettings.jsx'));

const renderWithSuspense = (Component, label) => (
  <Suspense fallback={<RouteLoading label={label} />}>
    <Component />
  </Suspense>
);

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={renderWithSuspense(Home, 'Loading Edulure home')} />
        <Route path="/login" element={renderWithSuspense(Login, 'Loading login form')} />
        <Route path="/register" element={renderWithSuspense(Register, 'Loading registration')} />
        <Route path="/instructor" element={renderWithSuspense(InstructorRegister, 'Preparing instructor onboarding')} />
        <Route
          path="/communities"
          element={(
            <ProtectedRoute allowedRoles={['admin', 'moderator', 'owner', 'member', 'non-member']}>
              {renderWithSuspense(Communities, 'Loading communities experience')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/feed"
          element={(
            <ProtectedRoute allowedRoles={['learner', 'instructor', 'admin', 'moderator']}>
              {renderWithSuspense(Feed, 'Loading personalised feed')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute>
              {renderWithSuspense(Profile, 'Loading profile dashboard')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/explorer"
          element={(
            <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
              {renderWithSuspense(Explorer, 'Loading explorer surface')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/analytics"
          element={(
            <ProtectedRoute allowedRoles={['instructor', 'admin']}>
              {renderWithSuspense(Analytics, 'Loading analytics workspace')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              {renderWithSuspense(Admin, 'Loading admin overview')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/content"
          element={(
            <ProtectedRoute allowedRoles={['instructor', 'admin']}>
              {renderWithSuspense(ContentLibrary, 'Loading content library')}
            </ProtectedRoute>
          )}
        />
        <Route path="/live-classrooms" element={renderWithSuspense(LiveClassrooms, 'Loading live classrooms')} />
        <Route path="/courses" element={renderWithSuspense(Courses, 'Loading course catalogue')} />
        <Route path="/ebooks" element={renderWithSuspense(Ebooks, 'Loading ebooks marketplace')} />
        <Route path="/tutors" element={renderWithSuspense(TutorProfile, 'Loading tutor profiles')} />
        <Route path="/blog" element={renderWithSuspense(Blog, 'Loading Edulure blog')} />
        <Route path="/blog/:slug" element={renderWithSuspense(BlogPost, 'Loading blog post')} />
        <Route path="/about" element={renderWithSuspense(About, 'Loading about Edulure')} />
        <Route path="/privacy" element={renderWithSuspense(Privacy, 'Loading privacy policy')} />
        <Route path="/terms" element={renderWithSuspense(Terms, 'Loading terms and conditions')} />
        <Route
          path="/integrations/credential-invite/:token"
          element={renderWithSuspense(IntegrationCredentialInvite, 'Loading credential invite')}
        />
        <Route path="/setup" element={renderWithSuspense(Setup, 'Preparing setup wizard')} />
      </Route>
      <Route path="/dashboard" element={renderWithSuspense(DashboardEntryRedirect, 'Evaluating dashboard destination')} />
      <Route
        path="/dashboard/:role"
        element={(
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={renderWithSuspense(DashboardHome, 'Loading dashboard home')} />
        <Route path="communities" element={renderWithSuspense(LearnerCommunities, 'Loading learner communities')} />
        <Route path="community-chats" element={renderWithSuspense(LearnerCommunityChats, 'Loading community chats')} />
        <Route path="courses" element={renderWithSuspense(LearnerCourses, 'Loading enrolled courses')} />
        <Route path="courses/:courseId" element={renderWithSuspense(CourseViewer, 'Loading course viewer')} />
        <Route path="social" element={renderWithSuspense(LearnerSocial, 'Loading social hub')} />
        <Route path="assessments" element={renderWithSuspense(DashboardAssessments, 'Loading assessments')} />
        <Route path="live-classes" element={renderWithSuspense(DashboardLiveClassesSwitch, 'Loading live classes')} />
        <Route path="calendar" element={renderWithSuspense(DashboardCalendar, 'Loading calendar')} />
        <Route path="bookings" element={renderWithSuspense(DashboardBookingsSwitch, 'Loading bookings')} />
        <Route path="support" element={renderWithSuspense(LearnerSupport, 'Loading support centre')} />
        <Route path="ebooks" element={renderWithSuspense(DashboardEbooksSwitch, 'Loading digital library')} />
        <Route path="financial" element={renderWithSuspense(LearnerFinancial, 'Loading financial dashboard')} />
        <Route path="settings" element={renderWithSuspense(LearnerSettings, 'Loading learner settings')} />
        <Route path="growth" element={renderWithSuspense(LearnerGrowth, 'Loading learner growth analytics')} />
        <Route path="affiliate" element={renderWithSuspense(DashboardAffiliate, 'Loading affiliate tools')} />
        <Route path="become-instructor" element={renderWithSuspense(BecomeInstructor, 'Loading instructor onboarding')} />
        <Route path="field-services" element={renderWithSuspense(FieldServices, 'Loading field services hub')} />
        <Route
          path="operations"
          element={(
            <ProtectedRoute allowedRoles={['community']}>
              {renderWithSuspense(CommunityOperations, 'Loading community operations')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="programming"
          element={(
            <ProtectedRoute allowedRoles={['community']}>
              {renderWithSuspense(CommunityProgramming, 'Loading programming workspace')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="monetisation"
          element={(
            <ProtectedRoute allowedRoles={['community']}>
              {renderWithSuspense(CommunityMonetisation, 'Loading community monetisation')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="safety"
          element={(
            <ProtectedRoute allowedRoles={['community']}>
              {renderWithSuspense(CommunitySafety, 'Loading community safety centre')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="communications"
          element={(
            <ProtectedRoute allowedRoles={['community']}>
              {renderWithSuspense(CommunityCommunications, 'Loading communications tools')}
            </ProtectedRoute>
          )}
        />
        <Route path="communities/create" element={renderWithSuspense(InstructorCommunityCreate, 'Loading community creator')} />
        <Route path="communities/manage" element={renderWithSuspense(InstructorCommunityManage, 'Loading community management')} />
        <Route
          path="communities/operations"
          element={(
            <ProtectedRoute allowedRoles={['instructor']}>
              {renderWithSuspense(InstructorCommunityOperations, 'Loading instructor community operations')}
            </ProtectedRoute>
          )}
        />
        <Route path="communities/chats" element={renderWithSuspense(InstructorCommunityChats, 'Loading instructor chats')} />
        <Route path="communities/webinars" element={renderWithSuspense(InstructorCommunityWebinars, 'Loading webinars studio')} />
        <Route path="communities/podcasts" element={renderWithSuspense(InstructorCommunityPodcasts, 'Loading podcasts studio')} />
        <Route
          path="creation-studio"
          element={(
            <ProtectedRoute allowedRoles={['instructor']}>
              {renderWithSuspense(InstructorCreationStudio, 'Loading creation studio')}
            </ProtectedRoute>
          )}
        />
        <Route path="courses/create" element={renderWithSuspense(InstructorCourseCreate, 'Loading course creator')} />
        <Route path="courses/library" element={renderWithSuspense(InstructorCourseLibrary, 'Loading course library')} />
        <Route path="courses/manage" element={renderWithSuspense(InstructorCourseManage, 'Loading course manager')} />
        <Route path="inbox" element={renderWithSuspense(DashboardInbox, 'Loading inbox')} />
        <Route path="growth" element={renderWithSuspense(InstructorGrowth, 'Loading instructor growth analytics')} />
        <Route path="pricing" element={renderWithSuspense(InstructorPricing, 'Loading pricing workspace')} />
        <Route path="lesson-schedule" element={renderWithSuspense(InstructorLessonSchedule, 'Loading lesson schedule')} />
        <Route path="tutor-schedule" element={renderWithSuspense(InstructorTutorSchedule, 'Loading tutor schedule')} />
        <Route path="tutor-management" element={renderWithSuspense(InstructorTutorManagement, 'Loading tutor management')} />
        <Route
          path="control"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              {renderWithSuspense(AdminControl, 'Loading admin control centre')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="operator"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              {renderWithSuspense(AdminOperator, 'Loading operator console')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="integrations"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              {renderWithSuspense(AdminIntegrations, 'Loading integrations hub')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="finance"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              {renderWithSuspense(AdminFinanceMonetisation, 'Loading finance insights')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="trust-safety"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              {renderWithSuspense(AdminTrustSafety, 'Loading trust & safety tools')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="support"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              {renderWithSuspense(AdminSupportHub, 'Loading support hub')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="governance"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              {renderWithSuspense(AdminGovernance, 'Loading governance workspace')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="services"
          element={(
            <ProtectedRoute allowedRoles={['instructor']}>
              {renderWithSuspense(InstructorServiceSuite, 'Loading service suite')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="projects"
          element={(
            <ProtectedRoute allowedRoles={['instructor']}>
              {renderWithSuspense(InstructorProjects, 'Loading projects board')}
            </ProtectedRoute>
          )}
        />
        <Route
          path="ebooks/create"
          element={(
            <ProtectedRoute allowedRoles={['instructor']}>
              {renderWithSuspense(InstructorEbookCreate, 'Loading ebook creator')}
            </ProtectedRoute>
          )}
        />
        <Route path="settings" element={renderWithSuspense(DashboardSettings, 'Loading dashboard settings')} />
        <Route
          path="ads"
          element={(
            <ProtectedRoute allowedRoles={['learner', 'instructor', 'admin']}>
              {renderWithSuspense(EdulureAds, 'Loading Edulure ads centre')}
            </ProtectedRoute>
          )}
        />
      </Route>
    </Routes>
  );
}

export default App;
