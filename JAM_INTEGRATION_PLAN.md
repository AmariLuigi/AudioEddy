# JAM (Text-to-Music) Integration Plan for AudioEddy

## Overview
This document outlines the integration strategy for adding JAM (Jamify) text-to-music generation capabilities to the AudioEddy project.

## JAM Model Analysis

### Key Features
- **Text-to-Music Generation**: Converts lyrics with timing information to full musical compositions
- **Fine-grained Control**: Word and phoneme-level timing control
- **Style Control**: Uses reference audio or text prompts for musical style
- **Compact Architecture**: 530M parameter model with efficient inference
- **Multiple Formats**: Supports LRC (lyrics with timing) and genre prompts

### Technical Architecture
- **Model Type**: Rectified Flow-based Diffusion Transformer (DiT)
- **VAE**: Uses DiffRhythm VAE for audio encoding/decoding
- **Style Embedding**: MuQ model for style extraction from reference audio
- **Text Processing**: DeepPhonemizer for phoneme conversion
- **Output**: 44.1kHz stereo audio up to 3 minutes 50 seconds

### Input Requirements
1. **Lyrics File**: JSON format with character-level timing information
2. **Style Reference**: Either reference audio file or text genre description
3. **Duration**: Target song duration in seconds
4. **Optional**: Genre prompt text file

## Integration Strategy

### Phase 1: Backend Integration

#### 1.1 JAM Service Module
- Create `backend/app/services/jam_service.py`
- Implement JAM model loading and inference
- Handle input preprocessing (lyrics, style, duration)
- Manage model checkpoints and dependencies

#### 1.2 API Endpoints
Add new endpoints to `backend/app/main.py`:
- `POST /generate-music` - Generate music from text/lyrics
- `GET /music-job/{job_id}` - Check music generation status
- `GET /download-music/{job_id}` - Download generated music

#### 1.3 Database Schema Updates
Extend `backend/app/models.py`:
- Add `MusicGenerationJob` model
- Include fields: lyrics, style_prompt, reference_audio, duration, status

### Phase 2: Frontend Integration

#### 2.1 New Pages
- `frontend/pages/GenerateMusic.jsx` - Main music generation interface
- `frontend/pages/MusicResults.jsx` - Display generated music results

#### 2.2 Components
- `frontend/components/LyricsInput.jsx` - Lyrics input with timing
- `frontend/components/StyleSelector.jsx` - Style/genre selection
- `frontend/components/MusicPlayer.jsx` - Enhanced audio player for music

#### 2.3 Navigation Updates
- Add "Generate Music" to main navigation
- Update routing in `frontend/Main.jsx`

### Phase 3: Model Setup

#### 3.1 Dependencies
Install JAM requirements:
```bash
pip install torch torchaudio transformers diffusers accelerate safetensors
pip install soundfile pyloudnorm librosa jiwer demucs
pip install webdataset omegaconf unidecode inflect
```

#### 3.2 Model Download
- Download JAM-0.5 model from Hugging Face
- Setup model storage in `backend/models/jam/`
- Configure model paths in environment variables

#### 3.3 External Dependencies
- Setup DeepPhonemizer for phoneme processing
- Configure MuQ model for style embedding
- Setup required model files (tokenizer, silence latent, etc.)

## Implementation Details

### Backend Service Architecture

```python
class JAMService:
    def __init__(self):
        self.model = None
        self.vae = None
        self.muq_model = None
        
    async def generate_music(self, lyrics: str, style_prompt: str, duration: float):
        # 1. Process lyrics to LRC format
        # 2. Generate style embedding
        # 3. Run JAM inference
        # 4. Save generated audio
        # 5. Return job ID
        
    def preprocess_lyrics(self, lyrics: str):
        # Convert plain text lyrics to timed format
        # Use duration prediction for timing
        
    def extract_style_embedding(self, reference_audio: str):
        # Use MuQ model to extract style from reference
```

### Frontend User Flow

1. **Input Phase**:
   - User enters lyrics (plain text or with timing)
   - User selects style (genre tags or uploads reference audio)
   - User sets desired duration

2. **Generation Phase**:
   - Submit request to backend
   - Show progress indicator
   - Poll for completion status

3. **Results Phase**:
   - Display generated music with player
   - Show lyrics synchronized with audio
   - Provide download options

### API Endpoints Specification

```python
# POST /generate-music
{
    "lyrics": "string",
    "style_prompt": "string",
    "reference_audio": "file (optional)",
    "duration": "float",
    "genre_tags": ["string"]
}

# Response
{
    "job_id": "string",
    "status": "processing",
    "estimated_time": "integer (seconds)"
}
```

## File Structure Changes

```
backend/
├── app/
│   ├── services/
│   │   ├── jam_service.py          # New: JAM integration
│   │   └── music_processor.py      # New: Music processing utilities
│   ├── models.py                   # Updated: Add music generation models
│   └── main.py                     # Updated: Add music generation endpoints
├── models/
│   └── jam/                        # New: JAM model files
│       ├── jam-0_5.safetensors
│       ├── en_us_cmudict_ipa_forward.pt
│       └── vocal.npy
└── requirements.txt                # Updated: Add JAM dependencies

frontend/
├── pages/
│   ├── GenerateMusic.jsx           # New: Music generation interface
│   └── MusicResults.jsx            # New: Music results display
├── components/
│   ├── LyricsInput.jsx             # New: Lyrics input component
│   ├── StyleSelector.jsx           # New: Style selection component
│   └── MusicPlayer.jsx             # New: Enhanced music player
└── utils/
    └── musicApi.js                 # New: Music generation API calls
```

## Resource Requirements

### Computational
- **GPU Memory**: 8GB+ VRAM recommended for inference
- **RAM**: 16GB+ system RAM
- **Storage**: ~5GB for model files and dependencies

### Performance Considerations
- **Generation Time**: 2-5 minutes per song depending on duration
- **Concurrent Jobs**: Limit to 1-2 simultaneous generations
- **Queue System**: Implement job queue for multiple requests

## Security & Validation

### Input Validation
- Lyrics length limits (max 1000 characters)
- Duration limits (max 240 seconds)
- File type validation for reference audio
- Rate limiting for generation requests

### Content Safety
- Lyrics content filtering
- Generated content monitoring
- User-generated content policies

## Testing Strategy

### Unit Tests
- JAM service functionality
- API endpoint validation
- Input preprocessing

### Integration Tests
- End-to-end music generation workflow
- Frontend-backend communication
- File upload and download

### Performance Tests
- Generation time benchmarks
- Memory usage monitoring
- Concurrent request handling

## Deployment Considerations

### Environment Setup
- CUDA-compatible environment for GPU acceleration
- Model file distribution and caching
- Environment variable configuration

### Monitoring
- Generation success/failure rates
- Processing time metrics
- Resource utilization tracking

## Future Enhancements

### Advanced Features
- Real-time lyrics-to-music streaming
- Multiple style mixing
- Custom instrument selection
- Collaborative music creation

### Model Improvements
- Fine-tuning on specific genres
- Custom voice/instrument training
- Higher quality output formats

This integration plan provides a comprehensive roadmap for adding JAM text-to-music generation capabilities to AudioEddy while maintaining the existing audio enhancement functionality.