/**
 * src/data/articles.ts
 * -------------------
 * Définitions des types et constantes de référence du catalogue Lafi.
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Type Article : contrat d'interface TypeScript garantissant la cohérence des
 *   propriétés d'un article entre l'API REST FastAPI et l'application mobile.
 * - categories : les 6 catégories officielles du projet, rigoureusement synchronisées
 *   avec les modèles de Machine Learning (TF-IDF texte et MobileNetV2 image).
 * - DELIVERY_FEE : fixé à 0 FCFA car la livraison est assurée directement par Yango
 *   et réglée de la main à la main au livreur.
 */

export type Article = {
  id: string;
  name: string;
  price: number;
  shop: string;
  distanceM: number;
  category: string;
  description?: string;
  open: boolean;
  color: string;
  negotiable?: boolean;
  photoUri?: string;
  photos?: string[];
  shopPhone?: string;
  shopLat?: number;
  shopLng?: number;
  hidden?: boolean;
  outOfStock?: boolean;
};

// Les 6 catégories officielles de Lafi + filtre 'Tout'
export const categories = [
  "Tout",
  "Alimentation",
  "Mode",
  "Beauté",
  "Électronique",
  "Maison",
  "Bébé",
] as const;

// Numéros de contact des boutiques (dynamiquement renseignés depuis l'API)
export const SHOP_PHONES: Record<string, string> = {};

// Frais de livraison Lafi (réglés directement au livreur selon le tarif de l'application Yango)
export const DELIVERY_FEE = 0;
