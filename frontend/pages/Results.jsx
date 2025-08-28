import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Share2, ArrowLeft, Play, Pause, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { fadeInUp, staggerContainer } from '../utils/motion'
import WaveVisualization from '../components/WaveVisualization'
import AudioPlayer from '../components/AudioPlayer'
import apiService from '../utils/api.js'

const Results = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { jobId, file, enhancement, prompt } = location.state || {}
  
  const [jobStatus, setJobStatus] = useState('processing')
  const [jobData, setJobData] = useState(null)
  const [error, setError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState('enhanced')
  const [frequencyData, setFrequencyData] = useState(new Array(256).fill(0).map(() => Math.random() * 100))
  const [processingTime, setProcessingTime] = useState(0)
  const [originalAudioRef, setOriginalAudioRef] = useState(null)
  const [enhancedAudioRef, setEnhancedAudioRef] = useState(null)
  const [waveWidth, setWaveWidth] = useState(400)

  useEffect(() => {
    if (!jobId || !file) {
      navigate('/enhance')
      return
    }
    
    // Start polling for job status
    const pollInterval = setInterval(async () => {
      try {
        const status = await apiService.getJobStatus(jobId)
        setJobStatus(status.status)
        setJobData(status)
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('Error polling job status:', error)
        setError('Failed to get job status')
        clearInterval(pollInterval)
      }
    }, 2000)
    
    // Processing time counter
    const timeInterval = setInterval(() => {
      if (jobStatus === 'processing') {
        setProcessingTime(prev => prev + 1)
      }
    }, 1000)
    
    return () => {
      clearInterval(pollInterval)
      clearInterval(timeInterval)
    }
  }, [jobId, file, navigate, jobStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setFrequencyData(new Array(256).fill(0).map(() => Math.random() * 100))
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying])

  // Handle responsive wave width
  useEffect(() => {
    const updateWaveWidth = () => {
      const screenWidth = window.innerWidth
      let containerWidth
      
      if (screenWidth < 640) { // sm breakpoint
        containerWidth = Math.min(screenWidth - 80, 320) // Mobile: less padding
      } else if (screenWidth < 1024) { // lg breakpoint
        containerWidth = Math.min(screenWidth - 120, 380) // Tablet: medium padding
      } else {
        containerWidth = Math.min((screenWidth / 2) - 100, 400) // Desktop: half screen minus padding
      }
      
      setWaveWidth(Math.max(containerWidth, 250)) // Minimum width of 250px
    }

    updateWaveWidth()
    window.addEventListener('resize', updateWaveWidth)
    return () => window.removeEventListener('resize', updateWaveWidth)
  }, [])

  const handleDownload = () => {
    if (jobData && jobData.status === 'completed') {
      const downloadUrl = apiService.getAudioUrl(jobId, 'enhanced')
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `enhanced_${file.name}`
      link.click()
    }
  }
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AudioEddy Enhanced Audio',
          text: `Check out my enhanced audio using ${enhancementType}!`,
          url: window.location.href
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    }
  }

  const togglePlayback = (audioType = currentAudio) => {
    const audioRef = audioType === 'original' ? originalAudioRef : enhancedAudioRef
    
    if (!audioRef) return
    
    // If we're switching audio types or the current audio is not playing
    if (currentAudio !== audioType || !isPlaying) {
      // Pause both audios first
      if (originalAudioRef) originalAudioRef.pause()
      if (enhancedAudioRef) enhancedAudioRef.pause()
      
      // Set the new current audio and play it
      setCurrentAudio(audioType)
      audioRef.play()
      setIsPlaying(true)
    } else {
      // Same audio type and currently playing, so pause
      audioRef.pause()
      setIsPlaying(false)
    }
  }
  
  const handleAudioEnded = () => {
    setIsPlaying(false)
  }
  
  const getAudioUrl = (type) => {
    if (!jobData || !jobId) return ''
    return apiService.getAudioUrl(jobId, type)
  }

  if (!jobId || !file) {
    return null
  }
  
  if (error) {
    return (
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => navigate('/enhance')}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
  
  if (jobStatus === 'processing') {
    return (
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-16 w-16 text-purple-400 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-white mb-2">Processing Your Audio</h2>
          <p className="text-gray-300 mb-4">Enhancement type: {enhancement}</p>
          <p className="text-sm text-gray-400">Processing time: {formatTime(processingTime)}</p>
          <div className="mt-6 w-64 mx-auto">
            <div className="bg-white/10 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full animate-pulse" style={{width: '60%'}} />
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (jobStatus === 'failed') {
    return (
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Enhancement Failed</h2>
          <p className="text-gray-300 mb-4">There was an error processing your audio file.</p>
          <button
            onClick={() => navigate('/enhance')}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto"
      >
        <motion.div variants={fadeInUp} className="mb-8">
          <button
            onClick={() => navigate('/enhance')}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Enhancement</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Enhancement Complete
            </h1>
            <p className="text-xl text-gray-300">
              Your audio has been enhanced using <span className="text-purple-400 font-semibold">{enhancement}</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Processing time: {formatTime(processingTime)}
            </p>
          </div>
        </motion.div>

        {/* Hidden audio elements */}
        <audio
          ref={(ref) => setOriginalAudioRef(ref)}
          src={getAudioUrl('original')}
          onEnded={handleAudioEnded}
          preload="metadata"
        />
        <audio
          ref={(ref) => setEnhancedAudioRef(ref)}
          src={getAudioUrl('enhanced')}
          onEnded={handleAudioEnded}
          preload="metadata"
        />

        <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Original Audio</h2>
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-xl p-4 h-32 flex items-center justify-center overflow-hidden">
                <div className="w-full">
                  <WaveVisualization
                    frequencyData={currentAudio === 'original' && isPlaying ? frequencyData : new Array(256).fill(20)}
                    width={waveWidth}
                    height={80}
                    lineColor={['#6B7280', '#9CA3AF']}
                    lines={3}
                    lineGap={8}
                    sections={12}
                    offsetPixelSpeed={currentAudio === 'original' && isPlaying ? -100 : 0}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                <p>File: {file.name}</p>
                <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
                
                <button
                  onClick={() => togglePlayback('original')}
                  className="p-3 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors"
                >
                  {isPlaying && currentAudio === 'original' ? 
                    <Pause className="h-5 w-5 text-white" /> : 
                    <Play className="h-5 w-5 text-white ml-1" />
                  }
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Enhanced Audio</h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-900/30 to-violet-900/30 rounded-xl p-4 h-32 flex items-center justify-center overflow-hidden">
                <div className="w-full">
                  <WaveVisualization
                    frequencyData={currentAudio === 'enhanced' && isPlaying ? frequencyData : new Array(256).fill(20)}
                    width={waveWidth}
                    height={80}
                    lineColor={['#8B5CF6', '#A78BFA']}
                    lines={4}
                    lineGap={6}
                    sections={16}
                    offsetPixelSpeed={currentAudio === 'enhanced' && isPlaying ? -150 : 0}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                <p>Enhancement: {enhancement}</p>
                <p>Quality: Professional</p>
              </div>
                
                <button
                  onClick={() => togglePlayback('enhanced')}
                  className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 transition-all"
                >
                  {isPlaying && currentAudio === 'enhanced' ? 
                    <Pause className="h-5 w-5 text-white" /> : 
                    <Play className="h-5 w-5 text-white ml-1" />
                  }
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Enhancement Details</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-2">+45%</div>
              <div className="text-sm text-gray-300">Audio Quality</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-2">-78%</div>
              <div className="text-sm text-gray-300">Background Noise</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-2">+32%</div>
              <div className="text-sm text-gray-300">Clarity Boost</div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleDownload}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25"
          >
            <Download className="h-5 w-5" />
            <span>Download Enhanced Audio</span>
          </button>
          
          <button
            onClick={handleShare}
            className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
          >
            <Share2 className="h-5 w-5" />
            <span>Share Result</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Results