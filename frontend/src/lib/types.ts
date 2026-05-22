export type ConnectionType = 'postgresql' | 'mysql' | 'bigquery' | 'snowflake' | 'csv' | 'api' | 'mongodb' | 'redshift'

export interface Connection {
  id: string
  name: string
  type: ConnectionType
  // Common fields
  host?: string
  port?: number
  database?: string
  username?: string
  schema?: string
  // Snowflake-specific
  account?: string
  warehouse?: string
  role?: string
  // BigQuery-specific
  project?: string
  keyFile?: string
  // MongoDB / API
  connectionString?: string
  baseUrl?: string
  authType?: string
  delimiter?: string
  filePath?: string
  status: 'active' | 'inactive' | 'error'
  lastTested?: string
  createdAt: string
  [key: string]: unknown   // allow extra fields without TS errors
}

export type RuleCategory = 'completeness' | 'accuracy' | 'uniqueness' | 'validity' | 'timeliness' | 'consistency'
export type RuleType =
  | 'not_null' | 'unique' | 'range' | 'regex' | 'custom_sql' | 'freshness' | 'row_count' | 'referential'
  | 'null_check' | 'uniqueness_check' | 'duplicate_check' | 'accepted_values_check'
  | 'range_check' | 'freshness_check' | 'volume_check' | 'schema_drift_check'
  | 'referential_integrity_check' | 'regex_check' | 'business_rule_check' | 'custom_sql_check'
  | 'semantic_consistency_check' | 'referential_sanity_check' | 'business_metric_check'
  | 'distribution_consistency_check' | 'llm_semantic_check'

export type RuleStatus = 'active' | 'draft' | 'pending_review' | 'disabled' | 'archived'

export interface Rule {
  id: string
  name: string
  description: string
  category: RuleCategory
  type: RuleType
  connectionId: string
  tableName: string
  columnName?: string
  parameters: Record<string, unknown>
  enabled: boolean
  status: RuleStatus
  severity: 'critical' | 'high' | 'medium' | 'low'
  createdAt: string
  lastRunAt?: string
  lastRunStatus?: 'passed' | 'failed' | 'warning' | 'error'
  lastRunScore?: number
}

export interface CheckResult {
  ruleId: string
  ruleName: string
  connectionName: string
  tableName: string
  columnName?: string
  status: 'passed' | 'failed' | 'warning'
  score: number
  recordsChecked: number
  recordsFailed: number
  executedAt: string
  duration: number
  details?: string
  ruleType?: RuleType
  ruleCategory?: RuleCategory
  severity?: 'critical' | 'high' | 'medium' | 'low'
  scope?: 'generic' | 'object-specific'
}

export interface Report {
  id: string
  name: string
  overallScore: number
  totalChecks: number
  passed: number
  failed: number
  warnings: number
  executedAt: string
  results: CheckResult[]
  trend: { date: string; score: number }[]
}

export interface DashboardStats {
  totalRules: number
  activeConnections: number
  checksToday: number
  overallScore: number
  trend: { date: string; score: number }[]
  recentChecks: CheckResult[]
  rulesByCategory: { category: string; count: number; color: string }[]
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  toolsUsed?: string[]
}
