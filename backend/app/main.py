from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import uuid
import shutil
from typing import Optional
import asyncio
from datetime import datetime
import logging

# Configure logging to show debug information
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

from .services.local_sonicmaster import LocalSonicMasterService
from .services.storage import StorageService
from .models import JobStatus, EnhancementType
from .db import get_db, init_db

app = FastAPI(title="SonicFix API", version="1.0.0")

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
sonic_service = LocalSonicMasterService()
# Use absolute path to backend storage directory
import os
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
storage_path = os.path.join(backend_dir, "storage")
storage_service = StorageService(base_path=storage_path)

# In-memory job tracking for MVP
jobs = {}

class ProcessRequest(BaseModel):
    file_id: str
    enhancement_type: EnhancementType

class EnhanceRequest(BaseModel):
    file_id: str
    prompt: str

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: Optional[float] = None
    result_file_id: Optional[str] = None
    error: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup"""
    init_db()
    await sonic_service.initialize()

@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    """Upload audio file for processing"""
    # Check if file has content_type and if it's an audio file
    if not file.content_type or not file.content_type.startswith('audio/'):
        # Also check file extension as fallback
        if not file.filename or not any(file.filename.lower().endswith(ext) for ext in ['.wav', '.mp3', '.flac', '.m4a', '.ogg']):
            raise HTTPException(status_code=400, detail="File must be an audio file")
    
    file_id = str(uuid.uuid4())
    file_path = await storage_service.save_upload(file, file_id)
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "size": file.size,
        "upload_time": datetime.now().isoformat()
    }

@app.post("/enhance")
async def enhance_audio(request: EnhanceRequest):
    """Enhance audio file with prompt-based processing (no-chunk method)"""
    try:
        # Get input file path
        input_path = storage_service.get_file_path(request.file_id)
        if not os.path.exists(input_path):
            raise HTTPException(status_code=404, detail=f"Input file not found: {request.file_id}")
        
        # Generate output file ID and path
        result_file_id = str(uuid.uuid4())
        output_path = storage_service.get_output_path(result_file_id)
        
        # Process with SonicMaster using no-chunk method for better quality and duration preservation
        await sonic_service.enhance_audio_no_chunks(input_path, output_path, request.prompt)
        
        return {
            "enhanced_file_id": result_file_id,
            "message": "Audio enhancement completed successfully",
            "prompt_used": request.prompt,
            "processing_method": "no_chunks"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")

# Removed /enhance-no-chunks endpoint - functionality moved to main /enhance endpoint

# Removed /enhance-consistent-seed endpoint - using only no-chunk method for main project

@app.post("/process", response_model=JobResponse)
async def process_audio(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Start audio enhancement processing"""
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    jobs[job_id] = {
        "status": JobStatus.PENDING,
        "progress": 0.0,
        "file_id": request.file_id,
        "enhancement_type": request.enhancement_type,
        "created_at": datetime.now(),
        "result_file_id": None,
        "error": None
    }
    
    # Start background processing
    background_tasks.add_task(process_audio_task, job_id, request.file_id, request.enhancement_type)
    
    return JobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        progress=0.0
    )

async def process_audio_task(job_id: str, file_id: str, enhancement_type: EnhancementType):
    """Background task for audio processing using no-chunk method"""
    try:
        jobs[job_id]["status"] = JobStatus.PROCESSING
        jobs[job_id]["progress"] = 0.1
        
        # Get input file path
        input_path = storage_service.get_file_path(file_id)
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {file_id}")
        
        jobs[job_id]["progress"] = 0.3
        
        # Process with SonicMaster using no-chunk method
        result_file_id = str(uuid.uuid4())
        output_path = storage_service.get_output_path(result_file_id)
        
        jobs[job_id]["progress"] = 0.5
        
        # Get the appropriate prompt for the enhancement type
        from .models import ENHANCEMENT_PROMPTS, EnhancementType as ET
        prompt = ENHANCEMENT_PROMPTS.get(enhancement_type, ENHANCEMENT_PROMPTS[ET.FIX_QUALITY])
        
        # Use no-chunk method for better quality and duration preservation
        await sonic_service.enhance_audio_no_chunks(input_path, output_path, prompt)
        
        jobs[job_id]["progress"] = 0.9
        
        # Update job completion
        jobs[job_id]["status"] = JobStatus.COMPLETED
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["result_file_id"] = result_file_id
        
    except Exception as e:
        jobs[job_id]["status"] = JobStatus.FAILED
        jobs[job_id]["error"] = str(e)

@app.get("/job-status/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    """Get processing job status"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    return JobResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        result_file_id=job["result_file_id"],
        error=job["error"]
    )

@app.get("/download/{file_id}")
async def download_file(file_id: str):
    """Download audio file (original or enhanced)"""
    # First try to find the file in outputs (enhanced files)
    output_path = storage_service.get_output_path(file_id)
    if os.path.exists(output_path):
        return FileResponse(
            path=output_path,
            media_type='audio/wav',
            filename=f"enhanced_{file_id}.wav"
        )
    
    # If not found in outputs, try uploads (original files)
    upload_path = storage_service.get_file_path(file_id)
    if os.path.exists(upload_path):
        # Get original filename from path
        original_filename = os.path.basename(upload_path)
        return FileResponse(
            path=upload_path,
            media_type='audio/wav',
            filename=f"original_{original_filename}"
        )
    
    # File not found in either location
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)