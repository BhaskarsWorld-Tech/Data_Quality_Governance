import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* Generate realistic preview rows for a given table */
function generatePreview(tableName: string, limit: number): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const now = Date.now()
  const tbl = tableName.toUpperCase()

  for (let i = 1; i <= limit; i++) {
    let row: Record<string, unknown> = {}
    switch (tbl) {
      case 'CUSTOMERS': {
        const segments = ['Enterprise', 'SMB', 'Startup', 'Government', 'Education']
        const cities = ['New York', 'San Francisco', 'Chicago', 'Austin', 'Seattle', 'Boston']
        const states = ['NY', 'CA', 'IL', 'TX', 'WA', 'MA']
        const ci = i % cities.length
        row = { CUSTOMER_ID: 1000 + i, FIRST_NAME: ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica'][i % 6], LAST_NAME: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'][i % 6], EMAIL: `user${i}@example.com`, PHONE: `+1-555-${String(1000 + i).slice(-4)}`, ADDRESS: `${100 + i} Main St`, CITY: cities[ci], STATE: states[ci], ZIP_CODE: `${10000 + i * 7}`, COUNTRY: 'US', CUSTOMER_SEGMENT: segments[i % 5], CREDIT_LIMIT: Math.round((5000 + (i * 317) % 45000) * 100) / 100, CREATED_AT: new Date(now - (limit - i) * 86400000).toISOString(), UPDATED_AT: new Date(now - (i * 3) * 86400000).toISOString() }
        break
      }
      case 'SALES_ORDERS': {
        const statuses = ['Completed', 'Shipped', 'Processing', 'Pending', 'Cancelled']
        const total = Math.round((50 + (i * 137) % 2000) * 100) / 100
        row = { ORDER_ID: 5000 + i, ORDER_NUMBER: `ORD-${100000 + i}`, CUSTOMER_ID: 1000 + (i % 150) + 1, ORDER_DATE: new Date(now - (limit - i) * 43200000).toISOString().split('T')[0], STATUS: statuses[i % 5], TOTAL_AMOUNT: total, NET_AMOUNT: Math.round(total * 0.92 * 100) / 100, CREATED_AT: new Date(now - (limit - i) * 43200000).toISOString() }
        break
      }
      case 'PRODUCTS': {
        const names = ['Widget Pro', 'Data Cable', 'Smart Sensor', 'Power Supply', 'Circuit Board', 'LED Panel']
        row = { PRODUCT_ID: 2000 + i, PRODUCT_NAME: `${names[i % 6]} ${String.fromCharCode(65 + (i % 26))}`, SKU: `SKU-${10000 + i}`, CATEGORY_ID: (i % 8) + 1, UNIT_PRICE: Math.round((10 + (i * 71) % 500) * 100) / 100, UNIT_COST: Math.round((5 + (i * 31) % 250) * 100) / 100, WEIGHT: Math.round((0.1 + (i * 13) % 25) * 10) / 10, CREATED_AT: new Date(now - i * 86400000 * 3).toISOString() }
        break
      }
      case 'FINANCE_TRANSACTIONS': {
        const types = ['Payment', 'Refund', 'Adjustment', 'Credit', 'Debit']
        const methods = ['Credit Card', 'Wire Transfer', 'ACH', 'PayPal', 'Check']
        row = { TRANSACTION_ID: 8000 + i, ORDER_ID: 5000 + (i % 200) + 1, TRANSACTION_TYPE: types[i % 5], AMOUNT: Math.round((10 + (i * 97) % 5000) * 100) / 100, CURRENCY: 'USD', PAYMENT_METHOD: methods[i % 5], TRANSACTION_DATE: new Date(now - (limit - i) * 36000000).toISOString().split('T')[0], STATUS: ['Completed', 'Pending', 'Failed'][i % 3] }
        break
      }
      case 'INVENTORY': {
        row = { INVENTORY_ID: 3000 + i, PRODUCT_ID: 2000 + (i % 85) + 1, WAREHOUSE_ID: (i % 4) + 1, QUANTITY_ON_HAND: (i * 47) % 5000, REORDER_LEVEL: 50 + (i * 11) % 200, LAST_RESTOCK_DATE: new Date(now - (i * 7) % 30 * 86400000).toISOString().split('T')[0] }
        break
      }
      case 'WAREHOUSES': {
        const locs = [{ name: 'East Coast Hub', city: 'Newark', state: 'NJ' }, { name: 'West Coast DC', city: 'Los Angeles', state: 'CA' }, { name: 'Central Warehouse', city: 'Dallas', state: 'TX' }, { name: 'Southeast Facility', city: 'Atlanta', state: 'GA' }]
        const loc = locs[(i - 1) % locs.length]
        row = { WAREHOUSE_ID: i, WAREHOUSE_NAME: loc.name, LOCATION: `${loc.city}, ${loc.state}`, CITY: loc.city, STATE: loc.state, COUNTRY: 'US', CAPACITY: (i) * 25000, MANAGER: ['John Adams', 'Lisa Chen', 'Mark Rivera', 'Priya Patel'][(i - 1) % 4] }
        break
      }
      default:
        row = { ID: i, NAME: `Record ${i}`, CREATED_AT: new Date(now - i * 86400000).toISOString() }
    }
    rows.push(row)
  }
  return rows
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const table = params.get('table')
  const limit = Math.min(parseInt(params.get('limit') ?? '20', 10), 200)
  if (!table) return NextResponse.json({ error: 'table param required' }, { status: 400 })
  const rows = generatePreview(table, limit)
  return NextResponse.json({ rows, count: rows.length })
}
