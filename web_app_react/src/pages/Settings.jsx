import { useEffect, useState } from 'react';
import { User, Mail, Globe, Palette, Camera, Loader2, Save } from 'lucide-react';
import { fetchCurrentProfile, updateCurrentProfile } from '../lib/api';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    preferred_language: 'en',
    preferred_theme: 'dark',
    avatar_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { pushToast, language: currentLanguage, setLanguage, theme, setTheme } = useUiStore();

  useEffect(() => {
    setFormData((prev) => ({ ...prev, preferred_theme: theme }));
  }, [theme]);


  useEffect(() => {
    fetchCurrentProfile().then((data) => {
      setProfile(data);
      setFormData((prev) => ({
        ...prev,
        full_name: data?.full_name ?? '',
        preferred_language: data?.preferred_language ?? 'en',
        preferred_theme: theme,
        avatar_url: data?.avatar_url ?? '',
      }));
    }).catch(console.error);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateCurrentProfile({
        full_name: formData.full_name,
        preferred_language: formData.preferred_language,
        avatar_url: formData.avatar_url,
      });
      
      setLanguage(formData.preferred_language);
      setTheme(formData.preferred_theme);
      
      pushToast({ tone: 'success', message: t('success', currentLanguage) || 'Settings updated successfully' });
    } catch (error) {
      pushToast({ tone: 'danger', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      pushToast({ tone: 'danger', message: t('selectImage', currentLanguage) || 'Please select a valid image file.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      pushToast({ tone: 'danger', message: t('imageSizeError', currentLanguage) || 'Image size must be less than 2MB.' });
      return;
    }

    setUploading(true);
    try {
      const client = (await import('../lib/supabase')).supabase;
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await client.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = client.storage.from('avatars').getPublicUrl(fileName);
      setFormData((current) => ({ ...current, avatar_url: publicUrl }));
      pushToast({ tone: 'success', message: 'Profile picture uploaded! Click Save to apply changes.' });
    } catch (error) {
      pushToast({ tone: 'danger', message: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-grid">
      <header className="PageHeader">
        <div className="header-info">
          <h1>{t('settings', currentLanguage)}</h1>
          <p className="text-soft">{t('profileSettings', currentLanguage)}</p>
        </div>
      </header>

      <section className="SectionCard">
        <form onSubmit={submit} className="settings-form">
          <div className="settings-section">
            <div className="section-info">
              <h3>Personal Information</h3>
              <p className="text-faint">Update your identity and contact details.</p>
            </div>

            <div className="profile-upload-zone">
              <div className="avatar-preview-large">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Avatar" />
                ) : (
                  <div className="avatar-placeholder">
                    {(formData.full_name?.[0] || profile?.email?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <label className="upload-overlay">
                  <input type="file" onChange={handleImageUpload} disabled={uploading} hidden accept="image/*" />
                  {uploading ? <Loader2 className="spinner" /> : <Camera size={20} />}
                </label>
              </div>
              <div className="upload-text">
                <strong>{t('profilePicture', currentLanguage) || 'Profile Picture'}</strong>
                <p className="text-faint">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label><User size={14} /> {t('fullName', currentLanguage)}</label>
                <input 
                  type="text"
                  value={formData.full_name} 
                  onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                  placeholder={t('yourName', currentLanguage)}
                />
              </div>

              <div className="form-field">
                <label><Mail size={14} /> {t('email', currentLanguage)}</label>
                <input type="email" value={profile?.email ?? ''} disabled className="disabled-input" />
              </div>
            </div>
          </div>

          <div className="divider-h" />

          <div className="settings-section">
            <div className="section-info">
              <h3>App Preferences</h3>
              <p className="text-faint">Customize your dashboard experience.</p>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label><Globe size={14} /> {t('language', currentLanguage)}</label>
                <select 
                  value={formData.preferred_language} 
                  onChange={(e) => setFormData(p => ({ ...p, preferred_language: e.target.value }))}
                >
                  <option value="en">{t('english', currentLanguage)}</option>
                  <option value="ar">{t('arabic', currentLanguage)}</option>
                </select>
              </div>
              <div className="form-field">
                <label><Palette size={14} /> Theme</label>
                <select 
                  value={formData.preferred_theme} 
                  onChange={(e) => setFormData(p => ({ ...p, preferred_theme: e.target.value }))}
                >
                  <option value="dark">{t('dark', currentLanguage)}</option>
                  <option value="light">{t('light', currentLanguage)}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={saving || uploading}>
              {saving ? <Loader2 className="spinner" size={18} /> : <Save size={18} />}
              {t('saveChanges', currentLanguage)}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
