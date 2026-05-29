import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { generateId } from '@/lib/utils'
import { Rule } from '@/lib/types'

export async function GET() {
  const rules = store.rules.getAll()
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Every newly created rule must be reviewed by the data stewards group before it
  // can run. It enters the review queue as pending_review and stays inactive until approved.
  const rule: Rule = {
    ...body,
    id: generateId('rule'),
    enabled: false,
    status: 'pending_review',
    scope: body.scope ?? 'generic',
    createdAt: new Date().toISOString(),
    createdBy: body.createdBy || undefined,
  }
  store.rules.create(rule)
  return NextResponse.json(rule, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body
  const updated = store.rules.update(id, updates)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  store.rules.delete(id)
  return NextResponse.json({ success: true })
}
