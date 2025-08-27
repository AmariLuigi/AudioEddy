#!/usr/bin/env python3
"""
Example usage script for the JobManager class.
Demonstrates all functionality including adding, updating, fetching, and managing jobs.
"""

import time
import threading
from job_manager import JobManager
from pathlib import Path


def example_basic_usage():
    """Demonstrate basic job management operations."""
    print("=== Basic Job Management Example ===")
    
    # Initialize job manager
    job_manager = JobManager("example_jobs.json")
    
    # Add a new job
    original_file = "/path/to/audio/original.wav"
    job_id = job_manager.add_job(original_file)
    print(f"Created job: {job_id}")
    
    # Get job by ID
    job = job_manager.get_job_by_id(job_id)
    print(f"Job details: {job}")
    
    # Update job status to processing
    job_manager.update_job_status(job_id, "processing")
    print("Updated job status to 'processing'")
    
    # Simulate completion with enhanced audio path
    enhanced_path = "/path/to/audio/enhanced.wav"
    job_manager.update_job_status(job_id, "completed", enhanced_audio_path=enhanced_path)
    print("Job completed successfully")
    
    # Fetch enhanced audio path
    enhanced_audio = job_manager.get_enhanced_audio_path(job_id)
    print(f"Enhanced audio path: {enhanced_audio}")
    
    # Get job by original file path
    job_by_path = job_manager.get_job_by_original_path(original_file)
    print(f"Job found by original path: {job_by_path['job_id']}")
    
    print()


def example_error_handling():
    """Demonstrate error handling scenarios."""
    print("=== Error Handling Example ===")
    
    job_manager = JobManager("example_jobs.json")
    
    # Add a job that will fail
    original_file = "/path/to/audio/problematic.wav"
    job_id = job_manager.add_job(original_file)
    print(f"Created job: {job_id}")
    
    # Update to processing
    job_manager.update_job_status(job_id, "processing")
    
    # Simulate failure
    error_message = "Audio file format not supported"
    job_manager.update_job_status(job_id, "failed", error_details=error_message)
    print(f"Job failed with error: {error_message}")
    
    # Try to get enhanced audio (should return None for failed job)
    enhanced_audio = job_manager.get_enhanced_audio_path(job_id)
    print(f"Enhanced audio path for failed job: {enhanced_audio}")
    
    # Get job details to see error
    job = job_manager.get_job_by_id(job_id)
    print(f"Failed job details: {job}")
    
    print()


def example_concurrent_access():
    """Demonstrate thread-safe concurrent access."""
    print("=== Concurrent Access Example ===")
    
    job_manager = JobManager("example_jobs.json")
    results = []
    
    def worker_thread(thread_id):
        """Worker function for concurrent job creation."""
        try:
            original_file = f"/path/to/audio/file_{thread_id}.wav"
            job_id = job_manager.add_job(original_file)
            results.append(f"Thread {thread_id}: Created job {job_id}")
            
            # Simulate some processing time
            time.sleep(0.1)
            
            # Update job status
            job_manager.update_job_status(job_id, "processing")
            time.sleep(0.1)
            
            enhanced_path = f"/path/to/audio/enhanced_{thread_id}.wav"
            job_manager.update_job_status(job_id, "completed", enhanced_audio_path=enhanced_path)
            results.append(f"Thread {thread_id}: Completed job {job_id}")
            
        except Exception as e:
            results.append(f"Thread {thread_id}: Error - {e}")
    
    # Create multiple threads
    threads = []
    for i in range(5):
        thread = threading.Thread(target=worker_thread, args=(i,))
        threads.append(thread)
        thread.start()
    
    # Wait for all threads to complete
    for thread in threads:
        thread.join()
    
    # Print results
    for result in sorted(results):
        print(result)
    
    # Show all jobs
    all_jobs = job_manager.get_all_jobs()
    print(f"Total jobs created: {len(all_jobs)}")
    
    print()


def example_filtering_and_cleanup():
    """Demonstrate job filtering and cleanup operations."""
    print("=== Filtering and Cleanup Example ===")
    
    job_manager = JobManager("example_jobs.json")
    
    # Get jobs by status
    completed_jobs = job_manager.get_all_jobs(status_filter="completed")
    failed_jobs = job_manager.get_all_jobs(status_filter="failed")
    
    print(f"Completed jobs: {len(completed_jobs)}")
    print(f"Failed jobs: {len(failed_jobs)}")
    
    # Show some completed job details
    if completed_jobs:
        print("\nFirst completed job:")
        print(f"  Job ID: {completed_jobs[0]['job_id']}")
        print(f"  Original: {completed_jobs[0]['original_file_path']}")
        print(f"  Enhanced: {completed_jobs[0]['enhanced_audio_path']}")
        print(f"  Timestamp: {completed_jobs[0]['timestamp']}")
    
    # Cleanup old completed jobs (keep only 3 most recent)
    deleted_count = job_manager.cleanup_completed_jobs(keep_last_n=3)
    print(f"\nCleaned up {deleted_count} old completed jobs")
    
    # Show remaining jobs
    remaining_jobs = job_manager.get_all_jobs()
    print(f"Remaining jobs: {len(remaining_jobs)}")
    
    print()


def example_custom_job_ids():
    """Demonstrate using custom job IDs."""
    print("=== Custom Job IDs Example ===")
    
    job_manager = JobManager("example_jobs.json")
    
    # Add job with custom ID
    custom_id = "audio_enhancement_001"
    original_file = "/path/to/audio/custom.wav"
    
    try:
        job_id = job_manager.add_job(original_file, job_id=custom_id)
        print(f"Created job with custom ID: {job_id}")
        
        # Try to add another job with the same ID (should fail)
        try:
            job_manager.add_job("/another/file.wav", job_id=custom_id)
        except ValueError as e:
            print(f"Expected error for duplicate ID: {e}")
        
        # Complete the job
        job_manager.update_job_status(custom_id, "completed", 
                                    enhanced_audio_path="/path/to/enhanced/custom.wav")
        
        # Fetch by custom ID
        job = job_manager.get_job_by_id(custom_id)
        print(f"Retrieved job by custom ID: {job['job_id']}")
        
    except Exception as e:
        print(f"Error with custom job ID: {e}")
    
    print()


def main():
    """Run all examples."""
    print("JobManager Example Usage\n")
    
    # Clean up any existing example file
    example_file = Path("example_jobs.json")
    if example_file.exists():
        example_file.unlink()
    
    # Run examples
    example_basic_usage()
    example_error_handling()
    example_concurrent_access()
    example_filtering_and_cleanup()
    example_custom_job_ids()
    
    print("=== All Examples Completed ===")
    
    # Show final state
    job_manager = JobManager("example_jobs.json")
    all_jobs = job_manager.get_all_jobs()
    print(f"Final job count: {len(all_jobs)}")
    
    # Clean up example file
    if example_file.exists():
        example_file.unlink()
        print("Cleaned up example file")


if __name__ == "__main__":
    main()