import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Database configuration
DB_PATH = Path("./storage/sonicfix.db")
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def init_db():
    """Initialize the database with required tables"""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            
            # Create users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_active TIMESTAMP
                )
            """)
            
            # Create audio_files table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audio_files (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    size INTEGER NOT NULL,
                    content_type TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Create processing_jobs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS processing_jobs (
                    id TEXT PRIMARY KEY,
                    file_id TEXT NOT NULL,
                    enhancement_type TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    progress REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    result_file_id TEXT,
                    error_message TEXT,
                    user_id TEXT,
                    FOREIGN KEY (file_id) REFERENCES audio_files (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Create indexes for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs (status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_created ON processing_jobs (created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_files_upload ON audio_files (upload_time)")
            
            conn.commit()
            logger.info("Database initialized successfully")
            
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise

@contextmanager
def get_db():
    """Get database connection context manager"""
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Enable dict-like access to rows
        yield conn
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {str(e)}")
        raise
    finally:
        if conn:
            conn.close()

class DatabaseService:
    """Service for database operations"""
    
    @staticmethod
    def create_user(user_id: str, email: Optional[str] = None) -> bool:
        """Create a new user"""
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO users (id, email) VALUES (?, ?)",
                    (user_id, email)
                )
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            logger.warning(f"User {user_id} already exists")
            return False
        except Exception as e:
            logger.error(f"Failed to create user: {str(e)}")
            return False
    
    @staticmethod
    def save_audio_file(file_id: str, filename: str, size: int, content_type: str, 
                       file_path: str, user_id: Optional[str] = None) -> bool:
        """Save audio file metadata"""
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO audio_files (id, filename, size, content_type, file_path, user_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (file_id, filename, size, content_type, file_path, user_id)
                )
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to save audio file metadata: {str(e)}")
            return False
    
    @staticmethod
    def create_job(job_id: str, file_id: str, enhancement_type: str, 
                  user_id: Optional[str] = None) -> bool:
        """Create a new processing job"""
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO processing_jobs (id, file_id, enhancement_type, user_id)
                    VALUES (?, ?, ?, ?)
                    """,
                    (job_id, file_id, enhancement_type, user_id)
                )
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to create job: {str(e)}")
            return False
    
    @staticmethod
    def update_job_status(job_id: str, status: str, progress: float = None, 
                         result_file_id: str = None, error_message: str = None) -> bool:
        """Update job status"""
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                
                # Build dynamic update query
                updates = ["status = ?"]
                params = [status]
                
                if progress is not None:
                    updates.append("progress = ?")
                    params.append(progress)
                
                if result_file_id is not None:
                    updates.append("result_file_id = ?")
                    params.append(result_file_id)
                
                if error_message is not None:
                    updates.append("error_message = ?")
                    params.append(error_message)
                
                if status == "completed":
                    updates.append("completed_at = CURRENT_TIMESTAMP")
                
                params.append(job_id)
                
                query = f"UPDATE processing_jobs SET {', '.join(updates)} WHERE id = ?"
                cursor.execute(query, params)
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to update job status: {str(e)}")
            return False
    
    @staticmethod
    def get_job(job_id: str) -> Optional[dict]:
        """Get job by ID"""
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM processing_jobs WHERE id = ?",
                    (job_id,)
                )
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Failed to get job: {str(e)}")
            return None
    
    @staticmethod
    def get_audio_file(file_id: str) -> Optional[dict]:
        """Get audio file by ID"""
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM audio_files WHERE id = ?",
                    (file_id,)
                )
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Failed to get audio file: {str(e)}")
            return None
    
    @staticmethod
    def cleanup_old_records(days: int = 7) -> int:
        """Clean up old records"""
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                
                # Delete old completed/failed jobs
                cursor.execute(
                    """
                    DELETE FROM processing_jobs 
                    WHERE (status = 'completed' OR status = 'failed') 
                    AND created_at < datetime('now', '-{} days')
                    """.format(days)
                )
                
                deleted_jobs = cursor.rowcount
                
                # Delete orphaned audio files
                cursor.execute(
                    """
                    DELETE FROM audio_files 
                    WHERE upload_time < datetime('now', '-{} days')
                    AND id NOT IN (SELECT DISTINCT file_id FROM processing_jobs)
                    """.format(days)
                )
                
                deleted_files = cursor.rowcount
                conn.commit()
                
                logger.info(f"Cleaned up {deleted_jobs} jobs and {deleted_files} files")
                return deleted_jobs + deleted_files
                
        except Exception as e:
            logger.error(f"Failed to cleanup old records: {str(e)}")
            return 0