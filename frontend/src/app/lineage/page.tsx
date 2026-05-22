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

/* ─── Static fallback data (shown when no live connection) ─── */
const STATIC_NODES: LineageNode[] = [
  { id: 'sf1', label: 'SF_Codex', sub: 'Snowflake · CODEX', type: 'source', icon: '❄️', schema: '', database: 'CODEX', tableType: 'CONNECTION', rowCount: null, columnCount: 0, lastAltered: null, comment: null },
  { id: 'raw1', label: 'raw_orders', sub: 'RAW · Table', type: 'raw', icon: '📥', schema: 'RAW', database: 'CODEX', tableType: 'BASE TABLE', rowCount: 124000, columnCount: 12, lastAltered: null, comment: null },
  { id: 'raw2', label: 'raw_customers', sub: 'RAW · Table', type: 'raw', icon: '📥', schema: 'RAW', database: 'CODEX', tableType: 'BASE TABLE', rowCount: 45000, columnCount: 8, lastAltered: null, comment: null },
  { id: 'raw3', label: 'raw_products', sub: 'RAW · Table', type: 'raw', icon: '📥', schema: 'RAW', database: 'CODEX', tableType: 'BASE TABLE', rowCount: 3200, columnCount: 15, lastAltered: null, comment: null },
  { id: 't1', label: 'fact_orders', sub: 'PUBLIC · View', type: 'transform', icon: '👁', schema: 'PUBLIC', database: 'CODEX', tableType: 'VIEW', rowCount: null, columnCount: 18, lastAltered: null, comment: null },
  { id: 't2', label: 'dim_customers', sub: 'PUBLIC · View', type: 'transform', icon: '👁', schema: 'PUBLIC', database: 'CODEX', tableType: 'VIEW', rowCount: null, columnCount: 10, lastAltered: null, comment: null },
  { id: 't3', label: 'dim_products', sub: 'PUBLIC · Table', type: 'warehouse', icon: '📋', schema: 'PUBLIC', database: 'CODEX', tableType: 'BASE TABLE', rowCount: 3200, columnCount: 15, lastAltered: null, comment: null },
  { id: 'agg1', label: 'revenue_summary', sub: 'ANALYTICS · View', type: 'output', icon: '📈', schema: 'ANALYTICS', database: 'CODEX', tableType: 'VIEW', rowCount: null, columnCount: 6, lastAltered: null, comment: null },
]
const STATIC_EDGES: LineageEdge[] = [
  { from: 'sf1', to: 'raw1', relationship: 'source' }, { from: 'sf1', to: 'raw2', relationship: 'source' },
  { from: 'sf1', to: 'raw3', relationship: 'source' }, { from: 'raw1', to: 't1', relationship: 'depends_on' },
  { from: 'raw2', to: 't2', relationship: 'depends_on' }, { from: 'raw3', to: 't3', relationship: 'depends_on' },
  { from: 't1', to: 'agg1', relationship: 'depends_on' }, { from: 't2', to: 'agg1', relationship: 'depends_on' },
]

const NODE_W = 170, NODE_H = 60

const typeConfig: Record<string, { bg: string; border: string; color: string; label: string }> = {
  source:    { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', label: 'Source' },
  raw:       { bg: '#fdf4ff', border: '#e9d5ff', color: '#7e22ce', label: 'Raw' },
  transform: { bg: '#faf5ff', border: '#c4b5fd', color: '#7c3aed', label: 'Transform' },
  warehouse: { bg: '#f0fdf4', border: '#86efac', color: '#166534', label: 'Warehouse' },
  output:    { bg: '#fff7ed', border: '#fdba74', color: '#c2410c', label: 'Output' },
}

/* ─── Layout engine ─── */
function layoutNodes(nodes: LineageNode[], edges: LineageEdge[]): LineageNode[] {
  // Topological sort + layer assignment
  const adjOut = new Map<string, string[]>()
  const adjIn = new Map<string, string[]>()
  for (const n of nodes) { adjOut.set(n.id, []); adjIn.set(n.id, []) }
  for (const e of edges) {
    adjOut.get(e.from)?.push(e.to)
    adjIn.get(e.to)?.push(e.from)
  }

  // BFS from roots (nodes with no incoming)
  const layers = new Map<string, number>()
  const roots = nodes.filter(n => (adjIn.get(n.id) ?? []).length === 0)
  const queue = roots.map(n => ({ id: n.id, layer: 0 }))
  const visited = new Set<string>()

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!
    if (visited.has(id)) {
      layers.set(id, Math.max(layers.get(id) ?? 0, layer))
      continue
    }
    visited.add(id)
    layers.set(id, layer)
    for (const child of adjOut.get(id) ?? []) {
      queue.push({ id: child, layer: layer + 1 })
    }
  }

  // Assign positions for unvisited nodes
  for (const n of nodes) {
    if (!layers.has(n.id)) layers.set(n.id, 0)
  }

  // Group by layer
  const layerGroups = new Map<number, string[]>()
  for (const [id, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, [])
    layerGroups.get(layer)!.push(id)
  }

  const LAYER_X = 220
  const START_X = 40
  const START_Y = 60
  const GAP_Y = 80

  return nodes.map(n => {
    const layer = layers.get(n.id) ?? 0
    const group = layerGroups.get(layer) ?? [n.id]
    const idx = group.indexOf(n.id)
    return {
      ...n,
      x: START_X + layer * LAYER_X,
      y: START_Y + idx * GAP_Y,
    }
  })
}

function cx(node: LineageNode) { return (node.x ?? 0) + NODE_W / 2 }
function cy(node: LineageNode) { return (node.y ?? 0) + NODE_H / 2 }

export default function LineagePage() {
  const [data, setData] = useState<LineageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [columnData, setColumnData] = useState<Record<string, unknown>[] | null>(null)
  const [columnsLoading, setColumnsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const fetchLineage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/snowflake/lineage')
      if (res.ok) {
        const json = await res.json()
        if (json.nodes && json.nodes.length > 0) {
          setData(json)
          setIsLive(true)
          setLoading(false)
          return
        }
      }
    } catch {
      // Fall through to static data
    }
    // Use static fallback
    setData({
      nodes: STATIC_NODES,
      edges: STATIC_EDGES,
      connection: { name: 'Demo', database: 'CODEX', schema: 'PUBLIC', warehouse: 'COMPUTE_WH', status: 'demo' },
    })
    setIsLive(false)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLineage() }, [fetchLineage])

  // Fetch columns for selected node
  useEffect(() => {
    if (!selected || !isLive) { setColumnData(null); return }
    const node = data?.nodes.find(n => n.id === selected)
    if (!node || node.type === 'source') { setColumnData(null); return }
    setColumnsLoading(true)
    fetch(`/api/snowflake/columns?table=${encodeURIComponent(node.label)}`)
      .then(r => r.json())
      .then(d => setColumnData(d.columns ?? []))
      .catch(() => setColumnData(null))
      .finally(() => setColumnsLoading(false))
  }, [selected, isLive, data])

  if (loading) {
    return (
      <div style={{ padding: '28px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8', fontSize: '14px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⚙️</div>
            <div>Loading lineage data...</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const laidOut = layoutNodes(data.nodes, data.edges)
  const nodeMap = new Map(laidOut.map(n => [n.id, n]))

  // Calculate SVG dimensions
  const maxX = Math.max(...laidOut.map(n => (n.x ?? 0) + NODE_W)) + 60
  const maxY = Math.max(...laidOut.map(n => (n.y ?? 0) + NODE_H)) + 60

  const matches = search.trim().length > 0
    ? laidOut.filter(n =>
        n.label.toLowerCase().includes(search.toLowerCase()) ||
        n.sub.toLowerCase().includes(search.toLowerCase()) ||
        n.type.toLowerCase().includes(search.toLowerCase())
      )
    : []

  function selectNode(id: string, label: string) {
    setSelected(id)
    setSearch(label)
    setShowDropdown(false)
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
  }

  function clearSearch() {
    setSearch('')
    setSelected(null)
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const highlighted = selected
    ? new Set([selected, ...data.edges.filter(e => e.from === selected || e.to === selected).flatMap(e => [e.from, e.to])])
    : null

  const selectedNode = selected ? nodeMap.get(selected) : null
  const upstream = selected ? data.edges.filter(e => e.to === selected).map(e => nodeMap.get(e.from)).filter(Boolean) as LineageNode[] : []
  const downstream = selected ? data.edges.filter(e => e.from === selected).map(e => nodeMap.get(e.to)).filter(Boolean) as LineageNode[] : []

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1400px' }}>
      <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '8px' }}>
        Workspace · <span style={{ color: '#475569' }}>Analytics platform</span>
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
          {/* Live/Demo indicator */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: isLive ? '#dcfce7' : '#fef3c7', color: isLive ? '#16a34a' : '#d97706',
            padding: '5px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600,
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isLive ? '#16a34a' : '#d97706' }} />
            {isLive ? 'LIVE' : 'DEMO'}
          </span>

          {/* Refresh */}
          <button onClick={fetchLineage} style={{
            background: '#fff', border: '1px solid #ebe8df', padding: '6px 14px',
            borderRadius: '8px', fontSize: '12.5px', color: '#475569', cursor: 'pointer',
            fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            🔄 Refresh
          </button>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {Object.entries(typeConfig).map(([type, cfg]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: cfg.bg, border: `1px solid ${cfg.border}`, padding: '3px 8px', borderRadius: '20px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.border }} />
                <span style={{ fontSize: '10.5px', color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="lineage-search-box" style={{ position: 'relative', maxWidth: '480px', marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none', opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
            onFocus={() => { if (search) setShowDropdown(true) }}
            placeholder="Search tables, views, schemas..."
            style={{
              width: '100%', padding: '10px 40px 10px 38px', borderRadius: '10px',
              border: '1px solid #e2e8f0', fontSize: '13px', background: '#fff',
              color: '#0f172a', boxSizing: 'border-box', outline: 'none',
              boxShadow: showDropdown && matches.length > 0 ? '0 0 0 3px #dbeafe' : 'none',
              borderColor: showDropdown && matches.length > 0 ? '#93c5fd' : '#e2e8f0'
            }}
          />
          {search && (
            <button onClick={clearSearch} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1 }}>✕</button>
          )}
        </div>

        {showDropdown && matches.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, marginTop: '4px', maxHeight: '280px', overflowY: 'auto' }}>
            <div style={{ padding: '6px 12px', fontSize: '11px', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #f3f1ea' }}>
              {matches.length} object{matches.length !== 1 ? 's' : ''} found
            </div>
            {matches.map(m => {
              const cfg = typeConfig[m.type] ?? typeConfig.warehouse
              return (
                <div key={m.id} onMouseDown={() => selectNode(m.id, m.label)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{m.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#1a1a1a' }}>{m.label}</div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.sub}</div>
                  </div>
                  <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: '20px', fontSize: '10.5px', fontWeight: 600, flexShrink: 0 }}>{m.type}</span>
                </div>
              )
            })}
          </div>
        )}

        {showDropdown && search.trim().length > 0 && matches.length === 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, marginTop: '4px', padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No objects found for &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* Graph */}
      <div style={{ background: '#fff', border: '1px solid #ebe8df', borderRadius: '14px', padding: '24px', overflowX: 'auto' }}>
        <svg width={Math.max(maxX, 1100)} height={Math.max(maxY, 400)} viewBox={`0 0 ${Math.max(maxX, 1100)} ${Math.max(maxY, 400)}`} style={{ display: 'block', minWidth: `${Math.max(maxX, 1100)}px` }}>
          <defs>
            <marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="#cbd5e1" />
            </marker>
            <marker id="arrow-hl" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="#2563eb" />
            </marker>
            <marker id="arrow-up" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="#16a34a" />
            </marker>
            <marker id="arrow-dn" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="#ea580c" />
            </marker>
          </defs>

          {/* Edges */}
          {data.edges.map((edge, i) => {
            const from = nodeMap.get(edge.from)
            const to = nodeMap.get(edge.to)
            if (!from || !to) return null
            const fx = cx(from) + NODE_W / 2 - 8
            const fy = cy(from)
            const tx = cx(to) - NODE_W / 2 + 2
            const ty = cy(to)
            const midX = (fx + tx) / 2

            const isUpstream = selected && highlighted?.has(edge.from) && highlighted?.has(edge.to) && data.edges.some(e => e.to === selected && e.from === edge.from)
            const isDownstream = selected && highlighted?.has(edge.from) && highlighted?.has(edge.to) && data.edges.some(e => e.from === selected && e.to === edge.to)
            const isHL = highlighted?.has(edge.from) && highlighted?.has(edge.to)

            const stroke = isUpstream ? '#16a34a' : isDownstream ? '#ea580c' : isHL ? '#2563eb' : '#e2e8f0'
            const marker = isUpstream ? 'url(#arrow-up)' : isDownstream ? 'url(#arrow-dn)' : isHL ? 'url(#arrow-hl)' : 'url(#arrow)'

            return (
              <path key={i}
                d={`M${fx},${fy} C${midX},${fy} ${midX},${ty} ${tx},${ty}`}
                fill="none" stroke={stroke} strokeWidth={isHL ? 2 : 1}
                markerEnd={marker}
                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                opacity={highlighted && !isHL ? 0.15 : 1}
              />
            )
          })}

          {/* Nodes */}
          {laidOut.map(node => {
            const cfg = typeConfig[node.type] ?? typeConfig.warehouse
            const isSelected = selected === node.id
            const isDimmed = highlighted && !highlighted.has(node.id)
            return (
              <g key={node.id} style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (selected === node.id) { setSelected(null); setSearch('') }
                  else { selectNode(node.id, node.label) }
                }}>
                <rect x={node.x ?? 0} y={node.y ?? 0} width={NODE_W} height={NODE_H} rx={9}
                  fill={cfg.bg}
                  stroke={isSelected ? '#2563eb' : cfg.border}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={isDimmed ? 0.2 : 1}
                  filter={isSelected ? 'drop-shadow(0 0 8px rgba(37,99,235,0.35))' : undefined}
                  style={{ transition: 'all 0.2s' }}
                />
                <text x={(node.x ?? 0) + 10} y={(node.y ?? 0) + 24} fontSize="14" opacity={isDimmed ? 0.2 : 1}>{node.icon}</text>
                <text x={(node.x ?? 0) + 30} y={(node.y ?? 0) + 24} fontSize="11.5" fontWeight={isSelected ? 700 : 600} fill={cfg.color} opacity={isDimmed ? 0.2 : 1}>
                  {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
                </text>
                <text x={(node.x ?? 0) + 30} y={(node.y ?? 0) + 40} fontSize="9.5" fill={cfg.color} opacity={isDimmed ? 0.1 : 0.6}>{node.sub}</text>
                {node.rowCount != null && (
                  <text x={(node.x ?? 0) + NODE_W - 8} y={(node.y ?? 0) + 52} fontSize="8.5" fill={cfg.color} opacity={isDimmed ? 0.1 : 0.4} textAnchor="end">
                    {node.rowCount.toLocaleString()} rows
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <div ref={detailRef} style={{ marginTop: '16px', background: '#fff', border: '1px solid #93c5fd', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(37,99,235,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: (typeConfig[selectedNode.type] ?? typeConfig.warehouse).bg, border: `1px solid ${(typeConfig[selectedNode.type] ?? typeConfig.warehouse).border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{selectedNode.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: '#1a1a1a' }}>{selectedNode.label}</div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '2px' }}>{selectedNode.sub}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {selectedNode.rowCount != null && (
                <span style={{ background: '#f0f9ff', color: '#2563eb', padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600 }}>
                  {selectedNode.rowCount.toLocaleString()} rows
                </span>
              )}
              {selectedNode.columnCount > 0 && (
                <span style={{ background: '#faf5ff', color: '#7c3aed', padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600 }}>
                  {selectedNode.columnCount} cols
                </span>
              )}
              <span style={{ background: (typeConfig[selectedNode.type] ?? typeConfig.warehouse).bg, color: (typeConfig[selectedNode.type] ?? typeConfig.warehouse).color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>{selectedNode.type}</span>
              <button onClick={clearSearch} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', width: '28px', height: '28px', borderRadius: '7px', cursor: 'pointer', color: '#94a3b8', fontSize: '14px' }}>✕</button>
            </div>
          </div>

          {/* Metadata row */}
          {(selectedNode.database || selectedNode.schema || selectedNode.lastAltered || selectedNode.comment) && (
            <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', fontSize: '12.5px', color: '#475569', background: '#fafaf5', padding: '10px 14px', borderRadius: '8px', flexWrap: 'wrap' }}>
              {selectedNode.database && <span>🗄️ <strong>Database:</strong> {selectedNode.database}</span>}
              {selectedNode.schema && <span>📁 <strong>Schema:</strong> {selectedNode.schema}</span>}
              {selectedNode.lastAltered && <span>🕐 <strong>Modified:</strong> {new Date(selectedNode.lastAltered).toLocaleDateString()}</span>}
              {selectedNode.comment && <span>💬 {selectedNode.comment}</span>}
            </div>
          )}

          {/* Columns (live data only) */}
          {isLive && selectedNode.type !== 'source' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '8px' }}>
                COLUMNS ({selectedNode.columnCount})
              </div>
              {columnsLoading ? (
                <div style={{ fontSize: '12.5px', color: '#94a3b8', padding: '8px' }}>Loading columns...</div>
              ) : columnData && columnData.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px' }}>
                  {columnData.slice(0, 20).map((col: Record<string, unknown>, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#fafaf5', borderRadius: '6px', fontSize: '12px' }}>
                      <span style={{ color: '#475569', fontWeight: 500 }}>{String(col.COLUMN_NAME ?? '')}</span>
                      <span style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                        {String(col.DATA_TYPE ?? '').split('(')[0]}
                      </span>
                    </div>
                  ))}
                  {columnData.length > 20 && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', padding: '4px 8px' }}>+{columnData.length - 20} more</div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Upstream */}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⬆</span> UPSTREAM SOURCES ({upstream.length})
              </div>
              {upstream.length > 0
                ? upstream.map(n => (
                    <div key={n.id} onClick={() => selectNode(n.id, n.label)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '7px', marginBottom: '4px', cursor: 'pointer', background: 'rgba(255,255,255,0.6)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.6)')}>
                      <span style={{ fontSize: '14px' }}>{n.icon}</span>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#166534' }}>{n.label}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{n.sub}</div>
                      </div>
                    </div>
                  ))
                : <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No upstream sources — this is a root node</div>
              }
            </div>

            {/* Downstream */}
            <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11.5px', color: '#c2410c', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⬇</span> DOWNSTREAM CONSUMERS ({downstream.length})
              </div>
              {downstream.length > 0
                ? downstream.map(n => (
                    <div key={n.id} onClick={() => selectNode(n.id, n.label)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '7px', marginBottom: '4px', cursor: 'pointer', background: 'rgba(255,255,255,0.6)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.6)')}>
                      <span style={{ fontSize: '14px' }}>{n.icon}</span>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#c2410c' }}>{n.label}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{n.sub}</div>
                      </div>
                    </div>
                  ))
                : <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No downstream consumers — this is a terminal node</div>
              }
            </div>
          </div>

          {/* Impact summary */}
          <div style={{ marginTop: '12px', background: '#f8fafc', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#475569', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span>📊 <strong>{upstream.length}</strong> upstream source{upstream.length !== 1 ? 's' : ''}</span>
            <span>📡 <strong>{downstream.length}</strong> downstream consumer{downstream.length !== 1 ? 's' : ''}</span>
            <span>🔗 <strong>{upstream.length + downstream.length}</strong> total connections</span>
            <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>Click any node to navigate</span>
          </div>
        </div>
      )}
    </div>
  )
}
