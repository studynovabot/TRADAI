import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, Zap, TrendingUp, Target, Settings } from 'lucide-react';
import { ForexSignalGenerator } from '../components/ForexSignalGenerator';

export default function ForexSignalGeneratorPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState('initializing');
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Simulate system initialization
    setTimeout(() => setSystemStatus('ready'), 2000);
    
    return () => clearInterval(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 100
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <motion.div 
        className="relative z-10 container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          variants={itemVariants}
        >
          <motion.h1 
            className="text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-cyan-500 to-indigo-600 bg-clip-text text-transparent"
            animate={{ 
              backgroundPosition: ["0%", "100%", "0%"],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          >
            💱 FOREX AI
          </motion.h1>
          <motion.p 
            className="text-3xl text-gray-300 mb-2 font-light"
            variants={itemVariants}
          >
            Real-Time Forex Signal Generator
          </motion.p>
          <motion.p 
            className="text-lg text-gray-400 mb-4"
            variants={itemVariants}
          >
            Sniper | Scalping | Swing Trading Modes
          </motion.p>
          
          {/* Navigation back to main dashboard */}
          <motion.div 
            className="mb-6"
            variants={itemVariants}
          >
            <motion.a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ← Back to Main Dashboard
            </motion.a>
          </motion.div>
          <motion.div 
            className="text-sm text-gray-500 flex items-center justify-center gap-4"
            variants={itemVariants}
          >
            <span>{currentTime.toLocaleString()}</span>
            <motion.div 
              className="flex items-center gap-2"
              variants={pulseVariants}
              animate="pulse"
            >
              <div className={`w-3 h-3 rounded-full ${
                systemStatus === 'ready' ? 'bg-green-400' : 'bg-yellow-400'
              }`} />
              <span className={systemStatus === 'ready' ? 'text-green-400' : 'text-yellow-400'}>
                {systemStatus === 'ready' ? 'SYSTEM READY' : 'INITIALIZING...'}
              </span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Trading Modes Info */}
        <motion.div 
          className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 mb-8 border border-gray-700/50 shadow-2xl"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center">
            <Activity className="mr-3 text-cyan-400" size={24} />
            Forex Trading Modes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-red-500/30 hover:border-red-500/50 transition-all"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-red-400 font-semibold flex items-center">
                  <Target className="mr-2" size={16} />
                  Sniper Mode
                </span>
                <motion.div 
                  className="w-3 h-3 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <p className="text-sm text-gray-400">High frequency, low capital, fast profits</p>
              <p className="text-xs text-gray-500">Timeframes: 1M – 2M • RR: 0.2–0.5 • SL: 3-5 pips</p>
            </motion.div>
            
            <motion.div 
              className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-500/30 hover:border-yellow-500/50 transition-all"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 font-semibold flex items-center">
                  <Zap className="mr-2" size={16} />
                  Scalping Mode
                </span>
                <motion.div 
                  className="w-3 h-3 bg-yellow-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
              </div>
              <p className="text-sm text-gray-400">Medium frequency, better analysis, improved RR</p>
              <p className="text-xs text-gray-500">Timeframes: 5M – 15M • RR: 1.5–2.5 • SL: 8-12 pips</p>
            </motion.div>
            
            <motion.div 
              className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-green-500/30 hover:border-green-500/50 transition-all"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 font-semibold flex items-center">
                  <TrendingUp className="mr-2" size={16} />
                  Swing Mode
                </span>
                <motion.div 
                  className="w-3 h-3 bg-green-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                />
              </div>
              <p className="text-sm text-gray-400">Low frequency, extremely accurate, high capital</p>
              <p className="text-xs text-gray-500">Timeframes: 30M – 1H • RR: 2.5–3+ • SL: 20-30 pips</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div 
          variants={containerVariants}
        >
          {/* Forex Signal Generator Panel */}
          <motion.div 
            variants={itemVariants}
          >
            <ForexSignalGenerator />
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="mt-12 text-center text-sm text-gray-400"
          variants={itemVariants}
        >
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-lg p-4 border border-gray-700/50">
            <p className="font-semibold mb-2 flex items-center justify-center">
              <Settings className="mr-2" size={16} />
              IMPORTANT DISCLAIMER
            </p>
            <p className="text-xs">
              This is a SIGNAL-ONLY SYSTEM for real Forex markets during weekdays. 
              It does NOT execute trades automatically. Always verify signals independently.
            </p>
            <motion.p 
              className="text-xs mt-2 flex items-center justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                Real Market Data
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse" />
                Weekday Trading Only
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse" />
                Real-Time Analysis
              </span>
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}