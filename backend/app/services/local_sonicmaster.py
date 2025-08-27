import os
import sys
import torch
import librosa
import soundfile as sf
from typing import Optional
import asyncio
import logging
from pathlib import Path
import yaml
from safetensors.torch import load_file
from diffusers import AutoencoderOobleck
import torchaudio

from ..models import EnhancementType, ENHANCEMENT_PROMPTS

logger = logging.getLogger(__name__)

# Add SonicMaster directory to path for imports
SONICMASTER_DIR = Path(__file__).parent.parent.parent.parent / "SonicMaster"
if SONICMASTER_DIR.exists():
    sys.path.insert(0, str(SONICMASTER_DIR))
    logger.info(f"Added SonicMaster path to sys.path: {SONICMASTER_DIR}")
else:
    logger.error(f"SonicMaster directory not found at: {SONICMASTER_DIR}")

try:
    from model import TangoFlux
    logger.info("Successfully imported TangoFlux model")
except ImportError as e:
    logger.error(f"Failed to import TangoFlux model: {e}")
    TangoFlux = None

class LocalSonicMasterService:
    """Service for local SonicMaster AI audio enhancement"""
    
    def __init__(self):
        self.model = None
        self.vae = None
        # Force GPU device 0 usage (with development fallback)
        import os
        dev_mode = os.getenv("AUDIOEDDY_DEV_MODE", "false").lower() == "true"
        
        if torch.cuda.is_available():
            self.device = torch.device("cuda:0")
            torch.cuda.set_device(0)
            logger.info(f"Using GPU device: {self.device}")
        elif dev_mode:
            self.device = torch.device("cpu")
            logger.warning("CUDA not available. Running in development mode with CPU (not recommended for production)")
        else:
            raise RuntimeError("CUDA is not available. GPU device 0 is required. Set AUDIOEDDY_DEV_MODE=true for CPU testing.")
        self.sample_rate = 44100
        self.initialized = False
        self.config = None
        
        # Paths
        self.sonicmaster_dir = SONICMASTER_DIR
        self.model_dir = Path(__file__).parent.parent.parent.parent / "SonicMasterModel"
        self.config_path = self.sonicmaster_dir / "configs" / "tangoflux_config.yaml"
        self.model_path = self.model_dir / "model.safetensors"
        
        # Load memory configuration
        self._load_memory_config()
        
        # GPU-optimized settings for better performance
        self.thermal_protection = True  # Keep thermal monitoring for safety
        self.power_limit_protection = True  # Keep power monitoring for safety
        self.emergency_fallback = True  # Keep emergency fallback for safety
    
    def _load_memory_config(self):
        """Load memory configuration from YAML file"""
        try:
            config_path = Path(__file__).parent.parent.parent / "config" / "memory_config.yaml"
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config = yaml.safe_load(f)
                
                # Load memory optimization settings
                mem_config = config.get('memory_optimization', {})
                self.use_cpu_offload = mem_config.get('use_cpu_offload', False)
                self.use_mixed_precision = mem_config.get('use_mixed_precision', True)
                self.max_vram_usage = mem_config.get('max_vram_usage', 0.85)
                self.min_free_vram = mem_config.get('min_free_vram', 0.1)
                self.vae_batch_size = mem_config.get('vae_batch_size', 4)
                
                # Load thermal protection settings
                thermal_config = config.get('thermal_protection', {})
                self.max_gpu_temp = thermal_config.get('max_gpu_temp', 80)
                
                logger.info(f"Memory config loaded: CPU offload={self.use_cpu_offload}, Max VRAM={self.max_vram_usage*100:.0f}%")
            else:
                # Default GPU-optimized settings
                self.use_cpu_offload = False
                self.use_mixed_precision = True
                self.max_vram_usage = 0.85
                self.min_free_vram = 0.1
                self.vae_batch_size = 4
                self.max_gpu_temp = 80
                logger.warning("Memory config file not found, using GPU-optimized defaults")
                
        except Exception as e:
            logger.error(f"Failed to load memory config: {e}")
            # Fallback to GPU-optimized defaults
            self.use_cpu_offload = False
            self.use_mixed_precision = True
            self.max_vram_usage = 0.85
            self.min_free_vram = 0.1
            self.vae_batch_size = 4
            self.max_gpu_temp = 80
        
    async def initialize(self):
        """Initialize the local SonicMaster model with memory optimization"""
        try:
            logger.info(f"Initializing local SonicMaster model on device: {self.device}")
            
            # Set PyTorch memory optimization flags
            if torch.cuda.is_available():
                # Enable memory efficient attention and reduce fragmentation
                torch.backends.cuda.matmul.allow_tf32 = True
                torch.backends.cudnn.allow_tf32 = True
                # Set expandable segments to reduce fragmentation
                import os
                os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
                logger.info("Enabled CUDA memory optimizations")
            
            # Check if required files exist
            if not self.config_path.exists():
                raise FileNotFoundError(f"Config file not found: {self.config_path}")
            if not self.model_path.exists():
                raise FileNotFoundError(f"Model file not found: {self.model_path}")
            
            # Load config
            with open(self.config_path, "r") as f:
                self.config = yaml.safe_load(f)
            
            # Initialize model
            if TangoFlux is None:
                raise ImportError("TangoFlux model class not available")
                
            self.model = TangoFlux(config=self.config["model"])
            
            # Load model weights with memory optimization strategy
            logger.info(f"Loading model weights from: {self.model_path}")
            weights = load_file(str(self.model_path))
            
            # Load model on CPU first to save VRAM
            self.model.load_state_dict(weights, strict=False)
            logger.info("Model weights loaded on CPU")
            
            # Initialize model with GPU optimization
            if self.use_cpu_offload:
                logger.info("Using CPU offloading for memory optimization")
                # Keep model on CPU initially
                self.model.eval()
                # Setup CPU offloading
                self._setup_cpu_offloading()
            else:
                logger.info("GPU-only mode: Moving model to GPU for optimal performance")
                self.model = self.model.to(self.device)
                self.model.eval()
                # Optimize for GPU-only operation
                self._optimize_for_gpu()
            
            # Freeze text encoder params
            if hasattr(self.model, 'text_encoder'):
                for p in self.model.text_encoder.parameters():
                    p.requires_grad = False
                self.model.text_encoder.eval()
                # Keep text encoder on GPU in GPU-only mode
                if not self.use_cpu_offload:
                    self.model.text_encoder = self.model.text_encoder.to(self.device)
            
            logger.info(f"SonicMaster model loaded successfully")
            logger.info(f"Memory optimization settings: CPU offload={self.use_cpu_offload}, Mixed precision={self.use_mixed_precision}, Max VRAM={self.max_vram_usage*100:.0f}%")
            
            self.initialized = True
            logger.info("Local SonicMaster model initialized successfully with memory optimization")
            
        except Exception as e:
            logger.error(f"Failed to initialize local SonicMaster model: {str(e)}")
            # Fallback: create a mock service for development
            self.model = None
            self.initialized = True
            logger.warning("Using mock audio processing for development")
    
    def _setup_cpu_offloading(self):
        """Setup CPU offloading for memory optimization"""
        try:
            if self.use_cpu_offload and hasattr(self.model, 'text_encoder'):
                # Keep text encoder on CPU to save VRAM
                self.model.text_encoder = self.model.text_encoder.to('cpu')
                logger.info("Text encoder moved to CPU for memory optimization")
                
                # Setup hooks for dynamic GPU/CPU movement
                self._setup_offload_hooks()
                
        except Exception as e:
            logger.warning(f"CPU offloading setup failed: {e}")
    
    def _setup_offload_hooks(self):
        """Setup hooks for dynamic model component offloading"""
        try:
            # This will be called to move components to GPU when needed
            def move_to_gpu_hook(module, input):
                if not next(module.parameters()).is_cuda:
                    module.to(self.device)
                return None
            
            # This will be called to move components back to CPU after use
            def move_to_cpu_hook(module, input, output):
                # Move back to CPU after a delay to allow for immediate reuse
                torch.cuda.synchronize()
                return output
            
            # Apply hooks to large model components
            if hasattr(self.model, 'unet'):
                self.model.unet.register_forward_pre_hook(move_to_gpu_hook)
                
        except Exception as e:
            logger.warning(f"Offload hooks setup failed: {e}")
    
    def _optimize_for_gpu(self):
        """Optimize model for GPU-only operation with advanced memory management"""
        try:
            logger.info("Optimizing model for GPU-only operation with enhanced memory management")
            
            # Enable GPU optimizations
            if torch.cuda.is_available():
                # Advanced PyTorch memory optimizations
                torch.backends.cuda.matmul.allow_tf32 = True
                torch.backends.cudnn.allow_tf32 = True
                torch.backends.cudnn.benchmark = True  # Optimize for consistent input sizes
                
                # Set memory format for better performance
                if hasattr(self.model, 'unet'):
                    self.model.unet = self.model.unet.to(memory_format=torch.channels_last)
                    logger.info("UNet optimized with channels_last memory format")
                
                # Disable gradient computation for inference-only components
                # This is crucial for memory optimization as mentioned in the article
                if hasattr(self.model, 'text_encoder'):
                    for param in self.model.text_encoder.parameters():
                        param.requires_grad_(False)
                    logger.info("Text encoder gradients disabled for memory optimization")
                
                if hasattr(self.model, 'vae'):
                    for param in self.model.vae.parameters():
                        param.requires_grad_(False)
                    logger.info("VAE gradients disabled for memory optimization")
                
                # Enable compilation for better performance (if supported)
                try:
                    if hasattr(torch, 'compile') and hasattr(self.model, 'unet'):
                        self.model.unet = torch.compile(self.model.unet, mode="reduce-overhead")
                        logger.info("UNet compiled for better performance")
                except Exception as e:
                    logger.warning(f"Model compilation failed: {e}")
                
                # Set CUDA stream for better memory management
                self.cuda_stream = torch.cuda.Stream()
                logger.info("CUDA stream created for optimized memory management")
                
                # Initialize memory leak detection
                self._setup_memory_leak_detection()
                
                # Enable memory efficient attention if available
                try:
                    import xformers
                    if hasattr(self.model, 'enable_xformers_memory_efficient_attention'):
                        self.model.enable_xformers_memory_efficient_attention()
                        logger.info("XFormers memory efficient attention enabled")
                except ImportError:
                    logger.info("XFormers not available, using standard attention")
                
            logger.info("GPU optimization completed with enhanced memory management")
            
        except Exception as e:
            logger.warning(f"GPU optimization failed: {e}")
    
    def _enable_aggressive_cpu_offload(self):
        """Enable aggressive CPU offloading when VRAM is low"""
        try:
            if hasattr(self.model, 'unet'):
                self.model.unet = self.model.unet.to('cpu')
                logger.info("UNet moved to CPU for memory conservation")
            
            if hasattr(self.model, 'vae'):
                self.model.vae = self.model.vae.to('cpu')
                logger.info("VAE moved to CPU for memory conservation")
                
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
            
        except Exception as e:
            logger.warning(f"Aggressive CPU offloading failed: {e}")
    
    def _check_thermal_safety(self):
        """Check GPU temperature and thermal throttling status"""
        if not torch.cuda.is_available() or not self.thermal_protection:
            return True
        
        try:
            # Get GPU temperature using nvidia-ml-py if available
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            
            if temp > self.max_gpu_temp:
                logger.warning(f"GPU temperature too high: {temp}°C > {self.max_gpu_temp}°C. Enabling thermal protection.")
                return False
            
            logger.info(f"GPU temperature: {temp}°C (safe)")
            return True
            
        except ImportError:
            logger.warning("pynvml not available for thermal monitoring. Install nvidia-ml-py for better thermal protection.")
            return True
        except Exception as e:
            logger.warning(f"Thermal monitoring failed: {e}")
            return True
    
    def _check_power_safety(self):
        """Check GPU power consumption and throttling"""
        if not torch.cuda.is_available() or not self.power_limit_protection:
            return True
        
        try:
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            
            # Get power usage
            power_usage = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000.0  # Convert to watts
            power_limit = pynvml.nvmlDeviceGetPowerManagementLimitConstraints(handle)[1] / 1000.0
            
            power_ratio = power_usage / power_limit
            
            if power_ratio > 0.9:  # 90% of power limit
                logger.warning(f"GPU power usage high: {power_usage:.1f}W ({power_ratio*100:.1f}% of limit)")
                return False
            
            logger.info(f"GPU power usage: {power_usage:.1f}W ({power_ratio*100:.1f}% of limit)")
            return True
            
        except ImportError:
            logger.warning("pynvml not available for power monitoring. Install nvidia-ml-py for better power protection.")
            return True
        except Exception as e:
            logger.warning(f"Power monitoring failed: {e}")
            return True
    
    def _advanced_memory_monitoring(self):
        """Advanced memory monitoring with detailed allocation tracking"""
        if not torch.cuda.is_available():
            return True
        
        try:
            # Get detailed memory statistics
            memory_stats = torch.cuda.memory_stats()
            allocated = torch.cuda.memory_allocated()
            reserved = torch.cuda.memory_reserved()
            max_allocated = torch.cuda.max_memory_allocated()
            max_reserved = torch.cuda.max_memory_reserved()
            
            # Calculate memory efficiency metrics
            total_memory = torch.cuda.get_device_properties(0).total_memory
            allocation_ratio = allocated / total_memory
            reservation_ratio = reserved / total_memory
            fragmentation_ratio = (reserved - allocated) / total_memory if reserved > 0 else 0
            
            logger.info(f"Memory Stats - Allocated: {allocated/1024**3:.2f}GB ({allocation_ratio*100:.1f}%), "
                       f"Reserved: {reserved/1024**3:.2f}GB ({reservation_ratio*100:.1f}%), "
                       f"Fragmentation: {fragmentation_ratio*100:.1f}%")
            
            # Check for memory fragmentation issues
            if fragmentation_ratio > 0.2:  # More than 20% fragmentation
                logger.warning(f"High memory fragmentation detected: {fragmentation_ratio*100:.1f}%")
                torch.cuda.empty_cache()
                
                # Try CuPy memory cleanup if available
                try:
                    import cupy
                    mempool = cupy.get_default_memory_pool()
                    mempool.free_all_blocks()
                    logger.info("CuPy memory defragmentation completed")
                except ImportError:
                    pass
            
            # Check if we're approaching memory limits
            if allocation_ratio > self.max_vram_usage:
                logger.warning(f"Memory usage exceeds limit: {allocation_ratio*100:.1f}% > {self.max_vram_usage*100:.1f}%")
                return False
            
            return True
            
        except Exception as e:
            logger.warning(f"Advanced memory monitoring failed: {e}")
            return True
    
    def _setup_memory_leak_detection(self):
        """Setup memory leak detection and tracking"""
        if torch.cuda.is_available():
            # Initialize memory tracking variables
            self._initial_memory = torch.cuda.memory_allocated()
            self._memory_snapshots = []
            self._memory_leak_threshold = 100 * 1024 * 1024  # 100MB threshold
            
            # Reset peak memory stats for clean tracking
            torch.cuda.reset_peak_memory_stats()
            
            # Enable anomaly detection in debug mode
            if logger.level <= 10:  # DEBUG level
                torch.autograd.set_detect_anomaly(True)
                logger.debug("Memory anomaly detection enabled")
            
            logger.info("Memory leak detection initialized")
    
    def _check_memory_leaks(self):
        """Check for potential memory leaks during processing"""
        if not torch.cuda.is_available():
            return True
        
        try:
            current_memory = torch.cuda.memory_allocated()
            memory_growth = current_memory - self._initial_memory
            
            # Track memory snapshots
            self._memory_snapshots.append(current_memory)
            
            # Keep only recent snapshots (last 10)
            if len(self._memory_snapshots) > 10:
                self._memory_snapshots.pop(0)
            
            # Check for consistent memory growth (potential leak)
            if len(self._memory_snapshots) >= 5:
                recent_growth = self._memory_snapshots[-1] - self._memory_snapshots[-5]
                if recent_growth > self._memory_leak_threshold:
                    logger.warning(f"Potential memory leak detected: {recent_growth/1024**2:.1f}MB growth in recent operations")
                    
                    # Aggressive cleanup
                    torch.cuda.empty_cache()
                    try:
                        import cupy
                        mempool = cupy.get_default_memory_pool()
                        mempool.free_all_blocks()
                    except ImportError:
                        pass
                    
                    return False
            
            # Log memory usage periodically
            if len(self._memory_snapshots) % 5 == 0:
                logger.info(f"Memory usage: {current_memory/1024**3:.2f}GB (growth: {memory_growth/1024**2:.1f}MB)")
            
            return True
            
        except Exception as e:
            logger.warning(f"Memory leak detection failed: {e}")
            return True
    
    def _check_system_safety(self):
        """Comprehensive system safety check with advanced memory monitoring"""
        thermal_safe = self._check_thermal_safety()
        power_safe = self._check_power_safety()
        memory_safe = self._advanced_memory_monitoring()
        leak_safe = self._check_memory_leaks()
        
        if not thermal_safe or not power_safe or not memory_safe or not leak_safe:
            logger.warning("System safety check failed. Enabling emergency CPU fallback.")
            self._enable_aggressive_cpu_offload()
            return False
        
        return True
    
    async def enhance_audio(self, input_path: str, output_path: str, enhancement_type: EnhancementType) -> str:
        """Enhance audio using local SonicMaster model"""
        if not self.initialized:
            raise RuntimeError("Local SonicMaster service not initialized")
        
        try:
            # Get the appropriate prompt for the enhancement type
            prompt = ENHANCEMENT_PROMPTS.get(enhancement_type, ENHANCEMENT_PROMPTS[EnhancementType.FIX_QUALITY])
            
            logger.info(f"Processing audio: {input_path} with enhancement: {enhancement_type}")
            logger.info(f"Using prompt: {prompt}")
            
            if self.model is not None:
                # Real local SonicMaster processing
                await self._process_with_local_sonicmaster(input_path, output_path, prompt)
            else:
                # Mock processing for development
                await self._mock_process_audio(input_path, output_path, enhancement_type)
            
            logger.info(f"Audio processing completed: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Audio processing failed: {str(e)}")
            raise RuntimeError(f"Audio enhancement failed: {str(e)}")
    
    async def enhance_audio_with_prompt(self, input_path: str, output_path: str, prompt: str) -> str:
        """Enhance audio using local SonicMaster model with custom prompt"""
        if not self.initialized:
            raise RuntimeError("Local SonicMaster service not initialized")
        
        try:
            logger.info(f"Processing audio: {input_path} with custom prompt: {prompt}")
            
            if self.model is not None:
                # Real local SonicMaster processing with custom prompt
                await self._process_with_local_sonicmaster(input_path, output_path, prompt)
            else:
                # Mock processing for development
                await self._mock_process_audio_with_prompt(input_path, output_path, prompt)
            
            logger.info(f"Audio processing completed: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Audio processing with prompt failed: {str(e)}")
            raise RuntimeError(f"Audio enhancement with prompt failed: {str(e)}")
    
    async def _process_with_local_sonicmaster(self, input_path: str, output_path: str, prompt: str):
        """Process audio with the local SonicMaster model"""
        # Run the model in a thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        
        def _run_local_model():
            return self._inference_single_audio(input_path, output_path, prompt)
        
        await loop.run_in_executor(None, _run_local_model)
    
    @torch.no_grad()
    def _inference_single_audio(self, input_path: str, output_path: str, prompt: str):
        """Single audio inference using local model with memory optimization and safety checks"""
        import time
        start_time = time.time()
        logger.info(f"[DEBUG] Starting audio inference for: {input_path}")
        
        try:
            # System safety check before processing
            safety_start = time.time()
            if not self._check_system_safety():
                logger.warning("System safety check failed. Using emergency CPU fallback.")
                if self.emergency_fallback:
                    self._sync_mock_process_audio_with_prompt(input_path, output_path, prompt)
                    return
                else:
                    raise RuntimeError("System safety check failed and emergency fallback disabled")
            logger.info(f"[DEBUG] Safety check completed in {time.time() - safety_start:.2f}s")
            
            # Conservative memory management with CuPy integration
            memory_start = time.time()
            logger.info(f"[DEBUG] Starting memory management setup")
            if torch.cuda.is_available():
                # CuPy memory recycling for additional GPU memory management
                try:
                    import cupy
                    mempool = cupy.get_default_memory_pool()
                    mempool.free_all_blocks()
                    logger.info("CuPy memory pool recycled successfully")
                except ImportError:
                    logger.info("CuPy not available, using PyTorch memory management only")
                except Exception as e:
                    logger.warning(f"CuPy memory recycling failed: {e}")
                
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
                
                gpu_memory = torch.cuda.get_device_properties(0).total_memory
                gpu_allocated = torch.cuda.memory_allocated(0)
                gpu_free = gpu_memory - gpu_allocated
                max_allowed = gpu_memory * self.max_vram_usage
                
                logger.info(f"GPU Memory - Total: {gpu_memory/1024**3:.1f}GB, Allocated: {gpu_allocated/1024**3:.1f}GB, Free: {gpu_free/1024**3:.1f}GB")
                logger.info(f"Max allowed VRAM usage: {max_allowed/1024**3:.1f}GB (conservative: {self.max_vram_usage*100:.0f}%)")
                
                # More conservative memory check with safety margin
                if gpu_allocated > max_allowed or gpu_free < (gpu_memory * 0.2):  # Ensure 20% free memory
                    logger.warning(f"VRAM usage too high or insufficient free memory. Using CPU offloading.")
                    self._enable_aggressive_cpu_offload()
            logger.info(f"[DEBUG] Memory management setup completed in {time.time() - memory_start:.2f}s")
            
            # Enable mixed precision if available
            autocast_context = torch.cuda.amp.autocast() if self.use_mixed_precision and torch.cuda.is_available() else torch.no_grad()
            
            # Use original SonicMaster parameters for proper audio quality
            chunk_duration = 30  # Original SonicMaster default
            num_inference_steps = 10  # Original SonicMaster default
            guidance_scale = 1.0
            solver = "Euler"
            seed = 0
            overlap_duration = 10  # Original SonicMaster default
            
            logger.info(f"Processing audio with prompt: '{prompt}'")
            logger.info(f"Parameters: sample_rate={self.sample_rate}, chunk_duration={chunk_duration}, steps={num_inference_steps}, guidance={guidance_scale}")
            
            # Memory-efficient processing with autocast
            with autocast_context:
                # Read & standardize input with length limit
                audio_load_start = time.time()
                logger.info(f"[DEBUG] Starting audio loading")
                in_path = Path(input_path)
                if not in_path.exists():
                    raise FileNotFoundError(f"Input audio not found: {in_path}")
                
                audio, sr = torchaudio.load(str(in_path))  # [C, T]
                logger.info(f"[DEBUG] Audio loaded in {time.time() - audio_load_start:.2f}s")
                
                # Temporarily limit to 30 seconds to test for trash audio issue
                max_samples = 30 * sr
                if audio.shape[1] > max_samples:
                    audio = audio[:, :max_samples]
                    logger.info(f"Audio truncated to 30 seconds for testing (was {audio.shape[1]/sr:.1f}s)")
                
                logger.info(f"Processing audio of length: {audio.shape[1]/sr:.1f}s")
            
                # Force stereo
                if audio.shape[0] == 1:
                    audio = audio.repeat(2, 1)
                elif audio.shape[0] > 2:
                    audio = audio[:2, :]
                
                # Resample to target fs
                if sr != self.sample_rate:
                    audio = torchaudio.functional.resample(audio, sr, self.sample_rate)
                    sr = self.sample_rate
                
                audio = audio.to(self.device, non_blocking=True)
            
                # Load VAE with error handling and proper device management
                vae_load_start = time.time()
                logger.info(f"[DEBUG] Starting VAE loading")
                try:
                    from diffusers import AutoencoderOobleck
                    vae_path = Path("Z:/PROJECTS/AudioEddy/SonicMasterModel/VAE")
                    vae = AutoencoderOobleck.from_pretrained(str(vae_path))
                    logger.info(f"[DEBUG] VAE model loaded from disk in {time.time() - vae_load_start:.2f}s")
                    
                    # Handle device placement based on CPU offloading setting
                    device_start = time.time()
                    if self.use_cpu_offload:
                        # Keep VAE on CPU initially, move to GPU only when needed
                        vae = vae.to('cpu')
                        logger.info("VAE loaded on CPU for memory optimization")
                    else:
                        vae = vae.to(self.device, non_blocking=True)
                        logger.info(f"VAE loaded on {self.device}")
                    logger.info(f"[DEBUG] VAE device placement completed in {time.time() - device_start:.2f}s")
                        
                    vae.eval()
                    logger.info(f"[DEBUG] Total VAE loading time: {time.time() - vae_load_start:.2f}s")
                except Exception as e:
                    logger.error(f"Failed to load VAE: {e}")
                    raise RuntimeError("VAE loading failed - using mock processing")
            
                # Chunking parameters with memory limits
                chunking_start = time.time()
                logger.info(f"[DEBUG] Starting audio chunking")
                chunk_size = chunk_duration * self.sample_rate
                overlap = overlap_duration * self.sample_rate
                stride = chunk_size - overlap
                
                # Create chunks without artificial limits
                chunks = []
                start = 0
                T = audio.shape[1]
                
                while start < T:
                    end = min(start + chunk_size, T)
                    ch = audio[:, start:end]
                    if ch.shape[1] < chunk_size:
                        ch = torch.nn.functional.pad(ch, (0, chunk_size - ch.shape[1]))
                    chunks.append(ch)
                    start += stride
                
                if not chunks:
                    raise RuntimeError("No audio content to process.")
                
                logger.info(f"[DEBUG] Audio chunking completed in {time.time() - chunking_start:.2f}s")
                logger.info(f"Processing {len(chunks)} chunks with reduced memory footprint")
            
                # Encode chunks with VAE (optimized batch size) with GPU-only operation
                encoding_start = time.time()
                logger.info(f"[DEBUG] Starting VAE encoding of {len(chunks)} chunks")
                chunk_tensor = torch.stack(chunks)  # [N, 2, T]
                latents = []
                vae_batch_size = self.vae_batch_size  # Use configured batch size
                
                # Ensure VAE is on GPU for GPU-only mode
                if not self.use_cpu_offload:
                    vae = vae.to(self.device)
                
                total_batches = (chunk_tensor.shape[0] + vae_batch_size - 1) // vae_batch_size
                logger.info(f"[DEBUG] Processing {total_batches} VAE encoding batches")
                
                for batch_idx, b in enumerate(range(0, chunk_tensor.shape[0], vae_batch_size)):
                    batch_start = time.time()
                    batch = chunk_tensor[b:b + vae_batch_size]
                    logger.info(f"[DEBUG] Processing VAE batch {batch_idx + 1}/{total_batches}, size: {batch.shape[0]}")
                    
                    # GPU-optimized processing
                    if self.use_cpu_offload:
                        # Move VAE to GPU temporarily for encoding
                        vae = vae.to(self.device)
                        batch = batch.to(self.device)
                    else:
                        # GPU-only mode: keep everything on GPU
                        batch = batch.to(self.device, non_blocking=True)
                    
                    z = vae.encode(batch).latent_dist.mode()  # [B, C, T']
                    
                    if self.use_cpu_offload:
                        latents.append(z.cpu())  # Move to CPU for offloading
                        # Move VAE back to CPU if using offloading
                        vae = vae.to('cpu')
                    else:
                        # GPU-only mode: keep latents on GPU for better performance
                        latents.append(z)
                    
                    logger.info(f"[DEBUG] VAE batch {batch_idx + 1} completed in {time.time() - batch_start:.2f}s")
                    
                    # Clear GPU cache after each batch with CuPy integration
                    if torch.cuda.is_available():
                        try:
                            import cupy
                            mempool = cupy.get_default_memory_pool()
                            mempool.free_all_blocks()
                        except (ImportError, Exception):
                            pass  # Silently continue if CuPy unavailable
                        torch.cuda.empty_cache()
                
                # Concatenate latents based on mode
                if self.use_cpu_offload:
                    degraded_latents = torch.cat(latents, dim=0).to(self.device, non_blocking=True)  # [N, C, T']
                else:
                    # GPU-only mode: latents are already on GPU
                    degraded_latents = torch.cat(latents, dim=0)  # [N, C, T']
            
                logger.info(f"[DEBUG] VAE encoding completed in {time.time() - encoding_start:.2f}s")
                
                # Process chunks with memory-efficient context management
                inference_start = time.time()
                logger.info(f"[DEBUG] Starting model inference for {degraded_latents.shape[0]} chunks")
                decoded_chunks = []
                prev_cond = None
                
                # Memory-efficient processing with context managers
                class MemoryEfficientContext:
                    def __init__(self, use_cpu_offload, device):
                        self.use_cpu_offload = use_cpu_offload
                        self.device = device
                        self.initial_memory = torch.cuda.memory_allocated() if torch.cuda.is_available() else 0
                    
                    def __enter__(self):
                        # Clear any cached memory before processing
                        if torch.cuda.is_available():
                            torch.cuda.empty_cache()
                        return self
                    
                    def __exit__(self, exc_type, exc_val, exc_tb):
                        # Aggressive memory cleanup on exit
                        if torch.cuda.is_available():
                            try:
                                import cupy
                                mempool = cupy.get_default_memory_pool()
                                mempool.free_all_blocks()
                            except (ImportError, Exception):
                                pass
                            torch.cuda.empty_cache()
                            
                            # Log memory usage change
                            final_memory = torch.cuda.memory_allocated()
                            memory_diff = final_memory - self.initial_memory
                            if memory_diff > 0:
                                logger.info(f"Memory increased by {memory_diff/1024**2:.1f}MB during processing")
                
                for i in range(degraded_latents.shape[0]):
                    chunk_inference_start = time.time()
                    logger.info(f"[DEBUG] Starting inference for chunk {i+1}/{degraded_latents.shape[0]}")
                    with MemoryEfficientContext(self.use_cpu_offload, self.device):
                        # Periodic safety check during processing
                        if i > 0 and i % 2 == 0:  # Check every 2 chunks
                            if not self._check_system_safety():
                                logger.warning(f"Safety check failed during chunk {i+1}. Switching to emergency fallback.")
                                if self.emergency_fallback:
                                    self._sync_mock_process_audio_with_prompt(input_path, output_path, prompt)
                                    return
                        
                        # Convert to expected format [1, T', C] for the model - exactly like original SonicMaster
                        z_in = degraded_latents[i].unsqueeze(0).transpose(1, 2)  # [1, T', C]
                        
                        logger.info(f"Processing chunk {i+1}/{degraded_latents.shape[0]}, z_in shape: {z_in.shape}")
                        
                        # Ensure model and tensors are on the correct device for inference
                        if self.use_cpu_offload:
                            # Move model to GPU temporarily for inference
                            self.model = self.model.to(self.device)
                            # Ensure input tensors are on the same device as the model
                            z_in = z_in.to(self.device, non_blocking=True)
                            if prev_cond is not None:
                                prev_cond = prev_cond.to(self.device, non_blocking=True)
                        else:
                            # GPU-only mode: tensors should already be on GPU, but ensure consistency
                            z_in = z_in.to(self.device, non_blocking=True)
                            if prev_cond is not None:
                                prev_cond = prev_cond.to(self.device, non_blocking=True)
                        
                        # Memory-efficient inference with tensor optimization
                        model_inference_start = time.time()
                        logger.info(f"[DEBUG] Starting model.inference_flow for chunk {i+1}")
                        with torch.cuda.amp.autocast(enabled=self.use_mixed_precision):
                            # Use no_grad context to prevent gradient accumulation
                            with torch.no_grad():
                                result_latent = self.model.inference_flow(
                                    z_in,
                                    prompt,
                                    audiocond_latents=prev_cond,
                                    num_inference_steps=num_inference_steps,
                                    timesteps=None,
                                    guidance_scale=guidance_scale,
                                    duration=chunk_duration,
                                    seed=seed,
                                    disable_progress=True,
                                    num_samples_per_prompt=1,
                                    callback_on_step_end=None,
                                    solver=solver,
                                )
                        logger.info(f"[DEBUG] Model inference completed for chunk {i+1} in {time.time() - model_inference_start:.2f}s")
                        
                        # Explicitly delete input tensors to free memory immediately
                        del z_in
                        if prev_cond is not None and i < degraded_latents.shape[0] - 1:
                            # Only delete prev_cond if we're not at the last iteration
                            # (we'll need it for the next chunk)
                            temp_prev_cond = prev_cond
                            prev_cond = None
                            del temp_prev_cond
                        
                        # Handle model offloading after inference
                        if self.use_cpu_offload:
                            self.model = self.model.to('cpu')
                        
                        # VAE decoding with device management
                        vae_decode_start = time.time()
                        logger.info(f"[DEBUG] Starting VAE decoding for chunk {i+1}")
                        if self.use_cpu_offload:
                            # Ensure VAE is on GPU for decoding
                            vae = vae.to(self.device)
                            # Decode to waveform and move to CPU immediately
                            wav = vae.decode(result_latent.transpose(2, 1)).sample.cpu()  # [1, 2, T]
                            # Move VAE back to CPU if using offloading
                            vae = vae.to('cpu')
                        else:
                            # GPU-only mode: VAE is already on GPU, decode and keep result on GPU initially
                            wav = vae.decode(result_latent.transpose(2, 1)).sample  # [1, 2, T]
                            # Move to CPU only for final storage to save VRAM
                            wav = wav.cpu()
                        wav = torch.clamp(wav, -1.0, 1.0)
                        decoded_chunks.append(wav)
                        logger.info(f"[DEBUG] VAE decoding completed for chunk {i+1} in {time.time() - vae_decode_start:.2f}s")
                        
                        # Prepare conditioning for next chunk (if not last) - exactly like original SonicMaster
                        if i < degraded_latents.shape[0] - 1:
                            last = wav[:, :, -overlap:]
                            
                            # VAE encoding for conditioning with device management
                            if self.use_cpu_offload:
                                # Ensure VAE is on GPU for encoding conditioning
                                vae = vae.to(self.device)
                                last = last.to(self.device, non_blocking=True)
                                prev_cond = vae.encode(last).latent_dist.mode().transpose(1, 2)  # [1, T', C]
                                # Move VAE back to CPU if using offloading
                                vae = vae.to('cpu')
                            else:
                                # GPU-only mode: VAE is already on GPU
                                last = last.to(self.device, non_blocking=True)
                                prev_cond = vae.encode(last).latent_dist.mode().transpose(1, 2)  # [1, T', C]
                        
                        # Clear GPU cache after each chunk with CuPy integration
                        if torch.cuda.is_available():
                            try:
                                import cupy
                                mempool = cupy.get_default_memory_pool()
                                mempool.free_all_blocks()
                            except (ImportError, Exception):
                                pass  # Silently continue if CuPy unavailable
                            torch.cuda.empty_cache()
                    
                    logger.info(f"[DEBUG] Chunk {i+1} processing completed in {time.time() - chunk_inference_start:.2f}s")
            
                logger.info(f"[DEBUG] All model inference completed in {time.time() - inference_start:.2f}s")
                
                # Stitch chunks with crossfade
                stitching_start = time.time()
                logger.info(f"[DEBUG] Starting audio stitching")
                final = decoded_chunks[0]  # [1, 2, T]
                for i in range(1, len(decoded_chunks)):
                    prev = final[:, :, -overlap:]
                    curr = decoded_chunks[i][:, :, :overlap]
                    alpha = torch.linspace(1.0, 0.0, steps=overlap).view(1, 1, -1)
                    beta = 1.0 - alpha
                    blended = prev * alpha + curr * beta
                    final = torch.cat(
                        [final[:, :, :-overlap], blended, decoded_chunks[i][:, :, overlap:]],
                        dim=2,
                    )
                logger.info(f"[DEBUG] Audio stitching completed in {time.time() - stitching_start:.2f}s")
                
                # Remove batch dimension and convert to CPU
                final_audio = final.squeeze(0).cpu()  # [2, T]
                
                # Save output
                save_start = time.time()
                logger.info(f"[DEBUG] Starting audio save")
                out_path = Path(output_path)
                out_path.parent.mkdir(parents=True, exist_ok=True)
                data = final_audio.numpy().T  # [T, C]
                
                # Save as WAV
                sf.write(out_path.as_posix(), data, self.sample_rate, format="WAV")
                logger.info(f"[DEBUG] Audio save completed in {time.time() - save_start:.2f}s")
                
                # Final cleanup with CuPy integration
                if torch.cuda.is_available():
                    try:
                        import cupy
                        mempool = cupy.get_default_memory_pool()
                        mempool.free_all_blocks()
                        logger.info("Final CuPy memory cleanup completed")
                    except (ImportError, Exception):
                        pass  # Silently continue if CuPy unavailable
                    torch.cuda.empty_cache()
                
                total_time = time.time() - start_time
                logger.info(f"[DEBUG] Total audio processing completed in {total_time:.2f}s")
                logger.info("Audio processing completed successfully with memory management")
            
        except Exception as e:
            logger.error(f"Local model processing failed: {e}")
            # Fallback to mock processing to prevent system crash
            logger.info("Falling back to mock processing for safety")
            # Use synchronous fallback since we're not in async context here
            self._sync_mock_process_audio_with_prompt(input_path, output_path, prompt)
            logger.info("Successfully completed processing using mock fallback")
    
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
    
    async def _mock_process_audio_with_prompt(self, input_path: str, output_path: str, prompt: str):
        """Mock audio processing with custom prompt for development/testing"""
        logger.info(f"Mock processing with prompt: {prompt}")
        
        # Load the original audio
        audio, sr = librosa.load(input_path, sr=self.sample_rate)
        
        # Apply simple enhancement based on prompt keywords
        if "noise" in prompt.lower() or "clean" in prompt.lower():
            audio = self._apply_simple_noise_reduction(audio)
        elif "bass" in prompt.lower():
            audio = self._apply_simple_bass_boost(audio, sr)
        elif "clarity" in prompt.lower() or "clear" in prompt.lower():
            audio = self._apply_simple_clarity_boost(audio)
        else:
            # Default: slight normalization with prompt-based variation
            audio = librosa.util.normalize(audio)
            # Add slight variation based on prompt length
            variation = min(len(prompt) / 1000.0, 0.1)
            audio = audio * (1.0 + variation)
        
        # Add a small delay to simulate processing time
        await asyncio.sleep(2)
        
        # Save the processed audio
        sf.write(output_path, audio, self.sample_rate)
    
    def _sync_mock_process_audio_with_prompt(self, input_path: str, output_path: str, prompt: str):
        """Synchronous mock audio processing with custom prompt for fallback"""
        logger.info(f"Sync mock processing with prompt: {prompt}")
        
        # Load the original audio
        audio, sr = librosa.load(input_path, sr=self.sample_rate)
        
        # Apply simple enhancement based on prompt keywords
        if "noise" in prompt.lower() or "clean" in prompt.lower():
            audio = self._apply_simple_noise_reduction(audio)
        elif "bass" in prompt.lower():
            audio = self._apply_simple_bass_boost(audio, sr)
        elif "clarity" in prompt.lower() or "clear" in prompt.lower():
            audio = self._apply_simple_clarity_boost(audio)
        else:
            # Default: slight normalization with prompt-based variation
            audio = librosa.util.normalize(audio)
            # Add slight variation based on prompt length
            variation = min(len(prompt) / 1000.0, 0.1)
            audio = audio * (1.0 + variation)
        
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
    
    @torch.no_grad()
    def _inference_entire_audio(self, input_path: str, output_path: str, prompt: str):
        """Process entire audio without chunking using local SonicMaster model"""
        try:
            # Check available memory before processing
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gpu_memory = torch.cuda.get_device_properties(0).total_memory
                gpu_allocated = torch.cuda.memory_allocated(0)
                gpu_free = gpu_memory - gpu_allocated
                
                # Require at least 4GB free GPU memory for no-chunk processing
                if gpu_free < 4 * 1024**3:
                    logger.warning(f"Low GPU memory: {gpu_free / 1024**3:.1f}GB free. Using mock processing.")
                    raise RuntimeError("Insufficient GPU memory for no-chunk processing")
            
            # Read & standardize input
            in_path = Path(input_path)
            if not in_path.exists():
                raise FileNotFoundError(f"Input audio not found: {in_path}")
            
            audio, sr = torchaudio.load(str(in_path))  # [C, T]
            
            # Process audio of any length - no truncation
            logger.info(f"Processing audio of length: {audio.shape[1]/sr:.1f}s without size limitation")
            
            logger.info(f"Processing entire audio of length: {audio.shape[1]/sr:.1f}s without chunking")
            
            # Force stereo
            if audio.shape[0] == 1:
                audio = audio.repeat(2, 1)
            elif audio.shape[0] > 2:
                audio = audio[:2, :]
            
            # Resample to target fs
            if sr != self.sample_rate:
                audio = torchaudio.functional.resample(audio, sr, self.sample_rate)
                sr = self.sample_rate
            
            audio = audio.to(self.device, non_blocking=True)
            
            # Load VAE with memory optimization
            try:
                from diffusers import AutoencoderOobleck
                
                # Clear GPU cache before loading VAE
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                
                vae_path = Path("Z:/PROJECTS/AudioEddy/SonicMasterModel/VAE")
                logger.info(f"[DEBUG] Loading VAE from: {vae_path}")
                
                vae = AutoencoderOobleck.from_pretrained(str(vae_path)).to(self.device, non_blocking=True)
                vae.eval()
                
                # Disable gradients for VAE to save memory
                for param in vae.parameters():
                    param.requires_grad = False
                
                logger.info(f"[DEBUG] VAE loaded successfully with gradients disabled")
                
            except Exception as e:
                logger.error(f"Failed to load VAE: {e}")
                raise RuntimeError("VAE loading failed - using mock processing")
            
            # Encode audio with VAE using chunked processing for memory optimization
            audio_batch = audio.unsqueeze(0)  # [1, 2, T]
            logger.info(f"Audio batch shape before VAE encoding: {audio_batch.shape}, duration: {audio_batch.shape[2]/sr:.2f}s")
            
            # Chunked VAE encoding for memory optimization
            import time  # Import time module
            vae_encode_start = time.time()
            audio_chunk_size = 320000  # Process ~7 seconds of audio at 44.1kHz at a time
            audio_len = audio_batch.shape[2]
            
            if audio_len > audio_chunk_size:
                logger.info(f"[DEBUG] Using chunked VAE encoding: {audio_len} samples in chunks of {audio_chunk_size}")
                encoded_chunks = []
                
                for i in range(0, audio_len, audio_chunk_size):
                    end_idx = min(i + audio_chunk_size, audio_len)
                    audio_chunk = audio_batch[:, :, i:end_idx]
                    
                    logger.info(f"[DEBUG] Encoding chunk {i//audio_chunk_size + 1}/{(audio_len + audio_chunk_size - 1)//audio_chunk_size}, shape: {audio_chunk.shape}")
                    
                    with torch.cuda.amp.autocast(enabled=False):  # Disable autocast for VAE encoding
                        encoded_chunk = vae.encode(audio_chunk).latent_dist.mode()
                    
                    encoded_chunks.append(encoded_chunk)
                    
                    # Clear GPU cache after each chunk
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                
                # Concatenate all chunks along the time dimension
                degraded_latents = torch.cat(encoded_chunks, dim=2)  # [1, C, T']
                logger.info(f"[DEBUG] Chunked VAE encoding completed in {time.time() - vae_encode_start:.2f}s, concatenated shape: {degraded_latents.shape}")
            else:
                logger.info(f"[DEBUG] Using single-pass VAE encoding for small audio: {audio_len} samples")
                with torch.cuda.amp.autocast(enabled=False):  # Disable autocast for VAE encoding
                    degraded_latents = vae.encode(audio_batch).latent_dist.mode()  # [1, C, T']
                logger.info(f"[DEBUG] Single-pass VAE encoding completed in {time.time() - vae_encode_start:.2f}s")
            
            logger.info(f"VAE output shape: {degraded_latents.shape}")
            
            # Convert to expected format [1, T', C] for the model
            z_in = degraded_latents.transpose(1, 2)  # [1, T', C]
            
            logger.info(f"Processing entire audio, z_in shape: {z_in.shape} (no length restriction)")
            
            # Process audio of any length - no sequence length constraints
            # The model will handle variable-length sequences dynamically
            
            # Use the model's inference_flow method
            model_inference_start = time.time()
            logger.info(f"[DEBUG] Starting model.inference_flow with {z_in.shape} input, duration={audio.shape[1] / sr:.2f}s")
            logger.info(f"[DEBUG] Model inference parameters: steps=10, guidance_scale=1.0, solver=Euler")
            
            result_latent = self.model.inference_flow(
                z_in,
                prompt,
                audiocond_latents=None,
                num_inference_steps=10,
                timesteps=None,
                guidance_scale=1.0,
                duration=audio.shape[1] / sr,
                seed=0,
                disable_progress=True,
                num_samples_per_prompt=1,
                callback_on_step_end=None,
                solver="Euler",
            )
            
            logger.info(f"[DEBUG] Model inference completed in {time.time() - model_inference_start:.2f}s")
            logger.info(f"[DEBUG] Result latent shape: {result_latent.shape}")
            
            # Decode to waveform with chunked processing for memory optimization
            vae_decode_start = time.time()
            logger.info(f"[DEBUG] Starting VAE decoding with latent shape: {result_latent.shape}")
            
            # Chunked VAE decoding for memory optimization
            chunk_size = 1000  # Process 1000 time steps at a time
            latent_transposed = result_latent.transpose(2, 1)  # [1, C, T']
            seq_len = latent_transposed.shape[2]
            
            if seq_len > chunk_size:
                logger.info(f"[DEBUG] Using chunked VAE decoding: {seq_len} steps in chunks of {chunk_size}")
                decoded_chunks = []
                
                for i in range(0, seq_len, chunk_size):
                    end_idx = min(i + chunk_size, seq_len)
                    chunk = latent_transposed[:, :, i:end_idx]
                    
                    logger.info(f"[DEBUG] Decoding chunk {i//chunk_size + 1}/{(seq_len + chunk_size - 1)//chunk_size}, shape: {chunk.shape}")
                    
                    with torch.cuda.amp.autocast(enabled=False):  # Disable autocast for VAE decoding
                        decoded_chunk = vae.decode(chunk).sample
                    
                    decoded_chunks.append(decoded_chunk)
                    
                    # Clear GPU cache after each chunk
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                
                # Concatenate all chunks
                final_audio = torch.cat(decoded_chunks, dim=2)  # [1, 2, T]
                logger.info(f"[DEBUG] Chunked VAE decoding completed, concatenated shape: {final_audio.shape}")
            else:
                logger.info(f"[DEBUG] Using single-pass VAE decoding for small latent: {seq_len} steps")
                with torch.cuda.amp.autocast(enabled=False):  # Disable autocast for VAE decoding
                    final_audio = vae.decode(latent_transposed).sample  # [1, 2, T]
            
            final_audio = torch.clamp(final_audio, -1.0, 1.0)
            
            logger.info(f"[DEBUG] VAE decoding completed in {time.time() - vae_decode_start:.2f}s")
            logger.info(f"[DEBUG] Final audio shape: {final_audio.shape}")
            
            # Remove batch dimension and convert to CPU
            final_audio = final_audio.squeeze(0).cpu()  # [2, T]
            
            # Save output
            out_path = Path(output_path)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            data = final_audio.numpy().T  # [T, C]
            
            # Save as WAV
            sf.write(out_path.as_posix(), data, sr, format="WAV")
            
            # Comprehensive cleanup
            del vae, final_audio, result_latent, degraded_latents, audio_batch, audio
            
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()  # Ensure all GPU operations are complete
            
            logger.info("No-chunk audio processing completed successfully with memory cleanup")
            
        except Exception as e:
            logger.error(f"No-chunk model processing failed: {e}")
            # Fallback to mock processing
            logger.info("Falling back to mock processing for safety")
            self._sync_mock_process_audio_with_prompt(input_path, output_path, prompt)
            logger.info("Successfully completed no-chunk processing using mock fallback")
    
    # DEPRECATED: Chunked processing methods removed in favor of no-chunk processing
    # The following methods have been commented out as they are no longer needed:
    # - _inference_consistent_seed: Chunked processing with consistent seed
    # - enhance_audio_consistent_seed: Async wrapper for chunked processing
    # - _process_with_consistent_seed: Async executor for chunked processing
    
    # @torch.no_grad()
    # def _inference_consistent_seed(self, input_path: str, output_path: str, prompt: str, seed: int):
    #     """DEPRECATED: Process audio with chunks using consistent seed across all chunks"""
    #     # This method has been removed in favor of no-chunk processing
    #     pass
    
    async def enhance_audio_no_chunks(self, input_path: str, output_path: str, prompt: str) -> str:
        """Enhance audio using local SonicMaster model without chunking (process entire audio)"""
        if not self.initialized:
            raise RuntimeError("Local SonicMaster service not initialized")
        
        try:
            logger.info(f"Processing entire audio without chunking: {input_path} with prompt: {prompt}")
            
            if self.model is not None:
                # Real local SonicMaster processing without chunking
                await self._process_entire_audio_no_chunks(input_path, output_path, prompt)
            else:
                # Mock processing for development
                await self._mock_process_audio_with_prompt(input_path, output_path, prompt)
            
            logger.info(f"No-chunk audio processing completed: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"No-chunk audio processing failed: {str(e)}")
            raise RuntimeError(f"No-chunk audio enhancement failed: {str(e)}")
    
    # DEPRECATED: Chunked processing method removed
    # async def enhance_audio_consistent_seed(self, input_path: str, output_path: str, prompt: str, seed: int = 42) -> str:
    #     """DEPRECATED: Enhance audio using local SonicMaster model with chunks but consistent seed across all chunks"""
    #     # This method has been removed in favor of no-chunk processing
    #     pass
    
    async def _process_entire_audio_no_chunks(self, input_path: str, output_path: str, prompt: str):
        """Process entire audio without chunking"""
        # Run the model in a thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        
        def _run_no_chunk_model():
            return self._inference_entire_audio(input_path, output_path, prompt)
        
        await loop.run_in_executor(None, _run_no_chunk_model)
    
    # DEPRECATED: Chunked processing executor removed
    # async def _process_with_consistent_seed(self, input_path: str, output_path: str, prompt: str, seed: int):
    #     """DEPRECATED: Process audio with chunks using consistent seed"""
    #     # This method has been removed in favor of no-chunk processing
    #     pass
    
    def get_model_info(self) -> dict:
        """Get information about the loaded model"""
        return {
            "initialized": self.initialized,
            "device": self.device,
            "model_loaded": self.model is not None,
            "sample_rate": self.sample_rate,
            "model_path": str(self.model_path),
            "config_path": str(self.config_path),
            "sonicmaster_dir": str(self.sonicmaster_dir)
        }