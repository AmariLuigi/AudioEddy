import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { showInfoNotification } from '../store/slices/uiSlice';
import { apiUtils } from '../utils/api';
import { RootStackParamList } from '../../App';
import { useTheme } from '../theme/ThemeContext';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { uploadedFiles } = useSelector((state: RootState) => state.audio);
  const { jobs } = useSelector((state: RootState) => state.jobs);
  const { networkStatus } = useSelector((state: RootState) => state.ui);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Check API connection on mount
    checkAPIConnection();
  }, []);

  const checkAPIConnection = async () => {
    const isConnected = await apiUtils.checkConnection();
    if (!isConnected) {
      dispatch(showInfoNotification({
        title: 'Connection Issue',
        message: 'Unable to connect to SonicFix servers. Some features may be limited.'
      }));
    }
  };

  const handleGetStarted = () => {
    navigation.navigate('Upload');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const recentJobs = jobs.slice(-3).reverse();
  const completedJobs = jobs.filter(job => job.status === 'completed').length;
  const processingJobs = jobs.filter(job => job.status === 'processing').length;

  const dynamicStyles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    mainTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      color: theme.colors.text,
    },
    mainDescription: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    enhancementName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    enhancementDesc: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    recentName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    recentDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="light" />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>
                SonicFix
              </Text>
              <Text style={styles.subtitle}>
                AI Audio Enhancement
              </Text>
            </View>
            
            <View style={styles.headerActions}>
              <View style={[
                styles.badge,
                networkStatus === 'online' ? styles.badgeOnline : styles.badgeOffline
              ]}>
                <Text style={[
                  styles.badgeText,
                  networkStatus === 'online' ? styles.badgeTextOnline : styles.badgeTextOffline
                ]}>
                  {networkStatus === 'online' ? 'Online' : 'Offline'}
                </Text>
              </View>
              
              {isAuthenticated ? (
                <TouchableOpacity style={styles.headerButton} onPress={handleProfile}>
                  <Text style={styles.headerButtonText}>👤</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.headerButton} onPress={handleLogin}>
                  <Text style={styles.headerButtonText}>Login</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {isAuthenticated && user && (
            <View style={styles.welcomeRow}>
              <Text style={styles.welcomeText}>
                Welcome back, {user.name || user.email}!
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={[styles.scrollView, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={[dynamicStyles.card, styles.statCard]}>
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>
                  {uploadedFiles.length}
                </Text>
                <Text style={dynamicStyles.statLabel}>
                  Files Uploaded
                </Text>
              </View>
            </View>
            
            <View style={[dynamicStyles.card, styles.statCard]}>
              <View style={styles.statContent}>
                <Text style={[styles.statNumber, styles.successText]}>
                  {completedJobs}
                </Text>
                <Text style={dynamicStyles.statLabel}>
                  Enhanced
                </Text>
              </View>
            </View>
            
            <View style={[dynamicStyles.card, styles.statCard]}>
              <View style={styles.statContent}>
                <Text style={[styles.statNumber, styles.warningText]}>
                  {processingJobs}
                </Text>
                <Text style={dynamicStyles.statLabel}>
                  Processing
                </Text>
              </View>
            </View>
          </View>

          {/* Main Action */}
          <View style={[dynamicStyles.card, styles.mainCard]}>
            <View style={styles.mainContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>🎵</Text>
              </View>
              
              <View style={styles.textContent}>
                <Text style={dynamicStyles.mainTitle}>
                  Enhance Your Audio
                </Text>
                <Text style={dynamicStyles.mainDescription}>
                  Upload your audio files and let our AI enhance them with professional quality processing
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.getStartedButton}
                onPress={handleGetStarted}
              >
                <Text style={styles.getStartedText}>
                  Get Started
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Enhancement Types */}
          <View style={[dynamicStyles.card, styles.enhancementCard]}>
            <View style={styles.enhancementContent}>
              <Text style={dynamicStyles.sectionTitle}>Enhancement Options</Text>
              
              <View style={styles.enhancementList}>
                {[
                  { type: 'fix_quality', icon: '🔧', name: 'Fix Quality', desc: 'Repair audio issues and distortion' },
                  { type: 'remove_noise', icon: '🔇', name: 'Remove Noise', desc: 'Eliminate background noise' },
                  { type: 'studio_master', icon: '🎚️', name: 'Studio Master', desc: 'Professional mastering quality' },
                  { type: 'vocal_enhance', icon: '🎤', name: 'Vocal Enhance', desc: 'Improve vocal clarity' },
                ].map((enhancement) => (
                  <View key={enhancement.type} style={styles.enhancementItem}>
                    <View style={styles.enhancementIcon}>
                      <Text style={styles.enhancementIconText}>{enhancement.icon}</Text>
                    </View>
                    
                    <View style={styles.enhancementText}>
                      <Text style={dynamicStyles.enhancementName}>
                        {enhancement.name}
                      </Text>
                      <Text style={dynamicStyles.enhancementDesc}>
                        {enhancement.desc}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          {recentJobs.length > 0 && (
            <View style={[dynamicStyles.card, styles.recentCard]}>
              <View style={styles.recentContent}>
                <Text style={dynamicStyles.sectionTitle}>Recent Activity</Text>
                
                <View style={styles.recentList}>
                  {recentJobs.map((job) => (
                    <View key={job.id} style={styles.recentItem}>
                      <View style={[
                        styles.statusBadge,
                        job.status === 'completed' ? styles.statusSuccess :
                        job.status === 'processing' ? styles.statusWarning :
                        job.status === 'failed' ? styles.statusError : styles.statusInfo
                      ]}>
                        <Text style={styles.statusText}>
                          {job.status.toUpperCase()}
                        </Text>
                      </View>
                      
                      <View style={styles.recentText}>
                        <Text style={dynamicStyles.recentName}>
                          {apiUtils.getEnhancementDisplayName(job.enhancementType)}
                        </Text>
                        <Text style={dynamicStyles.recentDate}>
                          {new Date(job.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      
                      {job.status === 'processing' && (
                        <Text style={styles.progressText}>
                          {Math.round(job.progress)}%
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 40,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  welcomeRow: {
    marginTop: 12,
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeOnline: {
    backgroundColor: '#10b981',
  },
  badgeOffline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextOnline: {
    color: '#ffffff',
  },
  badgeTextOffline: {
    color: '#ef4444',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  section: {
    gap: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  statCard: {
    flex: 1,
    padding: 16,
  },
  statContent: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  successText: {
    color: '#10b981',
  },
  warningText: {
    color: '#f59e0b',
  },

  mainCard: {
    padding: 24,
  },
  mainContent: {
    alignItems: 'center',
    gap: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 32,
  },
  textContent: {
    alignItems: 'center',
    gap: 8,
  },

  getStartedButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  getStartedText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  enhancementCard: {
    padding: 24,
  },
  enhancementContent: {
    gap: 24,
  },

  enhancementList: {
    gap: 16,
  },
  enhancementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  enhancementIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancementIconText: {
    fontSize: 18,
  },
  enhancementText: {
    flex: 1,
  },
  enhancementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  enhancementDesc: {
    fontSize: 14,
    color: '#6b7280',
  },
  recentCard: {
    padding: 24,
  },
  recentContent: {
    gap: 24,
  },
  recentList: {
    gap: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusSuccess: {
    backgroundColor: '#10b981',
  },
  statusWarning: {
    backgroundColor: '#f59e0b',
  },
  statusError: {
    backgroundColor: '#ef4444',
  },
  statusInfo: {
    backgroundColor: '#6366f1',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  recentText: {
    flex: 1,
  },

  progressText: {
    fontSize: 14,
    color: '#f59e0b',
  },
});

export default HomeScreen;