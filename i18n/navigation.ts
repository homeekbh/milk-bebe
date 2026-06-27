import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Helpers de navigation conscients de la locale (Link, useRouter, usePathname…).
// À utiliser DANS les routes [locale] uniquement (pilote).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
