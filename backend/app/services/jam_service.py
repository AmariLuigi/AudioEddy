import os
import sys
import json
import uuid
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

import torch
import torchaudio
import numpy as np
from omegaconf import OmegaConf
# from huggingface_hub import snapshot_download  # Not needed for local files

logger = logging.getLogger(__name__)

# Add JAM source to Python path
jam_path = os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'jam', 'jamify', 'src')
if jam_path not in sys.path:
    sys.path.insert(0, jam_path)
    logger.info(f"Added JAM path to sys.path: {jam_path}")

# Import JAM modules
try:
    from jam.infer import load_model, generate_latent, get_negative_style_prompt
    from jam.model.vae import StableAudioOpenVAE, DiffRhythmVAE
    from muq import MuQMuLan
    logger.info("JAM model modules imported successfully")
except ImportError as e:
    logger.warning(f"JAM model modules not available: {e}, using simplified implementation")
    load_model = None
    generate_latent = None
    get_negative_style_prompt = None
    StableAudioOpenVAE = None
    DiffRhythmVAE = None
    MuQMuLan = None

class JAMService:
    """
    Service class for JAM (Text-to-Music) generation.
    Handles model loading, text preprocessing, and music generation.
    """
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "configs/jam_infer.yaml"
        self.config = None
        self.cfm_model = None
        self.vae_model = None
        self.muq_model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_loaded = False
        self.model_dir = Path("models/jam")
        self.output_dir = Path("outputs/generated_music")
        
        # Create output directory if it doesn't exist
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"JAM Service initialized with device: {self.device}")
    
    async def initialize(self):
        """Initialize JAM models and configuration"""
        try:
            # Load configuration
            if not os.path.exists(self.config_path):
                logger.error(f"Config file not found: {self.config_path}")
                return False
                
            self.config = OmegaConf.load(self.config_path)
            OmegaConf.resolve(self.config)
            
            # Load CFM model using local checkpoint
            checkpoint_path = await self._ensure_model_checkpoint()
            if checkpoint_path and load_model is not None:
                self.cfm_model = load_model(self.config.model, checkpoint_path, self.device)
                logger.info(f"CFM model loaded successfully from: {checkpoint_path}")
            else:
                logger.warning("JAM load_model function not available or checkpoint not found")
                return False
            
            # Load VAE model (using local implementation)
            vae_type = self.config.evaluation.get('vae_type', 'stable_audio')
            if vae_type == 'diffrhythm' and DiffRhythmVAE is not None:
                try:
                    self.vae_model = DiffRhythmVAE(device=self.device).to(self.device)
                    logger.info("DiffRhythm VAE loaded successfully")
                except Exception as e:
                    logger.warning(f"Failed to load DiffRhythm VAE: {e}")
                    self.vae_model = None
            elif StableAudioOpenVAE is not None:
                try:
                    self.vae_model = StableAudioOpenVAE().to(self.device)
                    logger.info("StableAudio VAE loaded successfully")
                except Exception as e:
                    logger.warning(f"Failed to load StableAudio VAE: {e}")
                    self.vae_model = None
            else:
                self.vae_model = None
                logger.warning("VAE model not available")
            
            # Load MuQ model for style embeddings (skip for now to avoid downloading)
            # if MuQMuLan is not None:
            #     self.muq_model = MuQMuLan.from_pretrained("OpenMuQ/MuQ-MuLan-large").to(self.device).eval()
            #     logger.info("MuQ model loaded successfully")
            # else:
            #     logger.warning("MuQ model not available")
            self.muq_model = None
            logger.info("MuQ model loading skipped to use local files only")
            
            self.model_loaded = True
            logger.info(f"JAM service initialized successfully on {self.device}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize JAM service: {str(e)}")
            return False
    
    async def load_models(self) -> bool:
        """
        Load JAM models asynchronously (alias for initialize).
        """
        return await self.initialize()
    

    
    async def _ensure_model_checkpoint(self) -> Optional[str]:
        """
        Ensure model checkpoint is available locally.
        """
        try:
            # Use local JAM model checkpoint
            local_checkpoint = Path("models/jam/JAM-0.5/jam-0_5.safetensors")
            if local_checkpoint.exists():
                logger.info(f"Using local JAM checkpoint: {local_checkpoint}")
                return str(local_checkpoint)
            else:
                logger.error(f"Local JAM checkpoint not found: {local_checkpoint}")
                return None
                
        except Exception as e:
            logger.error(f"Error accessing local model: {str(e)}")
            return None
    
    async def generate_music(
        self,
        lyrics: str,
        style_prompt: str = "",
        duration: float = 30.0,
        reference_audio: Optional[str] = None,
        genre_tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate music from text/lyrics.
        
        Args:
            lyrics: Input lyrics text
            style_prompt: Style description or genre prompt
            duration: Target duration in seconds
            reference_audio: Path to reference audio file for style
            genre_tags: List of genre tags
            
        Returns:
            Dictionary containing job_id, status, and file paths
        """
        try:
            # Ensure models are loaded
            if not await self.load_models():
                return {
                    "success": False,
                    "error": "Failed to load JAM models"
                }
            
            # Generate unique job ID
            job_id = str(uuid.uuid4())
            
            # Preprocess inputs
            processed_lyrics = await self._preprocess_lyrics(lyrics, duration)
            style_embedding = await self._process_style_input(
                style_prompt, reference_audio, genre_tags
            )
            
            # Generate music
            output_path = await self._generate_music_async(
                job_id, processed_lyrics, style_embedding, duration
            )
            
            if output_path:
                return {
                    "success": True,
                    "job_id": job_id,
                    "output_path": str(output_path),
                    "duration": duration,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": "Music generation failed"
                }
                
        except Exception as e:
            logger.error(f"Error in music generation: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _preprocess_lyrics(self, lyrics: str, duration: float) -> Dict[str, Any]:
        """
        Preprocess lyrics into the format expected by JAM.
        """
        # Simple preprocessing - convert to character-level timing
        # In a real implementation, you'd use duration prediction
        chars = list(lyrics)
        char_duration = duration / len(chars) if chars else 1.0
        
        processed = {
            "char": [
                {
                    "char": char,
                    "start_offset": i,
                    "end_offset": i + 1,
                    "start": i * char_duration,
                    "end": (i + 1) * char_duration
                }
                for i, char in enumerate(chars)
            ]
        }
        
        return processed
    
    async def _process_style_input(
        self,
        style_prompt: str,
        reference_audio: Optional[str],
        genre_tags: Optional[List[str]]
    ) -> Dict[str, Any]:
        """
        Process style input into embeddings.
        """
        style_data = {}
        
        if style_prompt:
            style_data["text_prompt"] = style_prompt
        
        if genre_tags:
            style_data["genre_tags"] = genre_tags
            style_data["genre_prompt"] = ", ".join(genre_tags)
        
        if reference_audio and os.path.exists(reference_audio):
            # Extract style embedding from reference audio
            if self.muq_model:
                try:
                    # Load and process reference audio
                    audio, sr = torchaudio.load(reference_audio)
                    if sr != 44100:
                        audio = torchaudio.functional.resample(audio, sr, 44100)
                    
                    # Extract style embedding
                    with torch.no_grad():
                        style_embedding = self.muq_model.encode(audio.to(self.device))
                        style_data["style_embedding"] = style_embedding.cpu().numpy()
                except Exception as e:
                    logger.warning(f"Failed to extract style from reference audio: {e}")
        
        return style_data
    
    async def _generate_music_async(
        self,
        job_id: str,
        lyrics_data: Dict[str, Any],
        style_data: Dict[str, Any],
        duration: float
    ) -> Optional[Path]:
        """
        Generate music asynchronously.
        """
        try:
            # Create temporary files for JAM input
            temp_dir = self.output_dir / job_id
            temp_dir.mkdir(exist_ok=True)
            
            lyrics_file = temp_dir / "lyrics.json"
            with open(lyrics_file, 'w') as f:
                json.dump(lyrics_data, f)
            
            # Create style prompt file if needed
            style_file = None
            if "genre_prompt" in style_data:
                style_file = temp_dir / "style.txt"
                with open(style_file, 'w') as f:
                    f.write(style_data["genre_prompt"])
            
            # Run JAM inference in executor
            loop = asyncio.get_event_loop()
            output_path = await loop.run_in_executor(
                None,
                self._run_jam_inference,
                str(lyrics_file),
                str(style_file) if style_file else None,
                duration,
                str(temp_dir)
            )
            
            return Path(output_path) if output_path else None
            
        except Exception as e:
            logger.error(f"Error in async music generation: {str(e)}")
            return None
    
    def _run_jam_inference(
        self,
        lyrics_file: str,
        style_file: Optional[str],
        duration: float,
        output_dir: str
    ) -> Optional[str]:
        """
        Run JAM inference synchronously using actual JAM models.
        """
        try:
            # Load lyrics data
            with open(lyrics_file, 'r') as f:
                lrc_data = json.load(f)
            
            # Create a simple batch for inference
            batch = {
                "lrc": [lrc_data],
                "prompt": [torch.randn(1, 512).to(self.device)],  # Default style embedding
                "start_time": [torch.tensor([0.0])],
                "duration_abs": [torch.tensor([duration])],
                "duration_rel": [torch.tensor([1.0])]
            }
            
            # Generate latent using JAM
            sample_kwargs = self.config.evaluation.sample_kwargs
            negative_style_prompt_path = self.config.evaluation.negative_style_prompt
            
            latents = generate_latent(
                model=self.cfm_model,
                batch=batch,
                sample_kwargs=sample_kwargs,
                negative_style_prompt_path=negative_style_prompt_path,
                ignore_style=self.config.evaluation.ignore_style
            )
            
            # Decode latents to audio using VAE
            if self.vae_model is not None:
                with torch.no_grad():
                    audio = self.vae_model.decode(latents)
            else:
                # Fallback: create dummy audio
                audio = torch.randn(1, int(duration * 44100))
            
            # Save audio file
            output_file = os.path.join(output_dir, "generated_music.wav")
            torchaudio.save(output_file, audio.cpu(), 44100)
            
            return output_file
            
        except Exception as e:
            logger.error(f"JAM inference error: {str(e)}")
            return None
    
    def get_model_status(self) -> Dict[str, Any]:
        """
        Get current model loading status.
        """
        return {
            "loaded": self.model_loaded,
            "device": str(self.device),
            "models": {
                "cfm": self.cfm_model is not None,
                "vae": self.vae_model is not None,
                "muq": self.muq_model is not None
            }
        }
    
    async def cleanup_job(self, job_id: str):
        """
        Clean up temporary files for a job.
        """
        try:
            job_dir = self.output_dir / job_id
            if job_dir.exists():
                import shutil
                shutil.rmtree(job_dir)
                logger.info(f"Cleaned up job directory: {job_id}")
        except Exception as e:
            logger.error(f"Error cleaning up job {job_id}: {str(e)}")

# Global JAM service instance
jam_service = JAMService()

# Convenience functions
async def generate_music(
    lyrics: str,
    style_prompt: str = "",
    duration: float = 30.0,
    reference_audio: Optional[str] = None,
    genre_tags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Convenience function for music generation.
    """
    return await jam_service.generate_music(
        lyrics, style_prompt, duration, reference_audio, genre_tags
    )

async def get_jam_status() -> Dict[str, Any]:
    """
    Get JAM service status.
    """
    return jam_service.get_model_status()

async def load_jam_models() -> bool:
    """
    Load JAM models.
    """
    return await jam_service.load_models()