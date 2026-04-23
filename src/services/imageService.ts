import { supabase, BUCKETS } from '../config/supabase';
import type { ImageUploadResult } from '../../types';
import * as FileSystem from 'expo-file-system';

// Bucket name for storage
const STORAGE_BUCKET = BUCKETS.RESTAURANT_IMAGES;

/**
 * Upload an image to Supabase Storage and update the restaurant record with the image URL
 * @param imageUri - Local URI of the image to upload
 * @param restaurantId - ID of the restaurant to associate the image with
 * @param imageType - Type of image (logo, banner, etc.)
 * @returns - URL of the uploaded image
 */
export const uploadAndUpdateRestaurantImage = async (imageUri: string, restaurantId: string, imageType: string): Promise<string> => {
  try {
    // Validate inputs
    if (!imageUri || !restaurantId || !imageType) {
      throw new Error('Missing required parameters: imageUri, restaurantId, or imageType');
    }

    console.log('📷 Uploading image and updating restaurant:', { imageUri, restaurantId, imageType });

    // Upload to bucket first
    const imageUrl = await uploadImageToRestaurantBucket(imageUri, `${restaurantId}_${imageType}`, 'image/jpeg');

    // Verify image URL before updating database
    if (!imageUrl || !imageUrl.trim()) {
      throw new Error('Image URL is empty after upload');
    }

    // Update the restaurant record with the image URL
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ image: imageUrl.trim() })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Supabase update restaurant error:', updateError);
      throw new Error(`Failed to update restaurant with image URL: ${updateError.message}`);
    }

    console.log('✅ Image uploaded and restaurant updated successfully:', imageUrl);
    return imageUrl;

  } catch (error) {
    console.error('❌ Image upload and update failed:', error);
    throw error;
  }
};

/**
 * Upload an image to the restaurant images bucket and return its public URL
 * Converts image URI to blob and uploads to Supabase
 */
export const uploadImageToRestaurantBucket = async (
  imageUri: string,
  filePrefix: string,
  contentType: string = 'image/jpeg'
): Promise<string> => {
  try {
    const fileName = `${filePrefix}-${Date.now()}.jpg`;
    const filePath = `${fileName}`;

    console.log('📷 Starting upload:', { imageUri, fileName });

    // Step 1: Read the image file as base64
    let base64Data: string;
    try {
      console.log('📷 Reading image from URI as base64...');
      
      // Read file as base64 using expo-file-system
      // Note: Using string literal 'base64' as EncodingType enum may not be exported in this version
      base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64' as any,
      });
      
      console.log('📷 Image read as base64, length:', base64Data.length);
    } catch (fileError: any) {
      console.error('❌ Failed to read image:', fileError);
      throw new Error(`Failed to read image file: ${fileError.message}`);
    }

    // Step 2: Convert base64 to ArrayBuffer for Supabase upload
    let imageBuffer: ArrayBuffer;
    try {
      console.log('📷 Converting base64 to ArrayBuffer...');
      
      // Decode base64 to binary string
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      imageBuffer = bytes.buffer;
      console.log('📷 Converted to ArrayBuffer, size:', imageBuffer.byteLength, 'bytes');
    } catch (conversionError: any) {
      console.error('❌ Failed to convert image:', conversionError);
      throw new Error(`Failed to convert image: ${conversionError.message}`);
    }

    // Step 3: Upload ArrayBuffer directly to Supabase storage
    try {
      console.log('📷 Uploading to Supabase storage...');
      
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, imageBuffer, {
          contentType: contentType,
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Upload successful');
    } catch (uploadError: any) {
      console.error('❌ Upload failed:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message || 'Unknown upload error'}`);
    }

    // Step 4: Get public URL
    const publicUrlData = await supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.data.publicUrl;
    console.log('✅ Image uploaded successfully');
    console.log('📷 Image URL:', imageUrl);
    console.log('📷 File path:', filePath);
    console.log('📷 Storage bucket:', STORAGE_BUCKET);
    
    // Verify URL is valid
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.length === 0) {
      throw new Error('Invalid image URL generated');
    }
    
    return imageUrl;

  } catch (error: any) {
    console.error('❌ Image upload failed:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
};
