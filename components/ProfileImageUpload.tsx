'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, X, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileImageUploadProps {
  currentImage?: string | null;
  name: string;
  onImageChange: (imageUrl: string | null) => void;
  colorClass?: string;
}

export default function ProfileImageUpload({
  currentImage,
  name,
  onImageChange,
  colorClass = 'from-indigo-500 to-purple-600',
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError('');
    setUploading(true);
    setShowMenu(false);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/profile/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        onImageChange(data.imageUrl);
      } else {
        setError(data.error || 'Failed to upload image');
      }
    } catch (err) {
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setShowMenu(false);
    setError('');

    try {
      const response = await fetch('/api/profile/image', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        onImageChange(null);
      } else {
        setError(data.error || 'Failed to delete image');
      }
    } catch (err) {
      setError('Failed to delete image. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const isLoading = uploading || deleting;

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Profile Image Container */}
      <div
        className={`w-32 h-32 bg-gradient-to-br ${colorClass} rounded-3xl flex items-center justify-center text-white text-5xl font-bold shadow-2xl border-8 border-white relative overflow-hidden cursor-pointer group`}
        onClick={() => !isLoading && setShowMenu(!showMenu)}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          name.charAt(0).toUpperCase()
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          ) : (
            <Camera className="w-8 h-8 text-white" />
          )}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showMenu && !isLoading && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 min-w-[160px]"
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>
              {currentImage && (
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Photo
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-red-100 text-red-700 text-xs rounded-lg whitespace-nowrap shadow-lg"
        >
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <X className="w-3 h-3 inline" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
