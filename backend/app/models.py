from enum import Enum
from pydantic import BaseModel
from typing import Optional
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

# Enhancement type to prompt mapping for SonicMaster
ENHANCEMENT_PROMPTS = {
    EnhancementType.FIX_QUALITY: "Fix audio quality issues, reduce distortion and improve clarity",
    EnhancementType.REMOVE_NOISE: "Remove background noise and unwanted artifacts while preserving the main audio",
    EnhancementType.STUDIO_MASTER: "Apply professional mastering, reduce noise and fix clipping for studio quality",
    EnhancementType.VOCAL_ENHANCE: "Enhance vocal clarity and presence, reduce sibilance and improve intelligibility",
    EnhancementType.BASS_BOOST: "Enhance low frequencies and bass response while maintaining balance",
    EnhancementType.CLARITY_BOOST: "Improve overall clarity and definition across all frequencies"
}