import { motion } from 'framer-motion'
import { Volume2, Mic, Music, Zap, Settings, Sparkles, Wand2 } from 'lucide-react'

const EnhancementCard = ({ type, title, description, icon: IconComponent, isSelected, onClick }) => {
  const getIcon = () => {
    const iconMap = {
      'fix-quality': Settings,
      'remove-noise': Volume2,
      'studio-master': Music,
      'vocal-enhance': Mic,
      'bass-boost': Zap,
      'clarity-boost': Sparkles,
      'custom-prompt': Wand2
    }
    return iconMap[type] || Settings
  }

  const Icon = IconComponent || getIcon()

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-4 sm:p-6 rounded-xl border cursor-pointer transition-all duration-300 touch-manipulation ${
        isSelected
          ? 'bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-400/50 shadow-lg shadow-purple-500/25'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-start space-x-3 sm:space-x-4">
        <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${
          isSelected
            ? 'bg-gradient-to-br from-purple-500 to-violet-500'
            : 'bg-white/10'
        }`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>

        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-gray-300 text-sm leading-relaxed pr-2">{description}</p>
        </div>
      </div>

      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center"
        >
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />
        </motion.div>
      )}
    </motion.div>
  )
}

export default EnhancementCard