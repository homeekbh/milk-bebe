"use client";

import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";

type Props = {
  id: string;
  slug: string;
  name: string;
  price: number;
  disabled?: boolean;
};

export default function AddToCartButton({
  id,
  slug,
  name,
  price,
  disabled,
}: Props) {
  const { addToCart } = useCart();

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        addToCart({
          id,
          slug,
          name,
          price,
          quantity: 1,
        })
      }
    >
      {disabled ? "Indisponible" : "Ajouter au panier"}
    </Button>
  );
}
