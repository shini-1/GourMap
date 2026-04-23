# GourMap Expo

A comprehensive, multi-role restaurant discovery and management application built with React Native and Expo. GourMap enables users to discover local restaurants, allows business owners to manage their establishments, and provides administrators with tools to oversee the platform.

**Version:** 1.10.0  
**Package:** com.codeblooded.gourmap

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Core Screens](#core-screens)
- [Services & APIs](#services--apis)
- [Data Models](#data-models)
- [Development](#development)
- [Building & Deployment](#building--deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

GourMap is a multi-platform restaurant discovery application that serves three distinct user roles:

1. **Regular Users** - Discover and explore restaurants with interactive maps
2. **Business Owners** - Manage restaurant profiles, menus, and promotions
3. **Administrators** - Oversee platform content and user management

The application leverages modern technologies including React Native for cross-platform compatibility, Supabase for backend services, and MapBox for location-based features.

## Key Features

### User Features
- **Interactive Map View** - Browse restaurants on a MapBox-powered map with real-time location tracking
- **Restaurant Discovery** - Search and filter restaurants by category, location, and ratings
- **Detailed Restaurant Info** - View menus, hours, contact information, and customer reviews
- **Promotions** - Discover current promotions and special offers from restaurants
- **Offline Support** - Access cached restaurant data when offline
- **Location Services** - Get directions and nearby restaurant recommendations

### Business Owner Features
- **Restaurant Management** - Create and edit restaurant profiles with images and descriptions
- **Menu Management** - Add, edit, and organize menu items with pricing and availability
- **Promotion Posting** - Create and manage promotional campaigns
- **Business Dashboard** - View analytics and performance metrics
- **Profile Customization** - Update business information and branding
- **Image Management** - Upload restaurant and menu item images

### Admin Features
- **User Management** - Manage user accounts and roles
- **Restaurant Verification** - Approve or reject restaurant submissions
- **Content Moderation** - Review and manage platform content
- **Admin Dashboard** - View system analytics and statistics
- **Admin Creation** - Add new administrators to the platform

## Tech Stack

### Frontend
- **React Native** - Cross-platform mobile framework
- **Expo** - React Native development platform (v54.0.23)
- **TypeScript** - Static type checking and better IDE support
- **React Navigation** - Navigation library for screen management
- **React Native Maps** - Native map integration (v1.20.1)
- **MapBox** - Advanced mapping and location services (@rnmapbox/maps v10.2.7)
- **React Native Vector Icons** - Icon library for UI components

### Backend & Services
- **Supabase** - Open-source Firebase alternative for authentication and database
- **Firebase** - Legacy support for authentication and storage
- **Cloud Firestore** - Real-time database (legacy)
- **Firebase Storage** - File storage for images and media
- **Expo Location** - Native location services

### State Management & Context
- **React Context API** - Application state management
- **AuthContext** - Authentication state and user management
- **NetworkContext** - Network connectivity status
- **ThemeContext** - Dark mode and theming support

### Development Tools
- **TypeScript** - Strict mode enabled for type safety
- **Expo Build Properties** - Build configuration management
- **Expo Font** - Custom font loading
- **Expo Image Picker** - Native image selection
- **Async Storage** - Local data persistence

## Project Structure

```
GourMapExpo/
├── App.tsx                          # Main application entry point
├── index.ts                         # Root component registration
├── app.json                         # Expo configuration
├── eas.json                         # EAS Build configuration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
│
├── assets/                          # Static assets
│   ├── icon.png                     # App icon
│   ├── splash-icon.png              # Splash screen
│   ├── adaptive-icon.png            # Android adaptive icon
│   └── favicon.png                  # Web favicon
│
├── components/                      # Reusable UI components
│   ├── AppNavigator.tsx             # App navigation setup
│   ├── AuthContext.tsx              # Authentication context provider
│   ├── DarkModeToggle.tsx           # Dark mode toggle component
│   ├── Header.tsx                   # Header component
│   ├── MapBoxWebView.tsx            # MapBox integration component
│   └── Navigation.tsx               # Navigation utilities
│
├── screens/                         # Application screens (17 screens)
│   ├── RoleSelectionScreen.tsx      # Initial role selection
│   ├── HomeScreen.tsx               # Main user home with map
│   ├── RestaurantDetailScreen.tsx   # Restaurant details and menu
│   ├── LoginScreenNew.tsx           # User login
│   ├── RegisterScreenNew.tsx        # User registration
│   ├── AuthModal.tsx                # Authentication modal
│   │
│   ├── BusinessPanelScreen.tsx      # Business owner dashboard
│   ├── CreateRestaurantScreen.tsx   # Create new restaurant
│   ├── BusinessDashboardScreen.tsx  # Business analytics
│   ├── EditProfileScreen.tsx        # Edit business profile
│   ├── MenuListScreen.tsx           # View restaurant menu
│   ├── AddMenuItemScreen.tsx        # Add menu items
│   ├── EditMenuItemsScreen.tsx      # Edit menu items
│   ├── PostPromoScreen.tsx          # Create promotions
│   │
│   ├── AdminPanelScreen.tsx         # Admin dashboard (main)
│   ├── AdminLoginScreen.tsx         # Admin login
│   └── CreateAdminScreen.tsx        # Create new admin
│
├── services/                        # Core services
│   ├── firebase.ts                  # Supabase client initialization
│   ├── restaurants.ts               # Restaurant data operations
│   ├── expoLocationService.ts       # Location services
│   ├── imageService.ts              # Image upload and management
│   └── (legacy Firebase services)
│
├── src/                             # Extended source directory
│   ├── config/
│   │   └── supabase.ts              # Supabase configuration
│   │
│   ├── contexts/
│   │   └── NetworkContext.tsx       # Network connectivity context
│   │
│   ├── services/                    # Specialized services
│   │   ├── adminAuthService.ts      # Admin authentication
│   │   ├── businessOwnerAuthService.ts # Business owner auth
│   │   ├── restaurantService.ts     # Restaurant operations
│   │   ├── menuService.ts           # Menu management
│   │   ├── promoService.ts          # Promotion management
│   │   ├── locationService.ts       # Location utilities
│   │   ├── geocodingService.ts      # Geocoding operations
│   │   ├── categoryService.ts       # Category management
│   │   ├── imagePickerService.ts    # Image picker utilities
│   │   └── offlineService.ts        # Offline data management
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useWebImagePicker.ts     # Web image picker hook
│   │   └── useWebLocation.ts        # Web location hook
│   │
│   └── utils/                       # Utility functions
│
├── theme/                           # Theming
│   ├── ThemeContext.tsx             # Theme provider
│   └── colors.ts                    # Color definitions
│
├── types/                           # TypeScript type definitions
│   └── index.ts                     # Core type definitions
│
├── utils/                           # Utility functions
│   └── googleMapsParser.ts          # Google Maps URL parsing
│
├── __tests__/                       # Test files
│   └── AuthContext.test.tsx         # Authentication tests
│
├── android/                         # Android native code
│   ├── app/
│   │   ├── build.gradle
│   │   ├── debug.keystore           # Debug signing key
│   │   └── proguard-rules.pro
│   ├── build.gradle
│   ├── gradle.properties
│   ├── settings.gradle
│   └── gradlew
│
└── metro.config.js                  # Metro bundler configuration
```

## Installation & Setup

### Prerequisites

- **Node.js** - v14 or later
- **npm** or **yarn** - Package manager
- **Expo CLI** - `npm install -g expo-cli`
- **Git** - Version control
- **Xcode** - For iOS development (macOS only)
- **Android Studio** - For Android development

### Step 1: Clone the Repository

```bash
git clone https://github.com/shini-1/GourMapExpo.git
cd GourMapExpo
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase Configuration (Legacy)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# MapBox Configuration
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=YOUR_MAPBOX_TOKEN
```

### Step 4: Configure Backend Services

#### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Create the following tables:
   - `restaurants` - Restaurant information
   - `menu_items` - Menu items for restaurants
   - `promotions` - Restaurant promotions
   - `users` - User accounts and roles
   - `restaurant_submissions` - Pending restaurant approvals

3. Update `src/config/supabase.ts` with your credentials

#### MapBox Setup

1. Sign up at [mapbox.com](https://www.mapbox.com/)
2. Get your access token from the account dashboard
3. Add token to `.env` file (already included in app.json)

### Step 5: Run the Application

```bash
# Start Expo development server
npx expo start

# Run on Android emulator/device
npx expo run:android

# Run on iOS simulator (macOS only)
npx expo run:ios

# Run in web browser
npx expo start --web
```

## Configuration

### app.json

Key configuration settings:

```json
{
  "expo": {
    "name": "GourMap",
    "version": "1.10.0",
    "orientation": "portrait",
    "android": {
      "package": "com.codeblooded.gourmap",
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "FOREGROUND_SERVICE"
      ]
    },
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs access to your location to show nearby restaurants and help you navigate."
      }
    }
  }
}
```

### TypeScript Configuration

Strict mode is enabled for type safety:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

## Core Screens

### Authentication Screens
- **RoleSelectionScreen** - Choose between User, Business Owner, or Admin roles
- **LoginScreenNew** - User login with email/password
- **RegisterScreenNew** - User registration
- **AdminLoginScreen** - Admin authentication
- **AuthModal** - Modal authentication interface

### User Screens
- **HomeScreen** - Main map view with restaurant listings and search
- **RestaurantDetailScreen** - Detailed restaurant information, menu, and reviews

### Business Owner Screens
- **BusinessPanelScreen** - Main business owner dashboard
- **CreateRestaurantScreen** - Register a new restaurant
- **BusinessDashboardScreen** - View business analytics
- **EditProfileScreen** - Update restaurant profile
- **MenuListScreen** - View and manage menu items
- **AddMenuItemScreen** - Add new menu items
- **EditMenuItemsScreen** - Edit existing menu items
- **PostPromoScreen** - Create and manage promotions

### Admin Screens
- **AdminPanelScreen** - Main admin dashboard with management tools
- **CreateAdminScreen** - Add new administrators

## Services & APIs

### Authentication Services
- **adminAuthService.ts** - Admin user authentication and management
- **businessOwnerAuthService.ts** - Business owner authentication

### Data Services
- **restaurantService.ts** - CRUD operations for restaurants
- **menuService.ts** - Menu item management
- **promoService.ts** - Promotion management
- **categoryService.ts** - Restaurant category management

### Location & Mapping
- **locationService.ts** - Location utilities and calculations
- **geocodingService.ts** - Address to coordinates conversion
- **expoLocationService.ts** - Expo location API wrapper

### Utilities
- **imageService.ts** - Image upload and management
- **imagePickerService.ts** - Image selection utilities
- **offlineService.ts** - Offline data caching and sync

## Data Models

### User
```typescript
interface User {
  uid: string;
  email: string;
  role: 'user' | 'business' | 'admin' | 'business_owner';
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  businessName?: string;
}
```

### Restaurant
```typescript
interface Restaurant {
  id: string;
  name: string;
  location: { latitude: number; longitude: number };
  image?: string;
  category?: string;
  rating?: number;
  priceRange?: string; // $, $$, $$$, $$$$
  description?: string;
  phone?: string;
  hours?: string;
  website?: string;
}
```

### MenuItem
```typescript
interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image?: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### RestaurantSubmission
```typescript
interface RestaurantSubmission {
  id: string;
  ownerId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  location: { latitude: number; longitude: number };
  image?: string;
  description: string;
  cuisineType: string;
  submittedAt: number;
  status: 'pending' | 'approved' | 'rejected';
}
```

## Development

### Available Scripts

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Run tests
npm test
```

### Code Style & Standards

- **Language**: TypeScript with strict mode enabled
- **Components**: Functional components with React Hooks
- **State Management**: React Context API
- **Styling**: React Native StyleSheet
- **Navigation**: React Navigation Stack Navigator

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| expo | 54.0.23 | Development platform |
| react-native | 0.81.5 | Mobile framework |
| @react-navigation/native | 6.0.0 | Navigation |
| @rnmapbox/maps | 10.2.7 | MapBox integration |
| @supabase/supabase-js | 2.80.0 | Backend services |
| firebase | 12.5.0 | Legacy backend |
| typescript | 5.9.2 | Type checking |

## Building & Deployment

### EAS Build Configuration

The project uses Expo Application Services (EAS) for building:

```bash
# Build for development
eas build --platform android --profile development

# Build for preview
eas build --platform android --profile preview

# Build for production
eas build --platform android --profile production
```

### Android Build

```bash
# Generate APK
npx expo run:android

# Generate AAB for Play Store
eas build --platform android --profile production
```

### iOS Build

```bash
# Build for iOS simulator
npx expo run:ios

# Build for App Store
eas build --platform ios --profile production
```

### Permissions

#### Android Permissions (app.json)
- `ACCESS_COARSE_LOCATION` - Approximate location
- `ACCESS_FINE_LOCATION` - Precise location
- `FOREGROUND_SERVICE` - Background location services

#### iOS Permissions (app.json)
- `NSLocationWhenInUseUsageDescription` - Location access description

## Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/YourFeature`
3. Make your changes
4. Commit with descriptive messages: `git commit -m 'Add YourFeature'`
5. Push to your fork: `git push origin feature/YourFeature`
6. Open a Pull Request

### Code Guidelines

- Use TypeScript for all new code
- Follow the existing code style and structure
- Write meaningful variable and function names
- Keep components focused and reusable
- Add comments for complex logic
- Test your changes before submitting

### Testing

```bash
npm test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support & Contact

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check existing documentation
- Review the project wiki

## Acknowledgments

- **Expo** - React Native development platform
- **React Navigation** - Navigation library
- **MapBox** - Mapping and location services
- **Supabase** - Open-source backend
- **Firebase** - Cloud services
- **React Native Vector Icons** - Icon library

---

**Last Updated:** November 2025  
**Maintainers:** Code Blooded Team
