import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { RootState, AppDispatch } from '../store';
import { uploadAudioFile, generateWaveform } from '../store/slices/audioSlice';
import { startProcessing } from '../store/slices/jobsSlice';
import { showErrorNotification, showSuccessNotification } from '../store/slices/uiSlice';
import { apiUtils } from '../utils/api';
import { RootStackParamList } from '../../App';
import { EnhancementType } from '../store/slices/jobsSlice';
import { useTheme } from '../theme/ThemeContext';

type UploadScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Upload'>;

const UploadScreen: React.FC = () => {
  const navigation = useNavigation<UploadScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { currentFile, uploadProgress, error, isUploading } = useSelector((state: RootState) => state.audio);
  const { theme } = useTheme();
  const { isProcessing } = useSelector((state: RootState) => state.jobs);
  
  const [selectedEnhancement, setSelectedEnhancement] = useState<EnhancementType | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const enhancementOptions = [
    {
      type: 'fix_quality' as EnhancementType,
      icon: '🔧',
      name: 'Fix Quality',
      description: 'Repair audio issues, reduce distortion and improve clarity',
      color: '$primary600'
    },
    {
      type: 'remove_noise' as EnhancementType,
      icon: '🔇',
      name: 'Remove Noise',
      description: 'Eliminate background noise and unwanted artifacts',
      color: '$success600'
    },
    {
      type: 'studio_master' as EnhancementType,
      icon: '🎚️',
      name: 'Studio Master',
      description: 'Apply professional mastering for studio quality',
      color: '$secondary600'
    },
    {
      type: 'vocal_enhance' as EnhancementType,
      icon: '🎤',
      name: 'Vocal Enhance',
      description: 'Enhance vocal clarity and presence',
      color: '$warning600'
    },
    {
      type: 'bass_boost' as EnhancementType,
      icon: '🔊',
      name: 'Bass Boost',
      description: 'Enhance low frequencies and bass response',
      color: '$error600'
    },
    {
      type: 'clarity_boost' as EnhancementType,
      icon: '✨',
      name: 'Clarity Boost',
      description: 'Improve overall clarity and definition',
      color: '$info600'
    },
    {
      type: 'custom_prompt' as EnhancementType,
      icon: '📝',
      name: 'Custom Prompt',
      description: 'Use your own enhancement instructions',
      color: '$purple600'
    },
  ];

  useEffect(() => {
    if (currentFile && !currentFile.waveformData) {
      // Generate waveform for uploaded file
      dispatch(generateWaveform(currentFile.uri || ''));
    }
  }, [currentFile, dispatch]);

  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Validate file size (max 50MB for MVP)
        if (file.size && file.size > 50 * 1024 * 1024) {
          dispatch(showErrorNotification({
            title: 'File Too Large',
            message: 'Please select a file smaller than 50MB'
          }));
          return;
        }

        // Upload file
        dispatch(uploadAudioFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'audio/wav'
        }));
      }
    } catch (error) {
      dispatch(showErrorNotification({
        title: 'Upload Failed',
        message: 'Failed to select or upload file'
      }));
    }
  };

  const handleDrop = (event: any) => {
    if (Platform.OS !== 'web') return;
    
    event.preventDefault();
    setDragActive(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        dispatch(showErrorNotification({
          title: 'Invalid File Type',
          message: 'Please select an audio file'
        }));
        return;
      }
      
      // Validate file size
      if (file.size > 50 * 1024 * 1024) {
        dispatch(showErrorNotification({
          title: 'File Too Large',
          message: 'Please select a file smaller than 50MB'
        }));
        return;
      }

      // Upload file
      dispatch(uploadAudioFile({
        uri: URL.createObjectURL(file),
        name: file.name,
        type: file.type
      }));
    }
  };

  const handleDragOver = (event: any) => {
    if (Platform.OS !== 'web') return;
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    if (Platform.OS !== 'web') return;
    setDragActive(false);
  };

  const handleStartProcessing = async () => {
    if (!currentFile || !selectedEnhancement) return;

    try {
      const result = await dispatch(startProcessing({
        fileId: currentFile.id,
        enhancementType: selectedEnhancement
      }));

      if (startProcessing.fulfilled.match(result)) {
        dispatch(showSuccessNotification({
          title: 'Processing Started',
          message: 'Your audio is being enhanced. This may take a few minutes.'
        }));

        navigation.navigate('Processing', {
          fileId: currentFile.id,
          enhancementType: selectedEnhancement
        });
      } else {
        throw new Error('Failed to start processing');
      }
    } catch (error: any) {
      dispatch(showErrorNotification({
        title: 'Processing Failed',
        message: error.message || 'Failed to start processing'
      }));
    }
  };

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: theme.colors.background,
    },
    card: {
      ...styles.card,
      backgroundColor: theme.colors.card,
    },
    heading: {
      ...styles.heading,
      color: theme.colors.text,
    },
    uploadTitle: {
      ...styles.uploadTitle,
      color: theme.colors.text,
    },
    uploadSubtitle: {
      ...styles.uploadSubtitle,
      color: theme.colors.textSecondary,
    },
    uploadInfo: {
      ...styles.uploadInfo,
      color: theme.colors.textSecondary,
    },
    fileName: {
      ...styles.fileName,
      color: theme.colors.text,
    },
    fileSize: {
      ...styles.fileSize,
      color: theme.colors.textSecondary,
    },
    progressText: {
      ...styles.progressText,
      color: theme.colors.textSecondary,
    },
    enhancementName: {
      ...styles.enhancementName,
      color: theme.colors.text,
    },
    enhancementDescription: {
      ...styles.enhancementDescription,
      color: theme.colors.textSecondary,
    },
  };

  return (
    <ScrollView style={dynamicStyles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Upload Section */}
        <View style={dynamicStyles.card}>
          <View style={styles.cardContent}>
            <Text style={dynamicStyles.heading}>Upload Audio File</Text>
            
            {!currentFile ? (
              <TouchableOpacity
                onPress={handleFilePicker}
              >
                <View style={[
                  styles.uploadArea,
                  dragActive && styles.uploadAreaActive
                ]}>
                  <View style={styles.uploadContent}>
                    <View style={styles.iconContainer}>
                      <Text style={styles.icon}>📁</Text>
                    </View>
                    
                    <View style={styles.textContainer}>
                      <Text style={dynamicStyles.uploadTitle}>
                        {dragActive ? 'Drop your file here' : 'Choose Audio File'}
                      </Text>
                      <Text style={dynamicStyles.uploadSubtitle}>
                        {Platform.OS === 'web' 
                          ? 'Drag and drop or click to browse'
                          : 'Tap to browse your files'
                        }
                      </Text>
                      <Text style={dynamicStyles.uploadInfo}>
                        Supports MP3, WAV, FLAC, M4A (Max 50MB)
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.fileCard}>
                <View style={styles.fileInfo}>
                  <View style={styles.fileIcon}>
                    <Text style={styles.fileIconText}>🎵</Text>
                  </View>
                  
                  <View style={styles.fileDetails}>
                    <Text style={dynamicStyles.fileName} numberOfLines={1}>
                      {currentFile.filename}
                    </Text>
                    <Text style={dynamicStyles.fileSize}>
                      {apiUtils.formatFileSize(currentFile.size)}
                    </Text>
                  </View>
                  
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Uploaded</Text>
                  </View>
                </View>
              </View>
            )}
            
            {/* Upload Progress */}
            {isUploading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={dynamicStyles.progressText}>Uploading...</Text>
                  <Text style={dynamicStyles.progressText}>{uploadProgress}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                </View>
              </View>
            )}
            
            {/* Error Display */}
            {error && (
              <View style={styles.errorAlert}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Enhancement Selection */}
        {currentFile && (
          <View style={dynamicStyles.card}>
            <View style={styles.cardContent}>
              <Text style={dynamicStyles.heading}>Choose Enhancement</Text>
              
              <View style={styles.enhancementList}>
                {enhancementOptions.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    onPress={() => {
                      if (option.type === 'custom_prompt') {
                        navigation.navigate('CustomPrompt', {
                          fileId: currentFile.id,
                          fileName: currentFile.filename,
                        });
                      } else {
                        setSelectedEnhancement(option.type);
                      }
                    }}
                  >
                    <View style={[
                      styles.enhancementCard,
                      selectedEnhancement === option.type && styles.enhancementCardSelected
                    ]}>
                      <View style={styles.enhancementContent}>
                        <View style={[
                          styles.enhancementIcon,
                          selectedEnhancement === option.type && styles.enhancementIconSelected
                        ]}>
                          <Text style={styles.enhancementIconText}>{option.icon}</Text>
                        </View>
                        
                        <View style={styles.enhancementDetails}>
                          <Text style={[
                            dynamicStyles.enhancementName,
                            selectedEnhancement === option.type && styles.enhancementNameSelected
                          ]}>
                            {option.name}
                          </Text>
                          <Text style={[
                            dynamicStyles.enhancementDescription,
                            selectedEnhancement === option.type && styles.enhancementDescriptionSelected
                          ]}>
                            {option.description}
                          </Text>
                        </View>
                        
                        {selectedEnhancement === option.type && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Action Button */}
        {currentFile && selectedEnhancement && (
          <TouchableOpacity
            style={[styles.actionButton, isProcessing && styles.actionButtonDisabled]}
            onPress={handleStartProcessing}
            disabled={isProcessing}
          >
            <Text style={styles.actionButtonText}>
              {isProcessing ? 'Starting...' : 'Start Enhancement'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  content: {
    gap: 24,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    gap: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  uploadAreaActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  uploadContent: {
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  uploadSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  uploadInfo: {
    fontSize: 12,
  },
  fileCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fileIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIconText: {
    fontSize: 20,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 14,
  },
  badge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  enhancementList: {
    gap: 12,
  },
  enhancementCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  enhancementCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  enhancementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  enhancementIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancementIconSelected: {
    backgroundColor: '#dbeafe',
  },
  enhancementIconText: {
    fontSize: 20,
  },
  enhancementDetails: {
    flex: 1,
  },
  enhancementName: {
    fontSize: 16,
    fontWeight: '600',
  },
  enhancementNameSelected: {
    color: '#1d4ed8',
  },
  enhancementDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  enhancementDescriptionSelected: {
    color: '#2563eb',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UploadScreen;