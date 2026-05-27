import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* ── Seed data for demo / edge deployments where Snowflake SDK is unavailable ── */

function generateRows(tableName: string, count: number): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const now = new Date()

  const schemas: Record<string, () => Record<string, unknown>> = {
    CUSTOMERS: () => {
      const i = rows.length + 1
      const segments = ['Enterprise', 'SMB', 'Startup', 'Government', 'Education']
      const cities = ['New York', 'San Francisco', 'Chicago', 'Austin', 'Seattle', 'Boston', 'Denver', 'Miami']
      const states = ['NY', 'CA', 'IL', 'TX', 'WA', 'MA', 'CO', 'FL']
      const ci = Math.floor(Math.random() * cities.length)
      return {
        CUSTOMER_ID: 1000 + i, FIRST_NAME: ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley', 'William', 'Amanda'][i % 10],
        LAST_NAME: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'][i % 10],
        EMAIL: `user${i}@example.com`, PHONE: `+1-555-${String(1000 + i).slice(-4)}`,
        ADDRESS: `${100 + i} Main St`, CITY: cities[ci], STATE: states[ci], ZIP_CODE: `${10000 + i * 7}`, COUNTRY: 'US',
        CUSTOMER_SEGMENT: segments[i % segments.length], CREDIT_LIMIT: Math.round((5000 + Math.random() * 45000) * 100) / 100,
        CREATED_AT: new Date(now.getTime() - (count - i) * 86400000).toISOString(),
        UPDATED_AT: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString(),
      }
    },
    SALES_ORDERS: () => {
      const i = rows.length + 1
      const statuses = ['Completed', 'Shipped', 'Processing', 'Pending', 'Cancelled']
      const methods = ['Express', 'Standard', 'Overnight', 'Economy']
      const total = Math.round((50 + Math.random() * 2000) * 100) / 100
      const disc = Math.round(total * Math.random() * 0.15 * 100) / 100
      const tax = Math.round(total * 0.08 * 100) / 100
      return {
        ORDER_ID: 5000 + i, ORDER_NUMBER: `ORD-${String(100000 + i)}`, CUSTOMER_ID: 1000 + (i % 150) + 1,
        ORDER_DATE: new Date(now.getTime() - (count - i) * 43200000).toISOString().split('T')[0],
        SHIPPED_DATE: Math.random() > 0.2 ? new Date(now.getTime() - (count - i) * 43200000 + 172800000).toISOString().split('T')[0] : null,
        DELIVERED_DATE: Math.random() > 0.35 ? new Date(now.getTime() - (count - i) * 43200000 + 432000000).toISOString().split('T')[0] : null,
        STATUS: statuses[i % statuses.length], SHIPPING_METHOD: methods[i % methods.length], WAREHOUSE_ID: (i % 4) + 1,
        TOTAL_AMOUNT: total, DISCOUNT_AMOUNT: disc, TAX_AMOUNT: tax, NET_AMOUNT: Math.round((total - disc + tax) * 100) / 100,
        CREATED_AT: new Date(now.getTime() - (count - i) * 43200000).toISOString(),
        UPDATED_AT: new Date(now.getTime() - Math.random() * 10 * 86400000).toISOString(),
      }
    },
    PRODUCTS: () => {
      const i = rows.length + 1
      const names = ['Widget Pro', 'Data Cable', 'Smart Sensor', 'Power Supply', 'Circuit Board', 'LED Panel', 'Connector Kit', 'Thermal Paste', 'Cooling Fan', 'Battery Pack']
      return {
        PRODUCT_ID: 2000 + i, PRODUCT_NAME: `${names[i % names.length]} ${String.fromCharCode(65 + (i % 26))}`,
        SKU: `SKU-${String(10000 + i)}`, CATEGORY_ID: (i % 8) + 1,
        UNIT_PRICE: Math.round((10 + Math.random() * 500) * 100) / 100,
        UNIT_COST: Math.round((5 + Math.random() * 250) * 100) / 100,
        WEIGHT: Math.round((0.1 + Math.random() * 25) * 10) / 10,
        DESCRIPTION: `High-quality ${names[i % names.length].toLowerCase()} for industrial use`,
        CREATED_AT: new Date(now.getTime() - (count - i) * 86400000 * 3).toISOString(),
        UPDATED_AT: new Date(now.getTime() - Math.random() * 60 * 86400000).toISOString(),
      }
    },
    FINANCE_TRANSACTIONS: () => {
      const i = rows.length + 1
      const types = ['Payment', 'Refund', 'Adjustment', 'Credit', 'Debit']
      const methods = ['Credit Card', 'Wire Transfer', 'ACH', 'PayPal', 'Check']
      const statuses = ['Completed', 'Pending', 'Failed', 'Reversed']
      return {
        TRANSACTION_ID: 8000 + i, ORDER_ID: 5000 + (i % 200) + 1, TRANSACTION_TYPE: types[i % types.length],
        AMOUNT: Math.round((10 + Math.random() * 5000) * 100) / 100, CURRENCY: 'USD',
        PAYMENT_METHOD: methods[i % methods.length],
        TRANSACTION_DATE: new Date(now.getTime() - (count - i) * 36000000).toISOString().split('T')[0],
        STATUS: statuses[i % statuses.length],
        REFERENCE_NUMBER: `REF-${String(200000 + i)}`, NOTES: i % 5 === 0 ? 'Manual adjustment' : null,
        CREATED_AT: new Date(now.getTime() - (count - i) * 36000000).toISOString(),
        UPDATED_AT: new Date(now.getTime() - Math.random() * 5 * 86400000).toISOString(),
      }
    },
    INVENTORY: () => {
      const i = rows.length + 1
      return {
        INVENTORY_ID: 3000 + i, PRODUCT_ID: 2000 + (i % 85) + 1, WAREHOUSE_ID: (i % 4) + 1,
        QUANTITY_ON_HAND: Math.floor(Math.random() * 5000),
        REORDER_LEVEL: Math.floor(50 + Math.random() * 200),
        LAST_RESTOCK_DATE: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString().split('T')[0],
        CREATED_AT: new Date(now.getTime() - (count - i) * 86400000 * 2).toISOString(),
        UPDATED_AT: new Date(now.getTime() - Math.random() * 7 * 86400000).toISOString(),
      }
    },
    WAREHOUSES: () => {
      const i = rows.length + 1
      const locs = [
        { name: 'East Coast Hub', city: 'Newark', state: 'NJ', country: 'US' },
        { name: 'West Coast DC', city: 'Los Angeles', state: 'CA', country: 'US' },
        { name: 'Central Warehouse', city: 'Dallas', state: 'TX', country: 'US' },
        { name: 'Southeast Facility', city: 'Atlanta', state: 'GA', country: 'US' },
      ]
      const loc = locs[i % locs.length]
      return {
        WAREHOUSE_ID: i, WAREHOUSE_NAME: loc.name, LOCATION: `${loc.city}, ${loc.state}`,
        CITY: loc.city, STATE: loc.state, COUNTRY: loc.country,
        CAPACITY: (i + 1) * 25000, MANAGER: ['John Adams', 'Lisa Chen', 'Mark Rivera', 'Priya Patel'][i % 4],
        CREATED_AT: new Date(now.getTime() - 365 * 86400000).toISOString(),
        UPDATED_AT: new Date(now.getTime() - 30 * 86400000).toISOString(),
      }
    },
    SUPPLIERS: () => {
      const i = rows.length + 1
      const names = ['TechParts Inc', 'Global Components', 'Pacific Supply Co', 'Midwest Materials', 'Alpha Electronics', 'Metro Logistics', 'Summit Distributors', 'Precision Parts']
      const countries = ['US', 'China', 'Germany', 'Japan', 'Mexico', 'Canada', 'UK', 'India']
      return {
        SUPPLIER_ID: 4000 + i, SUPPLIER_NAME: names[i % names.length],
        CONTACT_NAME: ['Alice Wong', 'Bob Fischer', 'Carlos Ruiz', 'Diana Park', 'Erik Svensson'][i % 5],
        EMAIL: `supplier${i}@vendor.com`, PHONE: `+1-800-${String(5000 + i).slice(-4)}`,
        ADDRESS: `${200 + i} Commerce Blvd`, CITY: ['Shanghai', 'Munich', 'Tokyo', 'Monterrey', 'Toronto'][i % 5],
        COUNTRY: countries[i % countries.length], RATING: Math.round((3 + Math.random() * 2) * 10) / 10,
        CREATED_AT: new Date(now.getTime() - 200 * 86400000).toISOString(),
        UPDATED_AT: new Date(now.getTime() - Math.random() * 60 * 86400000).toISOString(),
      }
    },
    RETURNS: () => {
      const i = rows.length + 1
      const reasons = ['Defective', 'Wrong Item', 'Not as Described', 'Changed Mind', 'Damaged in Transit']
      const statuses = ['Approved', 'Pending', 'Rejected', 'Processed']
      return {
        RETURN_ID: 9000 + i, ORDER_ID: 5000 + (i % 200) + 1, CUSTOMER_ID: 1000 + (i % 150) + 1,
        RETURN_DATE: new Date(now.getTime() - (count - i) * 172800000).toISOString().split('T')[0],
        REASON: reasons[i % reasons.length], STATUS: statuses[i % statuses.length],
        REFUND_AMOUNT: Math.round((15 + Math.random() * 500) * 100) / 100,
        CREATED_AT: new Date(now.getTime() - (count - i) * 172800000).toISOString(),
      }
    },
    PRODUCT_CATEGORIES: () => {
      const i = rows.length + 1
      const cats = ['Electronics', 'Components', 'Accessories', 'Sensors', 'Power', 'Networking', 'Storage', 'Display']
      return {
        CATEGORY_ID: i, CATEGORY_NAME: cats[i % cats.length],
        DESCRIPTION: `${cats[i % cats.length]} product category`, PARENT_CATEGORY_ID: i > 4 ? (i % 4) + 1 : null,
        CREATED_AT: new Date(now.getTime() - 300 * 86400000).toISOString(),
      }
    },
    PURCHASE_ORDERS: () => {
      const i = rows.length + 1
      const statuses = ['Received', 'In Transit', 'Ordered', 'Partially Received', 'Cancelled']
      return {
        PO_ID: 6000 + i, SUPPLIER_ID: 4000 + (i % 30) + 1,
        ORDER_DATE: new Date(now.getTime() - (count - i) * 259200000).toISOString().split('T')[0],
        EXPECTED_DELIVERY: new Date(now.getTime() - (count - i) * 259200000 + 604800000).toISOString().split('T')[0],
        STATUS: statuses[i % statuses.length], TOTAL_AMOUNT: Math.round((500 + Math.random() * 50000) * 100) / 100,
        NOTES: i % 3 === 0 ? 'Urgent order' : null,
        CREATED_AT: new Date(now.getTime() - (count - i) * 259200000).toISOString(),
        UPDATED_AT: new Date(now.getTime() - Math.random() * 14 * 86400000).toISOString(),
      }
    },
    PURCHASE_ORDER_ITEMS: () => {
      const i = rows.length + 1
      const qty = Math.floor(10 + Math.random() * 500)
      const price = Math.round((5 + Math.random() * 200) * 100) / 100
      return {
        PO_ITEM_ID: 7000 + i, PO_ID: 6000 + (i % 60) + 1, PRODUCT_ID: 2000 + (i % 85) + 1,
        QUANTITY: qty, UNIT_PRICE: price, TOTAL_PRICE: Math.round(qty * price * 100) / 100,
      }
    },
    CARRIERS: () => {
      const i = rows.length + 1
      const names = ['FedEx', 'UPS', 'DHL Express', 'USPS', 'Amazon Logistics']
      return {
        CARRIER_ID: i, CARRIER_NAME: names[i % names.length],
        CONTACT_NAME: ['Tom Hall', 'Sara Lee', 'Jim Beam', 'Rose Hill', 'Dan Stone'][i % 5],
        PHONE: `+1-800-${String(3000 + i).slice(-4)}`, EMAIL: `carrier${i}@shipping.com`,
        TRACKING_URL: `https://track.${names[i % names.length].toLowerCase().replace(/\s/g, '')}.com`,
        CREATED_AT: new Date(now.getTime() - 350 * 86400000).toISOString(),
        UPDATED_AT: new Date(now.getTime() - 90 * 86400000).toISOString(),
      }
    },
  }

  const gen = schemas[tableName]
  if (!gen) return []
  for (let idx = 0; idx < Math.min(count, 200); idx++) rows.push(gen())
  return rows
}

const SEED_TABLES: { name: string; type: string; rows: number; bytes: number }[] = [
  { name: 'CUSTOMERS',            type: 'BASE TABLE', rows: 12458,  bytes: 3_891_200 },
  { name: 'SALES_ORDERS',         type: 'BASE TABLE', rows: 48723,  bytes: 18_540_000 },
  { name: 'PRODUCTS',             type: 'BASE TABLE', rows: 856,    bytes: 245_760 },
  { name: 'FINANCE_TRANSACTIONS', type: 'BASE TABLE', rows: 95210,  bytes: 28_563_000 },
  { name: 'INVENTORY',            type: 'BASE TABLE', rows: 3420,   bytes: 573_440 },
  { name: 'WAREHOUSES',           type: 'BASE TABLE', rows: 4,      bytes: 8_192 },
  { name: 'SUPPLIERS',            type: 'BASE TABLE', rows: 142,    bytes: 49_152 },
  { name: 'RETURNS',              type: 'BASE TABLE', rows: 2871,   bytes: 819_200 },
  { name: 'PRODUCT_CATEGORIES',   type: 'BASE TABLE', rows: 8,      bytes: 4_096 },
  { name: 'PURCHASE_ORDERS',      type: 'BASE TABLE', rows: 1560,   bytes: 491_520 },
  { name: 'PURCHASE_ORDER_ITEMS', type: 'BASE TABLE', rows: 4820,   bytes: 737_280 },
  { name: 'CARRIERS',             type: 'BASE TABLE', rows: 5,      bytes: 4_096 },
]

function buildSeedResponse() {
  const now = new Date()
  const tables = SEED_TABLES.map(t => ({
    TABLE_NAME: t.name,
    TABLE_TYPE: t.type,
    ROW_COUNT: t.rows,
    BYTES: t.bytes,
    CREATED: new Date(now.getTime() - 180 * 86400000).toISOString(),
    LAST_ALTERED: new Date(now.getTime() - Math.random() * 7 * 86400000).toISOString(),
    TABLE_SCHEMA: 'SUPPLYCHAIN',
    TABLE_CATALOG: 'SUPPLYCHAIN_DB',
    preview: generateRows(t.name, t.rows),
  }))

  const totalRows = SEED_TABLES.reduce((s, t) => s + t.rows, 0)
  const totalBytes = SEED_TABLES.reduce((s, t) => s + t.bytes, 0)
  const populated = SEED_TABLES.filter(t => t.rows > 0).length
  const empty = SEED_TABLES.length - populated

  return {
    summary: { tableCount: SEED_TABLES.length, populated, empty, totalRows, totalBytes },
    tables,
  }
}

export async function GET() {
  // Always return seed data — Snowflake SDK is not available on Cloudflare Workers.
  // When running locally with Node.js + a live Snowflake connection, the backend
  // FastAPI server handles /api/snowflake/* routes instead.
  return NextResponse.json(buildSeedResponse())
}
