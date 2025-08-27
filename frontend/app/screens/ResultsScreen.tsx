import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { Share } from 'react-native';
import { RootState, AppDispatch } from '../store';
import { downloadResult } from '../store/slices/jobsSlice';
import { showSuccessNotification, showErrorNotification } from '../store/slices/uiSlice';
import { apiUtils } from '../utils/api';
import { RootStackParamList } from '../../App';
import { EnhancementType } from '../store/slices/jobsSlice';
import AudioPlayer from '../components/AudioPlayer';

type ResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Results'>;
type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

// API Configuration for audio URLs
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000' 
  : 'http://10.0.2.2:8000';

const ResultsScreen: React.FC = () => {
  const navigation = useNavigation<ResultsScreenNavigationProp>();
  const route = useRoute<ResultsScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { originalFileId, jobId } = route.params;
  
  const { jobs, isDownloading } = useSelector((state: RootState) => state.jobs);
  const { uploadedFiles } = useSelector((state: RootState) => state.audio);
  
  const [activeTab, setActiveTab] = useState<'original' | 'enhanced'>('enhanced');
  
  const currentFile = uploadedFiles.find(file => file.id === originalFileId);
  const currentJob = jobs.find(job => job.id === jobId);
  
  useEffect(() => {
    // Initialize audio players or fetch additional data if needed
  }, []);
  
  const getEnhancementInfo = (type: EnhancementType) => {
    switch (type) {
      case 'fix_quality':
        return {
          name: 'Fix Quality',
          description: 'Improves overall audio quality',
          icon: '🎯'
        };
      case 'remove_noise':
        return {
          name: 'Remove Noise',
          description: 'Removes background noise and unwanted sounds',
          icon: '🔇'
        };
      case 'studio_master':
        return {
          name: 'Studio Master',
          description: 'Professional studio-quality mastering',
          icon: '🎵'
        };
      case 'vocal_enhance':
        return {
          name: 'Vocal Enhance',
          description: 'Improves vocal clarity and presence',
          icon: '🎤'
        };
      case 'bass_boost':
        return {
          name: 'Bass Boost',
          description: 'Enhances low-frequency content',
          icon: '🔊'
        };
      case 'clarity_boost':
        return {
          name: 'Clarity Boost',
          description: 'Enhances high-frequency content and clarity',
          icon: '✨'
        };
      case 'custom_prompt':
        return {
          name: 'Custom Enhancement',
          description: 'Custom audio enhancement with user-defined prompt',
          icon: '📝'
        };
      default:
        return {
          name: 'Audio Enhancement',
          description: 'Professional audio processing applied',
          icon: '🎯'
        };
    }
  };
  
  const enhancementInfo = getEnhancementInfo(currentJob?.enhancementType || 'fix_quality');
  
  // Get audio URLs for original and enhanced files
  const getOriginalAudioUrl = () => {
    if (originalFileId) {
      return `${API_BASE_URL}/download/${originalFileId}`;
    }
    return null;
  };

  const getEnhancedAudioUrl = () => {
    if (currentJob?.resultFileId) {
      return `${API_BASE_URL}/download/${currentJob.resultFileId}`;
    }
    return null;
  };
  
  const handleDownload = async () => {
    if (!currentJob?.resultFileId) return;
    
    try {
      const result = await dispatch(downloadResult(currentJob.resultFileId));
      if (downloadResult.fulfilled.match(result)) {
        dispatch(showSuccessNotification({
          title: 'Download Complete',
          message: 'Enhanced audio downloaded successfully!'
        }));
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      dispatch(showErrorNotification({
        title: 'Download Failed',
        message: 'Failed to download enhanced audio. Please try again.'
      }));
    }
  };
  
  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Enhanced Audio',
            text: `Check out my enhanced audio processed with ${getEnhancementInfo(currentJob?.enhancementType || 'fix_quality').name} using AudioEddy!`
          });
        } else {
          await navigator.clipboard.writeText(
            `Check out my enhanced audio processed with ${getEnhancementInfo(currentJob?.enhancementType || 'fix_quality').name} using AudioEddy!`
          );
          dispatch(showSuccessNotification({
            title: 'Share Success',
            message: 'Link copied to clipboard!'
          }));
        }
      } else {
        await Share.share({
          message: `Check out my enhanced audio processed with ${getEnhancementInfo(currentJob?.enhancementType || 'fix_quality').name} using AudioEddy!`
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const handleNewEnhancement = () => {
    navigation.navigate('Upload');
  };
  
  // formatTime function removed - AudioPlayer handles time formatting internally
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {/* Success Header */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.successHeader}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Enhancement Complete!</Text>
              <Text style={styles.successSubtitle}>
                Your audio has been successfully enhanced
              </Text>
            </View>
            
            {/* File Info */}
            <View style={styles.fileInfoContainer}>
              <Text style={styles.sectionTitle}>File Info</Text>
              
              <View style={styles.fileInfoRow}>
                <Text style={styles.fileInfoLabel}>Original File:</Text>
                <Text style={styles.fileInfoValue}>{currentFile?.filename || 'Unknown'}</Text>
              </View>
              
              <View style={styles.fileInfoRow}>
                <Text style={styles.fileInfoLabel}>Size:</Text>
                <Text style={styles.fileInfoValue}>
                  {currentFile?.size ? `${(currentFile.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                </Text>
              </View>
              
              <View style={styles.fileInfoRow}>
                <Text style={styles.fileInfoLabel}>Status:</Text>
                <View style={[styles.badge, { backgroundColor: '#22c55e' }]}>
                  <Text style={styles.badgeText}>Ready</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        {/* Audio Comparison */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.sectionHeading}>Audio Comparison</Text>
            
            {/* Tab Selector */}
            <View style={styles.tabSelector}>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setActiveTab('original')}
              >
                <View style={[
                  styles.tab,
                  activeTab === 'original' ? styles.activeTab : styles.inactiveTab
                ]}>
                  <Text style={[
                    styles.tabText,
                    activeTab === 'original' ? styles.activeTabText : styles.inactiveTabText
                  ]}>
                    Original
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setActiveTab('enhanced')}
              >
                <View style={[
                  styles.tab,
                  activeTab === 'enhanced' ? styles.activeTab : styles.inactiveTab
                ]}>
                  <Text style={[
                    styles.tabText,
                    activeTab === 'enhanced' ? styles.activeTabText : styles.inactiveTabText
                  ]}>
                    Enhanced
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Audio Player */}
            <View style={styles.playerCard}>
              <View style={styles.playerContent}>
                {activeTab === 'original' && getOriginalAudioUrl() && (
                  <AudioPlayer
                    uri={getOriginalAudioUrl()!}
                    title="Original Audio"
                    subtitle={currentFile?.filename || 'Original file'}
                    showWaveform={true}
                    variant="full"
                  />
                )}
                
                {activeTab === 'enhanced' && getEnhancedAudioUrl() && (
                  <AudioPlayer
                    uri={getEnhancedAudioUrl()!}
                    title="Enhanced Audio"
                    subtitle={`Enhanced with ${enhancementInfo.name}`}
                    showWaveform={true}
                    variant="full"
                  />
                )}
                
                {/* Show message if audio not available */}
                {((activeTab === 'original' && !getOriginalAudioUrl()) || 
                  (activeTab === 'enhanced' && !getEnhancedAudioUrl())) && (
                  <View style={styles.noAudioContainer}>
                    <Text style={styles.noAudioText}>
                      {activeTab === 'original' ? 'Original audio not available' : 'Enhanced audio not ready'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Quick Compare */}
            <View style={styles.quickCompareContainer}>
              <TouchableOpacity
                style={[styles.button, styles.outlineButton, { flex: 1, marginRight: 8 }]}
                onPress={() => setActiveTab('original')}
                disabled={!getOriginalAudioUrl()}
              >
                <Text style={[styles.outlineButtonText, !getOriginalAudioUrl() && styles.disabledButtonText]}>
                  Play Original
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => setActiveTab('enhanced')}
                disabled={!getEnhancedAudioUrl()}
              >
                <Text style={[styles.primaryButtonText, !getEnhancedAudioUrl() && styles.disabledButtonText]}>
                  Play Enhanced
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Enhancement Details */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.sectionHeading}>Enhancement Applied</Text>
            
            <View style={styles.enhancementHeader}>
              <View style={styles.enhancementIcon}>
                <Text style={styles.enhancementEmoji}>{enhancementInfo.icon}</Text>
              </View>
              
              <View style={styles.enhancementDetails}>
                <Text style={styles.enhancementName}>
                  {enhancementInfo.name}
                </Text>
                <Text style={styles.enhancementDescription}>
                  {enhancementInfo.description}
                </Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            {/* Processing Stats */}
            <View style={styles.processingStats}>
              <Text style={styles.statsTitle}>
                Processing Details
              </Text>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Processing Time:</Text>
                <Text style={styles.statValue}>2m 34s</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Model Used:</Text>
                <Text style={styles.statValue}>SonicMaster AI</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Quality:</Text>
                <View style={styles.qualityBadge}>
                  <Text style={styles.qualityBadgeText}>Studio Quality</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, styles.largeButton, isDownloading && styles.disabledButton]}
            onPress={handleDownload}
            disabled={isDownloading}
          >
            <Text style={[styles.primaryButtonText, styles.largeButtonText]}>
              {isDownloading ? 'Downloading...' : 'Download Enhanced Audio'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={[styles.button, styles.outlineButton, { flex: 1, marginRight: 8 }]}
              onPress={handleShare}
            >
              <Text style={styles.outlineButtonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.outlineButton, { flex: 1, marginLeft: 8 }]}
              onPress={handleNewEnhancement}
            >
              <Text style={styles.outlineButtonText}>Enhance Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 16,
  },
  content: {
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    gap: 12,
  },
  successHeader: {
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22c55e',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  fileInfoContainer: {
    gap: 12,
  },
  fileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  fileInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#374151',
    fontWeight: '600',
  },
  inactiveTabText: {
    color: '#6b7280',
  },
  playerCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  playerContent: {
    gap: 16,
  },
  noAudioContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  noAudioText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  disabledButtonText: {
    opacity: 0.5,
  },
  quickCompareContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  enhancementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  enhancementIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancementEmoji: {
    fontSize: 24,
  },
  enhancementDetails: {
    flex: 1,
    gap: 4,
  },
  enhancementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  enhancementDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  processingStats: {
    gap: 12,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  qualityBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  actionButtons: {
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  largeButton: {
    paddingVertical: 16,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  outlineButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  largeButtonText: {
    fontSize: 16,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default ResultsScreen;