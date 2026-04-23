import { supabase, TABLES } from '../config/supabase';
import { Category } from '../../types';

export async function getAllCategories(): Promise<Category[]> {
  try {
    console.log('🔍 Fetching categories from Supabase...');

    const { data, error } = await supabase
      .from(TABLES.CATEGORIES)
      .select('*');

    if (error) {
      console.error('❌ Supabase error fetching categories:', error);
      throw error;
    }

    const categories = (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      icon_url: item.icon_url,
      color: item.color,
      emoji: item.emoji,
    }));

    console.log(`✅ Retrieved ${categories.length} categories from Supabase`);
    return categories;
  } catch (error) {
    console.error('❌ Error fetching categories from Supabase:', error);
    return []; // Return empty array as fallback
  }
}

export async function getCategoryByName(name: string): Promise<Category | null> {
  try {
    console.log(`🔍 Fetching category '${name}' from Supabase...`);

    const { data, error } = await supabase
      .from(TABLES.CATEGORIES)
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      console.error(`❌ Supabase error fetching category '${name}':`, error);
      return null;
    }

    const category: Category = {
      id: data.id,
      name: data.name,
      icon_url: data.icon_url,
      color: data.color,
      emoji: data.emoji,
    };

    console.log(`✅ Retrieved category '${name}' from Supabase`);
    return category;
  } catch (error) {
    console.error(`❌ Error fetching category '${name}' from Supabase:`, error);
    return null;
  }
}
