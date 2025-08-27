import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { audioAPI } from '../../utils/api';

export interface AudioFile {
  id: string;
  filename: string;
  size: number;
  uploadTime: string;
  uri?: string;
  duration?: number;
  waveformData?: number[];
}

export interface AudioState {
  currentFile: AudioFile | null;
  uploadedFiles: AudioFile[];
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  isPlaying: boolean;
  currentPosition: number;
  duration: number;
}

const initialState: AudioState = {
  currentFile: null,
  uploadedFiles: [],
  isUploading: false,
  uploadProgress: 0,
  error: null,
  isPlaying: false,
  currentPosition: 0,
  duration: 0,
};

// Async thunks
export const uploadAudioFile = createAsyncThunk(
  'audio/uploadFile',
  async (file: File, { rejectWithValue }) => {
    try {
      const response = await audioAPI.uploadFile(file);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Upload failed');
    }
  }
);

export const generateWaveform = createAsyncThunk(
  'audio/generateWaveform',
  async (audioUri: string, { rejectWithValue }) => {
    try {
      // This would typically use a library like react-native-audio-waveform
      // For now, we'll generate mock waveform data
      const mockWaveform = Array.from({ length: 100 }, () => Math.random());
      return mockWaveform;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Waveform generation failed');
    }
  }
);

export const deleteAudioFile = createAsyncThunk(
  'audio/deleteFile',
  async (fileId: string, { rejectWithValue }) => {
    try {
      const response = await audioAPI.deleteFile(fileId);
      return { fileId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Delete failed');
    }
  }
);

export const fetchAudioFiles = createAsyncThunk(
  'audio/fetchFiles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await audioAPI.getFiles();
      return response.files;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch files');
    }
  }
);

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    setCurrentFile: (state, action: PayloadAction<AudioFile>) => {
      state.currentFile = action.payload;
    },
    clearCurrentFile: (state) => {
      state.currentFile = null;
      state.isPlaying = false;
      state.currentPosition = 0;
      state.duration = 0;
    },
    setPlaybackState: (state, action: PayloadAction<{ isPlaying: boolean; position?: number; duration?: number }>) => {
      state.isPlaying = action.payload.isPlaying;
      if (action.payload.position !== undefined) {
        state.currentPosition = action.payload.position;
      }
      if (action.payload.duration !== undefined) {
        state.duration = action.payload.duration;
      }
    },
    updatePlaybackPosition: (state, action: PayloadAction<number>) => {
      state.currentPosition = action.payload;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    addUploadedFile: (state, action: PayloadAction<AudioFile>) => {
      state.uploadedFiles.push(action.payload);
    },
    removeUploadedFile: (state, action: PayloadAction<string>) => {
      state.uploadedFiles = state.uploadedFiles.filter(file => file.id !== action.payload);
    },
    updateFileWaveform: (state, action: PayloadAction<{ fileId: string; waveformData: number[] }>) => {
      const file = state.uploadedFiles.find(f => f.id === action.payload.fileId);
      if (file) {
        file.waveformData = action.payload.waveformData;
      }
      if (state.currentFile?.id === action.payload.fileId) {
        state.currentFile.waveformData = action.payload.waveformData;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload file
      .addCase(uploadAudioFile.pending, (state) => {
        state.isUploading = true;
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadAudioFile.fulfilled, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 100;
        const newFile: AudioFile = {
          id: action.payload.file_id,
          filename: action.payload.filename,
          size: action.payload.size,
          uploadTime: action.payload.upload_time,
        };
        state.uploadedFiles.push(newFile);
        if (state.uploadedFiles.length === 1) {
          state.currentFile = newFile;
        }
      })
      .addCase(uploadAudioFile.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 0;
        state.error = action.payload as string;
      })
      // Generate waveform
      .addCase(generateWaveform.fulfilled, (state, action) => {
        if (state.currentFile) {
          state.currentFile.waveformData = action.payload;
          const fileIndex = state.uploadedFiles.findIndex(f => f.id === state.currentFile?.id);
          if (fileIndex !== -1) {
            state.uploadedFiles[fileIndex].waveformData = action.payload;
          }
        }
      })
      .addCase(generateWaveform.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Delete file
      .addCase(deleteAudioFile.fulfilled, (state, action) => {
        const fileId = action.payload.fileId;
        // Remove from uploaded files
        state.uploadedFiles = state.uploadedFiles.filter(file => file.id !== fileId);
        // Clear current file if it was the deleted one
        if (state.currentFile?.id === fileId) {
          state.currentFile = null;
        }
      })
      .addCase(deleteAudioFile.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Fetch files
      .addCase(fetchAudioFiles.fulfilled, (state, action) => {
        state.uploadedFiles = action.payload.map((file: any) => ({
          id: file.id,
          filename: file.filename,
          size: file.size,
          uploadTime: file.upload_time,
        }));
      })
      .addCase(fetchAudioFiles.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentFile,
  clearCurrentFile,
  setPlaybackState,
  updatePlaybackPosition,
  setUploadProgress,
  clearError,
  addUploadedFile,
  removeUploadedFile,
  updateFileWaveform,
} = audioSlice.actions;

// Async thunks are already exported above with their declarations

export default audioSlice.reducer;