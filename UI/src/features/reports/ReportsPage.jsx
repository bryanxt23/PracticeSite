import { useEffect, useMemo, useState } from "react";
import styles from "./ReportsPage.module.css";
import API from "../../config";
const PAGE_SIZE = 15;

const ACTION_COLORS = {
  Added:        { bg: "#d1fae5", color: "#065f46" },
  Paid:         { bg: "#dbeafe", color: "#1e40af" },
  Edited:       { bg: "#fef3c7", color: "#92400e" },
  Deleted:      { bg: "#fee2e2", color: "#991b1b" },
  "Stock Update": { bg: "#ede9fe", color: "#5b21b6" },
};

function buildPagerPages(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
  const last = totalPages - 1;
  if (page <= 3)        return [0, 1, 2, 3, 4, "...", last];
  if (page >= last - 3) return [0, "...", last-4, last-3, last-2, last-1, last];
  return                       [0, "...", page-1, page, page+1, "...", last];
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("Sales");
  const [salesLogs, setSalesLogs]         = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [search, setSearch]               = useState("");
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");
  const [actionFilter, setActionFilter]   = useState([]);
  const [page, setPage]                   = useState(0);

  useEffect(() => {
    fetch(`${API}/api/activity/report?category=SALES`)
      .then(r => r.json()).then(d => setSalesLogs(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/activity/report?category=INVENTORY`)
      .then(r => r.json()).then(d => setInventoryLogs(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const rawLogs = activeTab === "Sales" ? salesLogs : inventoryLogs;

  const actionTypes = useMemo(() => {
    const set = new Set(rawLogs.map(l => l.actionType).filter(Boolean));
    return Array.from(set).sort();
  }, [rawLogs]);

  const filtered = useMemo(() => {
    return rawLogs.filter(log => {
      if (search) {
        const q = search.toLowerCase();
        const inUser   = (log.username   || "").toLowerCase().includes(q);
        const inTarget = (log.targetName || log.entityName || "").toLowerCase().includes(q);
        const inDetail = (log.details    || log.action     || "").toLowerCase().includes(q);
        const inAction = (log.actionType || "").toLowerCase().includes(q);
        if (!inUser && !inTarget && !inDetail && !inAction) return false;
      }
      if (actionFilter.length > 0 && !actionFilter.includes(log.actionType)) return false;
      if (dateFrom) {
        const logDate = new Date(log.createdAt).toISOString().slice(0, 10);
        if (logDate < dateFrom) return false;
      }
      if (dateTo) {
        const logDate = new Date(log.createdAt).toISOString().slice(0, 10);
        if (logDate > dateTo) return false;
      }
      return true;
    });
  }, [rawLogs, search, actionFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedData  = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pagerPages = buildPagerPages(page, totalPages);

  const toggleAction = (a) =>
    setActionFilter(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  const clearFilters = () => {
    setSearch(""); setDateFrom(""); setDateTo(""); setActionFilter([]); setPage(0);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab); setPage(0); setActionFilter([]);
  };

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>

        {/* ══ Main Card ══════════════════════════════════════════════ */}
        <section className={styles.mainCard}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Reports</h1>
            <div className={styles.headerRight}>
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  className={styles.searchInput}
                  placeholder="Search user, item, details..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabsRow}>
            {["Sales", "Inventory"].map(tab => (
              <button
                key={tab}
                className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ""}`}
                onClick={() => handleTabChange(tab)}
              >
                {tab}
                <span className={`${styles.tabCount} ${activeTab === tab ? styles.tabCountActive : ""}`}>
                  {tab === "Sales" ? salesLogs.length : inventoryLogs.length}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <div className={styles.colUser}>User</div>
              <div className={styles.colAction}>Action</div>
              <div className={styles.colTarget}>
                {activeTab === "Sales" ? "Buyer / Item" : "Item"}
              </div>
              <div className={styles.colDetails}>Details</div>
              <div className={styles.colDate}>Date</div>
              <div className={styles.colTime}>Time</div>
            </div>

            <div className={styles.rows}>
              {pagedData.length === 0 && (
                <div className={styles.emptyMsg}>No activity records found.</div>
              )}
              {pagedData.map(log => {
                const color = ACTION_COLORS[log.actionType] || { bg: "#f3f4f6", color: "#374151" };
                return (
                  <div key={log.id} className={styles.row}>
                    <div className={styles.colUser}>
                      <div className={styles.userAvatar}>
                        {(log.username || "?")[0].toUpperCase()}
                      </div>
                      <span className={styles.userName}>{log.username || "—"}</span>
                    </div>
                    <div className={styles.colAction}>
                      <span
                        className={styles.actionBadge}
                        style={{ background: color.bg, color: color.color }}
                      >
                        {log.actionType || "—"}
                      </span>
                    </div>
                    <div className={styles.colTarget}>
                      {log.targetName || log.entityName || "—"}
                    </div>
                    <div className={styles.colDetails}>
                      {log.details || log.action || "—"}
                    </div>
                    <div className={styles.colDate}>{fmtDate(log.createdAt)}</div>
                    <div className={styles.colTime}>{fmtTime(log.createdAt)}</div>
                  </div>
                );
              })}
            </div>

            <div className={styles.pagination}>
              <span className={styles.pageInfo}>
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              </span>
              <div className={styles.pagerBtns}>
                <button className={styles.pageBtn}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  style={{ opacity: page === 0 ? 0.4 : 1, pointerEvents: page === 0 ? "none" : "auto" }}>‹</button>
                {pagerPages.map((p, idx) =>
                  p === "..." ? <span key={`d${idx}`} style={{ padding: "0 4px", color: "#999" }}>…</span>
                  : <button key={p} className={`${styles.pageBtn} ${p === page ? styles.activePage : ""}`}
                      onClick={() => setPage(p)}>{p + 1}</button>
                )}
                <button className={styles.pageBtn}
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  style={{ opacity: page >= totalPages - 1 ? 0.4 : 1, pointerEvents: page >= totalPages - 1 ? "none" : "auto" }}>›</button>
              </div>
            </div>
          </div>
        </section>

        {/* ══ Filter Panel ══════════════════════════════════════════ */}
        <aside className={styles.filterPanel}>
          <div className={styles.filterHeader}>
            <div className={styles.filterTitleWrap}>
              <span className={styles.filterIcon}>⚙</span>
              <span className={styles.filterTitle}>Filters</span>
            </div>
          </div>

          {/* Date Range */}
          <div className={styles.filterCard}>
            <div className={styles.cardTop}><span className={styles.cardTitle}>Date Range</span></div>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>From</label>
              <input type="date" className={styles.dateInput}
                value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} />
            </div>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>To</label>
              <input type="date" className={styles.dateInput}
                value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} />
            </div>
          </div>

          {/* Action Type */}
          <div className={styles.filterCard}>
            <div className={styles.cardTop}><span className={styles.cardTitle}>Action Type</span></div>
            <div className={styles.optionList}>
              {actionTypes.map(a => {
                const color = ACTION_COLORS[a] || { bg: "#f3f4f6", color: "#374151" };
                return (
                  <label key={a} className={styles.optionRow}>
                    <div className={styles.optionLeft}>
                      <input type="checkbox"
                        checked={actionFilter.includes(a)}
                        onChange={() => { toggleAction(a); setPage(0); }} />
                      <span className={styles.actionDot}
                        style={{ background: color.bg, color: color.color }}>
                        {a}
                      </span>
                    </div>
                    <span className={styles.optionCount}>
                      {rawLogs.filter(l => l.actionType === a).length}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <button className={styles.clearBtn} onClick={clearFilters}>Clear Filters</button>
        </aside>
      </div>
    </div>
  );
}
