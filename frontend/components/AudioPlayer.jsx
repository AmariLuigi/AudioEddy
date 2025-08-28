import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, SkipBack, SkipForward } from 'lucide-react'

const AudioPlayer = ({ audioFile, title = 'Audio Track' }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', () => setIsPlaying(false))

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', () => setIsPlaying(false))
    }
  }, [audioFile])

  const togglePlay = () => {
    const audio = audioRef.current
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    const rect = e.target.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audio.currentTime = percent * duration
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    audioRef.current.volume = newVolume
  }

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/10"
    >
      <audio ref={audioRef} src={audioFile} />

      <div className="text-center mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-center">{title}</h3>
        <div className="w-full h-2 bg-gray-700 rounded-full mb-2 cursor-pointer touch-manipulation" onClick={handleSeek}>
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
        <button className="p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors touch-manipulation">
          <SkipBack className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
          className="p-3 sm:p-4 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 transition-all touch-manipulation"
        >
          {isPlaying ? <Pause className="h-5 w-5 sm:h-6 sm:w-6 text-white" /> : <Play className="h-5 w-5 sm:h-6 sm:w-6 text-white ml-1" />}
        </motion.button>

        <button className="p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors touch-manipulation">
          <SkipForward className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </button>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider touch-manipulation"
        />
      </div>
    </motion.div>
  )
}

export default AudioPlayer