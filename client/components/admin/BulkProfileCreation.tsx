'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'

export default function BulkProfileCreation() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ created: 0, pending: 0, total: 0 })

  const handleBulkUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file')
      return
    }

    setLoading(true)
    // Simulate bulk creation process
    setProgress({ created: 0, pending: 10, total: 10 })
    
    // Simulate progress
    let created = 0
    const interval = setInterval(() => {
      created += 1
      setProgress({ created, pending: 10 - created, total: 10 })
      
      if (created >= 10) {
        clearInterval(interval)
        setLoading(false)
        toast.success('Bulk profile creation completed!')
        setCsvFile(null)
      }
    }, 500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Bulk Profile Creation</h2>
        
        <div className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            <svg className="mx-auto h-16 w-16 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            
            <div className="mt-4">
              <label htmlFor="csv-file" className="cursor-pointer">
                <span className="mt-2 block text-lg font-medium text-slate-700">
                  {csvFile ? csvFile.name : 'Upload CSV File'}
                </span>
                <input
                  id="csv-file"
                  name="csv-file"
                  type="file"
                  className="sr-only"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                />
              </label>
              <p className="mt-2 text-sm text-slate-500">
                Upload a CSV file with member details
              </p>
            </div>
          </div>

          <button
            onClick={handleBulkUpload}
            disabled={loading || !csvFile}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Create Profiles'}
          </button>

          {loading && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-medium text-slate-800 mb-2">Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Created:</span>
                  <span className="font-medium text-green-600">{progress.created}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Pending:</span>
                  <span className="font-medium text-orange-600">{progress.pending}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total:</span>
                  <span className="font-medium text-slate-800">{progress.total}</span>
                </div>
              </div>
              <div className="mt-3 w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(progress.created / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-medium text-slate-800 mb-2">CSV Format:</h4>
            <pre className="text-xs text-slate-600 bg-white p-3 rounded border overflow-x-auto">
{`Member Picture,Name,Council-id,Committee/Team name,Position,Phone number,Email Id,Address,instagram,Discord,linkdin,Snapchat,Github
,John Doe,TECH001,Technical,Member,1234567890,john@example.com,123 Main St,john_ig,john_discord,john_link,john_snap,john_git`}
            </pre>
          </div>
        </div>
      </div>
    </motion.div>
  )
}