# 🚀 Deployment Guide: CivicTrust AI on Render

Follow these steps to deploy your MERN stack application on Render.

## 📋 Prerequisites
- A **GitHub** repository with your code pushed.
- A **MongoDB Atlas** connection string.
- A **Google AI Studio** API Key (for Gemini).

---

## 🛠️ Step 1: Deploy the Backend (Web Service)

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `civictrust-api`
   - **Environment**: `Node`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Add Environment Variables** (under "Advanced"):
   - `MONGODB_URI`: *Your MongoDB connection string*
   - `JWT_SECRET`: *A random string (e.g., your-secret-key)*
   - `GEMINI_API_KEY`: *Your Google AI API Key*
   - `PORT`: `5000`
5. Click **Create Web Service**.
6. **Important**: Once deployed, copy the provided URL (e.g., `https://civictrust-api.onrender.com`).

---

## 🌐 Step 2: Deploy the Frontend (Static Site)

1. Click **New > Static Site** on Render.
2. Connect the same GitHub repository.
3. Configure the site:
   - **Name**: `civictrust-app`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. **Add Environment Variables**:
   - `VITE_API_BASE`: `https://your-backend-url.onrender.com/api` (Replace with your backend URL from Step 1).
5. Click **Create Static Site**.

---

## 📝 Environment Template Recap

### Server (`server/.env`)
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

### Client (`client/.env`)
```env
VITE_API_BASE=https://your-backend-url.onrender.com/api
```

---

## 💡 Troubleshooting
- **Database Connection**: Ensure your MongoDB Atlas IP Access List includes `0.0.0.0/0` (allow access from anywhere) so Render can connect.
- **CORS**: The backend is already configured to allow requests from any origin, so the frontend should connect without issues.
