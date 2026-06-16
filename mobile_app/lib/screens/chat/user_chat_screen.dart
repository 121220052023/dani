import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';
import '../../models/chat_models.dart';
import '../../widgets/feedback.dart';

class UserChatScreen extends StatefulWidget {
  const UserChatScreen({super.key});

  @override
  State<UserChatScreen> createState() => _UserChatScreenState();
}

class _UserChatScreenState extends State<UserChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  int _lastMessageCount = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await context.read<AppStateProvider>().prepareChat();
      } catch (_) {
        if (!mounted) return;
        showAppSnackBar(
          context,
          'Failed to start chat. Please try again.',
          isError: true,
        );
      }
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send(AppStateProvider appState) async {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    try {
      await appState.sendChatMessage(message);
      _messageController.clear();
      _scrollToBottom();
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, error.toString(), isError: true);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 120,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();
    final messages = appState.chatMessages;
    final theme = Theme.of(context);

    if (messages.length != _lastMessageCount) {
      _lastMessageCount = messages.length;
      _scrollToBottom();
    }

    final lastMessage = messages.isEmpty ? null : messages.last;
    final waitingForSales = lastMessage?.senderType == 'user';

    return Scaffold(
      appBar: AppBar(
        title: Text(appState.text(en: 'Sales chat', ar: 'دردشة المبيعات')),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    theme.colorScheme.primary.withValues(alpha: 0.16),
                    theme.colorScheme.tertiary.withValues(alpha: 0.12),
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                        radius: 18,
                        child: Icon(Icons.support_agent_rounded),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          appState.text(
                            en: 'Wholesale and order support',
                            ar: 'دعم الجملة والطلبات',
                          ),
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: waitingForSales
                              ? const Color(0xFFFFEDD5)
                              : const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          waitingForSales
                              ? appState.text(en: 'Waiting reply', ar: 'بانتظار الرد')
                              : appState.text(en: 'Active', ar: 'نشط'),
                          style: TextStyle(
                            color: waitingForSales
                                ? const Color(0xFFC2410C)
                                : const Color(0xFF15803D),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    appState.text(
                      en: 'If sales does not answer within 5 minutes, AI follows up with: "We will contact you shortly".',
                      ar: 'إذا لم يرد فريق المبيعات خلال 5 دقائق، سيرسل الذكاء الاصطناعي: سنتواصل معك قريبًا.',
                    ),
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: appState.isChatLoading
                ? const Center(child: CircularProgressIndicator())
                : messages.isEmpty
                ? _ChatEmptyState(appState: appState)
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final message = messages[index];
                      final showTime = index == messages.length - 1 ||
                          messages[index + 1].senderType != message.senderType;
                      return _ChatBubble(message: message, showTime: showTime);
                    },
                  ),
          ),
          if (waitingForSales)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    appState.text(
                      en: 'Waiting for a sales reply...',
                      ar: 'بانتظار رد فريق المبيعات...',
                    ),
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ),
            ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: TextField(
                        controller: _messageController,
                        minLines: 1,
                        maxLines: 4,
                        decoration: InputDecoration(
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 14,
                          ),
                          hintText: appState.text(
                            en: 'Ask about orders, wholesale access, or stock...',
                            ar: 'اسأل عن الطلبات أو الجملة أو المخزون...',
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton(
                    onPressed: () => _send(appState),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(62, 56),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                    child: const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatEmptyState extends StatelessWidget {
  const _ChatEmptyState({required this.appState});

  final AppStateProvider appState;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircleAvatar(
              radius: 32,
              child: Icon(Icons.mark_chat_read_rounded, size: 30),
            ),
            const SizedBox(height: 14),
            Text(
              appState.text(
                en: 'Start the conversation',
                ar: 'ابدأ المحادثة',
              ),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              appState.text(
                en: 'Sales can help with wholesale upgrades, tracking updates, and product availability.',
                ar: 'يمكن لفريق المبيعات المساعدة في ترقيات الجملة وتحديثات التتبع وتوفر المنتجات.',
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({
    required this.message,
    required this.showTime,
  });

  final ChatMessage message;
  final bool showTime;

  @override
  Widget build(BuildContext context) {
    final isUser = message.senderType == 'user';
    final isAI = message.senderType == 'ai';
    final theme = Theme.of(context);
    final bubbleColor = isUser
        ? theme.colorScheme.primary
        : isAI
        ? const Color(0xFFFFEDD5)
        : theme.colorScheme.surfaceContainerHighest;

    final textColor = isUser ? Colors.white : theme.colorScheme.onSurface;
    final align = isUser ? Alignment.centerRight : Alignment.centerLeft;

    return Align(
      alignment: align,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(
            crossAxisAlignment:
                isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: bubbleColor,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(20),
                    topRight: const Radius.circular(20),
                    bottomLeft: Radius.circular(isUser ? 20 : 6),
                    bottomRight: Radius.circular(isUser ? 6 : 20),
                  ),
                ),
                child: Column(
                  crossAxisAlignment:
                      isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    Text(
                      isUser
                          ? 'You'
                          : isAI
                          ? 'AI Assistant'
                          : 'Sales',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: isUser
                                ? Colors.white.withValues(alpha: 0.72)
                                : theme.colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      message.message,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: textColor,
                            height: 1.45,
                          ),
                    ),
                  ],
                ),
              ),
              if (showTime && message.createdAt != null) ...[
                const SizedBox(height: 4),
                Text(
                  DateFormat('h:mm a').format(message.createdAt!.toLocal()),
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
