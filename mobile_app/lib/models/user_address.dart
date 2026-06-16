class UserAddress {
  UserAddress({
    required this.id,
    required this.label,
    required this.fullName,
    required this.phone,
    required this.city,
    required this.street,
    required this.building,
    this.notes,
    required this.isDefault,
    required this.createdAt,
  });

  final String id;
  final String label;
  final String fullName;
  final String phone;
  final String city;
  final String street;
  final String building;
  final String? notes;
  final bool isDefault;
  final DateTime createdAt;

  factory UserAddress.fromMap(Map<String, dynamic> map) {
    return UserAddress(
      id: (map['id'] ?? '').toString(),
      label: (map['label'] ?? '').toString(),
      fullName: (map['full_name'] ?? '').toString(),
      phone: (map['phone'] ?? '').toString(),
      city: (map['city'] ?? '').toString(),
      street: (map['street'] ?? '').toString(),
      building: (map['building'] ?? '').toString(),
      notes: map['notes']?.toString(),
      isDefault: map['is_default'] == true,
      createdAt: map['created_at'] == null
          ? DateTime.now()
          : DateTime.tryParse(map['created_at'].toString()) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap({bool includeId = true}) {
    final map = {
      'label': label,
      'full_name': fullName,
      'phone': phone,
      'city': city,
      'street': street,
      'building': building,
      'notes': notes,
      'is_default': isDefault,
    };
    if (includeId && id.isNotEmpty) {
      map['id'] = id;
    }
    return map;
  }

  UserAddress copyWith({
    String? id,
    String? label,
    String? fullName,
    String? phone,
    String? city,
    String? street,
    String? building,
    String? notes,
    bool? isDefault,
    DateTime? createdAt,
  }) {
    return UserAddress(
      id: id ?? this.id,
      label: label ?? this.label,
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      city: city ?? this.city,
      street: street ?? this.street,
      building: building ?? this.building,
      notes: notes ?? this.notes,
      isDefault: isDefault ?? this.isDefault,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
