import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { audioAPI } from '../../utils/api';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type EnhancementType = 'fix_quality' | 'remove_noise' | 'studio_master' | 'vocal_enhance' | 'bass_boost' | 'clarity_boost' | 'custom_prompt';

export interface ProcessingJob {
  id: string;
  fileId: string;
  enhancementType: EnhancementType;
  status: JobStatus;
  progress: number;
  createdAt: string;
  completedAt?: string;
  resultFileId?: string;
  error?: string;
}

export interface JobsState {
  jobs: ProcessingJob[];
  currentJob: ProcessingJob | null;
  isProcessing: boolean;
  isDownloading: boolean;
  error: string | null;
}

const initialState: JobsState = {
  jobs: [],
  currentJob: null,
  isProcessing: false,
  isDownloading: false,
  error: null,
};

// Async thunks
export const startProcessing = createAsyncThunk(
  'jobs/startProcessing',
  async ({ fileId, enhancementType }: { fileId: string; enhancementType: EnhancementType }, { rejectWithValue }) => {
    try {
      const response = await audioAPI.processAudio(fileId, enhancementType);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Processing failed to start');
    }
  }
);

export const checkJobStatus = createAsyncThunk(
  'jobs/checkStatus',
  async (jobId: string, { rejectWithValue }) => {
    try {
      const response = await audioAPI.getJobStatus(jobId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to check job status');
    }
  }
);

export const downloadResult = createAsyncThunk(
  'jobs/downloadResult',
  async (fileId: string, { rejectWithValue }) => {
    try {
      const response = await audioAPI.downloadFile(fileId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Download failed');
    }
  }
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setCurrentJob: (state, action: PayloadAction<ProcessingJob>) => {
      state.currentJob = action.payload;
    },
    clearCurrentJob: (state) => {
      state.currentJob = null;
      state.isProcessing = false;
    },
    updateJobProgress: (state, action: PayloadAction<{ jobId: string; progress: number; status?: JobStatus }>) => {
      const { jobId, progress, status } = action.payload;
      
      // Update in jobs array
      const jobIndex = state.jobs.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        state.jobs[jobIndex].progress = progress;
        if (status) {
          state.jobs[jobIndex].status = status;
        }
      }
      
      // Update current job if it matches
      if (state.currentJob?.id === jobId) {
        state.currentJob.progress = progress;
        if (status) {
          state.currentJob.status = status;
        }
      }
    },
    completeJob: (state, action: PayloadAction<{ jobId: string; resultFileId: string }>) => {
      const { jobId, resultFileId } = action.payload;
      
      // Update in jobs array
      const jobIndex = state.jobs.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        state.jobs[jobIndex].status = 'completed';
        state.jobs[jobIndex].progress = 100;
        state.jobs[jobIndex].resultFileId = resultFileId;
        state.jobs[jobIndex].completedAt = new Date().toISOString();
      }
      
      // Update current job if it matches
      if (state.currentJob?.id === jobId) {
        state.currentJob.status = 'completed';
        state.currentJob.progress = 100;
        state.currentJob.resultFileId = resultFileId;
        state.currentJob.completedAt = new Date().toISOString();
      }
      
      state.isProcessing = false;
    },
    failJob: (state, action: PayloadAction<{ jobId: string; error: string }>) => {
      const { jobId, error } = action.payload;
      
      // Update in jobs array
      const jobIndex = state.jobs.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        state.jobs[jobIndex].status = 'failed';
        state.jobs[jobIndex].error = error;
        state.jobs[jobIndex].completedAt = new Date().toISOString();
      }
      
      // Update current job if it matches
      if (state.currentJob?.id === jobId) {
        state.currentJob.status = 'failed';
        state.currentJob.error = error;
        state.currentJob.completedAt = new Date().toISOString();
      }
      
      state.isProcessing = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    removeJob: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter(job => job.id !== action.payload);
      if (state.currentJob?.id === action.payload) {
        state.currentJob = null;
        state.isProcessing = false;
      }
    },
    clearAllJobs: (state) => {
      state.jobs = [];
      state.currentJob = null;
      state.isProcessing = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Start processing
      .addCase(startProcessing.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(startProcessing.fulfilled, (state, action) => {
        const newJob: ProcessingJob = {
          id: action.payload.job_id,
          fileId: action.meta.arg.fileId,
          enhancementType: action.meta.arg.enhancementType,
          status: action.payload.status,
          progress: action.payload.progress || 0,
          createdAt: new Date().toISOString(),
        };
        
        state.jobs.push(newJob);
        state.currentJob = newJob;
        state.isProcessing = true;
      })
      .addCase(startProcessing.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      })
      // Check job status
      .addCase(checkJobStatus.fulfilled, (state, action) => {
        const jobData = action.payload;
        const jobId = action.meta.arg;
        
        // Update in jobs array
        const jobIndex = state.jobs.findIndex(job => job.id === jobId);
        if (jobIndex !== -1) {
          state.jobs[jobIndex].status = jobData.status;
          state.jobs[jobIndex].progress = jobData.progress || 0;
          if (jobData.result_file_id) {
            state.jobs[jobIndex].resultFileId = jobData.result_file_id;
          }
          if (jobData.error) {
            state.jobs[jobIndex].error = jobData.error;
          }
        }
        
        // Update current job if it matches
        if (state.currentJob?.id === jobId) {
          state.currentJob.status = jobData.status;
          state.currentJob.progress = jobData.progress || 0;
          if (jobData.result_file_id) {
            state.currentJob.resultFileId = jobData.result_file_id;
          }
          if (jobData.error) {
            state.currentJob.error = jobData.error;
          }
        }
        
        // Update processing state
        if (jobData.status === 'completed' || jobData.status === 'failed') {
          state.isProcessing = false;
        }
      })
      .addCase(checkJobStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Download result
      .addCase(downloadResult.pending, (state) => {
        state.isDownloading = true;
        state.error = null;
      })
      .addCase(downloadResult.fulfilled, (state) => {
        state.isDownloading = false;
      })
      .addCase(downloadResult.rejected, (state, action) => {
        state.isDownloading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentJob,
  clearCurrentJob,
  updateJobProgress,
  completeJob,
  failJob,
  clearError,
  removeJob,
  clearAllJobs,
} = jobsSlice.actions;

export default jobsSlice.reducer;