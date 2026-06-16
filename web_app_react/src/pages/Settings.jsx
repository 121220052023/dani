import { useEffect, useState } from 'react';
import { fetchCurrentProfile, updateCurrentProfile } from '../lib/commerce';
import { PageHeader, SectionCard } from '../components/ui/SectionCard';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const { theme, setTheme, language, setLanguage, pushToast } = useUiStore();

  useEffect(() => {
    fetchCurrentProfile().then(setProfile).catch(console.error);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await updateCurrentProfile({
        full_name: profile.full_name,
        preferred_language: language,
      });
      pushToast({ tone: 'success', message: t('success', language) });
    } catch (error) {
      pushToast({ tone: 'danger', message: error.message });
    }
  };

  return (
    <div className="page-grid">
      <PageHeader eyebrow={t('preferences', language)} title={t('settings', language)} subtitle={t('profileSettings', language)} />
      {profile && (
        <SectionCard title={t('profileSettings', language)} subtitle="Stored in Supabase profiles">
          <form className="form-grid" onSubmit={submit}>
            <input value={profile.full_name ?? ''} onChange={(event) => setProfile((current) => ({ ...current, full_name: event.target.value }))} placeholder={t('fullName', language)} />
            <input value={profile.email ?? ''} disabled />
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="en">{t('english', language)}</option>
              <option value="ar">{t('arabic', language)}</option>
            </select>
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="light">{t('light', language)}</option>
              <option value="dark">{t('dark', language)}</option>
            </select>
            <button className="primary-button" type="submit">{t('save', language)}</button>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
