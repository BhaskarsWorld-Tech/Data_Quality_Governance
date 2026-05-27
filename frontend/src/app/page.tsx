'use client'
import { useState, useEffect } from 'react'
import Dashboard from '@/components/dashboard/Dashboard'
import type { CheckResult } from '@/lib/types'
import { loadConnections, loadRules, loadReports } from '@/lib/seedData'

export default function HomePage() {
  const [stats, setStats] = useState({
    totalRules: 0, enabledRules: 0, totalConnections: 0,
    activeConnections: 0, overallScore: 0, passed: 0,
    failed: 0, warnings: 0, totalChecks: 0,
    trend: [] as { date: string; score: number }[],
    recentChecks: [] as CheckResult[],
    lastRunAt: null as string | null,
  })

  useEffect(() => {
    async function load() {
      const [connections, rules, reports] = await Promise.all([
        loadConnections(), loadRules(), loadReports()
      ])
      const latest = reports.sort((a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
      )[0]

      setStats({
        totalConnections: connections.length,
        activeConnections: connections.filter(c => c.status === 'active').length,
        totalRules: rules.length,
        enabledRules: rules.filter(r => r.enabled).length,
        overallScore: latest?.overallScore || 0,
        passed: latest?.passed || 0,
        failed: latest?.failed || 0,
        warnings: latest?.warnings || 0,
        totalChecks: latest?.totalChecks || 0,
        trend: latest?.trend || [],
        recentChecks: (latest?.results?.slice(0, 5) || []) as CheckResult[],
        lastRunAt: latest?.executedAt || null,
      })
    }
    load()
  }, [])

  return <Dashboard stats={stats} />
}
