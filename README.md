# SonicFix - AI Audio Enhancement MVP

SonicFix is an AI-powered audio enhancement application that uses the SonicMaster model to improve audio quality. The application provides various enhancement options including noise removal, quality fixing, studio mastering, vocal enhancement, bass boost, and clarity boost.

## 🚀 Features

- **AI-Powered Enhancement**: Uses SonicMaster model for professional audio processing
- **Multiple Enhancement Types**: 
  - Fix Quality: Repair audio issues and improve clarity
  - Remove Noise: Eliminate background noise and artifacts
  - Studio Master: Apply professional mastering techniques
  - Vocal Enhance: Enhance vocal clarity and presence
  - Bass Boost: Enhance low frequencies and bass response
  - Clarity Boost: Improve overall clarity and definition
- **Cross-Platform**: Works on web, iOS, and Android
- **Real-time Progress**: Live processing status and progress tracking
- **Waveform Visualization**: Visual representation of audio before and after enhancement
- **File Management**: Upload, process, and download enhanced audio files

## 🏗️ Architecture

### Backend (FastAPI + Python)
- **FastAPI**: Modern, fast web framework for building APIs
- **SonicMaster Integration**: AI model for audio enhancement
- **SQLite Database**: Lightweight database for job and file tracking
- **File Storage**: Local file system for audio file management
- **Docker Support**: Containerized deployment

### Frontend (React Native + Expo)
- **React Native**: Cross-platform mobile and web development
- **Expo**: Development platform and tools
- **GlueStack UI**: Modern, accessible UI component library
- **Redux Toolkit**: State management
- **TypeScript**: Type-safe development

## 📋 Prerequisites

### Backend Requirements
- Python 3.9+
- pip (Python package manager)
- FFmpeg (for audio processing)
- Docker (optional, for containerized deployment)

### Frontend Requirements
- Node.js 18+
- npm or yarn
- Expo CLI

## 🛠️ Installation & Setup

### Quick Start (Recommended)

**For Windows users, use the automated startup scripts:**

1. **PowerShell Script** (Recommended):
   ```powershell
   .\start-dev.ps1
   ```

2. **Batch Script** (Alternative):
   ```cmd
   start-dev.bat
   ```

These scripts will automatically:
- Create and activate Python virtual environment
- Install all backend dependencies
- Start the backend server on `http://localhost:8000`
- Start the frontend server on `http://localhost:3000`

### Manual Setup

#### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Install FFmpeg**:
   - **Windows**: Download from [FFmpeg website](https://ffmpeg.org/download.html)
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt-get install ffmpeg`

5. **Run the backend**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`
   API documentation: `http://localhost:8000/docs`

#### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**:
   ```bash
   # For web
   npx expo start --web --port 3000
   
   # For mobile (requires Expo Go app)
   npm start
   ```

   The web app will be available at `http://localhost:3000`

### Docker Setup (Alternative)

1. **Build and run backend with Docker**:
   ```bash
   cd backend
   docker build -t sonicfix-backend .
   docker run -p 8000:8000 sonicfix-backend
   ```

## 🎯 Usage

### Web Application
1. Open `http://localhost:8081` in your browser
2. Click "Choose Audio File" to upload an audio file
3. Select an enhancement type
4. Click "Start Enhancement" to begin processing
5. Monitor progress on the processing screen
6. Download or share your enhanced audio

### Mobile Application
1. Install Expo Go on your device
2. Scan the QR code from the terminal
3. Follow the same workflow as the web application

## 📁 Project Structure

```
SonicFix/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── models.py            # Data models
│   │   ├── db.py               # Database operations
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── sonicmaster.py   # AI model service
│   │       └── storage.py       # File storage service
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── components/          # Reusable UI components
│   │   ├── screens/            # Application screens
│   │   ├── store/              # Redux store and slices
│   │   ├── utils/              # Utility functions
│   │   └── theme/              # UI theme configuration
│   ├── App.tsx                 # Main application component
│   ├── package.json
│   ├── tsconfig.json
│   ├── babel.config.js
│   └── metro.config.js
└── README.md
```

## 🔧 API Endpoints

### Audio Processing
- `POST /upload` - Upload audio file
- `POST /process` - Start audio enhancement
- `GET /job-status/{job_id}` - Check processing status
- `GET /download/{file_id}` - Download enhanced audio
- `GET /health` - Health check

### Request/Response Examples

**Upload Audio**:
```bash
curl -X POST "http://localhost:8000/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@audio.wav"
```

**Start Processing**:
```bash
curl -X POST "http://localhost:8000/process" \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "file_123",
    "enhancement_type": "remove_noise"
  }'
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Backend Deployment
1. **Using Docker**:
   ```bash
   docker build -t sonicfix-backend .
   docker run -p 8000:8000 sonicfix-backend
   ```

2. **Using cloud platforms** (AWS, GCP, Azure):
   - Deploy the Docker container to your preferred cloud service
   - Ensure FFmpeg is available in the deployment environment
   - Configure environment variables for production

### Frontend Deployment
1. **Web deployment**:
   ```bash
   npm run build:web
   # Deploy the build folder to your web hosting service
   ```

2. **Mobile app deployment**:
   ```bash
   # Build for production
   expo build:android
   expo build:ios
   ```

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`):
```env
DATABASE_URL=sqlite:///./sonicfix.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800  # 50MB
ALLOWED_EXTENSIONS=wav,mp3,flac,m4a,aac
```

**Frontend**:
- API URL is automatically configured based on platform
- Modify `app/utils/api.ts` for custom backend URLs

## 🐛 Troubleshooting

### Common Issues

1. **FFmpeg not found**:
   - Ensure FFmpeg is installed and in your system PATH
   - On Windows, add FFmpeg to environment variables

2. **CORS errors**:
   - Backend includes CORS middleware for development
   - For production, configure allowed origins in `main.py`

3. **File upload fails**:
   - Check file size limits (default: 50MB)
   - Verify supported file formats
   - Ensure sufficient disk space

4. **Mobile app not loading**:
   - Ensure both devices are on the same network
   - Check if backend is accessible from mobile device
   - Verify Expo Go app is up to date

### Performance Optimization

1. **Backend**:
   - Use GPU acceleration for AI model inference
   - Implement caching for processed files
   - Add rate limiting for API endpoints

2. **Frontend**:
   - Implement lazy loading for components
   - Optimize image and audio assets
   - Use React.memo for expensive components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [SonicMaster](https://huggingface.co/amaai-lab/SonicMaster) - AI audio enhancement model
- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [React Native](https://reactnative.dev/) - Cross-platform development
- [GlueStack UI](https://ui.gluestack.io/) - UI component library
- [Expo](https://expo.dev/) - Development platform

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the API documentation at `http://localhost:8000/docs`

---

**SonicFix** - Enhance your audio with AI 🎵✨