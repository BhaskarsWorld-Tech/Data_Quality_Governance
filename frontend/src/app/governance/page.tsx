'use client'
import { useState } from 'react'
import Link from 'next/link'

type ScoreLevel = 'high' | 'medium' | 'low'

interface DomainScore {
  id: string; name: string; icon: string
  quality: number; documentation: number; classification: number
  ownership: number; certification: number; sla: number; overall: number
}

const DOMAINS: DomainScore[] = [
  { id: 'd1', name: 'Finance', icon: '💰', quality: 96, documentation: 92, classification: 88, ownership: 95, certification: 90, sla: 98, overall: 93 },
  { id: 'd2', name: 'Marketing', icon: '📣', quality: 87, documentation: 78, classification: 72, ownership: 85, certification: 60, sla: 82, overall: 77 },
  { id: 'd3', name: 'Supply Chain', icon: '🚚', quality: 91, documentation: 85, classification: 80, ownership: 90, certification: 75, sla: 94, overall: 86 },
  { id: 'd4', name: 'Sales', icon: '🛒', quality: 94, documentation: 90, classification: 86, ownership: 93, certification: 88, sla: 96, overall: 91 },
  { id: 'd5', name: 'Engineering', icon: '⚙️', quality: 89, documentation: 82, classification: 76, ownership: 88, certification: 70, sla: 85, overall: 82 },
  { id: 'd6', name: 'Data Platform', icon: '📊', quality: 98, documentation: 95, classification: 93, ownership: 97, certification: 95, sla: 99, overall: 96 },
]

interface PolicyItem {
  id: string; name: string; description: string; domain: string
  status: 'active' | 'draft' | 'review'; enforcement: 'enforced' | 'advisory'
  rulesCount: number; lastEval: string
}

const POLICIES: PolicyItem[] = [
  { id: 'p1', name: 'PII Data Classification', description: 'All tables containing PII must be classified and documented', domain: 'All', status: 'active', enforcement: 'enforced', rulesCount: 24, lastEval: '2h ago' },
  { id: 'p2', name: 'Data Freshness SLA', description: 'Critical datasets must be refreshed within SLA windows', domain: 'Finance', status: 'active', enforcement: 'enforced', rulesCount: 18, lastEval: '1h ago' },
  { id: 'p3', name: 'Ownership Assignment', description: 'Every dataset must have a business and technical owner', domain: 'All', status: 'active', enforcement: 'advisory', rulesCount: 12, lastEval: '30m ago' },
  { id: 'p4', name: 'Schema Change Review', description: 'Schema changes in production must be reviewed and approved', domain: 'Engineering', status: 'active', enforcement: 'enforced', rulesCount: 8, lastEval: '4h ago' },
  { id: 'p5', name: 'Data Retention Policy', description: 'Historical data older than 7 years must be archived', domain: 'Finance', status: 'draft', enforcement: 'advisory', rulesCount: 6, lastEval: 'Never' },
  { id: 'p6', name: 'Cross-Domain Validation', description: 'Shared datasets must pass cross-domain quality checks', domain: 'Sales', status: 'review', enforcement: 'advisory', rulesCount: 15, lastEval: '6h ago' },
]

function scoreColor(s: number): string { return s >= 90 ? '#16a34a' : s >= 75 ? '#ea8b3a' : '#dc2626' }
function scoreBg(s: number): string { return s >= 90 ? '#dcfce7' : s >= 75 ? '#fef3c7' : '#fee2e2' }
function statusColor(s: string): string { return s === 'active' ? '#16a34a' : s === 'review' ? '#ea8b3a' : '#94a3b8' }

const card: React.CSSProperties = { background: '#fff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #ebe8df' }

export default function GovernancePage() {
  const [tab, setTab] = useState<'scorecards' | 'policies'>('scorecards')

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1300px' }}>
      <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '8px' }}>Workspace · <span style={{ color: '#475569' }}>Governance</span></div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>Data Governance</h1>
      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>Monitor governance posture, domain scorecards, and policy compliance</p>

      {/* Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Governance Score', value: '87.5', change: '▲ 2.1', changeColor: '#16a34a' },
          { label: 'Policies Active', value: '14', sub: '4 enforced · 10 advisory' },
          { label: 'Assets Classified', value: '89%', change: '▲ 5%', changeColor: '#16a34a' },
          { label: 'Ownership Coverage', value: '94%', change: '▲ 1.2%', changeColor: '#16a34a' },
        ].map((kpi, i) => (
          <div key={i} style={card}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>{kpi.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-1px' }}>{kpi.value}</span>
              {kpi.change && <span style={{ fontSize: '12px', color: kpi.changeColor, fontWeight: 600 }}>{kpi.change}</span>}
            </div>
            {kpi.sub && <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {(['scorecards', 'policies'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600, textTransform: 'capitalize',
            background: tab === t ? '#1a1a1a' : '#f8fafc', color: tab === t ? '#fff' : '#64748b',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'scorecards' && (
        <div style={card}>
          <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#1a1a1a', marginBottom: '16px' }}>Domain Governance Scorecards</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ebe8df' }}>
                {['Domain', 'Quality', 'Docs', 'Classification', 'Ownership', 'Certification', 'SLA', 'Overall'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8', fontWeight: 500, fontSize: '11.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOMAINS.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f3f1ea' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1a1a1a' }}>
                    <span style={{ marginRight: '8px' }}>{d.icon}</span>{d.name}
                  </td>
                  {[d.quality, d.documentation, d.classification, d.ownership, d.certification, d.sla].map((s, i) => (
                    <td key={i} style={{ padding: '12px' }}>
                      <span style={{ background: scoreBg(s), color: scoreColor(s), padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{s}</span>
                    </td>
                  ))}
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: scoreBg(d.overall), color: scoreColor(d.overall), padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 700 }}>{d.overall}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'policies' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#1a1a1a' }}>Governance Policies</div>
            <button style={{ background: '#E8541A', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>+ Create Policy</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {POLICIES.map(p => (
              <div key={p.id} style={{ border: '1px solid #ebe8df', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🛡️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1a1a1a' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{p.description}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{p.domain}</span>
                  <span style={{ background: p.enforcement === 'enforced' ? '#dbeafe' : '#fef3c7', color: p.enforcement === 'enforced' ? '#2563eb' : '#d97706', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>{p.enforcement}</span>
                  <span style={{ background: '#f8fafc', color: statusColor(p.status), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize', border: `1px solid ${statusColor(p.status)}33` }}>{p.status}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{p.rulesCount} rules · {p.lastEval}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
