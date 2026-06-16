import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';
import '../../models/user_address.dart';

class AddressesScreen extends StatelessWidget {
  const AddressesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();
    final theme = Theme.of(context);

    if (appState.isGuest) {
      return Scaffold(
        appBar: AppBar(
          title: Text(appState.text(en: 'Addresses', ar: 'العناوين')),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.location_on_outlined, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                Text(
                  appState.text(
                    en: 'Sign in to manage your addresses.',
                    ar: 'سجل الدخول لإدارة عناوينك.',
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () {
                    Navigator.pop(context);
                  },
                  child: Text(appState.text(en: 'Sign In', ar: 'تسجيل الدخول')),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final addresses = appState.userAddresses;

    return Scaffold(
      appBar: AppBar(
        title: Text(appState.text(en: 'Addresses', ar: 'العناوين')),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddEditModal(context, appState, null),
            tooltip: appState.text(en: 'Add Address', ar: 'إضافة عنوان'),
          ),
        ],
      ),
      body: addresses.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.location_off_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    appState.text(
                      en: 'No saved addresses yet.',
                      ar: 'لا توجد عناوين محفوظة بعد.',
                    ),
                    style: theme.textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: () => _showAddEditModal(context, appState, null),
                    icon: const Icon(Icons.add),
                    label: Text(appState.text(en: 'Add Address', ar: 'إضافة عنوان')),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: addresses.length,
              itemBuilder: (ctx, index) {
                final addr = addresses[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                      child: Icon(
                        Icons.location_on,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
                    ),
                    title: Text(addr.fullName),
                    subtitle: Text('${addr.city}, ${addr.street}'),
                    trailing: PopupMenuButton<String>(
                      onSelected: (value) {
                        if (value == 'edit') {
                          _showAddEditModal(ctx, appState, addr);
                        } else if (value == 'delete') {
                          _confirmDelete(ctx, appState, addr);
                        }
                      },
                      itemBuilder: (_) => [
                        PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              const Icon(Icons.edit, size: 20),
                              const SizedBox(width: 8),
                              Text(appState.text(en: 'Edit', ar: 'تعديل')),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              const Icon(Icons.delete, size: 20, color: Colors.red),
                              const SizedBox(width: 8),
                              Text(
                                appState.text(en: 'Delete', ar: 'حذف'),
                                style: const TextStyle(color: Colors.red),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  void _confirmDelete(BuildContext context, AppStateProvider appState, UserAddress addr) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(appState.text(en: 'Delete Address', ar: 'حذف العنوان')),
        content: Text(appState.text(
          en: 'Are you sure you want to delete this address?',
          ar: 'هل أنت متأكد من حذف هذا العنوان؟',
        )),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(appState.text(en: 'Cancel', ar: 'إلغاء')),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await appState.deleteAddress(addr.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(appState.text(
                        en: 'Address deleted.',
                        ar: 'تم حذف العنوان.',
                      )),
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(e.toString()),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: Text(appState.text(en: 'Delete', ar: 'حذف')),
          ),
        ],
      ),
    );
  }

  void _showAddEditModal(BuildContext context, AppStateProvider appState, UserAddress? existing) {
    final fullNameCtrl = TextEditingController(text: existing?.fullName ?? appState.currentUser?.fullName ?? '');
    final phoneCtrl = TextEditingController(text: existing?.phone ?? '');
    final cityCtrl = TextEditingController(text: existing?.city ?? '');
    final streetCtrl = TextEditingController(text: existing?.street ?? '');
    final buildingCtrl = TextEditingController(text: existing?.building ?? '');
    bool isDefault = existing?.isDefault ?? false;
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            16,
            16,
            MediaQuery.of(ctx).viewInsets.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                existing == null
                    ? appState.text(en: 'Add Address', ar: 'إضافة عنوان')
                    : appState.text(en: 'Edit Address', ar: 'تعديل العنوان'),
                style: Theme.of(ctx).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: fullNameCtrl,
                decoration: InputDecoration(
                  labelText: appState.text(en: 'Full Name', ar: 'الاسم الكامل'),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                decoration: InputDecoration(
                  labelText: appState.text(en: 'Phone', ar: 'الهاتف'),
                  border: const OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: cityCtrl,
                decoration: InputDecoration(
                  labelText: appState.text(en: 'City', ar: 'المدينة'),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: streetCtrl,
                decoration: InputDecoration(
                  labelText: appState.text(en: 'Street', ar: 'الشارع'),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: buildingCtrl,
                decoration: InputDecoration(
                  labelText: appState.text(en: 'Building / Notes', ar: 'المبنى / ملاحظات'),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              CheckboxListTile(
                value: isDefault,
                onChanged: (v) => setModalState(() => isDefault = v ?? false),
                title: Text(appState.text(en: 'Set as default address', ar: 'تعيين كعنوان افتراضي')),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: Text(appState.text(en: 'Cancel', ar: 'إلغاء')),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: isSaving
                          ? null
                          : () async {
                              if (cityCtrl.text.isEmpty || streetCtrl.text.isEmpty) {
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                  SnackBar(
                                    content: Text(appState.text(
                                      en: 'City and street are required',
                                      ar: 'المدينة والشارع مطلوبان',
                                    )),
                                  ),
                                );
                                return;
                              }
                              setModalState(() => isSaving = true);
                              try {
                                if (existing == null) {
                                  await appState.createAddress(UserAddress(
                                    id: '',
                                    label: 'Home',
                                    fullName: fullNameCtrl.text.trim(),
                                    phone: phoneCtrl.text.trim(),
                                    city: cityCtrl.text.trim(),
                                    street: streetCtrl.text.trim(),
                                    building: buildingCtrl.text.trim(),
                                    notes: null,
                                    isDefault: isDefault,
                                    createdAt: DateTime.now(),
                                  ));
                                } else {
                                  await appState.updateAddress(existing.copyWith(
                                    fullName: fullNameCtrl.text.trim(),
                                    phone: phoneCtrl.text.trim(),
                                    city: cityCtrl.text.trim(),
                                    street: streetCtrl.text.trim(),
                                    building: buildingCtrl.text.trim(),
                                    isDefault: isDefault,
                                  ));
                                }
                                if (ctx.mounted) Navigator.pop(ctx);
                              } catch (e) {
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                  SnackBar(content: Text(e.toString())),
                                );
                              } finally {
                                setModalState(() => isSaving = false);
                              }
                            },
                      child: isSaving
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(appState.text(en: 'Save', ar: 'حفظ')),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}