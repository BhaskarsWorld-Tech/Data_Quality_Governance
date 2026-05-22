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
  { id: 'SUPPLYCHAIN.SALES_ORDERS', label: 'SALES_ORDERS', sub: 'Transact.', type: 'transform', icon: '💰', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'BASE TABLE', rowCount: null, columnCount: 15, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.CUSTOMER_CREDIT_VIEW', label: 'CUSTOMER_CREDIT_VIEW', sub: 'View', type: 'output', icon: '👁', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'VIEW', rowCount: null, columnCount: 5, lastAltered: null, comment: null },
  { id: 'SUPPLYCHAIN.USA_CUSTOMERS_VIEW', label: 'USA_CUSTOMERS_VIEW', sub: 'View', type: 'output', icon: '👁', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB', tableType: 'VIEW', rowCount: null, columnCount: 6, lastAltered: null, comment: null },
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
  { from: 'SUPPLYCHAIN.CUSTOMERS', to: 'SUPPLYCHAIN.SALES_ORDERS', relationship: 'depends_on' },
  { from: 'SUPPLYCHAIN.WAREHOUSES', to: 'SUPPLYCHAIN.SALES_ORDERS', relationship: 'depends_on' },
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
  PURCHASE_ORDERS: '📋', PURCHASE_ORDER_ITEMS: '📋', RETURNS: '↩️', SALES_ORDERS: '💰',
  CUSTOMER_CREDIT_VIEW: '👁', USA_CUSTOMERS_VIEW: '👁',
}

/* ─── Layout engine ─── */
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

/* ─── Data type display helpers ─── */
function dtIcon(dt: string): { symbol: string; color: string } {
  const t = dt.toUpperCase()
  if (t.includes('NUMBER') || t.includes('INT') || t.includes('FLOAT') || t.includes('DECIMAL') || t.includes('NUMERIC'))
    return { symbol: '#', color: '#2563eb' }
  if (t.includes('DATE') || t.includes('TIME') || t.includes('TIMESTAMP'))
    return { symbol: '📅', color: '#7c3aed' }
  if (t.includes('BOOL'))
    return { symbol: '◉', color: '#16a34a' }
  if (t.includes('VARIANT') || t.includes('OBJECT') || t.includes('ARRAY'))
    return { symbol: '{ }', color: '#ea580c' }
  return { symbol: 'A', color: '#64748b' }
}

function dtLabel(dt: string): string {
  const t = dt.toUpperCase()
  if (t.includes('VARCHAR') || t.includes('STRING') || t.includes('TEXT') || t.includes('CHAR')) return 'TEXT'
  if (t.includes('NUMBER') || t.includes('NUMERIC') || t.includes('DECIMAL')) return 'NUMBER'
  if (t.includes('INT')) return 'INTEGER'
  if (t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('REAL')) return 'FLOAT'
  if (t.includes('TIMESTAMP')) return 'TIMESTAMP'
  if (t.includes('DATE')) return 'DATE'
  if (t.includes('TIME')) return 'TIME'
  if (t.includes('BOOLEAN') || t.includes('BOOL')) return 'BOOLEAN'
  if (t.includes('VARIANT')) return 'VARIANT'
  if (t.includes('ARRAY')) return 'ARRAY'
  if (t.includes('OBJECT')) return 'OBJECT'
  return dt.split('(')[0] || dt
}

/* ─── Upstream chain builder ─── */
function buildChain(startId: string, edges: LineageEdge[], nodeMap: Map<string, LineageNode>, direction: 'up' | 'down'): { hop: number; nodes: LineageNode[] }[] {
  const hops: { hop: number; nodes: LineageNode[] }[] = []
  const visited = new Set<string>([startId])
  let current = [startId]
  let hopNum = 1

  while (current.length > 0) {
    const next: string[] = []
    const hopNodes: LineageNode[] = []
    for (const id of current) {
      const related = direction === 'up'
        ? edges.filter(e => e.to === id).map(e => e.from)
        : edges.filter(e => e.from === id).map(e => e.to)
      for (const rid of related) {
        if (!visited.has(rid)) {
          visited.add(rid)
          const node = nodeMap.get(rid)
          if (node) { hopNodes.push(node); next.push(rid) }
        }
      }
    }
    if (hopNodes.length > 0) {
      hops.push({ hop: hopNum, nodes: hopNodes })
      hopNum++
    }
    current = next
  }
  return hops
}

/* ─── Auto-refresh interval ─── */
const REFRESH_INTERVAL = 30000

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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchLineage = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/snowflake/lineage')
      if (res.ok) {
        const json = await res.json()
        if (json.nodes && json.nodes.length > 0) {
          json.nodes = json.nodes.map((n: LineageNode) => ({
            ...n,
            icon: nodeIcon[n.label] || n.icon,
          }))
          setData(json); setIsLive(true); setLastRefresh(new Date())
          if (!silent) setLoading(false)
          return
        }
      }
    } catch { /* fallback */ }
    setData({
      nodes: STATIC_NODES, edges: STATIC_EDGES,
      connection: { name: 'SUPPLYCHAIN_DB', database: 'SUPPLYCHAIN_DB', schema: 'SUPPLYCHAIN', warehouse: 'COMPUTE_WH', status: 'demo' },
    })
    setIsLive(false); setLastRefresh(new Date())
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => { fetchLineage() }, [fetchLineage])

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(() => { fetchLineage(true) }, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchLineage])

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
        if (!isLive) {
          const cols: string[] = {
            CARRIERS: ['CARRIER_ID', 'CARRIER_NAME', 'CONTACT_PERSON', 'PHONE', 'EMAIL', 'TRACKING_URL', 'CREATED_AT', 'UPDATED_AT'],
            CUSTOMERS: ['CUSTOMER_ID', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'ADDRESS', 'CITY', 'STATE', 'COUNTRY', 'POSTAL_CODE', 'CREDIT_LIMIT', 'CUSTOMER_SEGMENT', 'CREATED_AT', 'UPDATED_AT'],
            PRODUCTS: ['PRODUCT_ID', 'PRODUCT_NAME', 'CATEGORY_ID', 'UNIT_PRICE', 'UNIT_COST', 'WEIGHT', 'DESCRIPTION', 'SKU', 'CREATED_AT', 'UPDATED_AT'],
            PRODUCT_CATEGORIES: ['CATEGORY_ID', 'CATEGORY_NAME', 'PARENT_CATEGORY_ID', 'DESCRIPTION', 'CREATED_AT'],
            SUPPLIERS: ['SUPPLIER_ID', 'SUPPLIER_NAME', 'CONTACT_PERSON', 'EMAIL', 'PHONE', 'ADDRESS', 'CITY', 'COUNTRY', 'RATING', 'CREATED_AT'],
            WAREHOUSES: ['WAREHOUSE_ID', 'WAREHOUSE_NAME', 'LOCATION', 'CITY', 'COUNTRY', 'CAPACITY', 'CREATED_AT', 'UPDATED_AT'],
            FINANCE_TRANSACTIONS: ['TRANSACTION_ID', 'ORDER_ID', 'TRANSACTION_TYPE', 'AMOUNT', 'CURRENCY', 'PAYMENT_METHOD', 'STATUS', 'TRANSACTION_DATE', 'REFERENCE_NUMBER', 'DESCRIPTION', 'CREATED_AT', 'UPDATED_AT'],
            INVENTORY: ['INVENTORY_ID', 'PRODUCT_ID', 'WAREHOUSE_ID', 'QUANTITY_ON_HAND', 'REORDER_LEVEL', 'LAST_RESTOCK_DATE', 'CREATED_AT', 'UPDATED_AT'],
            PURCHASE_ORDERS: ['PO_ID', 'SUPPLIER_ID', 'ORDER_DATE', 'EXPECTED_DELIVERY', 'STATUS', 'TOTAL_AMOUNT', 'CURRENCY', 'NOTES', 'CREATED_AT', 'UPDATED_AT'],
            PURCHASE_ORDER_ITEMS: ['PO_ITEM_ID', 'PO_ID', 'PRODUCT_ID', 'QUANTITY', 'UNIT_PRICE', 'TOTAL_PRICE', 'CREATED_AT', 'UPDATED_AT'],
            RETURNS: ['RETURN_ID', 'ORDER_ID', 'CUSTOMER_ID', 'PRODUCT_ID', 'RETURN_REASON', 'RETURN_DATE', 'REFUND_AMOUNT', 'STATUS', 'CREATED_AT'],
            SALES_ORDERS: ['ORDER_ID', 'ORDER_NUMBER', 'CUSTOMER_ID', 'WAREHOUSE_ID', 'ORDER_DATE', 'REQUIRED_DATE', 'SHIPPED_DATE', 'STATUS', 'SHIPPING_METHOD', 'TOTAL_AMOUNT', 'DISCOUNT_AMOUNT', 'TAX_AMOUNT', 'NET_AMOUNT', 'CREATED_AT', 'UPDATED_AT'],
            CUSTOMER_CREDIT_VIEW: ['CUSTOMER_ID', 'FULL_NAME', 'CREDIT_LIMIT', 'TOTAL_ORDERS', 'TOTAL_SPENT'],
            USA_CUSTOMERS_VIEW: ['CUSTOMER_ID', 'FIRST_NAME', 'LAST_NAME', 'STATE', 'CITY', 'CREDIT_LIMIT'],
          }[node.label] || Array.from({ length: node.columnCount || 6 }, (_, i) => `COL_${i + 1}`)

          const mockCols: ColumnInfo[] = cols.map((name, i) => ({
            COLUMN_NAME: name,
            DATA_TYPE: name.endsWith('_ID') ? 'NUMBER(38,0)' : name.endsWith('_DATE') || name.endsWith('_AT') ? 'TIMESTAMP_NTZ' : name.includes('AMOUNT') || name.includes('PRICE') || name.includes('COST') || name.includes('LIMIT') || name.includes('QUANTITY') || name.includes('WEIGHT') || name.includes('CAPACITY') || name.includes('RATING') || name.includes('LEVEL') ? 'NUMBER(10,2)' : name.includes('PHONE') || name.includes('EMAIL') || name.includes('URL') ? 'VARCHAR(256)' : 'VARCHAR(255)',
            IS_NULLABLE: i === 0 ? 'NO' : name.endsWith('_ID') && i < 4 ? 'NO' : 'YES',
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
  const upstreamChain = selected ? buildChain(selected, data.edges, nodeMap, 'up') : []
  const downstreamChain = selected ? buildChain(selected, data.edges, nodeMap, 'down') : []
  const totalUpstream = upstreamChain.reduce((s, h) => s + h.nodes.length, 0)
  const totalDownstream = downstreamChain.reduce((s, h) => s + h.nodes.length, 0)

  const filteredColumns = columnData?.filter(c =>
    !columnSearch || c.COLUMN_NAME.toLowerCase().includes(columnSearch.toLowerCase())
  )
  const nullableCount = columnData?.filter(c => c.IS_NULLABLE === 'YES').length ?? 0
  const notNullCount = columnData?.filter(c => c.IS_NULLABLE === 'NO').length ?? 0

  const timeSinceRefresh = Math.round((Date.now() - lastRefresh.getTime()) / 1000)

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
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isLive ? '#16a34a' : '#d97706', animation: isLive ? 'pulse 2s infinite' : 'none' }} />
            {isLive ? 'LIVE' : 'DEMO'}
          </span>
          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Auto-refresh 30s{timeSinceRefresh > 5 ? ` · ${timeSinceRefresh}s ago` : ''}</span>
          <button onClick={() => fetchLineage()} style={{
            background: '#fff', border: '1px solid #ebe8df', padding: '6px 14px',
            borderRadius: '8px', fontSize: '12.5px', color: '#475569', cursor: 'pointer', fontWeight: 500,
          }}>🔄 Refresh</button>
          <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
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

      {/* SVG Graph */}
      <div style={{ background: '#fff', border: '1px solid #ebe8df', borderRadius: '14px', padding: '16px', overflowX: 'auto', position: 'relative' }}>
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
                {node.rowCount != null && (
                  <circle cx={nx + NODE_W - 12} cy={ny + 16} r={5} fill="#16a34a" opacity={isDimmed ? 0.1 : 0.8} />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── Full-width Detail Panel (below graph, matching Data-Quality reference) ── */}
      {selectedNode && (
        <div style={{
          marginTop: '16px', background: '#fff', border: '1px solid #ebe8df', borderRadius: '14px',
          overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          {/* Panel Header */}
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: (typeConfig[selectedNode.type] ?? typeConfig.warehouse).bg,
                border: `2px solid ${(typeConfig[selectedNode.type] ?? typeConfig.warehouse).border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
              }}>{selectedNode.icon}</div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>{selectedNode.label}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{selectedNode.schema} · {selectedNode.tableType === 'VIEW' ? 'View' : selectedNode.tableType === 'MATERIALIZED VIEW' ? 'Materialized View' : 'Table'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                background: (typeConfig[selectedNode.type] ?? typeConfig.warehouse).bg,
                color: (typeConfig[selectedNode.type] ?? typeConfig.warehouse).color,
                padding: '4px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600,
                border: `1px solid ${(typeConfig[selectedNode.type] ?? typeConfig.warehouse).border}`,
              }}>{(typeConfig[selectedNode.type] ?? typeConfig.warehouse).label}</span>
              <button onClick={() => setSelected(null)} style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', width: '32px', height: '32px',
                borderRadius: '8px', cursor: 'pointer', fontSize: '16px', color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
          </div>

          {/* Upstream / Downstream chains */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderBottom: '1px solid #f1f5f9' }}>
            {/* Upstream */}
            <div style={{ padding: '16px 24px', borderRight: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>⬆ UPSTREAM CHAIN ({totalUpstream})</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{upstreamChain.length} hop{upstreamChain.length !== 1 ? 's' : ''} to source</div>
              </div>
              {upstreamChain.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Root node — no upstream dependencies</div>
              ) : upstreamChain.map(hop => (
                <div key={hop.hop} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    ⬆ HOP {hop.hop} {hop.hop === upstreamChain.length ? '(SOURCE / ROOT)' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {hop.nodes.map(n => {
                      const cfg = typeConfig[n.type] ?? typeConfig.warehouse
                      return (
                        <button key={n.id} onClick={() => selectNode(n.id)} style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '5px 10px', borderRadius: '8px', border: `1px solid ${cfg.border}`,
                          background: cfg.bg, cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: cfg.color,
                        }}>
                          <span style={{ fontSize: '13px' }}>{n.icon}</span>
                          {n.label}
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{cfg.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {/* Downstream */}
            <div style={{ padding: '16px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ea580c' }}>⬇ DOWNSTREAM CHAIN ({totalDownstream})</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{downstreamChain.length} hop{downstreamChain.length !== 1 ? 's' : ''} to leaf</div>
              </div>
              {downstreamChain.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Terminal node — no downstream consumers</div>
              ) : downstreamChain.map(hop => (
                <div key={hop.hop} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    ⬇ HOP {hop.hop}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {hop.nodes.map(n => {
                      const cfg = typeConfig[n.type] ?? typeConfig.warehouse
                      return (
                        <button key={n.id} onClick={() => selectNode(n.id)} style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '5px 10px', borderRadius: '8px', border: `1px solid ${cfg.border}`,
                          background: cfg.bg, cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: cfg.color,
                        }}>
                          <span style={{ fontSize: '13px' }}>{n.icon}</span>
                          {n.label}
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{cfg.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column Table */}
          <div style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px' }}>📋</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>COLUMNS ({columnData?.length ?? 0})</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{nullableCount} nullable · {notNullCount} NOT NULL</span>
              </div>
              <input value={columnSearch} onChange={e => setColumnSearch(e.target.value)}
                placeholder={`Search columns in ${selectedNode.label}...`}
                style={{
                  padding: '7px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  fontSize: '12px', background: '#fafaf9', outline: 'none', width: '280px',
                }} />
            </div>

            {columnsLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading columns...</div>
            ) : (
              <div style={{ borderRadius: '10px', border: '1px solid #ebe8df', overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 120px 100px 1fr', gap: '0', padding: '8px 16px', background: '#fafaf9', borderBottom: '1px solid #ebe8df' }}>
                  {['#', 'COLUMN', 'TYPE', 'NULLABLE', 'PATH'].map(h => (
                    <div key={h} style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
                  ))}
                </div>
                {/* Rows */}
                {filteredColumns && filteredColumns.length > 0 ? filteredColumns.map((col, i) => {
                  const dt = dtIcon(col.DATA_TYPE)
                  const isPK = col.ORDINAL_POSITION === 1 && col.IS_NULLABLE === 'NO'
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '50px 1fr 120px 100px 1fr', gap: '0',
                      padding: '9px 16px', borderBottom: '1px solid #f8f6f0',
                      background: i % 2 === 0 ? '#fff' : '#fafaf9',
                    }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{col.ORDINAL_POSITION}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isPK && <span style={{ fontSize: '12px' }}>🔑</span>}
                        <span style={{ fontWeight: isPK ? 700 : 500, fontSize: '13px', color: isPK ? '#1d4ed8' : '#1a1a1a', fontFamily: 'monospace' }}>{col.COLUMN_NAME}</span>
                      </div>
                      <div>
                        <span style={{
                          background: dt.color + '14', color: dt.color, padding: '2px 8px',
                          borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                        }}>{dtLabel(col.DATA_TYPE)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {col.IS_NULLABLE === 'NO' ? (
                          <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>✓ Not Null</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>○ Nullable</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {selectedNode.schema}.{selectedNode.label}.{col.COLUMN_NAME}
                      </div>
                    </div>
                  )
                }) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    {columnSearch ? 'No matching columns' : 'No columns available'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer bar */}
          <div style={{ padding: '10px 24px', borderTop: '1px solid #f1f5f9', background: '#fafaf9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
              <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>📊 {totalUpstream} total upstream</span>
              <span style={{ color: '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}>📉 {totalDownstream} total downstream</span>
              <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>⬆ {upstreamChain.length}-hop path to source</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Click any node in the chain to drill down</div>
          </div>
        </div>
      )}
    </div>
  )
}
