export interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  inputBackground: string;
}

export const lightTheme: Theme = {
  primary: '#FF6B35', // Orange
  secondary: '#2EC4B6', // Teal
  accent: '#FFD166', // Golden Yellow
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  inputBackground: '#F9F9F9',
};

export const darkTheme: Theme = {
  primary: '#FF8A5E', // Lighter orange
  secondary: '#4ED1C5', // Lighter teal
  accent: '#FFE099', // Lighter yellow
  background: '#000000',
  surface: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  border: '#333333',
  inputBackground: '#1A1A1A',
};
