import {
  ChatBubbleBottomCenterTextIcon,
  ShieldCheckIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
  MegaphoneIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export const channelTypeMetadata = {
  general: {
    label: 'Discussion',
    description: 'Asynchronous threads with reactions and attachments.',
    icon: ChatBubbleBottomCenterTextIcon
  },
  broadcast: {
    label: 'Broadcast',
    description: 'Announcement stream with role-gated publishing.',
    icon: MegaphoneIcon
  },
  voice: {
    label: 'Voice room',
    description: 'Persistent audio lounge for co-working or live Q&A.',
    icon: MusicalNoteIcon
  },
  'voice-stage': {
    label: 'Stage',
    description: 'Moderated stage with raised hands and spotlight controls.',
    icon: VideoCameraIcon
  },
  live: {
    label: 'Live session',
    description: 'Scheduled live stream or classroom broadcast.',
    icon: VideoCameraIcon
  },
  resources: {
    label: 'Resources',
    description: 'Pinned documents and async modules for fast access.',
    icon: DocumentTextIcon
  }
};

export function getChannelTypeMeta(channelType) {
  return channelTypeMetadata[channelType] ?? {
    label: 'Channel',
    description: 'Conversation or collaboration space.',
    icon: ChatBubbleBottomCenterTextIcon
  };
}
