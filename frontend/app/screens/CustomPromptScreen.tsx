import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { showSuccessNotification, showErrorNotification } from '../store/slices/uiSlice';
import { setCurrentJob } from '../store/slices/jobsSlice';
import { audioAPI } from '../utils/api';
import { RootStackParamList } from '../../App';
import { useTheme } from '../theme/ThemeContext';

type CustomPromptScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CustomPrompt'>;
type CustomPromptScreenRouteProp = RouteProp<RootStackParamList, 'CustomPrompt'>;

const CustomPromptScreen: React.FC = () => {
  const navigation = useNavigation<CustomPromptScreenNavigationProp>();
  const route = useRoute<CustomPromptScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useTheme();
  
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { fileId, fileName } = route.params;

  // Predefined prompt suggestions
  const promptSuggestions = [
    "Fix audio quality issues, reduce distortion and improve clarity",
    "Remove background noise and unwanted artifacts while preserving the main audio",
    "Apply professional mastering, reduce noise and fix clipping for studio quality",
    "Enhance vocal clarity and presence, reduce sibilance and improve intelligibility",
    "Enhance low frequencies and bass response while maintaining balance",
    "Improve overall clarity and definition across all frequencies",
    "Make this sound brighter and more vivid",
    "Remove excess reverb and make it sound more dry",
    "Increase the dynamic range and decompress the audio",
    "Make this sound warmer and more inviting",
  ];

  const handlePromptSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const handleEnhance = async () => {
    if (!prompt.trim()) {
      dispatch(showErrorNotification({
        title: 'Invalid Input',
        message: 'Please enter a prompt describing how you want to enhance your audio.'
      }));
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await audioAPI.enhanceWithPrompt(fileId, prompt.trim());
      
      // Create job in Redux store
      const newJob = {
        id: result.job_id,
        fileId: fileId,
        enhancementType: 'custom_prompt' as const,
        status: result.status,
        progress: result.progress || 0,
        createdAt: new Date().toISOString(),
        customPrompt: prompt.trim(),
      };
      
      dispatch(setCurrentJob(newJob));
      
      dispatch(showSuccessNotification({
        title: 'Processing Started',
        message: 'Your audio is being enhanced with custom prompt. This may take a few minutes.'
      }));

      // Navigate to processing screen to show progress
      navigation.navigate('Processing', {
        fileId: fileId,
        enhancementType: 'custom_prompt',
      });
      
    } catch (error: any) {
      dispatch(showErrorNotification({
        title: 'Enhancement Failed',
        message: error.message || 'Failed to start enhancement. Please try again.'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: theme.colors.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: theme.colors.text,
      marginBottom: 12,
    },
    promptInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      minHeight: 120,
      textAlignVertical: 'top' as const,
    },
    promptCounter: {
      textAlign: 'right' as const,
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    suggestionItem: {
      backgroundColor: theme.colors.surface,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    suggestionText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    enhanceButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    enhanceButtonDisabled: {
      backgroundColor: theme.colors.disabled,
    },
    enhanceButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    backButton: {
      position: 'absolute' as const,
      top: 60,
      left: 20,
      zIndex: 1,
      padding: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: theme.colors.primary,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <TouchableOpacity 
        style={dynamicStyles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={dynamicStyles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>Custom Enhancement</Text>
        <Text style={dynamicStyles.headerSubtitle}>
          File: {fileName}
        </Text>
      </View>

      <ScrollView style={dynamicStyles.content}>
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Enhancement Prompt</Text>
          <TextInput
            style={dynamicStyles.promptInput}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Describe how you want to enhance your audio (e.g., 'Remove background noise and make vocals clearer')"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={500}
            editable={!isProcessing}
          />
          <Text style={dynamicStyles.promptCounter}>
            {prompt.length}/500 characters
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Prompt Suggestions</Text>
          <Text style={[dynamicStyles.suggestionText, { marginBottom: 12, fontStyle: 'italic' as const }]}>
            Tap any suggestion to use it as your prompt:
          </Text>
          {promptSuggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={dynamicStyles.suggestionItem}
              onPress={() => handlePromptSuggestion(suggestion)}
              disabled={isProcessing}
            >
              <Text style={dynamicStyles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            dynamicStyles.enhanceButton,
            (isProcessing || !prompt.trim()) && dynamicStyles.enhanceButtonDisabled
          ]}
          onPress={handleEnhance}
          disabled={isProcessing || !prompt.trim()}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={dynamicStyles.enhanceButtonText}>
              Enhance Audio
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default CustomPromptScreen;