import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading SonicFix...' 
}) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#a855f7']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.centerContent}>
            {/* App Logo/Icon */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>
                🎵
              </Text>
            </View>
            
            {/* App Name */}
            <Text style={styles.appName}>
              SonicFix
            </Text>
            
            {/* Tagline */}
            <Text style={styles.tagline}>
              AI-Powered Audio Enhancement
            </Text>
            
            {/* Loading Spinner */}
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
            
            {/* Loading Message */}
            <Text style={styles.loadingMessage}>
              {message}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centerContent: {
    alignItems: 'center',
    gap: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
  },
  spinnerContainer: {
    marginTop: 32,
  },
  loadingMessage: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 16,
  },
});

export default LoadingScreen;