class ShippingAddress {
  ShippingAddress({
    required this.fullName,
    required this.phone,
    required this.city,
    required this.street,
    required this.building,
    required this.notes,
  });

  final String fullName;
  final String phone;
  final String city;
  final String street;
  final String building;
  final String notes;

  Map<String, dynamic> toJson() {
    return {
      'full_name': fullName,
      'phone': phone,
      'city': city,
      'street': street,
      'building': building,
      'notes': notes,
    };
  }
}
