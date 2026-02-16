/**
 * Shift Scheduling Service
 * Core business logic for managing shifts, availability, time-off, and coverage
 */

import { query, getClient } from './db';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

const shiftLogger = logger.createChild('shift-scheduling-service');

// ============ TYPES ============

export interface ShiftTemplate {
  id: number;
  shopId: number;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  minBarbersRequired: number;
  maxBarbersAllowed: number;
  isRecurring: boolean;
  recurringPattern?: string;
  recurringDays?: string;
  isActive: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BarberAvailability {
  id: number;
  shopId: number;
  barberId: number;
  dayOfWeek: number;
  isAvailable: boolean;
  availabilityType: 'regular' | 'flexible' | 'unavailable';
  startTime?: string;
  endTime?: string;
  preferenceLevel: 'preferred' | 'willing' | 'unavailable';
  createdAt: string;
  updatedAt: string;
}

export interface BarberShift {
  id: number;
  shopId: number;
  barberId: number;
  shiftTemplateId?: number;
  shiftDate: string;
  startTime: string;
  endTime: string;
  status: 'assigned' | 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  assignedBy?: number;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface TimeOffRequest {
  id: number;
  shopId: number;
  barberId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  description?: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: number;
  denialReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftSwap {
  id: number;
  shopId: number;
  requestingBarberId: number;
  requestedBarberId: number;
  shiftIdToGive: number;
  shiftIdToReceive: number;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  requestedAt: string;
  respondedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoverageStatus {
  shiftId?: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  assignedBarbers: number;
  minimumRequired: number;
  status: 'covered' | 'understaffed' | 'overstaffed';
  barberDetails?: Array<{ barberId: number; name: string }>;
}

// ============ SHOP OPERATING HOURS ============

export async function getShopOperatingHours(shopId: number): Promise<any[]> {
  const result = await query(
    `SELECT id, shop_id, day_of_week, is_open, open_time, close_time, created_at, updated_at
     FROM shop_operating_hours
     WHERE shop_id = $1
     ORDER BY day_of_week`,
    [shopId]
  );
  return result.rows;
}

export async function updateShopOperatingHours(
  shopId: number,
  dayOfWeek: number,
  isOpen: boolean,
  openTime?: string,
  closeTime?: string
): Promise<any> {
  const result = await query(
    `INSERT INTO shop_operating_hours (shop_id, day_of_week, is_open, open_time, close_time)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (shop_id, day_of_week) DO UPDATE
     SET is_open = $3, open_time = $4, close_time = $5, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [shopId, dayOfWeek, isOpen, openTime || null, closeTime || null]
  );
  return result.rows[0];
}

// ============ SHIFT TEMPLATES ============

export async function createShiftTemplate(
  shopId: number,
  name: string,
  startTime: string,
  endTime: string,
  options?: {
    description?: string;
    minBarbersRequired?: number;
    maxBarbersAllowed?: number;
    recurringPattern?: string;
    recurringDays?: string;
    createdBy?: number;
  }
): Promise<ShiftTemplate> {
  const result = await query(
    `INSERT INTO shift_templates 
     (shop_id, name, description, start_time, end_time, min_barbers_required, max_barbers_allowed, 
      recurring_pattern, recurring_days, created_by, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
     RETURNING *`,
    [
      shopId,
      name,
      options?.description || null,
      startTime,
      endTime,
      options?.minBarbersRequired || 1,
      options?.maxBarbersAllowed || 5,
      options?.recurringPattern || null,
      options?.recurringDays || null,
      options?.createdBy || null,
    ]
  );
  return result.rows[0];
}

export async function getShiftTemplates(shopId: number): Promise<ShiftTemplate[]> {
  const result = await query(
    `SELECT * FROM shift_templates WHERE shop_id = $1 AND is_active = true ORDER BY name`,
    [shopId]
  );
  return result.rows;
}

export async function updateShiftTemplate(
  templateId: number,
  shopId: number,
  updates: Partial<ShiftTemplate>
): Promise<ShiftTemplate> {
  const fields: string[] = [];
  const values: any[] = [templateId, shopId];
  let paramIndex = 3;

  if (updates.name) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.startTime) {
    fields.push(`start_time = $${paramIndex++}`);
    values.push(updates.startTime);
  }
  if (updates.endTime) {
    fields.push(`end_time = $${paramIndex++}`);
    values.push(updates.endTime);
  }
  if (updates.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(updates.isActive);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  const result = await query(
    `UPDATE shift_templates 
     SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND shop_id = $2
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Shift template not found');
  }

  return result.rows[0];
}

export async function deleteShiftTemplate(templateId: number, shopId: number): Promise<void> {
  const result = await query(
    `UPDATE shift_templates SET is_active = false WHERE id = $1 AND shop_id = $2`,
    [templateId, shopId]
  );

  if (result.rowCount === 0) {
    throw new Error('Shift template not found');
  }
}

// ============ BARBER AVAILABILITY ============

export async function setBarberAvailability(
  shopId: number,
  barberId: number,
  dayOfWeek: number,
  isAvailable: boolean,
  options?: {
    availabilityType?: 'regular' | 'flexible' | 'unavailable';
    startTime?: string;
    endTime?: string;
    preferenceLevel?: 'preferred' | 'willing' | 'unavailable';
  }
): Promise<BarberAvailability> {
  const result = await query(
    `INSERT INTO barber_availability 
     (shop_id, barber_id, day_of_week, is_available, availability_type, start_time, end_time, preference_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (shop_id, barber_id, day_of_week) DO UPDATE
     SET is_available = $4, availability_type = $5, start_time = $6, end_time = $7, 
         preference_level = $8, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      shopId,
      barberId,
      dayOfWeek,
      isAvailable,
      options?.availabilityType || 'flexible',
      options?.startTime || null,
      options?.endTime || null,
      options?.preferenceLevel || 'willing',
    ]
  );
  return result.rows[0];
}

export async function getBarberAvailability(
  shopId: number,
  barberId: number
): Promise<BarberAvailability[]> {
  const result = await query(
    `SELECT * FROM barber_availability 
     WHERE shop_id = $1 AND barber_id = $2 
     ORDER BY day_of_week`,
    [shopId, barberId]
  );
  return result.rows;
}

export async function getBarberAvailabilityForDay(
  shopId: number,
  dayOfWeek: number
): Promise<BarberAvailability[]> {
  const result = await query(
    `SELECT * FROM barber_availability 
     WHERE shop_id = $1 AND day_of_week = $2 AND is_available = true
     ORDER BY preference_level DESC`,
    [shopId, dayOfWeek]
  );
  return result.rows;
}

// ============ BARBER SHIFTS ============

export async function assignBarberToShift(
  shopId: number,
  barberId: number,
  shiftDate: string,
  startTime: string,
  endTime: string,
  options?: {
    shiftTemplateId?: number;
    notes?: string;
    assignedBy?: number;
  }
): Promise<BarberShift> {
  // Check for conflicts
  await checkShiftConflicts(barberId, shiftDate, startTime, endTime);

  // Check time off
  const hasTimeOff = await checkTimeOffConflict(shopId, barberId, shiftDate);
  if (hasTimeOff) {
    throw new Error('Barber has time-off approved for this date');
  }

  const result = await query(
    `INSERT INTO barber_shifts 
     (shop_id, barber_id, shift_template_id, shift_date, start_time, end_time, status, notes, assigned_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'assigned', $7, $8)
     RETURNING *`,
    [
      shopId,
      barberId,
      options?.shiftTemplateId || null,
      shiftDate,
      startTime,
      endTime,
      options?.notes || null,
      options?.assignedBy || null,
    ]
  );

  // Log shift history
  await logShiftHistory(shopId, result.rows[0].id, 'created', options?.assignedBy, null, {
    barberId,
    shiftDate,
    startTime,
    endTime,
  });

  return result.rows[0];
}

export async function getBarberShifts(
  shopId: number,
  barberId: number,
  startDate?: string,
  endDate?: string
): Promise<BarberShift[]> {
  let queryStr = `SELECT * FROM barber_shifts 
                   WHERE shop_id = $1 AND barber_id = $2 AND deleted_at IS NULL`;
  const params: any[] = [shopId, barberId];

  if (startDate) {
    queryStr += ` AND shift_date >= $${params.length + 1}`;
    params.push(startDate);
  }

  if (endDate) {
    queryStr += ` AND shift_date <= $${params.length + 1}`;
    params.push(endDate);
  }

  queryStr += ` ORDER BY shift_date, start_time`;

  const result = await query(queryStr, params);
  return result.rows;
}

export async function getShiftBoard(
  shopId: number,
  startDate: string,
  endDate: string
): Promise<BarberShift[]> {
  const result = await query(
    `SELECT bs.*, u.name as barber_name
     FROM barber_shifts bs
     JOIN users u ON bs.barber_id = u.id
     WHERE bs.shop_id = $1 AND bs.shift_date >= $2 AND bs.shift_date <= $3 
     AND bs.deleted_at IS NULL
     ORDER BY bs.shift_date, bs.start_time`,
    [shopId, startDate, endDate]
  );
  return result.rows;
}

export async function updateBarberShift(
  shiftId: number,
  shopId: number,
  updates: Partial<BarberShift>
): Promise<BarberShift> {
  const fields: string[] = [];
  const values: any[] = [shiftId, shopId];
  let paramIndex = 3;

  if (updates.barberId) {
    fields.push(`barber_id = $${paramIndex++}`);
    values.push(updates.barberId);
  }
  if (updates.startTime) {
    fields.push(`start_time = $${paramIndex++}`);
    values.push(updates.startTime);
  }
  if (updates.endTime) {
    fields.push(`end_time = $${paramIndex++}`);
    values.push(updates.endTime);
  }
  if (updates.status) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.notes !== undefined) {
    fields.push(`notes = $${paramIndex++}`);
    values.push(updates.notes);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  const result = await query(
    `UPDATE barber_shifts 
     SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND shop_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Shift not found');
  }

  // Log history
  await logShiftHistory(shopId, shiftId, 'updated', undefined, null, updates);

  return result.rows[0];
}

export async function deleteBarberShift(shiftId: number, shopId: number): Promise<void> {
  const result = await query(
    `UPDATE barber_shifts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND shop_id = $2`,
    [shiftId, shopId]
  );

  if (result.rowCount === 0) {
    throw new Error('Shift not found');
  }

  await logShiftHistory(shopId, shiftId, 'deleted', undefined, null, null);
}

// ============ TIME OFF REQUESTS ============

export async function requestTimeOff(
  shopId: number,
  barberId: number,
  startDate: string,
  endDate: string,
  options?: {
    reason?: string;
    description?: string;
  }
): Promise<TimeOffRequest> {
  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new Error('Start date must be before end date');
  }

  if (start < new Date()) {
    throw new Error('Cannot request time-off in the past');
  }

  // Check for overlapping requests
  const existingResult = await query(
    `SELECT id FROM time_off_requests 
     WHERE shop_id = $1 AND barber_id = $2 AND status = 'approved'
     AND start_date <= $4 AND end_date >= $3`,
    [shopId, barberId, startDate, endDate]
  );

  if (existingResult.rows.length > 0) {
    throw new Error('Already have approved time-off during this period');
  }

  const result = await query(
    `INSERT INTO time_off_requests 
     (shop_id, barber_id, start_date, end_date, reason, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [shopId, barberId, startDate, endDate, options?.reason || null, options?.description || null]
  );

  return result.rows[0];
}

export async function getTimeOffRequests(
  shopId: number,
  status?: 'pending' | 'approved' | 'denied',
  barberId?: number
): Promise<TimeOffRequest[]> {
  let queryStr = `SELECT * FROM time_off_requests WHERE shop_id = $1`;
  const params: any[] = [shopId];

  if (status) {
    queryStr += ` AND status = $${params.length + 1}`;
    params.push(status);
  }

  if (barberId) {
    queryStr += ` AND barber_id = $${params.length + 1}`;
    params.push(barberId);
  }

  queryStr += ` ORDER BY requested_at DESC`;

  const result = await query(queryStr, params);
  return result.rows;
}

export async function approveTimeOff(
  requestId: number,
  shopId: number,
  approvedBy: number
): Promise<TimeOffRequest> {
  // Get the request
  const reqResult = await query(
    `SELECT * FROM time_off_requests WHERE id = $1 AND shop_id = $2`,
    [requestId, shopId]
  );

  if (reqResult.rows.length === 0) {
    throw new Error('Request not found');
  }

  const timeOffRequest = reqResult.rows[0];

  // Cancel any shifts during this period
  await query(
    `UPDATE barber_shifts 
     SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
     WHERE shop_id = $1 AND barber_id = $2 
     AND shift_date >= $3 AND shift_date <= $4`,
    [shopId, timeOffRequest.barber_id, timeOffRequest.start_date, timeOffRequest.end_date]
  );

  const result = await query(
    `UPDATE time_off_requests 
     SET status = 'approved', approved_by = $3, approved_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND shop_id = $2
     RETURNING *`,
    [requestId, shopId, approvedBy]
  );

  return result.rows[0];
}

export async function denyTimeOff(
  requestId: number,
  shopId: number,
  approvedBy: number,
  denialReason?: string
): Promise<TimeOffRequest> {
  const result = await query(
    `UPDATE time_off_requests 
     SET status = 'denied', approved_by = $3, approved_at = CURRENT_TIMESTAMP, denial_reason = $4
     WHERE id = $1 AND shop_id = $2
     RETURNING *`,
    [requestId, shopId, approvedBy, denialReason || null]
  );

  if (result.rows.length === 0) {
    throw new Error('Request not found');
  }

  return result.rows[0];
}

// ============ SHIFT SWAPS ============

export async function requestShiftSwap(
  shopId: number,
  requestingBarberId: number,
  requestedBarberId: number,
  shiftIdToGive: number,
  shiftIdToReceive: number,
  notes?: string
): Promise<ShiftSwap> {
  // Validate both shifts exist and belong to the right barbers
  const shiftsResult = await query(
    `SELECT id, barber_id, shift_date, start_time, end_time 
     FROM barber_shifts 
     WHERE shop_id = $1 AND id IN ($2, $3)`,
    [shopId, shiftIdToGive, shiftIdToReceive]
  );

  if (shiftsResult.rows.length !== 2) {
    throw new Error('One or both shifts not found');
  }

  const shiftToGive = shiftsResult.rows.find((s: any) => s.id === shiftIdToGive);
  const shiftToReceive = shiftsResult.rows.find((s: any) => s.id === shiftIdToReceive);

  if (shiftToGive?.barber_id !== requestingBarberId) {
    throw new Error('Shift to give does not belong to requesting barber');
  }

  if (shiftToReceive?.barber_id !== requestedBarberId) {
    throw new Error('Shift to receive does not belong to requested barber');
  }

  const result = await query(
    `INSERT INTO shift_swaps 
     (shop_id, requesting_barber_id, requested_barber_id, shift_id_to_give, shift_id_to_receive, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [shopId, requestingBarberId, requestedBarberId, shiftIdToGive, shiftIdToReceive, notes || null]
  );

  return result.rows[0];
}

export async function getPendingShiftSwaps(
  shopId: number,
  barberId: number
): Promise<ShiftSwap[]> {
  const result = await query(
    `SELECT * FROM shift_swaps 
     WHERE shop_id = $1 AND status = 'pending'
     AND (requesting_barber_id = $2 OR requested_barber_id = $2)
     ORDER BY requested_at DESC`,
    [shopId, barberId]
  );
  return result.rows;
}

export async function approveShiftSwap(swapId: number, shopId: number): Promise<void> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get swap details
    const swapResult = await client.query(
      `SELECT * FROM shift_swaps WHERE id = $1 AND shop_id = $2`,
      [swapId, shopId]
    );

    if (swapResult.rows.length === 0) {
      throw new Error('Swap request not found');
    }

    const swap = swapResult.rows[0];

    // Swap barbers on shifts
    await client.query(
      `UPDATE barber_shifts SET barber_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [swap.requested_barber_id, swap.shift_id_to_give]
    );

    await client.query(
      `UPDATE barber_shifts SET barber_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [swap.requesting_barber_id, swap.shift_id_to_receive]
    );

    // Update swap status
    await client.query(
      `UPDATE shift_swaps SET status = 'approved', responded_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [swapId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function denyShiftSwap(swapId: number, shopId: number): Promise<void> {
  await query(
    `UPDATE shift_swaps SET status = 'denied', responded_at = CURRENT_TIMESTAMP WHERE id = $1 AND shop_id = $2`,
    [swapId, shopId]
  );
}

// ============ COVERAGE ANALYTICS ============

export async function getShiftCoverage(
  shopId: number,
  startDate: string,
  endDate: string
): Promise<CoverageStatus[]> {
  // Get all shifts and their assignments
  const shiftsResult = await query(
    `SELECT st.id, st.name, st.start_time, st.end_time, st.min_barbers_required,
            st.recurring_days, st.recurring_pattern,
            soh.day_of_week, soh.is_open
     FROM shift_templates st
     LEFT JOIN shop_operating_hours soh ON st.shop_id = soh.shop_id
     WHERE st.shop_id = $1 AND st.is_active = true
     ORDER BY soh.day_of_week, st.start_time`,
    [shopId]
  );

  const coverage: CoverageStatus[] = [];

  // Generate coverage for each day in the date range
  const currentDate = new Date(startDate);
  const endDateObj = new Date(endDate);

  while (currentDate <= endDateObj) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();

    // Get shifts for this day
    const shiftsForDay = shiftsResult.rows.filter((s: any) => {
      if (!s.is_open) return false;

      // Check if shift applies to this day based on recurring pattern
      if (s.recurring_days) {
        const days = JSON.parse(s.recurring_days);
        return days.includes(dayOfWeek);
      }
      return true;
    });

    // For each shift, count assigned barbers
    for (const shift of shiftsForDay) {
      const assignedResult = await query(
        `SELECT bs.id, u.name FROM barber_shifts bs
         JOIN users u ON bs.barber_id = u.id
         WHERE bs.shop_id = $1 AND bs.shift_date = $2 
         AND bs.start_time = $3 AND bs.end_time = $4 AND bs.deleted_at IS NULL`,
        [shopId, dateStr, shift.start_time, shift.end_time]
      );

      const assignedCount = assignedResult.rows.length;
      const minRequired = shift.min_barbers_required || 1;

      let status: 'covered' | 'understaffed' | 'overstaffed' = 'understaffed';
      if (assignedCount >= minRequired && assignedCount <= 3) {
        status = 'covered';
      } else if (assignedCount > 3) {
        status = 'overstaffed';
      }

      coverage.push({
        shiftDate: dateStr,
        startTime: shift.start_time,
        endTime: shift.end_time,
        assignedBarbers: assignedCount,
        minimumRequired: minRequired,
        status,
        barberDetails: assignedResult.rows.map((r: any) => ({
          barberId: r.id,
          name: r.name,
        })),
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return coverage;
}

export async function getAutoAssignmentSuggestions(
  shopId: number,
  shiftDate: string,
  startTime: string,
  endTime: string
): Promise<Array<{ barberId: number; name: string; preferenceScore: number }>> {
  const dayOfWeek = new Date(shiftDate).getDay();

  // Find available barbers for this day and time
  const suggestionsResult = await query(
    `SELECT u.id, u.name, 
            CASE WHEN ba.preference_level = 'preferred' THEN 3
                 WHEN ba.preference_level = 'willing' THEN 2
                 ELSE 1 END as preference_score
     FROM users u
     LEFT JOIN barber_availability ba ON u.id = ba.barber_id AND ba.day_of_week = $3 AND ba.shop_id = $1
     LEFT JOIN time_off_requests tor ON u.id = tor.barber_id AND tor.start_date <= $2 AND tor.end_date >= $2 AND tor.status = 'approved'
     WHERE u.shop_id = $1 AND u.role = 'barber'
     AND (ba.is_available = true OR ba.id IS NULL)
     AND tor.id IS NULL
     ORDER BY preference_score DESC`,
    [shopId, shiftDate, dayOfWeek]
  );

  return suggestionsResult.rows;
}

// ============ HELPER FUNCTIONS ============

async function checkShiftConflicts(
  barberId: number,
  shiftDate: string,
  startTime: string,
  endTime: string
): Promise<void> {
  const result = await query(
    `SELECT id FROM barber_shifts 
     WHERE barber_id = $1 AND shift_date = $2 AND deleted_at IS NULL
     AND ((start_time < $4 AND end_time > $3) OR 
          (start_time >= $3 AND start_time < $4) OR 
          (end_time > $3 AND end_time <= $4))`,
    [barberId, shiftDate, startTime, endTime]
  );

  if (result.rows.length > 0) {
    throw new Error('Shift conflict: Barber already has a shift during this time');
  }
}

async function checkTimeOffConflict(
  shopId: number,
  barberId: number,
  shiftDate: string
): Promise<boolean> {
  const result = await query(
    `SELECT id FROM time_off_requests 
     WHERE shop_id = $1 AND barber_id = $2 AND status = 'approved'
     AND start_date <= $3 AND end_date >= $3`,
    [shopId, barberId, shiftDate]
  );

  return result.rows.length > 0;
}

async function logShiftHistory(
  shopId: number,
  shiftId: number,
  action: string,
  changedBy?: number,
  oldValues?: any,
  newValues?: any
): Promise<void> {
  await query(
    `INSERT INTO shift_history (shop_id, shift_id, action, changed_by, old_values, new_values)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      shopId,
      shiftId,
      action,
      changedBy || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
    ]
  );
}

export default {
  // Shop hours
  getShopOperatingHours,
  updateShopOperatingHours,

  // Shift templates
  createShiftTemplate,
  getShiftTemplates,
  updateShiftTemplate,
  deleteShiftTemplate,

  // Barber availability
  setBarberAvailability,
  getBarberAvailability,
  getBarberAvailabilityForDay,

  // Barber shifts
  assignBarberToShift,
  getBarberShifts,
  getShiftBoard,
  updateBarberShift,
  deleteBarberShift,

  // Time off
  requestTimeOff,
  getTimeOffRequests,
  approveTimeOff,
  denyTimeOff,

  // Shift swaps
  requestShiftSwap,
  getPendingShiftSwaps,
  approveShiftSwap,
  denyShiftSwap,

  // Coverage
  getShiftCoverage,
  getAutoAssignmentSuggestions,
};
