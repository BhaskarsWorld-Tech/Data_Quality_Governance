'use client'
import { useState } from 'react'

type Issue = { rule: string; severity: 'critical' | 'warning' | 'info'; detail: string; impact: string }
type Asset = {
  id: string; name: string; schema: string; type: string; domain: string
  owner: string; score: number; columns: number; rows: string; tags: string[]
  connection: string; updated: string; desc: string; issues: Issue[]
}

const assets: Asset[] = [
  {
    id: 'c1', name: 'SALES_ORDERS', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Finance',
    owner: 'Bhaskar R.', score: 94, columns: 15, rows: '48.7K', tags: ['core', 'revenue'],
    connection: 'SF_Data', updated: '2026-05-27 06:00',
    desc: 'Sales order transactions with line-item revenue, discounts, shipping, and fulfillment status.',
    issues: [
      { rule: 'Net Amount > 0 Validity', severity: 'warning', detail: '412 records (0.8%) have net_amount ≤ 0 — likely returns or adjustments', impact: 'Minor revenue calculation skew in finance reports' },
      { rule: 'Freshness Check', severity: 'info', detail: 'Table refreshed 12 min ago — within SLA', impact: 'No impact' },
    ],
  },
  {
    id: 'c2', name: 'CUSTOMERS', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Marketing',
    owner: 'Priya M.', score: 81, columns: 14, rows: '12.5K', tags: ['pii', 'customer'],
    connection: 'SF_Data', updated: '2026-05-26 10:00',
    desc: 'Customer master dimension with contact info, segment, credit limit, and address details.',
    issues: [
      { rule: 'Email Format Check', severity: 'critical', detail: '2,490 records (20%) have invalid email format', impact: 'Email campaigns will bounce; marketing attribution broken' },
      { rule: 'Address Completeness', severity: 'warning', detail: '1,620 records (13%) missing ADDRESS field', impact: 'Shipping and logistics planning affected' },
      { rule: 'Customer ID Uniqueness', severity: 'info', detail: 'All 12,458 customer IDs are unique', impact: 'No impact' },
    ],
  },
  {
    id: 'c3', name: 'INVENTORY', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Supply Chain',
    owner: 'Rajan S.', score: 76, columns: 8, rows: '3.4K', tags: ['ops', 'stock'],
    connection: 'SF_Data', updated: '2026-05-26 22:00',
    desc: 'Current inventory levels with reorder points, stock quantities, and last restock dates.',
    issues: [
      { rule: 'Quantity ≥ 0', severity: 'critical', detail: '18 SKUs show negative QUANTITY_ON_HAND — likely unmatched returns', impact: 'Incorrect reorder signals; potential over-ordering' },
      { rule: 'Warehouse FK Valid', severity: 'critical', detail: '3 records reference WAREHOUSE_ID not in WAREHOUSES table', impact: 'Broken joins cause NULL warehouse in downstream reports' },
      { rule: 'Freshness SLA', severity: 'warning', detail: 'Last refresh was 8h ago — SLA requires every 4 hours', impact: 'Inventory decisions based on stale data' },
    ],
  },
  {
    id: 'c4', name: 'FINANCE_TRANSACTIONS', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Finance',
    owner: 'Bhaskar R.', score: 62, columns: 12, rows: '95.2K', tags: ['core', 'payments'],
    connection: 'SF_Data', updated: '2026-05-27 08:00',
    desc: 'Financial transaction ledger with payment methods, amounts, and settlement status.',
    issues: [
      { rule: 'Amount NOT NULL', severity: 'critical', detail: '37,130 records (39%) have NULL AMOUNT — column integrity issue', impact: 'Finance reconciliation broken; revenue reports understated' },
      { rule: 'Duplicate Transaction IDs', severity: 'critical', detail: '320 duplicate TRANSACTION_ID values detected', impact: 'Double-counting payments in settlement reports; audit risk' },
      { rule: 'Reference Number Format', severity: 'critical', detail: '1,900 records have malformed REFERENCE_NUMBER', impact: 'Cannot cross-reference with external payment systems' },
      { rule: 'Freshness Check', severity: 'warning', detail: 'Last updated 6h ago — within SLA', impact: 'Acceptable delay' },
    ],
  },
  {
    id: 'c5', name: 'PRODUCTS', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Catalog',
    owner: 'Anil K.', score: 91, columns: 10, rows: '856', tags: ['catalog', 'master'],
    connection: 'SF_Data', updated: '2026-05-20 14:00',
    desc: 'Product catalog with SKU, category hierarchy, pricing, cost, and weight attributes.',
    issues: [
      { rule: 'SKU Uniqueness', severity: 'info', detail: 'All 856 SKUs are unique', impact: 'No impact' },
      { rule: 'Unit Price > 0', severity: 'info', detail: 'All products have valid positive price', impact: 'No impact' },
      { rule: 'Category Completeness', severity: 'warning', detail: '8 products (0.9%) missing CATEGORY_ID — recently added', impact: 'Faceted search returns incomplete results for category filters' },
    ],
  },
  {
    id: 'c6', name: 'PURCHASE_ORDERS', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Supply Chain',
    owner: 'Rajan S.', score: 88, columns: 9, rows: '1.6K', tags: ['procurement'],
    connection: 'SF_Data', updated: '2026-05-24 09:00',
    desc: 'Purchase orders to suppliers with expected delivery dates and order amounts.',
    issues: [
      { rule: 'Expected Delivery Date Valid', severity: 'warning', detail: '45 POs (2.9%) have EXPECTED_DELIVERY in the past', impact: 'Overdue PO alerts not triggering correctly' },
      { rule: 'Supplier FK Valid', severity: 'info', detail: 'All SUPPLIER_IDs reference valid entries in SUPPLIERS table', impact: 'No impact' },
      { rule: 'Total Amount Range', severity: 'info', detail: 'All amounts within expected range ($500–$50K)', impact: 'No impact' },
    ],
  },
  {
    id: 'c7', name: 'RETURNS', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Operations',
    owner: 'Rajan S.', score: 79, columns: 8, rows: '2.9K', tags: ['ops', 'refunds'],
    connection: 'SF_Data', updated: '2026-05-25 11:00',
    desc: 'Product return and refund transactions with reason codes and processing status.',
    issues: [
      { rule: 'Return Reason Valid', severity: 'critical', detail: '68 records (2.4%) have REASON as NULL — mapping incomplete', impact: 'Operations team cannot categorize returns' },
      { rule: 'Refund ≤ Order Amount', severity: 'critical', detail: '14 records have REFUND_AMOUNT > original order TOTAL_AMOUNT', impact: 'Finance overpaying refunds — estimated excess ~$2.8K' },
      { rule: 'Status Completeness', severity: 'warning', detail: '92 returns still in "Pending" status after 5+ days', impact: 'Customer satisfaction risk; SLA penalty exposure' },
    ],
  },
  {
    id: 'c8', name: 'SUPPLIERS', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Supply Chain',
    owner: 'Priya M.', score: 95, columns: 11, rows: '142', tags: ['master', 'vendor'],
    connection: 'SF_Data', updated: '2026-05-10 16:00',
    desc: 'Supplier directory with contact information, ratings, and geographic details.',
    issues: [
      { rule: 'Email Format', severity: 'info', detail: 'All 142 supplier emails are valid', impact: 'No impact' },
      { rule: 'Rating Range (1–5)', severity: 'info', detail: 'All ratings within valid range', impact: 'No impact' },
    ],
  },
  {
    id: 'c9', name: 'WAREHOUSES', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Operations',
    owner: 'Rajan S.', score: 98, columns: 10, rows: '4', tags: ['master', 'locations'],
    connection: 'SF_Data', updated: '2026-04-15 10:00',
    desc: 'Warehouse locations with capacity, manager assignments, and geographic details.',
    issues: [
      { rule: 'Capacity > 0', severity: 'info', detail: 'All warehouses have valid capacity', impact: 'No impact' },
      { rule: 'Manager Assigned', severity: 'info', detail: 'All 4 warehouses have assigned managers', impact: 'No impact' },
    ],
  },
  {
    id: 'c10', name: 'CARRIERS', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Operations',
    owner: 'Anil K.', score: 97, columns: 8, rows: '5', tags: ['master', 'shipping'],
    connection: 'SF_Data', updated: '2026-02-20 10:00',
    desc: 'Shipping carrier directory with contact details and tracking URL templates.',
    issues: [
      { rule: 'Tracking URL Valid', severity: 'info', detail: 'All tracking URLs are well-formed', impact: 'No impact' },
    ],
  },
  {
    id: 'c11', name: 'PRODUCT_CATEGORIES', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Catalog',
    owner: 'Anil K.', score: 100, columns: 5, rows: '8', tags: ['master', 'hierarchy'],
    connection: 'SF_Data', updated: '2026-03-01 10:00',
    desc: 'Product category hierarchy with parent-child relationships.',
    issues: [
      { rule: 'Hierarchy Integrity', severity: 'info', detail: 'All parent references are valid — no orphans', impact: 'No impact' },
    ],
  },
  {
    id: 'c12', name: 'PURCHASE_ORDER_ITEMS', schema: 'SUPPLYCHAIN_DB.SUPPLYCHAIN', type: 'Table', domain: 'Supply Chain',
    owner: 'Rajan S.', score: 93, columns: 6, rows: '4.8K', tags: ['procurement', 'line-items'],
    connection: 'SF_Data', updated: '2026-05-24 09:00',
    desc: 'Line items on purchase orders with product, quantity, and pricing details.',
    issues: [
      { rule: 'Total Price = Qty × Unit Price', severity: 'warning', detail: '23 line items (0.5%) have TOTAL_PRICE mismatch with QUANTITY × UNIT_PRICE', impact: 'Minor discrepancy in procurement cost reports' },
      { rule: 'Product FK Valid', severity: 'info', detail: 'All PRODUCT_IDs reference valid entries in PRODUCTS table', impact: 'No impact' },
    ],
  },
]

function scoreColor(s: number) { return s >= 90 ? '#16a34a' : s >= 80 ? '#ca8a04' : '#dc2626' }
function scoreBg(s: number)    { return s >= 90 ? '#f0fdf4'  : s >= 80 ? '#fefce8'  : '#fee2e2' }
function statusLabel(s: number) { return s >= 90 ? 'Healthy' : s >= 80 ? 'At Risk' : 'Critical' }

const sevCfg = {
  critical: { bg: '#fee2e2', color: '#dc2626', dot: '#dc2626', label: 'Critical' },
  warning:  { bg: '#fef9c3', color: '#ca8a04', dot: '#ca8a04', label: 'Warning'  },
  info:     { bg: '#f0f9ff', color: '#0284c7', dot: '#0284c7', label: 'Passing'  },
}

type Filter = 'all' | 'healthy' | 'at-risk' | 'critical'

export default function CatalogPage() {
  const [search, setSearch]   = useState('')
  const [domain, setDomain]   = useState('all')
  const [filter, setFilter]   = useState<Filter>('all')
  const [selected, setSelected] = useState<Asset | null>(null)

  const domains = ['all', ...Array.from(new Set(assets.map(a => a.domain)))]

  const healthy  = assets.filter(a => a.score >= 90)
  const atRisk   = assets.filter(a => a.score >= 80 && a.score < 90)
  const critical = assets.filter(a => a.score < 80)

  const filtered = assets.filter(a => {
    if (filter === 'healthy'  && a.score < 90) return false
    if (filter === 'at-risk'  && (a.score < 80 || a.score >= 90)) return false
    if (filter === 'critical' && a.score >= 80) return false
    if (domain !== 'all' && a.domain !== domain) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.desc.toLowerCase().includes(search.toLowerCase()) && !a.tags.some(t => t.includes(search.toLowerCase()))) return false
    return true
  })

  const statCards = [
    { key: 'all'      as Filter, label: 'Total Assets',   value: assets.length,    icon: '📦', color: '#475569', border: '#e2e8f0', activeBg: '#f8fafc'  },
    { key: 'healthy'  as Filter, label: 'Healthy (≥90)',  value: healthy.length,   icon: '✅', color: '#16a34a', border: '#bbf7d0', activeBg: '#f0fdf4'  },
    { key: 'at-risk'  as Filter, label: 'At Risk (80–89)',value: atRisk.length,    icon: '⚠️', color: '#ca8a04', border: '#fde68a', activeBg: '#fefce8'  },
    { key: 'critical' as Filter, label: 'Critical (<80)', value: critical.length,  icon: '❌', color: '#dc2626', border: '#fca5a5', activeBg: '#fee2e2'  },
  ]

  return (
    <div style={{ padding: '28px 36px', maxWidth: selected ? '1100px' : '1300px', display: 'flex', gap: '24px' }}>
      {/* Left panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '8px' }}>Workspace · <span style={{ color: '#475569' }}>Analytics platform</span></div>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Data Catalog</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
            {filtered.length} of {assets.length} assets · SUPPLYCHAIN_DB.SUPPLYCHAIN · SF_Data
          </p>
        </div>

        {/* Connection badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 16px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>Connected to SF_Data</span>
          <span style={{ fontSize: '12px', color: '#16a34a', opacity: 0.8 }}>Snowflake · SUPPLYCHAIN_DB · SUPPLYCHAIN · COMPUTE_WH</span>
        </div>

        {/* Clickable stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
          {statCards.map(s => {
            const active = filter === s.key
            return (
              <button key={s.key} onClick={() => setFilter(active ? 'all' : s.key)} style={{
                background: active ? s.activeBg : '#fff',
                border: `2px solid ${active ? s.border : '#ebe8df'}`,
                borderRadius: '12px', padding: '16px 20px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
                boxShadow: active ? `0 0 0 3px ${s.border}40` : 'none',
              }}>
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.icon}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: active ? s.color : '#1a1a1a' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: active ? s.color : '#64748b', fontWeight: active ? 600 : 400, marginTop: '2px' }}>{s.label}</div>
                {active && <div style={{ fontSize: '10px', color: s.color, marginTop: '4px', fontWeight: 600 }}>▲ Filtered</div>}
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets, tags, descriptions…"
            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#fafaf9', color: '#0f172a' }} />
          <select value={domain} onChange={e => setDomain(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#fafaf9', color: '#475569' }}>
            {domains.map(d => <option key={d} value={d}>{d === 'all' ? 'All Domains' : d}</option>)}
          </select>
        </div>

        {/* Asset cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 && (
            <div style={{ background: '#fff', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              No assets match the current filter
            </div>
          )}
          {filtered.map(a => {
            const isSelected = selected?.id === a.id
            const criticalCount  = a.issues.filter(i => i.severity === 'critical').length
            const warningCount   = a.issues.filter(i => i.severity === 'warning').length
            return (
              <div key={a.id} onClick={() => setSelected(isSelected ? null : a)} style={{
                background: '#fff',
                border: `1.5px solid ${isSelected ? '#6366f1' : a.score < 80 ? '#fca5a5' : a.score < 90 ? '#fde68a' : '#d1fae5'}`,
                borderRadius: '14px', padding: '18px 20px', cursor: 'pointer',
                boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.15s',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#1a1a1a', fontSize: '14px', fontFamily: 'monospace' }}>{a.name}</span>
                      <span style={{ background: scoreBg(a.score), color: scoreColor(a.score), fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>{statusLabel(a.score)}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>{a.schema} · {a.type} · {a.domain}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: scoreColor(a.score), lineHeight: 1 }}>{a.score}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>quality score</div>
                  </div>
                </div>

                <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '12px', lineHeight: '1.55' }}>{a.desc}</div>

                {/* Issue summary pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {criticalCount > 0 && (
                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                      ❌ {criticalCount} critical issue{criticalCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span style={{ background: '#fef9c3', color: '#ca8a04', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                      ⚠️ {warningCount} warning{warningCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {criticalCount === 0 && warningCount === 0 && (
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                      ✓ All checks passing
                    </span>
                  )}
                  {a.tags.map(t => <span key={t} style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '20px', fontSize: '11px' }}>{t}</span>)}
                </div>

                {/* Inline issues when selected */}
                {isSelected && (
                  <div style={{ marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quality Check Details</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {a.issues.map((issue, idx) => {
                        const cfg = sevCfg[issue.severity]
                        return (
                          <div key={idx} style={{ background: cfg.bg, borderRadius: '10px', padding: '12px 14px', border: `1px solid ${cfg.color}30` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                              <span style={{ fontWeight: 700, fontSize: '12.5px', color: cfg.color }}>{cfg.label}</span>
                              <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#1a1a1a', flex: 1 }}>{issue.rule}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#374151', marginBottom: '5px', paddingLeft: '15px' }}>{issue.detail}</div>
                            <div style={{ fontSize: '11.5px', color: '#6b7280', paddingLeft: '15px' }}>
                              <strong style={{ color: '#374151' }}>Impact:</strong> {issue.impact}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Metadata footer */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginTop: '12px' }}>
                      {[['Owner', `👤 ${a.owner}`], ['Rows / Cols', `${a.rows} · ${a.columns} cols`], ['Last Updated', a.updated]].map(([k, v]) => (
                        <div key={k} style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                          <div style={{ fontSize: '12px', color: '#1a1a1a', fontWeight: 500 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8', borderTop: '1px solid #f3f1ea', paddingTop: '10px', marginTop: isSelected ? '12px' : '0' }}>
                  <span>❄️ {a.connection} · {a.rows} rows</span>
                  <span style={{ color: '#6366f1', fontWeight: 500 }}>{isSelected ? '▲ Click to collapse' : '▼ Click for details'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
