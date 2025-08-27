import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logoutUser, updateProfile } from '../store/slices/authSlice';
import { useTheme, ThemeMode } from '../theme/ThemeContext';
import { RootStackParamList } from '../../App';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'select' | 'action';
  value?: boolean | string;
  options?: { label: string; value: string }[];
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name,
        email: user.email,
      });
    }
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            dispatch(logoutUser());
            navigation.navigate('Login');
          },
        },
      ]
    );
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!editForm.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!editForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(editForm.email)) {
      errors.email = 'Email is invalid';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(updateProfile({
        name: editForm.name,
        email: editForm.email,
      })).unwrap();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: user?.name || '',
      email: user?.email || '',
    });
    setFormErrors({});
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const settings: SettingItem[] = [
    {
      id: 'theme',
      title: 'Theme',
      subtitle: `Current: ${themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light'}`,
      type: 'select',
      value: themeMode,
      options: [
        { label: 'System', value: 'system' },
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
    {
      id: 'notifications',
      title: 'Push Notifications',
      subtitle: 'Receive notifications about job completion',
      type: 'toggle',
      value: true,
      onToggle: (value) => {
        // Handle notification toggle
        console.log('Notifications:', value);
      },
    },
    {
      id: 'autoSave',
      title: 'Auto-save Enhanced Audio',
      subtitle: 'Automatically save enhanced files to device',
      type: 'toggle',
      value: false,
      onToggle: (value) => {
        // Handle auto-save toggle
        console.log('Auto-save:', value);
      },
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      padding: theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: 'white',
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    userEmail: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      ...theme.shadows.sm,
    },
    inputContainer: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    button: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: 'white',
    },
    secondaryButtonText: {
      color: theme.colors.text,
    },
    editButton: {
      backgroundColor: theme.colors.accent,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    editButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingItemLast: {
      borderBottomWidth: 0,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    settingSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    themeSelector: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    themeOption: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    themeOptionActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    themeOptionText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    themeOptionTextActive: {
      color: 'white',
    },
    logoutButton: {
      backgroundColor: theme.colors.error,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
    },
    logoutButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.userName}>Please log in to view your profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <View style={styles.card}>
          {isEditing ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[styles.input, formErrors.name ? styles.inputError : null]}
                  value={editForm.name}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, name: value }))}
                  placeholder="Enter your full name"
                  placeholderTextColor={theme.colors.placeholder}
                />
                {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, formErrors.email ? styles.inputError : null]}
                  value={editForm.email}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, email: value }))}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleSaveProfile}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleCancelEdit}
                >
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <Text style={[styles.input, { borderColor: 'transparent' }]}>{user.name}</Text>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <Text style={[styles.input, { borderColor: 'transparent' }]}>{user.email}</Text>
              </View>
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.card}>
          {settings.map((setting, index) => (
            <View
              key={setting.id}
              style={[
                styles.settingItem,
                index === settings.length - 1 && styles.settingItemLast,
              ]}
            >
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{setting.title}</Text>
                {setting.subtitle && (
                  <Text style={styles.settingSubtitle}>{setting.subtitle}</Text>
                )}
              </View>
              
              {setting.type === 'toggle' && (
                <Switch
                  value={setting.value as boolean}
                  onValueChange={setting.onToggle}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.surface}
                />
              )}
              
              {setting.type === 'select' && setting.id === 'theme' && (
                <View style={styles.themeSelector}>
                  {setting.options?.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.themeOption,
                        themeMode === option.value && styles.themeOptionActive,
                      ]}
                      onPress={() => handleThemeChange(option.value as ThemeMode)}
                    >
                      <Text
                        style={[
                          styles.themeOptionText,
                          themeMode === option.value && styles.themeOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ProfileScreen;