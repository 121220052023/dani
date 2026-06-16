class ChatThread {
  ChatThread({
    required this.id,
    required this.userId,
    required this.assignedSalesId,
    required this.lastSalesReplyAt,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String? assignedSalesId;
  final DateTime? lastSalesReplyAt;
  final DateTime? createdAt;

  factory ChatThread.fromMap(Map<String, dynamic> map) {
    return ChatThread(
      id: map['id'].toString(),
      userId: (map['user_id'] ?? '').toString(),
      assignedSalesId: map['assigned_sales_id']?.toString(),
      lastSalesReplyAt: map['last_sales_reply_at'] == null
          ? null
          : DateTime.tryParse(map['last_sales_reply_at'].toString()),
      createdAt: map['created_at'] == null
          ? null
          : DateTime.tryParse(map['created_at'].toString()),
    );
  }
}

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.threadId,
    required this.senderId,
    required this.senderType,
    required this.message,
    required this.createdAt,
  });

  final String id;
  final String threadId;
  final String? senderId;
  final String senderType;
  final String message;
  final DateTime? createdAt;

  bool get isUser => senderType == 'user';
  bool get isAI => senderType == 'ai';

  factory ChatMessage.fromMap(Map<String, dynamic> map) {
    return ChatMessage(
      id: map['id'].toString(),
      threadId: (map['thread_id'] ?? '').toString(),
      senderId: map['sender_id']?.toString(),
      senderType: (map['sender_type'] ?? 'user').toString(),
      message: (map['message'] ?? '').toString(),
      createdAt: map['created_at'] == null
          ? null
          : DateTime.tryParse(map['created_at'].toString()),
    );
  }
}
