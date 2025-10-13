export const dashboardDemo = {
  profile: {
    id: 7,
    name: 'Ivy Instructor',
    email: 'ivy.instructor@edulure.test',
    avatar: 'https://www.gravatar.com/avatar/0c36e0f9061f1f0e8a5adb562e2eb06a?d=identicon&s=160',
    title: '3 communities · 2 active programs · Instructor studio live',
    bio: 'Currently coaching 2 cohorts, stewarding 3 communities, and guiding 48 learners through live simulations.',
    stats: [
      { label: 'Communities', value: '3 joined' },
      { label: 'Courses', value: '2 active' },
      { label: 'Badges', value: '8 milestones' },
      { label: 'Cohorts', value: '2 active' },
      { label: 'Live sessions', value: '4 scheduled' },
      { label: 'Tutor pods', value: '5 mentors' }
    ],
    feedHighlights: [
      {
        id: 'feed-1',
        time: '2h ago',
        headline: 'Design Ops Mastery cohort hit 90% completion',
        tags: ['Cohort', 'Milestone'],
        reactions: 42,
        comments: 18
      },
      {
        id: 'feed-2',
        time: '6h ago',
        headline: 'Growth Lab Q1 waitlist passed 320 learners',
        tags: ['Community'],
        reactions: 31,
        comments: 12
      }
    ]
  },
  roles: [
    { id: 'learner', label: 'Learner' },
    { id: 'instructor', label: 'Instructor' }
  ],
  dashboards: {
    learner: {
      metrics: [],
      analytics: { learningPace: [], communityEngagement: [] },
      upcoming: [],
      communities: { managed: [], pipelines: [] },
      courses: { active: [], recommendations: [] },
      calendar: [],
      tutorBookings: { active: [], history: [] },
      ebooks: { library: [], recommendations: [] },
      financial: { summary: [], invoices: [] },
      notifications: { total: 0, unreadMessages: 0, items: [] },
      followers: { followers: 0, following: 0, pending: [], outgoing: [], recommendations: [] },
      settings: {
        privacy: { visibility: 'private', followApprovalRequired: true, shareActivity: false, messagePermission: 'followers' },
        messaging: { unreadThreads: 0, notificationsEnabled: true },
        communities: []
      }
    },
    instructor: {
      metrics: [
        { label: 'Active learners', value: '184', change: '+26 last 30d', trend: 'up' },
        { label: 'Avg completion', value: '82%', change: '6 cohorts completed', trend: 'up' },
        { label: 'Upcoming sessions', value: '7', change: '5 tutor slots', trend: 'up' },
        { label: 'Course revenue', value: '$42,800.00', change: '+$8,400.00 pipeline', trend: 'up' }
      ],
      analytics: {
        enrollment: [
          { label: 'Design Ops Mastery', current: 96, previous: 78 },
          { label: 'Growth Lab', current: 54, previous: 48 },
          { label: 'Strategy Sprint', current: 34, previous: 22 }
        ],
        revenueStreams: [
          { name: 'Courses', value: 58 },
          { name: 'Live sessions', value: 22 },
          { name: 'Subscriptions', value: 15 },
          { name: 'E-books', value: 5 }
        ]
      },
      courses: {
        pipeline: [
          { id: 'course-101', name: 'Growth Lab Q2', stage: 'In review', startDate: 'Jun 10, 2024', learners: '68 prospects' },
          { id: 'course-102', name: 'Strategy Sprint', stage: 'Draft', startDate: 'Jul 1, 2024', learners: '41 prospects' }
        ],
        production: [
          {
            id: 'assignment-401',
            asset: 'Design Ops Mastery · Ops Playbook Audit',
            owner: 'Ivy Instructor',
            status: 'Due Jun 18, 2024',
            type: 'Assignment'
          },
          {
            id: 'lesson-305',
            asset: 'Growth Lab · Activation Deep Dive',
            owner: 'Ivy Instructor',
            status: 'Releases Jun 12, 2024, 5:00 PM',
            type: 'Lesson'
          }
        ],
        library: [
          { id: 'asset-201', title: 'Design Ops Mastery: Kickoff Recording', format: 'video', updated: 'May 30, 2024' },
          { id: 'asset-202', title: 'Growth Lab: Funnel Template', format: 'pdf', updated: 'May 28, 2024' },
          { id: 'asset-203', title: 'Strategy Sprint: Retrospective Kit', format: 'notion', updated: 'May 25, 2024' }
        ]
      },
      communities: {
        manageDeck: [
          { id: 'community-55', title: 'DesignOps Collective', members: '320 members', trend: '+18 pending', health: 'Excellent' },
          { id: 'community-61', title: 'Growth Lab Circle', members: '185 members', trend: '5 moderators', health: 'Healthy' },
          { id: 'community-73', title: 'Strategy Leaders Guild', members: '142 members', trend: 'Steady', health: 'Stable' }
        ],
        createTemplates: [
          {
            id: 'template-1',
            name: '30-Day Accelerator',
            duration: 'Updated May 20, 2024',
            ingredients: ['Kickoff ritual', 'Weekly playbook', 'Peer pods', 'Live retro'],
            community: 'DesignOps Collective'
          },
          {
            id: 'template-2',
            name: 'Accountability Lab',
            duration: 'Updated May 12, 2024',
            ingredients: ['Focus sprints', 'Async standups', 'Mentor office hours'],
            community: 'Growth Lab Circle'
          }
        ],
        webinars: [
          { id: 'live-301', topic: 'Scaling Ops Rituals', date: 'Jun 14, 2024, 4:00 PM', status: 'scheduled', registrants: '88/120' },
          { id: 'live-302', topic: 'Design Systems AMA', date: 'Jun 20, 2024, 6:00 PM', status: 'scheduled', registrants: '65/150' }
        ],
        podcasts: [
          { id: 'post-401', stage: 'Draft', episode: 'Episode 12 · Ritual Roadmaps', release: 'Unscheduled' },
          { id: 'post-402', stage: 'Published', episode: 'Episode 11 · Tutor Pods 2.0', release: 'May 22, 2024' }
        ]
      },
      schedules: {
        lessons: [
          {
            id: 'lesson-305',
            topic: 'Activation Deep Dive',
            course: 'Growth Lab',
            date: 'Jun 12, 2024, 5:00 PM',
            facilitator: 'Ivy Instructor'
          },
          {
            id: 'lesson-402',
            topic: 'Scaling Playbooks',
            course: 'Design Ops Mastery',
            date: 'Jun 15, 2024, 3:00 PM',
            facilitator: 'Ivy Instructor'
          }
        ],
        tutor: [
          { id: 'tutor-31', mentor: 'Avery Chen', slots: '3 slots', learners: '4 learners', notes: '#ops · 45 mins · Slack' },
          { id: 'tutor-32', mentor: 'Jordan Patel', slots: '4 slots', learners: '5 learners', notes: '#growth · 60 mins · Zoom' }
        ]
      },
      bookings: {
        pipeline: [
          {
            id: 'booking-71',
            status: 'Requested',
            learner: 'Lia Researcher',
            requested: '2d ago',
            topic: 'Portfolio review'
          },
          {
            id: 'booking-72',
            status: 'Requested',
            learner: 'Noah Lead',
            requested: '5h ago',
            topic: 'Team ritual design'
          }
        ],
        confirmed: [
          {
            id: 'booking-80',
            topic: 'Mentorship: Ops Playbook',
            learner: 'Ava Strategist',
            date: 'Jun 13, 2024, 1:00 PM'
          },
          {
            id: 'booking-81',
            topic: 'Mentorship: Growth Experiments',
            learner: 'Eli Product',
            date: 'Jun 16, 2024, 10:30 AM'
          }
        ]
      },
      ebooks: {
        catalogue: [
          { id: 'ebook-88', title: 'Ops Manual', status: 'Published', downloads: 420, authors: 'Ivy Instructor', price: '$15.00' },
          { id: 'ebook-92', title: 'Growth Experiments Field Guide', status: 'Published', downloads: 285, authors: 'Growth Lab Team', price: '$19.00' }
        ],
        creationPipelines: [
          {
            id: 'ebook-pipeline-101',
            title: 'Mentor Playbook',
            stage: 'Editing',
            owner: 'Ivy Instructor',
            release: 'Timeline pending'
          },
          {
            id: 'ebook-pipeline-102',
            title: 'Community Rituals Almanac',
            stage: 'Design',
            owner: 'Jordan Patel',
            release: 'Jul 15, 2024'
          }
        ]
      },
      ads: {
        active: [
          {
            id: 'campaign-91',
            name: 'Growth Lab Summer',
            format: 'Video campaign',
            spend: '$1,200.00',
            performance: '3.42% CTR · Score 8.7'
          },
          {
            id: 'campaign-92',
            name: 'Ops Manual Launch',
            format: 'Lead gen',
            spend: '$640.00',
            performance: '2.98% CTR · Score 7.9'
          }
        ],
        experiments: [
          {
            id: 'experiment-91',
            name: 'Creative variant A/B',
            status: 'Live',
            hypothesis: '+12 conversions · $3,200.00 revenue'
          },
          {
            id: 'experiment-92',
            name: 'Community retargeting',
            status: 'Completed',
            hypothesis: '+6 conversions · $1,450.00 revenue'
          }
        ]
      },
      calendar: [
        { id: 'day-0', day: 'Mon', items: ['Live: Growth Lab standup', 'Mentor: Ops Playbook'] },
        { id: 'day-1', day: 'Tue', items: ['Lesson: Activation Deep Dive'] },
        { id: 'day-2', day: 'Wed', items: ['Mentor: Growth Experiments', 'Live: Design Systems AMA'] },
        { id: 'day-3', day: 'Thu', items: ['Lesson: Scaling Playbooks'] },
        { id: 'day-4', day: 'Fri', items: ['Live: Cohort retro', 'Mentor: Ritual Design'] }
      ],
      pricing: {
        offers: [
          {
            id: 'pricing-course-101',
            name: 'Design Ops Mastery',
            price: '$1,200.00',
            status: 'Published',
            conversion: '78.0%',
            learners: '96 enrolled'
          },
          {
            id: 'pricing-course-102',
            name: 'Growth Lab',
            price: '$980.00',
            status: 'Published',
            conversion: '71.0%',
            learners: '54 enrolled'
          }
        ],
        subscriptions: [
          {
            id: 'pricing-tier-1',
            name: 'DesignOps Collective · Pro Circle',
            price: '$29.00',
            members: '132 active',
            churn: '4 cancellations',
            renewal: 'Jun 18, 2024'
          },
          {
            id: 'pricing-tier-2',
            name: 'Growth Lab Circle · Insider',
            price: '$49.00',
            members: '78 active',
            churn: 'Retention steady',
            renewal: 'Auto-renewal'
          }
        ],
        sessions: [
          {
            id: 'pricing-live-301',
            name: 'Design Ops Office Hours',
            price: '$120.00',
            seats: '28/40 booked',
            status: 'Scheduled',
            date: 'Jun 14, 2024, 4:00 PM'
          },
          {
            id: 'pricing-live-302',
            name: 'Growth Experiments AMA',
            price: '$95.00',
            seats: '34/50 booked',
            status: 'Scheduled',
            date: 'Jun 20, 2024, 6:00 PM'
          }
        ],
        insights: [
          'Design Ops Mastery holds 96 enrolments with 78% completion.',
          '210 active subscribers across premium communities.',
          'Next live session “Scaling Ops Rituals” is scheduled Jun 14, 2024, 4:00 PM.'
        ]
      }
    }
  },
  searchIndex: [
    { id: 'search-instructor-course-101', role: 'instructor', type: 'Course', title: 'Design Ops Mastery', url: '/dashboard/instructor/courses/manage' },
    { id: 'search-instructor-community-55', role: 'instructor', type: 'Community', title: 'DesignOps Collective', url: '/dashboard/instructor/communities/manage' },
    { id: 'search-instructor-booking-71', role: 'instructor', type: 'Mentorship', title: 'Lia Researcher mentorship request', url: '/dashboard/instructor/bookings' }
  ]
};

export default dashboardDemo;
