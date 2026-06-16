import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader, SectionCard } from '../components/ui/SectionCard';
import { fetchAnalyticsData, subscribeToTables } from '../lib/commerce';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const { language } = useUiStore();

  useEffect(() => {
    const load = () => fetchAnalyticsData().then(setAnalytics).catch(console.error);
    load();
    return subscribeToTables('analytics-live', ['orders', 'products', 'order_items'], load);
  }, []);

  return (
    <div className="page-grid">
      <PageHeader eyebrow={t('admin', language)} title={t('analytics', language)} subtitle="Order cadence and product mix from live records." />
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
