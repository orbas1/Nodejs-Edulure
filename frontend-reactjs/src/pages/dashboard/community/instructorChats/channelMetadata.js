import {
  ChatBubbleBottomCenterTextIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

export const channelTypeMetadata = {
  general: {
    label: 'Discussion',
    description: 'Asynchronous threads with reactions and attachments.',
    icon: ChatBubbleBottomCenterTextIcon,
    accent: 'bg-slate-100 text-slate-700',
    recommendedRoles: ['member', 'moderator'],
    compliance: 'Messages subject to community guidelines.'
  },
  direct: {
    label: 'Direct message',
    description: 'Private one-to-one or small group thread.',
    icon: ChatBubbleBottomCenterTextIcon,
    accent: 'bg-slate-100 text-slate-700',
    recommendedRoles: ['member'],
    compliance: 'Subject to participant privacy controls.'
  },
  broadcast: {
    label: 'Broadcast',
    description: 'Announcement stream with role-gated publishing.',
    icon: MegaphoneIcon,
    accent: 'bg-primary/10 text-primary',
    recommendedRoles: ['moderator', 'admin'],
    compliance: 'Requires broadcast permission; posts logged for audit.'
  },
  voice: {
    label: 'Voice room',
    description: 'Persistent audio lounge for co-working or live Q&A.',
    icon: MusicalNoteIcon,
    accent: 'bg-emerald-100 text-emerald-700',
    recommendedRoles: ['member', 'moderator'],
    compliance: 'Voice hosts must accept recording consent prompts.'
  },
  'voice-stage': {
    label: 'Stage',
    description: 'Moderated stage with raised hands and spotlight controls.',
    icon: VideoCameraIcon,
    accent: 'bg-amber-100 text-amber-700',
    recommendedRoles: ['moderator'],
    compliance: 'Stage moderators must review speaker permissions.'
  },
  live: {
    label: 'Live session',
    description: 'Scheduled live stream or classroom broadcast.',
    icon: VideoCameraIcon,
    accent: 'bg-indigo-100 text-indigo-700',
    recommendedRoles: ['moderator', 'instructor'],
    compliance: 'Live sessions require attendance and recording consent.'
  },
  resources: {
    label: 'Resources',
    description: 'Pinned documents and async modules for fast access.',
    icon: DocumentTextIcon,
    accent: 'bg-slate-50 text-slate-600',
    recommendedRoles: ['member'],
    compliance: 'Uploads scanned for personally identifiable information.'
  },
  training: {
    label: 'Training lab',
    description: 'Structured learning modules with progress tracking.',
    icon: AcademicCapIcon,
    accent: 'bg-sky-100 text-sky-700',
    recommendedRoles: ['instructor', 'moderator'],
    compliance: 'Only certified trainers may publish content.'
  }
};

const defaultChannelMeta = {
  label: 'Channel',
  description: 'Conversation or collaboration space.',
  icon: ChatBubbleBottomCenterTextIcon,
  accent: 'bg-slate-100 text-slate-700',
  recommendedRoles: ['member'],
  compliance: 'Interactions moderated under global policy.'
};

export function getChannelTypeMeta(channelType) {
  const meta = channelTypeMetadata[channelType];
  if (!meta) {
    return defaultChannelMeta;
  }
  return { ...defaultChannelMeta, ...meta };
}
