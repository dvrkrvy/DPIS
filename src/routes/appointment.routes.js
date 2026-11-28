const express = require('express');
const {
    getSlotAvailability,
    bookAppointment,
    doctorBookAppointment,
    rescheduleAppointment,
    getMyAppointments,
    getDoctorAppointments,
    updateAppointmentStatus,
    startAppointmentMeeting,
    endAppointmentMeeting,
} = require('../controllers/appointment.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Common and Student routes
router.get('/availability', getSlotAvailability);
router.get('/my', getMyAppointments);
router.post('/book', bookAppointment);
router.patch('/:id/reschedule', rescheduleAppointment);

// Doctor specific routes
router.get('/doctor', requireRole('DOCTOR'), getDoctorAppointments);
router.post('/doctor-book', requireRole('DOCTOR'), doctorBookAppointment);
router.patch('/:id/status', requireRole('DOCTOR'), updateAppointmentStatus);
router.post('/:id/meet/start', requireRole('DOCTOR'), startAppointmentMeeting);
router.post('/:id/meet/end', requireRole('DOCTOR'), endAppointmentMeeting);

module.exports = router;
