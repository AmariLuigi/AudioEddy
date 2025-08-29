import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Music, Play, Pause, Download, Clock, AlertCircle, Upload, X, Wand2, Loader2, ToggleLeft, ToggleRight, Crown } from 'lucide-react'
import ApiService from '../utils/api'
import FileUpload from '../components/FileUpload'

const MusicGeneration = () => {
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(30)
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [resultFileId, setResultFileId] = useState(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [referenceAudio, setReferenceAudio] = useState(null)
  const [showReferenceUpload, setShowReferenceUpload] = useState(false)
  const [useReferenceAudio, setUseReferenceAudio] = useState(true)
  const [genreTags, setGenreTags] = useState('')
  const [isPremiumUser] = useState(false) // This would come from user context in real app
  const audioRef = useRef(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a music description')
      return
    }

    if (!isPremiumUser && duration > 100) {
      setError('Free users are limited to 100 seconds. Upgrade to Premium for longer generations.')
      return
    }

    if (!useReferenceAudio && !genreTags.trim()) {
      setError('Please enter genre tags or switch to reference audio mode')
      return
    }

    try {
      setIsGenerating(true)
      setError('')
      setProgress(0)
      setStatus('Starting generation...')

      const requestData = {
        prompt: prompt.trim(),
        duration: duration,
        reference_audio_id: useReferenceAudio ? (referenceAudio?.file_id || null) : null,
        genre_tags: !useReferenceAudio ? genreTags.trim() : null
      }

      const response = await ApiService.generateMusic(requestData)
      setJobId(response.job_id)
      setStatus('Processing...')
      
      // Poll for status updates
      pollJobStatus(response.job_id)
    } catch (err) {
      setError(`Failed to start music generation: ${err.message}`)
      setIsGenerating(false)
    }
  }

  const pollJobStatus = async (jobId) => {
    try {
      const response = await ApiService.getMusicGenerationStatus(jobId)
      setProgress(response.progress * 100)
      setStatus(response.status)

      if (response.status === 'completed') {
        setResultFileId(response.result_file_id)
        setAudioUrl(ApiService.getGeneratedMusicUrl(jobId))
        setIsGenerating(false)
        setStatus('Music generated successfully!')
      } else if (response.status === 'failed') {
        setError(response.error || 'Music generation failed')
        setIsGenerating(false)
      } else if (response.status === 'processing' || response.status === 'pending') {
        // Continue polling
        setTimeout(() => pollJobStatus(jobId), 2000)
      }
    } catch (err) {
      setError(`Failed to get status: ${err.message}`)
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (jobId) {
      const downloadUrl = ApiService.getGeneratedMusicDownloadUrl(jobId)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `generated_music_${jobId}.wav`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleReferenceUpload = (uploadedFile) => {
    setReferenceAudio(uploadedFile)
    setShowReferenceUpload(false)
  }

  const removeReferenceAudio = () => {
    setReferenceAudio(null)
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Music className="h-16 w-16 text-purple-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI Music Generation
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Create original music from text descriptions using advanced AI technology
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Music Description
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the music you want to generate (e.g., 'A peaceful acoustic guitar melody with soft vocals, folk style, dreamy and gentle')..."
                className="w-full h-32 px-4 py-3 bg-black/20 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duration (seconds)
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  {/* Main slider for all users */}
                  <input
                    type="range"
                    min="10"
                    max="300"
                    value={duration}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value);
                      // Restrict free users to 100s max
                      if (!isPremiumUser && newValue > 100) {
                        setDuration(100);
                      } else {
                        setDuration(newValue);
                      }
                    }}
                    className="w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer slider"
                    disabled={isGenerating}
                    style={{
                      background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(duration/300)*100}%, #374151 ${(duration/300)*100}%, #374151 100%)`
                    }}
                  />
                </div>
                <div className="flex items-center space-x-1 text-purple-400 min-w-[80px]">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{duration}s</span>
                  {!isPremiumUser && duration >= 100 && (
                    <Crown className="h-3 w-3 text-yellow-400" title="Premium feature" />
                  )}
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10s</span>
                <span className="flex items-center space-x-1">
                  <span>100s (Free)</span>
                  <span className="text-gray-500">| 300s (Premium)</span>
                </span>
              </div>
            </div>

            {/* Style Input Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Style Input
                </label>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${useReferenceAudio ? 'text-gray-400' : 'text-purple-400'}`}>
                    Genre Tags
                  </span>
                  <button
                    onClick={() => setUseReferenceAudio(!useReferenceAudio)}
                    className="relative inline-flex items-center"
                    disabled={isGenerating}
                    title={useReferenceAudio ? "Switch to manual genre input" : "Switch to reference audio upload"}
                  >
                    {useReferenceAudio ? (
                      <ToggleRight className="h-6 w-6 text-purple-400" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-gray-400" />
                    )}
                  </button>
                  <span className={`text-xs ${useReferenceAudio ? 'text-purple-400' : 'text-gray-400'}`}>
                    Reference Audio
                  </span>
                </div>
              </div>
              
              {useReferenceAudio ? (
                <div>
                  <p className="text-xs text-gray-400 mb-3">
                    Upload an audio file to guide the style and characteristics of the generated music
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-3">
                    Enter genre tags separated by commas (e.g., "indie, folk, acoustic, dreamy")
                  </p>
                  <input
                    type="text"
                    value={genreTags}
                    onChange={(e) => setGenreTags(e.target.value)}
                    placeholder="indie, folk, acoustic, dreamy, soft, melodic"
                    className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isGenerating}
                  />
                </div>
              )}
              
              {useReferenceAudio && (
                <div>
                  {!referenceAudio ? (
                    <div className="space-y-3">
                      {!showReferenceUpload ? (
                        <button
                          onClick={() => setShowReferenceUpload(true)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg transition-colors"
                          disabled={isGenerating}
                        >
                          <Upload className="h-4 w-4" />
                          <span>Add Reference Audio</span>
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <FileUpload
                            onUpload={handleReferenceUpload}
                            accept="audio/*"
                            maxSize={50 * 1024 * 1024} // 50MB
                          />
                          <button
                            onClick={() => setShowReferenceUpload(false)}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-blue-600/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Music className="h-5 w-5 text-blue-400" />
                        <div>
                          <p className="text-sm font-medium text-blue-400">{referenceAudio.filename}</p>
                          <p className="text-xs text-gray-400">
                            {(referenceAudio.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeReferenceAudio}
                        className="p-1 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors"
                        disabled={isGenerating}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <span>{status}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            )}

            {audioUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 p-6 bg-green-500/10 border border-green-500/20 rounded-lg"
              >
                <h3 className="text-lg font-semibold text-green-400 mb-4">
                  🎵 Music Generated Successfully!
                </h3>
                <audio
                  controls
                  className="w-full"
                  src={audioUrl}
                >
                  Your browser does not support the audio element.
                </audio>
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </motion.div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || (!isPremiumUser && duration > 100) || (!useReferenceAudio && !genreTags.trim())}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Generate Music</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center text-gray-400 text-sm"
        >
          <p>
            💡 <strong>Tips:</strong> Be descriptive about the style, instruments, mood, and genre you want.
            <br />
            Examples: "Upbeat electronic dance music with synthesizers" or "Calm piano ballad with strings"
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default MusicGeneration