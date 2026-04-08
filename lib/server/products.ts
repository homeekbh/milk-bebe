// lib/server/products.ts

import { supabaseServer } from "./supabase";

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabaseServer
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(error.message);
    return null;
  }

  return data;
}

export async function getAllProducts() {
  const { data, error } = await supabaseServer
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error.message);
    return [];
  }

  return data;
}
