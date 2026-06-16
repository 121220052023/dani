import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app/core/providers/app_state_provider.dart';
import 'package:mobile_app/widgets/feedback.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, this.onSupportChat});
  final VoidCallback? onSupportChat;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isRegister = true;
  bool _oauthLoading = false;
  bool _obscurePassword = true;
  String? _oauthProvider;

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
              appState.text(en: 'Account created successfully.', ar: 'تم إنشاء الحساب بنجاح.'),
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
        _showBlockedDialog(appState);
      } else {
        showAppSnackBar(
          context,
          appState.lastError ?? error.toString().replaceFirst('Exception: ', ''),
          isError: true,
        );
      }
    }
  }

  Future<void> _signInWithGoogle(AppStateProvider appState) async {
    setState(() { _oauthLoading = true; _oauthProvider = 'google'; });
    try {
      await appState.signInWithGoogle();
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, appState.lastError ?? error.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() { _oauthLoading = false; _oauthProvider = null; });
    }
  }

  Future<void> _signInWithGitHub(AppStateProvider appState) async {
    setState(() { _oauthLoading = true; _oauthProvider = 'github'; });
    try {
      await appState.signInWithGitHub();
    } catch (error) {
      if (!mounted) return;
      showAppSnackBar(context, appState.lastError ?? error.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() { _oauthLoading = false; _oauthProvider = null; });
    }
  }

  void _showBlockedDialog(AppStateProvider appState) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        title: Text(
          appState.text(en: 'Account Suspended', ar: 'الحساب معلّق'),
          style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold),
        ),
        content: Text(
          appState.text(
            en: 'Your account has been suspended. Contact danimaz534@gmail.com to restore access.',
            ar: 'تم تعليق حسابك. تواصل مع danimaz534@gmail.com لاستعادة الدخول.',
          ),
          style: const TextStyle(color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              appState.clearBlockedFlag();
            },
            child: Text(appState.text(en: 'OK', ar: 'حسنًا'), style: const TextStyle(color: Color(0xFFB4941F))),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await appState.logout();
            },
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
            child: Text(appState.text(en: 'Sign Out', ar: 'تسجيل الخروج')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppStateProvider>();
    final isLoading = appState.isBusy || _oauthLoading;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topRight,
                  radius: 1.5,
                  colors: [const Color(0xFFD4AF37).withValues(alpha: 0.1), Colors.transparent],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFFD4AF37).withValues(alpha: 0.3)),
                          color: Colors.white,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.auto_awesome_rounded, size: 48, color: Color(0xFFD4AF37)),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        appState.text(en: 'VoltCart', ar: 'فولت كارت'),
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: -1),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        appState.text(en: 'Your premium electronics store.', ar: 'متجرك الإلكتروني المتميز.'),
                        textAlign: TextAlign.center,
                        style: TextStyle(color: const Color(0xFF64748B), fontSize: 14),
                      ),
                      const SizedBox(height: 48),

                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 30,
                              offset: const Offset(0, 15),
                            ),
                          ],
                        ),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: _buildSegmentButton(
                                      active: !_isRegister,
                                      label: appState.text(en: 'Login', ar: 'دخول'),
                                      onTap: () => setState(() => _isRegister = false),
                                    ),
                                  ),
                                  Expanded(
                                    child: _buildSegmentButton(
                                      active: _isRegister,
                                      label: appState.text(en: 'Sign Up', ar: 'تسجيل'),
                                      onTap: () => setState(() => _isRegister = true),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 32),

                              if (_isRegister) ...[
                                _buildTextField(
                                  controller: _nameController,
                                  label: appState.text(en: 'Full Name', ar: 'الاسم الكامل'),
                                  icon: Icons.person_outline_rounded,
                                  validator: (v) {
                                  if (_isRegister && (v == null || v.trim().isEmpty)) {
                                    return appState.text(
                                      en: 'Full name is required.',
                                      ar: 'الاسم الكامل مطلوب.',
                                    );
                                  }
                                  if (_isRegister && v != null && !RegExp(r'^[A-Za-z\u0600-\u06FF]').hasMatch(v.trim())) {
                                    return appState.text(
                                      en: 'Full name must start with a letter.',
                                      ar: 'الاسم الكامل يجب أن يبدأ بحرف.',
                                    );
                                  }
                                  return null;
                                },
                                ),
                                const SizedBox(height: 16),
                              ],
                              _buildTextField(
                                controller: _emailController,
                                label: appState.text(en: 'Email Address', ar: 'البريد الإلكتروني'),
                                icon: Icons.email_outlined,
                                keyboardType: TextInputType.emailAddress,
                                validator: (v) {
                                  if (v == null || v.trim().isEmpty) {
                                    return appState.text(
                                      en: 'Email address is required.',
                                      ar: 'البريد الإلكتروني مطلوب.',
                                    );
                                  }
                                  final emailPrefix = v.trim().split('@').first;
                                  if (!RegExp(r'^[A-Za-z]').hasMatch(emailPrefix)) {
                                    return appState.text(
                                      en: 'Email must start with a letter.',
                                      ar: 'البريد الإلكتروني يجب أن يبدأ بحرف.',
                                    );
                                  }
                                  if (!v.contains('@') || !v.contains('.')) {
                                    return appState.text(
                                      en: 'Please enter a valid email address.',
                                      ar: 'يرجى إدخال بريد إلكتروني صحيح.',
                                    );
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              _buildTextField(
                                controller: _passwordController,
                                label: appState.text(en: 'Password', ar: 'كلمة المرور'),
                                icon: Icons.lock_outline_rounded,
                                obscureText: _obscurePassword,
                                isPasswordField: true,
                                onToggleObscure: () => setState(() => _obscurePassword = !_obscurePassword),
                                validator: (v) {
                                  if (v == null || v.isEmpty) {
                                    return appState.text(
                                      en: 'Password is required.',
                                      ar: 'كلمة المرور مطلوبة.',
                                    );
                                  }
                                  if (v.length < 6) {
                                    return appState.text(
                                      en: 'Password must be at least 6 characters.',
                                      ar: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
                                    );
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 32),

                              ElevatedButton(
                                onPressed: isLoading ? null : () => _submit(appState),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFD4AF37),
                                  foregroundColor: Colors.black,
                                  minimumSize: const Size(double.infinity, 56),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  elevation: 0,
                                ),
                                child: isLoading && _oauthProvider == null
                                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                                    : Text(
                                        _isRegister
                                            ? appState.text(en: 'Create Account', ar: 'إنشاء حساب')
                                            : appState.text(en: 'Sign In', ar: 'دخول'),
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                      ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),
                      Text(
                        appState.text(en: 'Or continue with', ar: 'أو المتابعة بواسطة'),
                        style: TextStyle(color: const Color(0xFF94A3B8), fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _buildSocialButton(
                              icon: Icons.g_mobiledata_rounded,
                              label: 'Google',
                              isLoading: _oauthLoading && _oauthProvider == 'google',
                              onTap: isLoading ? null : () => _signInWithGoogle(appState),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildSocialButton(
                              icon: Icons.code_rounded,
                              label: 'GitHub',
                              isLoading: _oauthLoading && _oauthProvider == 'github',
                              onTap: isLoading ? null : () => _signInWithGitHub(appState),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                      TextButton(
                        onPressed: () => Navigator.of(context).maybePop(),
                        child: Text(
                          appState.text(en: 'Continue as Guest', ar: 'المتابعة كضيف'),
                          style: TextStyle(color: const Color(0xFF64748B), fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentButton({required bool active, required String label, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: active ? const Color(0xFFD4AF37) : Colors.transparent, width: 2)),
        ),
        child: Text(label, textAlign: TextAlign.center, style: TextStyle(color: active ? const Color(0xFF0F172A) : const Color(0xFF94A3B8), fontWeight: active ? FontWeight.bold : FontWeight.normal, fontSize: 16)),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool obscureText = false,
    bool isPasswordField = false,
    VoidCallback? onToggleObscure,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      validator: validator,
      style: const TextStyle(color: Color(0xFF0F172A)),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
        prefixIcon: Icon(icon, color: const Color(0xFF94A3B8), size: 20),
        suffixIcon: isPasswordField
            ? IconButton(
                icon: Icon(
                  obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  color: const Color(0xFF94A3B8),
                  size: 20,
                ),
                onPressed: onToggleObscure,
              )
            : null,
        filled: true,
        fillColor: const Color(0xFFF1F5F9),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.05))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFD4AF37))),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.redAccent)),
        focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.redAccent)),
      ),
    );
  }

  Widget _buildSocialButton({
    required IconData icon,
    required String label,
    required VoidCallback? onTap,
    bool isLoading = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: isLoading
            ? const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0F172A))))
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, color: const Color(0xFF0F172A), size: 24),
                  const SizedBox(width: 8),
                  Text(label, style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w600)),
                ],
              ),
      ),
    );
  }
}
