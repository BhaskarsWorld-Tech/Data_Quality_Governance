'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

/* ─── Icon helper ─── */
const I = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

/* ─── Section definitions ─── */
type SubItem = { href: string; label: string; iconD: string; badge?: string }
type Section = {
  key: string
  label: string
  railIconD: string
  items: SubItem[]
}

const sections: Section[] = [
  {
    key: 'quality', label: 'Data Quality',
    railIconD: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-9c2.5 3 4 6 4 9s-1.5 6-4 9c-2.5-3-4-6-4-9s1.5-6 4-9zM3 12h18',
    items: [
      { href: '/',               label: 'Overview',        iconD: 'M3 12l2-2 4 4 8-8 4 4M3 21h18' },
      { href: '/rules',          label: 'Rules',           iconD: 'M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z', badge: '418' },
      { href: '/issues',         label: 'Issues',          iconD: 'M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z', badge: '23' },
      { href: '/datasets',       label: 'Data Assets',     iconD: 'M3 5c0-1.7 4-3 9-3s9 1.3 9 3v14c0 1.7-4 3-9 3s-9-1.3-9-3V5zm0 0c0 1.7 4 3 9 3s9-1.3 9-3M3 12c0 1.7 4 3 9 3s9-1.3 9-3' },
      { href: '/anomalies',      label: 'Anomalies',       iconD: 'M3 17l6-6 4 4 8-8M14 7h7v7' },
      { href: '/schedules',      label: 'Schedules',       iconD: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
      { href: '/execution-logs', label: 'Execution Logs',  iconD: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M9 13h6M9 17h6M9 9h2' },
    ]
  },
  {
    key: 'govern', label: 'Governance',
    railIconD: 'M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z',
    items: [
      { href: '/lineage',       label: 'Lineage',        iconD: 'M5 12h4l3-7 4 14 3-7h4' },
      { href: '/catalog',       label: 'Catalog',        iconD: 'M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20' },
      { href: '/governance',    label: 'Governance',     iconD: 'M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z' },
      { href: '/glossary',      label: 'Glossary',       iconD: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z' },
      { href: '/contracts',     label: 'Contracts',      iconD: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M9 13h6M9 17h6M9 9h2' },
      { href: '/slas',          label: 'SLAs',           iconD: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/domains',       label: 'Domains',        iconD: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-9c2.5 3 4 6 4 9s-1.5 6-4 9c-2.5-3-4-6-4-9s1.5-6 4-9zM3 12h18' },
    ]
  },
  {
    key: 'alerts', label: 'Alerts',
    railIconD: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1',
    items: [
      { href: '/alerts',      label: 'Alerts',          iconD: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1' },
      { href: '/incidents',  label: 'Incidents',       iconD: 'M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z' },
      { href: '/audit-logs', label: 'Audit Logs',      iconD: 'M9 12l2 2 4-4M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c2.5 0 4.7 1 6.4 2.6' },
    ]
  },
  {
    key: 'explore', label: 'Explore',
    railIconD: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    items: [
      { href: '/data-browser',   label: 'Data Browser',    iconD: 'M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z' },
      { href: '/connections',    label: 'Connections',     iconD: 'M9 17H7A5 5 0 117 7h2m6 0h2a5 5 0 010 10h-2M8 12h8' },
      { href: '/reports',        label: 'Reports',         iconD: 'M9 19V6a1 1 0 011-1h4a1 1 0 011 1v13M5 19V11a1 1 0 011-1h3v9M19 19v-5a1 1 0 00-1-1h-3v6M3 19h18' },
      { href: '/data-products',  label: 'Data Products',   iconD: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href: '/executive',      label: 'Executive View',  iconD: 'M3 12l2-2 4 4 8-8 4 4M3 21h18' },
    ]
  },
  {
    key: 'actions', label: 'Actions',
    railIconD: 'M15 3l6 6-9 9-6-6 9-9zM9.5 13.5L4 19M19 3l2 2',
    items: [
      { href: '/ai-assistant',  label: 'AI Assistant',   iconD: 'M12 2a3 3 0 00-3 3v1H7a2 2 0 00-2 2v3H4a2 2 0 000 4h1v3a2 2 0 002 2h2v1a3 3 0 006 0v-1h2a2 2 0 002-2v-3h1a2 2 0 000-4h-1V8a2 2 0 00-2-2h-2V5a3 3 0 00-3-3zM9 11h.01M15 11h.01' },
    ]
  },
  {
    key: 'security', label: 'Security',
    railIconD: 'M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4zM9 12l2 2 4-4',
    items: [
      { href: '/compliance',     label: 'Compliance',      iconD: 'M9 12l2 2 4-4M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z' },
    ]
  },
  {
    key: 'integration', label: 'Integrations',
    railIconD: 'M4 6h4v4H4zM16 6h4v4h-4zM10 14h4v4h-4zM6 10v4M18 10v4M8 8h8M12 14v-2',
    items: [
      { href: '/connections',    label: 'Connections',     iconD: 'M9 17H7A5 5 0 117 7h2m6 0h2a5 5 0 010 10h-2M8 12h8' },
    ]
  },
  {
    key: 'settings', label: 'Settings',
    railIconD: 'M10.3 3.5l-.4 1.7a7.5 7.5 0 00-1.6.7L6.6 5l-1.6 1.6 1 1.7c-.3.5-.5 1-.7 1.6l-1.7.4v2.3l1.7.4c.2.6.4 1.1.7 1.6l-1 1.7L6.6 19l1.7-.9c.5.3 1 .5 1.6.7l.4 1.7h2.3l.4-1.7c.6-.2 1.1-.4 1.6-.7l1.7.9 1.6-1.6-.9-1.7c.3-.5.5-1 .7-1.6l1.7-.4v-2.3l-1.7-.4c-.2-.6-.4-1.1-.7-1.6l.9-1.7-1.6-1.6-1.7.9c-.5-.3-1-.5-1.6-.7l-.4-1.7h-2.3zm1.2 5.5a3 3 0 110 6 3 3 0 010-6z',
    items: [
      { href: '/settings',     label: 'Settings',      iconD: 'M10.3 3.5l-.4 1.7a7.5 7.5 0 00-1.6.7L6.6 5l-1.6 1.6 1 1.7c-.3.5-.5 1-.7 1.6l-1.7.4v2.3l1.7.4c.2.6.4 1.1.7 1.6l-1 1.7L6.6 19l1.7-.9c.5.3 1 .5 1.6.7l.4 1.7h2.3l.4-1.7c.6-.2 1.1-.4 1.6-.7l1.7.9 1.6-1.6-.9-1.7c.3-.5.5-1 .7-1.6l1.7-.4v-2.3l-1.7-.4c-.2-.6-.4-1.1-.7-1.6l.9-1.7-1.6-1.6-1.7.9c-.5-.3-1-.5-1.6-.7l-.4-1.7h-2.3zm1.2 5.5a3 3 0 110 6 3 3 0 010-6z' },
      { href: '/architecture',  label: 'User Guide',    iconD: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z' },
    ]
  },
]

/* ─── Constants ─── */
const RAIL_W  = 72
const PANEL_W = 220
const TOP_H   = 56

function sectionForPath(pathname: string): string {
  for (const s of sections) {
    if (s.items.some(i => i.href === pathname)) return s.key
  }
  return sections[0].key
}

/* ─── Component ─── */
export default function Sidebar() {
  const pathname = usePathname()
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(() => sectionForPath(pathname))
  const panelRef = useRef<HTMLDivElement>(null)

  const currentSection = sections.find(s => s.key === activeSection) ?? sections[0]

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelOpen && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [panelOpen])

  // Close panel on route change
  useEffect(() => { setPanelOpen(false) }, [pathname])

  function handleRailClick(sectionKey: string) {
    if (panelOpen && activeSection === sectionKey) {
      setPanelOpen(false)
    } else {
      setActiveSection(sectionKey)
      setPanelOpen(true)
    }
  }

  return (
    <>
      {/* ── Top bar ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: TOP_H,
        background: '#ffffff',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 14,
        zIndex: 60,
        borderBottom: '1px solid #ebe8df',
      }}>
        {/* Hamburger */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: '#E8541A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(232,84,26,0.3)',
          flexShrink: 0,
        }}>
          <svg width="22" height="13" viewBox="0 0 48 28" fill="none">
            <path d="M14 4 C6 4 2 9 2 14 C2 19 6 24 14 24 C19 24 23 21 25 17 C23 21 27 24 34 24 C42 24 46 19 46 14 C46 9 42 4 34 4 C27 4 23 7 25 11 C23 7 19 4 14 4 Z"
              fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="5" y1="14" x2="22" y2="14" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Brand name */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.5px' }}>Data</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#E8541A', letterSpacing: '-0.5px' }}>Guard</span>
        </div>
      </header>

      {/* ── Icon Rail (always visible) ── */}
      <nav style={{
        position: 'fixed', left: 0, top: TOP_H, bottom: 0,
        width: RAIL_W,
        background: '#ffffff',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 12, gap: 6,
        zIndex: 55,
        borderRight: '1px solid #ebe8df',
        overflowY: 'auto',
      }}>
        {sections.map(s => {
          const isActive = s.key === activeSection && panelOpen
          const hasActivePage = s.items.some(i => i.href === pathname)
          return (
            <button
              key={s.key}
              title={s.label}
              onClick={() => handleRailClick(s.key)}
              style={{
                width: 48, height: 48, borderRadius: 14,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive
                  ? '#eef4ff'
                  : hasActivePage
                    ? '#f0f7ff'
                    : 'transparent',
                color: isActive
                  ? '#2563eb'
                  : hasActivePage
                    ? '#3b82f6'
                    : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              <I d={s.railIconD} size={22} />
            </button>
          )
        })}
      </nav>

      {/* ── Overlay ── */}
      {panelOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.12)',
          zIndex: 49,
          transition: 'opacity 0.2s',
        }} onClick={() => setPanelOpen(false)} />
      )}

      {/* ── Slide-out sub-menu panel ── */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          left: RAIL_W,
          top: TOP_H,
          bottom: 0,
          width: PANEL_W,
          background: '#fafaf5',
          borderRight: '1px solid #ebe8df',
          boxShadow: panelOpen ? '6px 0 20px rgba(0,0,0,0.06)' : 'none',
          transform: panelOpen ? 'translateX(0)' : `translateX(-${PANEL_W + 10}px)`,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 54,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Section heading */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid #ebe8df',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: '#1a1a1a', fontSize: 15, fontWeight: 700,
            letterSpacing: '-0.3px',
          }}>
            <span style={{ color: '#2563eb', display: 'flex' }}>
              <I d={currentSection.railIconD} size={16} />
            </span>
            {currentSection.label}
          </div>
        </div>

        {/* Sub-items */}
        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
          {currentSection.items.map(item => {
            const isItemActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10, marginBottom: 3,
                  background: isItemActive ? '#eef4ff' : 'transparent',
                  color: isItemActive ? '#2563eb' : '#475569',
                  fontSize: 13.5, fontWeight: isItemActive ? 600 : 450,
                  transition: 'all 0.15s', cursor: 'pointer',
                  borderLeft: isItemActive ? '2px solid #2563eb' : '2px solid transparent',
                  paddingLeft: isItemActive ? '12px' : '14px',
                }}>
                  <span style={{ display: 'flex', opacity: isItemActive ? 1 : 0.6, flexShrink: 0 }}>
                    <I d={item.iconD} size={16} />
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      background: isItemActive ? '#dbeafe' : '#f1f5f9',
                      color: isItemActive ? '#2563eb' : '#94a3b8',
                      padding: '2px 8px', borderRadius: 20,
                      fontSize: 10.5, fontWeight: 600, minWidth: 22, textAlign: 'center',
                    }}>{item.badge}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #ebe8df',
          background: '#f5f4ef',
        }}>
          <div style={{
            fontSize: 10.5, color: '#b0ad9f',
            textAlign: 'center', letterSpacing: '0.03em',
          }}>
            DataGuard v3.0
          </div>
        </div>
      </div>
    </>
  )
}
