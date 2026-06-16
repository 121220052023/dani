import { useEffect, useState } from 'react';
import { fetchProducts, subscribeToTables } from '../lib/commerce';
import { PageHeader, SectionCard, StatCard } from '../components/ui/SectionCard';

export default function MarketingPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const load = () => fetchProducts().then(setProducts).catch(console.error);
    load();
    return subscribeToTables('marketing-live', ['products'], load);
  }, []);

  const stats = [
    { label: 'Hot deals', value: products.filter((product) => product.is_hot_deal).length, meta: 'Products in campaign rotation', tone: 'warning' },
    { label: 'Featured', value: products.filter((product) => product.is_featured).length, meta: 'Homepage placements', tone: 'primary' },
    { label: 'Best sellers', value: products.filter((product) => product.is_best_seller).length, meta: 'Merchandising highlights', tone: 'success' },
    { label: 'Discounted', value: products.filter((product) => Number(product.discount_percent) > 0).length, meta: 'Products with active discounts', tone: 'danger' },
  ];

  return (
    <div className="page-grid">
      <PageHeader eyebrow="Campaign control" title="Marketing" subtitle="Manage hot deals, featured products, and best-seller visibility with live catalog data." />
      <div className="stats-grid">
        {stats.map((item) => <StatCard key={item.label} {...item} />)}
      </div>
      <SectionCard title="Campaign inventory" subtitle="Products currently affecting the customer storefront">
        <div className="marketing-list">
          {products.filter((product) => product.is_hot_deal || product.is_featured || product.is_best_seller).map((product) => (
            <article key={product.id} className="marketing-item">
              <div>
                <strong>{product.name}</strong>
                <p>{product.brand} · {product.category}</p>
              </div>
              <div className="product-flags">
                {product.is_hot_deal && <span className="status-pill warning">Hot deal</span>}
                {product.is_featured && <span className="status-pill primary">Featured</span>}
                {product.is_best_seller && <span className="status-pill success">Best seller</span>}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
