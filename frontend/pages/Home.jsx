import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Headphones, Zap, Music, Sparkles, ArrowRight } from 'lucide-react'
import { fadeInUp, staggerContainer } from '../utils/motion'

const Home = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Enhancement',
      description: 'Advanced algorithms analyze and enhance your audio with professional-grade processing'
    },
    {
      icon: Music,
      title: 'Multiple Enhancement Types',
      description: 'Seven specialized enhancement modes from noise removal to studio mastering'
    },
    {
      icon: Sparkles,
      title: 'Real-time Processing',
      description: 'Fast, efficient processing with real-time preview and instant results'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative px-3 py-16 sm:px-4 sm:py-20 lg:px-6"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={fadeInUp}>
            <Headphones className="h-12 w-12 sm:h-16 sm:w-16 text-purple-400 mx-auto mb-4 sm:mb-6" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Transform Your
              <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent"> Audio</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-4">
              Professional-grade AI audio enhancement that brings clarity, depth, and studio-quality sound to your recordings
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="space-y-3 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center px-4">
            <button
              onClick={() => navigate('/enhance')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 touch-manipulation"
            >
              <span>Start Enhancing</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20 touch-manipulation">
              Learn More
            </button>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="px-3 py-12 sm:px-4 sm:py-16 lg:px-6"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose AudioEddy?
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto px-4">
              Experience the power of AI-driven audio enhancement with cutting-edge technology
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg w-fit mb-4 sm:mb-6">
                  <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Enhancement Types Preview */}
      <motion.section
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="px-3 py-12 sm:px-4 sm:py-16 lg:px-6 bg-black/20"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={fadeInUp} className="mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Seven Enhancement Types
            </h2>
            <p className="text-gray-300 px-4">
              From basic quality fixes to professional studio mastering
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12 px-4">
            {['Fix Quality', 'Remove Noise', 'Studio Master', 'Vocal Enhance', 'Bass Boost', 'Clarity Boost', 'Custom Prompt'].map((type, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                <span className="text-white font-medium text-xs sm:text-sm">{type}</span>
              </div>
            ))}
          </motion.div>

          <motion.button
            variants={fadeInUp}
            onClick={() => navigate('/enhance')}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold rounded-xl transition-all duration-300 flex items-center space-x-2 mx-auto shadow-lg shadow-purple-500/25 touch-manipulation"
          >
            <span>Try All Enhancements</span>
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </div>
      </motion.section>
    </div>
  )
}

export default Home