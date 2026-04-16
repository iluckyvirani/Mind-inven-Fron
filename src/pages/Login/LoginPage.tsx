
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux'
import { loginUser, clearError } from '../../store/slices/authSlice'

const LoginPage = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading: isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth)

  const [username, setUsername] = useState('admin@deemag2000.com')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  // Clear error on unmount
  useEffect(() => {
    return () => { dispatch(clearError()) }
  }, [dispatch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(loginUser({ username, password }))
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Decorative Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0f172a]">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-emerald-600/20 via-teal-500/10 to-cyan-600/20" />
        
        {/* Floating Shapes */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          {/* Pharmacy Icon */}
          <div className="mb-8">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <span className="text-4xl">💊</span>
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-4 leading-tight">
            Welcome to<br />
            <span className="bg-linear-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Deemag 2000
            </span>
          </h1>
          <p className="text-2xl font-medium text-teal-300/80 mb-6">डीमैग 2000</p>
          
          <p className="text-lg text-slate-400 mb-12 max-w-md leading-relaxed">
            Complete Pharmacy Management System. Medicine inventory, billing, customer management, supplier tracking & detailed reports — all in one place.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3">
            {['Inventory', 'Billing', 'Customers', 'Suppliers', 'Reports', 'Expenses'].map((feature) => (
              <span key={feature} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300 backdrop-blur-sm">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50  border">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-600 to-teal-500 items-center justify-center shadow-xl shadow-emerald-500/30 mb-4">
              <span className="text-3xl">💊</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Deemag 2000</h2>
            <p className="text-lg text-emerald-600">डीमैग 2000</p>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Sign in</h2>
            <p className="text-slate-500">Enter your credentials to access your dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Username</label>
              <div className="relative group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-[5px] outline-none transition-all duration-300 focus:border-emerald-500 focus:shadow-lg focus:shadow-emerald-500/10 group-hover:border-slate-300"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-[5px] outline-none transition-all duration-300 focus:border-emerald-500 focus:shadow-lg focus:shadow-emerald-500/10 group-hover:border-slate-300 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded-md peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all" />
                  <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">Remember me</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full py-4 bg-linear-to-r from-emerald-600 to-teal-500 text-white font-semibold rounded-[5px] cursor-pointer shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 overflow-hidden group"
            >
              <span className={`flex items-center justify-center gap-2 transition-all duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                Sign In
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </button>
          </form>


          {/* Footer */}
          <p className="text-center text-sm text-slate-400 mt-8">
            © 2026 Deemag 2000. All rights reserved.
            <br />
            <span className="text-xs">42/4 B, Billochpura, Mathura Road, Agra-2</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage