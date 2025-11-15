'use client'

import React, { useRef, useState } from 'react'
import { Button } from './Button'

export interface FileUploadProps {
  accept?: string
  multiple?: boolean
  onFileSelect: (files: FileList | null) => void
  onDrop?: (files: FileList) => void
  className?: string
  disabled?: boolean
  maxSize?: number // in bytes
  error?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  multiple = false,
  onFileSelect,
  onDrop,
  className = '',
  disabled = false,
  maxSize,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragError, setDragError] = useState<string | null>(null)
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setDragError(null)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    if (files.length === 0) return
    
    if (maxSize) {
      const oversizedFiles = Array.from(files).filter((file) => file.size > maxSize)
      if (oversizedFiles.length > 0) {
        setDragError(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(1)}MB limit`)
        return
      }
    }
    
    setDragError(null)
    onDrop?.(files)
    onFileSelect(files)
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      if (maxSize) {
        const oversizedFiles = Array.from(files).filter((file) => file.size > maxSize)
        if (oversizedFiles.length > 0) {
          setDragError(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(1)}MB limit`)
          return
        }
      }
      setDragError(null)
      onFileSelect(files)
    }
  }
  
  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }
  
  const displayError = error || dragError
  
  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
      />
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed p-4 transition-all duration-300 ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-black/10'
            : isDragging
            ? 'border-black bg-black/5 scale-[1.01]'
            : 'border-black/20 hover:border-black/40 bg-white'
        } ${displayError ? 'border-red-300' : ''}`}
      >
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-black/5 mb-3">
            <span className="material-symbols-outlined text-2xl text-black/60">
              cloud_upload
            </span>
          </div>
          <p className="text-xs text-black/70 mb-1 font-medium">
            Drop your file here
          </p>
          <p className="text-xs text-black/50 mb-4">
            or click to browse
          </p>
          <Button
            type="button"
            onClick={handleBrowseClick}
            disabled={disabled}
            size="sm"
            variant="primary"
          >
            Browse Files
          </Button>
        </div>
      </div>
      
      {displayError && (
        <p className="mt-2 text-xs text-red-700">{displayError}</p>
      )}
    </div>
  )
}

