import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions
} from 'react-native';
import Svg, { Rect, Path, G } from 'react-native-svg';

interface WaveformVisualizationProps {
  audioUri?: string;
  waveformData?: number[];
  width?: number;
  height?: number;
  color?: string;
  progressColor?: string;
  backgroundColor?: string;
  progress?: number; // 0-100
  onSeek?: (position: number) => void;
  showProgress?: boolean;
  animated?: boolean;
  barWidth?: number;
  barSpacing?: number;
  variant?: 'bars' | 'line' | 'filled';
}

const WaveformVisualization: React.FC<WaveformVisualizationProps> = ({
  audioUri,
  waveformData,
  width = Dimensions.get('window').width - 48,
  height = 80,
  color = '#3B82F6',
  progressColor = '#1D4ED8',
  backgroundColor = '#F3F4F6',
  progress = 0,
  onSeek,
  showProgress = true,
  animated = true,
  barWidth = 2,
  barSpacing = 1,
  variant = 'bars'
}) => {
  const [data, setData] = useState<number[]>(waveformData || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (waveformData) {
      setData(waveformData);
    } else if (audioUri) {
      generateWaveformFromAudio(audioUri);
    } else {
      // Generate mock data for demonstration
      generateMockWaveform();
    }
  }, [audioUri, waveformData]);
  
  useEffect(() => {
    if (animated && data.length > 0) {
      startAnimation();
    }
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [animated, data]);
  
  const generateMockWaveform = () => {
    const mockData: number[] = [];
    const numBars = Math.floor(width / (barWidth + barSpacing));
    
    for (let i = 0; i < numBars; i++) {
      // Create a more realistic waveform pattern
      const baseAmplitude = Math.sin(i * 0.1) * 0.5 + 0.5;
      const noise = (Math.random() - 0.5) * 0.3;
      const amplitude = Math.max(0.1, Math.min(1, baseAmplitude + noise));
      mockData.push(amplitude * 100);
    }
    
    setData(mockData);
  };
  
  const generateWaveformFromAudio = async (uri: string) => {
    setIsGenerating(true);
    
    try {
      if (Platform.OS === 'web') {
        // Web implementation using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        const samples = Math.floor(width / (barWidth + barSpacing));
        const blockSize = Math.floor(channelData.length / samples);
        const waveformData: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j] || 0);
          }
          const average = sum / blockSize;
          waveformData.push(average * 100);
        }
        
        setData(waveformData);
      } else {
        // React Native implementation would require native modules
        // For now, generate mock data
        generateMockWaveform();
      }
    } catch (error) {
      console.error('Error generating waveform:', error);
      generateMockWaveform();
    } finally {
      setIsGenerating(false);
    }
  };
  
  const startAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
    setAnimationProgress(0);
    
    animationRef.current = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 100) {
          if (animationRef.current) {
            clearInterval(animationRef.current);
          }
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };
  
  const handlePress = (event: any) => {
    if (!onSeek) return;
    
    const { locationX, pageX } = event.nativeEvent;
    // Use locationX if available, otherwise calculate from pageX
    const x = locationX !== undefined ? locationX : pageX;
    const seekPosition = (x / width) * 100;
    onSeek(Math.max(0, Math.min(100, seekPosition)));
  };
  
  const renderBarsWaveform = () => {
    const numBars = data.length;
    const actualBarWidth = (width - (numBars - 1) * barSpacing) / numBars;
    const progressIndex = Math.floor((progress / 100) * numBars);
    
    return (
      <Svg width={width} height={height}>
        <G>
          {data.map((amplitude, index) => {
            const barHeight = Math.max(2, (amplitude / 100) * height);
            const x = index * (actualBarWidth + barSpacing);
            const y = (height - barHeight) / 2;
            
            const isPlayed = showProgress && index <= progressIndex;
            const isAnimated = animated && index <= (animationProgress / 100) * numBars;
            
            return (
              <Rect
                key={index}
                x={x}
                y={y}
                width={actualBarWidth}
                height={isAnimated ? barHeight : 2}
                fill={isPlayed ? progressColor : color}
                rx={actualBarWidth / 2}
                opacity={isAnimated ? 1 : 0.3}
              />
            );
          })}
        </G>
      </Svg>
    );
  };
  
  const renderLineWaveform = () => {
    if (data.length === 0) return null;
    
    const points: string[] = [];
    const stepX = width / (data.length - 1);
    
    data.forEach((amplitude, index) => {
      const x = index * stepX;
      const y = height - (amplitude / 100) * height;
      points.push(`${x},${y}`);
    });
    
    const pathData = `M ${points.join(' L ')}`;
    const progressWidth = (progress / 100) * width;
    
    return (
      <Svg width={width} height={height}>
        <G>
          {/* Background line */}
          <Path
            d={pathData}
            stroke={color}
            strokeWidth={2}
            fill="none"
            opacity={0.3}
          />
          
          {/* Progress line */}
          {showProgress && (
            <G clipPath={`inset(0 ${width - progressWidth}px 0 0)`}>
              <Path
                d={pathData}
                stroke={progressColor}
                strokeWidth={2}
                fill="none"
              />
            </G>
          )}
        </G>
      </Svg>
    );
  };
  
  const renderFilledWaveform = () => {
    if (data.length === 0) return null;
    
    const points: string[] = [`0,${height}`];
    const stepX = width / (data.length - 1);
    
    data.forEach((amplitude, index) => {
      const x = index * stepX;
      const y = height - (amplitude / 100) * height;
      points.push(`${x},${y}`);
    });
    
    points.push(`${width},${height}`);
    const pathData = `M ${points.join(' L ')} Z`;
    const progressWidth = (progress / 100) * width;
    
    return (
      <Svg width={width} height={height}>
        <G>
          {/* Background fill */}
          <Path
            d={pathData}
            fill={color}
            opacity={0.3}
          />
          
          {/* Progress fill */}
          {showProgress && (
            <G clipPath={`inset(0 ${width - progressWidth}px 0 0)`}>
              <Path
                d={pathData}
                fill={progressColor}
              />
            </G>
          )}
        </G>
      </Svg>
    );
  };
  
  const renderWaveform = () => {
    switch (variant) {
      case 'line':
        return renderLineWaveform();
      case 'filled':
        return renderFilledWaveform();
      case 'bars':
      default:
        return renderBarsWaveform();
    }
  };
  
  if (isGenerating) {
    return (
      <View style={[
        styles.container,
        { width, height, backgroundColor }
      ]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Generating waveform...
          </Text>
          <View style={styles.dotsContainer}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={styles.dot}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }
  
  if (data.length === 0) {
    return (
      <View style={[
        styles.container,
        { width, height, backgroundColor }
      ]}>
        <Text style={styles.noDataText}>
          No audio data
        </Text>
      </View>
    );
  }
  
  return (
    <TouchableOpacity 
      onPress={handlePress} 
      disabled={!onSeek}
      activeOpacity={0.8}
      style={{ width, height }}
    >
      <View style={[
        styles.waveformContainer,
        { width, height, backgroundColor }
      ]}>
        {renderWaveform()}
        
        {/* Progress indicator */}
        {showProgress && onSeek && (
          <View style={[
            styles.progressIndicator,
            {
              left: (progress / 100) * width - 1,
              height,
              backgroundColor: progressColor
            }
          ]} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
    opacity: 0.5,
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  waveformContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressIndicator: {
    position: 'absolute',
    top: 0,
    width: 2,
    opacity: 0.8,
  },
});

export default WaveformVisualization;