import os
import torch
import librosa
import soundfile as sf
from transformers import pipeline
from typing import Optional
import asyncio
import logging
from ..models import EnhancementType, ENHANCEMENT_PROMPTS

logger = logging.getLogger(__name__)

class SonicMasterService:
    """Service for SonicMaster AI audio enhancement"""
    
    def __init__(self):
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.sample_rate = 44100
        self.initialized = False
    
    async def initialize(self):
        """Initialize the SonicMaster model"""
        try:
            logger.info(f"Initializing SonicMaster model on device: {self.device}")
            
            # Load the SonicMaster model using Hugging Face pipeline
            self.model = pipeline(
                "audio-to-audio",
                model="amaai-lab/SonicMaster",
                device=0 if self.device == "cuda" else -1
            )
            
            self.initialized = True
            logger.info("SonicMaster model initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize SonicMaster model: {str(e)}")
            # Fallback: create a mock service for development
            self.model = None
            self.initialized = True
            logger.warning("Using mock audio processing for development")
    
    async def enhance_audio(self, input_path: str, output_path: str, enhancement_type: EnhancementType) -> str:
        """Enhance audio using SonicMaster model"""
        if not self.initialized:
            raise RuntimeError("SonicMaster service not initialized")
        
        try:
            # Get the appropriate prompt for the enhancement type
            prompt = ENHANCEMENT_PROMPTS.get(enhancement_type, ENHANCEMENT_PROMPTS[EnhancementType.FIX_QUALITY])
            
            logger.info(f"Processing audio: {input_path} with enhancement: {enhancement_type}")
            
            if self.model is not None:
                # Real SonicMaster processing
                enhanced_audio = await self._process_with_sonicmaster(input_path, prompt)
                
                # Save the enhanced audio
                sf.write(output_path, enhanced_audio, self.sample_rate)
                
            else:
                # Mock processing for development
                await self._mock_process_audio(input_path, output_path, enhancement_type)
            
            logger.info(f"Audio processing completed: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Audio processing failed: {str(e)}")
            raise RuntimeError(f"Audio enhancement failed: {str(e)}")
    
    async def _process_with_sonicmaster(self, input_path: str, prompt: str):
        """Process audio with the actual SonicMaster model"""
        # Run the model in a thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        
        def _run_model():
            return self.model(input_path, prompt=prompt)
        
        result = await loop.run_in_executor(None, _run_model)
        return result
    
    async def _mock_process_audio(self, input_path: str, output_path: str, enhancement_type: EnhancementType):
        """Mock audio processing for development/testing"""
        logger.info(f"Mock processing: {enhancement_type}")
        
        # Load the original audio
        audio, sr = librosa.load(input_path, sr=self.sample_rate)
        
        # Apply simple mock enhancements based on type
        if enhancement_type == EnhancementType.REMOVE_NOISE:
            # Simple noise reduction simulation
            audio = self._apply_simple_noise_reduction(audio)
        elif enhancement_type == EnhancementType.BASS_BOOST:
            # Simple bass boost simulation
            audio = self._apply_simple_bass_boost(audio, sr)
        elif enhancement_type == EnhancementType.CLARITY_BOOST:
            # Simple clarity enhancement
            audio = self._apply_simple_clarity_boost(audio)
        else:
            # Default: slight normalization
            audio = librosa.util.normalize(audio)
        
        # Add a small delay to simulate processing time
        await asyncio.sleep(2)
        
        # Save the processed audio
        sf.write(output_path, audio, self.sample_rate)
    
    def _apply_simple_noise_reduction(self, audio):
        """Simple noise reduction simulation"""
        # Apply a simple high-pass filter to reduce low-frequency noise
        from scipy.signal import butter, filtfilt
        
        # High-pass filter at 80 Hz
        nyquist = self.sample_rate / 2
        low = 80 / nyquist
        b, a = butter(4, low, btype='high')
        filtered_audio = filtfilt(b, a, audio)
        
        return librosa.util.normalize(filtered_audio)
    
    def _apply_simple_bass_boost(self, audio, sr):
        """Simple bass boost simulation"""
        from scipy.signal import butter, filtfilt
        
        # Low-pass filter to isolate bass frequencies
        nyquist = sr / 2
        high = 200 / nyquist
        b, a = butter(4, high, btype='low')
        bass = filtfilt(b, a, audio)
        
        # Boost bass and mix back
        boosted_audio = audio + (bass * 0.3)
        
        return librosa.util.normalize(boosted_audio)
    
    def _apply_simple_clarity_boost(self, audio):
        """Simple clarity enhancement simulation"""
        from scipy.signal import butter, filtfilt
        
        # Mid-frequency boost around 2-4 kHz for clarity
        nyquist = self.sample_rate / 2
        low = 2000 / nyquist
        high = 4000 / nyquist
        b, a = butter(4, [low, high], btype='band')
        mids = filtfilt(b, a, audio)
        
        # Boost mids and mix back
        enhanced_audio = audio + (mids * 0.2)
        
        return librosa.util.normalize(enhanced_audio)
    
    def get_model_info(self) -> dict:
        """Get information about the loaded model"""
        return {
            "initialized": self.initialized,
            "device": self.device,
            "model_loaded": self.model is not None,
            "sample_rate": self.sample_rate
        }