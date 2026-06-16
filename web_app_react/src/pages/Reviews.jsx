import { useEffect, useMemo, useState } from 'react';
import { deleteProductComment, fetchProductComments, subscribeToTables } from '../lib/api';
import { PageHeader, SectionCard } from '../components/ui/SectionCard';
import useUiStore from '../store/useUiStore';

export default function ReviewsPage() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { searchQuery, pushToast } = useUiStore();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchProductComments();
        setComments(data);
      } catch (err) {
        console.error(err);
        pushToast({ tone: 'danger', message: 'Failed to load reviews' });
      } finally {
        setLoading(false);
      }
    };
    load();
    return subscribeToTables('reviews-live', ['product_comments'], load);
  }, []);

  const filteredComments = useMemo(
    () =>
      comments.filter((c) =>
        [
          c.profiles?.full_name,
          c.profiles?.email,
          c.products?.name,
          c.title,
          c.comment,
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      ),
    [comments, searchQuery],
  );

  const averageRating = useMemo(() => {
    if (comments.length === 0) return 0;
    const sum = comments.reduce((acc, c) => acc + Number(c.rating ?? 0), 0);
    return (sum / comments.length).toFixed(1);
  }, [comments]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this review? This action cannot be undone.')) return;
    try {
      await deleteProductComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      pushToast({ tone: 'success', message: 'Review deleted.' });
    } catch (err) {
      pushToast({ tone: 'danger', message: err.message });
    }
  };

  const StarRating = ({ rating }) => (
    <span className="star-rating" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={star <= rating ? '#f59e0b' : 'none'}
          stroke={star <= rating ? '#f59e0b' : '#d1d5db'}
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Customer experience"
        title="Reviews"
        subtitle={`${comments.length} reviews · Average rating: ${averageRating}/5`}
      />

      <SectionCard
        title="User reviews"
        subtitle="Customer reviews and ratings"
      >
        {loading ? (
          <div className="loading-state">Loading reviews...</div>
        ) : filteredComments.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <p>No reviews yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table reviews-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Product</th>
                  <th>Rating</th>
                  <th>Title</th>
                  <th>Comment</th>
                  <th>Purchase Verified</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredComments.map((comment) => (
                  <tr key={comment.id}>
                    <td>
                      <div className="user-cell">
                        <strong>{comment.profiles?.full_name ?? comment.profiles?.email?.split('@')[0] ?? 'Unknown user'}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="product-cell">
                        <img
                          src={comment.products?.image_url || '/placeholder.png'}
                          alt=""
                          width="32"
                          height="32"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span className="product-name">
                          {comment.products?.name ?? 'Unknown product'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <StarRating rating={comment.rating} />
                    </td>
                    <td className="title-cell">{comment.title}</td>
                    <td className="comment-cell">
                      {comment.comment || <span className="muted">No comment</span>}
                    </td>
                    <td>
                      <span className={comment.is_verified_purchase ? 'badge badge-success' : 'badge badge-neutral'}>
                        {comment.is_verified_purchase ? 'Verified' : 'Not Verified'}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(comment.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td>
                      <button
                        className="ghost-button danger"
                        onClick={() => handleDelete(comment.id)}
                        title="Delete review"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <style>{`
        .user-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .user-cell strong {
          font-size: 13px;
        }
        .user-cell small {
          font-size: 11px;
          color: #6b7280;
        }
        .product-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .product-cell img {
          width: 32px;
          height: 32px;
          object-fit: cover;
          border-radius: 4px;
          background: #f3f4f6;
        }
        .product-name {
          font-size: 12px;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .title-cell {
          font-weight: 600;
          font-size: 13px;
          max-width: 150px;
        }
        .comment-cell {
          font-size: 12px;
          color: #374151;
          max-width: 200px;
        }
        .comment-cell .muted {
          color: #9ca3af;
          font-style: italic;
        }
        .date-cell {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-success {
          background: #d1fae5;
          color: #065f46;
        }
        .badge-neutral {
          background: #f3f4f6;
          color: #9ca3af;
        }
        .ghost-button.danger {
          color: #ef4444;
          padding: 4px;
          border-radius: 4px;
        }
        .ghost-button.danger:hover {
          background: #fef2f2;
          color: #dc2626;
        }
        .star-rating {
          display: inline-flex;
          gap: 2px;
        }
        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          color: #9ca3af;
          gap: 12px;
        }
        .empty-state p {
          margin: 0;
          font-size: 14px;
        }
        .reviews-table td {
          vertical-align: middle;
        }
        .reviews-table td:nth-child(4),
        .reviews-table td:nth-child(5) {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
