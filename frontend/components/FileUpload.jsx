import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, File, X, CheckCircle } from 'lucide-react'
import apiService from '../utils/api.js'

const FileUpload = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = (file) => {
    if (!file) return

    // Validate file type
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/flac', 'audio/m4a', 'audio/ogg']
    const validExtensions = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
    
    const isValidType = validTypes.includes(file.type) || 
                       validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    
    if (!isValidType) {
      setError('Please select a valid audio file (WAV, MP3, FLAC, M4A, OGG)')
      return
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB')
      return
    }

    uploadFile(file)
  }

  const uploadFile = async (file) => {
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await apiService.uploadFile(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      const fileData = {
        id: response.file_id,
        name: file.name,
        size: file.size,
        uploadTime: response.upload_time,
        file: file
      }
      
      setUploadedFile(fileData)
      onFileSelect(fileData)
      
    } catch (error) {
      setError(`Upload failed: ${error.message}`)
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setError(null)
    setUploadProgress(0)
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (uploadedFile && !isUploading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/10 rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">{uploadedFile.name}</h3>
              <p className="text-gray-400 text-sm">{formatFileSize(uploadedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={handleRemoveFile}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragOver
            ? 'border-purple-400 bg-purple-500/10'
            : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
        } ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className={`p-4 rounded-full ${
            isDragOver ? 'bg-purple-500/20' : 'bg-white/10'
          }`}>
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            ) : (
              <Upload className="h-8 w-8 text-white" />
            )}
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {isUploading ? 'Uploading...' : isDragOver ? 'Drop your file here' : 'Upload Audio File'}
            </h3>
            <p className="text-gray-300 mb-2">
              {isUploading ? `${uploadProgress}% complete` : 'Drag and drop or click to browse'}
            </p>
            <p className="text-sm text-gray-400">
              Supports WAV, MP3, FLAC, M4A, OGG (Max 50MB)
            </p>
          </div>
        </div>
        
        {isUploading && (
          <div className="mt-6">
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}
    </motion.div>
  )
}

export default FileUpload