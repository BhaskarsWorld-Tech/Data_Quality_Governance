'use client'
import { useState, useMemo } from 'react'
import { Report, CheckResult } from '@/lib/types'
import { formatDateTime, formatNumber } from '@/lib/utils'
import { useRouter } from 'next/navigation'

/* ── Config ──────────────────────────────────────────────────────── */

const statusConfig = {
  passed:  { bg: '#dcfce7', color: '#16a34a', label: '✓ Passed',  dot: '#16a34a' },
  failed:  { bg: '#fee2e2', color: '#dc2626', label: '✗ Failed',  dot: '#dc2626' },
  warning: { bg: '#fef9c3', color: '#ca8a04', label: '⚠ Warning', dot: '#ca8a04' },
}

const REPORT_TYPES = [
  { id: 'quality',   label: 'Quality Check',     icon: '🛡️', desc: 'Run all active quality rules and score every dataset' },
  { id: 'freshness', label: 'Freshness Report',   icon: '⏱️', desc: 'Check all SLA freshness targets across connections' },
  { id: 'anomaly',   label: 'Anomaly Summary',    icon: '📡', desc: 'Summarise all open anomalies by severity and domain' },
  { id: 'sla',       label: 'SLA Compliance',     icon: '📋', desc: 'Report adherence against every defined SLA' },
  { id: 'lineage',   label: 'Lineage Impact',     icon: '🔗', desc: 'Show downstream impact of datasets with open issues' },
  { id: 'custom',    label: 'Custom Report',      icon: '✨', desc: 'Pick specific datasets, rules, and date range' },
]

const FORMATS = [
  { id: 'web',  label: 'Web Report', icon: '🌐' },
  { id: 'pdf',  label: 'PDF',        icon: '📄' },
  { id: 'csv',  label: 'CSV Export', icon: '📊' },
  { id: 'json', label: 'JSON',       icon: '{ }' },
]

const DOMAINS   = ['All Domains', 'Finance', 'Marketing', 'Supply Chain', 'Catalog', 'Operations']
const DATASETS  = ['All Datasets', 'fact_orders', 'dim_customers', 'fact_payments', 'fact_inventory', 'web_sessions', 'dim_products', 'fact_returns']
const DATE_RANGES = ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Custom range']

const card: React.CSSProperties = { background: '#fff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #ebe8df' }
const lbl: React.CSSProperties = { fontSize: '12.5px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '6px' }
const sel: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#fafaf9', color: '#0f172a', outline: 'none' }

const scoreColor = (s: number) => s >= 90 ? '#16a34a' : s >= 75 ? '#ea8b3a' : '#dc2626'
const scoreBg = (s: number) => s >= 90 ? '#dcfce7' : s >= 75 ? '#fef3c7' : '#fee2e2'

/* ── Main Component ──────────────────────────────────────────────── */

export default function ReportsClient({ initialReports }: { initialReports: Report[] }) {
  const [reports, setReports] = useState(
    initialReports.sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
  )
  const [selected, setSelected] = useState<Report | null>(reports[0] || null)
  const [running, setRunning] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [expandedResult, setExpandedResult] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed' | 'warning'>('all')
  const [form, setForm] = useState({
    name: '', type: 'quality', format: 'web',
    domain: 'All Domains', dataset: 'All Datasets',
    dateRange: 'Last 7 days', includeAnomalies: true,
    includeSLAs: true, includeLineage: false, notify: false,
  })
  const router = useRouter()

  /* ── Analytics ──────────────────────────────────────────────── */

  const analytics = useMemo(() => {
    const totalRuns = reports.length
    const avgScore = reports.length > 0 ? Math.round(reports.reduce((s, r) => s + r.overallScore, 0) / reports.length) : 0
    const totalPassed = reports.reduce((s, r) => s + r.passed, 0)
    const totalFailed = reports.reduce((s, r) => s + r.failed, 0)
    const totalWarnings = reports.reduce((s, r) => s + r.warnings, 0)
    const totalChecks = reports.reduce((s, r) => s + r.totalChecks, 0)
    return { totalRuns, avgScore, totalPassed, totalFailed, totalWarnings, totalChecks }
  }, [reports])

  const filteredResults = useMemo(() => {
    if (!selected) return []
    if (statusFilter === 'all') return selected.results
    return selected.results.filter(r => r.status === statusFilter)
  }, [selected, statusFilter])

  /* ── Actions ────────────────────────────────────────────────── */

  function openCreate() {
    setForm({ name: '', type: 'quality', format: 'web', domain: 'All Domains', dataset: 'All Datasets', dateRange: 'Last 7 days', includeAnomalies: true, includeSLAs: true, includeLineage: false, notify: false })
    setShowModal(true)
  }

  async function runReport() {
    if (!form.name.trim()) return
    setRunning(true); setShowModal(false)
    const res = await fetch('/api/reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, type: form.type, domain: form.domain, dataset: form.dataset, dateRange: form.dateRange }),
    })
    const report = await res.json()
    const enriched = { ...report, name: form.name || `${REPORT_TYPES.find(t => t.id === form.type)?.label}` }
    setReports(prev => [enriched, ...prev])
    setSelected(enriched)
    setRunning(false)
    router.refresh()
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1300px' }}>
      <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '8px' }}>Workspace · <span style={{ color: '#475569' }}>Reports</span></div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>Quality Reports</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>{reports.length} report{reports.length !== 1 ? 's' : ''} · execution history and analytics</p>
        </div>
        <button onClick={openCreate} disabled={running} style={{
          background: running ? '#e2e8f0' : '#E8541A',
          color: running ? '#94a3b8' : '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px',
          fontSize: '12.5px', fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer',
        }}>{running ? '⏳ Running...' : '+ Create Report'}</button>
      </div>

      {/* KPI Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Runs', value: String(analytics.totalRuns), icon: '📊', color: '#2563eb', bg: '#dbeafe' },
          { label: 'Avg Score', value: `${analytics.avgScore}%`, icon: '📈', color: scoreColor(analytics.avgScore), bg: scoreBg(analytics.avgScore) },
          { label: 'Total Checks', value: formatNumber(analytics.totalChecks), icon: '🔍', color: '#475569', bg: '#f1f5f9' },
          { label: 'Passed', value: formatNumber(analytics.totalPassed), icon: '✓', color: '#16a34a', bg: '#dcfce7' },
          { label: 'Failed', value: formatNumber(analytics.totalFailed), icon: '✗', color: '#dc2626', bg: '#fee2e2' },
          { label: 'Warnings', value: formatNumber(analytics.totalWarnings), icon: '⚠', color: '#ca8a04', bg: '#fef9c3' },
        ].map((kpi, i) => (
          <div key={i} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{kpi.icon}</div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{kpi.label}</div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: kpi.color, letterSpacing: '-0.5px' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px' }}>

        {/* ── Reports List ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {reports.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📈</div>
              <div style={{ fontWeight: 600, color: '#475569', marginBottom: '6px' }}>No reports yet</div>
              <button onClick={openCreate} style={{ background: '#dbeafe', border: '1px solid #93c5fd', padding: '7px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}>+ Create Report</button>
            </div>
          ) : reports.map(r => (
            <button key={r.id} onClick={() => { setSelected(r); setExpandedResult(null); setStatusFilter('all') }} style={{
              background: selected?.id === r.id ? '#f0f9ff' : '#fff',
              border: selected?.id === r.id ? '1px solid #93c5fd' : '1px solid #ebe8df',
              borderRadius: '10px', padding: '12px', textAlign: 'left', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{r.name}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: scoreColor(r.overallScore) }}>{r.overallScore}%</div>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>{formatDateTime(r.executedAt)}</div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: 600 }}>✓{r.passed}</span>
                {r.failed > 0 && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: 600 }}>✗{r.failed}</span>}
                {r.warnings > 0 && <span style={{ background: '#fef9c3', color: '#ca8a04', padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: 600 }}>⚠{r.warnings}</span>}
              </div>
            </button>
          ))}
        </div>

        {/* ── Report Detail ── */}
        {selected ? (
          <div style={{ ...card, padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>{selected.name}</h2>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Executed {formatDateTime(selected.executedAt)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: scoreColor(selected.overallScore), lineHeight: 1 }}>{selected.overallScore}%</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Overall Score</div>
              </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Total Checks', value: selected.totalChecks, bg: '#f8fafc', color: '#0f172a' },
                { label: 'Passed', value: selected.passed, bg: '#dcfce7', color: '#16a34a' },
                { label: 'Failed', value: selected.failed, bg: '#fee2e2', color: '#dc2626' },
                { label: 'Warnings', value: selected.warnings, bg: '#fef9c3', color: '#ca8a04' },
              ].map(c => (
                <div key={c.label} style={{ background: c.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Trend chart */}
            {selected.trend && selected.trend.length > 1 && (() => {
              const W = 560, H = 80, PAD = 12
              const scores = selected.trend.map(t => t.score)
              const minS = Math.min(...scores) - 5
              const maxS = Math.max(...scores) + 5
              const range = maxS - minS || 1
              const pts = selected.trend.map((t, i) => ({
                x: PAD + (i / (selected.trend.length - 1)) * (W - PAD * 2),
                y: H - PAD - ((t.score - minS) / range) * (H - PAD * 2),
                score: t.score,
                label: t.date.split(' ')[1] ?? t.date,
              }))
              const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
              const areaD = `${pathD} L${pts[pts.length-1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`
              const last = pts[pts.length - 1]
              return (
                <div style={{ marginBottom: '20px', background: '#fafaf9', borderRadius: '12px', padding: '16px 18px', border: '1px solid #ebe8df' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>Quality Trend</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: scoreColor(last.score) }}>{last.score}%</div>
                  </div>
                  <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="tG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={scoreColor(last.score)} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={scoreColor(last.score)} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 0.5, 1].map((t, i) => (
                      <line key={i} x1={PAD} y1={PAD + t * (H - PAD * 2)} x2={W - PAD} y2={PAD + t * (H - PAD * 2)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
                    ))}
                    <path d={areaD} fill="url(#tG)" />
                    <path d={pathD} fill="none" stroke={scoreColor(last.score)} strokeWidth="2" strokeLinecap="round" />
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3" fill={i === pts.length - 1 ? scoreColor(p.score) : '#fff'} stroke={scoreColor(p.score)} strokeWidth="1.5" />
                        <text x={p.x} y={H} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="system-ui">{p.label}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              )
            })()}

            {/* Results filter tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>Check Results</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['all', 'passed', 'failed', 'warning'] as const).map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)} style={{
                    padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '11.5px', fontWeight: 500, textTransform: 'capitalize',
                    background: statusFilter === f ? '#1a1a1a' : '#f8fafc',
                    color: statusFilter === f ? '#fff' : '#64748b',
                  }}>{f} {f !== 'all' ? `(${selected.results.filter(r => r.status === f).length})` : ''}</button>
                ))}
              </div>
            </div>

            {/* Results table */}
            <div style={{ borderRadius: '10px', border: '1px solid #ebe8df', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 70px 80px 70px 80px 70px', gap: '8px', padding: '8px 14px', background: '#fafaf9', borderBottom: '1px solid #ebe8df' }}>
                {['Rule', 'Table', 'Score', 'Records', 'Failed', 'Status', 'Duration'].map(h => (
                  <div key={h} style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              {filteredResults.map((r, i) => {
                const s = statusConfig[r.status]
                const isExpanded = expandedResult === i
                return (
                  <div key={i}>
                    <div onClick={() => setExpandedResult(isExpanded ? null : i)} style={{
                      display: 'grid', gridTemplateColumns: '1fr 120px 70px 80px 70px 80px 70px', gap: '8px',
                      padding: '10px 14px', borderBottom: '1px solid #f8f6f0', cursor: 'pointer',
                      background: isExpanded ? '#fafaf9' : r.status === 'failed' ? '#fef2f2' : '#fff',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#0f172a' }}>{r.ruleName}</div>
                      </div>
                      <div>
                        <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', color: '#475569' }}>
                          {r.tableName}{r.columnName ? `.${r.columnName}` : ''}
                        </code>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${r.score}%`, background: scoreColor(r.score) }} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '12px', color: scoreColor(r.score) }}>{r.score}%</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{formatNumber(r.recordsChecked)}</div>
                      <div style={{ fontSize: '12px', color: r.recordsFailed > 0 ? '#ef4444' : '#16a34a', fontWeight: r.recordsFailed > 0 ? 600 : 400 }}>{formatNumber(r.recordsFailed)}</div>
                      <div>
                        <span style={{ background: s.bg, color: s.color, padding: '3px 8px', borderRadius: '20px', fontSize: '10.5px', fontWeight: 600 }}>{s.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>{(r.duration / 1000).toFixed(1)}s</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ padding: '14px 18px', background: '#fafaf9', borderBottom: '1px solid #ebe8df' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                          {[
                            { label: 'Records Checked', value: formatNumber(r.recordsChecked) },
                            { label: 'Records Failed', value: formatNumber(r.recordsFailed) },
                            { label: 'Quality Score', value: `${r.score}%` },
                            { label: 'Duration', value: `${(r.duration / 1000).toFixed(1)}s` },
                          ].map(m => (
                            <div key={m.label} style={{ background: '#fff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #ebe8df' }}>
                              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
                              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a', marginTop: '4px' }}>{m.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* SQL Preview */}
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Executed SQL</div>
                          <pre style={{
                            background: '#1e293b', color: '#86efac', padding: '12px 14px', borderRadius: '8px',
                            fontSize: '11.5px', fontFamily: 'monospace', overflow: 'auto', lineHeight: 1.5, maxHeight: '120px',
                          }}>
                            {`SELECT COUNT(*) AS failed_count\nFROM ${r.tableName}\nWHERE ${r.columnName || 'column'} IS NULL\n  OR ${r.columnName || 'column'} NOT IN (valid_values)`}
                          </pre>
                        </div>

                        {/* AI Analysis placeholder */}
                        {r.status === 'failed' && (
                          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '14px' }}>🤖</span>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1' }}>AI Analysis</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                              {r.recordsFailed} records failed the {r.ruleName} check on {r.tableName}.{r.columnName ? ` Column ${r.columnName} contains invalid or null values.` : ''} This may indicate an ETL issue in the upstream pipeline. Consider reviewing recent data loads.
                            </div>
                          </div>
                        )}

                        {r.details && (
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', background: '#fafaf9', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ebe8df' }}>
                            {r.details}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {filteredResults.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No results match the selected filter
                </div>
              )}

              {/* Footer */}
              <div style={{ padding: '8px 14px', background: '#fafaf9', fontSize: '11.5px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>Showing {filteredResults.length} of {selected.results.length} results</span>
                <span>Click a row to expand details</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...card, textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📈</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '6px' }}>Select a report</div>
            <div style={{ color: '#64748b', fontSize: '13px' }}>Click a report on the left to see its full results</div>
          </div>
        )}
      </div>

      {/* ── Create Report Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '560px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebe8df', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a1a' }}>Create Report</div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>Configure and run a new quality report</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontSize: '14px' }}>✕</button>
            </div>

            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>Report Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Weekly Finance Quality Report" style={sel} />
              </div>

              <div>
                <label style={lbl}>Report Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {REPORT_TYPES.map(t => (
                    <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))} style={{
                      padding: '12px 8px', borderRadius: '10px', border: `1px solid ${form.type === t.id ? '#E8541A' : '#e2e8f0'}`,
                      background: form.type === t.id ? '#fef3e2' : '#fafaf9', cursor: 'pointer', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '22px', marginBottom: '4px' }}>{t.icon}</div>
                      <div style={{ fontSize: '11px', fontWeight: form.type === t.id ? 700 : 500, color: form.type === t.id ? '#E8541A' : '#475569' }}>{t.label}</div>
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', padding: '8px 12px', background: '#f0f9ff', borderRadius: '7px', border: '1px solid #bae6fd' }}>
                  {REPORT_TYPES.find(t => t.id === form.type)?.desc}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lbl}>Domain</label>
                  <select value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} style={sel}>
                    {DOMAINS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Dataset</label>
                  <select value={form.dataset} onChange={e => setForm(f => ({ ...f, dataset: e.target.value }))} style={sel}>
                    {DATASETS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={lbl}>Date Range</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {DATE_RANGES.map(dr => (
                    <button key={dr} onClick={() => setForm(f => ({ ...f, dateRange: dr }))} style={{
                      padding: '6px 12px', borderRadius: '20px', border: `1px solid ${form.dateRange === dr ? '#E8541A' : '#e2e8f0'}`,
                      background: form.dateRange === dr ? '#fef3e2' : '#fff', color: form.dateRange === dr ? '#E8541A' : '#64748b',
                      fontSize: '12px', fontWeight: form.dateRange === dr ? 600 : 400, cursor: 'pointer',
                    }}>{dr}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Include in Report</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { key: 'includeAnomalies', label: 'Anomaly detections', icon: '📡' },
                    { key: 'includeSLAs',      label: 'SLA compliance status', icon: '⏱️' },
                    { key: 'includeLineage',   label: 'Data lineage impact', icon: '🔗' },
                    { key: 'notify',           label: 'Send email notification', icon: '📧' },
                  ].map(opt => (
                    <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '7px 10px', borderRadius: '8px', background: '#fafaf9', border: '1px solid #ebe8df' }}>
                      <input type="checkbox" checked={form[opt.key as keyof typeof form] as boolean} onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))} style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#E8541A' }} />
                      <span style={{ fontSize: '12.5px', color: '#475569' }}>{opt.icon} {opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Output Format</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {FORMATS.map(fmt => (
                    <button key={fmt.id} onClick={() => setForm(f => ({ ...f, format: fmt.id }))} style={{
                      flex: 1, padding: '9px 6px', borderRadius: '8px', border: `1px solid ${form.format === fmt.id ? '#E8541A' : '#e2e8f0'}`,
                      background: form.format === fmt.id ? '#fef3e2' : '#fafaf9', cursor: 'pointer', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '16px', marginBottom: '3px' }}>{fmt.icon}</div>
                      <div style={{ fontSize: '10.5px', fontWeight: form.format === fmt.id ? 700 : 500, color: form.format === fmt.id ? '#E8541A' : '#64748b' }}>{fmt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button onClick={runReport} disabled={!form.name.trim()} style={{
                  flex: 2, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600,
                  cursor: form.name.trim() ? 'pointer' : 'not-allowed',
                  background: form.name.trim() ? '#E8541A' : '#e2e8f0',
                  color: form.name.trim() ? '#fff' : '#94a3b8',
                }}>▶ Run Report</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
