import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as Progress from 'react-native-progress';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { checkJobStatus } from '../store/slices/jobsSlice';
import { showErrorNotification } from '../store/slices/uiSlice';
import { apiUtils } from '../utils/api';
import { RootStackParamList } from '../../App';
import { JobStatus, EnhancementType } from '../store/slices/jobsSlice';

type ProcessingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Processing'>;
type ProcessingScreenRouteProp = RouteProp<RootStackParamList, 'Processing'>;

const ProcessingScreen: React.FC = () => {
  const navigation = useNavigation<ProcessingScreenNavigationProp>();
  const route = useRoute<ProcessingScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { fileId, enhancementType } = route.params;
  
  const { currentJob, isProcessing, error } = useSelector((state: RootState) => state.jobs);
  const { uploadedFiles } = useSelector((state: RootState) => state.audio);
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(120); // 2 minutes default
  
  const currentFile = uploadedFiles.find(file => file.id === fileId);
  
  useEffect(() => {
    // Start polling for job status
    const pollInterval = setInterval(() => {
      if (currentJob?.id) {
        dispatch(checkJobStatus(currentJob.id));
      }
    }, 2000); // Poll every 2 seconds
    
    return () => clearInterval(pollInterval);
  }, [currentJob?.id, dispatch]);
  
  useEffect(() => {
    // Timer for elapsed time
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    // Navigate to results when job is completed
    if (currentJob?.status === 'completed' && currentJob) {
      navigation.replace('Results', {
        jobId: currentJob.id,
        originalFileId: fileId
      });
    }
  }, [currentJob?.status, navigation, fileId, enhancementType, currentJob?.id]);
  
  const getProgressPercentage = () => {
    if (!currentJob) return 0;
    
    switch (currentJob.status) {
      case 'pending':
        return 10;
      case 'processing':
        return Math.min(90, 10 + (elapsedTime / estimatedTime) * 80);
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  };
  
  const getStatusText = () => {
    if (!currentJob) return 'Initializing...';
    
    switch (currentJob.status) {
      case 'pending':
        return 'Preparing audio for enhancement...';
      case 'processing':
        return 'Applying AI enhancement...';
      case 'completed':
        return 'Enhancement completed!';
      case 'failed':
        return 'Enhancement failed';
      default:
        return 'Processing...';
    }
  };
  
  const getEnhancementInfo = (type: EnhancementType) => {
    const enhancementMap = {
      fix_quality: {
        icon: '🔧',
        name: 'Fix Quality',
        description: 'Repairing audio issues and improving clarity'
      },
      remove_noise: {
        icon: '🔇',
        name: 'Remove Noise',
        description: 'Eliminating background noise and artifacts'
      },
      studio_master: {
        icon: '🎚️',
        name: 'Studio Master',
        description: 'Applying professional mastering techniques'
      },
      vocal_enhance: {
        icon: '🎤',
        name: 'Vocal Enhance',
        description: 'Enhancing vocal clarity and presence'
      },
      bass_boost: {
        icon: '🔊',
        name: 'Bass Boost',
        description: 'Enhancing low frequencies and bass response'
      },
      clarity_boost: {
        icon: '✨',
        name: 'Clarity Boost',
        description: 'Improving overall clarity and definition'
      },
      custom_prompt: {
        icon: '📝',
        name: 'Custom Enhancement',
        description: 'Applying custom enhancement instructions'
      }
    };
    
    return enhancementMap[type] || enhancementMap.fix_quality;
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleCancel = () => {
    // TODO: Implement job cancellation
    navigation.goBack();
  };
  
  const enhancementInfo = getEnhancementInfo(enhancementType as EnhancementType);
  const progressPercentage = getProgressPercentage();
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.card}>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>{enhancementInfo.icon}</Text>
            </View>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.heading}>
                {enhancementInfo.name}
              </Text>
              <Text style={styles.description}>
                {enhancementInfo.description}
              </Text>
            </View>
          </View>
        </View>
        
        {/* File Info */}
        {currentFile && (
          <View style={styles.card}>
            <View style={styles.fileInfoContainer}>
              <View style={styles.fileIcon}>
                <Text style={styles.fileIconText}>🎵</Text>
              </View>
              
              <View style={styles.fileDetails}>
                <Text style={styles.filename} numberOfLines={1}>
                  {currentFile.filename}
                </Text>
                <Text style={styles.fileSize}>
                  {apiUtils.formatFileSize(currentFile.size)}
                </Text>
              </View>
              
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Processing</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Progress Section */}
        <View style={[styles.card, styles.progressCard]}>
          <View style={styles.progressContent}>
            {/* Status */}
            <View style={styles.statusContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.statusText}>
                {getStatusText()}
              </Text>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  Progress
                </Text>
                <Text style={styles.progressLabel}>
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
              <Progress.Bar 
                progress={progressPercentage / 100} 
                width={null} 
                height={8} 
                color="#007AFF" 
                unfilledColor="#E5E5EA" 
                borderWidth={0}
                borderRadius={4}
              />
            </View>
            
            {/* Time Info */}
            <View style={styles.timeInfoContainer}>
              <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>
                  Elapsed
                </Text>
                <Text style={styles.timeValue}>
                  {formatTime(elapsedTime)}
                </Text>
              </View>
              
              <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>
                  Estimated
                </Text>
                <Text style={styles.timeValue}>
                  {formatTime(estimatedTime)}
                </Text>
              </View>
            </View>
            
            {/* Processing Steps */}
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsTitle}>
                Processing Steps:
              </Text>
              
              <View style={styles.stepsList}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepIndicator,
                    { backgroundColor: progressPercentage > 10 ? '#34C759' : '#C7C7CC' }
                  ]} />
                  <Text style={[
                    styles.stepText,
                    { color: progressPercentage > 10 ? '#34C759' : '#8E8E93' }
                  ]}>
                    Audio Analysis
                  </Text>
                </View>
                
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepIndicator,
                    { backgroundColor: progressPercentage > 30 ? '#34C759' : '#C7C7CC' }
                  ]} />
                  <Text style={[
                    styles.stepText,
                    { color: progressPercentage > 30 ? '#34C759' : '#8E8E93' }
                  ]}>
                    AI Model Processing
                  </Text>
                </View>
                
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepIndicator,
                    { backgroundColor: progressPercentage > 70 ? '#34C759' : '#C7C7CC' }
                  ]} />
                  <Text style={[
                    styles.stepText,
                    { color: progressPercentage > 70 ? '#34C759' : '#8E8E93' }
                  ]}>
                    Enhancement Application
                  </Text>
                </View>
                
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepIndicator,
                    { backgroundColor: progressPercentage >= 100 ? '#34C759' : '#C7C7CC' }
                  ]} />
                  <Text style={[
                    styles.stepText,
                    { color: progressPercentage >= 100 ? '#34C759' : '#8E8E93' }
                  ]}>
                    Final Optimization
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel Processing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileIconText: {
    fontSize: 18,
  },
  fileDetails: {
    flex: 1,
  },
  filename: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#8E8E93',
  },
  badge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressCard: {
    flex: 1,
  },
  progressContent: {
    flex: 1,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginTop: 12,
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  timeInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    paddingVertical: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  timeInfo: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  stepsContainer: {
    flex: 1,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  stepsList: {
    flex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#D32F2F',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProcessingScreen;