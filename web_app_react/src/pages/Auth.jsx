import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';

export default function AuthPage() {
  const { user, signIn, signInWithProvider, error, isLoading, checkSession } = useAuthStore();
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
        
        <div className="auth-divider">
          <span>{t('orContinueWith', language)}</span>
        </div>

        <div className="auth-oauth">
          <button
            className="oauth-button google"
            type="button"
            onClick={() => signInWithProvider('google')}
            disabled={isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </button>
          <button
            className="oauth-button github"
            type="button"
            onClick={() => signInWithProvider('github')}
            disabled={isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </button>
        </div>

        <div className="auth-footer">
          <p>{t('protectedArea', language)}</p>
        </div>
      </section>
    </div>
  );
}
