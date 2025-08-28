import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import FileUpload from '../components/FileUpload'
import EnhancementCard from '../components/EnhancementCard'
import AudioPlayer from '../components/AudioPlayer'
import { fadeInUp, staggerContainer } from '../utils/motion'
import apiService from '../utils/api.js'
import { Download, Loader } from 'lucide-react'

const Enhance = () => {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedEnhancement, setSelectedEnhancement] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingTime, setProcessingTime] = useState(null)
  const [enhancedAudio, setEnhancedAudio] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')

  const enhancements = [
    {
      type: 'fix-quality',
      title: 'Fix Quality',
      description: 'Repair audio issues, reduce distortion, and improve overall clarity and definition'
    },
    {
      type: 'remove-noise',
      title: 'Remove Noise',
      description: 'Eliminate background noise, hum, hiss, and unwanted artifacts from recordings'
    },
    {
      type: 'studio-master',
      title: 'Studio Master',
      description: 'Apply professional mastering techniques for radio-ready, polished sound'
    },
    {
      type: 'vocal-enhance',
      title: 'Vocal Enhance',
      description: 'Enhance vocal clarity, presence, and intelligibility for speech and singing'
    },
    {
      type: 'bass-boost',
      title: 'Bass Boost',
      description: 'Enhance low frequencies and add depth to your audio with controlled bass enhancement'
    },
    {
      type: 'clarity-boost',
      title: 'Clarity Boost',
      description: 'Improve overall definition, detail, and separation across all frequency ranges'
    },
    {
      type: 'custom-prompt',
      title: 'Custom Prompt',
      description: 'Describe your desired enhancement and let AI create a custom processing solution'
    }
  ]

  const handleEnhance = async () => {
    if (!selectedFile || !selectedEnhancement) return
    
    try {
      // Prepare enhancement request
      const enhancementPrompt = selectedEnhancement === 'custom-prompt' 
        ? customPrompt 
        : getEnhancementPrompt(selectedEnhancement)
      
      // Start enhancement process
      const response = await apiService.enhanceAudio(selectedFile.id, enhancementPrompt)
      
      // Navigate to results with job ID
      navigate('/results', { 
        state: { 
          jobId: response.job_id,
          file: selectedFile, 
          enhancement: selectedEnhancement,
          prompt: enhancementPrompt 
        } 
      })
    } catch (error) {
      console.error('Enhancement failed:', error)
      // You could add error state handling here
    }
  }
  
  const getEnhancementPrompt = (type) => {
    const prompts = {
      'fix-quality': 'Fix audio quality issues and improve overall sound clarity',
      'remove-noise': 'Remove background noise and unwanted artifacts from the audio',
      'studio-master': 'Apply professional studio mastering to enhance the audio',
      'vocal-enhance': 'Enhance vocal clarity and presence in the audio',
      'bass-boost': 'Boost bass frequencies for a richer, fuller sound',
      'clarity-boost': 'Improve overall audio clarity and definition'
    }
    return prompts[type] || 'Enhance the audio quality'
  }

  return (
    <div className="min-h-screen px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto"
      >
        <motion.div variants={fadeInUp} className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Enhance Your Audio
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto px-4">
            Upload your audio file and choose from seven professional enhancement types
          </p>
        </motion.div>

        {/* File Upload */}
        <motion.div variants={fadeInUp} className="mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">1. Upload Audio File</h2>
          <FileUpload onFileSelect={setSelectedFile} />
        </motion.div>

        {/* Enhancement Selection */}
        {selectedFile && (
          <motion.div variants={fadeInUp} className="mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">2. Choose Enhancement Type</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {enhancements.map((enhancement) => (
                <EnhancementCard
                  key={enhancement.type}
                  {...enhancement}
                  isSelected={selectedEnhancement === enhancement.type}
                  onClick={() => setSelectedEnhancement(enhancement.type)}
                />
              ))}
            </div>

            {selectedEnhancement === 'custom-prompt' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 sm:mt-6"
              >
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe how you want your audio enhanced..."
                  className="w-full p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-400 transition-colors text-sm sm:text-base"
                  rows={3}
                />
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Process Button */}
        {selectedFile && selectedEnhancement && (
          <motion.div variants={fadeInUp} className="mb-8 sm:mb-12 text-center">
            <button
              onClick={handleEnhance}
              disabled={isProcessing}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center space-x-2 mx-auto shadow-lg shadow-purple-500/25 touch-manipulation"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Enhance Audio</span>
              )}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default Enhance