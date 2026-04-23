export interface User {
  uid: string;
  email: string;
  role: 'user' | 'business' | 'admin' | 'business_owner';
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  businessName?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  image?: string; // Optional logo/image URL
  category?: string;
  rating?: number;
  editorialRating?: number;
  priceRange?: string; // $, $$, $$$, $$$$
  description?: string;
  phone?: string;
  hours?: string;
  website?: string;
  // add more fields as needed
}

export interface RestaurantOwner {
  id: string;
  userId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  location: {
    latitude: number;
    longitude: number;
  };
  image?: string;
  description?: string;
  cuisineType?: string;
  status: 'approved' | 'rejected' | 'pending';
  createdAt: number;
  approvedAt?: number;
  rejectionReason?: string;
}

export interface RestaurantSubmission {
  id: string;
  ownerId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  location: {
    latitude: number;
    longitude: number;
  };
  image?: string;
  description: string;
  cuisineType: string;
  submittedAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category?: string; // e.g., 'appetizers', 'main course', 'desserts', 'beverages'
  image?: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon_url: string;
  color: string; // Hex color code
  emoji: string;
}

// Extended fetch response type to support both blob() and arrayBuffer() methods
export interface FetchResponseWithBlob extends Response {
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

// Image upload related types
export interface ImageUploadOptions {
  contentType?: string;
  upsert?: boolean;
}

export interface ImageUploadResult {
  url: string;
  size: number;
  contentType: string;
}
