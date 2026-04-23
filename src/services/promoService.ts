import { supabase, TABLES } from '../config/supabase';

export interface Promo {
  id: string;
  restaurantId: string;
  title: string;
  description: string;
  discount: number;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromoData {
  restaurantId: string;
  title: string;
  description: string;
  discount: number;
  expiryDate: string;
}

class PromoService {
  private readonly PROMOS_TABLE = TABLES.PROMOS;

  async createPromo(promoData: CreatePromoData): Promise<Promo> {
    try {
      const { data, error } = await supabase
        .from(this.PROMOS_TABLE)
        .insert({
          restaurant_id: promoData.restaurantId,
          title: promoData.title,
          description: promoData.description,
          discount: promoData.discount,
          expiry_date: promoData.expiryDate,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        restaurantId: data.restaurant_id,
        title: data.title,
        description: data.description,
        discount: data.discount,
        expiryDate: data.expiry_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async getActivePromosByRestaurant(restaurantId: string): Promise<Promo[]> {
    try {
      const { data, error } = await supabase
        .from(this.PROMOS_TABLE)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        restaurantId: item.restaurant_id,
        title: item.title,
        description: item.description,
        discount: item.discount,
        expiryDate: item.expiry_date,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  private getErrorMessage(error: any): string {
    if (error.message?.includes('violates check constraint')) {
      return 'Invalid discount value';
    }
    return error.message || 'An error occurred while managing promos';
  }
}

export const promoService = new PromoService();
