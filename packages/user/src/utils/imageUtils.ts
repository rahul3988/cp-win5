/**
 * Utility functions for handling image loading with proper CORS and error handling
 */

export interface ImageLoadOptions {
  onLoad?: () => void;
  onError?: (error: Event) => void;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
}

/**
 * Creates a proper image URL for uploaded files
 * Handles both relative and absolute paths
 */
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it starts with /uploads, use as is (for Vite proxy)
  if (imagePath.startsWith('/uploads')) {
    return imagePath;
  }
  
  // If it's a relative path, prepend /uploads
  const cleanPath = imagePath.replace(/^\/uploads/, '');
  return `/uploads${cleanPath}`;
};

/**
 * Preloads an image to check if it's accessible
 */
export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    
    img.src = getImageUrl(src);
  });
};

/**
 * Creates an image element with proper error handling
 */
export const createImageElement = (
  src: string, 
  options: ImageLoadOptions = {}
): HTMLImageElement => {
  const img = new Image();
  img.crossOrigin = options.crossOrigin || 'anonymous';
  
  if (options.onLoad) {
    img.onload = options.onLoad;
  }
  
  if (options.onError) {
    img.onerror = (event) => options.onError?.(event as Event);
  }
  
  img.src = getImageUrl(src);
  return img;
};

/**
 * React hook for image loading with error state
 */
export const useImageLoader = (src: string) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState('');

  React.useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setImageUrl(getImageUrl(src));

    const img = createImageElement(src, {
      onLoad: () => {
        setIsLoading(false);
        setHasError(false);
      },
      onError: () => {
        setIsLoading(false);
        setHasError(true);
      }
    });
  }, [src]);

  return { isLoading, hasError, imageUrl };
};

// Import React for the hook
import React from 'react';
