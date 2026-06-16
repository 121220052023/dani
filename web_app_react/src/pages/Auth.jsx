import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';

export default function AuthPage() {
  const { user, signIn, error, isLoading, checkSession } = useAuthStore();
  const { language } = useUiStore();
  const [form, setForm] = useState({ email: '', password: '', showPassword: false });
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkSession().catch(() => {});
  }, [checkSession]);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    
    if (isLoading) return;
    
    if (!form.email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!form.password.trim()) {
      setLocalError('Please enter your password.');
      return;
    }
    
    setLocalError('');
    
    try {
      const success = await signIn(form.email, form.password);
      if (success) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Sign in error:', err);
    }
  };

  // Map raw Supabase/network errors to human-friendly messages
  function friendlyError(raw) {
    if (!raw) return '';
    const msg = raw.toLowerCase();
    if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password')) {
      return 'Incorrect email or password. Please check your credentials and try again.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Your email address has not been verified. Please check your inbox.';
    }
    if (msg.includes('too many') || msg.includes('rate limit')) {
      return 'Too many login attempts. Please wait a moment and try again.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    if (msg.includes('staff') || msg.includes('restricted') || msg.includes('retail')) {
      return 'Access denied. This portal is for admin, sales, and marketing accounts only.';
    }
    if (msg.includes('blocked')) {
      return 'Your account has been suspended. Please contact an administrator.';
    }
    return raw;
  }

  const displayError = localError || friendlyError(error);

  return (
    <div className="auth-shell" data-theme="light">
      <section className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/icon.png" alt="Volt Cart" style={{ height: '36px', width: 'auto', borderRadius: '8px' }} />
          </div>
          <span className="eyebrow">{t('staffUser', language)}</span>
          <h1>{t('signIn', language)}</h1>
          <p className="auth-description">
            {t('adminStaffMarketingOnly', language)}
          </p>
        </div>
        
        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>{t('email', language)}</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => {
                setForm((current) => ({ ...current, email: event.target.value }));
                setLocalError('');
              }}
              placeholder={t('yourEmail', language)}
              disabled={isLoading}
              autoComplete="email"
            />
          </label>
          
          <label>
            <span>{t('password', language)}</span>
            <div className="password-field">
              <input
                type={form.showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => {
                  setForm((current) => ({ ...current, password: event.target.value }));
                  setLocalError('');
                }}
                placeholder={t('signInToContinue', language)}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="icon-button small"
                onClick={() => setForm((current) => ({ ...current, showPassword: !current.showPassword }))}
                aria-label={form.showPassword ? 'Hide password' : 'Show password'}
              >
                {form.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          
          {displayError && (
            <div className="form-error">
              <span className="error-icon">⚠</span>
              {displayError}
            </div>
          )}
          
          <button 
            className="primary-button auth-submit" 
            type="submit" 
            disabled={isLoading || !form.email || !form.password}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                {t('loading', language)}
              </>
            ) : (
              t('signIn', language)
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Protected area. Authorized personnel only.</p>
        </div>
      </section>
    </div>
  );
}
