import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { AudioVisualizer } from 'react-audio-visualize';

interface AudioPlayerProps {
  uri: string;
  title?: string;
  subtitle?: string;
  showWaveform?: boolean;
  onPlaybackStatusUpdate?: (status: any) => void;
  autoPlay?: boolean;
  variant?: 'compact' | 'full';
}

interface PlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  volume: number;
  isBuffering: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  uri,
  title,
  subtitle,
  showWaveform = false,
  onPlaybackStatusUpdate,
  autoPlay = false,
  variant = 'full'
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>({
    isLoaded: false,
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
    volume: 1.0,
    isBuffering: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  
  // Web audio context for web platform
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    loadAudio();
    
    return () => {
      unloadAudio();
    };
  }, [uri]);
  
  useEffect(() => {
    if (autoPlay && status.isLoaded && !status.isPlaying) {
      playAudio();
    }
  }, [autoPlay, status.isLoaded]);
  
  useEffect(() => {
    if (showWaveform && uri && Platform.OS === 'web') {
      fetchAudioBlob();
    }
  }, [uri, showWaveform]);
  
  const loadAudio = async () => {
    try {
      setIsLoading(true);
      
      if (Platform.OS === 'web') {
        // Web implementation
        const audio = new window.Audio(uri);
        audioElementRef.current = audio;
        
        audio.addEventListener('loadedmetadata', () => {
          setStatus(prev => ({
            ...prev,
            isLoaded: true,
            durationMillis: audio.duration * 1000
          }));
        });
        
        audio.addEventListener('timeupdate', () => {
          setStatus(prev => ({
            ...prev,
            positionMillis: audio.currentTime * 1000
          }));
        });
        
        audio.addEventListener('play', () => {
          setStatus(prev => ({ ...prev, isPlaying: true }));
        });
        
        audio.addEventListener('pause', () => {
          setStatus(prev => ({ ...prev, isPlaying: false }));
        });
        
        audio.addEventListener('ended', () => {
          setStatus(prev => ({ ...prev, isPlaying: false, positionMillis: 0 }));
        });
        
        audio.load();
      } else {
        // React Native implementation
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false, isLooping: false },
          onPlaybackStatusUpdate
        );
        
        setSound(newSound);
        
        const initialStatus = await newSound.getStatusAsync();
        if (initialStatus.isLoaded) {
          setStatus({
            isLoaded: true,
            isPlaying: initialStatus.isPlaying || false,
            positionMillis: initialStatus.positionMillis || 0,
            durationMillis: initialStatus.durationMillis || 0,
            volume: initialStatus.volume || 1.0,
            isBuffering: initialStatus.isBuffering || false
          });
        }
      }
    } catch (error) {
      console.error('Error loading audio:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const unloadAudio = async () => {
    try {
      if (Platform.OS === 'web') {
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current = null;
        }
      } else {
        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }
      }
      
      // Clear blob state to reset waveform
      setBlob(null);
      
      setStatus({
        isLoaded: false,
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 0,
        volume: 1.0,
        isBuffering: false
      });
    } catch (error) {
      console.error('Error unloading audio:', error);
    }
  };
  
  const playAudio = async () => {
    try {
      if (Platform.OS === 'web') {
        if (audioElementRef.current) {
          await audioElementRef.current.play();
        }
      } else {
        if (sound) {
          await sound.playAsync();
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };
  
  const pauseAudio = async () => {
    try {
      if (Platform.OS === 'web') {
        if (audioElementRef.current) {
          audioElementRef.current.pause();
        }
      } else {
        if (sound) {
          await sound.pauseAsync();
        }
      }
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };
  
  const seekTo = async (positionMillis: number) => {
    try {
      if (Platform.OS === 'web') {
        if (audioElementRef.current) {
          audioElementRef.current.currentTime = positionMillis / 1000;
        }
      } else {
        if (sound) {
          await sound.setPositionAsync(positionMillis);
        }
      }
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  };
  
  const setVolume = async (volume: number) => {
    try {
      if (Platform.OS === 'web') {
        if (audioElementRef.current) {
          audioElementRef.current.volume = volume;
        }
      } else {
        if (sound) {
          await sound.setVolumeAsync(volume);
        }
      }
      
      setStatus(prev => ({ ...prev, volume }));
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };
  
  const fetchAudioBlob = async () => {
    try {
      // Clear previous blob first
      setBlob(null);
      
      const response = await fetch(uri);
      const audioBlob = await response.blob();
      setBlob(audioBlob);
    } catch (error) {
      console.error('Error fetching audio blob:', error);
      setBlob(null);
    }
  };
  
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const getProgressPercentage = () => {
    if (status.durationMillis === 0) return 0;
    return (status.positionMillis / status.durationMillis) * 100;
  };

  // Render AudioVisualizer for web platform
  const renderWaveform = () => {
    if (!showWaveform || Platform.OS !== 'web' || !blob) return null;
    
    if (Platform.OS === 'web') {
      return React.createElement(AudioVisualizer, {
        blob: blob,
        width: 300,
        height: 80,
        barWidth: 2,
        gap: 1,
        barColor: '#d1d5db',
        barPlayedColor: '#3b82f6',
        currentTime: status.positionMillis / 1000,
        style: { borderRadius: 8 }
      });
    }
    
    return null;
  };
  
  const handlePlayPause = () => {
    if (status.isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };
  
  const handleSliderChange = (value: number[]) => {
    const newPosition = (value[0] / 100) * status.durationMillis;
    seekTo(newPosition);
  };
  
  if (variant === 'compact') {
    return (
      <View style={styles.compactCard}>
        <View style={styles.compactContainer}>
          <TouchableOpacity 
            onPress={handlePlayPause} 
            disabled={!status.isLoaded || isLoading}
            style={[
              styles.compactPlayButton,
              { backgroundColor: status.isLoaded ? '#3b82f6' : '#d1d5db' }
            ]}
          >
            <Text style={styles.compactPlayButtonText}>
              {isLoading ? '⏳' : status.isPlaying ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.compactInfo}>
            {title && (
              <Text style={styles.compactTitle} numberOfLines={1}>
                {title}
              </Text>
            )}
            <View style={styles.compactTimeContainer}>
              <Text style={styles.compactTimeText}>
                {formatTime(status.positionMillis)}
              </Text>
              <Text style={styles.compactTimeText}>
                {formatTime(status.durationMillis)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.fullCard}>
      <View style={styles.fullContainer}>
        {/* Title and Subtitle */}
        {(title || subtitle) && (
          <View style={styles.titleContainer}>
            {title && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        )}
        
        {/* Waveform */}
        {showWaveform && Platform.OS === 'web' && (
          <View style={styles.waveformContainer}>
            {blob ? (
              renderWaveform()
            ) : (
              <View style={styles.waveformLoading}>
                <Text style={styles.waveformLoadingText}>Loading waveform...</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Progress Slider */}
        <View style={styles.progressContainer}>
          <Slider
            style={styles.progressSlider}
            value={getProgressPercentage()}
            onValueChange={(value) => handleSliderChange([value])}
            disabled={!status.isLoaded}
            minimumValue={0}
            maximumValue={100}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor="#3b82f6"
          />
          
          <View style={styles.timeLabels}>
            <Text style={styles.timeText}>
              {formatTime(status.positionMillis)}
            </Text>
            <Text style={styles.timeText}>
              {formatTime(status.durationMillis)}
            </Text>
          </View>
        </View>
        
        {/* Controls */}
        <View style={styles.controlsContainer}>
          {/* Previous (placeholder) */}
          <TouchableOpacity disabled style={styles.controlButtonDisabled}>
            <Text style={styles.controlButtonTextDisabled}>⏮️</Text>
          </TouchableOpacity>
          
          {/* Play/Pause */}
          <TouchableOpacity 
            onPress={handlePlayPause} 
            disabled={!status.isLoaded || isLoading}
            style={[
              styles.playButton,
              { backgroundColor: status.isLoaded ? '#3b82f6' : '#d1d5db' }
            ]}
          >
            <Text style={styles.playButtonText}>
              {isLoading ? '⏳' : status.isPlaying ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>
          
          {/* Next (placeholder) */}
          <TouchableOpacity disabled style={styles.controlButtonDisabled}>
            <Text style={styles.controlButtonTextDisabled}>⏭️</Text>
          </TouchableOpacity>
        </View>
        
        {/* Volume Control */}
        <View style={styles.volumeContainer}>
          <Text style={styles.volumeIcon}>🔊</Text>
          <Slider
            style={styles.volumeSlider}
            value={status.volume * 100}
            onValueChange={(value) => setVolume(value / 100)}
            minimumValue={0}
            maximumValue={100}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor="#3b82f6"
          />
          <Text style={styles.volumeText}>
            {Math.round(status.volume * 100)}%
          </Text>
        </View>
        
        {/* Status Indicators */}
        {(status.isBuffering || isLoading) && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {isLoading ? 'Loading...' : 'Buffering...'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact variant styles
  compactCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactPlayButtonText: {
    color: 'white',
    fontSize: 16,
  },
  compactInfo: {
    flex: 1,
    gap: 4,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  compactTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactTimeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  
  // Full variant styles
  fullCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullContainer: {
    gap: 16,
  },
  titleContainer: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  waveformContainer: {
    height: 80,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformLoadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  progressContainer: {
    gap: 8,
  },
  progressSlider: {
    height: 40,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  controlButtonDisabled: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonTextDisabled: {
    color: '#9ca3af',
    fontSize: 16,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: 'white',
    fontSize: 20,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  volumeIcon: {
    fontSize: 14,
    color: '#6b7280',
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  volumeText: {
    fontSize: 14,
    color: '#6b7280',
    width: 40,
    textAlign: 'right',
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default AudioPlayer;