import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// API Configuration
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000' 
  : 'http://10.0.2.2:8000'; // Android emulator localhost

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle common error cases
    if (error.response?.status === 404) {
      throw new Error('Resource not found');
    } else if (error.response?.status === 500) {
      throw new Error('Server error occurred');
    } else if (error.code === 'NETWORK_ERROR') {
      throw new Error('Network connection failed');
    }
    
    throw error;
  }
);

// API Functions
export const audioAPI = {
  // Upload audio file
  async uploadFile(file: { uri: string; name: string; type: string }) {
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      // Web implementation
      const response = await fetch(file.uri);
      const blob = await response.blob();
      formData.append('file', blob, file.name);
    } else {
      // React Native implementation
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    }
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
  
  // Start audio processing
  async processAudio(fileId: string, enhancementType: string) {
    const response = await api.post('/process', {
      file_id: fileId,
      enhancement_type: enhancementType,
    });
    
    return response.data;
  },
  
  // Enhance audio with custom prompt
  async enhanceWithPrompt(fileId: string, prompt: string) {
    const response = await api.post('/enhance', {
      file_id: fileId,
      prompt: prompt,
    });
    
    return response.data;
  },
  
  // Get job status
  async getJobStatus(jobId: string) {
    const response = await api.get(`/job-status/${jobId}`);
    return response.data;
  },
  
  // Download processed file
  async downloadFile(fileId: string) {
    if (Platform.OS === 'web') {
      // Web implementation - trigger download
      const response = await api.get(`/download/${fileId}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'audio/wav' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enhanced_${fileId}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Download started' };
    } else {
      // React Native implementation - save to device
      const downloadUrl = `${API_BASE_URL}/download/${fileId}`;
      const fileUri = `${FileSystem.documentDirectory}enhanced_${fileId}.wav`;
      
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
      
      return {
        success: true,
        uri: downloadResult.uri,
        message: 'File saved to device',
      };
    }
  },
  
  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },
};

// Utility functions
export const apiUtils = {
  // Check if API is available
  async checkConnection() {
    try {
      await audioAPI.healthCheck();
      return true;
    } catch (error) {
      console.error('API connection failed:', error);
      return false;
    }
  },
  
  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // Format duration
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  
  // Get enhancement type display name
  getEnhancementDisplayName(type: string): string {
    const displayNames: Record<string, string> = {
      fix_quality: 'Fix Quality',
      remove_noise: 'Remove Noise',
      studio_master: 'Studio Master',
      vocal_enhance: 'Vocal Enhance',
      bass_boost: 'Bass Boost',
      clarity_boost: 'Clarity Boost',
    };
    
    return displayNames[type] || type;
  },
  
  // Get enhancement type description
  getEnhancementDescription(type: string): string {
    const descriptions: Record<string, string> = {
      fix_quality: 'Fix audio quality issues, reduce distortion and improve clarity',
      remove_noise: 'Remove background noise and unwanted artifacts',
      studio_master: 'Apply professional mastering for studio quality',
      vocal_enhance: 'Enhance vocal clarity and presence',
      bass_boost: 'Enhance low frequencies and bass response',
      clarity_boost: 'Improve overall clarity and definition',
      custom_prompt: 'Custom audio enhancement with user-defined instructions',
    };
    
    return descriptions[type] || 'Enhance your audio with AI processing';
  },
};

export default api;