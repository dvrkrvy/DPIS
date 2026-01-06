# DPIS Backend

Backend API for the Digital Psychological Intervention System.

## Quick Start

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create a `.env` file:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/dpis_db
   # OR use individual variables:
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=dpis_db
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:3000
   MONGODB_URI=mongodb://localhost:27017/dpis_forum
   OPENAI_API_KEY=your-key-here
   ```

3. **Initialize database**
   ```bash
   npm run init-db
   ```

4. **Start server**
   ```bash
   npm run dev  # Development with nodemon
   # OR
   npm start    # Production mode
   ```

## Database Initialization

The database must be initialized before the API can work properly. Run:

```bash
npm run init-db
```

This will:
- Create all required tables (users, admins, screening_results, etc.)
- Create indexes for performance
- Insert default admin account (email: `admin@dpis.edu`, password: `admin123`)

**⚠️ IMPORTANT**: Change the default admin password in production!

## API Endpoints

See main [README.md](../README.md) for full API documentation.

### Authentication
- `POST /api/auth/register` - Create anonymous account
- `POST /api/auth/login` - Login with anonymous ID
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/verify` - Verify JWT token

### Health Check
- `GET /health` - Server health status

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes* | PostgreSQL connection string (preferred) |
| `POSTGRES_HOST` | Yes* | PostgreSQL host (if not using DATABASE_URL) |
| `POSTGRES_PORT` | No | PostgreSQL port (default: 5432) |
| `POSTGRES_DB` | Yes* | Database name |
| `POSTGRES_USER` | Yes* | Database user |
| `POSTGRES_PASSWORD` | Yes* | Database password |
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `JWT_EXPIRES_IN` | No | Token expiration (default: 7d) |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `MONGODB_URI` | No | MongoDB connection (for forum features) |
| `OPENAI_API_KEY` | No | OpenAI API key (for AI chat) |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | Environment (development/production) |

*Either `DATABASE_URL` or individual PostgreSQL variables are required.

## Troubleshooting

### Database Connection Errors

**Error: "relation does not exist"**
- Run `npm run init-db` to create tables

**Error: "connection refused"**
- Verify database is running
- Check connection credentials in `.env`
- For Render: Ensure database is not paused (free tier pauses after inactivity)

### JWT Errors

**Error: "JWT_SECRET is not set"**
- Set `JWT_SECRET` in environment variables
- Generate a secure secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### CORS Errors

**Error: "Access-Control-Allow-Origin"**
- Verify `FRONTEND_URL` matches your frontend domain exactly
- For GitHub Pages: Use `https://dvrkrvy.github.io` (no trailing slash)

## Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed deployment instructions.

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize database tables
