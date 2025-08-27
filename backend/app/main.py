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
from .models import JobStatus, EnhancementType
from .db import get_db, init_db, DatabaseService

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

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)