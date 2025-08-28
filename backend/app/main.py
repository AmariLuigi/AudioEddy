from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import uuid
import shutil
from typing import Optional
import asyncio
from datetime import datetime
from pathlib import Path
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
from .services.jam_service import JAMService
from .models import JobStatus, EnhancementType, MusicGenerationRequest, MusicGenerationResponse, MusicGenerationJob
from .db import get_db, init_db, DatabaseService

# Import JobManager
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from job_manager import JobManager

app = FastAPI(
    title="SonicFix API", 
    version="1.0.0",
    # Optimize for large file uploads
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Remove ineffective middleware - FastAPI handles multipart efficiently by default

# Initialize services
sonic_service = LocalSonicMasterService()
jam_service = JAMService()

# Initialize JAM service asynchronously
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        await jam_service.initialize()
        logger.info("JAM service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize JAM service: {str(e)}")
        # Continue without JAM service for now
        pass
# Use absolute path to backend storage directory
import os
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
storage_path = os.path.join(backend_dir, "storage")
storage_service = StorageService(base_path=storage_path)

# Initialize JobManager for persistent job tracking
job_manager = JobManager(os.path.join(backend_dir, "jobs_tracker.json"))

# In-memory job tracking for MVP (keeping for backward compatibility)
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
    custom_prompt: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup"""
    init_db()
    
    # Initialize AI service (will use mock processing in development mode)
    await sonic_service.initialize()

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload audio file"""
    try:
        logger.info(f"Upload request received - filename: {file.filename}, content_type: {file.content_type}")
        
        # Validate file type
        if not file.filename or not any(file.filename.lower().endswith(ext) for ext in ['.wav', '.mp3', '.flac', '.m4a', '.ogg']):
            logger.error(f"Invalid file type: {file.filename}")
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        file_path = storage_service.uploads_path / f"{file_id}{file_extension}"
        
        logger.info(f"Saving file to: {file_path}")
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        logger.info(f"File saved successfully - size: {file_size} bytes")
        
        # Save to database
        DatabaseService.save_audio_file(
            file_id=file_id,
            filename=file.filename,
            size=file_size,
            content_type=file.content_type or 'audio/wav',
            file_path=str(file_path)
        )
        
        logger.info(f"Upload completed successfully - file_id: {file_id}")
        
        return {
            "file_id": file_id,
            "filename": file.filename,
            "size": file_size,
            "upload_time": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/enhance", response_model=JobResponse)
async def enhance_audio(request: EnhanceRequest, background_tasks: BackgroundTasks):
    """Enhance audio file with prompt-based processing (no-chunk method)"""
    job_id = str(uuid.uuid4())
    
    # Get original file path for JobManager
    original_file_path = storage_service.get_file_path(request.file_id)
    
    # Add job to JobManager
    job_manager.add_job(str(original_file_path), job_id)
    
    # Initialize job status with custom_prompt enhancement type
    jobs[job_id] = {
        "status": JobStatus.PENDING,
        "progress": 0.0,
        "file_id": request.file_id,
        "enhancement_type": "custom_prompt",  # Set to custom_prompt for UI display
        "created_at": datetime.now(),
        "result_file_id": None,
        "error": None,
        "custom_prompt": request.prompt  # Store the actual prompt
    }
    
    # Start background processing
    background_tasks.add_task(process_custom_prompt_task, job_id, request.file_id, request.prompt)
    
    return JobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        progress=0.0
    )

async def process_custom_prompt_task(job_id: str, file_id: str, prompt: str):
    """Background task for custom prompt audio processing"""
    try:
        jobs[job_id]["status"] = JobStatus.PROCESSING
        jobs[job_id]["progress"] = 0.1
        
        # Update JobManager status
        job_manager.update_job_status(job_id, "processing")
        
        # Get input file path
        input_path = storage_service.get_file_path(file_id)
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {file_id}")
        
        jobs[job_id]["progress"] = 0.3
        
        # Process with SonicMaster using no-chunk method
        result_file_id = str(uuid.uuid4())
        output_path = storage_service.get_output_path(result_file_id)
        
        jobs[job_id]["progress"] = 0.5
        
        # Use the custom prompt directly
        await sonic_service.enhance_audio_no_chunks(input_path, output_path, prompt)
        
        jobs[job_id]["progress"] = 0.9
        
        # Update job completion
        jobs[job_id]["status"] = JobStatus.COMPLETED
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["result_file_id"] = result_file_id
        
        # Update JobManager with completion and enhanced audio path
        job_manager.update_job_status(job_id, "completed", enhanced_audio_path=str(output_path))
        
    except Exception as e:
        jobs[job_id]["status"] = JobStatus.FAILED
        jobs[job_id]["error"] = str(e)
        
        # Update JobManager with failure
        job_manager.update_job_status(job_id, "failed", error_details=str(e))

# Removed /enhance-no-chunks endpoint - functionality moved to main /enhance endpoint

# Removed /enhance-consistent-seed endpoint - using only no-chunk method for main project

@app.post("/process", response_model=JobResponse)
async def process_audio(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Start audio enhancement processing"""
    job_id = str(uuid.uuid4())
    
    # Get original file path for JobManager
    original_file_path = storage_service.get_file_path(request.file_id)
    
    # Add job to JobManager
    job_manager.add_job(str(original_file_path), job_id)
    
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
        
        # Update JobManager status
        job_manager.update_job_status(job_id, "processing")
        
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
        
        # Update JobManager with completion and enhanced audio path
        job_manager.update_job_status(job_id, "completed", enhanced_audio_path=str(output_path))
        
    except Exception as e:
        jobs[job_id]["status"] = JobStatus.FAILED
        jobs[job_id]["error"] = str(e)
        
        # Update JobManager with failure
        job_manager.update_job_status(job_id, "failed", error_details=str(e))

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
        error=job["error"],
        custom_prompt=job.get("custom_prompt")
    )

class JobInfoResponse(BaseModel):
    job_id: str
    original_file_path: Optional[str] = None
    enhanced_audio_path: Optional[str] = None
    status: str
    timestamp: str
    error_details: Optional[str] = None

@app.get("/job-info/{job_id}", response_model=JobInfoResponse)
async def get_job_info(job_id: str):
    """Get job information from JobManager including file paths"""
    logger.info(f"[API] Getting job info for job_id: {job_id}")
    job_info = job_manager.get_job_by_id(job_id)
    if not job_info:
        logger.warning(f"[API] Job not found in tracker: {job_id}")
        raise HTTPException(status_code=404, detail="Job not found in job tracker")
    
    logger.info(f"[API] Job info found: {job_info}")
    response = JobInfoResponse(
        job_id=job_info["job_id"],
        original_file_path=job_info["original_file_path"],
        enhanced_audio_path=job_info["enhanced_audio_path"],
        status=job_info["status"],
        timestamp=job_info["timestamp"],
        error_details=job_info["error_details"]
    )
    logger.info(f"[API] Returning job info response: {response}")
    return response

@app.get("/files")
async def list_files():
    """List all uploaded audio files that still exist on disk"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, filename, size, content_type, upload_time, file_path
                FROM audio_files
                ORDER BY upload_time DESC
            """)
            files = cursor.fetchall()
            
            # Filter files to only include those that still exist on disk
            existing_files = []
            files_to_cleanup = []
            
            for file in files:
                file_id = file[0]
                file_path = storage_service.get_file_path(file_id)
                
                # Check if the physical file still exists
                if os.path.exists(file_path):
                    existing_files.append({
                        "id": file[0],
                        "filename": file[1],
                        "size": file[2],
                        "content_type": file[3],
                        "upload_time": file[4],
                        "file_path": file[5]
                    })
                else:
                    # Mark for cleanup from database
                    files_to_cleanup.append(file_id)
                    logger.warning(f"File {file_id} ({file[1]}) not found on disk, will be removed from database")
            
            # Clean up database entries for missing files
            if files_to_cleanup:
                for file_id in files_to_cleanup:
                    cursor.execute("DELETE FROM audio_files WHERE id = ?", (file_id,))
                    cursor.execute("DELETE FROM processing_jobs WHERE file_id = ?", (file_id,))
                conn.commit()
                logger.info(f"Cleaned up {len(files_to_cleanup)} missing files from database")
            
            return {"files": existing_files}
            
    except Exception as e:
        logger.error(f"Failed to list files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

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

@app.get("/audio/{job_id}/{audio_type}")
async def get_audio_by_job(job_id: str, audio_type: str, request: Request):
    """Get audio file by job ID and type (original or enhanced)"""
    # Enhanced logging for audio requests
    logger.info(f"[API] ===== AUDIO REQUEST RECEIVED =====")
    logger.info(f"[API] Request details: job_id={job_id}, audio_type={audio_type}")
    logger.info(f"[API] Request headers: {dict(request.headers)}")
    logger.info(f"[API] Request client: {request.client}")
    logger.info(f"[API] Request URL: {request.url}")
    logger.info(f"[API] Timestamp: {datetime.now().isoformat()}")
    
    if audio_type not in ["original", "enhanced"]:
        logger.error(f"[API] Invalid audio type: {audio_type}")
        raise HTTPException(status_code=400, detail="Audio type must be 'original' or 'enhanced'")
    
    # Special logging for enhanced audio requests
    if audio_type == "enhanced":
        logger.info(f"[API] ===== ENHANCED AUDIO REQUEST =====\n"
                   f"Job ID: {job_id}\n"
                   f"Request Time: {datetime.now().isoformat()}\n"
                   f"Client: {request.client}\n"
                   f"User-Agent: {request.headers.get('user-agent', 'Unknown')}")
    
    job_info = job_manager.get_job_by_id(job_id)
    if not job_info:
        logger.warning(f"[API] Job not found for audio request: {job_id}")
        logger.warning(f"[API] Available jobs in JobManager: {job_manager.get_all_jobs()}")
        raise HTTPException(status_code=404, detail="Job not found")
    
    logger.info(f"[API] Job info retrieved: {job_info}")
    
    if audio_type == "original":
        file_path = job_info["original_file_path"]
        if not file_path or not os.path.exists(file_path):
            logger.error(f"[API] Original audio file not found: {file_path}")
            raise HTTPException(status_code=404, detail="Original audio file not found")
        filename = f"original_{os.path.basename(file_path)}"
        logger.info(f"[API] Serving original audio: {file_path}")
    else:  # enhanced
        file_path = job_info["enhanced_audio_path"]
        logger.info(f"[API] Enhanced audio path from JobManager: {file_path}")
        
        if not file_path:
            logger.error(f"[API] Enhanced audio path is None/empty for job {job_id}")
            logger.error(f"[API] Job status: {job_info.get('status')}")
            logger.error(f"[API] Full job info: {job_info}")
            raise HTTPException(status_code=404, detail="Enhanced audio path not available")
        
        if not os.path.exists(file_path):
            logger.error(f"[API] Enhanced audio file does not exist on disk: {file_path}")
            logger.error(f"[API] File permissions check: {os.access(os.path.dirname(file_path), os.R_OK) if os.path.dirname(file_path) else 'N/A'}")
            logger.error(f"[API] Directory contents: {os.listdir(os.path.dirname(file_path)) if os.path.dirname(file_path) and os.path.exists(os.path.dirname(file_path)) else 'Directory not found'}")
            raise HTTPException(status_code=404, detail="Enhanced audio file not found on disk")
        
        filename = f"enhanced_{job_id}.wav"
        file_size = os.path.getsize(file_path)
        logger.info(f"[API] ===== ENHANCED AUDIO FILE FOUND =====\n"
                   f"File Path: {file_path}\n"
                   f"File Size: {file_size} bytes\n"
                   f"File Exists: {os.path.exists(file_path)}\n"
                   f"Filename: {filename}")
    
    logger.info(f"[API] Serving {audio_type} audio file: {file_path} as {filename}")
    logger.info(f"[API] ===== AUDIO REQUEST COMPLETED =====")
    
    return FileResponse(
        path=file_path,
        media_type='audio/wav',
        filename=filename
    )

@app.delete("/delete/{file_id}")
async def delete_file(file_id: str):
    """Delete uploaded audio file"""
    try:
        # Check if file exists in database
        file_record = DatabaseService.get_audio_file(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found in database")
        
        upload_deleted = False
        output_deleted = False
        
        # Try to delete the physical file in uploads
        upload_path = storage_service.get_file_path(file_id)
        if os.path.exists(upload_path):
            upload_deleted = storage_service.delete_file(upload_path)
        
        # Also try to delete any enhanced version in outputs
        output_path = storage_service.get_output_path(file_id)
        if os.path.exists(output_path):
            output_deleted = storage_service.delete_file(output_path)
        
        # Clean up any related jobs from memory
        jobs_to_remove = [job_id for job_id, job in jobs.items() if job.get("file_id") == file_id]
        for job_id in jobs_to_remove:
            del jobs[job_id]
        
        # Delete from database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM audio_files WHERE id = ?", (file_id,))
            cursor.execute("DELETE FROM processing_jobs WHERE file_id = ?", (file_id,))
            conn.commit()
        
        return {
            "message": "File deleted successfully",
            "file_id": file_id,
            "upload_deleted": upload_deleted,
            "output_deleted": output_deleted,
            "database_deleted": True
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete file {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

@app.post("/generate-music", response_model=MusicGenerationResponse)
async def generate_music(request: MusicGenerationRequest, background_tasks: BackgroundTasks):
    """Generate music using JAM model"""
    try:
        job_id = str(uuid.uuid4())
        
        # Initialize job status
        music_jobs = getattr(app.state, 'music_jobs', {})
        music_jobs[job_id] = MusicGenerationJob(
            job_id=job_id,
            status="pending",
            progress=0.0,
            prompt=request.prompt,
            duration=request.duration,
            reference_audio_id=request.reference_audio_id,
            created_at=datetime.now()
        )
        app.state.music_jobs = music_jobs
        
        # Start background processing
        background_tasks.add_task(generate_music_task, job_id, request.prompt, request.duration, request.reference_audio_id)
        
        return MusicGenerationResponse(
            job_id=job_id,
            status="pending",
            progress=0.0
        )
        
    except Exception as e:
        logger.error(f"Music generation request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_music_task(job_id: str, prompt: str, duration: float, reference_audio_id: Optional[str] = None):
    """Background task for music generation"""
    try:
        music_jobs = getattr(app.state, 'music_jobs', {})
        
        # Update status to processing
        music_jobs[job_id].status = "processing"
        music_jobs[job_id].progress = 0.1
        
        # Generate music
        result_file_id = str(uuid.uuid4())
        output_path = storage_service.get_output_path(result_file_id)
        
        music_jobs[job_id].progress = 0.3
        
        # Get reference audio path if provided
        reference_audio_path = None
        if reference_audio_id:
            reference_audio_path = storage_service.get_file_path(reference_audio_id)
            if not os.path.exists(reference_audio_path):
                logger.warning(f"Reference audio file not found: {reference_audio_path}")
                reference_audio_path = None
        
        # Call JAM service
        await jam_service.generate_music(prompt, duration, output_path, reference_audio_path)
        
        music_jobs[job_id].progress = 0.9
        
        # Update job completion
        music_jobs[job_id].status = "completed"
        music_jobs[job_id].progress = 1.0
        music_jobs[job_id].result_file_id = result_file_id
        
    except Exception as e:
        music_jobs = getattr(app.state, 'music_jobs', {})
        if job_id in music_jobs:
            music_jobs[job_id].status = "failed"
            music_jobs[job_id].error = str(e)
        logger.error(f"Music generation failed for job {job_id}: {str(e)}")

@app.get("/music-status/{job_id}", response_model=MusicGenerationResponse)
async def get_music_generation_status(job_id: str):
    """Get music generation job status"""
    music_jobs = getattr(app.state, 'music_jobs', {})
    
    if job_id not in music_jobs:
        raise HTTPException(status_code=404, detail="Music generation job not found")
    
    job = music_jobs[job_id]
    return MusicGenerationResponse(
        job_id=job_id,
        status=job.status,
        progress=job.progress,
        result_file_id=job.result_file_id,
        error=job.error
    )

@app.get("/download-music/{job_id}")
async def download_generated_music(job_id: str):
    """Download generated music file"""
    music_jobs = getattr(app.state, 'music_jobs', {})
    
    if job_id not in music_jobs:
        raise HTTPException(status_code=404, detail="Music generation job not found")
    
    job = music_jobs[job_id]
    
    if job.status != "completed" or not job.result_file_id:
        raise HTTPException(status_code=400, detail="Music generation not completed or failed")
    
    output_path = storage_service.get_output_path(job.result_file_id)
    
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Generated music file not found")
    
    return FileResponse(
        path=output_path,
        media_type='audio/wav',
        filename=f"generated_music_{job_id}.wav"
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/file-health/{file_id}")
async def check_file_health(file_id: str):
    """Check if a file exists on the server"""
    try:
        # Check if file exists in database
        file_record = DatabaseService.get_audio_file(file_id)
        if not file_record:
            return {"exists": False, "file_id": file_id, "reason": "File not found in database"}
        
        # Check if physical file exists
        upload_path = storage_service.get_file_path(file_id)
        if os.path.exists(upload_path):
            return {"exists": True, "file_id": file_id}
        
        # Check if enhanced file exists
        output_path = storage_service.get_output_path(file_id)
        if os.path.exists(output_path):
            return {"exists": True, "file_id": file_id}
        
        return {"exists": False, "file_id": file_id, "reason": "Physical file not found"}
        
    except Exception as e:
        logger.error(f"Failed to check file health for {file_id}: {str(e)}")
        return {"exists": False, "file_id": file_id, "reason": f"Error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)