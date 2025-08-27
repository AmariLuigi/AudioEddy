---
license: apache-2.0
pipeline_tag: audio-to-audio
---

# SonicMaster: Towards Controllable All-in-One Music Restoration and Mastering

[Read paper](https://huggingface.co/papers/2508.03448) | [Project Page](https://amaai-lab.github.io/SonicMaster/) | [Demo](https://huggingface.co/spaces/amaai-lab/sonicmaster)

SonicMaster is the first unified generative model for music restoration and mastering that addresses a broad spectrum of audio artifacts with text-based control. This model can be conditioned on natural language instructions to apply targeted enhancements, or it can operate in an automatic mode for general restoration.

The approach leverages a flow-matching generative training paradigm to learn an audio transformation that maps degraded inputs to their cleaned, mastered versions guided by text prompts. Objective audio quality metrics and subjective listening tests demonstrate that SonicMaster significantly improves sound quality across various artifact categories, confirming its effectiveness.

Abstract: 
_Music recordings often suffer from audio quality issues such as excessive reverberation, distortion, clipping, tonal imbalances, and a narrowed stereo image, especially when created in non-professional settings without specialized equipment or expertise. These problems are typically corrected using separate specialized tools and manual adjustments. In this paper, we introduce SonicMaster, the first unified generative model for music restoration and mastering that addresses a broad spectrum of audio artifacts with text-based control. SonicMaster is conditioned on natural language instructions to apply targeted enhancements, or can operate in an automatic mode for general restoration. To train this model, we construct the SonicMaster dataset, a large dataset of paired degraded and high-quality tracks by simulating common degradation types with nineteen degradation functions belonging to five enhancements groups: equalization, dynamics, reverb, amplitude, and stereo. Our approach leverages a flow-matching generative training paradigm to learn an audio transformation that maps degraded inputs to their cleaned, mastered versions guided by text prompts. Objective audio quality metrics demonstrate that SonicMaster significantly improves sound quality across all artifact categories. Furthermore, subjective listening tests confirm that listeners prefer SonicMaster's enhanced outputs over the original degraded audio, highlighting the effectiveness of our unified approach._

SonicMaster can understand natural language queries related to mastering, such as: 
- Increase the clarity of this song by emphasizing treble frequencies.	
- Can you make this sound louder, please?	
- Improve the balance in this song.	
- Correct the unnatural frequency emphasis. Reduce the roominess or echo.	
- Increase the clarity of this song by emphasizing treble frequencies.	
- Clean this off any echoes!	
- Make the sound less squashed and more open.	
- Make this song sound more boomy by amplifying the low end bass frequencies.	
- Make the audio smoother and less distorted.	
- Disentangle the left and right channels to give this song a stereo feeling.	
- Raise the level of the vocals, please.	
- Please, dereverb this audio.	
- Disentangle the left and right channels to give this song a stereo feeling.
- ...


## Reference

If you use this model, please cite the [original paper](https://huggingface.co/papers/2508.03448): 

```
@article{melechovsky2025sonicmaster,
  title={SonicMaster: Towards Controllable All-in-One Music Restoration and Mastering},
  author={Melechovsky, Jan and Mehrish, Ambuj and Herremans, Dorien},
  journal={arXiv:2508.03448},
  year={2025}
}
```