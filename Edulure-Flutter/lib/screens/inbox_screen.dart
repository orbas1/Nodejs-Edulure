import 'package:flutter/material.dart';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> {
  int selectedIndex = 0;

  final List<_InboxThread> threads = [
    _InboxThread(
      title: 'Growth Ops Squad',
      preview: 'Need the latest deck for Module 3.',
      timestamp: '2h ago',
      unreadCount: 2,
      participants: const ['Evelyn', 'Marcus', 'You'],
      messages: const [
        _InboxMessage(
          author: 'Evelyn Carter',
          body:
              'Can someone drop the updated Module 3 deck here? I want to share it with the new facilitators.',
          sentAt: '09:18',
          fromMe: false,
        ),
        _InboxMessage(
          author: 'Marcus Lee',
          body: 'Uploading now. I added the new breakout room prompts too.',
          sentAt: '09:21',
          fromMe: false,
        ),
        _InboxMessage(
          author: 'You',
          body:
              'Appreciate it! I will turn it into a download in the content library later today.',
          sentAt: '09:23',
          fromMe: true,
        ),
      ],
    ),
    _InboxThread(
      title: 'Learner Support',
      preview: 'Reminder to send async recap.',
      timestamp: 'Yesterday',
      unreadCount: 0,
      participants: const ['Support Team'],
      messages: const [
        _InboxMessage(
          author: 'Support Team',
          body:
              'Learners loved the live clinic. Can we package up a recap email with the replay + slides?',
          sentAt: '19:14',
          fromMe: false,
        ),
        _InboxMessage(
          author: 'You',
          body:
              'On it! Drafting the email in ConvertKit and will schedule it for the morning.',
          sentAt: '19:22',
          fromMe: true,
        ),
      ],
    ),
    _InboxThread(
      title: 'Faculty Chat',
      preview: 'Next week we\'re testing the sprint format.',
      timestamp: 'Mon',
      unreadCount: 1,
      participants: const ['Team Faculty'],
      messages: const [
        _InboxMessage(
          author: 'You',
          body: 'Thanks again for the session swap yesterday!',
          sentAt: '16:02',
          fromMe: true,
        ),
        _InboxMessage(
          author: 'Priya Patel',
          body:
              'No problem. Next week we\'re testing the sprint format, so expect higher check-in volume.',
          sentAt: '16:09',
          fromMe: false,
        ),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final selectedThread = threads[selectedIndex];

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 760;

        Widget threadList = _ThreadList(
          threads: threads,
          selectedIndex: selectedIndex,
          onSelected: (value) {
            setState(() {
              selectedIndex = value;
            });
          },
        );

        Widget conversation = _ConversationPane(thread: selectedThread);

        return Scaffold(
          appBar: AppBar(
            title: const Text('Messages'),
          ),
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: isWide
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(width: 280, child: threadList),
                      const SizedBox(width: 16),
                      Expanded(child: conversation),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      threadList,
                      const SizedBox(height: 16),
                      Expanded(child: conversation),
                    ],
                  ),
          ),
        );
      },
    );
  }
}

class _ThreadList extends StatelessWidget {
  const _ThreadList({
    required this.threads,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<_InboxThread> threads;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: ListView.separated(
        shrinkWrap: true,
        itemCount: threads.length,
        separatorBuilder: (_, __) => const Divider(height: 0),
        itemBuilder: (context, index) {
          final thread = threads[index];
          final isSelected = index == selectedIndex;
          return Material(
            color:
                isSelected ? Theme.of(context).colorScheme.primary.withOpacity(0.08) : Colors.transparent,
            child: ListTile(
              onTap: () => onSelected(index),
              title: Text(thread.title, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text(thread.preview, maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: -4,
                    children: thread.participants
                        .map((participant) => Chip(
                              label: Text(participant),
                              visualDensity: VisualDensity.compact,
                              padding: EdgeInsets.zero,
                            ))
                        .toList(),
                  ),
                ],
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(thread.timestamp, style: Theme.of(context).textTheme.bodySmall),
                  if (thread.unreadCount > 0) ...[
                    const SizedBox(height: 6),
                    CircleAvatar(
                      radius: 12,
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      child: Text(
                        thread.unreadCount.toString(),
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ConversationPane extends StatelessWidget {
  const _ConversationPane({required this.thread});

  final _InboxThread thread;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
            decoration: BoxDecoration(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(thread.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      Text('Participants · ${thread.participants.join(', ')}'),
                    ],
                  ),
                ),
                FilledButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.call_outlined),
                  label: const Text('Start call'),
                ),
              ],
            ),
          ),
          const Divider(height: 0),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: thread.messages.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final message = thread.messages[index];
                final alignment =
                    message.fromMe ? CrossAxisAlignment.end : CrossAxisAlignment.start;
                final bubbleColor = message.fromMe
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.surfaceVariant;
                final textColor = message.fromMe ? Colors.white : Colors.black87;
                return Column(
                  crossAxisAlignment: alignment,
                  children: [
                    Text(
                      message.author,
                      style: Theme.of(context)
                          .textTheme
                          .labelMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      decoration: BoxDecoration(
                        color: bubbleColor,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Text(message.body, style: TextStyle(color: textColor)),
                    ),
                    const SizedBox(height: 4),
                    Text(message.sentAt, style: Theme.of(context).textTheme.bodySmall),
                  ],
                );
              },
            ),
          ),
          const Divider(height: 0),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Write a message... ',
                      filled: true,
                      fillColor:
                          Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    ),
                    minLines: 1,
                    maxLines: 4,
                  ),
                ),
                const SizedBox(width: 12),
                FilledButton(
                  onPressed: () {},
                  child: const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InboxThread {
  const _InboxThread({
    required this.title,
    required this.preview,
    required this.timestamp,
    required this.unreadCount,
    required this.participants,
    required this.messages,
  });

  final String title;
  final String preview;
  final String timestamp;
  final int unreadCount;
  final List<String> participants;
  final List<_InboxMessage> messages;
}

class _InboxMessage {
  const _InboxMessage({
    required this.author,
    required this.body,
    required this.sentAt,
    required this.fromMe,
  });

  final String author;
  final String body;
  final String sentAt;
  final bool fromMe;
}
