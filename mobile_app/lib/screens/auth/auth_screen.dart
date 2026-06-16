import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';
import '../../widgets/feedback.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    this.onSupportChat,
  });

  final VoidCallback? onSupportChat;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isRegister = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit(AppStateProvider appState) async {
    if (!_formKey.currentState!.validate()) return;

    try {
      if (_isRegister) {
        await appState.signUp(
          fullName: _nameController.text.trim(),
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
        if (!mounted) return;
        showAppSnackBar(
          context,
          appState.lastError ??
              appState.text(
                en: 'Account created successfully.',
                ar: 'تم إنشاء الحساب بنجاح.',
              ),
        );
      } else {
        await appState.signIn(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
        if (!mounted) return;
        Navigator.of(context).maybePop();
      }
    } catch (error) {
      if (!mounted) return;
      if (appState.isBlocked) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(
              appState.text(en: 'Account Suspended', ar: 'الحساب معلّق'),
              style: const TextStyle(color: Colors.red),
            ),
            content: Text(
              appState.text(
                en: 'This account has been suspended. Contact an administrator to restore access.',
                ar: 'تم تعليق هذا الحساب. تواصل مع المسؤول لاستعادة الدخول.',
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  appState.clearBlockedFlag();
                },
                child: Text(appState.text(en: 'OK', ar: 'حسنًا')),
              ),
              FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                  widget.onSupportChat?.call();
                },
                child: Text(appState.text(en: 'Contact Support', ar: 'تواصل مع الدعم')),
              ),
            ],
          ),
        );
      } else {
        showAppSnackBar(context, error.toString(), isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();
    final theme = Theme.of(context);

    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              theme.colorScheme.surface,
              theme.colorScheme.primary.withValues(alpha: 0.08),
              const Color(0xFF0F172A),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 52,
                                height: 52,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(18),
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF2563EB), Color(0xFF38BDF8)],
                                  ),
                                ),
                                child: const Icon(Icons.bolt_rounded, color: Colors.white),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'VoltCart',
                                      style: theme.textTheme.headlineSmall?.copyWith(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    Text(
                                      appState.text(
                                        en: 'Sign in to save carts, favorites, and orders.',
                                        ar: 'سجّل الدخول لحفظ السلة والمفضلة والطلبات.',
                                      ),
                                      style: theme.textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 28),
                          SegmentedButton<bool>(
                            segments: [
                              ButtonSegment(
                                value: false,
                                label: Text(appState.text(en: 'Login', ar: 'دخول')),
                              ),
                              ButtonSegment(
                                value: true,
                                label: Text(appState.text(en: 'Sign up', ar: 'تسجيل')),
                              ),
                            ],
                            selected: {_isRegister},
                            onSelectionChanged: (selection) {
                              setState(() => _isRegister = selection.first);
                            },
                          ),
                          const SizedBox(height: 20),
                          if (_isRegister) ...[
                            TextFormField(
                              controller: _nameController,
                              textInputAction: TextInputAction.next,
                              decoration: InputDecoration(
                                labelText: appState.text(en: 'Full name', ar: 'الاسم الكامل'),
                              ),
                              validator: (value) {
                                if (_isRegister && (value == null || value.trim().isEmpty)) {
                                  return appState.text(
                                    en: 'Enter your name',
                                    ar: 'أدخل اسمك',
                                  );
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),
                          ],
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            decoration: InputDecoration(
                              labelText: appState.text(en: 'Email', ar: 'البريد الإلكتروني'),
                            ),
                            validator: (value) {
                              if (value == null || !value.contains('@')) {
                                return appState.text(
                                  en: 'Enter a valid email',
                                  ar: 'أدخل بريدًا صحيحًا',
                                );
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: true,
                            decoration: InputDecoration(
                              labelText: appState.text(en: 'Password', ar: 'كلمة المرور'),
                            ),
                            validator: (value) {
                              if (value == null || value.length < 6) {
                                return appState.text(
                                  en: 'Minimum 6 characters',
                                  ar: 'الحد الأدنى 6 أحرف',
                                );
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed: appState.isBusy ? null : () => _submit(appState),
                            child: Text(
                              appState.isBusy
                                  ? appState.text(en: 'Please wait...', ar: 'يرجى الانتظار...')
                                  : _isRegister
                                  ? appState.text(en: 'Create account', ar: 'إنشاء حساب')
                                  : appState.text(en: 'Login', ar: 'دخول'),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: appState.isBusy
                                      ? null
                                      : () async {
                                          try {
                                            await appState.signInWithGoogle();
                                          } catch (error) {
                                            if (!mounted) return;
                                            if (context.mounted) {
                                              showAppSnackBar(context, error.toString(), isError: true);
                                            }
                                          }
                                        },
                                  icon: const Icon(Icons.g_mobiledata_rounded),
                                  label: const Text('Google'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: appState.isBusy
                                      ? null
                                      : () async {
                                          try {
                                            await appState.signInWithGitHub();
                                          } catch (error) {
                                            if (!mounted) return;
                                            if (context.mounted) {
                                              showAppSnackBar(context, error.toString(), isError: true);
                                            }
                                          }
                                        },
                                  icon: const Icon(Icons.code_rounded),
                                  label: const Text('GitHub'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: () => Navigator.of(context).maybePop(),
                            child: Text(
                              appState.text(
                                en: 'Continue as guest',
                                ar: 'المتابعة كضيف',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
