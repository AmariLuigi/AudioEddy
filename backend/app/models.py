from enum import Enum
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class JobStatus(str, Enum):
    """Job processing status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class EnhancementType(str, Enum):
    """Audio enhancement type enumeration"""
    FIX_QUALITY = "fix_quality"
    REMOVE_NOISE = "remove_noise"
    STUDIO_MASTER = "studio_master"
    VOCAL_ENHANCE = "vocal_enhance"
    BASS_BOOST = "bass_boost"
    CLARITY_BOOST = "clarity_boost"
    CUSTOM_PROMPT = "custom_prompt"

class AudioFile(BaseModel):
    """Audio file metadata model"""
    id: str
    filename: str
    size: int
    content_type: str
    upload_time: datetime
    file_path: str

class ProcessingJob(BaseModel):
    """Audio processing job model"""
    id: str
    file_id: str
    enhancement_type: EnhancementType
    status: JobStatus
    progress: float = 0.0
    created_at: datetime
    completed_at: Optional[datetime] = None
    result_file_id: Optional[str] = None
    error_message: Optional[str] = None

class User(BaseModel):
    """User model for future authentication"""
    id: str
    email: Optional[str] = None
    created_at: datetime
    last_active: Optional[datetime] = None

class MusicGenerationJob(BaseModel):
    """Music generation job model"""
    job_id: str  # Changed from id to job_id for consistency
    prompt: str  # Changed from lyrics to prompt for text-to-music
    style_prompt: Optional[str] = None
    genre_tags: Optional[List[str]] = None
    duration: float = 30.0
    reference_audio_id: Optional[str] = None
    status: str  # Changed from JobStatus to str for simplicity
    progress: float = 0.0
    created_at: datetime
    completed_at: Optional[datetime] = None
    result_file_id: Optional[str] = None
    error: Optional[str] = None  # Changed from error_message to error

class MusicGenerationRequest(BaseModel):
    """Request model for music generation"""
    prompt: str  # Changed from lyrics to prompt for text-to-music
    style_prompt: Optional[str] = None
    genre_tags: Optional[List[str]] = None
    duration: float = 30.0
    reference_audio_id: Optional[str] = None  # Reference audio file ID
    
class MusicGenerationResponse(BaseModel):
    """Response model for music generation"""
    job_id: str
    status: str
    estimated_time: Optional[int] = None
    message: Optional[str] = None

# Enhancement type to prompt mapping for SonicMaster
ENHANCEMENT_PROMPTS = {
    EnhancementType.FIX_QUALITY: "Fix audio quality issues, reduce distortion and improve clarity",
    EnhancementType.REMOVE_NOISE: "Remove background noise and unwanted artifacts while preserving the main audio",
    EnhancementType.STUDIO_MASTER: "Apply professional mastering, reduce noise and fix clipping for studio quality",
    EnhancementType.VOCAL_ENHANCE: "Enhance vocal clarity and presence, reduce sibilance and improve intelligibility",
    EnhancementType.BASS_BOOST: "Enhance low frequencies and bass response while maintaining balance",
    EnhancementType.CLARITY_BOOST: "Improve overall clarity and definition across all frequencies"
}