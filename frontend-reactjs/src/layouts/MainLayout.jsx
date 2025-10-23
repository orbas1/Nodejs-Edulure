import { Fragment, useMemo, useState, useCallback, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Disclosure, Transition, Dialog } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  AcademicCapIcon,
  BookmarkSquareIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LifebuoyIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

import { useAuth } from '../context/AuthContext.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';
import LanguageSelector from '../components/navigation/LanguageSelector.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import UserMenu from '../components/navigation/UserMenu.jsx';
import ServiceHealthBanner from '../components/status/ServiceHealthBanner.jsx';
import HeaderMegaMenu from '../components/navigation/HeaderMegaMenu.jsx';
import MobileMegaMenu from '../components/navigation/MobileMegaMenu.jsx';
import CommunityCrudManager from '../components/community/CommunityCrudManager.jsx';
import {
  observeBreakpoint,
  observeHighContrast,
  observePrefersReducedMotion
} from '../utils/a11y.js';

const DASHBOARD_PATH_BY_ROLE = {
  admin: '/dashboard/admin',
  instructor: '/dashboard/instructor',
  learner: '/dashboard/learner',
  user: '/dashboard/learner',
  moderator: '/dashboard/admin'
};

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, session, logout } = useAuth();
  const { getConfigValue, isFeatureEnabled } = useRuntimeConfig();
  const { t } = useLanguage();
  const supportEmail = getConfigValue('support.contact-email', 'support@edulure.com');
  const analyticsDashboardEnabled = isFeatureEnabled('analytics.explorer-dashboard', true);
  const adminConsoleEnabled = isFeatureEnabled('admin.operational-console', false);
  const contentLibraryEnabled = isFeatureEnabled('content.library', true);

  const [communityConsoleOpen, setCommunityConsoleOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return () => {};
    }

    const detach = observePrefersReducedMotion((isReduced) => {
      if (typeof document === 'undefined') {
        return;
      }
      document.body?.setAttribute('data-motion', isReduced ? 'reduce' : 'standard');
    });

    return () => {
      detach();
      document.body?.removeAttribute('data-motion');
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return () => {};
    }

    const detach = observeHighContrast((isHigh) => {
      if (typeof document === 'undefined') {
        return;
      }
      document.body?.setAttribute('data-contrast', isHigh ? 'high' : 'standard');
    });

    return () => {
      detach();
      document.body?.removeAttribute('data-contrast');
    };
  }, []);

  useEffect(() => {
    return observeBreakpoint('lg', (matches) => {
      if (matches) {
        setCommunityConsoleOpen(false);
      }
    });
  }, [setCommunityConsoleOpen]);

  const handleOpenCommunityConsole = useCallback(() => {
    setCommunityConsoleOpen(true);
  }, []);

  const handleCloseCommunityConsole = useCallback(() => {
    setCommunityConsoleOpen(false);
  }, []);

  const avatarUrl = session?.user?.avatarUrl;
  const displayName = session?.user?.firstName
    ? `${session.user.firstName}${session.user.lastName ? ` ${session.user.lastName}` : ''}`
    : session?.user?.email ?? 'Your profile';
  const emailLabel = session?.user?.email;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'ED';

  const avatarClass =
    'flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary';

  const role = String(session?.user?.role ?? 'learner').toLowerCase();
  const isAdmin = role === 'admin';
  const isInstructor = role === 'instructor';

  const dashboardPath =
    DASHBOARD_PATH_BY_ROLE[(session?.user?.role ?? 'learner').toLowerCase()] ?? '/dashboard/learner';

  const communitiesDashboardPath =
    isInstructor ? `${dashboardPath}/communities/manage` : `${dashboardPath}/communities`;

  const analyticsPath = analyticsDashboardEnabled ? '/analytics' : `${dashboardPath}/growth`;

  const navigation = useMemo(() => {
    const discoverQuickActions = isAuthenticated
      ? [
          {
            id: 'discover-explore',
            label: 'Open explorer',
            description: 'Browse trending classrooms, tutors and resources across Edulure.',
            to: '/explorer',
            icon: Squares2X2Icon
          },
          {
            id: 'discover-insights',
            label: 'See cohort insights',
            description: 'Jump into your analytics workspace to monitor progress.',
            to: analyticsPath,
            icon: ChartBarIcon
          }
        ]
      : [
          {
            id: 'discover-demo',
            label: 'Book a guided tour',
            description: 'Meet our enablement crew and see Edulure in action.',
            href: `mailto:${supportEmail}`,
            icon: CalendarDaysIcon
          },
          {
            id: 'discover-start',
            label: 'Start building for free',
            description: 'Launch your first community in minutes with best-practice templates.',
            to: '/register',
            icon: SparklesIcon
          }
        ];

    const discoverMenu = {
      id: 'discover',
      type: 'mega',
      label: 'Discover',
      summary: 'Platform tour',
      heading: 'Discover the Edulure learning experience',
      description:
        'Explore how cohorts learn, collaborate and graduate inside a single community-powered workspace.',
      matches: ['/', '/live-classrooms', '/courses', '/ebooks', '/tutors', '/about', '/blog'],
      sections: [
        {
          id: 'discover-experiences',
          title: 'Learning experiences',
          caption: 'Everything your cohorts can do from day one.',
          items: [
            {
              id: 'discover-live',
              name: 'Live classrooms',
              description: 'Broadcast multi-track sessions with backstage control rooms and recordings.',
              to: '/live-classrooms',
              icon: VideoCameraIcon
            },
            {
              id: 'discover-courses',
              name: 'Courses & paths',
              description: 'Publish sequenced curricula with adaptive milestones and progress signals.',
              to: '/courses',
              icon: AcademicCapIcon
            },
            {
              id: 'discover-tutors',
              name: 'Tutor marketplace',
              description: 'Match learners with verified mentors and facilitators worldwide.',
              to: '/tutors',
              icon: UserGroupIcon
            }
          ]
        },
        {
          id: 'discover-resources',
          title: 'Resource hub',
          caption: 'Give every cohort a living archive of templates, replays and downloads.',
          items: [
            {
              id: 'discover-ebooks',
              name: 'E-books & templates',
              description: 'Curate swipe files and workbooks inside a branded, searchable library.',
              to: '/ebooks',
              icon: BookmarkSquareIcon
            },
            {
              id: 'discover-blog',
              name: 'Product updates',
              description: 'Stay in sync with the latest shipping notes and playbooks.',
              to: '/blog',
              icon: MegaphoneIcon
            },
            {
              id: 'discover-about',
              name: 'About Edulure',
              description: 'Meet the team shipping the community-first education OS.',
              to: '/about',
              icon: GlobeAltIcon
            }
          ]
        }
      ],
      quickActions: discoverQuickActions,
      spotlight: {
        label: 'Product film',
        title: 'Inside Edulure in 120 seconds',
        description: 'Take the fast-cut tour recorded from this week’s feature release.',
        media: {
          type: 'video',
          src: 'https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4',
          poster: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80',
          alt: 'Creators collaborating inside the Edulure dashboard'
        },
        cta: {
          label: 'Watch the full story',
          to: '/blog'
        }
      }
    };

    const buildMenu = {
      id: 'build',
      type: 'mega',
      label: 'Build',
      summary: 'Creator ops',
      heading: 'Build, monetise and scale your learning business',
      description:
        'Use Edulure to ship curriculum, manage live sessions, orchestrate services and grow recurring revenue.',
      matches: [
        `${dashboardPath}/courses`,
        `${dashboardPath}/live-classes`,
        `${dashboardPath}/bookings`,
        '/courses',
        '/ebooks'
      ],
      sections: [
        {
          id: 'build-curriculum',
          title: 'Curriculum & delivery',
          caption: 'Design multi-week arcs and run cinematic live sessions.',
          items: [
            {
              id: 'build-studio',
              name: 'Creation studio',
              description: 'Co-create outlines with AI orchestration and modular blueprints.',
              to: isInstructor || isAdmin ? `${dashboardPath}/creation-studio` : '/courses',
              icon: SparklesIcon
            },
            {
              id: 'build-courses',
              name: 'Course manager',
              description: 'Launch cohorts, waitlists and evergreen paths in one control centre.',
              to: `${dashboardPath}/courses`,
              icon: AcademicCapIcon
            },
            {
              id: 'build-live',
              name: 'Live control room',
              description: 'Backstage chat, green-room flows and auto recordings for every session.',
              to: `${dashboardPath}/live-classes`,
              icon: VideoCameraIcon
            }
          ]
        },
        {
          id: 'build-services',
          title: 'Services & growth',
          caption: 'Bundle tutoring, programs and assets with unified billing and analytics.',
          items: [
            {
              id: 'build-bookings',
              name: 'Bookings & roster',
              description: 'Coordinate 1:1 and group sessions with intelligent scheduling.',
              to: `${dashboardPath}/bookings`,
              icon: CalendarDaysIcon
            },
            {
              id: 'build-library',
              name: 'Resource library',
              description: 'Ship premium downloads, templates and replays at scale.',
              to: '/content',
              icon: BookmarkSquareIcon
            },
            {
              id: 'build-analytics',
              name: 'Revenue & insights',
              description: 'Monitor MRR, cohort health and retention signals in real time.',
              to: analyticsPath,
              icon: ChartBarIcon
            }
          ]
        }
      ],
      quickActions: [
        {
          id: 'build-outline',
          label: 'Generate AI outline',
          description: 'Kickstart a course with an AI-assisted draft tailored to your topic.',
          to: isInstructor || isAdmin ? `${dashboardPath}/courses/create` : '/register',
          icon: SparklesIcon
        },
        {
          id: 'build-import',
          label: 'Import from Notion',
          description: 'Bring your existing knowledge base into Edulure in seconds.',
          to: isInstructor || isAdmin ? `${dashboardPath}/creation-studio` : '/register',
          icon: DocumentTextIcon
        }
      ],
      spotlight: {
        label: 'Workshop replay',
        title: 'Designing outcomes-first curriculum',
        description: 'See how operators map ritual calendars, learning arcs and measurement loops.',
        media: {
          type: 'image',
          src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
          alt: 'Instructor planning curriculum on a whiteboard'
        },
        cta: {
          label: 'Read the recap',
          to: '/blog'
        }
      }
    };

    const communityTabs = isAuthenticated
      ? [
          {
            id: 'community-discover',
            label: 'Discover',
            helper: 'See what’s happening across Edulure communities right now.',
            sections: [
              {
                id: 'community-discover-explore',
                title: 'Explore',
                caption: 'Find active spaces and top rituals to join.',
                items: [
                  {
                    id: 'community-directory',
                    name: 'Community directory',
                    description: 'Browse curated clubs by topic, region and ritual cadence.',
                    to: '/communities',
                    icon: Squares2X2Icon
                  },
                  {
                    id: 'community-feed',
                    name: 'Live community feed',
                    description: 'Review wins and prompts from every space you follow.',
                    to: '/feed',
                    icon: ChatBubbleOvalLeftEllipsisIcon
                  },
                  {
                    id: 'community-events',
                    name: 'Events calendar',
                    description: 'Drop into live, member-led programming this week.',
                    to: '/live-classrooms',
                    icon: CalendarDaysIcon
                  }
                ]
              }
            ]
          },
          {
            id: 'community-participate',
            label: 'Participate',
            helper: 'Stay plugged into the rooms that matter most to you.',
            sections: [
              {
                id: 'community-participate-hubs',
                title: 'Your hubs',
                caption: 'Everything linked to your memberships in one place.',
                items: [
                  {
                    id: 'community-my-hubs',
                    name: 'My communities hub',
                    description: 'Jump back into the spaces you host or joined.',
                    to: communitiesDashboardPath,
                    icon: UserGroupIcon
                  },
                  {
                    id: 'community-chats',
                    name: 'Community chat',
                    description: 'Keep async threads and DM conversations organised.',
                    to: `${dashboardPath}/community-chats`,
                    icon: ChatBubbleOvalLeftEllipsisIcon
                  },
                  {
                    id: 'community-inbox',
                    name: 'Community inbox',
                    description: 'Triage requests, reports and action items from members.',
                    to: `${dashboardPath}/inbox`,
                    icon: LifebuoyIcon
                  }
                ]
              }
            ]
          },
          {
            id: 'community-operate',
            label: 'Operate',
            helper: 'Launch, moderate and analyse with confidence.',
            sections: [
              {
                id: 'community-operate-tools',
                title: 'Operations toolkit',
                caption: 'Moderate rituals, monetise and report without spreadsheets.',
                items: [
                  {
                    id: 'community-operations',
                    name: 'Operations console',
                    description: 'Configure onboarding, rituals and automations in minutes.',
                    to: communitiesDashboardPath,
                    icon: Cog6ToothIcon
                  },
                  {
                    id: 'community-insights',
                    name: 'Engagement insights',
                    description: 'Spot retention trends and health signals across cohorts.',
                    to: analyticsPath,
                    icon: ChartBarIcon
                  },
                  {
                    id: 'community-safety',
                    name: 'Trust & safety',
                    description: 'Review escalations and apply community policies.',
                    to: isAdmin ? '/dashboard/admin/trust-safety' : `${dashboardPath}/communities/operations`,
                    icon: ShieldCheckIcon
                  }
                ]
              }
            ]
          }
        ]
      : [
          {
            id: 'community-discover',
            label: 'Discover',
            helper: 'Join vibrant learning clubs guided by expert hosts.',
            sections: [
              {
                id: 'community-preview',
                title: 'Communities preview',
                caption: 'Take a look at the spaces thriving on Edulure.',
                items: [
                  {
                    id: 'community-directory-public',
                    name: 'Community directory',
                    description: 'Browse curated clubs ready for new members.',
                    to: '/communities',
                    icon: Squares2X2Icon
                  },
                  {
                    id: 'community-stories',
                    name: 'Success stories',
                    description: 'See how operators scale rituals and outcomes with Edulure.',
                    to: '/blog',
                    icon: MegaphoneIcon
                  },
                  {
                    id: 'community-events-public',
                    name: 'Live community events',
                    description: 'Attend open sessions to feel the vibe.',
                    to: '/live-classrooms',
                    icon: CalendarDaysIcon
                  }
                ]
              }
            ]
          },
          {
            id: 'community-launch',
            label: 'Launch',
            helper: 'Spin up a branded home for your learners.',
            sections: [
              {
                id: 'community-launch-kit',
                title: 'Get started',
                caption: 'Everything you need to run your first community.',
                items: [
                  {
                    id: 'community-start',
                    name: 'Start a free community',
                    description: 'Create your space in minutes with battle-tested templates.',
                    to: '/register',
                    icon: SparklesIcon
                  },
                  {
                    id: 'community-blueprint',
                    name: 'Download the community blueprint',
                    description: 'Grab rituals, onboarding flows and monetisation ideas.',
                    to: '/ebooks',
                    icon: BookmarkSquareIcon
                  },
                  {
                    id: 'community-talk',
                    name: 'Talk with a community specialist',
                    description: 'Email our team to design your launch plan together.',
                    href: `mailto:${supportEmail}`,
                    icon: LifebuoyIcon
                  }
                ]
              }
            ]
          }
        ];

    const communityQuickActions = isAuthenticated
      ? [
          {
            id: 'community-dashboard',
            label: 'Community dashboard',
            description: 'Jump straight into your community operations hub.',
            to: communitiesDashboardPath,
            icon: Squares2X2Icon
          },
          {
            id: 'community-feed-action',
            label: 'Open community feed',
            description: 'Review the latest wins and posts from every space you follow.',
            to: '/feed',
            icon: ChatBubbleOvalLeftEllipsisIcon
          },
          {
            id: 'community-console',
            label: 'Launch community console',
            description: 'Create, update and retire spaces with full audit logging.',
            onClick: handleOpenCommunityConsole,
            icon: BuildingLibraryIcon
          }
        ]
      : [
          {
            id: 'community-create',
            label: 'Create your community',
            description: 'Launch a branded space for free and invite your first cohort.',
            to: '/register',
            icon: SparklesIcon
          },
          {
            id: 'community-tour',
            label: 'Watch the community tour',
            description: 'See rituals, automations and monetisation flows end-to-end.',
            to: '/blog',
            icon: MegaphoneIcon
          }
        ];

    const communitiesMenu = {
      id: 'communities',
      type: 'mega',
      label: 'Communities',
      summary: 'Member ops',
      heading: 'Communities without the chaos',
      description:
        'Design rituals, keep members engaged and moderate with confidence across every cohort you steward.',
      matches: ['/communities', '/feed', `${dashboardPath}/communities`, `${dashboardPath}/community-chats`],
      tabs: communityTabs,
      quickActions: communityQuickActions,
      spotlight: {
        label: 'Community spotlight',
        title: 'The Ritual Architects Guild',
        description: 'See how facilitators orchestrate weekly wins with Edulure automations.',
        media: {
          type: 'image',
          src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
          alt: 'Community leaders collaborating'
        },
        cta: {
          label: 'Explore the guild',
          to: '/communities'
        }
      }
    };

    const items = [discoverMenu];

    if (isAuthenticated) {
      items.push(buildMenu, communitiesMenu);

      if (contentLibraryEnabled && (isInstructor || isAdmin)) {
        items.push({
          id: 'library-link',
          type: 'link',
          label: 'Content library',
          to: '/content',
          matches: ['/content']
        });
      } else {
        items.push({
          id: 'explore-link',
          type: 'link',
          label: 'Explore',
          to: '/explorer',
          matches: ['/explorer']
        });
      }

      if (isAdmin && adminConsoleEnabled) {
        items.push({
          id: 'admin-link',
          type: 'link',
          label: 'Admin',
          to: '/admin',
          matches: ['/admin']
        });
      }

      items.push({
        id: 'dashboard-link',
        type: 'link',
        label: 'Dashboard',
        to: dashboardPath,
        matches: [dashboardPath]
      });
    } else {
      items.push(communitiesMenu);
      items.push({
        id: 'get-started-link',
        type: 'link',
        label: 'Get started',
        to: '/register',
        matches: ['/register']
      });
      items.push({
        id: 'blog-link',
        type: 'link',
        label: 'Blog',
        to: '/blog',
        matches: ['/blog']
      });
    }

    return items;
  }, [
    adminConsoleEnabled,
    analyticsPath,
    communitiesDashboardPath,
    contentLibraryEnabled,
    dashboardPath,
    handleOpenCommunityConsole,
    isAdmin,
    isAuthenticated,
    isInstructor,
    supportEmail
  ]);

  const publicFooterGroups = useMemo(
    () => [
      {
        id: 'footer-platform',
        title: 'Platform',
        items: [
          { id: 'footer-live', label: 'Live classrooms', to: '/live-classrooms' },
          { id: 'footer-courses', label: 'Courses', to: '/courses' },
          { id: 'footer-communities', label: 'Communities', to: '/communities' },
          { id: 'footer-tutors', label: 'Tutors', to: '/tutors' }
        ]
      },
      {
        id: 'footer-solutions',
        title: 'Solutions',
        items: [
          { id: 'footer-explorer', label: 'Explorer', to: '/explorer' },
          { id: 'footer-ebooks', label: 'Resource library', to: '/ebooks' },
          { id: 'footer-blog', label: 'Product updates', to: '/blog' }
        ]
      },
      {
        id: 'footer-company',
        title: 'Company',
        items: [
          { id: 'footer-about', label: 'About', to: '/about' },
          { id: 'footer-privacy', label: 'Privacy policy', to: '/privacy' },
          { id: 'footer-terms', label: 'Terms of service', to: '/terms' }
        ]
      },
      {
        id: 'footer-contact',
        title: 'Stay in touch',
        items: [
          { id: 'footer-mail', label: supportEmail, href: `mailto:${supportEmail}` }
        ]
      }
    ],
    [supportEmail]
  );

  const authenticatedFooterGroups = useMemo(
    () => [
      {
        id: 'footer-workspace',
        title: 'Workspace',
        items: [
          { id: 'footer-dashboard', label: 'Dashboard home', to: dashboardPath },
          { id: 'footer-calendar', label: 'Calendar', to: `${dashboardPath}/calendar` },
          { id: 'footer-bookings', label: 'Bookings', to: `${dashboardPath}/bookings` }
        ]
      },
      {
        id: 'footer-communities-auth',
        title: 'Communities',
        items: [
          { id: 'footer-my-communities', label: 'My communities', to: communitiesDashboardPath },
          { id: 'footer-feed', label: 'Community feed', to: '/feed' },
          {
            id: 'footer-console',
            label: 'Launch community console',
            onClick: handleOpenCommunityConsole
          }
        ]
      },
      {
        id: 'footer-support-auth',
        title: 'Support',
        items: [
          { id: 'footer-guides', label: 'Operator playbook', to: '/blog' },
          { id: 'footer-email-auth', label: supportEmail, href: `mailto:${supportEmail}` }
        ]
      }
    ],
    [communitiesDashboardPath, dashboardPath, handleOpenCommunityConsole, supportEmail]
  );

  const footerGroups = isAuthenticated ? authenticatedFooterGroups : publicFooterGroups;

  const footerLinkClass = isAuthenticated
    ? 'text-sm text-slate-200 transition hover:text-white'
    : 'text-sm text-slate-600 transition hover:text-primary';

  const renderFooterItem = (item) => {
    if (item.to) {
      return (
        <NavLink key={item.id} to={item.to} className={footerLinkClass}>
          {item.label}
        </NavLink>
      );
    }

    if (item.href) {
      return (
        <a key={item.id} href={item.href} className={footerLinkClass}>
          {item.label}
        </a>
      );
    }

    if (item.onClick) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          className={`${footerLinkClass} text-left`}
        >
          {item.label}
        </button>
      );
    }

    return (
      <span key={item.id} className={footerLinkClass}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <a href="#main-content" className="skip-to-content">
        {t('navigation.skipToContent', 'Skip to main content')}
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <a href="/" className="flex items-center gap-3 sm:gap-4" aria-label="Edulure home">
            <img
              src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png"
              alt="Edulure logo"
              className="h-10 w-auto object-contain sm:h-12 lg:h-16 xl:h-20"
            />
          </a>
          <div className="hidden items-center gap-4 lg:flex">
            <nav className="flex items-center gap-2">
              {navigation.map((item) => {
                if (item.type === 'mega') {
                  return <HeaderMegaMenu key={item.id} item={item} />;
                }
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    className={({ isActive }) =>
                      `rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSelector size="compact" variant="light" align="end" showLabel={false} />
            {isAuthenticated ? (
              <UserMenu session={session} onNavigate={navigate} onLogout={logout} />
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:text-primary-dark"
                >
                  {t('navigation.login')}
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
                >
                  {t('navigation.register')}
                </NavLink>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 lg:hidden">
            <LanguageSelector size="compact" variant="subtle" align="end" showLabel={false} />
            <Disclosure as="div" className="lg:hidden">
              {({ open }) => (
                <>
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/70 p-2 text-slate-600 shadow-sm transition hover:border-primary hover:text-primary">
                    <span className="sr-only">Open main menu</span>
                    {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                  </Disclosure.Button>
                  <Transition
                    as={Fragment}
                    enter="transition duration-200 ease-out"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition duration-150 ease-in"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Disclosure.Panel className="lg:hidden">
                      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true" />
                      <div className="fixed inset-x-0 top-0 z-50 flex h-[100dvh] flex-col overflow-y-auto overscroll-contain bg-white/95 px-4 pb-10 pt-6 shadow-2xl backdrop-blur-sm sm:px-6 lg:px-8">
                        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
                          <div className="flex items-center justify-between gap-4">
                            <a href="/" className="inline-flex items-center gap-3" aria-label="Edulure home">
                              <img
                                src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png"
                                alt="Edulure logo"
                                className="h-10 w-auto object-contain"
                              />
                              <span className="text-base font-semibold text-slate-900">Edulure</span>
                            </a>
                            <Disclosure.Button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition hover:border-primary hover:text-primary">
                              <span className="sr-only">Close menu</span>
                              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                            </Disclosure.Button>
                          </div>

                          <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                            <LanguageSelector size="compact" variant="light" align="start" fullWidth />
                          </div>

                          {isAuthenticated ? (
                            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="h-11 w-11 rounded-full object-cover" />
                              ) : (
                                <span className={avatarClass}>{initials}</span>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                                {emailLabel ? <p className="text-xs text-slate-500">{emailLabel}</p> : null}
                                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-primary">Secure session</p>
                              </div>
                            </div>
                          ) : null}

                          <div className="space-y-3">
                            {navigation.map((item) => {
                              if (item.type === 'mega') {
                                return <MobileMegaMenu key={item.id} item={item} onNavigate={() => document.activeElement?.blur()} />;
                              }
                              return (
                                <NavLink
                                  key={item.id}
                                  to={item.to}
                                  className={({ isActive }) =>
                                    `block rounded-2xl border px-5 py-3 text-base font-semibold transition ${
                                      isActive
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-primary/60 hover:bg-primary/5 hover:text-primary'
                                    }`
                                  }
                                  onClick={() => {
                                    document.activeElement?.blur();
                                  }}
                                >
                                  {item.label}
                                </NavLink>
                              );
                            })}
                          </div>

                          {isAuthenticated ? (
                            <div className="space-y-3">
                              <button
                                type="button"
                                onClick={() => {
                                  navigate('/profile');
                                  document.activeElement?.blur();
                                }}
                                className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary/60 hover:text-primary"
                              >
                                View profile
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigate(`${dashboardPath}/settings`);
                                  document.activeElement?.blur();
                                }}
                                className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary/60 hover:text-primary"
                              >
                                Settings
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  logout();
                                  document.activeElement?.blur();
                                }}
                                className="w-full rounded-2xl bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                              >
                                Sign out
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3">
                              <NavLink
                                to="/login"
                                className="rounded-full border border-primary/30 px-5 py-3 text-center text-sm font-semibold text-primary transition hover:border-primary hover:text-primary-dark"
                              >
                                {t('navigation.login')}
                              </NavLink>
                              <NavLink
                                to="/register"
                                className="rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
                              >
                                {t('navigation.register')}
                              </NavLink>
                            </div>
                          )}

                          <div className="mt-auto space-y-3 border-t border-slate-200 pt-6 text-xs text-slate-500">
                            <p className="font-semibold uppercase tracking-[0.3em] text-slate-400">Stay in sync</p>
                            <p>
                              {t(
                                'navigation.mobilePrompt',
                                'Scroll the full menu to explore programs, resources, and support options tailored for your screen.'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
          </div>
        </div>
      </header>
      <ServiceHealthBanner />
      <main id="main-content" className="bg-white">
        <Outlet key={location.pathname} />
      </main>
      <footer
        className={`border-t ${
          isAuthenticated ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-200 bg-slate-50/70 text-slate-500'
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 py-14">
          {isAuthenticated ? (
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <div className="flex items-center">
                  <img
                    src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png"
                    alt="Edulure logo"
                    className="h-10 w-auto"
                  />
                </div>
                <p className="text-sm leading-relaxed text-slate-300">
                  Keep your learning organisation running around the clock with communities, curriculum, live operations
                  and analytics housed in one collaborative OS.
                </p>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {footerGroups.map((group) => (
                    <div key={group.id} className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.title}</p>
                      <ul className="space-y-2">
                        {group.items.map((item) => (
                          <li key={item.id}>{renderFooterItem(item)}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Need a hand?</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Message the success team</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Our enablement crew replies to every workspace question within one business day.
                </p>
                <a
                  href={`mailto:${supportEmail}`}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
                >
                  Email {supportEmail}
                </a>
                <p className="mt-6 text-xs text-slate-500">
                  © {new Date().getFullYear()} Edulure. All rights reserved.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-10 text-sm text-slate-500 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <div className="flex items-center">
                  <img
                    src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png"
                    alt="Edulure logo"
                    className="h-10 w-auto"
                  />
                </div>
                <p className="text-sm leading-relaxed">
                  Build thriving learning communities with collaborative classrooms, live cohorts and deep analytics powered
                  by Edulure.
                </p>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                  {footerGroups.map((group) => (
                    <div key={group.id} className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.title}</p>
                      <ul className="space-y-2">
                        {group.items.map((item) => (
                          <li key={item.id}>{renderFooterItem(item)}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400">© {new Date().getFullYear()} Edulure. All rights reserved.</p>
              </div>
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stay in the loop</p>
                <p className="text-sm text-slate-600">
                  Join our newsletter for cohort launch calendars, product updates and curated community insights.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    name="footer-email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Subscribe
                  </button>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <a href={`mailto:${supportEmail}`} className="transition hover:text-primary">
                    {supportEmail}
                  </a>
                  <NavLink to="/about" className="transition hover:text-primary">
                    Learn more about Edulure
                  </NavLink>
                </div>
              </div>
            </div>
          )}
        </div>
      </footer>

      <Transition appear show={communityConsoleOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[80]" onClose={handleCloseCommunityConsole}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-5xl overflow-hidden rounded-4xl bg-white shadow-2xl">
                  <button
                    type="button"
                    onClick={handleCloseCommunityConsole}
                    className="absolute right-5 top-5 rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:border-primary hover:text-primary"
                  >
                    <span className="sr-only">Close community console</span>
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <div className="max-h-[80vh] overflow-y-auto px-6 py-8 sm:px-10">
                    <Dialog.Title className="sr-only">Community production console</Dialog.Title>
                    <CommunityCrudManager />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
