import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const bookingServiceMock = {
  listBookings: vi.fn(),
  createBooking: vi.fn(),
  updateBooking: vi.fn(),
  cancelBooking: vi.fn()
};

const schedulingServiceMock = {
  listRoster: vi.fn(),
  createSlot: vi.fn(),
  updateSlot: vi.fn(),
  deleteSlot: vi.fn()
};

const adminSettingsControllerMock = {
  getMonetizationSettings: vi.fn((_req, res) => res.status(200).json({ success: true, data: null })),
  updateMonetizationSettings: vi.fn((_req, res) => res.status(200).json({ success: true, data: null }))
};

const platformSettingsServiceMock = {
  getMonetizationSettings: vi.fn(),
  updateMonetizationSettings: vi.fn()
};

const orchestrationControllerMock = {
  generateCourseOutline: vi.fn((_req, res) => res.status(200).json({ success: true, data: null })),
  importFromNotion: vi.fn((_req, res) => res.status(200).json({ success: true, data: null })),
  syncFromLms: vi.fn((_req, res) => res.status(200).json({ success: true, data: null })),
  routeTutorRequest: vi.fn((_req, res) => res.status(200).json({ success: true, data: null })),
  sendMentorInvite: vi.fn((_req, res) => res.status(200).json({ success: true, data: null })),
  exportPricing: vi.fn((_req, res) => res.status(200).json({ success: true, data: null }))
};

vi.mock("../src/middleware/auth.js", () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 99, role: "instructor", sessionId: "sess-instructor" };
    return next();
  }
}));

vi.mock("../src/services/InstructorBookingService.js", () => ({
  default: bookingServiceMock
}));

vi.mock("../src/services/InstructorSchedulingService.js", () => ({
  default: schedulingServiceMock
}));

vi.mock("../src/controllers/AdminSettingsController.js", () => ({
  default: adminSettingsControllerMock
}));

vi.mock("../src/services/PlatformSettingsService.js", () => ({
  default: platformSettingsServiceMock
}));

vi.mock("../src/controllers/InstructorOrchestrationController.js", () => ({
  default: orchestrationControllerMock
}));

let app;
let instructorRouter;

beforeAll(async () => {
  ({ default: instructorRouter } = await import("../src/routes/instructor.routes.js"));
  app = express();
  app.use(express.json());
  app.use("/api/v1/instructor", instructorRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
  bookingServiceMock.listBookings.mockResolvedValue({
    items: [
      {
        id: "booking-1",
        learner: { email: "learner@example.com", firstName: "Alex", lastName: "River" },
        status: "confirmed",
        scheduledStart: "2024-06-01T10:00:00.000Z",
        scheduledEnd: "2024-06-01T11:00:00.000Z",
        meetingUrl: "https://meet.example.com/booking"
      }
    ],
    pagination: { page: 1, perPage: 25, total: 1, totalPages: 1 },
    stats: { total: 1, confirmed: 1, requested: 0, cancelled: 0, completed: 0 }
  });
  bookingServiceMock.createBooking.mockResolvedValue({
    id: "booking-2",
    status: "confirmed",
    learner: { email: "learner@example.com", firstName: "Alex", lastName: "River" }
  });
  bookingServiceMock.updateBooking.mockResolvedValue({
    id: "booking-1",
    status: "completed"
  });
  bookingServiceMock.cancelBooking.mockResolvedValue({ id: "booking-1", status: "cancelled" });

  schedulingServiceMock.listRoster.mockResolvedValue({
    items: [
      {
        id: 12,
        startAt: "2024-06-01T09:00:00.000Z",
        endAt: "2024-06-01T10:00:00.000Z",
        status: "open"
      }
    ],
    pagination: { page: 1, perPage: 25, total: 1, totalPages: 1 }
  });
  schedulingServiceMock.createSlot.mockResolvedValue({
    id: 13,
    startAt: "2024-06-02T09:00:00.000Z",
    endAt: "2024-06-02T10:00:00.000Z",
    status: "open"
  });
  schedulingServiceMock.updateSlot.mockResolvedValue({
    id: 12,
    startAt: "2024-06-01T09:00:00.000Z",
    endAt: "2024-06-01T10:30:00.000Z",
    status: "held"
  });
  schedulingServiceMock.deleteSlot.mockResolvedValue();
});

describe("Instructor bookings HTTP routes", () => {
  it("lists bookings with pagination metadata", async () => {
    const response = await request(app)
      .get("/api/v1/instructor/bookings")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.pagination.total).toBe(1);
    expect(bookingServiceMock.listBookings).toHaveBeenCalledWith(99, expect.objectContaining({
      page: 1,
      perPage: 25,
      status: "all"
    }));
  });

  it("creates a new booking", async () => {
    const payload = {
      learnerEmail: "learner@example.com",
      scheduledStart: "2024-06-05T09:00:00.000Z",
      scheduledEnd: "2024-06-05T10:00:00.000Z"
    };
    const response = await request(app)
      .post("/api/v1/instructor/bookings")
      .set("Authorization", "Bearer token")
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe("booking-2");
    expect(bookingServiceMock.createBooking).toHaveBeenCalledWith(
      99,
      expect.objectContaining({
        learnerEmail: payload.learnerEmail,
        scheduledStart: expect.any(Date),
        scheduledEnd: expect.any(Date)
      })
    );
  });

  it("updates an existing booking", async () => {
    const response = await request(app)
      .patch("/api/v1/instructor/bookings/booking-1")
      .set("Authorization", "Bearer token")
      .send({ status: "completed", meetingUrl: "https://meet.example.com/updated" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("completed");
    expect(bookingServiceMock.updateBooking).toHaveBeenCalledWith(99, "booking-1", {
      status: "completed",
      meetingUrl: "https://meet.example.com/updated"
    });
  });

  it("cancels a booking softly by default", async () => {
    const response = await request(app)
      .delete("/api/v1/instructor/bookings/booking-1")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("cancelled");
    expect(bookingServiceMock.cancelBooking).toHaveBeenCalledWith(99, "booking-1", {
      hardDelete: false,
      reason: undefined
    });
  });

  it("supports hard deleting a booking", async () => {
    bookingServiceMock.cancelBooking.mockResolvedValueOnce(null);
    const response = await request(app)
      .delete("/api/v1/instructor/bookings/booking-1")
      .set("Authorization", "Bearer token")
      .send({ hardDelete: true, reason: "Duplicate" });

    expect(response.status).toBe(204);
    expect(response.body.data).toBeUndefined();
    expect(bookingServiceMock.cancelBooking).toHaveBeenCalledWith(99, "booking-1", {
      hardDelete: true,
      reason: "Duplicate"
    });
  });
});

describe("Instructor roster HTTP routes", () => {
  it("lists roster slots", async () => {
    const response = await request(app)
      .get("/api/v1/instructor/roster")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.pagination.total).toBe(1);
    expect(schedulingServiceMock.listRoster).toHaveBeenCalledWith(99, expect.objectContaining({
      page: 1,
      perPage: 25,
      status: "all"
    }));
  });

  it("creates a roster slot", async () => {
    const payload = {
      startAt: "2024-06-06T08:00:00.000Z",
      endAt: "2024-06-06T09:00:00.000Z"
    };
    const response = await request(app)
      .post("/api/v1/instructor/roster")
      .set("Authorization", "Bearer token")
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe(13);
    expect(schedulingServiceMock.createSlot).toHaveBeenCalledWith(
      99,
      expect.objectContaining({
        startAt: expect.any(Date),
        endAt: expect.any(Date)
      })
    );
  });

  it("updates a roster slot", async () => {
    const response = await request(app)
      .patch("/api/v1/instructor/roster/12")
      .set("Authorization", "Bearer token")
      .send({ status: "held" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("held");
    expect(schedulingServiceMock.updateSlot).toHaveBeenCalledWith(
      99,
      12,
      expect.objectContaining({ status: "held" })
    );
  });

  it("removes a roster slot", async () => {
    const response = await request(app)
      .delete("/api/v1/instructor/roster/12")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(204);
    expect(response.body.data).toBeUndefined();
    expect(schedulingServiceMock.deleteSlot).toHaveBeenCalledWith(99, 12);
  });
});
