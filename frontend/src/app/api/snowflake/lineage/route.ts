import { NextResponse } from 'next/server'
import { querySnowflake } from '@/lib/snowflake'
import { store } from '@/lib/store'

export const dynamic = 'force-dynamic'

export interface LineageNode {
  id: string
  label: string
  sub: string
  type: 'source' | 'raw' | 'transform' | 'warehouse' | 'output'
  icon: string
  schema: string
  database: string
  tableType: string
  rowCount: number | null
  columnCount: number
  lastAltered: string | null
  comment: string | null
}

export interface LineageEdge {
  from: string
  to: string
  relationship: string
}

/**
 * GET /api/snowflake/lineage
 * Returns live lineage data from the active Snowflake connection.
 * Queries INFORMATION_SCHEMA for tables/views and derives lineage from
 * view definitions (GET_DDL) and object dependencies.
 */
export async function GET() {
  try {
    const connections = store.connections.getAll()
    const active = connections.find(c => c.type === 'snowflake' && c.status === 'active')
      ?? connections.find(c => c.type === 'snowflake')

    if (!active) {
      return NextResponse.json({ error: 'No Snowflake connection configured' }, { status: 400 })
    }

    // 1. Get all tables and views with metadata
    const tables = await querySnowflake(`
      SELECT
        t.TABLE_CATALOG,
        t.TABLE_SCHEMA,
        t.TABLE_NAME,
        t.TABLE_TYPE,
        t.ROW_COUNT,
        t.CREATED,
        t.LAST_ALTERED,
        t.COMMENT,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS c
         WHERE c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME) AS COLUMN_COUNT
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE t.TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
        AND t.TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY t.TABLE_SCHEMA, t.TABLE_TYPE DESC, t.TABLE_NAME
    `)

    // 2. Try to get view dependencies for lineage edges
    let dependencies: Record<string, unknown>[] = []
    try {
      // Try OBJECT_DEPENDENCIES (available in Snowflake Enterprise+)
      dependencies = await querySnowflake(`
        SELECT
          REFERENCING_OBJECT_NAME,
          REFERENCING_OBJECT_DOMAIN,
          REFERENCED_OBJECT_NAME,
          REFERENCED_OBJECT_DOMAIN
        FROM TABLE(INFORMATION_SCHEMA.OBJECT_DEPENDENCIES(
          OBJECT_TYPE => 'TABLE',
          OBJECT_NAME => CURRENT_DATABASE() || '.' || CURRENT_SCHEMA()
        ))
      `) as Record<string, unknown>[]
    } catch {
      // Object dependencies not available — try parsing view DDL
      try {
        const views = tables.filter(t =>
          String(t.TABLE_TYPE ?? '').toUpperCase().includes('VIEW')
        )

        for (const view of views) {
          try {
            const ddlRows = await querySnowflake(
              `SELECT GET_DDL('VIEW', ?) AS DDL`,
              [`${view.TABLE_SCHEMA}.${view.TABLE_NAME}`]
            )
            const ddl = String(ddlRows[0]?.DDL ?? '')
            // Extract referenced table names from the view DDL
            const refPattern = /(?:FROM|JOIN)\s+(?:"?(\w+)"?\.)?"?(\w+)"?/gi
            let match: RegExpExecArray | null
            while ((match = refPattern.exec(ddl)) !== null) {
              const refSchema = match[1] || String(view.TABLE_SCHEMA)
              const refTable = match[2]
              if (refTable && refTable.toUpperCase() !== String(view.TABLE_NAME).toUpperCase()) {
                dependencies.push({
                  REFERENCING_OBJECT_NAME: view.TABLE_NAME,
                  REFERENCED_OBJECT_NAME: refTable,
                  REFERENCED_SCHEMA: refSchema,
                })
              }
            }
          } catch {
            // Skip views we can't get DDL for
          }
        }
      } catch {
        // Neither method works — we'll return tables without edges
      }
    }

    // 3. Build nodes
    const nodes: LineageNode[] = tables.map((t) => {
      const tableName = String(t.TABLE_NAME ?? '')
      const schemaName = String(t.TABLE_SCHEMA ?? '')
      const tableType = String(t.TABLE_TYPE ?? '')
      const isView = tableType.toUpperCase().includes('VIEW')

      // Classify node type based on naming conventions and table type
      let nodeType: LineageNode['type'] = 'warehouse'
      const lower = tableName.toLowerCase()
      if (lower.startsWith('raw_') || lower.startsWith('stg_') || schemaName.toUpperCase() === 'RAW') {
        nodeType = 'raw'
      } else if (isView || lower.startsWith('v_') || lower.startsWith('vw_')) {
        nodeType = 'transform'
      } else if (lower.startsWith('dim_') || lower.startsWith('fact_') || lower.startsWith('agg_')) {
        nodeType = 'warehouse'
      } else if (lower.startsWith('rpt_') || lower.startsWith('report_')) {
        nodeType = 'output'
      }

      const icon = isView ? '👁' : '📋'

      return {
        id: `${schemaName}.${tableName}`,
        label: tableName,
        sub: `${schemaName} · ${isView ? 'View' : 'Table'}`,
        type: nodeType,
        icon,
        schema: schemaName,
        database: String(t.TABLE_CATALOG ?? ''),
        tableType,
        rowCount: t.ROW_COUNT != null ? Number(t.ROW_COUNT) : null,
        columnCount: Number(t.COLUMN_COUNT ?? 0),
        lastAltered: t.LAST_ALTERED ? String(t.LAST_ALTERED) : null,
        comment: t.COMMENT ? String(t.COMMENT) : null,
      }
    })

    // 4. Build edges from dependencies
    const edges: LineageEdge[] = []
    const nodeIds = new Set(nodes.map(n => n.id))

    for (const dep of dependencies) {
      const refName = String(dep.REFERENCED_OBJECT_NAME ?? '')
      const referencingName = String(dep.REFERENCING_OBJECT_NAME ?? '')

      // Find matching node IDs
      const fromNode = nodes.find(n => n.label.toUpperCase() === refName.toUpperCase())
      const toNode = nodes.find(n => n.label.toUpperCase() === referencingName.toUpperCase())

      if (fromNode && toNode && fromNode.id !== toNode.id) {
        const edgeId = `${fromNode.id}->${toNode.id}`
        if (!edges.find(e => `${e.from}->${e.to}` === edgeId)) {
          edges.push({
            from: fromNode.id,
            to: toNode.id,
            relationship: 'depends_on',
          })
        }
      }
    }

    // 5. Add the source connection as a node
    const sourceNode: LineageNode = {
      id: `source_${active.id}`,
      label: active.name,
      sub: `Snowflake · ${active.database ?? ''}`,
      type: 'source',
      icon: '❄️',
      schema: '',
      database: String(active.database ?? ''),
      tableType: 'CONNECTION',
      rowCount: null,
      columnCount: 0,
      lastAltered: null,
      comment: 'Active Snowflake connection',
    }

    // Connect source to all root tables (tables with no incoming edges)
    const nodesWithIncoming = new Set(edges.map(e => e.to))
    const rootTables = nodes.filter(n => !nodesWithIncoming.has(n.id))
    const sourceEdges: LineageEdge[] = rootTables.map(n => ({
      from: sourceNode.id,
      to: n.id,
      relationship: 'source',
    }))

    return NextResponse.json({
      nodes: [sourceNode, ...nodes],
      edges: [...sourceEdges, ...edges],
      connection: {
        name: active.name,
        database: active.database,
        schema: active.schema,
        warehouse: active.warehouse,
        status: active.status,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
