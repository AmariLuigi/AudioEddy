import os
import shutil
import uuid
from pathlib import Path
from fastapi import UploadFile
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class StorageService:
    """Service for handling file storage operations"""
    
    def __init__(self, base_path: str = "./storage"):
        self.base_path = Path(base_path)
        self.uploads_path = self.base_path / "uploads"
        self.outputs_path = self.base_path / "outputs"
        self.temp_path = self.base_path / "temp"
        
        # Create directories if they don't exist
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure all required directories exist"""
        for path in [self.uploads_path, self.outputs_path, self.temp_path]:
            path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Storage directory ensured: {path}")
    
    async def save_upload(self, file: UploadFile, file_id: str) -> str:
        """Save uploaded file and return the file path"""
        try:
            # Get file extension from original filename
            file_extension = Path(file.filename).suffix if file.filename else ".wav"
            file_path = self.uploads_path / f"{file_id}{file_extension}"
            
            # Save the uploaded file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            logger.info(f"File uploaded successfully: {file_path}")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"Failed to save upload: {str(e)}")
            raise RuntimeError(f"Failed to save uploaded file: {str(e)}")
    
    def get_file_path(self, file_id: str) -> str:
        """Get the full path for an uploaded file"""
        # Try different common audio extensions
        extensions = [".wav", ".mp3", ".flac", ".m4a", ".aac", ".ogg"]
        
        for ext in extensions:
            file_path = self.uploads_path / f"{file_id}{ext}"
            if file_path.exists():
                return str(file_path)
        
        # If no file found, return the default .wav path
        return str(self.uploads_path / f"{file_id}.wav")
    
    def get_output_path(self, file_id: str) -> str:
        """Get the full path for an output file"""
        return str(self.outputs_path / f"{file_id}.wav")
    
    def get_temp_path(self, file_id: str) -> str:
        """Get the full path for a temporary file"""
        return str(self.temp_path / f"{file_id}.wav")
    
    def file_exists(self, file_path: str) -> bool:
        """Check if a file exists"""
        return Path(file_path).exists()
    
    def get_file_size(self, file_path: str) -> Optional[int]:
        """Get file size in bytes"""
        try:
            return Path(file_path).stat().st_size
        except (OSError, FileNotFoundError):
            return None
    
    def delete_file(self, file_path: str) -> bool:
        """Delete a file"""
        try:
            Path(file_path).unlink(missing_ok=True)
            logger.info(f"File deleted: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file {file_path}: {str(e)}")
            return False
    
    def cleanup_old_files(self, max_age_hours: int = 24):
        """Clean up old files (for maintenance)"""
        import time
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        for directory in [self.uploads_path, self.outputs_path, self.temp_path]:
            for file_path in directory.iterdir():
                if file_path.is_file():
                    file_age = current_time - file_path.stat().st_mtime
                    if file_age > max_age_seconds:
                        self.delete_file(str(file_path))
                        logger.info(f"Cleaned up old file: {file_path}")
    
    def get_storage_info(self) -> dict:
        """Get storage information"""
        def get_dir_size(path: Path) -> int:
            return sum(f.stat().st_size for f in path.rglob('*') if f.is_file())
        
        def count_files(path: Path) -> int:
            return len([f for f in path.iterdir() if f.is_file()])
        
        return {
            "base_path": str(self.base_path),
            "uploads": {
                "path": str(self.uploads_path),
                "size_bytes": get_dir_size(self.uploads_path),
                "file_count": count_files(self.uploads_path)
            },
            "outputs": {
                "path": str(self.outputs_path),
                "size_bytes": get_dir_size(self.outputs_path),
                "file_count": count_files(self.outputs_path)
            },
            "temp": {
                "path": str(self.temp_path),
                "size_bytes": get_dir_size(self.temp_path),
                "file_count": count_files(self.temp_path)
            }
        }