import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { generateId } from '@/lib/utils'
import { Report, CheckResult, Rule } from '@/lib/types'

/* Generate a realistic SQL preview based on rule type */
function generateSQL(rule: Rule): string {
  const table = rule.tableName
  const col = rule.columnName || 'column'
  const p = rule.parameters || {}

  switch (rule.type) {
    case 'null_check':
    case 'not_null':
      return `SELECT COUNT(*) AS failed_count\nFROM ${table}\nWHERE "${col}" IS NULL`
    case 'uniqueness_check':
    case 'unique':
      return `SELECT "${col}", COUNT(*) AS cnt\nFROM ${table}\nGROUP BY "${col}"\nHAVING COUNT(*) > 1`
    case 'duplicate_check':
      return `SELECT "${col}", COUNT(*) AS dup_count\nFROM ${table}\nGROUP BY "${col}"\nHAVING COUNT(*) > 1`
    case 'range_check':
    case 'range':
      return `SELECT COUNT(*) AS out_of_range\nFROM ${table}\nWHERE "${col}" < ${p.min ?? 0}\n   OR "${col}" > ${p.max ?? 999999}`
    case 'regex_check':
    case 'regex':
      return `SELECT COUNT(*) AS invalid_format\nFROM ${table}\nWHERE NOT REGEXP_LIKE("${col}", '${p.pattern || '.*'}')`
    case 'freshness_check':
    case 'freshness':
      return `SELECT DATEDIFF('hour', MAX("${col}"), CURRENT_TIMESTAMP()) AS hours_since_update\nFROM ${table}\n-- Threshold: ${p.maxAgeHours || 24} hours`
    case 'volume_check':
    case 'row_count':
      return `SELECT COUNT(*) AS row_count\nFROM ${table}\n-- Min expected: ${p.minRows || 1} rows`
    case 'accepted_values_check':
      const vals = (p.values as string[] || []).map(v => `'${v}'`).join(', ')
      return `SELECT COUNT(*) AS invalid_values\nFROM ${table}\nWHERE "${col}" NOT IN (${vals})`
    case 'referential_integrity_check':
    case 'referential':
      return `SELECT COUNT(*) AS orphaned_rows\nFROM ${table} t\nLEFT JOIN ${p.referencedTable || 'ref_table'} r\n  ON t."${col}" = r."${p.referencedColumn || col}"\nWHERE r."${p.referencedColumn || col}" IS NULL\n  AND t."${col}" IS NOT NULL`
    case 'schema_drift_check':
      return `SELECT COUNT(*) AS column_count\nFROM INFORMATION_SCHEMA.COLUMNS\nWHERE TABLE_NAME = '${table}'\n-- Expected: ${p.expectedColumns || '?'} columns`
    case 'business_rule_check':
      return String(p.sql || `-- Business rule check on ${table}`)
    case 'custom_sql_check':
      return String(p.sql || `-- Custom SQL check on ${table}`)
    case 'business_metric_check':
      return `-- Metric: ${p.metric || 'custom'}\nSELECT AVG(TOTAL_AMOUNT) AS metric_value\nFROM ${table}\n-- Expected range: ${p.min ?? '?'} - ${p.max ?? '?'}`
    default:
      return `-- ${rule.type} check on ${table}.${col}`
  }
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
    const sql = generateSQL(rule)

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
      details: `Rule: ${rule.name} | Type: ${ruleTypeLabel(rule.type)} | Category: ${rule.category} | Scope: ${rule.scope} | Target: ${rule.tableName}${rule.columnName ? '.' + rule.columnName : ''} | Connection: ${conn?.name || 'Unknown'}`,
      ruleType: rule.type,
      ruleCategory: rule.category,
      severity: rule.severity,
      scope: rule.scope,
      sql,
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

  // Update rule last run info
  for (const result of results) {
    store.rules.update(result.ruleId, {
      lastRunAt: result.executedAt,
      lastRunStatus: result.status,
      lastRunScore: result.score,
    })
  }

  store.reports.create(report)
  return NextResponse.json(report, { status: 201 })
}
