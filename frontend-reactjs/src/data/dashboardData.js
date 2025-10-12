export const dashboardUserProfile = {
  name: 'Amelia Chen',
  avatar: 'https://i.pravatar.cc/160?img=45',
  title: 'Product Designer & Lifelong Learner',
  bio: 'Curious operator tracking every micro-improvement. Currently taking UX Systems, No-Code Launchpads, and the Edulure storytelling clinic.',
  stats: [
    { label: 'Communities', value: '8 joined' },
    { label: 'Courses', value: '5 active' },
    { label: 'Badges', value: '12 earned' }
  ],
  feedHighlights: [
    {
      id: 'feed-1',
      headline: 'Shipped my capstone UI critique in the Design Lab',
      time: '2h ago',
      tags: ['Design Lab', 'Capstone'],
      reactions: 64,
      comments: 18
    },
    {
      id: 'feed-2',
      headline: 'Booked a 1:1 with Priya to review onboarding flows',
      time: 'Yesterday',
      tags: ['Mentorship'],
      reactions: 41,
      comments: 9
    },
    {
      id: 'feed-3',
      headline: 'Shared a playbook on async cohort rituals',
      time: '3d ago',
      tags: ['Community Ops'],
      reactions: 87,
      comments: 26
    }
  ]
};

export const learnerDashboardData = {
  metrics: [
    { label: 'Learning Streak', value: '27 days', change: '+4 days', trend: 'up' },
    { label: 'Modules Completed', value: '142', change: '+18%', trend: 'up' },
    { label: 'Time Invested', value: '86 hrs', change: '−3%', trend: 'down' },
    { label: 'Communities Active', value: '5', change: '+2', trend: 'up' }
  ],
  analytics: {
    learningPace: [
      { day: 'Mon', minutes: 95 },
      { day: 'Tue', minutes: 110 },
      { day: 'Wed', minutes: 80 },
      { day: 'Thu', minutes: 130 },
      { day: 'Fri', minutes: 70 },
      { day: 'Sat', minutes: 45 },
      { day: 'Sun', minutes: 60 }
    ],
    communityEngagement: [
      { name: 'AI Builders Guild', participation: 94 },
      { name: 'Design Lab', participation: 88 },
      { name: 'Strategy Pods', participation: 76 },
      { name: 'Creator Co-ops', participation: 69 }
    ]
  },
  upcoming: [
    {
      id: 'up-1',
      title: 'Deep Work Sprint – Cohort 4',
      type: 'Sprint',
      date: 'Mon, 9:00 AM',
      host: 'Strategy Pods',
      action: 'Join room'
    },
    {
      id: 'up-2',
      title: 'Tutor Session: Conversion Copy with Priya Patel',
      type: 'Mentor session',
      date: 'Tue, 1:30 PM',
      host: 'Booking #4721',
      action: 'Reschedule'
    },
    {
      id: 'up-3',
      title: 'Community Retro',
      type: 'Community event',
      date: 'Thu, 5:00 PM',
      host: 'Design Lab',
      action: 'Add notes'
    }
  ],
  communities: {
    managed: [
      {
        id: 'guild-ai',
        name: 'AI Builders Guild',
        members: 3240,
        moderators: 6,
        health: '97%',
        initiatives: ['Weekly release reviews', 'Beta feedback loop', 'Mentor AMAs']
      },
      {
        id: 'design-lab',
        name: 'Design Lab',
        members: 1985,
        moderators: 4,
        health: '92%',
        initiatives: ['Critique circles', 'Prototyping dojo', 'Community retro']
      }
    ],
    pipelines: [
      { id: 'pipeline-1', title: 'Moderator onboarding', progress: 65, owner: 'You' },
      { id: 'pipeline-2', title: 'Member referral pilots', progress: 45, owner: 'Stella Park' },
      { id: 'pipeline-3', title: 'Engagement experiments', progress: 80, owner: 'Jordan Lee' }
    ]
  },
  courses: {
    active: [
      {
        id: 'course-product-ops',
        title: 'Product Ops Systems',
        status: 'In progress',
        progress: 68,
        instructor: 'Noah Winters',
        nextLesson: 'Sprint retrospectives live lab'
      },
      {
        id: 'course-story',
        title: 'Story-Driven UX Research',
        status: 'In progress',
        progress: 42,
        instructor: 'Riya Patel',
        nextLesson: 'Panel: Pacing insights'
      },
      {
        id: 'course-ai-ethics',
        title: 'Responsible AI Playbooks',
        status: 'On deck',
        progress: 0,
        instructor: 'Amir Haddad',
        nextLesson: 'Cohort orientation'
      }
    ],
    recommendations: [
      {
        id: 'rec-1',
        title: 'Systems Thinking for Creators',
        summary: 'Design end-to-end programs with durable outcomes.',
        rating: 4.9
      },
      {
        id: 'rec-2',
        title: 'Async Coaching Foundations',
        summary: 'Mentor high-touch cohorts without burning out.',
        rating: 4.8
      }
    ]
  },
  calendar: [
    { id: 'cal-1', day: 'Mon', items: ['Deep work sprint (9:00 AM)', 'Office hours with Eden (2:30 PM)'] },
    { id: 'cal-2', day: 'Tue', items: ['Tutor session with Priya (1:30 PM)', 'Design Lab retro prep (6:00 PM)'] },
    { id: 'cal-3', day: 'Wed', items: ['Async feedback block (All day)'] },
    { id: 'cal-4', day: 'Thu', items: ['Community retro (5:00 PM)'] },
    { id: 'cal-5', day: 'Fri', items: ['Cohort kickoff rehearsal (11:00 AM)'] }
  ],
  tutorBookings: {
    active: [
      {
        id: 'book-1',
        mentor: 'Priya Patel',
        topic: 'Conversion copy for onboarding',
        date: 'Tue, 1:30 PM',
        status: 'Confirmed'
      },
      {
        id: 'book-2',
        mentor: 'Alex Romero',
        topic: 'Workflow automation audit',
        date: 'Fri, 10:00 AM',
        status: 'Pending brief'
      }
    ],
    history: [
      {
        id: 'book-3',
        mentor: 'Maya Thompson',
        topic: 'Community moderation rituals',
        date: 'Apr 04, 2024',
        rating: 5
      },
      {
        id: 'book-4',
        mentor: 'Noah Winters',
        topic: 'Outcomes measurement deep dive',
        date: 'Mar 18, 2024',
        rating: 5
      }
    ]
  },
  ebooks: {
    library: [
      {
        id: 'ebook-1',
        title: 'Cohort Craft – 2024 Edition',
        format: 'PDF',
        lastOpened: '2 days ago',
        progress: 76
      },
      {
        id: 'ebook-2',
        title: 'Community Playbook Vol. 3',
        format: 'EPUB',
        lastOpened: '1 week ago',
        progress: 52
      },
      {
        id: 'ebook-3',
        title: 'Facilitation Prompts',
        format: 'Notion',
        lastOpened: '3 weeks ago',
        progress: 100
      }
    ]
  },
  financial: {
    summary: [
      { label: 'Invested in Courses', value: '$2,430', change: '+$320 vs last quarter' },
      { label: 'Mentorship Credits', value: '12 remaining', change: '4 renew on May 12' },
      { label: 'Scholarships Awarded', value: '$750', change: 'Last approval Mar 30' }
    ],
    invoices: [
      { id: 'inv-1', label: 'Story-Driven UX Research – Cohort 7', amount: '$480', status: 'Paid', date: 'Mar 12, 2024' },
      { id: 'inv-2', label: 'Strategy Pods – Sprint membership', amount: '$160', status: 'Auto-renews', date: 'Apr 02, 2024' },
      { id: 'inv-3', label: 'Mentor session with Priya Patel', amount: '$120', status: 'Paid', date: 'Apr 08, 2024' }
    ]
  }
};

export const instructorDashboardData = {
  metrics: [
    { label: 'Active Cohorts', value: '4', change: '+1 new', trend: 'up' },
    { label: 'Learner Satisfaction', value: '4.9 / 5', change: '+0.2', trend: 'up' },
    { label: 'Revenue (30d)', value: '$18.6k', change: '+14%', trend: 'up' },
    { label: 'Team Capacity', value: '82%', change: '−6%', trend: 'down' }
  ],
  analytics: {
    enrollment: [
      { label: 'Cohort Launch Velocity', current: 12, previous: 9 },
      { label: 'Waitlist Conversion', current: 68, previous: 55 },
      { label: 'Completion Rate', current: 92, previous: 88 }
    ],
    revenueStreams: [
      { name: 'Flagship Cohorts', value: 56 },
      { name: 'Mentorship Pods', value: 22 },
      { name: 'E-books', value: 12 },
      { name: 'Sponsored Sessions', value: 10 }
    ]
  },
  communities: {
    createTemplates: [
      { id: 'template-1', name: 'Launch Accelerator', duration: '6 weeks', ingredients: ['Weekly live lab', 'Swarm feedback', 'Accountability pods'] },
      { id: 'template-2', name: 'Research Fellowship', duration: '10 weeks', ingredients: ['Pitch reviews', 'Mentor panels', 'Showcase day'] }
    ],
    manageDeck: [
      { id: 'community-ops', title: 'Community Ops', members: 1430, trend: '+8%', health: 'Stable' },
      { id: 'build-lab', title: 'Build Lab', members: 980, trend: '+14%', health: 'Scaling' },
      { id: 'async-forge', title: 'Async Forge', members: 620, trend: '−3%', health: 'Watch' }
    ],
    webinars: [
      { id: 'web-1', topic: 'Designing inclusive onboarding', date: 'Apr 18, 2024', status: 'Registration live', registrants: 248 },
      { id: 'web-2', topic: 'Systems thinking for async cohorts', date: 'Apr 26, 2024', status: 'Draft agenda', registrants: 187 }
    ],
    podcasts: [
      { id: 'pod-1', episode: 'EP 18 · Post-cohort reflections', stage: 'Editing', release: 'Apr 22' },
      { id: 'pod-2', episode: 'EP 19 · Tutor spotlights', stage: 'Recording', release: 'May 01' }
    ]
  },
  courses: {
    pipeline: [
      { id: 'cohort-ops', name: 'Operational Routines Lab', stage: 'Enrolling', learners: 58, startDate: 'Apr 29' },
      { id: 'systems-sprint', name: 'Systems Sprint Studio', stage: 'Waitlist', learners: 142, startDate: 'May 13' }
    ],
    production: [
      { id: 'prod-1', asset: 'Lesson 3 storyboard', owner: 'Riya Patel', status: 'In review' },
      { id: 'prod-2', asset: 'Workshop kit updates', owner: 'Alex Romero', status: 'In progress' },
      { id: 'prod-3', asset: 'Async case studies', owner: 'Team', status: 'Ready' }
    ],
    library: [
      { id: 'lib-1', title: 'Facilitation Systems 2.0', format: 'Video series', updated: 'Mar 28' },
      { id: 'lib-2', title: 'Curriculum Templates', format: 'Notion OS', updated: 'Apr 02' },
      { id: 'lib-3', title: 'Community Playbooks', format: 'PDF bundle', updated: 'Mar 17' }
    ]
  },
  schedules: {
    lessons: [
      { id: 'lesson-1', course: 'Operational Routines Lab', topic: 'Sprint cadences', date: 'Apr 22 · 11:00 AM', facilitator: 'Amelia Chen' },
      { id: 'lesson-2', course: 'Systems Sprint Studio', topic: 'Deep feedback clinic', date: 'Apr 24 · 9:00 AM', facilitator: 'Guest: Dylan Scott' }
    ],
    tutor: [
      { id: 'tutor-1', mentor: 'Priya Patel', learners: 6, slots: 'Tue & Thu · 1:00-4:00 PM', notes: 'New rubric applied' },
      { id: 'tutor-2', mentor: 'Alex Romero', learners: 4, slots: 'Wed · 10:00 AM-2:00 PM', notes: 'Automation lab follow-up' }
    ]
  },
  bookings: {
    pipeline: [
      { id: 'booking-1', learner: 'Elias Park', topic: 'Funnel diagnostics', status: 'Awaiting confirmation', requested: 'Apr 19' },
      { id: 'booking-2', learner: 'Noor Hassan', topic: 'Community metrics instrumentation', status: 'Brief received', requested: 'Apr 20' }
    ],
    confirmed: [
      { id: 'booking-3', learner: 'Sasha Flores', topic: 'Program launch review', date: 'Apr 21 · 3:00 PM' },
      { id: 'booking-4', learner: 'Aaron Brooks', topic: 'Mentor onboarding', date: 'Apr 23 · 9:00 AM' }
    ]
  },
  calendar: [
    { id: 'cal-i-1', day: 'Mon', items: ['Office hours (10:00 AM)', 'Sponsor sync (1:00 PM)', 'Build Lab AMA (5:00 PM)'] },
    { id: 'cal-i-2', day: 'Tue', items: ['Tutor sync (9:30 AM)', 'Systems Sprint funnel audit (3:00 PM)'] },
    { id: 'cal-i-3', day: 'Wed', items: ['Recorded content review (All day)'] },
    { id: 'cal-i-4', day: 'Thu', items: ['Community webinar dry run (11:00 AM)', 'Podcast edit session (4:00 PM)'] },
    { id: 'cal-i-5', day: 'Fri', items: ['Launch planning huddle (2:00 PM)'] }
  ],
  ebooks: {
    catalogue: [
      { id: 'eb-i-1', title: 'The Instructor Operating System', status: 'Bestseller', downloads: 862 },
      { id: 'eb-i-2', title: 'Async Rituals Handbook', status: 'New release', downloads: 301 },
      { id: 'eb-i-3', title: 'Mentor Playbooks', status: 'Featured', downloads: 540 }
    ],
    creationPipelines: [
      { id: 'eb-i-4', title: 'Launch Metrics Almanac', stage: 'Drafting', owner: 'Research Pod' },
      { id: 'eb-i-5', title: 'Tutor Calibration Guide', stage: 'Outline', owner: 'Mentor Ops' }
    ]
  },
  ads: {
    active: [
      { id: 'ads-1', name: 'Cohort 4 Early Access', format: 'Social carousel', spend: '$1,240', performance: '3.2x ROAS' },
      { id: 'ads-2', name: 'Mentor Sprint', format: 'Podcast host-read', spend: '$620', performance: '2.4x ROAS' }
    ],
    experiments: [
      { id: 'ads-3', name: 'Webinar boost', hypothesis: 'Increase registrants by 15%', status: 'Testing' },
      { id: 'ads-4', name: 'Community referral loop', hypothesis: 'Reduce acquisition cost by 20%', status: 'Design' }
    ]
  }
};

export const dashboardSearchIndex = [
  { id: 'search-1', role: 'learner', title: 'AI Builders Guild', type: 'Community', url: '/dashboard/learner/communities' },
  { id: 'search-2', role: 'learner', title: 'Product Ops Systems', type: 'Course', url: '/dashboard/learner/courses/course-product-ops' },
  { id: 'search-3', role: 'learner', title: 'Tutor session with Priya Patel', type: 'Booking', url: '/dashboard/learner/bookings' },
  { id: 'search-4', role: 'learner', title: 'Cohort Craft – 2024 Edition', type: 'E-book', url: '/dashboard/learner/ebooks' },
  { id: 'search-5', role: 'learner', title: 'Invoice – Strategy Pods membership', type: 'Financial', url: '/dashboard/learner/financial' },
  { id: 'search-6', role: 'instructor', title: 'Operational Routines Lab', type: 'Course', url: '/dashboard/instructor/courses/manage' },
  { id: 'search-7', role: 'instructor', title: 'Systems Sprint Studio', type: 'Course', url: '/dashboard/instructor/courses/library' },
  { id: 'search-8', role: 'instructor', title: 'Launch Accelerator template', type: 'Community Template', url: '/dashboard/instructor/communities/create' },
  { id: 'search-9', role: 'instructor', title: 'Tutor calibration guide', type: 'E-book Pipeline', url: '/dashboard/instructor/ebooks/create' },
  { id: 'search-10', role: 'instructor', title: 'Webinar: Systems thinking for async cohorts', type: 'Webinar', url: '/dashboard/instructor/communities/webinars' }
];

export const availableDashboardRoles = [
  { id: 'learner', label: 'Learner' },
  { id: 'instructor', label: 'Instructor' }
];
