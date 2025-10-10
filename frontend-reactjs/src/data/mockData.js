export const communities = [
  {
    id: 'all',
    name: 'All Communities'
  },
  {
    id: 'ai-builders',
    name: 'AI Builders Guild',
    description: 'Weekly masterminds, resource drops, and office hours for AI course creators.',
    image:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
    link: 'https://app.edulure.com/communities/ai-builders',
    members: 3240,
    online: 214,
    admins: 6
  },
  {
    id: 'design-lab',
    name: 'Design Lab',
    description: 'Collaborative sprints and critiques for design-first educators and founders.',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
    link: 'https://app.edulure.com/communities/design-lab',
    members: 1985,
    online: 127,
    admins: 4
  }
];

export const feedPosts = [
  {
    id: 1,
    author: 'Stella Park',
    role: 'Curriculum Architect @ AI Builders Guild',
    avatar: 'https://i.pravatar.cc/100?img=12',
    content:
      '🎉 Just launched our new adaptive lesson flow template. Early access is open to premium instructors this week only! Feedback welcome.',
    tags: ['Launch', 'Templates'],
    postedAt: '12 minutes ago',
    likes: 128,
    comments: 17
  },
  {
    id: 2,
    author: 'Jordan Lee',
    role: 'Founder, Design Lab',
    avatar: 'https://i.pravatar.cc/100?img=32',
    content:
      'Hosting a live teardown of onboarding funnels that convert. Drop your landing pages and I will pick 3 to review live.',
    tags: ['Events', 'Marketing'],
    postedAt: '38 minutes ago',
    likes: 92,
    comments: 24
  },
  {
    id: 3,
    author: 'Amelia Chen',
    role: 'Lead Instructor @ Edulure',
    avatar: 'https://i.pravatar.cc/100?img=45',
    content:
      'We are piloting a new mentorship matching engine. Looking for 20 beta testers from the community to join the next cohort.',
    tags: ['Opportunities'],
    postedAt: '1 hour ago',
    likes: 64,
    comments: 11
  }
];

export const leaderboards = [
  {
    name: 'Course Launch Velocity',
    topMembers: [
      { name: 'Maxwell Rivers', score: '12 launches' },
      { name: 'Sasha Flores', score: '9 launches' },
      { name: 'Chen Wu', score: '7 launches' }
    ]
  },
  {
    name: 'Engagement Champions',
    topMembers: [
      { name: 'Riya Patel', score: '95% response rate' },
      { name: 'Dylan Scott', score: '89% response rate' },
      { name: 'Aaron Brooks', score: '87% response rate' }
    ]
  }
];
