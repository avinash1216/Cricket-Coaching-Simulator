# 🏏 Cricket Coaching Simulator

A real-time fan engagement platform where fans make tactical decisions (bowling changes, field placements) during simulated IPL matches, get scored by Gemini AI, and compete on a leaderboard.

## 🏗️ Architecture

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS → Cloud Run
- **Backend**: FastAPI (Python) + WebSocket → Cloud Run
- **Database**: Firestore
- **AI Scoring**: Gemini 1.5 Flash
- **Auth**: Firebase Authentication (Google OAuth)

## 📁 Project Structure

```
├── backend/                 # FastAPI backend
│   ├── main.py             # Entry point
│   ├── config.py           # Environment config
│   ├── Dockerfile          # Backend container
│   ├── requirements.txt    # Python dependencies
│   ├── data/               # Mock match data
│   ├── models/             # Pydantic schemas
│   ├── routers/            # API routes (match, decisions, leaderboard, admin, ws)
│   └── services/           # Business logic (simulator, decision engine, scoring)
├── frontend/               # Next.js frontend
│   ├── Dockerfile          # Frontend container
│   ├── src/app/            # Pages (home, match, leaderboard, admin)
│   ├── src/components/     # UI components
│   └── src/lib/            # Utilities, hooks, Firebase config
└── plans/                  # Architecture documentation
```

---

## 🚀 Deployment to Google Cloud

### Prerequisites

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured
2. A GCP project (this guide uses `awesome-project-491217`)
3. Firebase project set up with Authentication (Google provider enabled)
4. Firestore database created in the GCP project
5. Gemini API enabled in the GCP project

### Step 0: Set Up Environment

```bash
# Set your project
export PROJECT_ID=awesome-project-491217
export REGION=us-central1

# Authenticate
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com
```

### Step 1: Deploy the Backend to Cloud Run

```bash
cd backend

# Build and deploy in one command
gcloud run deploy cricket-backend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID,GEMINI_MODEL=gemini-1.5-flash,ENVIRONMENT=production"

# Get the backend URL
export BACKEND_URL=$(gcloud run services describe cricket-backend --region $REGION --format 'value(status.url)')
echo "Backend URL: $BACKEND_URL"
```

### Step 2: Deploy the Frontend to Cloud Run

```bash
cd frontend

# Build and deploy with build args for environment variables
gcloud run deploy cricket-frontend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --build-arg "NEXT_PUBLIC_API_URL=$BACKEND_URL" \
  --build-arg "NEXT_PUBLIC_WS_URL=$(echo $BACKEND_URL | sed 's/https/wss/')" \
  --build-arg "NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY" \
  --build-arg "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$PROJECT_ID.firebaseapp.com" \
  --build-arg "NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID" \
  --build-arg "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$PROJECT_ID.appspot.com" \
  --build-arg "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID" \
  --build-arg "NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID"

# Get the frontend URL
export FRONTEND_URL=$(gcloud run services describe cricket-frontend --region $REGION --format 'value(status.url)')
echo "Frontend URL: $FRONTEND_URL"
```

> **⚠️ Important**: Replace `YOUR_FIREBASE_API_KEY`, `YOUR_SENDER_ID`, and `YOUR_APP_ID` with your actual Firebase project values. You can find these in the [Firebase Console](https://console.firebase.google.com/) → Project Settings → General → Your apps → Web app config.

### Step 3: Update Backend CORS (if needed)

If you get CORS errors, update the backend to allow the frontend URL:

```bash
gcloud run services update cricket-backend \
  --region $REGION \
  --set-env-vars "CORS_ORIGINS=$FRONTEND_URL,http://localhost:3000"
```

### Step 4: Configure Firebase Auth

1. Go to [Firebase Console](https://console.firebase.google.com/) → Authentication → Settings
2. Add your Cloud Run frontend URL to **Authorized domains**
3. Ensure Google sign-in provider is enabled

---

## 🏃 Frontend-Only Deployment (Quick)

If you only want to deploy the frontend:

```bash
export PROJECT_ID=awesome-project-491217
export REGION=us-central1

gcloud config set project $PROJECT_ID

# Deploy frontend
cd frontend
gcloud run deploy cricket-frontend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --build-arg "NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_URL" \
  --build-arg "NEXT_PUBLIC_WS_URL=wss://YOUR_BACKEND_URL" \
  --build-arg "NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY" \
  --build-arg "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$PROJECT_ID.firebaseapp.com" \
  --build-arg "NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID" \
  --build-arg "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$PROJECT_ID.appspot.com" \
  --build-arg "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID" \
  --build-arg "NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID"
```

---

## 🧪 Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt

# Create .env from example
cp .env.example .env
# Edit .env with your values

# Run
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

### Frontend

```bash
cd frontend
npm install

# Create .env.local from example
cp .env.example .env.local
# Edit .env.local with your values

# Run
npm run dev
```

---

## 🎮 How It Works

1. **Admin** starts a match simulation via `/admin`
2. **Fans** join the match at `/match/{matchId}`
3. The simulator replays pre-built match data ball-by-ball via WebSocket
4. At each over end, **decision windows** open (bowling change + field placement)
5. Fans have 15 seconds to make their tactical choice
6. **Gemini AI** scores each decision on tactical merit (0-50 points)
7. Points are calculated: Captain Match (0-30) + Gemini Merit (0-50) + Speed Bonus (0-10) + Streak Bonus (0-10)
8. Live **leaderboard** updates in real-time

## 📊 Scoring Formula

| Component | Points | Description |
|-----------|--------|-------------|
| Captain Match | 0-30 | Did you pick the same as the actual captain? |
| Gemini Merit | 0-50 | AI evaluation of tactical quality |
| Speed Bonus | 0-10 | Faster responses earn more |
| Streak Bonus | 0-10 | Consecutive good decisions |
| **Total** | **0-100** | **Per decision** |

---

## 📝 License

Built for hackathon demonstration purposes.
