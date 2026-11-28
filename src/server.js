require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const doctorRoutes = require('./routes/doctor.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const googleRoutes = require('./routes/google.routes');
const messageRoutes = require('./routes/message.routes');
const profileRoutes = require('./routes/profile.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);

connectDB();

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'DPIS Backend is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});