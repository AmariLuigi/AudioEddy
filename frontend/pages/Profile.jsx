import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { User, Settings, BarChart3, Headphones, Bell, Save, Moon, Sun, LogOut } from 'lucide-react'
import { fadeInUp, staggerContainer } from '../utils/motion'

const Profile = () => {
  const { user, updateProfile, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    theme: user?.theme || 'dark',
    notifications: user?.notifications || true,
    autoSave: user?.autoSave || true
  })

  const handleSave = () => {
    updateProfile(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: User },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const stats = [
    { label: 'Total Enhancements', value: user?.enhancementsCount || 0, color: 'text-purple-400' },
    { label: 'Processing Time', value: user?.totalProcessingTime || '0m', color: 'text-blue-400' },
    { label: 'Favorite Enhancement', value: user?.favoriteEnhancement || 'None', color: 'text-green-400' },
    { label: 'Member Since', value: new Date(user?.joinDate || Date.now()).toLocaleDateString(), color: 'text-orange-400' }
  ]

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto"
      >
        <motion.div variants={fadeInUp} className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-violet-500 p-1">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt={user?.name}
              className="w-full h-full rounded-full object-cover bg-white"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{user?.name}</h1>
          <p className="text-gray-300">{user?.email}</p>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex border-b border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 flex items-center justify-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden sm:block">{tab.label}</span>
                </button>
              )
            })}
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-white mb-4">Personal Information</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold rounded-lg transition-all duration-300 flex items-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>Save Changes</span>
                </button>
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-white mb-4">Your Statistics</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-300 text-sm">{stat.label}</p>
                          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                        <Headphones className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Enhancement History</h3>
                  <div className="space-y-3">
                    {['Studio Master', 'Remove Noise', 'Vocal Enhance', 'Bass Boost'].map((enhancement, index) => (
                      <div key={index} className="flex justify-between items-center py-2">
                        <span className="text-gray-300">{enhancement}</span>
                        <span className="text-purple-400 font-medium">{Math.floor(Math.random() * 20) + 1} times</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-white mb-4">Preferences</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center space-x-3">
                      {formData.theme === 'dark' ? <Moon className="h-5 w-5 text-purple-400" /> : <Sun className="h-5 w-5 text-yellow-400" />}
                      <div>
                        <p className="text-white font-medium">Theme</p>
                        <p className="text-gray-400 text-sm">Choose your preferred theme</p>
                      </div>
                    </div>
                    <select
                      name="theme"
                      value={formData.theme}
                      onChange={handleChange}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">Notifications</p>
                        <p className="text-gray-400 text-sm">Receive enhancement completion alerts</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="notifications"
                        checked={formData.notifications}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center space-x-3">
                      <Save className="h-5 w-5 text-green-400" />
                      <div>
                        <p className="text-white font-medium">Auto Save</p>
                        <p className="text-gray-400 text-sm">Automatically save enhanced audio files</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="autoSave"
                        checked={formData.autoSave}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold rounded-lg transition-all duration-300 flex items-center space-x-2"
                  >
                    <Save className="h-5 w-5" />
                    <span>Save Settings</span>
                  </button>
                  
                  <button
                    onClick={logout}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Profile