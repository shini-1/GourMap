// src/services/imagePickerService.ts

export interface ImagePickerResult {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
}

export interface ImagePickerOptions {
  mediaTypes?: 'images' | 'videos' | 'all';
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
}

class ImagePickerService {
  private static instance: ImagePickerService;

  public static getInstance(): ImagePickerService {
    if (!ImagePickerService.instance) {
      ImagePickerService.instance = new ImagePickerService();
    }
    return ImagePickerService.instance;
  }

  // Check if image picker is available
  public isImagePickerAvailable(): boolean {
    // Only available in Expo Go environment
    // In built apps or other environments, it's not available
    return false;
  }

  // Launch image picker
  public async launchImageLibrary(options: ImagePickerOptions = {}): Promise<{ canceled: boolean; assets: ImagePickerResult[] }> {
    // Image picker is disabled in built apps to avoid native module errors
    throw new Error('Image picker is not available in this environment');
  }

  // Convert data URL to blob for upload
  public dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}

export default ImagePickerService;
