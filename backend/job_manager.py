import json
import uuid
import threading
import os
from datetime import datetime
from typing import Dict, List, Optional, Union
from pathlib import Path

# Import fcntl only on Unix-like systems
try:
    import fcntl
except ImportError:
    fcntl = None  # fcntl is not available on Windows


class JobManager:
    """Thread-safe manager for audio enhancement job tracking."""
    
    def __init__(self, json_file_path: str = "jobs_tracker.json"):
        self.json_file_path = Path(json_file_path)
        self._lock = threading.RLock()  # Reentrant lock for thread safety
        self._ensure_json_file_exists()
    
    def _ensure_json_file_exists(self):
        """Ensure the JSON file exists with proper structure."""
        if not self.json_file_path.exists():
            initial_data = {"jobs": []}
            with open(self.json_file_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f, indent=2)
    
    def _read_jobs_file(self) -> Dict:
        """Read jobs from JSON file with file locking."""
        with open(self.json_file_path, 'r', encoding='utf-8') as f:
            # Acquire shared lock for reading (Unix-like systems only)
            if os.name != 'nt' and fcntl is not None:
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            try:
                return json.load(f)
            except json.JSONDecodeError:
                # Return empty structure if file is corrupted
                return {"jobs": []}
            finally:
                if os.name != 'nt' and fcntl is not None:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    
    def _write_jobs_file(self, data: Dict):
        """Write jobs to JSON file with file locking."""
        with open(self.json_file_path, 'w', encoding='utf-8') as f:
            # Acquire exclusive lock for writing (Unix-like systems only)
            if os.name != 'nt' and fcntl is not None:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                json.dump(data, f, indent=2, ensure_ascii=False)
            finally:
                if os.name != 'nt' and fcntl is not None:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    
    def add_job(self, original_file_path: str, job_id: Optional[str] = None) -> str:
        """Add a new job to the tracker.
        
        Args:
            original_file_path: Path to the original audio file
            job_id: Optional custom job ID, generates UUID if not provided
            
        Returns:
            str: The job ID of the created job
        """
        with self._lock:
            if job_id is None:
                job_id = str(uuid.uuid4())
            
            # Check if job_id already exists
            data = self._read_jobs_file()
            existing_job = next((job for job in data["jobs"] if job["job_id"] == job_id), None)
            if existing_job:
                raise ValueError(f"Job with ID '{job_id}' already exists")
            
            new_job = {
                "job_id": job_id,
                "original_file_path": str(original_file_path),
                "enhanced_audio_path": None,
                "status": "pending",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "error_details": None
            }
            
            data["jobs"].append(new_job)
            self._write_jobs_file(data)
            
            return job_id
    
    def update_job_status(self, job_id: str, status: str, enhanced_audio_path: Optional[str] = None, 
                         error_details: Optional[str] = None) -> bool:
        """Update job status and paths.
        
        Args:
            job_id: The job ID to update
            status: New status (pending, processing, completed, failed)
            enhanced_audio_path: Path to enhanced audio file (optional)
            error_details: Error message if status is 'failed' (optional)
            
        Returns:
            bool: True if job was found and updated, False otherwise
        """
        with self._lock:
            data = self._read_jobs_file()
            
            for job in data["jobs"]:
                if job["job_id"] == job_id:
                    job["status"] = status
                    if enhanced_audio_path is not None:
                        job["enhanced_audio_path"] = str(enhanced_audio_path)
                    if error_details is not None:
                        job["error_details"] = error_details
                    elif status == "completed":
                        job["error_details"] = None  # Clear errors on completion
                    
                    self._write_jobs_file(data)
                    return True
            
            return False
    
    def get_job_by_id(self, job_id: str) -> Optional[Dict]:
        """Fetch job by job ID.
        
        Args:
            job_id: The job ID to search for
            
        Returns:
            Dict or None: Job data if found, None otherwise
        """
        with self._lock:
            data = self._read_jobs_file()
            return next((job for job in data["jobs"] if job["job_id"] == job_id), None)
    
    def get_job_by_original_path(self, original_file_path: str) -> Optional[Dict]:
        """Fetch job by original file path.
        
        Args:
            original_file_path: The original file path to search for
            
        Returns:
            Dict or None: Job data if found, None otherwise
        """
        with self._lock:
            data = self._read_jobs_file()
            return next((job for job in data["jobs"] if job["original_file_path"] == str(original_file_path)), None)
    
    def get_enhanced_audio_path(self, identifier: str, by_job_id: bool = True) -> Optional[str]:
        """Get enhanced audio path by job ID or original file path.
        
        Args:
            identifier: Job ID or original file path
            by_job_id: If True, search by job_id; if False, search by original_file_path
            
        Returns:
            str or None: Path to enhanced audio if found and completed, None otherwise
        """
        with self._lock:
            if by_job_id:
                job = self.get_job_by_id(identifier)
            else:
                job = self.get_job_by_original_path(identifier)
            
            if job and job["status"] == "completed" and job["enhanced_audio_path"]:
                return job["enhanced_audio_path"]
            
            return None
    
    def get_all_jobs(self, status_filter: Optional[str] = None) -> List[Dict]:
        """Get all jobs, optionally filtered by status.
        
        Args:
            status_filter: Optional status to filter by
            
        Returns:
            List[Dict]: List of job data
        """
        with self._lock:
            data = self._read_jobs_file()
            jobs = data["jobs"]
            
            if status_filter:
                jobs = [job for job in jobs if job["status"] == status_filter]
            
            return jobs
    
    def delete_job(self, job_id: str) -> bool:
        """Delete a job from the tracker.
        
        Args:
            job_id: The job ID to delete
            
        Returns:
            bool: True if job was found and deleted, False otherwise
        """
        with self._lock:
            data = self._read_jobs_file()
            original_count = len(data["jobs"])
            data["jobs"] = [job for job in data["jobs"] if job["job_id"] != job_id]
            
            if len(data["jobs"]) < original_count:
                self._write_jobs_file(data)
                return True
            
            return False
    
    def cleanup_completed_jobs(self, keep_last_n: int = 100) -> int:
        """Clean up old completed jobs, keeping only the most recent ones.
        
        Args:
            keep_last_n: Number of completed jobs to keep
            
        Returns:
            int: Number of jobs deleted
        """
        with self._lock:
            data = self._read_jobs_file()
            completed_jobs = [job for job in data["jobs"] if job["status"] == "completed"]
            
            if len(completed_jobs) <= keep_last_n:
                return 0
            
            # Sort by timestamp (newest first)
            completed_jobs.sort(key=lambda x: x["timestamp"], reverse=True)
            jobs_to_keep = completed_jobs[:keep_last_n]
            jobs_to_keep_ids = {job["job_id"] for job in jobs_to_keep}
            
            original_count = len(data["jobs"])
            data["jobs"] = [job for job in data["jobs"] 
                           if job["status"] != "completed" or job["job_id"] in jobs_to_keep_ids]
            
            deleted_count = original_count - len(data["jobs"])
            if deleted_count > 0:
                self._write_jobs_file(data)
            
            return deleted_count