# Digital Psychological Intervention System (DPIS)

A comprehensive web-based mental health support platform designed for higher-education students, providing anonymous, early, and accessible mental health support using a hybrid model of AI + peer support + professional counseling.

## 🎯 Features

- **Anonymous User Accounts** - Complete privacy with UUID-based identities
- **Mental Health Screening Tests** - PHQ-9 (Depression), GAD-7 (Anxiety), GHQ-12 (General Health)
- **AI-Guided Support** - OpenAI/Gemini powered chatbot for psychological first aid
- **Personalized Dashboard** - Visual progress tracking and recommendations
- **Resource Hub** - Categorized mental health resources (videos, articles, guides)
- **Peer Support Forum** - Real-time anonymous discussion forum
- **Therapy Booking System** - Schedule counseling sessions (video/offline)
- **Progress Tracking** - Mood tracking and activity monitoring
- **Emergency Support** - Crisis detection and immediate resource access
- **Admin Analytics Dashboard** - Aggregated, anonymized insights for institutions

## 🛠️ Tech Stack

### Frontend
- React.js 18
- React Router DOM
- TailwindCSS
- Recharts (data visualization)
- Socket.io Client (real-time communication)
- Axios (HTTP client)

### Backend
- Node.js
- Express.js
- PostgreSQL (user data, screenings, bookings)
- MongoDB (forum posts, messages)
- Socket.io (WebSocket server)
- JWT (authentication)
- OpenAI API / Gemini API (AI chatbot)

### Deployment
- Docker & Docker Compose
- PostgreSQL 15
- MongoDB 7

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+ (or use Docker)
- MongoDB 7+ (or use Docker)
- Docker and Docker Compose (optional, for containerized deployment)
- OpenAI API Key (optional, for AI chatbot)

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Quasar 2.0"
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and add your configuration:
   ```env
   JWT_SECRET=your-super-secret-jwt-key
   OPENAI_API_KEY=your-openai-api-key
   ```

3. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - PostgreSQL: localhost:5432
   - MongoDB: localhost:27017

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   # Root directory
   npm install
   
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Set up databases**

   **PostgreSQL:**
   ```bash
   # Create database
   createdb dpis_db
   
   # Run initialization script
   psql -d dpis_db -f backend/config/init.sql
   ```

   **MongoDB:**
   ```bash
   # Start MongoDB (if not running as a service)
   mongod
   ```

3. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` with your database credentials and API keys.

4. **Start backend server**
   ```bash
   cd backend
   npm run dev
   ```
   Server runs on http://localhost:5000

5. **Start frontend (in a new terminal)**
   ```bash
   cd frontend
   npm start
   ```
   Frontend runs on http://localhost:3000

## 🌐 GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages.

### Repository & Live Site
- **GitHub Repository**: https://github.com/dvrkrvy/DPIS
- **GitHub Pages URL**: https://dvrkrvy.github.io/DPIS

### Automatic Deployment

The project includes a GitHub Actions workflow that automatically deploys to GitHub Pages whenever you push to the `main` branch.

**To enable:**
1. Go to repository Settings → Pages
2. Under "Source", select **GitHub Actions**
3. Save

**To deploy:**
```bash
git add .
git commit -m "Your changes"
git push origin main
```
The workflow will automatically build and deploy your site.

### Manual Deployment

You can also deploy manually using the provided scripts:

**Windows:**
```bash
deploy-to-github-pages.bat
```

**PowerShell:**
```powershell
.\deploy-to-github-pages.ps1
```

For detailed deployment instructions, see [GITHUB_PAGES_SETUP.md](./GITHUB_PAGES_SETUP.md)

## 📁 Project Structure

```
.
├── backend/
│   ├── config/           # Database configurations
│   ├── middleware/       # Auth middleware
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── server.js        # Express server
│   └── package.json
├── frontend/
│   ├── public/          # Static files
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── contexts/    # React contexts
│   │   ├── pages/       # Page components
│   │   ├── App.js       # Main app component
│   │   └── index.js     # Entry point
│   └── package.json
├── docker-compose.yml   # Docker services configuration
└── README.md
```

## 🔐 Authentication

### Student (Anonymous)
- Students register with an anonymous account (UUID-based)
- Anonymous ID is generated automatically
- No personal information required

### Admin
- Default admin credentials:
  - Email: `admin@dpis.edu`
  - Password: `admin123`
  - **⚠️ CHANGE THIS IN PRODUCTION!**

To change admin password, update the hash in `backend/config/init.sql`:
```sql
-- Generate hash using: node -e "console.log(require('bcryptjs').hashSync('newpassword', 10))"
UPDATE admins SET password_hash = 'new_hash_here' WHERE email = 'admin@dpis.edu';
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Create anonymous account
- `POST /api/auth/login` - Login with anonymous ID
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/verify` - Verify token

### Screening
- `GET /api/screening/tests` - Get available tests
- `GET /api/screening/tests/:testType` - Get test questions
- `POST /api/screening/submit` - Submit screening results
- `GET /api/screening/history` - Get user's screening history
- `GET /api/screening/latest` - Get latest screening results

### AI Chat
- `POST /api/ai/chat` - Send message to AI chatbot

### Resources
- `GET /api/resources` - Get resources (with filters)
- `GET /api/resources/:id` - Get resource by ID
- `GET /api/resources/meta/categories` - Get categories
- `GET /api/resources/meta/content-types` - Get content types

### Booking
- `GET /api/booking/slots` - Get available time slots
- `POST /api/booking` - Create booking
- `GET /api/booking/my-bookings` - Get user's bookings
- `PATCH /api/booking/:id/cancel` - Cancel booking

### Forum
- `GET /api/forum/posts` - Get forum posts
- `GET /api/forum/posts/:id` - Get single post
- `POST /api/forum/posts` - Create post
- `POST /api/forum/posts/:id/replies` - Add reply
- `POST /api/forum/posts/:id/reactions` - Add reaction
- `GET /api/forum/categories` - Get categories

### Progress
- `POST /api/progress/mood` - Record mood score
- `GET /api/progress` - Get progress data
- `GET /api/progress/mood-trends` - Get mood trends

### Admin
- `GET /api/admin/dashboard` - Get dashboard overview
- `GET /api/admin/emergency-flags` - Get emergency flags
- `PATCH /api/admin/emergency-flags/:id/resolve` - Resolve flag
- `GET /api/admin/analytics/screening-scores` - Get score distributions
- `GET /api/admin/analytics/peak-times` - Get peak distress times
- `GET /api/admin/export/report` - Export report data

### Emergency
- `GET /api/emergency/contacts` - Get emergency contacts
- `POST /api/emergency/report` - Report emergency

## 🔒 Security Features

- JWT-based authentication
- Anonymous user identities (UUID)
- Role-based access control (Student/Admin)
- Rate limiting on API endpoints
- Helmet.js security headers
- Input validation
- SQL injection prevention (parameterized queries)
- CORS configuration
- Emergency keyword detection
- Data encryption at rest (database level)

## 🧪 Testing Screening Tests

The platform includes validated questionnaires:

1. **PHQ-9** (Patient Health Questionnaire-9)
   - 9 questions about depression symptoms
   - Score range: 0-27
   - Severity: Minimal (0-4), Mild (5-9), Moderate (10-14), Moderately Severe (15-19), Severe (20-27)

2. **GAD-7** (Generalized Anxiety Disorder-7)
   - 7 questions about anxiety symptoms
   - Score range: 0-21
   - Severity: Minimal (0-4), Mild (5-9), Moderate (10-14), Severe (15-21)

3. **GHQ-12** (General Health Questionnaire-12)
   - 12 questions about general wellbeing
   - Score range: 0-12
   - Severity: Minimal (0-2), Mild (3-6), Moderate (7-9), Severe (10-12)

## 🚨 Emergency Protocols

The system automatically detects high-risk situations:

- **Screening Tests**: High scores trigger emergency flags
- **AI Chat**: Risk keywords trigger immediate emergency response
- **Forum Posts**: Risk keywords trigger moderation and flagging
- **Self-Reports**: Users can manually report emergencies

Emergency flags are visible to admins (without revealing user identity) for institutional monitoring.

## 📱 Usage Guide

### For Students

1. **Onboarding**: Create an anonymous account
2. **Screening**: Complete mandatory mental health screening tests
3. **Dashboard**: View personalized recommendations and progress
4. **Resources**: Browse mental health resources
5. **Forum**: Participate in peer support discussions
6. **Booking**: Schedule counseling sessions
7. **Progress**: Track mood and activities over time
8. **AI Chat**: Get immediate emotional support

### For Administrators

1. **Login**: Use admin credentials at `/admin/login`
2. **Dashboard**: View aggregated analytics and trends
3. **Emergency Flags**: Monitor and resolve high-risk situations
4. **Analytics**: Export reports for institutional planning

## 🐛 Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL and MongoDB are running
- Check connection strings in `.env`
- Verify database credentials
- Check firewall/port settings

### API Errors

- Verify JWT_SECRET is set in `.env`
- Check token expiration settings
- Ensure CORS is configured correctly
- Review server logs for detailed errors

### Frontend Build Issues

- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)
- Verify environment variables are set
- Check browser console for errors

## 📝 Environment Variables

See `backend/.env.example` for all required environment variables:

- Database configuration (PostgreSQL, MongoDB)
- JWT secret and expiration
- OpenAI API key
- Emergency contact information
- Rate limiting configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- PHQ-9, GAD-7, and GHQ-12 are validated mental health screening tools
- Built for educational and institutional use
- Prioritizes user privacy and data security

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Contact: support@institution.edu

---

**⚠️ Important Notes:**

- This is a production-ready MVP but should be thoroughly tested before deployment
- Change default admin credentials in production
- Set strong JWT_SECRET in production
- Configure proper database backups
- Enable HTTPS in production
- Review and adjust rate limiting based on usage
- Ensure compliance with local data protection regulations (GDPR, etc.)
