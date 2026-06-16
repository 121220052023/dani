import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader, SectionCard } from '../components/ui/SectionCard';
import { fetchAnalyticsData, subscribeToTables } from '../lib/api';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';
import { exportAnalyticsToPDF, exportAnalyticsToWord } from '../lib/exportUtils';
import { FileDown, FileText } from 'lucide-react';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const { language } = useUiStore();

  useEffect(() => {
    const load = () => fetchAnalyticsData().then(setAnalytics).catch(console.error);
    load();
    return subscribeToTables('analytics-live', ['orders', 'products', 'order_items'], load);
  }, []);

  const handleExportPDF = async () => {
    if (!analytics) return;
    setIsExporting(true);
    try {
      exportAnalyticsToPDF(analytics, language);
      useUiStore.getState().pushToast({ tone: 'success', message: 'PDF exported successfully' });
    } catch (error) {
      useUiStore.getState().pushToast({ tone: 'danger', message: `Export failed: ${error.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = async () => {
    if (!analytics) return;
    setIsExporting(true);
    try {
      await exportAnalyticsToWord(analytics, language);
      useUiStore.getState().pushToast({ tone: 'success', message: 'Word document exported successfully' });
    } catch (error) {
      useUiStore.getState().pushToast({ tone: 'danger', message: `Export failed: ${error.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="page-grid">
      <PageHeader eyebrow={t('admin', language)} title={t('analytics', language)} subtitle="Order cadence and product mix from live records." />

      <div className="page-actions" style={{ marginBottom: '16px' }}>
        <button
          className="ghost-button"
          onClick={handleExportPDF}
          disabled={!analytics || isExporting}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FileDown size={16} />
          {isExporting ? 'Exporting...' : 'Download PDF'}
        </button>
        <button
          className="ghost-button"
          onClick={handleExportWord}
          disabled={!analytics || isExporting}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FileText size={16} />
          {isExporting ? 'Exporting...' : 'Download Word'}
        </button>
      </div>
      {analytics && (
        <div className="content-grid two-up">
          <SectionCard title={t('orders', language)} subtitle={t('last7Days', language)}>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.ordersByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--text-soft)" />
                  <YAxis stroke="var(--text-soft)" />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#2563EB" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
          <SectionCard title={t('category', language)} subtitle={t('catalogSplit', language)}>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.categoryMix} dataKey="value" nameKey="name" outerRadius={90} fill="#2563EB" />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
