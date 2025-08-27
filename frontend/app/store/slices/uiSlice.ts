import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  theme: 'light' | 'dark' | 'auto';
  isLoading: boolean;
  loadingMessage: string;
  showWaveform: boolean;
  audioPlayerExpanded: boolean;
  notifications: Notification[];
  activeModal: string | null;
  networkStatus: 'online' | 'offline';
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  autoHide?: boolean;
  duration?: number;
}

const initialState: UIState = {
  theme: 'auto',
  isLoading: false,
  loadingMessage: '',
  showWaveform: true,
  audioPlayerExpanded: false,
  notifications: [],
  activeModal: null,
  networkStatus: 'online',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload;
    },
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || '';
    },
    toggleWaveform: (state) => {
      state.showWaveform = !state.showWaveform;
    },
    setWaveformVisibility: (state, action: PayloadAction<boolean>) => {
      state.showWaveform = action.payload;
    },
    toggleAudioPlayer: (state) => {
      state.audioPlayerExpanded = !state.audioPlayerExpanded;
    },
    setAudioPlayerExpanded: (state, action: PayloadAction<boolean>) => {
      state.audioPlayerExpanded = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        autoHide: action.payload.autoHide ?? true,
        duration: action.payload.duration ?? 5000,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setActiveModal: (state, action: PayloadAction<string | null>) => {
      state.activeModal = action.payload;
    },
    setNetworkStatus: (state, action: PayloadAction<'online' | 'offline'>) => {
      state.networkStatus = action.payload;
    },
    // Convenience actions for common notifications
    showSuccessNotification: (state, action: PayloadAction<{ title: string; message: string }>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        type: 'success',
        timestamp: new Date().toISOString(),
        autoHide: true,
        duration: 4000,
      };
      state.notifications.push(notification);
    },
    showErrorNotification: (state, action: PayloadAction<{ title: string; message: string }>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        type: 'error',
        timestamp: new Date().toISOString(),
        autoHide: false, // Errors should be manually dismissed
      };
      state.notifications.push(notification);
    },
    showWarningNotification: (state, action: PayloadAction<{ title: string; message: string }>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        type: 'warning',
        timestamp: new Date().toISOString(),
        autoHide: true,
        duration: 6000,
      };
      state.notifications.push(notification);
    },
    showInfoNotification: (state, action: PayloadAction<{ title: string; message: string }>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        type: 'info',
        timestamp: new Date().toISOString(),
        autoHide: true,
        duration: 5000,
      };
      state.notifications.push(notification);
    },
  },
});

export const {
  setTheme,
  setLoading,
  toggleWaveform,
  setWaveformVisibility,
  toggleAudioPlayer,
  setAudioPlayerExpanded,
  addNotification,
  removeNotification,
  clearNotifications,
  setActiveModal,
  setNetworkStatus,
  showSuccessNotification,
  showErrorNotification,
  showWarningNotification,
  showInfoNotification,
} = uiSlice.actions;

export default uiSlice.reducer;