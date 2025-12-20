# 🎬 Video Searcher

**AI-Powered Video Analysis & Timestamp Detection**

A production-grade web application that leverages Google's Gemini 2.0 AI to analyze videos and automatically detect specific moments with precise timestamps. Built for gamers, content creators, and video editors who need to quickly find and extract highlights from their footage.

---

## 🌟 Overview

Video Searcher transforms hours of video footage into actionable insights in seconds. Upload a gaming clip, specify what you're looking for (headshots, kills, scores, etc.), and receive precise timestamp ranges for every matching moment. The application uses cutting-edge AI video understanding to analyze content with human-like comprehension.

**Live Demo:** [Your Portfolio Link]  
**Built by:** [Stefan Bobrowski](https://stefanbobrowski.com)

---

## 🚀 Key Features

### 🤖 AI-Powered Video Analysis
- **Gemini 2.0 Flash** integration for state-of-the-art video understanding
- Natural language prompts for flexible queries
- Temporal analysis with precise timestamp detection
- Support for videos up to 10 minutes and 200MB

### 🔐 Enterprise-Grade Security
- OAuth 2.0 authentication via Google
- JWT-based session management
- Rate limiting and quota enforcement
- Automatic video deletion post-analysis for privacy
- Helmet.js security headers and CORS protection

### 📊 Usage Management
- User-specific daily quotas (50 analyses/day)
- IP-based rate limiting (50 uploads/day, 50 analyses/day)
- Real-time quota tracking in UI
- Automatic midnight quota reset

### 🎨 Modern User Experience
- Responsive React + TypeScript frontend
- Real-time upload progress tracking
- Interactive video preview with timeline overlay
- Purple-blue gradient design system
- Mobile-optimized interface

---

## 🏗️ Architecture

### Technology Stack

#### Frontend
- **React 18** with TypeScript for type-safe component development
- **Vite** for lightning-fast builds and HMR
- **Sass/SCSS** for modular, maintainable styling
- **Axios** for HTTP client with interceptors

#### Backend
- **Node.js** with Express.js framework
- **TypeScript** for end-to-end type safety
- **Passport.js** for OAuth 2.0 authentication
- **Multer** for multipart file upload handling
- **express-rate-limit** for DDoS protection

#### Cloud Infrastructure (Google Cloud Platform)
- **Vertex AI** - Gemini 2.0 Flash for video analysis
- **Cloud Storage** - Secure video upload and temporary storage
- **Cloud Run** - Containerized, auto-scaling deployment
- **Cloud Build** - CI/CD pipeline automation
- **OAuth 2.0** - Google Identity Platform integration

### System Design

```
┌─────────────┐      HTTPS      ┌──────────────┐      GCS       ┌──────────────┐
│   React     │ ───────────────► │  Express.js  │ ─────────────► │ Cloud        │
│   Frontend  │  JWT Auth       │   Backend    │  Upload Video  │ Storage      │
└─────────────┘                 └──────────────┘                └──────────────┘
                                       │                              │
                                       │ Analyze Video                │
                                       ▼                              │
                                ┌──────────────┐                     │
                                │  Vertex AI   │ ◄───────────────────┘
                                │  Gemini 2.0  │   Read Video
                                └──────────────┘
                                       │
                                       ▼
                                  Timestamps
```

### Data Flow

1. **Authentication**: User logs in via Google OAuth 2.0
2. **Upload**: Video uploaded to GCS via signed multipart form
3. **Analysis**: Vertex AI Gemini processes video with user prompt
4. **Processing**: AI returns natural language analysis with timestamps
5. **Extraction**: Backend parses MM:SS ranges from AI response
6. **Cleanup**: Video automatically deleted from GCS
7. **Response**: Timestamps and analysis sent to frontend
8. **Quota**: User's daily quota incremented

---

## 🔒 Security Features

### Authentication & Authorization
- Google OAuth 2.0 with PKCE flow
- JWT tokens with 7-day expiration
- Secure HTTP-only session cookies
- Automatic logout on 401/403 responses

### Rate Limiting
- **General API**: 50 requests/hour per IP
- **Upload**: 50 uploads/day per IP
- **Analysis**: 50 analyses/day per IP
- **Auth**: 10 attempts/hour per IP
- **OAuth**: 20 initiations/15min per IP

### Data Protection
- Videos deleted immediately after analysis
- No permanent storage of user video content
- Uniform bucket-level access (no public ACLs)
- CORS restricted to configured frontend domain
- Helmet.js for XSS and clickjacking protection

### Input Validation
- File type validation (video/* only)
- File size limits (200MB max)
- Video duration limits (10 minutes max)
- Prompt sanitization and length limits
- Request timeout protection (3 minutes)

---

## 💡 Use Cases

### Gaming & Esports
- Extract all headshots from Counter-Strike gameplay
- Find clutch moments in Valorant matches
- Identify scoring plays in sports games
- Compile highlight reels automatically

### Content Creation
- Locate specific scenes for editing
- Find B-roll footage by description
- Identify talking points in interviews
- Extract reaction moments

### Video Editing
- Quick navigation to specific timestamps
- Scene detection and segmentation
- Action sequence identification
- Quality control and review

---

## 📱 User Interface

### Upload Form
- Drag-and-drop or file selection
- Natural language prompt input
- Configurable clip padding (0-30 seconds)
- Max results limiter
- Example prompts for guidance
- Real-time upload progress

### Analysis Display
- Video preview with seekable timeline
- Clickable timestamp overlays
- AI-generated analysis text
- Remaining quota indicator
- Error messaging with retry logic

### Authentication
- Google OAuth integration
- Session persistence
- Automatic logout on expiration
- User email display

---

## 🔧 Configuration

### Environment Variables

**Backend:**
```env
PORT=8080
FRONTEND_URL=https://your-frontend.com
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-secret
JWT_SECRET=your-jwt-secret
GOOGLE_APPLICATION_CREDENTIALS=./keys/service-account.json
```

**Frontend:**
```env
VITE_API_URL=https://your-backend.com
```

### Deployment

The application is designed for Google Cloud Platform deployment:

- **Frontend**: Cloud Run or Firebase Hosting
- **Backend**: Cloud Run with auto-scaling
- **Storage**: Cloud Storage Standard tier
- **AI**: Vertex AI in same region (us-central1)

---

## 📊 Performance & Scalability

### Optimizations
- Vertex AI Gemini 2.0 Flash (fastest model)
- Resumable uploads disabled for speed (<200MB files)
- Parallel request processing
- Stateless backend for horizontal scaling
- In-memory user session storage (suitable for Cloud Run)

### Monitoring
- Cloud Run automatic scaling
- Request logging and error tracking
- Quota usage monitoring
- Rate limit tracking

### Limitations
- 10-minute video maximum (Gemini constraint)
- 200MB file size limit (upload optimization)
- 50 analyses/day per user (quota protection)
- 3-minute analysis timeout (Gemini processing time)

---

## 🎯 Future Enhancements

- Database integration (Firestore/PostgreSQL) for user persistence
- Batch video processing
- Custom clip export and download
- Video format transcoding
- Advanced timestamp editing

---

## 📄 License

© 2025 Video Searcher. Built by Stefan Bobrowski. All rights reserved.

---

## 🤝 About the Developer

This application was architected and developed by **Stefan Bobrowski** as a portfolio demonstration of full-stack cloud development, AI integration, and production-grade application design. It showcases proficiency in:

- Modern web development (React, TypeScript, Node.js)
- Cloud-native architecture (Google Cloud Platform)
- AI/ML integration (Vertex AI, Gemini)
- Security best practices (OAuth, JWT, rate limiting)
- DevOps and CI/CD (Cloud Build, Docker)
- UI/UX design and implementation

**Portfolio:** [stefanbobrowski.com](https://stefanbobrowski.com)  
**Contact:** [stefanbobrowski1@gmail.com]

---

**Note:** This is a demonstration application. For production use at scale, additional infrastructure including database persistence, load balancing, and enhanced monitoring is recommended.