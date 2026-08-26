import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platform-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ isAdmin: false, reason: 'auth_not_configured' })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ isAdmin: false, reason: 'not_authenticated' }, { status: 401 })
  }

  const admin = isPlatformAdmin(user.email)
  return NextResponse.json({ isAdmin: admin })
}
