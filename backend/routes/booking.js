const express = require('express');
const pool = require('../config/database');
const { authenticate, requireStudent, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Get available time slots (simple implementation - can be enhanced)
router.get('/slots', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    
    // Generate available slots for a date (9 AM to 5 PM, hourly)
    const slots = [];
    const requestedDate = date ? new Date(date) : new Date();
    requestedDate.setHours(9, 0, 0, 0);

    for (let hour = 9; hour < 17; hour++) {
      const slotDate = new Date(requestedDate);
      slotDate.setHours(hour, 0, 0, 0);
      
      // Check if slot is already booked
      const booked = await pool.query(
        `SELECT COUNT(*) FROM bookings 
         WHERE booking_date = $1 AND status IN ('pending', 'confirmed')`,
        [slotDate]
      );

      if (parseInt(booked.rows[0].count) === 0 && slotDate > new Date()) {
        slots.push(slotDate.toISOString());
      }
    }

    res.json({ slots });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ message: 'Failed to fetch available slots' });
  }
});

// Create booking
router.post('/', authenticate, requireStudent, [
  body('bookingDate').isISO8601(),
  body('mode').isIn(['video', 'offline'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bookingDate, mode } = req.body;
    const userId = req.user.id;

    const bookingDateTime = new Date(bookingDate);
    if (bookingDateTime <= new Date()) {
      return res.status(400).json({ message: 'Booking date must be in the future' });
    }

    // Check if slot is available
    const existing = await pool.query(
      `SELECT id FROM bookings 
       WHERE booking_date = $1 AND status IN ('pending', 'confirmed')`,
      [bookingDateTime]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Time slot is already booked' });
    }

    // Generate meeting link for video mode
    const meetingLink = mode === 'video' 
      ? `https://zoom.us/j/${Math.random().toString(36).substring(7)}` 
      : null;

    const result = await pool.query(
      `INSERT INTO bookings (user_id, booking_date, mode, status, meeting_link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, booking_date, mode, status, meeting_link, created_at`,
      [userId, bookingDateTime, mode, 'pending', meetingLink]
    );

    // Track booking activity
    await pool.query(
      `INSERT INTO progress_tracking (user_id, activity_type, notes)
       VALUES ($1, $2, $3)`,
      [userId, 'booking_created', `Booked ${mode} session for ${bookingDateTime.toISOString()}`]
    );

    res.status(201).json({
      message: 'Booking created successfully',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Failed to create booking' });
  }
});

// Get user's bookings
router.get('/my-bookings', authenticate, requireStudent, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, booking_date, mode, status, meeting_link, created_at
       FROM bookings
       WHERE user_id = $1
       ORDER BY booking_date DESC`,
      [userId]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Cancel booking
router.patch('/:id/cancel', authenticate, requireStudent, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'confirmed')
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found or cannot be cancelled' });
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

// Admin: Get all bookings
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, booking_date, mode, status, created_at
       FROM bookings
       ORDER BY booking_date DESC`
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

module.exports = router;
