class AppUser {
  AppUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    required this.isBlocked,
    required this.preferredLanguage,
    required this.createdAt,
  });

  final String id;
  final String email;
  final String fullName;
  final String role;
  final bool isBlocked;
  final String preferredLanguage;
  final DateTime? createdAt;

  bool get isWholesale => role == 'wholesale';
  bool get isRetail => role == 'retail';
  String get displayName => fullName.trim().isEmpty ? email : fullName;
  String get shortRole => role[0].toUpperCase() + role.substring(1);

  factory AppUser.fromMap(Map<String, dynamic> map) {
    return AppUser(
      id: map['id'].toString(),
      email: (map['email'] ?? '').toString(),
      fullName: (map['full_name'] ?? '').toString(),
      role: (map['role'] ?? 'retail').toString(),
      isBlocked: map['is_blocked'] == true,
      preferredLanguage: (map['preferred_language'] ?? 'en').toString(),
      createdAt: map['created_at'] == null
          ? null
          : DateTime.tryParse(map['created_at'].toString()),
    );
  }
}
