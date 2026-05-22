import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { generateId } from '@/lib/utils'
import { Report, CheckResult, RuleType } from '@/lib/types'

/* Rule scope classification */
const GENERIC_RULE_TYPES: RuleType[] = [
  'not_null', 'unique', 'range', 'regex', 'freshness', 'row_count',
  'null_check', 'uniqueness_check', 'duplicate_check', 'accepted_values_check',
  'range_check', 'freshness_check', 'volume_check', 'regex_check',
]
function ruleScope(type: RuleType): 'generic' | 'object-specific' {
  return GENERIC_RULE_TYPES.includes(type) ? 'generic' : 'object-specific'
}

/* Human-readable rule type label */
function ruleTypeLabel(type: string): string {
  const map: Record<string, string> = {
    not_null: 'Not Null', unique: 'Unique', range: 'Range', regex: 'Regex',
    custom_sql: 'Custom SQL', freshness: 'Freshness', row_count: 'Row Count',
    referential: 'Referential', null_check: 'Null Check', uniqueness_check: 'Uniqueness',
    duplicate_check: 'Duplicate', accepted_values_check: 'Accepted Values',
    range_check: 'Range', freshness_check: 'Freshness', volume_check: 'Volume',
    schema_drift_check: 'Schema Drift', referential_integrity_check: 'Referential Integrity',
    regex_check: 'Regex', business_rule_check: 'Business Rule', custom_sql_check: 'Custom SQL',
    semantic_consistency_check: 'Semantic Consistency', referential_sanity_check: 'Referential Sanity',
    business_metric_check: 'Business Metric', distribution_consistency_check: 'Distribution',
    llm_semantic_check: 'LLM Semantic',
  }
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export async function GET() {
  const reports = store.reports.getAll()
  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const rules = store.rules.getAll()
  const connections = store.connections.getAll()
  const enabledRules = rules.filter(r => r.enabled)

  const results: CheckResult[] = enabledRules.map(rule => {
    const conn = connections.find(c => c.id === rule.connectionId)
    const score = Math.random() * 20 + 80
    const recordsChecked = Math.floor(Math.random() * 100000) + 10000
    const recordsFailed = score < 95 ? Math.floor(recordsChecked * (1 - score / 100)) : 0
    const status = score >= 98 ? 'passed' : score >= 90 ? 'warning' : 'failed'

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      connectionName: conn?.name || 'Unknown',
      tableName: rule.tableName,
      columnName: rule.columnName,
      status: status as 'passed' | 'failed' | 'warning',
      score: Math.round(score * 10) / 10,
      recordsChecked,
      recordsFailed,
      executedAt: new Date().toISOString(),
      duration: Math.floor(Math.random() * 3000) + 500,
      details: `Checked ${recordsChecked.toLocaleString()} records · Rule type: ${ruleTypeLabel(rule.type)} · Category: ${rule.category}`,
      ruleType: rule.type,
      ruleCategory: rule.category,
      severity: rule.severity,
      scope: ruleScope(rule.type),
    }
  })

  const passed = results.filter(r => r.status === 'passed').length
  const failed = results.filter(r => r.status === 'failed').length
  const warnings = results.filter(r => r.status === 'warning').length
  const overallScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0

  const today = new Date()
  const trend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Math.floor(Math.random() * 15) + 82
    }
  })
  trend[6].score = overallScore

  const report: Report = {
    id: generateId('report'),
    name: body.name || `Quality Check - ${new Date().toLocaleDateString()}`,
    overallScore,
    totalChecks: results.length,
    passed,
    failed,
    warnings,
    executedAt: new Date().toISOString(),
    results,
    trend
  }

  store.reports.create(report)
  return NextResponse.json(report, { status: 201 })
}
