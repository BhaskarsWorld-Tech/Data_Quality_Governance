import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface LineageNode {
  id: string; label: string; sub: string
  type: 'source' | 'raw' | 'transform' | 'warehouse' | 'output'
  icon: string; schema: string; database: string; tableType: string
  rowCount: number | null; columnCount: number
  lastAltered: string | null; comment: string | null
}
export interface LineageEdge { from: string; to: string; relationship: string }

const TABLES: { name: string; type: string; rows: number; cols: number; nodeType: LineageNode['type']; comment: string }[] = [
  { name: 'CUSTOMERS', type: 'BASE TABLE', rows: 12458, cols: 14, nodeType: 'warehouse', comment: 'Customer master data' },
  { name: 'SALES_ORDERS', type: 'BASE TABLE', rows: 48723, cols: 15, nodeType: 'transform', comment: 'Sales order transactions' },
  { name: 'PRODUCTS', type: 'BASE TABLE', rows: 856, cols: 10, nodeType: 'warehouse', comment: 'Product catalog' },
  { name: 'FINANCE_TRANSACTIONS', type: 'BASE TABLE', rows: 95210, cols: 12, nodeType: 'transform', comment: 'Financial ledger' },
  { name: 'INVENTORY', type: 'BASE TABLE', rows: 3420, cols: 8, nodeType: 'transform', comment: 'Current inventory levels' },
  { name: 'WAREHOUSES', type: 'BASE TABLE', rows: 4, cols: 10, nodeType: 'warehouse', comment: 'Warehouse locations' },
  { name: 'SUPPLIERS', type: 'BASE TABLE', rows: 142, cols: 11, nodeType: 'warehouse', comment: 'Supplier directory' },
  { name: 'RETURNS', type: 'BASE TABLE', rows: 2871, cols: 8, nodeType: 'transform', comment: 'Product returns' },
  { name: 'PRODUCT_CATEGORIES', type: 'BASE TABLE', rows: 8, cols: 5, nodeType: 'warehouse', comment: 'Category hierarchy' },
  { name: 'PURCHASE_ORDERS', type: 'BASE TABLE', rows: 1560, cols: 9, nodeType: 'transform', comment: 'Supplier POs' },
  { name: 'PURCHASE_ORDER_ITEMS', type: 'BASE TABLE', rows: 4820, cols: 6, nodeType: 'transform', comment: 'PO line items' },
  { name: 'CARRIERS', type: 'BASE TABLE', rows: 5, cols: 8, nodeType: 'warehouse', comment: 'Shipping carriers' },
]

const FK_EDGES: { from: string; to: string }[] = [
  { from: 'CUSTOMERS', to: 'SALES_ORDERS' },
  { from: 'CUSTOMERS', to: 'RETURNS' },
  { from: 'WAREHOUSES', to: 'SALES_ORDERS' },
  { from: 'WAREHOUSES', to: 'INVENTORY' },
  { from: 'PRODUCTS', to: 'INVENTORY' },
  { from: 'PRODUCTS', to: 'PURCHASE_ORDER_ITEMS' },
  { from: 'PRODUCT_CATEGORIES', to: 'PRODUCTS' },
  { from: 'SUPPLIERS', to: 'PURCHASE_ORDERS' },
  { from: 'PURCHASE_ORDERS', to: 'PURCHASE_ORDER_ITEMS' },
  { from: 'SALES_ORDERS', to: 'FINANCE_TRANSACTIONS' },
  { from: 'SALES_ORDERS', to: 'RETURNS' },
]

export async function GET() {
  const now = new Date()

  const sourceNode: LineageNode = {
    id: 'source_sf_data', label: 'SF_Data', sub: 'Snowflake · SUPPLYCHAIN_DB',
    type: 'source', icon: '❄️', schema: '', database: 'SUPPLYCHAIN_DB',
    tableType: 'CONNECTION', rowCount: null, columnCount: 0,
    lastAltered: null, comment: 'Active Snowflake connection',
  }

  const nodes: LineageNode[] = TABLES.map(t => ({
    id: `SUPPLYCHAIN.${t.name}`, label: t.name,
    sub: `SUPPLYCHAIN · ${t.type === 'VIEW' ? 'View' : 'Table'}`,
    type: t.nodeType, icon: '📋', schema: 'SUPPLYCHAIN', database: 'SUPPLYCHAIN_DB',
    tableType: t.type, rowCount: t.rows, columnCount: t.cols,
    lastAltered: new Date(now.getTime() - Math.random() * 7 * 86400000).toISOString(),
    comment: t.comment,
  }))

  const edges: LineageEdge[] = FK_EDGES.map(e => ({
    from: `SUPPLYCHAIN.${e.from}`, to: `SUPPLYCHAIN.${e.to}`, relationship: 'foreign_key',
  }))

  // Connect source to root tables (no incoming edges)
  const nodesWithIncoming = new Set(edges.map(e => e.to))
  const sourceEdges: LineageEdge[] = nodes
    .filter(n => !nodesWithIncoming.has(n.id))
    .map(n => ({ from: sourceNode.id, to: n.id, relationship: 'source' }))

  return NextResponse.json({
    nodes: [sourceNode, ...nodes],
    edges: [...sourceEdges, ...edges],
    connection: { name: 'SF_Data', database: 'SUPPLYCHAIN_DB', schema: 'SUPPLYCHAIN', warehouse: 'COMPUTE_WH', status: 'active' },
    meta: { edgeMethods: { fk: FK_EDGES.length, ddl: 0, heuristic: 0 }, totalTables: TABLES.length, totalEdges: edges.length + sourceEdges.length },
  })
}
