export type RootStackParamList = {
  RoleSelection: undefined;
  Home: undefined;
  BusinessPanel: undefined;
  AdminPanel: undefined;
  CreateAdmin: undefined;
  RestaurantDetail: { restaurantId?: string; restaurant?: any };
  CreateRestaurant: undefined;
  BusinessDashboard: undefined;
  EditProfile: undefined;
  MenuList: { restaurantId: string };
  AddMenuItem: { restaurantId: string };
  EditMenuItems: { restaurantId: string };
  PostPromo: { restaurantId: string };
  Login: { role: 'user' | 'business' | 'admin' };
  Register: { role: 'user' | 'business' };
};
