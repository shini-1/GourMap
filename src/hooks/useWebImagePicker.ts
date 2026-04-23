// src/hooks/useWebImagePicker.ts
import { useState, useCallback } from 'react';
import ImagePickerService, { ImagePickerResult, ImagePickerOptions } from '../services/imagePickerService';

export interface UseImagePickerReturn {
  pickImage: (options?: ImagePickerOptions) => Promise<{ canceled: boolean; assets: ImagePickerResult[] }>;
  isAvailable: boolean;
  loading: boolean;
}

export const useWebImagePicker = (): UseImagePickerReturn => {
  const [loading, setLoading] = useState(false);

  const imagePickerService = ImagePickerService.getInstance();
  const isAvailable = imagePickerService.isImagePickerAvailable();

  const pickImage = useCallback(async (options: ImagePickerOptions = {}) => {
    if (!isAvailable) {
      throw new Error('Image picker is not available on this platform');
    }

    setLoading(true);
    try {
      const result = await imagePickerService.launchImageLibrary(options);
      return result;
    } finally {
      setLoading(false);
    }
  }, [isAvailable, imagePickerService]);

  return {
    pickImage,
    isAvailable,
    loading
  };
};
