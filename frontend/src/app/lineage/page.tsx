'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

/* ─── Types ─── */
interface LineageNode {
  id: string; label: string; sub: string
  type: 'source' | 'raw' | 'transform' | 'warehouse' | 'output'
  icon: string; schema: string; database: string; tableType: string
  rowCount: number | null; columnCount: number
  lastAltered: string | null; comment: string | null
  x?: number; y?: number
}
interface LineageEdge { from: string; to: string; relationship: string }
interface ConnectionInfo { name: string; database: string; schema: string; warehouse: string; status: string }
interface LineageData { nodes: LineageNode[]; edges: LineageEdge[]; connection: ConnectionInfo }
interface ColumnInfo { COLUMN_NAME: string; DATA_TYPE: string; IS_NULLABLE: string; ORDINAL_POSITION: number; CHARACTER_MAXIMUM_LENGTH?: number; NUMERIC_PRECISION?: number; COLUMN_DEFAULT?: string; COMMENT?: string }

/* ─── Static fallback ─── */
const STATIC_NODES: LineageNode[] = [
  { id: 'sf1', label: 'SUPPLYCHAIN_DB', sub: 'Source', type: 'source', icon: '❄️', schema: '', database: 'SUPPLYCHAIN_DB', tableType: 'CONNECTION', rowCount: null, columnCount: 0, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.CARRIERS', label: 'CARRIERS', sub: '100 rows · Master Data', type: 'warehouse', icon: '🚛', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: 100, columnCount: 8, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.CUSTOMERS', label: 'CUSTOMERS', sub: '10 rows · Master Data', type: 'warehouse', icon: '👥', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: 10, columnCount: 14, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.PRODUCTS', label: 'PRODUCTS', sub: 'Master Data', type: 'warehouse', icon: '🧳', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: null, columnCount: 10, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.PRODUCT_CATEGORIES', label: 'PRODUCT_CATEGORIES', sub: 'Master Data', type: 'warehouse', icon: '📦', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: null, columnCount: 5, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.SUPPLIERS', label: 'SUPPLIERS', sub: 'Master Data', type: 'warehouse', icon: '🏭', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: null, columnCount: 10, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.WAREHOUSES', label: 'WAREHOUSES', sub: 'Master Data', type: 'warehouse', icon: '🏪', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: null, columnCount: 8, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.FINANCE_TRANSACTIONS', label: 'FINANCE_TRANSACTIONS', sub: '200 rows · Transact.', type: 'transform', icon: '⚙️', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: 200, columnCount: 12, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.INVENTORY', label: 'INVENTORY', sub: 'Transact.', type: 'transform', icon: '📊', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: null, columnCount: 8, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.PURCHASE_ORDERS', label: 'PURCHASE_ORDERS', sub: 'Transact.', type: 'transform', icon: '📋', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: null, columnCount: 10, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.PURCHASE_ORDER_ITEMS', label: 'PURCHASE_ORDER_ITEMS', sub: 'Transact.', type: 'transform', icon: '📋', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: null, columnCount: 8, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.RETURNS', label: 'RETURNS', sub: 'Transact.', type: 'transform', icon: '↩️', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: null, columnCount: 9, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.CUSTOMER_CREDIT_VIEW', label: 'CUSTOMER_CREDIT_VIEW', sub: 'View', type: 'output', icon: '👥', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'VIEW', rowCount: null, columnCount: 5, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.USA_CUSTOMERS_VIEW', label: 'USA_CUSTOMERS_VIEW', sub: 'View', type: 'output', icon: '👥', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'VIEW', rowCount: null, columnCount: 6, lastAltered: null, comment: null },
]
const STATIC_EDGES: LineageEdge[] = [
  { from: 'sf1', to: 'SUPPLYCHAIN.CARRIERS', relationship: 'source' },
  { from: 'sf1', to: 'SUPPLYCHAIN.CUSTOMERS', relationship: 'source' },
  { from: 'sf1', to: 'SUPPLYCHAIN.PRODUCTS', relationship: 'source' },
  { from: 'sf1', to: 'SUPPLYCHAIN.PRODUCT_CATEGORIES', relationship: 'source' },
  { from: 'sf1', to: 'SUPPLYCHAIN.SUPPLIERS', relationship: 'source' },
  { from: 'sf1', to: 'SUPPLYCHAIN.WAREHOUSES', relationship: 'source' },
  { from: 'SUPPLYCHAIN.CUSTOMERS', to: 'SUPPLYCHAIN.FINANCE_TRANSACTIONS', relationship: 'depends_on' },
  { from: 'SUPPLYCHAIN.PRODUCTS', to: 'SUPPLYCHAIN.INVENTORY', relationship: 'depends_on' },
  { from: 'SUPPLYCHAIN.SUPPLIERS', to: 'SUPPLYCHAIN.PURCHASE_ORDERS', relationship: 'depends_on' },
  { from: 'SUPPLYCHAIN.PRODUCTS', to: 'SUPPLYCHAIN.PURCHASE_ORDER_ITEMS', relationship: 'depends_on' },
  { from: 'SUPPLYCHAIN.PURCHASE_ORDERS', to: 'SUPPLYCHAIN.PURCHASE_ORDER_ITEMS', relationship: 'depends_on' },
  { from: 'SUPPLYCHAIN.CUSTOMERS', to: 'SUPPLYCHAIN.RETURNS', relationship: 'depends_on' },
  { from: 'SUPPLYCHAIN.CUSTOMERS', to: 'SUPPLYCHAIN.CUSTOMER_CREDIT_VIEW', relationship: 'depends_on' },
  { from: 'SUPPLYCHAIN.CUSTOMERS', to: 'SUPPLYCHAIN.USA_CUSTOMERS_VIEW', relationship: 'depends_on' },
  { from: 'SUPPLYCHAIN.WAREHOUSES', to: 'SUPPLYCHAIN.INVENTORY', relationship: 'depends_on' },
]

/* ─── Node visual config ─── */
const NODE_W = 220, NODE_H = 70

const typeConfig: Record<string, { bg: string; border: string; color: string; label: string }> = {
  source:    { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', label: 'Source' },
  raw:       { bg: '#fdf4ff', border: '#e9d5ff', color: '#7e22ce', label: 'Raw' },
  transform: { bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1', label: 'Transactions' },
  warehouse: { bg: '#ecfdf5', border: '#6ee7b7', color: '#065f46', label: 'Master Data' },
  output:    { bg: '#faf5ff', border: '#d8b4fe', color: '#7c3aed', label: 'Views' },
}

const nodeIcon: Record<string, string> = {
  CARRIERS: '🚛', CUSTOMERS: '👥', PRODUCTS: '🧳', PRODUCT_CATEGORIES: '📦',
  SUPPLIERS: '🏭', WAREHOUSES: '🏪', FINANCE_TRANSACTIONS: '⚙️', INVENTORY: '📊',
  PURCHASE_ORDERS: '📋', PURCHASE_ORDER_ITEMS: '📋', RETURNS: '↩️',
  CUSTOMER_CREDIT_VIEW: '👥', USA_CUSTOMERS_VIEW: '👥',
}

/* ─── Layout engine (topological BFS with layer grouping) ─── */
function layoutNodes(nodes: LineageNode[], edges: LineageEdge[]): LineageNode[] {
  const adjOut = new Map<string, string[]>()
  const adjIn = new Map<string, string[]>()
  for (const n of nodes) { adjOut.set(n.id, []); adjIn.set(n.id, []) }
  for (const e of edges) {
    adjOut.get(e.from)?.push(e.to)
    adjIn.get(e.to)?.push(e.from)
  }

  const layers = new Map<string, number>()
  const roots = nodes.filter(n => (adjIn.get(n.id) ?? []).length === 0)
  const queue = roots.map(n => ({ id: n.id, layer: 0 }))
  const visited = new Set<string>()

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!
    if (visited.has(id)) { layers.set(id, Math.max(layers.get(id) ?? 0, layer)); continue }
    visited.add(id)
    layers.set(id, layer)
    for (const child of adjOut.get(id) ?? []) queue.push({ id: child, layer: layer + 1 })
  }
  for (const n of nodes) { if (!layers.has(n.id)) layers.set(n.id, 0) }

  const layerGroups = new Map<number, string[]>()
  for (const [id, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, [])
    layerGroups.get(layer)!.push(id)
  }

  const LAYER_X = 290
  const START_X = 60
  const START_Y = 80
  const GAP_Y = 90

  return nodes.map(n => {
    const layer = layers.get(n.id) ?? 0
    const group = layerGroups.get(layer) ?? [n.id]
    const idx = group.indexOf(n.id)
    return { ...n, x: START_X + layer * LAYER_X, y: START_Y + idx * GAP_Y }
  })
}

/* ─── Data type icon helper ─── */
function dtIcon(dt: string): { symbol: string; color: string } {
  const t = dt.toUpperCase()
  if (t.includes('NUMBER') || t.includes('INT') || t.includes('FLOAT') || t.includes('DECIMAL') || t.includes('NUMERIC'))
    return { symbol: '#', color: '#2563eb' }
  if (t.includes('DATE') || t.includes('TIME') || t.includes('TIMESTAMP'))
    return { symbol: '📅', color: '#7c3aed' }
  if (t.includes('BOOL'))
    return { symbol: '◉', color: '#16a34a' }
  return { symbol: 'A', color: '#64748b' }
}

/* ─── Main ─── */
export default function LineagePage() {
  const [data, setData] = useState<LineageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [columnData, setColumnData] = useState<ColumnInfo[] | null>(null)
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [columnSearch, setColumnSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchLineage = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/snowflake/lineage')
      if (res.ok) {
        const json = await res.json()
        if (json.nodes && json.nodes.length > 0) {
          // Assign better icons from our map
          json.nodes = json.nodes.map((n: LineageNode) => ({
            ...n,
            icon: nodeIcon[n.label] || n.icon,
          }))
          setData(json); setIsLive(true); setLoading(false); return
        }
      }
    } catch { /* fallback */ }
    setData({
      nodes: STATIC_NODES, edges: STATIC_EDGES,
      connection: { name: 'SUPPLYCHAIN_DB', database: 'SUPPLYCHAIN_DB', schema: 'SUPPLYCHAIN', warehouse: 'COMPUTE_WH', status: 'demo' },
    })
    setIsLive(false); setLoading(false)
  }, [])

  useEffect(() => { fetchLineage() }, [fetchLineage])

  // Fetch columns when a node is selected
  useEffect(() => {
    if (!selected) { setColumnData(null); return }
    const node = data?.nodes.find(n => n.id === selected)
    if (!node || node.type === 'source') { setColumnData(null); return }
    setColumnsLoading(true); setColumnSearch('')
    fetch(`/api/snowflake/columns?table=${encodeURIComponent(node.label)}`)
      .then(r => r.json())
      .then(d => setColumnData(d.columns ?? []))
      .catch(() => {
        // For demo mode, generate mock columns
        if (!isLive) {
          const mockCols: ColumnInfo[] = Array.from({ length: node.columnCount || 8 }, (_, i) => ({
            COLUMN_NAME: i === 0 ? `${node.label.replace(/S$/, '')}_ID` : ['NAME', 'DESCRIPTION', 'STATUS', 'CREATED_AT', 'UPDATED_AT', 'EMAIL', 'PHONE', 'ADDRESS', 'CITY', 'STATE', 'COUNTRY', 'POSTAL_CODE', 'AMOUNT', 'QUANTITY'][i] || `COL_${i}`,
            DATA_TYPE: i === 0 ? 'NUMBER(38,0)' : i >= (node.columnCount || 8) - 2 ? 'TIMESTAMP_NTZ' : 'VARCHAR(255)',
            IS_NULLABLE: i === 0 ? 'NO' : 'YES',
            ORDINAL_POSITION: i + 1,
          }))
          setColumnData(mockCols)
        } else setColumnData(null)
      })
      .finally(() => setColumnsLoading(false))
  }, [selected, isLive, data])

  if (loading) {
    return (
      <div style={{ padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⚙️</div>
          <div>Loading lineage data...</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }
  if (!data) return null

  const laidOut = layoutNodes(data.nodes, data.edges)
  const nodeMap = new Map(laidOut.map(n => [n.id, n]))

  // Layer labels
  const layerLabels: Record<number, string> = {}
  laidOut.forEach(n => {
    const layer = Math.round(((n.x ?? 0) - 60) / 290)
    if (!(layer in layerLabels)) {
      if (n.type === 'source') layerLabels[layer] = 'SOURCE'
      else if (n.type === 'warehouse') layerLabels[layer] = 'MASTER DATA'
      else if (n.type === 'transform') layerLabels[layer] = 'TRANSACTIONS'
      else if (n.type === 'output') layerLabels[layer] = 'VIEWS'
      else layerLabels[layer] = n.type.toUpperCase()
    }
  })

  const maxX = Math.max(...laidOut.map(n => (n.x ?? 0) + NODE_W)) + 80
  const maxY = Math.max(...laidOut.map(n => (n.y ?? 0) + NODE_H)) + 80

  const matches = search.trim().length > 0
    ? laidOut.filter(n => n.label.toLowerCase().includes(search.toLowerCase()) || n.sub.toLowerCase().includes(search.toLowerCase()))
    : []

  function selectNode(id: string) {
    setSelected(prev => prev === id ? null : id)
    setShowDropdown(false)
  }

  function clearSearch() {
    setSearch(''); setSelected(null); setShowDropdown(false)
    inputRef.current?.focus()
  }

  const highlighted = selected
    ? new Set([selected, ...data.edges.filter(e => e.from === selected || e.to === selected).flatMap(e => [e.from, e.to])])
    : null

  const selectedNode = selected ? nodeMap.get(selected) : null
  const upstream = selected ? data.edges.filter(e => e.to === selected).map(e => nodeMap.get(e.from)).filter(Boolean) as LineageNode[] : []
  const downstream = selected ? data.edges.filter(e => e.from === selected).map(e => nodeMap.get(e.to)).filter(Boolean) as LineageNode[] : []

  const filteredColumns = columnData?.filter(c =>
    !columnSearch || c.COLUMN_NAME.toLowerCase().includes(columnSearch.toLowerCase())
  )

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1500px' }}>
      <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '8px' }}>
        Workspace · <span style={{ color: '#475569' }}>Lineage</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Data Lineage</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
            {isLive
              ? `Live from ${data.connection.name} · ${data.connection.database}.${data.connection.schema} · ${laidOut.length} objects`
              : 'Demo mode · connect a Snowflake warehouse for live lineage'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: isLive ? '#dcfce7' : '#fef3c7', color: isLive ? '#16a34a' : '#d97706',
            padding: '5px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600,
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isLive ? '#16a34a' : '#d97706' }} />
            {isLive ? 'LIVE' : 'DEMO'}
          </span>
          <button onClick={fetchLineage} style={{
            background: '#fff', border: '1px solid #ebe8df', padding: '6px 14px',
            borderRadius: '8px', fontSize: '12.5px', color: '#475569', cursor: 'pointer', fontWeight: 500,
          }}>🔄 Refresh</button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', maxWidth: '480px', marginBottom: '16px' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.5, pointerEvents: 'none' }}>🔍</span>
        <input ref={inputRef} value={search}
          onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
          onFocus={() => { if (search) setShowDropdown(true) }}
          placeholder="Search tables, views, schemas..."
          style={{
            width: '100%', padding: '10px 40px 10px 38px', borderRadius: '10px',
            border: '1px solid #e2e8f0', fontSize: '13px', background: '#fff',
            color: '#0f172a', boxSizing: 'border-box', outline: 'none',
            borderColor: showDropdown && matches.length > 0 ? '#93c5fd' : '#e2e8f0',
            boxShadow: showDropdown && matches.length > 0 ? '0 0 0 3px #dbeafe' : 'none',
          }}
        />
        {search && <button onClick={clearSearch} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}>✕</button>}

        {showDropdown && matches.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, marginTop: '4px', maxHeight: '280px', overflowY: 'auto' }}>
            <div style={{ padding: '6px 12px', fontSize: '11px', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #f3f1ea' }}>{matches.length} found</div>
            {matches.map(m => {
              const cfg = typeConfig[m.type] ?? typeConfig.warehouse
              return (
                <div key={m.id} onMouseDown={() => { selectNode(m.id); setSearch(m.label) }} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f8fafc',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{m.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#1a1a1a' }}>{m.label}</div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{m.sub}</div>
                  </div>
                  <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: '20px', fontSize: '10.5px', fontWeight: 600 }}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        )}
        {showDropdown && search.trim().length > 0 && matches.length === 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, marginTop: '4px', padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No objects found
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {Object.entries(typeConfig).map(([type, cfg]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: cfg.bg, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.border }} />
            <span style={{ fontSize: '10.5px', color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Graph + Detail Panel side by side */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* SVG Graph */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #ebe8df', borderRadius: '14px', padding: '16px', overflowX: 'auto', position: 'relative' }}>
          <svg width={Math.max(maxX, 1000)} height={Math.max(maxY, 500)} viewBox={`0 0 ${Math.max(maxX, 1000)} ${Math.max(maxY, 500)}`} style={{ display: 'block', minWidth: `${Math.max(maxX, 1000)}px` }}>
            <defs>
              <marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#cbd5e1" /></marker>
              <marker id="arrow-hl" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#2563eb" /></marker>
              <marker id="arrow-up" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#16a34a" /></marker>
              <marker id="arrow-dn" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#ea580c" /></marker>
            </defs>

            {/* Layer labels at top */}
            {Object.entries(layerLabels).map(([layerStr, label]) => {
              const layer = Number(layerStr)
              const x = 60 + layer * 290 + NODE_W / 2
              return (
                <g key={layerStr}>
                  <text x={x} y={30} textAnchor="middle" fontSize="11" fontWeight="600" fill="#94a3b8" letterSpacing="1.5" fontFamily="system-ui,sans-serif">{label}</text>
                  <line x1={x - 60} y1={42} x2={x + 60} y2={42} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
                </g>
              )
            })}

            {/* Edges */}
            {data.edges.map((edge, i) => {
              const from = nodeMap.get(edge.from)
              const to = nodeMap.get(edge.to)
              if (!from || !to) return null
              const fx = (from.x ?? 0) + NODE_W - 4
              const fy = (from.y ?? 0) + NODE_H / 2
              const tx = (to.x ?? 0) + 4
              const ty = (to.y ?? 0) + NODE_H / 2
              const midX = (fx + tx) / 2

              const isUpstream = selected && highlighted?.has(edge.from) && highlighted?.has(edge.to) && data.edges.some(e => e.to === selected && e.from === edge.from)
              const isDownstream = selected && highlighted?.has(edge.from) && highlighted?.has(edge.to) && data.edges.some(e => e.from === selected && e.to === edge.to)
              const isHL = highlighted?.has(edge.from) && highlighted?.has(edge.to)

              return (
                <path key={i}
                  d={`M${fx},${fy} C${midX},${fy} ${midX},${ty} ${tx},${ty}`}
                  fill="none"
                  stroke={isUpstream ? '#16a34a' : isDownstream ? '#ea580c' : isHL ? '#2563eb' : '#e2e8f0'}
                  strokeWidth={isHL ? 2 : 1}
                  markerEnd={isUpstream ? 'url(#arrow-up)' : isDownstream ? 'url(#arrow-dn)' : isHL ? 'url(#arrow-hl)' : 'url(#arrow)'}
                  opacity={highlighted && !isHL ? 0.15 : 1}
                  style={{ transition: 'stroke 0.2s, opacity 0.2s' }}
                />
              )
            })}

            {/* Nodes */}
            {laidOut.map(node => {
              const cfg = typeConfig[node.type] ?? typeConfig.warehouse
              const isSel = selected === node.id
              const isDimmed = highlighted && !highlighted.has(node.id)
              const nx = node.x ?? 0
              const ny = node.y ?? 0
              return (
                <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => selectNode(node.id)}>
                  <rect x={nx} y={ny} width={NODE_W} height={NODE_H} rx={10}
                    fill={cfg.bg}
                    stroke={isSel ? '#2563eb' : cfg.border}
                    strokeWidth={isSel ? 2.5 : 1.5}
                    opacity={isDimmed ? 0.2 : 1}
                    filter={isSel ? 'drop-shadow(0 0 8px rgba(37,99,235,0.3))' : undefined}
                    style={{ transition: 'all 0.2s' }}
                  />
                  <text x={nx + 14} y={ny + 28} fontSize="16" opacity={isDimmed ? 0.2 : 1}>{node.icon}</text>
                  <text x={nx + 36} y={ny + 28} fontSize="12" fontWeight={isSel ? 700 : 600} fill={cfg.color} opacity={isDimmed ? 0.2 : 1} fontFamily="system-ui,sans-serif">
                    {node.label.length > 22 ? node.label.slice(0, 20) + '…' : node.label}
                  </text>
                  <text x={nx + 36} y={ny + 46} fontSize="10" fill={cfg.color} opacity={isDimmed ? 0.1 : 0.55} fontFamily="system-ui,sans-serif">
                    {node.rowCount ? `${node.rowCount.toLocaleString()} rows · ` : ''}{node.sub}
                  </text>
                  {/* Status dot */}
                  {node.rowCount != null && (
                    <circle cx={nx + NODE_W - 12} cy={ny + 16} r={5} fill="#16a34a" opacity={isDimmed ? 0.1 : 0.8} />
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* ── Column Detail Panel (appears when node is selected) ── */}
        {selectedNode && (
          <div style={{
            width: '340px', flexShrink: 0,
            background: '#fff', border: '2px solid #2563eb', borderRadius: '14px',
            boxShadow: '0 8px 30px rgba(37,99,235,0.12)', overflow: 'hidden',
            maxHeight: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column',
          }}>
            {/* Panel Header */}
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{selectedNode.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a' }}>{selectedNode.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {/* Search columns */}
                  <button onClick={() => document.getElementById('col-search')?.focus()} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>🔍</button>
                  {/* Status */}
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#16a34a', fontSize: '14px' }}>✓</span>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                {selectedNode.schema} / {selectedNode.label} · {selectedNode.rowCount ? `${selectedNode.rowCount.toLocaleString()} rows` : selectedNode.tableType}
              </div>
              {/* Column search */}
              <input id="col-search" value={columnSearch} onChange={e => setColumnSearch(e.target.value)}
                placeholder="Search columns..."
                style={{
                  width: '100%', marginTop: '10px', padding: '7px 10px', borderRadius: '7px',
                  border: '1px solid #e2e8f0', fontSize: '12px', background: '#fafaf9', outline: 'none',
                  boxSizing: 'border-box',
                }} />
            </div>

            {/* Column List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {columnsLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Loading columns...</div>
              ) : filteredColumns && filteredColumns.length > 0 ? (
                filteredColumns.map((col, i) => {
                  const dt = dtIcon(col.DATA_TYPE)
                  const isPK = col.ORDINAL_POSITION === 1 && col.IS_NULLABLE === 'NO'
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 18px', borderBottom: '1px solid #f8f6f0',
                      background: isPK ? '#fffbeb' : '#fff',
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: dt.color, width: '18px', textAlign: 'center', flexShrink: 0 }}>{dt.symbol}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isPK && <span style={{ fontSize: '12px' }}>🔑</span>}
                          <span style={{ fontWeight: isPK ? 700 : 500, fontSize: '13px', color: isPK ? '#1d4ed8' : '#1a1a1a' }}>{col.COLUMN_NAME}</span>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px',
                      }}>
                        {col.IS_NULLABLE === 'YES' ? '○' : '●'}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  {columnSearch ? 'No matching columns' : 'No columns available'}
                </div>
              )}
            </div>

            {/* Panel Footer — Upstream/Downstream counts */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', background: '#fafaf9' }}>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11.5px' }}>
                <span style={{ color: '#166534' }}>⬆ {upstream.length} upstream</span>
                <span style={{ color: '#c2410c' }}>⬇ {downstream.length} downstream</span>
              </div>
              {/* Quick links */}
              {(upstream.length > 0 || downstream.length > 0) && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {upstream.map(n => (
                    <button key={n.id} onClick={() => selectNode(n.id)} style={{
                      padding: '3px 8px', borderRadius: '6px', border: '1px solid #86efac',
                      background: '#f0fdf4', color: '#166534', fontSize: '10px', fontWeight: 500,
                      cursor: 'pointer',
                    }}>{n.label}</button>
                  ))}
                  {downstream.map(n => (
                    <button key={n.id} onClick={() => selectNode(n.id)} style={{
                      padding: '3px 8px', borderRadius: '6px', border: '1px solid #fdba74',
                      background: '#fff7ed', color: '#c2410c', fontSize: '10px', fontWeight: 500,
                      cursor: 'pointer',
                    }}>{n.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
