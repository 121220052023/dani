import { useEffect, useMemo, useState } from "react";
import {
  fetchChatSummaries,
  subscribeToTables,
  updateChatSummary,
} from "../lib/api";
import { PageHeader, SectionCard } from "../components/ui/SectionCard";
import useAuthStore from "../store/useAuthStore";
import useUiStore from "../store/useUiStore";
import { t } from "../lib/i18n";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  MessageSquare,
  Filter,
} from "lucide-react";

const STATUS_FILTERS = ["All", "Pending", "Resolved"];
const STATUS_STYLES = {
  Pending: "warning",
  Resolved: "success",
  In_Progress: "info",
};

export default function SupportSummary() {
  const [summaries, setSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const { user } = useAuthStore();
  const { language, pushToast } = useUiStore();

  useEffect(() => {
    loadSummaries();

    const unsubscribe = subscribeToTables(
      "support-summaries-live",
      ["chat_summaries", "chat_messages"],
      () => loadSummaries(),
    );

    return () => unsubscribe();
  }, []);

  const loadSummaries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchChatSummaries();
      setSummaries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await updateChatSummary(id, {
        resolution_status: "Resolved",
        resolved_by: user.id,
      });
      pushToast({
        message: "Incident marked as resolved",
        tone: "success",
      });
      loadSummaries();
    } catch (err) {
      pushToast({ message: err.message, tone: "danger" });
    }
  };

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      const matchesStatus =
        statusFilter === "All" || s.resolution_status === statusFilter;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        s.issue_description?.toLowerCase().includes(searchLower) ||
        s.user?.full_name?.toLowerCase().includes(searchLower) ||
        s.user?.email?.toLowerCase().includes(searchLower);
      return matchesStatus && matchesSearch;
    });
  }, [summaries, searchQuery, statusFilter]);

  const pendingCount = summaries.filter(
    (s) => s.resolution_status === "Pending",
  ).length;
  const resolvedCount = summaries.filter(
    (s) => s.resolution_status === "Resolved",
  ).length;

  if (isLoading) {
    return (
      <div className="fullscreen-state">
        <RefreshCw className="spinner" size={32} />
        <p>Loading support summaries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fullscreen-state error-state">
        <AlertCircle size={40} className="text-danger" />
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <button className="primary-button" onClick={loadSummaries}>
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Admin Only"
        title="Support Summaries"
        subtitle="Monitor and resolve AI-handled support conversations"
      />

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          className="stat-card"
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <MessageSquare size={20} style={{ color: "var(--primary)" }} />
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-soft)",
                fontWeight: 600,
              }}
            >
              Total Incidents
            </span>
          </div>
          <span style={{ fontSize: "2rem", fontWeight: 800 }}>
            {summaries.length}
          </span>
        </div>

        <div
          className="stat-card"
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <AlertCircle size={20} style={{ color: "#F59E0B" }} />
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-soft)",
                fontWeight: 600,
              }}
            >
              Pending
            </span>
          </div>
          <span style={{ fontSize: "2rem", fontWeight: 800, color: "#F59E0B" }}>
            {pendingCount}
          </span>
        </div>

        <div
          className="stat-card"
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <CheckCircle2 size={20} style={{ color: "#22C55E" }} />
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-soft)",
                fontWeight: 600,
              }}
            >
              Resolved
            </span>
          </div>
          <span style={{ fontSize: "2rem", fontWeight: 800, color: "#22C55E" }}>
            {resolvedCount}
          </span>
        </div>

        <div
          className="stat-card"
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <ShieldCheck size={20} style={{ color: "#8B5CF6" }} />
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-soft)",
                fontWeight: 600,
              }}
            >
              AI Handled
            </span>
          </div>
          <span style={{ fontSize: "2rem", fontWeight: 800, color: "#8B5CF6" }}>
            {summaries.filter((s) => !s.resolved_by).length}
          </span>
        </div>
      </div>

      <SectionCard
        title="Incident Queue"
        subtitle={`${filteredSummaries.length} incident${filteredSummaries.length !== 1 ? "s" : ""}`}
      >
        {/* Search and Filter Bar */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <label
            className="search-bar"
            style={{ flex: 1, minWidth: "200px" }}
          >
            <Search size={16} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, email, or issue..."
            />
          </label>
          <div
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
            }}
          >
            <Filter size={14} style={{ color: "var(--text-soft)" }} />
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                className={`filter-chip ${statusFilter === status ? "active" : ""}`}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  border:
                    statusFilter === status
                      ? "1px solid var(--primary)"
                      : "1px solid var(--border)",
                  background:
                    statusFilter === status
                      ? "var(--primary-soft)"
                      : "var(--surface)",
                  color:
                    statusFilter === status
                      ? "var(--primary)"
                      : "var(--text-soft)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Issue Description</th>
                <th>Status</th>
                <th>Resolved By</th>
                <th>Last Updated</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <CheckCircle2 size={48} style={{ color: "var(--text-faint)" }} />
                      <p style={{ color: "var(--text-soft)", fontSize: "0.95rem" }}>
                        {searchQuery || statusFilter !== "All"
                          ? "No incidents match your filters."
                          : "All incidents resolved! No pending summaries."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        {s.user?.avatar_url ? (
                          <img
                            src={s.user.avatar_url}
                            alt={s.user?.full_name || ''}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              flexShrink: 0,
                              border: "2px solid var(--border)",
                            }}
                          />
                        ) : (
                          <div
                            className="avatar-small"
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: "var(--primary)",
                              color: "var(--bg)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              flexShrink: 0,
                            }}
                          >
                            {s.user?.full_name?.[0] ||
                              s.user?.email?.[0] ||
                              "U"}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: "0.85rem",
                            }}
                          >
                            {s.user?.full_name || "Anonymous"}
                          </span>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-soft)",
                            }}
                          >
                            {s.user?.email || "No email"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          maxWidth: "300px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.85rem",
                        }}
                        title={s.issue_description}
                      >
                        {s.issue_description}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${STATUS_STYLES[s.resolution_status] || "warning"}`}
                      >
                        {s.resolution_status || "Pending"}
                      </span>
                    </td>
                    <td>
                      {s.resolver ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {s.resolver.avatar_url ? (
                            <img src={s.resolver.avatar_url} alt={s.resolver.full_name || ''} style={{
                              width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                            }} />
                          ) : (
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)',
                              color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
                            }}>
                              {(s.resolver.full_name?.[0] || s.resolver.email?.[0] || 'A').toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                            {s.resolver.full_name || s.resolver.email || "Admin"}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-faint)", fontSize: "0.85rem" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "0.8rem",
                          color: "var(--text-soft)",
                        }}
                      >
                        <Clock size={12} />
                        {s.updated_at
                          ? new Date(s.updated_at).toLocaleString()
                          : new Date(s.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {s.resolution_status !== "Resolved" && (
                        <button
                          className="primary-button small"
                          onClick={() => handleResolve(s.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 14px",
                            fontSize: "0.8rem",
                          }}
                        >
                          <CheckCircle2 size={14} />
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
