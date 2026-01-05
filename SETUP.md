# Quick Setup Guide

## Initial Setup Steps

1. **Generate Admin Password Hash**

   Before running the database initialization, you need to generate a proper bcrypt hash for the admin password.

   ```bash
   cd backend
   npm install  # Install dependencies first
   node scripts/generate-admin-hash.js admin123
   ```

   This will output a hash. Copy this hash and update `backend/config/init.sql` line 96 with the generated hash.

   Alternatively, you can use this pre-generated hash for 'admin123':
   ```
   $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
   ```

2. **Environment Variables**

   Copy and configure environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env` and update:
   - Database credentials
   - JWT_SECRET (use a strong random string)
   - OPENAI_API_KEY (optional, for AI chatbot)

3. **Database Setup**

   **Option A: Using Docker Compose (Recommended)**
   ```bash
   docker-compose up -d postgres mongodb
   # Wait for databases to be ready, then:
   docker-compose exec postgres psql -U postgres -d dpis_db -f /docker-entrypoint-initdb.d/init.sql
   ```

   **Option B: Local Installation**
   ```bash
   # PostgreSQL
   createdb dpis_db
   psql -d dpis_db -f backend/config/init.sql
   
   # MongoDB (should start automatically if installed as service)
   mongod
   ```

4. **Install Dependencies**

   ```bash
   # Root
   npm install
   
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

5. **Start Development Servers**

   **Option A: Using Docker Compose**
   ```bash
   docker-compose up
   ```

   **Option B: Local Development**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

6. **Access the Application**

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Admin Login: http://localhost:3000/admin/login
     - Email: `admin@dpis.edu`
     - Password: `admin123` (change in production!)

## Default Credentials

- **Admin Account:**
  - Email: `admin@dpis.edu`
  - Password: `admin123`
  - ⚠️ **Change this immediately in production!**

## Next Steps

1. Change admin password in production
2. Set strong JWT_SECRET
3. Configure OpenAI API key for AI chatbot
4. Add mental health resources to the database
5. Configure emergency contact information
6. Set up HTTPS for production deployment

## Troubleshooting

- **Database connection errors**: Ensure PostgreSQL and MongoDB are running
- **Port conflicts**: Change ports in `.env` and `docker-compose.yml`
- **Module not found**: Run `npm install` in both backend and frontend directories
- **Socket.io connection issues**: Check CORS settings and FRONTEND_URL environment variable
