const API_BASE_URL = 'http://localhost:8000'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`)
    }
    
    return await response.json()
  }

  async enhanceAudio(fileId, prompt) {
    return this.post('/enhance', {
      file_id: fileId,
      prompt: prompt
    })
  }

  async getJobStatus(jobId) {
    return this.get(`/job-status/${jobId}`)
  }

  async getFiles() {
    return this.get('/files')
  }

  async deleteFile(fileId) {
    return this.request(`/delete/${fileId}`, { method: 'DELETE' })
  }

  getDownloadUrl(fileId) {
    return `${this.baseURL}/download/${fileId}`
  }

  getAudioUrl(jobId, audioType) {
    return `${this.baseURL}/audio/${jobId}/${audioType}`
  }

  async healthCheck() {
    return this.get('/health')
  }

  // Music Generation APIs
  async generateMusic(params) {
    // Support both old format (prompt, duration) and new format (object)
    if (typeof params === 'string') {
      // Legacy support: generateMusic(prompt, duration)
      const prompt = params
      const duration = arguments[1] || 30
      return this.post('/generate-music', {
        prompt: prompt,
        duration: duration
      })
    }
    
    // New format: generateMusic({ prompt, duration, reference_audio_id })
    return this.post('/generate-music', {
      prompt: params.prompt,
      duration: params.duration || 30,
      reference_audio_id: params.reference_audio_id || null
    })
  }

  async getMusicGenerationStatus(jobId) {
    return this.get(`/music-status/${jobId}`)
  }

  getGeneratedMusicUrl(jobId) {
    return `${this.baseURL}/download-music/${jobId}`
  }

  getGeneratedMusicDownloadUrl(jobId) {
    return `${this.baseURL}/download-music/${jobId}`
  }
}

export default new ApiService()