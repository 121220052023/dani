import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/ui/Modal';
import { PageHeader, SectionCard } from '../components/ui/SectionCard';
import { deleteProduct, fetchProducts, saveProduct, subscribeToTables } from '../lib/commerce';
import { supabase } from '../lib/supabase';
import useUiStore from '../store/useUiStore';
import { t } from '../lib/i18n';
import { getRoleLabel } from '../lib/roles';

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
  const { searchQuery, pushToast, language } = useUiStore();

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

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setEditing((current) => ({ ...current, image_url: publicUrlData.publicUrl }));
      pushToast({ tone: 'success', message: t('imageUploaded', language) });
    } catch (error) {
      pushToast({ tone: 'danger', message: t('uploadFailed', language) + error.message });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const load = () => fetchProducts().then(setProducts).catch(console.error);
    load();
    return subscribeToTables('products-live', ['products'], load);
  }, []);

  const filteredProducts = useMemo(
    () => products.filter((product) => [product.name, product.brand, product.category].join(' ').toLowerCase().includes(searchQuery.toLowerCase())),
    [products, searchQuery],
  );

  const submit = async (event) => {
    event.preventDefault();

    if (!/^[A-Za-z]/.test(editing.name.trim())) {
      pushToast({ tone: 'danger', message: t('productNameStartLetter', language) });
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

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      pushToast({ tone: 'success', message: t('productDeleted', language) });
    } catch (error) {
      pushToast({ tone: 'danger', message: error.message });
    }
  };

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow={t('marketing', language)}
        title={t('products', language)}
        subtitle={t('manageProducts', language)}
        actions={<button className="primary-button" type="button" onClick={() => { setEditing(emptyForm); setOpen(true); }}>{t('addProduct', language)}</button>}
      />

      <SectionCard title={t('catalog', language)} subtitle={t('gridCards', language)}>
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <article key={product.id} className="product-card">
              <div className="product-media" style={{ backgroundImage: `url(${product.image_url || ''})` }} />
              <div className="product-body">
                <div className="product-heading">
                  <div>
                    <span className="eyebrow">{product.category}</span>
                    <h3>{product.name}</h3>
                    <p>{product.brand}</p>
                  </div>
                  <strong>${Number(product.price).toFixed(2)}</strong>
                </div>
                <div className="tag-row">
                  {(product.tags ?? []).map((tag) => <span key={tag} className="tag">{tag}</span>)}
                </div>
                <div className="product-flags">
                  <span className={`status-pill ${Number(product.stock) < 5 ? 'danger' : 'success'}`}>{t('stock', language)} {product.stock}</span>
                  {product.is_hot_deal && <span className="status-pill warning">{t('hotDeal', language)}</span>}
                  {product.is_featured && <span className="status-pill primary">{t('featured', language)}</span>}
                  {product.is_best_seller && <span className="status-pill neutral">{t('bestSeller', language)}</span>}
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
