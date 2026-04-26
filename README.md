# CivicTrust AI: Smart Citizen Grievance Classification System

CivicTrust AI is a modern, AI-powered platform designed to streamline the process of reporting, classifying, and managing citizen grievances. Built with the MERN stack and integrated with Google's Gemini AI, it provides automated classification, sentiment analysis, and a geospatial command center for efficient administrative oversight.

## 🚀 Features

- **AI-Powered Classification**: Automatically categorizes grievances (e.g., Infrastructure, Sanitation, Safety) using Google Gemini AI.
- **Multilingual Support**: Citizens can report issues in multiple languages, with AI handling the translation and analysis.
- **Geospatial Command Center**: Interactive map (Leaflet) for administrators to visualize grievance hotspots and distribution.
- **Real-time Analytics**: Comprehensive dashboard with Recharts for tracking resolution progress and department performance.
- **AI Assistant**: Interactive chatbot to help citizens navigate the platform and track their complaints.
- **Responsive Design**: Premium UI built with React and Framer Motion for a fluid user experience.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Framer Motion, Lucide React, Recharts, Leaflet.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose).
- **AI Integration**: Google Generative AI (Gemini 1.5 Flash).
- **Authentication**: JWT (JSON Web Tokens) & Bcrypt.js.

## 📋 Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)
- Google Gemini AI API Key

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Shaurya-agrawal782/AI-Based-Citizen-Grievance-Classification-System.git
   cd AI-Based-Citizen-Grievance-Classification-System
   ```

2. **Server Setup**:
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Client Setup**:
   ```bash
   cd ../client
   npm install
   ```
   Create a `.env` file in the `client` directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

## 🏃 Running the Application

1. **Start the Backend**:
   ```bash
   cd server
   npm run dev
   ```

2. **Start the Frontend**:
   ```bash
   cd client
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

## 📂 Project Structure

```
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API integration
│   │   └── context/     # Auth & Global state
├── server/              # Express backend
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & error handling
│   └── utils/           # AI helpers & logic
└── .gitignore           # Root git ignore
```

## 🛡️ License

This project is licensed under the MIT License.
