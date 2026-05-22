'use client'
import { useState } from 'react'

interface DataProduct {
  id: string; name: string; description: string; domain: string; owner: string
  status: 'certified' | 'published' | 'draft'; tier: 'gold' | 'silver' | 'bronze'
  qualityScore: number; consumers: number; datasets: number
  sla: string; freshness: string; lastUpdated: string
}

const PRODUCTS: DataProduct[] = [
  { id: 'dp1', name: 'Customer 360', description: 'Unified customer profile combining CRM, transactions, and engagement data', domain: 'Sales', owner: 'Data Platform', status: 'certified', tier: 'gold', qualityScore: 97, consumers: 24, datasets: 8, sla: '99.9%', freshness: '15m ago', lastUpdated: '2026-05-22T10:00:00Z' },
  { id: 'dp2', name: 'Revenue Analytics', description: 'Real-time revenue metrics, forecasting, and trend analysis', domain: 'Finance', owner: 'Finance Team', status: 'certified', tier: 'gold', qualityScore: 98, consumers: 18, datasets: 5, sla: '99.9%', freshness: '5m ago', lastUpdated: '2026-05-22T10:10:00Z' },
  { id: 'dp3', name: 'Marketing Attribution', description: 'Multi-touch attribution model with channel performance metrics', domain: 'Marketing', owner: 'Growth Team', status: 'published', tier: 'silver', qualityScore: 89, consumers: 12, datasets: 6, sla: '99.5%', freshness: '1h ago', lastUpdated: '2026-05-22T09:00:00Z' },
  { id: 'dp4', name: 'Supply Chain Metrics', description: 'Inventory levels, lead times, and supplier performance KPIs', domain: 'Supply Chain', owner: 'Logistics', status: 'published', tier: 'silver', qualityScore: 91, consumers: 8, datasets: 7, sla: '99.5%', freshness: '30m ago', lastUpdated: '2026-05-22T09:30:00Z' },
  { id: 'dp5', name: 'Product Catalog', description: 'Master product data with pricing, categories, and attributes', domain: 'Engineering', owner: 'Product Team', status: 'certified', tier: 'gold', qualityScore: 99, consumers: 32, datasets: 3, sla: '99.9%', freshness: '2m ago', lastUpdated: '2026-05-22T10:13:00Z' },
  { id: 'dp6', name: 'User Behavior Analytics', description: 'Clickstream data with session analytics and conversion funnels', domain: 'Engineering', owner: 'Analytics', status: 'draft', tier: 'bronze', qualityScore: 76, consumers: 4, datasets: 4, sla: '99.0%', freshness: '3h ago', lastUpdated: '2026-05-22T07:00:00Z' },
]

function tierStyle(t: string) {
  if (t === 'gold') return { bg: '#fef3c7', color: '#d97706', icon: '🥇' }
  if (t === 'silver') return { bg: '#f1f5f9', color: '#64748b', icon: '🥈' }
  return { bg: '#fed7aa', color: '#c2410c', icon: '🥉' }
}

function statusStyle(s: string) {
  if (s === 'certified') return { bg: '#dcfce7', color: '#16a34a' }
  if (s === 'published') return { bg: '#dbeafe', color: '#2563eb' }
  return { bg: '#f1f5f9', color: '#94a3b8' }
}

function scoreColor(s: number) { return s >= 90 ? '#16a34a' : s >= 80 ? '#ea8b3a' : '#dc2626' }
function scoreBg(s: number) { return s >= 90 ? '#dcfce7' : s >= 80 ? '#fef3c7' : '#fee2e2' }

const card: React.CSSProperties = { background: '#fff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #ebe8df' }

export default function DataProductsPage() {
  const [filter, setFilter] = useState<'all' | 'certified' | 'published' | 'draft'>('all')
  const filtered = PRODUCTS.filter(p => filter === 'all' || p.status === filter)

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1300px' }}>
      <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '8px' }}>Workspace · <span style={{ color: '#475569' }}>Data Products</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>Data Products</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Curated, trusted datasets available as self-service data products</p>
        </div>
        <button style={{ background: '#E8541A', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>+ Create Product</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Total Products', value: String(PRODUCTS.length), sub: `${PRODUCTS.filter(p => p.status === 'certified').length} certified` },
          { label: 'Total Consumers', value: String(PRODUCTS.reduce((s, p) => s + p.consumers, 0)), sub: 'across all products' },
          { label: 'Avg Quality Score', value: `${Math.round(PRODUCTS.reduce((s, p) => s + p.qualityScore, 0) / PRODUCTS.length)}%` },
          { label: 'SLA Compliance', value: '99.4%', change: '▲ 0.2%', changeColor: '#16a34a' },
        ].map((kpi, i) => (
          <div key={i} style={card}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>{kpi.label}</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-1px' }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {(['all', 'certified', 'published', 'draft'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '12.5px', fontWeight: 500, textTransform: 'capitalize',
            background: filter === f ? '#1a1a1a' : '#f8fafc', color: filter === f ? '#fff' : '#64748b',
          }}>{f}</button>
        ))}
      </div>

      {/* Products Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '14px' }}>
        {filtered.map(p => {
          const tier = tierStyle(p.tier)
          const stat = statusStyle(p.status)
          return (
            <div key={p.id} style={{ ...card, padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{tier.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>{p.name}</div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '1px' }}>{p.domain} · {p.owner}</div>
                  </div>
                </div>
                <span style={{ background: stat.bg, color: stat.color, padding: '3px 10px', borderRadius: '20px', fontSize: '10.5px', fontWeight: 600, textTransform: 'capitalize' }}>{p.status}</span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 14px', lineHeight: 1.5 }}>{p.description}</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span style={{ background: scoreBg(p.qualityScore), color: scoreColor(p.qualityScore), padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Quality: {p.qualityScore}%</span>
                <span style={{ background: '#f0f9ff', color: '#2563eb', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>{p.consumers} consumers</span>
                <span style={{ background: '#faf5ff', color: '#7c3aed', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>{p.datasets} datasets</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8' }}>
                <span>SLA: {p.sla}</span>
                <span>Freshness: {p.freshness}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
