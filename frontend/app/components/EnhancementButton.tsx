import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EnhancementType } from '../store/slices/jobsSlice';

interface EnhancementButtonProps {
  type: EnhancementType;
  icon: string;
  name: string;
  description: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  onPress: (type: EnhancementType) => void;
  variant?: 'default' | 'compact' | 'featured';
  showBadge?: boolean;
  badgeText?: string;
  gradientColors?: string[];
}

const EnhancementButton: React.FC<EnhancementButtonProps> = ({
  type,
  icon,
  name,
  description,
  isSelected = false,
  isDisabled = false,
  onPress,
  variant = 'default',
  showBadge = false,
  badgeText,
  gradientColors
}) => {
  const getEnhancementColors = (enhancementType: EnhancementType) => {
    const colorMap = {
      fix_quality: ['#3B82F6', '#1D4ED8'], // Blue
      remove_noise: ['#10B981', '#059669'], // Green
      studio_master: ['#8B5CF6', '#7C3AED'], // Purple
      vocal_enhance: ['#F59E0B', '#D97706'], // Orange
      bass_boost: ['#EF4444', '#DC2626'], // Red
      clarity_boost: ['#06B6D4', '#0891B2'], // Cyan
      custom_prompt: ['#8B5CF6', '#7C3AED'], // Purple
    };
    
    return colorMap[enhancementType] || colorMap.fix_quality;
  };
  
  const getEnhancementInfo = (enhancementType: EnhancementType) => {
    const infoMap = {
      fix_quality: {
        category: 'Repair',
        difficulty: 'Easy',
        time: '~2 min'
      },
      remove_noise: {
        category: 'Clean',
        difficulty: 'Easy',
        time: '~3 min'
      },
      studio_master: {
        category: 'Master',
        difficulty: 'Advanced',
        time: '~5 min'
      },
      vocal_enhance: {
        category: 'Enhance',
        difficulty: 'Medium',
        time: '~3 min'
      },
      bass_boost: {
        category: 'Enhance',
        difficulty: 'Easy',
        time: '~2 min'
      },
      clarity_boost: {
        category: 'Enhance',
        difficulty: 'Medium',
        time: '~3 min'
      },
      custom_prompt: {
        category: 'Custom',
        difficulty: 'Variable',
        time: '~2-5 min'
      }
    };
    
    return infoMap[enhancementType] || infoMap.fix_quality;
  };
  
  const colors = gradientColors || getEnhancementColors(type);
  const info = getEnhancementInfo(type);
  
  const handlePress = () => {
    if (!isDisabled) {
      onPress(type);
    }
  };
  
  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={handlePress} disabled={isDisabled} style={styles.compactContainer}>
        <View style={[
          styles.compactCard,
          isSelected ? styles.selectedCard : styles.unselectedCard,
          { opacity: isDisabled ? 0.5 : 1 }
        ]}>
          <View style={styles.compactContent}>
            <View style={styles.compactIconContainer}>
              <LinearGradient
                colors={colors}
                style={{
                  width: '100%',
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 8
                }}
              >
                <Text style={styles.compactIcon}>{icon}</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.compactTextContainer}>
              <Text 
                style={[
                  styles.compactName,
                  { color: isSelected ? '#1d4ed8' : '#111827' }
                ]}
                numberOfLines={1}
              >
                {name}
              </Text>
              <Text 
                style={[
                  styles.compactTime,
                  { color: isSelected ? '#2563eb' : '#6b7280' }
                ]}
                numberOfLines={1}
              >
                {info.time}
              </Text>
            </View>
            
            {isSelected && (
              <View style={styles.compactCheckmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  if (variant === 'featured') {
    return (
      <TouchableOpacity onPress={handlePress} disabled={isDisabled} style={styles.featuredContainer}>
        <View style={[
          styles.featuredCard,
          isSelected ? styles.featuredSelected : styles.featuredUnselected,
          { opacity: isDisabled ? 0.5 : 1 }
        ]}>
          <View style={styles.featuredRelative}>
            <LinearGradient
              colors={colors}
              style={{
                padding: 20,
                minHeight: 120
              }}
            >
              <View style={styles.featuredContent}>
                <View style={styles.featuredHeader}>
                  <View style={styles.featuredIconContainer}>
                    <Text style={styles.featuredIcon}>{icon}</Text>
                  </View>
                  
                  {showBadge && badgeText && (
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>{badgeText}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.featuredTextContainer}>
                  <Text style={styles.featuredName}>
                    {name}
                  </Text>
                  <Text 
                    style={styles.featuredDescription}
                    numberOfLines={2}
                  >
                    {description}
                  </Text>
                </View>
                
                <View style={styles.featuredFooter}>
                  <View style={styles.featuredCategoryBadge}>
                    <Text style={styles.featuredCategoryText}>{info.category}</Text>
                  </View>
                  <Text style={styles.featuredTime}>
                    {info.time}
                  </Text>
                </View>
              </View>
            </LinearGradient>
            
            {isSelected && (
              <View style={styles.featuredCheckmark}>
                <Text style={styles.featuredCheckmarkText}>✓</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  // Default variant
  return (
    <TouchableOpacity onPress={handlePress} disabled={isDisabled} style={styles.defaultContainer}>
      <View style={[
        styles.defaultCard,
        isSelected ? styles.selectedCard : styles.unselectedCard,
        { opacity: isDisabled ? 0.5 : 1 }
      ]}>
        <View style={styles.defaultContent}>
          <View style={styles.defaultHeader}>
            <View style={styles.defaultIconContainer}>
              <LinearGradient
                colors={colors}
                style={{
                  width: '100%',
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 12
                }}
              >
                <Text style={styles.defaultIcon}>{icon}</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.defaultTextContainer}>
              <View style={styles.defaultTitleRow}>
                <Text 
                  style={[
                    styles.defaultName,
                    { color: isSelected ? '#1d4ed8' : '#111827' }
                  ]}
                >
                  {name}
                </Text>
                
                {isSelected && (
                  <View style={styles.defaultCheckmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </View>
              
              <Text 
                style={[
                  styles.defaultDescription,
                  { color: isSelected ? '#2563eb' : '#6b7280' }
                ]}
                numberOfLines={2}
              >
                {description}
              </Text>
            </View>
          </View>
          
          <View style={styles.defaultFooter}>
            <View style={styles.defaultBadges}>
              <View style={[
                styles.defaultBadge,
                isSelected ? styles.selectedBadge : styles.unselectedBadge
              ]}>
                <Text style={[
                  styles.badgeText,
                  { color: isSelected ? '#2563eb' : '#6b7280' }
                ]}>{info.category}</Text>
              </View>
              
              <View style={[
                styles.defaultBadge,
                isSelected ? styles.selectedBadge : styles.unselectedBadge
              ]}>
                <Text style={[
                  styles.badgeText,
                  { color: isSelected ? '#2563eb' : '#6b7280' }
                ]}>{info.difficulty}</Text>
              </View>
            </View>
            
            <Text 
              style={[
                styles.defaultTime,
                { color: isSelected ? '#2563eb' : '#6b7280' }
              ]}
            >
              {info.time}
            </Text>
          </View>
          
          {showBadge && badgeText && (
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>{badgeText}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Compact variant styles
  compactContainer: {},
  compactCard: {
    padding: 12,
    borderRadius: 8,
  },
  selectedCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  unselectedCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  compactIcon: {
    fontSize: 18,
  },
  compactTextContainer: {
    flex: 1,
  },
  compactName: {
    fontWeight: '600',
    fontSize: 14,
  },
  compactTime: {
    fontSize: 12,
  },
  compactCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 12,
  },

  // Featured variant styles
  featuredContainer: {},
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredSelected: {
    borderWidth: 3,
    borderColor: '#2563eb',
  },
  featuredUnselected: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  featuredRelative: {
    position: 'relative',
  },
  featuredContent: {
    flex: 1,
    gap: 12,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredIcon: {
    fontSize: 24,
  },
  featuredBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredTextContainer: {
    flex: 1,
    gap: 4,
  },
  featuredName: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#ffffff',
  },
  featuredDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredCategoryBadge: {
    borderWidth: 1,
    borderColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredCategoryText: {
    color: '#ffffff',
    fontSize: 12,
  },
  featuredTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  featuredCheckmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredCheckmarkText: {
    color: '#2563eb',
    fontSize: 16,
  },

  // Default variant styles
  defaultContainer: {},
  defaultCard: {
    padding: 16,
    borderRadius: 8,
  },
  defaultContent: {
    gap: 12,
  },
  defaultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  defaultIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  defaultIcon: {
    fontSize: 32,
  },
  defaultTextContainer: {
    flex: 1,
    gap: 4,
  },
  defaultTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  defaultName: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  defaultCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultDescription: {
    fontSize: 14,
  },
  defaultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  defaultBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  defaultBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadge: {
    borderColor: '#2563eb',
  },
  unselectedBadge: {
    borderColor: '#d1d5db',
  },
  badgeText: {
    fontSize: 12,
  },
  defaultTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  successBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  successBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default EnhancementButton;