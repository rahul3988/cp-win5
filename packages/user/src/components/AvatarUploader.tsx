import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Check, User, Camera, Image as ImageIcon } from 'lucide-react';
import { compressImage, validateImageFile, DEFAULT_COMPRESSION_OPTIONS } from '../utils/imageCompression';
import { toast } from 'sonner';

interface AvatarUploaderProps {
  currentAvatarUrl?: string;
  onAvatarSelect: (avatarId: string) => void;
  onAvatarUpload: (avatarUrl: string) => void;
  className?: string;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentAvatarUrl,
  onAvatarSelect,
  onAvatarUpload,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setIsUploading(true);
      
      // Compress the image
      const compressedFile = await compressImage(file, DEFAULT_COMPRESSION_OPTIONS);
      
      // Create preview
      const preview = URL.createObjectURL(compressedFile);
      setPreviewUrl(preview);

      // Upload the file
      const formData = new FormData();
      formData.append('avatar', compressedFile);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      if (data.success) {
        onAvatarUpload(data.data.avatarUrl);
        toast.success('Avatar uploaded successfully!');
      } else {
        throw new Error(data.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Avatar Display */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center overflow-hidden border-4 border-gold-500 relative">
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt="Current Avatar"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <User className="h-10 w-10 text-white hidden" />
          
          {/* Upload overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </div>
        
        <div>
          <h3 className="text-white font-semibold text-lg">Profile Picture</h3>
          <p className="text-sm text-gray-400">Choose from gallery or upload your own</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gold-600 hover:bg-gold-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload from Gallery
              </>
            )}
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Preview */}
        <AnimatePresence>
          {previewUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="text-white font-medium">Preview</p>
                  <p className="text-sm text-gray-400">This is how your avatar will look</p>
                </div>
                <button
                  onClick={clearPreview}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Guidelines */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-white font-medium mb-2 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Upload Guidelines
        </h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Supported formats: JPEG, PNG, WebP</li>
          <li>• Maximum file size: 10MB (will be compressed to 1MB)</li>
          <li>• Image will be resized to 256x256 pixels</li>
          <li>• For best results, use square images</li>
        </ul>
      </div>
    </div>
  );
};

export default AvatarUploader;
