import { useEffect, useMemo, useState } from 'react';
import { fetchOrders, subscribeToTables, updateOrder } from '../lib/commerce';
import { PageHeader, SectionCard } from '../components/ui/SectionCard';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';

const statuses = ['Preparing', 'Shipped', 'On the way', 'Delivered'];
const statusesAr = ['قيد التحضير', 'تم الشحن', 'في الطريق', 'تم التوصيل'];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const { searchQuery, pushToast, language } = useUiStore();

  useEffect(() => {
    const load = () => fetchOrders().then(setOrders).catch(console.error);
    load();
    return subscribeToTables('orders-live', ['orders'], load);
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => [order.id, order.tracking_code, order.profiles?.full_name, order.profiles?.email].join(' ').toLowerCase().includes(searchQuery.toLowerCase())),
    [orders, searchQuery],
  );

  const save = async (id, patch) => {
    try {
      await updateOrder(id, patch);
      pushToast({ tone: 'success', message: t('success', language) });
    } catch (error) {
      pushToast({ tone: 'danger', message: error.message });
    }
  };

  return (
    <div className="page-grid">
      <PageHeader eyebrow={t('sales', language)} title={t('orders', language)} subtitle="Track fulfillment, update status, and manage tracking codes." />
      <SectionCard title={t('orders', language)} subtitle="Scrollable on mobile and synchronized with Supabase">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('orders', language)}</th>
                <th>{t('name', language)}</th>
                <th>{t('email', language)}</th>
                <th>{t('price', language)}</th>
                <th>Status</th>
                <th>Tracking</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8)}</td>
                  <td>{order.profiles?.full_name ?? t('wholesaleUser', language)}</td>
                  <td>{order.profiles?.email ?? t('noEmail', language)}</td>
                  <td>${Number(order.total_amount).toFixed(2)}</td>
                  <td>
                    <select value={order.status} onChange={(event) => save(order.id, { status: event.target.value })}>
                      {statuses.map((status, i) => <option key={status} value={status}>{language === 'ar' ? statusesAr[i] : status}</option>)}
                    </select>
                  </td>
                  <td>
                    <input value={order.tracking_code} onChange={(event) => save(order.id, { tracking_code: event.target.value })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
