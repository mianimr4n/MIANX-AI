// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry Input Validation
// Server-side validation for all Poultry write endpoints
// ══════════════════════════════════════════════════════════════════

export interface ValidationError {
  field: string
  message: string
}

const VALID_SHED_TYPES = ['broiler', 'layer', 'breeder', 'mixed']
const VALID_HEALTH_TYPES = ['vaccination', 'treatment', 'checkup', 'emergency']
const VALID_PROCUREMENT_TYPES = ['chick', 'feed', 'medicine', 'equipment', 'supplies']
const VALID_FARM_STATUSES = ['active', 'inactive', 'under_maintenance']
const VALID_FLOCK_STATUSES = ['placed', 'growing', 'laying', 'molting', 'depleted', 'deceased']
const VALID_SALE_STATUSES = ['pending', 'completed', 'cancelled']

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function isPositiveNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && v >= 0
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function validateCreateFarm(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!isNonEmptyString(body.name)) errors.push({ field: 'name', message: 'name is required and must be non-empty' })
  if (!isNonEmptyString(body.location)) errors.push({ field: 'location', message: 'location is required and must be non-empty' })
  if (body.capacity !== undefined && !isPositiveNumber(body.capacity)) errors.push({ field: 'capacity', message: 'capacity must be a non-negative number' })
  if (body.latitude !== undefined && (typeof body.latitude !== 'number' || body.latitude < -90 || body.latitude > 90)) errors.push({ field: 'latitude', message: 'latitude must be between -90 and 90' })
  if (body.longitude !== undefined && (typeof body.longitude !== 'number' || body.longitude < -180 || body.longitude > 180)) errors.push({ field: 'longitude', message: 'longitude must be between -180 and 180' })
  return errors
}

export function validateUpdateFarm(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (body.name !== undefined && !isNonEmptyString(body.name)) errors.push({ field: 'name', message: 'name must be non-empty' })
  if (body.location !== undefined && !isNonEmptyString(body.location)) errors.push({ field: 'location', message: 'location must be non-empty' })
  if (body.capacity !== undefined && !isPositiveNumber(body.capacity)) errors.push({ field: 'capacity', message: 'capacity must be a non-negative number' })
  if (body.status !== undefined && !VALID_FARM_STATUSES.includes(body.status as string)) errors.push({ field: 'status', message: `status must be one of: ${VALID_FARM_STATUSES.join(', ')}` })
  return errors
}

export function validateCreateShed(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!isNonEmptyString(body.farmId)) errors.push({ field: 'farmId', message: 'farmId is required' })
  if (!isNonEmptyString(body.name)) errors.push({ field: 'name', message: 'name is required and must be non-empty' })
  if (body.shedType !== undefined && !VALID_SHED_TYPES.includes(body.shedType as string)) errors.push({ field: 'shedType', message: `shedType must be one of: ${VALID_SHED_TYPES.join(', ')}` })
  if (body.capacity !== undefined && !isPositiveNumber(body.capacity)) errors.push({ field: 'capacity', message: 'capacity must be a non-negative number' })
  return errors
}

export function validateUpdateShed(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (body.name !== undefined && !isNonEmptyString(body.name)) errors.push({ field: 'name', message: 'name must be non-empty' })
  if (body.shedType !== undefined && !VALID_SHED_TYPES.includes(body.shedType as string)) errors.push({ field: 'shedType', message: `shedType must be one of: ${VALID_SHED_TYPES.join(', ')}` })
  if (body.capacity !== undefined && !isPositiveNumber(body.capacity)) errors.push({ field: 'capacity', message: 'capacity must be a non-negative number' })
  if (body.currentCount !== undefined && (!isPositiveNumber(body.currentCount) || !Number.isInteger(body.currentCount))) errors.push({ field: 'currentCount', message: 'currentCount must be a non-negative integer' })
  if (body.temperature !== undefined && (typeof body.temperature !== 'number' || body.temperature < -50 || body.temperature > 80)) errors.push({ field: 'temperature', message: 'temperature must be between -50 and 80' })
  if (body.humidity !== undefined && (typeof body.humidity !== 'number' || body.humidity < 0 || body.humidity > 100)) errors.push({ field: 'humidity', message: 'humidity must be between 0 and 100' })
  return errors
}

export function validateCreateFlock(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!isNonEmptyString(body.shedId)) errors.push({ field: 'shedId', message: 'shedId is required' })
  if (!isNonEmptyString(body.breed)) errors.push({ field: 'breed', message: 'breed is required' })
  if (!isNonEmptyString(body.placementDate)) errors.push({ field: 'placementDate', message: 'placementDate is required' })
  else if (isNaN(Date.parse(body.placementDate as string))) errors.push({ field: 'placementDate', message: 'placementDate must be a valid date' })
  if (body.quantity === undefined || !isPositiveNumber(body.quantity) || !Number.isInteger(body.quantity) || body.quantity < 1) errors.push({ field: 'quantity', message: 'quantity must be a positive integer' })
  return errors
}

export function validateUpdateFlock(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (body.status !== undefined && !VALID_FLOCK_STATUSES.includes(body.status as string)) errors.push({ field: 'status', message: `status must be one of: ${VALID_FLOCK_STATUSES.join(', ')}` })
  if (body.averageWeight !== undefined && (!isPositiveNumber(body.averageWeight) || body.averageWeight > 50)) errors.push({ field: 'averageWeight', message: 'averageWeight must be a non-negative number (max 50kg)' })
  if (body.currentCount !== undefined && (!isPositiveNumber(body.currentCount) || !Number.isInteger(body.currentCount))) errors.push({ field: 'currentCount', message: 'currentCount must be a non-negative integer' })
  return errors
}

export function validateRecordMortality(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!isNonEmptyString(body.flockId)) errors.push({ field: 'flockId', message: 'flockId is required' })
  if (!isNonEmptyString(body.date)) errors.push({ field: 'date', message: 'date is required' })
  else if (isNaN(Date.parse(body.date as string))) errors.push({ field: 'date', message: 'date must be a valid date' })
  if (body.count === undefined || !isPositiveNumber(body.count) || !Number.isInteger(body.count) || body.count < 1) errors.push({ field: 'count', message: 'count must be a positive integer' })
  if (!isNonEmptyString(body.cause)) errors.push({ field: 'cause', message: 'cause is required' })
  return errors
}

export function validateCreateFeedRecord(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!isNonEmptyString(body.flockId)) errors.push({ field: 'flockId', message: 'flockId is required' })
  if (!isNonEmptyString(body.date)) errors.push({ field: 'date', message: 'date is required' })
  else if (isNaN(Date.parse(body.date as string))) errors.push({ field: 'date', message: 'date must be a valid date' })
  if (!isNonEmptyString(body.feedType)) errors.push({ field: 'feedType', message: 'feedType is required' })
  if (body.quantityKg === undefined || !isPositiveNumber(body.quantityKg) || body.quantityKg <= 0) errors.push({ field: 'quantityKg', message: 'quantityKg must be a positive number' })
  if (body.costUsd !== undefined && (!isPositiveNumber(body.costUsd) || body.costUsd < 0)) errors.push({ field: 'costUsd', message: 'costUsd must be a non-negative number' })
  return errors
}

export function validateCreateHealthRecord(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!isNonEmptyString(body.flockId)) errors.push({ field: 'flockId', message: 'flockId is required' })
  if (!isNonEmptyString(body.date)) errors.push({ field: 'date', message: 'date is required' })
  else if (isNaN(Date.parse(body.date as string))) errors.push({ field: 'date', message: 'date must be a valid date' })
  if (!isNonEmptyString(body.type)) errors.push({ field: 'type', message: 'type is required' })
  else if (!VALID_HEALTH_TYPES.includes(body.type as string)) errors.push({ field: 'type', message: `type must be one of: ${VALID_HEALTH_TYPES.join(', ')}` })
  if (!isNonEmptyString(body.treatment)) errors.push({ field: 'treatment', message: 'treatment is required' })
  if (body.costUsd !== undefined && (!isPositiveNumber(body.costUsd) || body.costUsd < 0)) errors.push({ field: 'costUsd', message: 'costUsd must be a non-negative number' })
  if (body.nextDueDate !== undefined && body.nextDueDate !== null) {
    if (typeof body.nextDueDate === 'string' && isNaN(Date.parse(body.nextDueDate))) errors.push({ field: 'nextDueDate', message: 'nextDueDate must be a valid date' })
  }
  return errors
}

export function validateCreateProductionRecord(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!isNonEmptyString(body.flockId)) errors.push({ field: 'flockId', message: 'flockId is required' })
  if (!isNonEmptyString(body.date)) errors.push({ field: 'date', message: 'date is required' })
  else if (isNaN(Date.parse(body.date as string))) errors.push({ field: 'date', message: 'date must be a valid date' })
  if (body.eggsCollected !== undefined && (!isPositiveNumber(body.eggsCollected) || !Number.isInteger(body.eggsCollected) || body.eggsCollected < 0)) errors.push({ field: 'eggsCollected', message: 'eggsCollected must be a non-negative integer' })
  if (body.totalWeightKg !== undefined && (!isPositiveNumber(body.totalWeightKg) || body.totalWeightKg < 0)) errors.push({ field: 'totalWeightKg', message: 'totalWeightKg must be a non-negative number' })
  if (body.feedConversionRatio !== undefined && (typeof body.feedConversionRatio !== 'number' || body.feedConversionRatio < 0 || body.feedConversionRatio > 10)) errors.push({ field: 'feedConversionRatio', message: 'feedConversionRatio must be between 0 and 10' })
  return errors
}

export function validateCreateProcurement(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!isNonEmptyString(body.type)) errors.push({ field: 'type', message: 'type is required' })
  else if (!VALID_PROCUREMENT_TYPES.includes(body.type as string)) errors.push({ field: 'type', message: `type must be one of: ${VALID_PROCUREMENT_TYPES.join(', ')}` })
  if (!isNonEmptyString(body.supplier)) errors.push({ field: 'supplier', message: 'supplier is required' })
  if (!isNonEmptyString(body.description)) errors.push({ field: 'description', message: 'description is required' })
  if (body.quantity === undefined || !isPositiveNumber(body.quantity) || body.quantity <= 0) errors.push({ field: 'quantity', message: 'quantity must be a positive number' })
  if (body.unitCostUsd !== undefined && (!isPositiveNumber(body.unitCostUsd) || body.unitCostUsd < 0)) errors.push({ field: 'unitCostUsd', message: 'unitCostUsd must be a non-negative number' })
  return errors
}

export function validateCreateSale(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!body.items || typeof body.items !== 'object') errors.push({ field: 'items', message: 'items is required and must be an object' })
  if (body.totalAmount === undefined || typeof body.totalAmount !== 'number' || body.totalAmount < 0) errors.push({ field: 'totalAmount', message: 'totalAmount must be a non-negative number' })
  if (body.currency !== undefined && typeof body.currency !== 'string') errors.push({ field: 'currency', message: 'currency must be a string (ISO 4217 code)' })
  return errors
}

export function validateCreateCustomer(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  if (!isNonEmptyString(body.name)) errors.push({ field: 'name', message: 'name is required' })
  if (body.email !== undefined && typeof body.email === 'string' && body.email.length > 0) {
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push({ field: 'email', message: 'email must be a valid email address' })
  }
  return errors
}

/** Format validation errors into a user-friendly message */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(e => `${e.field}: ${e.message}`).join('; ')
}
