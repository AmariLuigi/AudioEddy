import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Menu, X, Headphones, LogOut, User } from 'lucide-react'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()

  const navItems = user ? [
    { name: 'Home', path: '/' },
    { name: 'Enhance Audio', path: '/enhance' },
    { name: 'Generate Music', path: '/generate' },
    { name: 'Profile', path: '/profile' }
  ] : [
    { name: 'Home', path: '/' },
    { name: 'Login', path: '/login' },
    { name: 'Sign Up', path: '/signup' }
  ]

  return (
    <nav className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Headphones className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
            <span className="text-lg sm:text-xl font-bold text-white">AudioEddy</span>
          </Link>

          <div className="hidden md:flex space-x-6 lg:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`px-2 lg:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'text-purple-400 bg-purple-400/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {user && (
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
              <div className="flex items-center space-x-2 text-gray-300">
                <span className="text-xs lg:text-sm truncate max-w-24 lg:max-w-none">{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/5 touch-manipulation"
          >
            {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
          </button>
        </div>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden py-3 px-1 space-y-1 bg-black/40 backdrop-blur-md border-t border-white/10 mt-1"
          >
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-md text-base font-medium transition-colors touch-manipulation ${
                  location.pathname === item.path
                    ? 'text-purple-400 bg-purple-400/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.name}
              </Link>
            ))}
            {user && (
              <>
                <div className="flex items-center space-x-2 px-4 py-3 text-gray-300 border-t border-white/10 mt-2 pt-4">
                  <span className="text-sm truncate">{user.name}</span>
                </div>
                <button
                  onClick={() => {
                    logout()
                    setIsOpen(false)
                  }}
                  className="block w-full text-left px-4 py-3 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors touch-manipulation"
                >
                  Logout
                </button>
              </>
            )}
          </motion.div>
        )}
      </div>
    </nav>
  )
}

export default Navbar