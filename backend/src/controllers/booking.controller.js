// backend/src/controllers/booking.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import * as svc from "../services/booking.service.js";
import { getAvailability } from "../services/schedule.service.js";

export const availability = asyncHandler(async (req, res) => {
  const data = await getAvailability({
    date: req.query.date,
    courtId: req.query.court_id,
    viewer: req.user,
  });
  res.json({ success: true, data });
});

export const list = asyncHandler(async (req, res) => {
  const data = await svc.listBookings({
    user: req.user,
    filters: {
      status: req.query.status,
      q: req.query.q,
      date: req.query.date,
      page: req.query.page,
      limit: req.query.limit,
    },
  });
  res.json({ success: true, ...data });
});

// Cliente ve solo sus propias reservas (ruta dedicada /bookings/mis-reservas)
export const listClientBookings = asyncHandler(async (req, res) => {
  const data = await svc.listBookings({
    user: req.user,
    filters: {
      status: req.query.status,
      q: req.query.q,
      date: req.query.date,
      page: req.query.page,
      limit: req.query.limit,
    },
  });
  res.json({ success: true, ...data });
});

// Admin y dueño ven todas las reservas (ruta /bookings)
export const listBookingsAll = asyncHandler(async (req, res) => {
  const data = await svc.listBookings({
    user: req.user,
    filters: {
      status: req.query.status,
      q: req.query.q,
      date: req.query.date,
      page: req.query.page,
      limit: req.query.limit,
    },
  });
  res.json({ success: true, ...data });
});

export const today = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.getToday() });
});

export const timers = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.getTimers() });
});

export const detail = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await svc.getBookingDetail(req.params.id, req.user),
  });
});

export const create = asyncHandler(async (req, res) => {
  const data = await svc.createBooking(req.body, req.user);
  res.status(201).json({ success: true, data });
});

export const reschedule = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await svc.rescheduleBooking(req.params.id, req.body, req.user),
  });
});

export const cancel = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await svc.cancelBooking(req.params.id, req.body, req.user),
  });
});

export const confirm = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await svc.confirmBooking(req.params.id, req.user),
  });
});

export const payment = asyncHandler(async (req, res) => {
  res
    .status(201)
    .json({
      success: true,
      data: await svc.registerPayment(req.params.id, req.body, req.user),
    });
});

export const startTimer = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await svc.startTimer(req.params.id, req.body, req.user),
  });
});

export const finish = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await svc.finishTimer(req.params.id, req.user),
  });
});

export const checkIn = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.checkIn(req.params.id, req.user) });
});

export const createBlock = asyncHandler(async (req, res) => {
  res
    .status(201)
    .json({ success: true, data: await svc.createBlock(req.body, req.user) });
});

export const removeBlock = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await svc.removeBlock(req.params.slotId, req.user),
  });
});
