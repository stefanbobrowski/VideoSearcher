# 🎬 Video Searcher

```
 _______________
|,----------.  |\
||           |=| |
||          || | |
||       . _o| | |
|`-----_.-----._ |
|____/'.-'''''-.'.
    //`.:#:'    `\\\
   ;; '           ;;'.__.===============,
   ||             ||  __                 )
   ;;             ;;.'  '==============='
    \\           ///
     ':.._____..:'~
       `'-----'`
```

**AI-powered video analysis with precise timestamp detection**

Upload a video, ask what you're looking for, get timestamps back. Uses Google's Gemini 2.5 Flash to analyze video content and return exact moments matching your query.

**[Live Demo](https://video-searcher-frontend-637174041158.us-central1.run.app/)**

---

## Features

- **Gemini 2.5 Flash AI** - Analyze videos up to 10 minutes (200MB)
- **Google OAuth 2.0** - Secure login via Google
- **Rate Limiting & Quotas** - 50 analyses per user per day, IP-based limits
- **Automatic Cleanup** - Videos deleted immediately after analysis
- **Real-time Progress** - Upload and analysis tracking in UI

---

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Sass  
**Backend:** Node.js, Express, TypeScript, Passport.js  
**Cloud:** Google Cloud Platform (Vertex AI, Cloud Storage, Cloud Run)

---

## Security

- **OAuth 2.0** authentication via Google
- **JWT tokens** with 7-day expiration
- **Rate limiting**: 50 requests/hour per IP
- **Quotas**: 50 analyses/day per user
- **Auto-cleanup**: Videos deleted immediately after analysis
- **Input validation**: File type, size (200MB), duration (10min), prompt limits

---

### System Design

```
┌─────────────┐      HTTPS      ┌──────────────┐      GCS       ┌──────────────┐
│   React     │ ──────────────► │  Express.js  │ ─────────────► │ Cloud        │
│   Frontend  │  JWT Auth       │   Backend    │  Upload Video  │ Storage      │
└─────────────┘                 └──────────────┘                └──────────────┘
                                       │                              │
                                       │ Analyze Video                │
                                       ▼                              │
                                ┌──────────────┐                      │
                                │  Vertex AI   │ ◄───────────────────-┘
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

## Environment Setup

**Backend:**

```env
PORT=8080
FRONTEND_URL=https://your-frontend.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-secret
GOOGLE_APPLICATION_CREDENTIALS=./keys/service-account.json
```

**Frontend:**

```env
VITE_API_URL=https://your-backend.com
```

---

## 📄 License

© 2026 Video Searcher. Built by Stefan Bobrowski. All rights reserved.

---

## Author

**Stefan Bobrowski**

[GitHub](https://github.com/stefanbobrowski)  
[Portfolio](https://stefanbobrowski.com)  
[Email](mailto:stefanbobrowski1@gmail.com)
