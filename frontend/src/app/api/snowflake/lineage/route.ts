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
 * Uses multiple strategies to discover relationships:
 *   1. Foreign key constraints (SHOW IMPORTED KEYS)
 *   2. View DDL parsing (GET_DDL)
 *   3. Column-name heuristic (CUSTOMER_ID → CUSTOMERS table)
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
        AND t.TABLE_TYPE IN ('BASE TABLE', 'VIEW', 'MATERIALIZED VIEW', 'EXTERNAL TABLE')
      ORDER BY t.TABLE_SCHEMA, t.TABLE_TYPE DESC, t.TABLE_NAME
    `)

    // 2. Get column info for all tables (needed for FK heuristic)
    let allColumns: Record<string, unknown>[] = []
    try {
      allColumns = await querySnowflake(`
        SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, ORDINAL_POSITION
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `) as Record<string, unknown>[]
    } catch { /* columns query failed */ }

    // Group columns by table
    const columnsByTable = new Map<string, Record<string, unknown>[]>()
    for (const col of allColumns) {
      const tbl = String(col.TABLE_NAME ?? '')
      if (!columnsByTable.has(tbl)) columnsByTable.set(tbl, [])
      columnsByTable.get(tbl)!.push(col)
    }

    // 3. Try multiple strategies to discover relationships
    const dependencies: { from: string; to: string; method: string }[] = []
    const tableNames = tables.map(t => String(t.TABLE_NAME ?? '').toUpperCase())
    const tableNameSet = new Set(tableNames)

    // Strategy A: Try SHOW IMPORTED KEYS for FK constraints
    try {
      const fkRows = await querySnowflake(`
        SELECT
          FK_TABLE_NAME,
          FK_COLUMN_NAME,
          PK_TABLE_NAME,
          PK_COLUMN_NAME
        FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
      `.replace(/SELECT[\s\S]+FROM/, `SHOW IMPORTED KEYS IN SCHEMA ${active.database}.${active.schema};
        SELECT
          "fk_table_name" AS FK_TABLE_NAME,
          "fk_column_name" AS FK_COLUMN_NAME,
          "pk_table_name" AS PK_TABLE_NAME,
          "pk_column_name" AS PK_COLUMN_NAME
        FROM`))
      for (const row of fkRows as Record<string, unknown>[]) {
        const pkTable = String(row.PK_TABLE_NAME ?? '')
        const fkTable = String(row.FK_TABLE_NAME ?? '')
        if (pkTable && fkTable && pkTable !== fkTable) {
          dependencies.push({ from: pkTable, to: fkTable, method: 'fk' })
        }
      }
    } catch {
      // SHOW IMPORTED KEYS approach failed — try direct FK query
      try {
        const fkRows2 = await querySnowflake(`
          SELECT
            kcu.TABLE_NAME AS FK_TABLE,
            kcu.COLUMN_NAME AS FK_COLUMN,
            kcu.TABLE_NAME AS REF_TABLE
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
          WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND tc.TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
        `) as Record<string, unknown>[]
        for (const row of fkRows2) {
          const fkTable = String(row.FK_TABLE ?? '')
          if (fkTable) {
            dependencies.push({ from: fkTable, to: fkTable, method: 'fk_constraint' })
          }
        }
      } catch { /* FK constraints not available */ }
    }

    // Strategy B: Parse view DDL for FROM/JOIN references
    const views = tables.filter(t =>
      String(t.TABLE_TYPE ?? '').toUpperCase().includes('VIEW')
    )
    for (const view of views) {
      try {
        const viewType = String(view.TABLE_TYPE ?? '').toUpperCase().includes('MATERIALIZED')
          ? 'MATERIALIZED VIEW' : 'VIEW'
        const ddlRows = await querySnowflake(
          `SELECT GET_DDL('${viewType}', ?) AS DDL`,
          [`${view.TABLE_SCHEMA}.${view.TABLE_NAME}`]
        )
        const ddl = String(ddlRows[0]?.DDL ?? '')
        const refPattern = /(?:FROM|JOIN)\s+(?:(?:"?\w+"?\.)*)"?(\w+)"?/gi
        let match: RegExpExecArray | null
        while ((match = refPattern.exec(ddl)) !== null) {
          const refTable = match[1]
          if (refTable && refTable.toUpperCase() !== String(view.TABLE_NAME).toUpperCase()
              && tableNameSet.has(refTable.toUpperCase())) {
            dependencies.push({
              from: refTable.toUpperCase(),
              to: String(view.TABLE_NAME).toUpperCase(),
              method: 'ddl',
            })
          }
        }
      } catch { /* Skip views we can't get DDL for */ }
    }

    // Strategy C: Column-name heuristic — if table X has column CUSTOMER_ID
    // and there's a table called CUSTOMERS with primary key CUSTOMER_ID, infer FK
    if (dependencies.filter(d => d.method !== 'ddl').length === 0) {
      // Build a map: table name → likely singular forms for matching
      const tableMatchMap = new Map<string, string>()
      for (const tbl of tableNames) {
        // CUSTOMERS → CUSTOMER, PRODUCTS → PRODUCT, CARRIERS → CARRIER, etc.
        const singular = tbl.replace(/IES$/, 'Y').replace(/SES$/, 'S').replace(/S$/, '')
        tableMatchMap.set(`${singular}_ID`, tbl)
        tableMatchMap.set(tbl.replace(/_/g, '') + '_ID', tbl) // handle PRODUCT_CATEGORIES → PRODUCTCATEGORIES_ID? no
        // Also try: CATEGORY_ID → PRODUCT_CATEGORIES (match on last word)
        const parts = tbl.split('_')
        if (parts.length > 1) {
          const lastWord = parts[parts.length - 1]
          const lastSingular = lastWord.replace(/IES$/, 'Y').replace(/SES$/, 'S').replace(/S$/, '')
          tableMatchMap.set(`${lastSingular}_ID`, tbl)
        }
      }

      for (const [tableName, cols] of columnsByTable) {
        for (const col of cols) {
          const colName = String(col.COLUMN_NAME ?? '').toUpperCase()
          if (!colName.endsWith('_ID')) continue
          // Skip if it's likely this table's own PK
          const ownSingular = tableName.replace(/IES$/, 'Y').replace(/SES$/, 'S').replace(/S$/, '')
          if (colName === `${ownSingular}_ID` || colName === `${tableName}_ID`) continue
          // Also skip if it's the first column and matches table pattern (PK)
          if (Number(col.ORDINAL_POSITION) === 1) continue

          // Look for a matching parent table
          const parentTable = tableMatchMap.get(colName)
          if (parentTable && parentTable !== tableName && tableNameSet.has(parentTable)) {
            dependencies.push({
              from: parentTable,
              to: tableName,
              method: 'heuristic',
            })
          }
        }
      }
    }

    // 4. Build nodes
    const nodes: LineageNode[] = tables.map((t) => {
      const tableName = String(t.TABLE_NAME ?? '')
      const schemaName = String(t.TABLE_SCHEMA ?? '')
      const tableType = String(t.TABLE_TYPE ?? '')
      const upperType = tableType.toUpperCase()
      const isView = upperType.includes('VIEW')
      const isMView = upperType.includes('MATERIALIZED')

      // Classify node type
      let nodeType: LineageNode['type'] = 'warehouse'
      const lower = tableName.toLowerCase()
      if (lower.startsWith('raw_') || lower.startsWith('stg_') || schemaName.toUpperCase() === 'RAW') {
        nodeType = 'raw'
      } else if (isView) {
        nodeType = 'output'
      } else if (lower.startsWith('v_') || lower.startsWith('vw_')) {
        nodeType = 'output'
      } else if (lower.startsWith('rpt_') || lower.startsWith('report_')) {
        nodeType = 'output'
      }
      // Leave as 'warehouse' for now — we'll reclassify based on edges below

      const icon = isMView ? '📐' : isView ? '👁' : '📋'

      return {
        id: `${schemaName}.${tableName}`,
        label: tableName,
        sub: `${schemaName} · ${isMView ? 'Materialized View' : isView ? 'View' : 'Table'}`,
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

    // 5. Build edges from dependencies (dedup)
    const edges: LineageEdge[] = []
    const edgeSet = new Set<string>()

    for (const dep of dependencies) {
      const fromNode = nodes.find(n => n.label.toUpperCase() === dep.from.toUpperCase())
      const toNode = nodes.find(n => n.label.toUpperCase() === dep.to.toUpperCase())

      if (fromNode && toNode && fromNode.id !== toNode.id) {
        const edgeKey = `${fromNode.id}->${toNode.id}`
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey)
          edges.push({
            from: fromNode.id,
            to: toNode.id,
            relationship: dep.method === 'ddl' ? 'view_dependency' : dep.method === 'fk' ? 'foreign_key' : 'inferred',
          })
        }
      }
    }

    // 6. Reclassify node types based on graph structure
    const hasIncoming = new Set(edges.map(e => e.to))
    const hasOutgoing = new Set(edges.map(e => e.from))

    for (const node of nodes) {
      if (node.type === 'output' || node.type === 'raw') continue // already classified
      const isLeaf = !hasOutgoing.has(node.id) && hasIncoming.has(node.id)
      const isRoot = !hasIncoming.has(node.id) && hasOutgoing.has(node.id)
      const isMid = hasIncoming.has(node.id) && hasOutgoing.has(node.id)

      if (isRoot) {
        node.type = 'warehouse' // master data / dimension tables
      } else if (isMid || isLeaf) {
        node.type = 'transform' // transaction / fact tables
      }
    }

    // 7. Add the source connection as a node
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
      meta: {
        edgeMethods: {
          fk: dependencies.filter(d => d.method === 'fk').length,
          ddl: dependencies.filter(d => d.method === 'ddl').length,
          heuristic: dependencies.filter(d => d.method === 'heuristic').length,
        },
        totalTables: tables.length,
        totalEdges: edges.length + sourceEdges.length,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
