'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import Image from 'next/image'

export default function LoginPage() {
  const [councilId, setCouncilId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(councilId, password)
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col font-sans">
      
      {/* --- HEADER STRIPS --- */}
      {/* 1. Thick Navy Blue Bar */}
      <div className="w-full h-16 bg-gradient-to-b from-[#000000] to-[#16213E]"></div>
      {/* 2. Thin Gold Bar */}
      <div className="w-full h-2 bg-[#C5A059]"></div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-grow flex flex-col w-full max-w-[1920px] mx-auto px-6 md:px-12 lg:px-24 py-10 md:py-20">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start w-full">
          
          {/* --- LEFT: TITLE SECTION --- */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col pt-2 z-40 md:pt-10"
          >
            <h1 className="text-5xl md:text-8xl lg:text-8xl font-black text-[#1c3359] uppercase tracking-tighter leading-none">
              Council ERP
            </h1>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-poppins text-[#C5A059] uppercase tracking-[0.25em] mt-2 md:mt-4 ml-1">
              Ready
            </h2>
          </motion.div>

          {/* --- RIGHT: FORM SECTION --- */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md md:ml-auto md:mt-12 z-40"
          >
            <form onSubmit={handleSubmit} className="space-y-12">
              
              {/* Council ID Input */}
              <div className="group">
                {/* <label 
                  htmlFor="councilId" 
                  className="block text-xs font-bold text-gray-500 uppercase tracking-[0.15em] mb-3"
                >
                  Enter Your Council ID
                </label> */}
                <input
                  id="councilId"
                  type="text"
                  value={councilId}
                  onChange={(e) => setCouncilId(e.target.value)}
                  placeholder="ENTER YOUR COUNCIL ID"
                  disabled={loading}
                  required
                  className="w-full bg-transparent  border-b-[3px] border-gray-300 text-[#16213E] text-lg font-bold focus:outline-none focus:border-[#16213E] transition-colors duration-300 rounded-none"
                  autoFocus
                />
              </div>

              {/* Password Input */}
              <div className="group">
                {/* <label 
                  htmlFor="password" 
                  className="block text-xs font-bold text-gray-500 uppercase tracking-[0.15em] mb-3"
                >
                  Enter Your Password
                </label> */}
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ENTER YOUR PASSWORD"
                  disabled={loading}
                  required
                  className="w-full  bg-transparent  border-b-[3px] border-gray-300 text-[#16213E] text-lg font-bold focus:outline-none focus:border-[#16213E] transition-colors duration-300 rounded-none"
                  
                />
              </div>

              {/* Login Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#16213E] text-white text-sm font-bold uppercase tracking-[0.2em] px-12 py-4 hover:bg-[#2a3b66] transition-all duration-300 shadow-md"
                >
                  {loading ? '...Validating' : 'Login'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* --- DESKTOP COPYRIGHT (Vertical) --- */}
        <div className="hidden md:block absolute right-4 top-[10px]-translate-y-1/2">
          <p className="text-[10px] font-bold tracking-[0.2em] text-black/70" style={{ writingMode: 'vertical-rl' }}>
            © 2025-26 STUDENT COUNCIL. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>

      {/* --- IMAGE SECTION --- */}
      {/* Using a standard <img> tag style logic here.
          w-full + h-auto ensures the aspect ratio is PRESERVED. 
          It will simply take up as much height as it needs to show the full width.
      */}
      <div className="w-full flex -mt-52 relative z-0">
        <Image 
          src="/bg.png"
          alt="Campus Building"
          width={2886}
          height={500} // Aspect ratio placeholder, CSS below overrides it
          className="w-full h-auto block align-bottom"
          priority
        />
      </div>

      {/* --- FOOTER BAR --- */}
      <div className="w-full bg-gradient-to-b from-[#000000] to-[#16213E] py-4 px-6 md:px-12 flex z-40 justify-between items-center border-t-4 border-[#C5A059]">
  <span className="text-white font-extrabold tracking-[0.15em] uppercase text-xs md:text-sm">
    Web ERP Editions
  </span>
  <span className="text-white/80 font-poppins text-sm tracking-wider">
    V.1.0.26
  </span>
</div>
      

    </div>
  )
}