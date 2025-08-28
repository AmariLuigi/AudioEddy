import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true)
  const [accentColor, setAccentColor] = useState('purple')

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  const changeAccentColor = (color) => {
    setAccentColor(color)
  }

  const theme = {
    isDark,
    accentColor,
    toggleTheme,
    changeAccentColor,
    colors: {
      primary: isDark ? '#6610F2' : '#6610F2',
      secondary: isDark ? '#E5DBFF' : '#E5DBFF',
      background: isDark ? 'from-gray-900 via-purple-900 to-violet-900' : 'from-gray-50 to-purple-50',
      text: isDark ? '#FFFFFF' : '#1F2937',
      textSecondary: isDark ? '#D1D5DB' : '#6B7280'
    }
  }

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContext