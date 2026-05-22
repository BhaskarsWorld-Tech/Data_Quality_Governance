'use client'

import { useState, useEffect, useCallback } from 'react'
import { Database, Table, Search, ChevronDown, ChevronRight, Eye, Columns, RefreshCw } from 'lucide-react'
import apiClient from '@/services/apiClient'

interface ConnectionInfo {
  connection_id: string
  connection_name: string
  database_type: string
  is_active: boolean
}

interface TableInfo {
  table_name: string
  table_type: string
  row_count: number
  bytes: number
  comment: string
  last_altered?: string
}

interface PreviewData {
  columns: string[]
  column_types: string[]
  rows: unknown[][]
  row_count: number
}

export default function DataBrowserPage() {
  const [connections, setConnections] = useState<ConnectionInfo[]>([])
  const [selectedConnection, setSelectedConnection] = useState<string>('')
  const [databases, setDatabases] = useState<{ name: string }[]>([])
  const [selectedDatabase, setSelectedDatabase] = useState<string>('')
  const [schemas, setSchemas] = useState<{ name: string }[]>([])
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get('/connections').then(res => {
      const active = res.data.filter((c: ConnectionInfo) => c.is_active && c.database_type === 'snowflake')
      setConnections(active)
      if (active.length > 0) setSelectedConnection(active[0].connection_id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedConnection) return
    setDatabases([])
    setSchemas([])
    setTables([])
    setSelectedDatabase('')
    apiClient.get(`/connections/${selectedConnection}/databases`).then(res => {
      setDatabases(res.data.databases || [])
    }).catch(() => {})
  }, [selectedConnection])

  useEffect(() => {
    if (!selectedConnection || !selectedDatabase) return
    setSchemas([])
    setTables([])
    setSelectedSchema('')
    apiClient.get(`/connections/${selectedConnection}/schemas`, { params: { database: selectedDatabase } }).then(res => {
      setSchemas(res.data.schemas || [])
    }).catch(() => {})
  }, [selectedConnection, selectedDatabase])

  useEffect(() => {
    if (!selectedConnection || !selectedDatabase || !selectedSchema) return
    setTables([])
    setSelectedTable('')
    setLoading(true)
    apiClient.get(`/connections/${selectedConnection}/tables`, {
      params: { database: selectedDatabase, schema: selectedSchema }
    }).then(res => {
      setTables(res.data.tables || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedConnection, selectedDatabase, selectedSchema])

  const loadPreview = useCallback((tableName: string) => {
    if (!selectedConnection || !selectedDatabase || !selectedSchema) return
    setSelectedTable(tableName)
    setPreview(null)
    setError(null)
    setLoading(true)
    apiClient.get(`/connections/${selectedConnection}/preview`, {
      params: { database: selectedDatabase, schema: selectedSchema, table: tableName, limit: 25 }
    }).then(res => {
      if (res.data.data) setPreview(res.data.data)
      else if (res.data.error) setError(res.data.error)
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [selectedConnection, selectedDatabase, selectedSchema])

  const filteredTables = tables.filter(t =>
    t.table_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          Live Data Browser
        </h1>
        <p className="text-sm text-gray-500 mt-1">Browse and preview data from your connected sources</p>
      </div>

      {/* Connection / Database / Schema selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Connection</label>
          <select
            value={selectedConnection}
            onChange={e => setSelectedConnection(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">Select connection...</option>
            {connections.map(c => (
              <option key={c.connection_id} value={c.connection_id}>{c.connection_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Database</label>
          <select
            value={selectedDatabase}
            onChange={e => setSelectedDatabase(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700"
            disabled={databases.length === 0}
          >
            <option value="">Select database...</option>
            {databases.map(d => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Schema</label>
          <select
            value={selectedSchema}
            onChange={e => setSelectedSchema(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700"
            disabled={schemas.length === 0}
          >
            <option value="">Select schema...</option>
            {schemas.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search tables..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{filteredTables.length} tables</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {filteredTables.map(t => (
                <button
                  key={t.table_name}
                  onClick={() => loadPreview(t.table_name)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedTable === t.table_name ? 'bg-blue-50 dark:bg-gray-700 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.table_name}</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>{t.row_count?.toLocaleString()} rows</span>
                    <span>{formatBytes(t.bytes)}</span>
                    <span className="capitalize">{t.table_type?.toLowerCase()}</span>
                  </div>
                </button>
              ))}
              {filteredTables.length === 0 && selectedSchema && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {loading ? 'Loading tables...' : 'No tables found'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Preview */}
        <div className="lg:col-span-2">
          {selectedTable && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{selectedTable}</h3>
                  <p className="text-xs text-gray-400">{selectedDatabase}.{selectedSchema}</p>
                </div>
                <button
                  onClick={() => loadPreview(selectedTable)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-700 text-sm">{error}</div>
              )}

              {preview && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        {preview.columns.map((col, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, ri) => (
                        <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                              {cell === null ? <span className="text-gray-300 italic">NULL</span> : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700">
                    Showing {preview.row_count} rows
                  </div>
                </div>
              )}

              {loading && !preview && (
                <div className="p-12 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading data preview...
                </div>
              )}

              {!loading && !preview && !error && (
                <div className="p-12 text-center text-gray-400">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Click a table to preview its data
                </div>
              )}
            </div>
          )}

          {!selectedTable && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-1">Select a table</h3>
              <p className="text-sm text-gray-400">Choose a connection, database, and schema to browse tables</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
