// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry OS Comprehensive Test Suite
// Run: bun run scripts/test-poultry.ts
// Prerequisites: dev server on localhost:3000, seed data applied
// ══════════════════════════════════════════════════════════════════

const BASE = 'http://localhost:3000'
const DEV_HEADERS: Record<string, string> = {
  'X-Dev-User-Id': 'user-admin-001',
}

let ORG_ID = ''
let passed = 0
let failed = 0
const failures: string[] = []

// ── Helpers ──────────────────────────────────────────────────────────

function headers(orgId = ORG_ID): Record<string, string> {
  return {
    ...DEV_HEADERS,
    'X-Dev-Org-Id': orgId,
    'X-Organization-Id': orgId,
  }
}

function pass(label: string) {
  passed++
  console.log(`  ✓ ${label}`)
}

function fail(label: string, detail: string) {
  failed++
  const msg = `✗ ${label} — ${detail}`
  failures.push(msg)
  console.log(`  ${msg}`)
}

function assert(label: string, condition: boolean, detail: string) {
  if (condition) pass(label)
  else fail(label, detail)
}

async function get(path: string, h?: Record<string, string>) {
  return fetch(`${BASE}${path}`, { headers: h ?? headers() })
}

async function post(path: string, body: unknown, h?: Record<string, string>) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...(h ?? headers()), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function patch(path: string, body: unknown, h?: Record<string, string>) {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { ...(h ?? headers()), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function del(path: string, h?: Record<string, string>) {
  return fetch(`${BASE}${path}`, { method: 'DELETE', headers: h ?? headers() })
}

// ── 0. Bootstrap: fetch org ID ───────────────────────────────────────

async function bootstrap() {
  console.log('\n━━━ Bootstrap ━━━')
  const res = await fetch(`${BASE}/api/organizations`)
  assert('Fetch organizations', res.ok, `status ${res.status}`)
  const json = await res.json()
  const poultryOrg = json.data?.find(
    (o: { slug?: string; name?: string }) => o.slug === 'poultry-farm-co' || o.name === 'Poultry Farm Co'
  )
  if (poultryOrg) {
    ORG_ID = poultryOrg.id
    pass(`Resolved org ID: ${ORG_ID}`)
  } else {
    // Fall back to first org
    ORG_ID = json.data?.[0]?.id
    assert('Found Poultry Farm Co org', !!ORG_ID, 'no organizations returned')
  }
}

// ── 1. AUTH: Unauthenticated request denied ──────────────────────────

async function testAuth() {
  console.log('\n━━━ 1. AUTH ━━━')

  const res = await fetch(`${BASE}/api/poultry/farms`)
  assert('No headers → 401', res.status === 401, `got ${res.status}`)

  const body = await res.json().catch(() => ({}))
  assert('Error message mentions dev headers',
    typeof body.error === 'string' && body.error.includes('X-Dev'),
    `unexpected body: ${JSON.stringify(body)}`,
  )

  // Only user ID, no org ID → should also fail (400 from middleware)
  const res2 = await fetch(`${BASE}/api/poultry/farms`, {
    headers: { 'X-Dev-User-Id': 'user-admin-001' },
  })
  // Dev mode resolves first active membership if X-Dev-Org-Id is missing
  // So this should actually succeed in dev mode (falls back to first membership)
  if (res2.ok) {
    pass('Dev mode falls back to first membership when org header missing')
  } else {
    assert('Missing org header → rejected', res2.status === 400 || res2.status === 401, `got ${res2.status}`)
  }
}

// ── 2. RBAC: Missing permission denied ───────────────────────────────

async function testRbac() {
  console.log('\n━━━ 2. RBAC ━━━')

  // Use a non-existent org ID to trigger membership not found → 403
  const fakeHeaders = {
    ...DEV_HEADERS,
    'X-Dev-Org-Id': 'nonexistent-org-id',
    'X-Organization-Id': 'nonexistent-org-id',
  }
  const res = await fetch(`${BASE}/api/poultry/farms`, { headers: fakeHeaders })
  assert('Non-existent org → 403', res.status === 403, `got ${res.status}`)

  const body = await res.json().catch(() => ({}))
  assert('Error mentions membership',
    typeof body.error === 'string' && body.error.toLowerCase().includes('membership'),
    `unexpected body: ${JSON.stringify(body)}`,
  )

  // Test second org (Fresh Restaurants) which doesn't have poultry domain
  // user-admin-001 is admin there (no delete perms) — but poultry data should be empty
  const orgsRes = await fetch(`${BASE}/api/organizations`)
  const orgsJson = await orgsRes.json()
  const freshOrg = orgsJson.data?.find(
    (o: { slug?: string }) => o.slug === 'fresh-restaurants'
  )
  if (freshOrg) {
    const freshHeaders = headers(freshOrg.id)
    const freshRes = await fetch(`${BASE}/api/poultry/farms`, { headers: freshHeaders })
    assert('Cross-org access returns OK but empty data', freshRes.ok, `status ${freshRes.status}`)
    const freshBody = await freshRes.json()
    const freshData = freshBody.data ?? freshBody
    assert('Cross-org: no poultry farms visible',
      Array.isArray(freshData) && freshData.length === 0,
      `expected empty array, got ${JSON.stringify(freshData)?.slice(0, 100)}`,
    )
  } else {
    fail('Fresh Restaurants org not found', 'skipping cross-org test')
  }
}

// ── 3. TENANT: All list endpoints scoped to org ─────────────────────

async function testTenant() {
  console.log('\n━━━ 3. TENANT (data scoping) ━━━')

  const endpoints = [
    '/api/poultry/farms',
    '/api/poultry/sheds',
    '/api/poultry/flocks',
    '/api/poultry/feed',
    '/api/poultry/health',
    '/api/poultry/production',
    '/api/poultry/procurement',
    '/api/poultry/sales',
    '/api/poultry/customers',
  ]

  for (const ep of endpoints) {
    const res = await get(ep)
    const label = `GET ${ep} → 200`
    if (!res.ok) {
      fail(label, `status ${res.status}`)
      continue
    }
    const json = await res.json()
    // Responses use apiEnvelope: { data: [...], meta: { ... } } or direct arrays
    const items = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : null)
    assert(`${ep} returns array data`, Array.isArray(items), `got ${typeof items}`)
  }

  // Verify seed data counts (expected from seed.ts)
  const farmsRes = await get('/api/poultry/farms')
  const farmsJson = await farmsRes.json()
  const farms = farmsJson.data ?? farmsJson
  assert('Farms count ≥ 2 (seed)', Array.isArray(farms) && farms.length >= 2, `got ${farms?.length}`)

  const shedsRes = await get('/api/poultry/sheds')
  const shedsJson = await shedsRes.json()
  const sheds = shedsJson.data ?? shedsJson
  assert('Sheds count ≥ 4 (seed)', Array.isArray(sheds) && sheds.length >= 4, `got ${sheds?.length}`)

  const flocksRes = await get('/api/poultry/flocks')
  const flocksJson = await flocksRes.json()
  const flocks = flocksJson.data ?? flocksJson
  assert('Flocks count ≥ 3 (seed)', Array.isArray(flocks) && flocks.length >= 3, `got ${flocks?.length}`)

  const customersRes = await get('/api/poultry/customers')
  const customersJson = await customersRes.json()
  const customers = customersJson.data ?? customersJson
  assert('Customers count ≥ 3 (seed)', Array.isArray(customers) && customers.length >= 3, `got ${customers?.length}`)
}

// ── 4. CRUD: Create / Read / Update / Delete ────────────────────────

async function testCrud() {
  console.log('\n━━━ 4. CRUD ━━━')

  // ── Farms ──
  console.log('  ── Farms ──')
  const farmCreate = await post('/api/poultry/farms', {
    name: 'Test Farm (CRUD)',
    location: 'Test City',
    capacity: 5000,
  })
  const farmBody = await farmCreate.json()
  const farmId = farmBody.data?.id ?? farmBody.id
  assert('CREATE farm → 200/201', farmCreate.ok, `status ${farmCreate.status}: ${JSON.stringify(farmBody).slice(0, 120)}`)
  assert('Farm has id', typeof farmId === 'string' && farmId.length > 0, `no id in response`)

  if (farmId) {
    const farmGet = await get(`/api/poultry/farms/${farmId}`)
    const farmGetBody = await farmGet.json()
    const farmData = farmGetBody.data ?? farmGetBody
    assert('GET farm by id → 200', farmGet.ok, `status ${farmGet.status}`)
    assert('Farm name matches', farmData?.name === 'Test Farm (CRUD)', `got "${farmData?.name}"`)

    const farmPatch = await patch(`/api/poultry/farms/${farmId}`, { name: 'Updated Test Farm' })
    const farmPatchBody = await farmPatch.json()
    const farmPatchData = farmPatchBody.data ?? farmPatchBody
    assert('PATCH farm → 200', farmPatch.ok, `status ${farmPatch.status}`)
    assert('Farm name updated', farmPatchData?.name === 'Updated Test Farm', `got "${farmPatchData?.name}"`)

    const farmDel = await del(`/api/poultry/farms/${farmId}`)
    assert('DELETE farm → 200', farmDel.ok, `status ${farmDel.status}`)

    const farmGet2 = await get(`/api/poultry/farms/${farmId}`)
    assert('GET deleted farm → 404', farmGet2.status === 404, `status ${farmGet2.status}`)
  }

  // ── Sheds ──
  console.log('  ── Sheds ──')
  // Get a farm ID from seed data
  const farmsList = await (await get('/api/poultry/farms')).json()
  const seedFarmId = (farmsList.data ?? farmsList)?.[0]?.id
  assert('Seed farm ID available', !!seedFarmId, 'no farms found')

  if (seedFarmId) {
    const shedCreate = await post('/api/poultry/sheds', {
      farmId: seedFarmId,
      name: 'Test Shed (CRUD)',
      shedType: 'broiler',
      capacity: 5000,
    })
    const shedBody = await shedCreate.json()
    const shedId = shedBody.data?.id ?? shedBody.id
    assert('CREATE shed → 200/201', shedCreate.ok, `status ${shedCreate.status}`)

    if (shedId) {
      const shedGet = await get(`/api/poultry/sheds/${shedId}`)
      assert('GET shed by id → 200', shedGet.ok, `status ${shedGet.status}`)

      const shedPatch = await patch(`/api/poultry/sheds/${shedId}`, { name: 'Updated Test Shed' })
      const shedPatchBody = await shedPatch.json()
      assert('PATCH shed → 200', shedPatch.ok, `status ${shedPatch.status}`)

      const shedDel = await del(`/api/poultry/sheds/${shedId}`)
      assert('DELETE shed → 200', shedDel.ok, `status ${shedDel.status}`)
    }
  }

  // ── Flocks ──
  console.log('  ── Flocks ──')
  const shedsList = await (await get('/api/poultry/sheds')).json()
  const seedShedId = (shedsList.data ?? shedsList)?.[0]?.id
  assert('Seed shed ID available', !!seedShedId, 'no sheds found')

  if (seedShedId) {
    const flockCreate = await post('/api/poultry/flocks', {
      shedId: seedShedId,
      breed: 'Cobb 500',
      placementDate: new Date().toISOString().split('T')[0],
      quantity: 1000,
    })
    const flockBody = await flockCreate.json()
    const flockId = flockBody.data?.id ?? flockBody.id
    assert('CREATE flock → 200/201', flockCreate.ok, `status ${flockCreate.status}: ${JSON.stringify(flockBody).slice(0, 120)}`)

    if (flockId) {
      const flockGet = await get(`/api/poultry/flocks/${flockId}`)
      assert('GET flock by id → 200', flockGet.ok, `status ${flockGet.status}`)

      const flockPatch = await patch(`/api/poultry/flocks/${flockId}`, { averageWeight: 1.5 })
      assert('PATCH flock → 200', flockPatch.ok, `status ${flockPatch.status}`)
    }
  }

  // ── Feed ──
  console.log('  ── Feed ──')
  const flocksList = await (await get('/api/poultry/flocks')).json()
  const seedFlockId = (flocksList.data ?? flocksList)?.[0]?.id
  assert('Seed flock ID available', !!seedFlockId, 'no flocks found')

  if (seedFlockId) {
    const feedCreate = await post('/api/poultry/feed', {
      flockId: seedFlockId,
      date: new Date().toISOString().split('T')[0],
      feedType: 'Broiler Starter',
      quantityKg: 100,
      costUsd: 50,
    })
    const feedBody = await feedCreate.json()
    const feedId = feedBody.data?.id ?? feedBody.id
    assert('CREATE feed record → 200/201', feedCreate.ok, `status ${feedCreate.status}`)

    if (feedId) {
      const feedDel = await del(`/api/poultry/feed/${feedId}`)
      assert('DELETE feed record → 200', feedDel.ok, `status ${feedDel.status}`)
    }
  }

  // ── Health ──
  console.log('  ── Health ──')
  if (seedFlockId) {
    const healthCreate = await post('/api/poultry/health', {
      flockId: seedFlockId,
      date: new Date().toISOString().split('T')[0],
      type: 'vaccination',
      treatment: 'Test vaccination',
      costUsd: 25,
      nextDueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    })
    const healthBody = await healthCreate.json()
    const healthId = healthBody.data?.id ?? healthBody.id
    assert('CREATE health record → 200/201', healthCreate.ok, `status ${healthCreate.status}`)

    if (healthId) {
      const healthDel = await del(`/api/poultry/health/${healthId}`)
      assert('DELETE health record → 200', healthDel.ok, `status ${healthDel.status}`)
    }
  }

  // ── Production ──
  console.log('  ── Production ──')
  if (seedFlockId) {
    const prodCreate = await post('/api/poultry/production', {
      flockId: seedFlockId,
      date: new Date().toISOString().split('T')[0],
      eggsCollected: 500,
      totalWeightKg: 31.25,
    })
    const prodBody = await prodCreate.json()
    const prodId = prodBody.data?.id ?? prodBody.id
    assert('CREATE production record → 200/201', prodCreate.ok, `status ${prodCreate.status}`)

    if (prodId) {
      const prodDel = await del(`/api/poultry/production/${prodId}`)
      assert('DELETE production record → 200', prodDel.ok, `status ${prodDel.status}`)
    }
  }

  // ── Procurement ──
  console.log('  ── Procurement ──')
  const procCreate = await post('/api/poultry/procurement', {
    type: 'feed',
    supplier: 'Test Supplier',
    description: 'Test procurement (CRUD)',
    quantity: 1000,
    unitCostUsd: 0.5,
  })
  const procBody = await procCreate.json()
  const procId = procBody.data?.id ?? procBody.id
  assert('CREATE procurement → 200/201', procCreate.ok, `status ${procCreate.status}`)

  if (procId) {
    const procPatch = await patch(`/api/poultry/procurement/${procId}`, { status: 'received' })
    assert('PATCH procurement → 200', procPatch.ok, `status ${procPatch.status}`)

    const procDel = await del(`/api/poultry/procurement/${procId}`)
    assert('DELETE procurement → 200', procDel.ok, `status ${procDel.status}`)
  }

  // ── Sales ──
  console.log('  ── Sales ──')
  const saleCreate = await post('/api/poultry/sales', {
    items: [{ product: 'Test Product', qty: 10, rate_per_kg: 500 }],
    totalAmount: 5000,
    currency: 'PKR',
  })
  const saleBody = await saleCreate.json()
  const saleId = saleBody.data?.id ?? saleBody.id
  assert('CREATE sale → 200/201', saleCreate.ok, `status ${saleCreate.status}`)

  if (saleId) {
    const salePatch = await patch(`/api/poultry/sales/${saleId}`, { status: 'completed' })
    assert('PATCH sale → 200', salePatch.ok, `status ${salePatch.status}`)

    const saleDel = await del(`/api/poultry/sales/${saleId}`)
    assert('DELETE sale → 200', saleDel.ok, `status ${saleDel.status}`)
  }

  // ── Customers ──
  console.log('  ── Customers ──')
  const custCreate = await post('/api/poultry/customers', {
    name: 'Test Customer (CRUD)',
    email: 'test@example.com',
    phone: '+92-300-0000000',
  })
  const custBody = await custCreate.json()
  const custId = custBody.data?.id ?? custBody.id
  assert('CREATE customer → 200/201', custCreate.ok, `status ${custCreate.status}`)
  assert('Customer has id', typeof custId === 'string' && custId.length > 0, 'no id in response')
}

// ── 5. VALIDATION: Invalid data → 400 ──────────────────────────────

async function testValidation() {
  console.log('\n━━━ 5. VALIDATION ━━━')

  // Farm: missing required fields
  const res1 = await post('/api/poultry/farms', { location: 'Only Location' })
  assert('Farm missing name → 400', res1.status === 400, `got ${res1.status}`)
  const body1 = await res1.json()
  assert('Farm error mentions name',
    typeof body1.error === 'string' && body1.error.includes('name'),
    `error: ${body1.error}`,
  )

  // Farm: negative capacity
  const res2 = await post('/api/poultry/farms', { name: 'Bad Farm', location: 'X', capacity: -10 })
  assert('Farm negative capacity → 400', res2.status === 400, `got ${res2.status}`)

  // Farm: invalid coordinates
  const res3 = await post('/api/poultry/farms', { name: 'Bad Coords', location: 'X', latitude: 999, longitude: -999 })
  assert('Farm invalid lat/lng → 400', res3.status === 400, `got ${res3.status}`)

  // Farm: invalid status enum on update
  const farmsList = await (await get('/api/poultry/farms')).json()
  const someFarmId = (farmsList.data ?? farmsList)?.[0]?.id
  if (someFarmId) {
    const res4 = await patch(`/api/poultry/farms/${someFarmId}`, { status: 'invalid_status' })
    assert('Farm invalid status enum → 400', res4.status === 400, `got ${res4.status}`)
  }

  // Shed: missing farmId
  const res5 = await post('/api/poultry/sheds', { name: 'Orphan Shed' })
  assert('Shed missing farmId → 400', res5.status === 400, `got ${res5.status}`)

  // Shed: invalid shedType
  if (someFarmId) {
    const res6 = await post('/api/poultry/sheds', { farmId: someFarmId, name: 'Bad Type', shedType: 'spaceship' })
    assert('Shed invalid shedType → 400', res6.status === 400, `got ${res6.status}`)
  }

  // Shed: negative capacity on create
  if (someFarmId) {
    const res6b = await post('/api/poultry/sheds', { farmId: someFarmId, name: 'Neg Cap', capacity: -5 })
    assert('Shed negative capacity → 400', res6b.status === 400, `got ${res6b.status}`)
  }

  // Flock: missing required fields
  const res7 = await post('/api/poultry/flocks', { breed: 'Cobb 500' })
  assert('Flock missing shedId → 400', res7.status === 400, `got ${res7.status}`)

  // Flock: negative quantity
  const shedsList = await (await get('/api/poultry/sheds')).json()
  const someShedId = (shedsList.data ?? shedsList)?.[0]?.id
  if (someShedId) {
    const res8 = await post('/api/poultry/flocks', {
      shedId: someShedId, breed: 'Test', placementDate: '2025-01-01', quantity: -5,
    })
    assert('Flock negative quantity → 400', res8.status === 400, `got ${res8.status}`)
  }

  // Flock: invalid date
  if (someShedId) {
    const res9 = await post('/api/poultry/flocks', {
      shedId: someShedId, breed: 'Test', placementDate: 'not-a-date', quantity: 100,
    })
    assert('Flock invalid date → 400', res9.status === 400, `got ${res9.status}`)
  }

  // Flock: invalid status on update
  const flocksList = await (await get('/api/poultry/flocks')).json()
  const someFlockId = (flocksList.data ?? flocksList)?.[0]?.id
  if (someFlockId) {
    const res10 = await patch(`/api/poultry/flocks/${someFlockId}`, { status: 'flying' })
    assert('Flock invalid status → 400', res10.status === 400, `got ${res10.status}`)
  }

  // Feed: missing required fields
  const res11 = await post('/api/poultry/feed', { feedType: 'Starter' })
  assert('Feed missing flockId → 400', res11.status === 400, `got ${res11.status}`)

  // Feed: negative quantity
  if (someFlockId) {
    const res12 = await post('/api/poultry/feed', {
      flockId: someFlockId, date: '2025-01-01', feedType: 'Starter', quantityKg: -10, costUsd: 5,
    })
    assert('Feed negative quantityKg → 400', res12.status === 400, `got ${res12.status}`)
  }

  // Health: invalid type
  if (someFlockId) {
    const res13 = await post('/api/poultry/health', {
      flockId: someFlockId, date: '2025-01-01', type: 'surgery', treatment: 'X',
    })
    assert('Health invalid type → 400', res13.status === 400, `got ${res13.status}`)
  }

  // Health: missing treatment
  if (someFlockId) {
    const res14 = await post('/api/poultry/health', {
      flockId: someFlockId, date: '2025-01-01', type: 'vaccination',
    })
    assert('Health missing treatment → 400', res14.status === 400, `got ${res14.status}`)
  }

  // Production: negative eggs
  if (someFlockId) {
    const res15 = await post('/api/poultry/production', {
      flockId: someFlockId, date: '2025-01-01', eggsCollected: -5,
    })
    assert('Production negative eggsCollected → 400', res15.status === 400, `got ${res15.status}`)
  }

  // Production: FCR out of range
  if (someFlockId) {
    const res16 = await post('/api/poultry/production', {
      flockId: someFlockId, date: '2025-01-01', feedConversionRatio: 99,
    })
    assert('Production FCR > 10 → 400', res16.status === 400, `got ${res16.status}`)
  }

  // Procurement: invalid type
  const res17 = await post('/api/poultry/procurement', {
    type: 'spaceship', supplier: 'X', description: 'Y', quantity: 10,
  })
  assert('Procurement invalid type → 400', res17.status === 400, `got ${res17.status}`)

  // Procurement: missing supplier
  const res18 = await post('/api/poultry/procurement', { type: 'feed', description: 'X', quantity: 10 })
  assert('Procurement missing supplier → 400', res18.status === 400, `got ${res18.status}`)

  // Sale: missing items
  const res19 = await post('/api/poultry/sales', { totalAmount: 100 })
  assert('Sale missing items → 400', res19.status === 400, `got ${res19.status}`)

  // Sale: negative amount
  const res20 = await post('/api/poultry/sales', { items: { product: 'X' }, totalAmount: -50 })
  assert('Sale negative totalAmount → 400', res20.status === 400, `got ${res20.status}`)

  // Customer: missing name
  const res21 = await post('/api/poultry/customers', { email: 'test@test.com' })
  assert('Customer missing name → 400', res21.status === 400, `got ${res21.status}`)

  // Customer: invalid email
  const res22 = await post('/api/poultry/customers', { name: 'Test', email: 'not-an-email' })
  assert('Customer invalid email → 400', res22.status === 400, `got ${res22.status}`)
}

// ── 6. DASHBOARD: Shape and content ──────────────────────────────────

async function testDashboard() {
  console.log('\n━━━ 6. DASHBOARD ━━━')

  const res = await get('/api/poultry/dashboard')
  assert('GET dashboard → 200', res.ok, `status ${res.status}`)
  const json = await res.json()
  const data = json.data ?? json

  assert('Dashboard has farms object', data?.farms && typeof data.farms === 'object', 'missing farms')
  assert('Dashboard farms.total is number', typeof data?.farms?.total === 'number', `got ${typeof data?.farms?.total}`)
  assert('Dashboard farms.sheds is number', typeof data?.farms?.sheds === 'number', `got ${typeof data?.farms?.sheds}`)
  assert('Dashboard farms.activeFlocks is number', typeof data?.farms?.activeFlocks === 'number', `got ${typeof data?.farms?.activeFlocks}`)
  assert('Dashboard farms.totalBirds is number', typeof data?.farms?.totalBirds === 'number', `got ${typeof data?.farms?.totalBirds}`)

  assert('Dashboard has todayMortality', typeof data?.todayMortality === 'number', 'missing todayMortality')

  assert('Dashboard has weeklySales object', data?.weeklySales && typeof data.weeklySales === 'object', 'missing weeklySales')
  assert('Dashboard weeklySales has count', typeof data?.weeklySales?.count === 'number', 'missing count')
  assert('Dashboard weeklySales has revenue', typeof data?.weeklySales?.revenue === 'number', 'missing revenue')

  assert('Dashboard has monthlyFeed object', data?.monthlyFeed && typeof data.monthlyFeed === 'object', 'missing monthlyFeed')
  assert('Dashboard monthlyFeed has costUsd', typeof data?.monthlyFeed?.costUsd === 'number', 'missing costUsd')

  assert('Dashboard has upcomingVaccinations', Array.isArray(data?.upcomingVaccinations), 'missing upcomingVaccinations')

  assert('Dashboard has recentFlocks', Array.isArray(data?.recentFlocks), 'missing recentFlocks')

  // Verify meta has timestamp
  const meta = json.meta
  assert('Dashboard response has meta.timestamp', typeof meta?.timestamp === 'string', 'missing meta.timestamp')
}

// ── 7. SECURITY: Wrong ID format / nonexistent ──────────────────────

async function testSecurity() {
  console.log('\n━━━ 7. SECURITY ━━━')

  // Non-existent farm ID → 404
  const res1 = await get('/api/poultry/farms/nonexistent-id-12345')
  assert('GET nonexistent farm → 404', res1.status === 404, `got ${res1.status}`)

  // Non-existent shed ID
  const res2 = await get('/api/poultry/sheds/nonexistent-id-12345')
  assert('GET nonexistent shed → 404', res2.status === 404, `got ${res2.status}`)

  // Non-existent flock ID
  const res3 = await get('/api/poultry/flocks/nonexistent-id-12345')
  assert('GET nonexistent flock → 404', res3.status === 404, `got ${res3.status}`)

  // DELETE nonexistent feed → graceful (404 or error, not 500)
  const res4 = await del('/api/poultry/feed/nonexistent-id-12345')
  assert('DELETE nonexistent feed → not 500', res4.status !== 500, `got ${res4.status}`)

  // DELETE nonexistent health → graceful
  const res5 = await del('/api/poultry/health/nonexistent-id-12345')
  assert('DELETE nonexistent health → not 500', res5.status !== 500, `got ${res5.status}`)

  // DELETE nonexistent production → graceful
  const res6 = await del('/api/poultry/production/nonexistent-id-12345')
  assert('DELETE nonexistent production → not 500', res6.status !== 500, `got ${res6.status}`)

  // PATCH nonexistent farm → 404
  const res7 = await patch('/api/poultry/farms/nonexistent-id-12345', { name: 'X' })
  assert('PATCH nonexistent farm → 404', res7.status === 404, `got ${res7.status}`)

  // DELETE nonexistent farm → 404
  const res8 = await del('/api/poultry/farms/nonexistent-id-12345')
  assert('DELETE nonexistent farm → 404', res8.status === 404, `got ${res8.status}`)

  // DELETE nonexistent procurement → graceful
  const res9 = await del('/api/poultry/procurement/nonexistent-id-12345')
  assert('DELETE nonexistent procurement → not 500', res9.status !== 500, `got ${res9.status}`)

  // DELETE nonexistent sale → graceful
  const res10 = await del('/api/poultry/sales/nonexistent-id-12345')
  assert('DELETE nonexistent sale → not 500', res10.status !== 500, `got ${res10.status}`)

  // SQL injection attempt in ID (should be gracefully handled)
  const res11 = await get("/api/poultry/farms/1'; DROP TABLE poultry_farm;--")
  assert('SQL injection in ID → not 500', res11.status !== 500, `got ${res11.status}`)
  const body11 = await res11.json().catch(() => ({}))
  assert('SQL injection returns safe error',
    res11.status === 404 || typeof body11.error === 'string',
    `unexpected response: ${JSON.stringify(body11).slice(0, 100)}`,
  )
}

// ── Runner ───────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   MIANX Poultry OS — Test Suite             ║')
  console.log('║   Target: localhost:3000/api/poultry/        ║')
  console.log('╚══════════════════════════════════════════════╝')

  try {
    await bootstrap()
    if (!ORG_ID) {
      console.log('\n❌ Could not resolve org ID. Is the server running and seed data applied?')
      process.exit(1)
    }

    await testAuth()
    await testRbac()
    await testTenant()
    await testCrud()
    await testValidation()
    await testDashboard()
    await testSecurity()
  } catch (err) {
    console.error('\n💥 Unhandled error:', err)
    failed++
  }

  // ── Summary ──
  console.log('\n━━━ Summary ━━━')
  const total = passed + failed
  console.log(`  Total: ${total}  ✓ Passed: ${passed}  ✗ Failed: ${failed}`)
  if (failures.length > 0) {
    console.log('\n  Failed tests:')
    for (const f of failures) {
      console.log(`    ${f}`)
    }
  }
  console.log(failed === 0 ? '\n  🎉 All tests passed!' : '\n  ⚠️  Some tests failed.')
  process.exit(failed > 0 ? 1 : 0)
}

main()
