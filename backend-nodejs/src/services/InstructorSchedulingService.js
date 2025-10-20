import crypto from 'node:crypto';

import db from '../config/database.js';
import TutorAvailabilitySlotModel from '../models/TutorAvailabilitySlotModel.js';
import TutorProfileModel from '../models/TutorProfileModel.js';

function normaliseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildPagination(page, perPage, total) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return { page, perPage, total, totalPages };
}

export default class InstructorSchedulingService {
  static async resolveTutorProfileId(instructorUserId, connection = db) {
    const profile = await TutorProfileModel.findByUserId(instructorUserId, connection);
    if (!profile) {
      const error = new Error('Tutor profile not found for instructor');
      error.status = 404;
      throw error;
    }
    return profile.id;
  }

  static async listRoster(instructorUserId, { page = 1, perPage = 25, status, from, to } = {}) {
    const tutorId = await this.resolveTutorProfileId(instructorUserId);
    const offset = (page - 1) * perPage;
    const slots = await TutorAvailabilitySlotModel.listByTutorId(tutorId, { status, from, to }, db);
    const items = slots.slice(offset, offset + perPage);
    const total = slots.length;

    return {
      items,
      pagination: buildPagination(page, perPage, total)
    };
  }

  static async createSlot(instructorUserId, payload = {}) {
    return db.transaction(async (trx) => {
      const tutorId = await this.resolveTutorProfileId(instructorUserId, trx);
      const startAt = normaliseDate(payload.startAt);
      const endAt = normaliseDate(payload.endAt);
      if (!startAt || !endAt || endAt <= startAt) {
        const error = new Error('Valid start and end times are required');
        error.status = 422;
        throw error;
      }

      const metadata = { ...payload.metadata };
      if (!metadata.reference) {
        metadata.reference = crypto.randomUUID();
      }

      return TutorAvailabilitySlotModel.create(
        {
          tutorId,
          startAt,
          endAt,
          status: payload.status ?? 'open',
          isRecurring: Boolean(payload.isRecurring),
          recurrenceRule: payload.recurrenceRule ?? null,
          metadata
        },
        trx
      );
    });
  }

  static async updateSlot(instructorUserId, slotId, updates = {}) {
    return db.transaction(async (trx) => {
      const tutorId = await this.resolveTutorProfileId(instructorUserId, trx);
      const slot = await TutorAvailabilitySlotModel.findById(slotId, trx);
      if (!slot || slot.tutorId !== tutorId) {
        const error = new Error('Roster entry not found');
        error.status = 404;
        throw error;
      }

      const nextUpdates = { ...updates };
      if (nextUpdates.startAt !== undefined) {
        const startAt = normaliseDate(nextUpdates.startAt);
        if (!startAt) {
          const error = new Error('Invalid start time');
          error.status = 422;
          throw error;
        }
        nextUpdates.startAt = startAt;
      }
      if (nextUpdates.endAt !== undefined) {
        const endAt = normaliseDate(nextUpdates.endAt);
        if (!endAt) {
          const error = new Error('Invalid end time');
          error.status = 422;
          throw error;
        }
        nextUpdates.endAt = endAt;
      }

      if (nextUpdates.metadata) {
        nextUpdates.metadata = { ...slot.metadata, ...nextUpdates.metadata };
      }

      return TutorAvailabilitySlotModel.updateById(slotId, nextUpdates, trx);
    });
  }

  static async deleteSlot(instructorUserId, slotId) {
    return db.transaction(async (trx) => {
      const tutorId = await this.resolveTutorProfileId(instructorUserId, trx);
      const slot = await TutorAvailabilitySlotModel.findById(slotId, trx);
      if (!slot || slot.tutorId !== tutorId) {
        const error = new Error('Roster entry not found');
        error.status = 404;
        throw error;
      }
      await TutorAvailabilitySlotModel.deleteById(slotId, trx);
    });
  }
}
