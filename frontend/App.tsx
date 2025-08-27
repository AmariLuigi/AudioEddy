import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { store, persistor } from './app/store';
import { LoadingScreen } from './app/components/LoadingScreen';
import { ThemeProvider } from './app/theme/ThemeContext';

// Screens
import HomeScreen from './app/screens/HomeScreen';
import UploadScreen from './app/screens/UploadScreen';
import ProcessingScreen from './app/screens/ProcessingScreen';
import ResultsScreen from './app/screens/ResultsScreen';
import CustomPromptScreen from './app/screens/CustomPromptScreen';
import LoginScreen from './app/screens/LoginScreen';
import ProfileScreen from './app/screens/ProfileScreen';

export type RootStackParamList = {
  Home: undefined;
  Upload: undefined;
  Processing: { fileId: string; enhancementType: string };
  Results: { jobId: string; originalFileId: string; enhancedFileId?: string; promptUsed?: string; processingMethod?: string };
  CustomPrompt: { fileId: string; fileName: string };
  Login: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <ThemeProvider>
          <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#6366f1',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              cardStyle: {
                backgroundColor: '#f8fafc',
              },
            }}
          >
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ 
                title: 'SonicFix',
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="Upload" 
              component={UploadScreen} 
              options={{ title: 'Upload Audio' }} 
            />
            <Stack.Screen 
              name="Processing" 
              component={ProcessingScreen} 
              options={{ 
                title: 'Processing',
                headerLeft: () => null, // Prevent going back during processing
              }} 
            />
            <Stack.Screen 
              name="Results" 
              component={ResultsScreen} 
              options={{ title: 'Results' }} 
            />
            <Stack.Screen 
              name="CustomPrompt" 
              component={CustomPromptScreen} 
              options={{ title: 'Custom Enhancement' }} 
            />
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ title: 'Login' }} 
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen} 
              options={{ title: 'Profile' }} 
            />
          </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}