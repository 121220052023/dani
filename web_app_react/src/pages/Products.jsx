import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/ui/Modal';
import { PageHeader, SectionCard } from '../components/ui/SectionCard';
import { deleteProduct, fetchProducts, saveProduct, subscribeToTables } from '../lib/api';
import { fetchFavoriteCountsByProduct } from '../lib/api/favorites';
import { supabase } from '../lib/supabase';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';
import { Heart, Search } from 'lucide-react';

// Helper to highlight matching text
function highlightText(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => 
    regex.test(part) ? (
      <mark key={i} style={{ background: 'var(--primary)', color: 'var(--accent-text)', padding: '0 2px', borderRadius: '2px' }}>{part}</mark>
    ) : (
      part
    )
  );
}

const emptyForm = {
  name: '',
  brand: '',
  category: 'Phones',
  price: '',
  discount_percent: '',
  stock: '',
  image_url: '',
  description: '',
  tags: '',
  is_best_seller: false,
  is_featured: false,
  is_hot_deal: false,
};

const categories = ['Phones', 'Accessories'];
const categoriesAr = ['الهواتف', 'الإكسسوارات'];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [favCounts, setFavCounts] = useState({});
  const { searchQuery, setSearchQuery, pushToast, language } = useUiStore();

  // Fetch favorite counts for all products (admin analytics)
  useEffect(() => {
    const load = () => fetchFavoriteCountsByProduct().then(counts => setFavCounts(counts || {})).catch(console.error);
    load();
    return subscribeToTables('favorites-live-admin', ['favorites'], load);
  }, []);

  useEffect(() => {
    const load = () => fetchProducts().then(setProducts).catch(console.error);
    load();
    return subscribeToTables('products-live', ['products'], load);
  }, []);

  const filteredProducts = useMemo(
    () => products.filter((product) =>
      [product.name, product.brand, product.category].join(' ').toLowerCase().includes(searchQuery.toLowerCase())),
    [products, searchQuery],
  );

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      
      setEditing((current) => ({ ...current, image_url: publicUrl }));
      pushToast({ tone: 'success', message: t('imageUploaded', language) });
    } catch (error) {
      pushToast({ tone: 'danger', message: t('uploadFailed', language) + error.message });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    
    // Validation: name, brand, stock, image required
    if (!editing.name || !editing.name.trim()) {
      pushToast({ tone: 'danger', message: t('nameRequired', language) });
      return;
    }
    if (!/^\p{L}/u.test(editing.name.trim())) {
      pushToast({ tone: 'danger', message: t('nameMustStartWithLetter', language) });
      return;
    }
    if (!editing.brand || !editing.brand.trim()) {
      pushToast({ tone: 'danger', message: t('brandRequired', language) });
      return;
    }
    if (!editing.stock || editing.stock === '') {
      pushToast({ tone: 'danger', message: t('stockRequired', language) });
      return;
    }
    if (!editing.image_url || !editing.image_url.trim()) {
      pushToast({ tone: 'danger', message: t('imageRequired', language) });
      return;
    }
    if (Number(editing.stock) < 0) {
      pushToast({ tone: 'danger', message: t('stockNonNegative', language) });
      return;
    }
    if (Number(editing.price) <= 0) {
      pushToast({ tone: 'danger', message: t('pricePositive', language) });
      return;
    }
    
    try {
      await saveProduct(editing);
      setOpen(false);
      setEditing(emptyForm);
      pushToast({ tone: 'success', message: editing.id ? t('productUpdated', language) : t('productAdded', language) });
    } catch (error) {
      pushToast({ tone: 'danger', message: error.message });
    }
  };

  const toggleFlag = async (id, flags) => {
    try {
      const { error } = await supabase.from('products').update(flags).eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...flags } : p)));
      pushToast({ tone: 'success', message: t('productUpdated', language) });
    } catch (error) {
      pushToast({ tone: 'danger', message: error.message });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      pushToast({ tone: 'success', message: t('productDeleted', language) });
    } catch (error) {
      pushToast({ tone: 'danger', message: error.message });
    }
  };

  const calculateDiscountedPrice = (price, discount) => {
    const numPrice = Number(price);
    const numDiscount = Number(discount) || 0;
    return (numPrice * (1 - numDiscount / 100)).toFixed(2);
  };

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow={t('marketing', language)}
        title={t('products', language)}
        subtitle={t('manageProducts', language)}
        actions={<button className="primary-button" type="button" onClick={() => { setEditing(emptyForm); setOpen(true); }}>{t('addProduct', language)}</button>}
      />

      <div className="search-bar" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
        <div className="search-input-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-soft)' }} />
          <input
            type="text"
            placeholder={t('searchProducts', language) || 'Search products by name, brand, or category...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text)',
              fontSize: '0.9rem'
            }}
          />
        </div>
      </div>

      <SectionCard title={t('catalog', language)} subtitle={t('gridCards', language)}>
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <article key={product.id} className="product-card">
              <div className="product-media" style={{ 
                backgroundImage: product.image_url ? 'url(' + product.image_url + ')' : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                height: '180px'
              }}>
                {!product.image_url && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    background: 'var(--bg-muted)',
                    color: 'var(--text-soft)',
                    fontSize: '2rem'
                  }}>
                    {product.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="product-body">
                <div className="product-heading">
                  <div>
                    <span className="eyebrow">{highlightText(product.category, searchQuery)}</span>
                    <h3>{highlightText(product.name, searchQuery)}</h3>
                    <p>{highlightText(product.brand, searchQuery)}</p>
                  </div>
                  <span
                    className="favorite-count-badge"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: (favCounts[product.id] || 0) > 0 ? 'var(--danger)' : 'var(--text-faint)',
                      background: (favCounts[product.id] || 0) > 0 ? 'var(--danger-soft, rgba(239,68,68,0.1))' : 'var(--bg-muted)',
                    }}
                    title={`${favCounts[product.id] || 0} user(s) favorited this product`}
                  >
                    <Heart
                      size={14}
                      fill={(favCounts[product.id] || 0) > 0 ? 'var(--danger)' : 'none'}
                    />
                    {favCounts[product.id] || 0}
                  </span>
                </div>
                <div className="product-price-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                  {product.discount_percent > 0 && (
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: '900', 
                      color: 'var(--accent-text, #000)', 
                      background: 'var(--accent)', 
                      padding: '4px 10px',
                      borderRadius: '20px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      {product.discount_percent}% OFF
                    </span>
                  )}
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text)', fontWeight: '800' }}>
                    ${calculateDiscountedPrice(product.price, product.discount_percent)}
                  </strong>
                </div>
                <div className="tag-row">
                  {(product.tags ?? []).map((tag) => <span key={tag} className="tag">{tag}</span>)}
                </div>
                <div className="product-flags">
                  <span className={`status-pill ${Number(product.stock) < 5 ? 'danger' : 'success'}`}>{t('stock', language)} {product.stock}</span>
                  {product.is_hot_deal && <button className="status-pill warning" style={{ cursor: 'pointer', border: 'none' }} onClick={() => toggleFlag(product.id, { is_hot_deal: false })} title="Click to remove hot deal">{t('hotDeal', language)}</button>}
                  {product.is_featured && <button className="status-pill primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => toggleFlag(product.id, { is_featured: false })} title="Click to remove featured">{t('featured', language)}</button>}
                  {product.is_best_seller && <button className="status-pill neutral" style={{ cursor: 'pointer', border: 'none' }} onClick={() => toggleFlag(product.id, { is_best_seller: false })} title="Click to remove best seller">{t('bestSeller', language)}</button>}
                  {!product.is_hot_deal && <button className="ghost-button small" style={{ fontSize: '0.65rem', padding: '2px 6px' }} onClick={() => toggleFlag(product.id, { is_hot_deal: true })}>+ {t('hotDeal', language)}</button>}
                  {!product.is_featured && <button className="ghost-button small" style={{ fontSize: '0.65rem', padding: '2px 6px' }} onClick={() => toggleFlag(product.id, { is_featured: true })}>+ {t('featured', language)}</button>}
                  {!product.is_best_seller && <button className="ghost-button small" style={{ fontSize: '0.65rem', padding: '2px 6px' }} onClick={() => toggleFlag(product.id, { is_best_seller: true })}>+ {t('bestSeller', language)}</button>}
                </div>
                <div className="table-actions">
                  <button className="ghost-button" type="button" onClick={() => { setEditing({ ...product, tags: (product.tags ?? []).join(', ') }); setOpen(true); }}>{t('edit', language)}</button>
                  <button className="ghost-button" type="button" onClick={() => handleDelete(product.id)}>{t('delete', language)}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <Modal
        open={open}
        title={editing.id ? t('editProduct', language) : t('addProduct', language)}
        onClose={() => setOpen(false)}
        footer={<button className="primary-button" type="submit" form="product-form">{editing.id ? t('saveChanges', language) : t('createProductBtn', language)}</button>}
      >
        <form id="product-form" className="form-grid" onSubmit={submit}>
          <input value={editing.name} onChange={(event) => setEditing((current) => ({ ...current, name: event.target.value }))} placeholder={t('name', language)} />
          <input value={editing.brand} onChange={(event) => setEditing((current) => ({ ...current, brand: event.target.value }))} placeholder={t('brand', language)} />
          <select value={editing.category} onChange={(event) => setEditing((current) => ({ ...current, category: event.target.value }))}>
            {categories.map((cat, i) => <option key={cat} value={cat}>{language === 'ar' ? categoriesAr[i] : cat}</option>)}
          </select>
          <input value={editing.price} onChange={(event) => setEditing((current) => ({ ...current, price: event.target.value }))} placeholder={t('price', language)} type="number" />
          <input value={editing.discount_percent} onChange={(event) => setEditing((current) => ({ ...current, discount_percent: event.target.value }))} placeholder={t('discount', language)} type="number" />
          <input value={editing.stock} onChange={(event) => setEditing((current) => ({ ...current, stock: event.target.value }))} placeholder={t('stock', language)} type="number" />
          <div className="file-upload-field">
            <label htmlFor="product-image">{t('image', language)}</label>
            <input id="product-image" type="file" onChange={handleFileUpload} accept="image/*" disabled={uploading} />
            {uploading && <span>{t('uploading', language)}</span>}
            {editing.image_url && <img src={editing.image_url} alt="Preview" width="100" style={{ marginTop: '10px' }} />}
          </div>
          <input value={editing.tags} onChange={(event) => setEditing((current) => ({ ...current, tags: event.target.value }))} placeholder={t('tagsHint', language)} />
          <textarea value={editing.description} onChange={(event) => setEditing((current) => ({ ...current, description: event.target.value }))} placeholder={t('description', language)} />
          <label className="checkbox-field"><input type="checkbox" checked={editing.is_best_seller} onChange={(event) => setEditing((current) => ({ ...current, is_best_seller: event.target.checked }))} />{t('bestSeller', language)}</label>
          <label className="checkbox-field"><input type="checkbox" checked={editing.is_featured} onChange={(event) => setEditing((current) => ({ ...current, is_featured: event.target.checked }))} />{t('featured', language)}</label>
          <label className="checkbox-field"><input type="checkbox" checked={editing.is_hot_deal} onChange={(event) => setEditing((current) => ({ ...current, is_hot_deal: event.target.checked }))} />{t('hotDeal', language)}</label>
        </form>
      </Modal>
    </div>
  );
}
