// lib/types.ts

export interface Product {
  id:            string;
  name:          string;
  slug:          string;
  price_ttc:     number;
  promo_price?:  number | null;
  promo_start?:  string | null;
  promo_end?:    string | null;
  stock:         number;
  category_slug: string;
  image_url?:    string;
  published:     boolean;
  label?:        string;
  sizes?:        string[];
  sizes_stock?:  Record<string, number>;
  colors?:       { name: string; hex: string; image_url?: string; stock?: number }[];
  weight_g?:     number;
}

export interface Order {
  id:               string;
  created_at:       string;
  customer_name:    string;
  customer_email:   string;
  amount_total:     number;
  items:            CartItem[];
  shipping_status:  "en_preparation" | "expediee" | "livree" | "annulee" | "retour";
  shipping_address: Address | null;
  tracking_number?: string;
  notes?:           string;
  promo_code?:      string;
  discount?:        number;
  stripe_session_id?: string;
}

export interface CartItem {
  id:            string;
  name:          string;
  slug?:         string;
  price:         number;
  quantity:      number;
  image_url?:    string;
  category_slug?: string;
  taille?:       string | null;
  couleur?:      string | null;
}

export interface Address {
  name?:        string;
  line1:        string;
  line2?:       string;
  city:         string;
  postal_code:  string;
  country:      string;
}

export interface PromoCode {
  id:             string;
  code:           string;
  discount_type:  "percent" | "fixed";
  discount_value: number;
  min_order?:     number | null;
  max_uses?:      number | null;
  uses_count:     number;
  expires_at?:    string | null;
  active:         boolean;
}