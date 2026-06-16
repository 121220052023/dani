import { useEffect, useState, useCallback, useRef } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchDashboardData, subscribeToTables } from '../lib/api';
import { PageHeader, SectionCard, SkeletonCards, StatCard } from '../components/ui/SectionCard';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';

const pieColors = ['#2563EB', '#0F766E', '#F97316', '#EF4444', '#8B5CF6'];

export default function DashboardPage() {
  const [state, setState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const { pushToast, language } = useUiStore();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchDashboardData();
      setState(data);
      retryCount.current = 0;
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to load dashboard data');
      
      if (retryCount.current < maxRetries && (err.status >= 500 || err.message?.includes('timeout'))) {
        retryCount.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 5000);
        setTimeout(() => load(), delay);
        return;
      }
      
      pushToast({ tone: 'danger', message: `Dashboard error: ${err.message || 'Unknown error'}` });
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    let isMounted = true;
    
    const initialLoad = async () => {
      if (isMounted) await load();
    };
    
    initialLoad();

    let debounceTimer;
    const debouncedReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isMounted) load();
      }, 500);
    };

    const unsubscribe = subscribeToTables(
      'dashboard-live', 
      ['orders', 'products', 'profiles'],
      debouncedReload
    );

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [load]);

  if (error && !state) {
    return (
      <div className="page-grid">
        <PageHeader
          eyebrow={t('error', language)}
          title={t('dashboard', language)}
          subtitle={t('noData', language)}
        />
        <div className="section-card" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--danger)', marginBottom: '20px' }}>{error}</p>
          <button className="primary-button" onClick={() => { retryCount.current = 0; load(); }}>
            {t('next', language)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Executive overview"
        title={t('dashboard', language)}
        subtitle="Live revenue, fulfillment, staff activity, and campaign movement from Supabase."
      />

      {!state || isLoading ? (
        <SkeletonCards />
      ) : (
        <div className="stats-grid">
          {state.summaryCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}

      {state && (
        <>
          <div className="content-grid two-up">
            <SectionCard title={t('revenue', language)} subtitle={t('last6Months', language)}>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={state.revenueSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text-soft)" />
                    <YAxis stroke="var(--text-soft)" />
                    <Tooltip 
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      dataKey="revenue"
                      stroke="#2563EB"
                      strokeWidth={3}
                      dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title={t('bestSellers', language)} subtitle={t('orderItemQuantity', language)}>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie 
                      data={state.bestSellers} 
                      dataKey="value" 
                      nameKey="name" 
                      innerRadius={60} 
                      outerRadius={95}
                      cx="50%"
                      cy="50%"
                    >
                      {state.bestSellers.map((item, index) => (
                        <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <div className="content-grid two-up">
            <SectionCard title={t('orderStatuses', language)} subtitle={t('fullfillmentDistribution', language)}>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={state.orderBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text-soft)" />
                    <YAxis stroke="var(--text-soft)" />
                    <Tooltip 
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#2563EB" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title={t('recentActivity', language)} subtitle={t('salesActions', language)}>
              <div className="activity-list">
                {state.activityFeed.length === 0 ? (
                  <p className="muted-copy">{t('noRecentActivity', language)}</p>
                ) : (
                  state.activityFeed.map((item) => (
                    <article key={item.id} className="activity-item">
                      <strong>{item.actor}</strong>
                      <p>{item.action}</p>
                      <small>{new Date(item.created_at).toLocaleString()}</small>
                    </article>
                  ))
                )}
              </div>
            </SectionCard>
          </div>

          <SectionCard title={t('employeeTracking', language)} subtitle={t('staffVisibility', language)}>
            <div className="tracking-grid">
              {state.employeeTracking.length === 0 ? (
                <p className="muted-copy">{t('noStaffMembers', language)}</p>
              ) : (
                state.employeeTracking.map((employee) => (
                  <article key={employee.id} className="employee-card">
                    <div>
                      <strong>{employee.name}</strong>
                      <p>{employee.email}</p>
                    </div>
                    <div className="employee-meta">
                      <span className={`status-pill ${employee.status === 'Active' ? 'success' : 'neutral'}`}>{t(employee.status, language)}</span>
                      <span>{t(employee.role, language)}</span>
                      <span>{employee.screenTime}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
