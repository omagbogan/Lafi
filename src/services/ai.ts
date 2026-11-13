/**
 * src/services/ai.ts
 * ------------------
 * Couche d'abstraction et contrat d'interface pour tous les services d'Intelligence Artificielle.
 *
 * Soutenance Développeur Data IA (Bloc 2 - Entraînement, Bloc 4 - Agent IA & Bloc 5 - Intégration) :
 * 1. Modèle Texte (TF-IDF + LinearSVC) : classification automatique selon le titre saisi.
 * 2. Modèle Vision (MobileNetV2 fine-tuné) : reconnaissance visuelle de la catégorie à partir de la photo.
 * 3. Fusion Multimodale (resolveMultimodalCategory) : comparaison et arbitrage entre la vision et le texte
 *    pour afficher un feedback immédiat au commerçant (accord ou conflit).
 * 4. Amélioration Photo (Pillow côté serveur) : correction de rotation EXIF, autocontraste et netteté.
 * 5. Génération de Description (LLM OpenRouter + Template de repli) : rédaction d'accroches vendeuses en 1 clic.
 * 6. Repli résilient hors-ligne : dictionnaire de mots-clés locaux garantissant un fonctionnement continu
 *    même en cas de coupure réseau.
 */

import { api } from "./api";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const keywords: Record<string, string[]> = {
  Mode: [
    "sac",
    "robe",
    "sandale",
    "chaussure",
    "pagne",
    "chemise",
    "pantalon",
    "wax",
    "cuir",
  ],
  Alimentation: [
    "attiéké",
    "attieke",
    "poisson",
    "riz",
    "huile",
    "banane",
    "plantain",
    "poulet",
    "sauce",
  ],
  Beauté: ["karité", "karite", "crème", "creme", "savon", "parfum"],
  Électronique: [
    "écouteur",
    "ecouteur",
    "téléphone",
    "telephone",
    "chargeur",
    "câble",
    "cable",
    "radio",
  ],
  Maison: [
    "ventilateur",
    "mixeur",
    "casserole",
    "poêle",
    "poele",
    "assiette",
    "drap",
    "rideau",
    "matelas",
    "lampe",
    "ampoule",
    "fer à repasser",
    "seau",
    "balai",
  ],
  Bébé: [
    "biberon",
    "couche",
    "couches",
    "pampers",
    "lingette",
    "tétine",
    "tetine",
    "poussette",
    "bavoir",
  ],
};

export type CategorySuggestion = { category: string };

export type MultimodalResult = {
  status: "agreement" | "conflict" | "text_only" | "image_only" | "none";
  selectedCategory: string | null;
  textCategory: string | null;
  imageCategory: string | null;
  message: string;
};

// Fusion multimodale : compare les prédictions texte et image
export function resolveMultimodalCategory(
  textCat: string | null,
  imageCat: string | null,
): MultimodalResult {
  if (textCat && imageCat) {
    if (textCat === imageCat) {
      return {
        status: "agreement",
        selectedCategory: textCat,
        textCategory: textCat,
        imageCategory: imageCat,
        message: `Confirmé par la photo et le titre (${textCat})`,
      };
    }
    return {
      status: "conflict",
      selectedCategory: textCat,
      textCategory: textCat,
      imageCategory: imageCat,
      message: `La photo suggère « ${imageCat} » et le titre « ${textCat} »`,
    };
  }
  if (imageCat) {
    return {
      status: "image_only",
      selectedCategory: imageCat,
      textCategory: null,
      imageCategory: imageCat,
      message: `Suggéré par la photo (${imageCat})`,
    };
  }
  if (textCat) {
    return {
      status: "text_only",
      selectedCategory: textCat,
      textCategory: textCat,
      imageCategory: null,
      message: `Suggéré par le titre (${textCat})`,
    };
  }
  return {
    status: "none",
    selectedCategory: null,
    textCategory: null,
    imageCategory: null,
    message: "",
  };
}

// Repli local si le serveur est injoignable
function suggestLocally(title: string): CategorySuggestion | null {
  const text = title.toLowerCase();
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some((w) => text.includes(w))) return { category };
  }
  return null;
}

export async function suggestCategory(
  title: string,
): Promise<CategorySuggestion | null> {
  try {
    const result = await api.suggestCategory(title);
    // On ne pré-remplit que si le serveur est sûr de lui
    if (result.accepte && result.category) return { category: result.category };
    return null;
  } catch {
    return suggestLocally(title);
  }
}

export async function suggestCategoryFromImage(
  uri: string,
): Promise<CategorySuggestion | null> {
  try {
    const result = await api.suggestCategoryFromImage(uri);
    // On ne pré-remplit que si le modèle d'images est confiant (seuil dépassé)
    if (result.accepte && result.category) return { category: result.category };
    return null;
  } catch {
    return null;
  }
}

// Amélioration réelle de la photo côté serveur (Pillow : EXIF, recadrage carré, autocontraste, netteté)
export async function improvePhoto(uri: string): Promise<string> {
  try {
    const res = await api.improvePhoto(uri);
    return res.fullUri;
  } catch {
    await wait(400);
    return uri;
  }
}

// Génère une description commerciale via l'IA (OpenRouter + repli local)
export async function generateDescription(data: {
  title: string;
  category?: string;
  price?: number;
  negotiable?: boolean;
}): Promise<{ description: string; source: string }> {
  try {
    const res = await api.generateDescription(data);
    return { description: res.description, source: res.source };
  } catch {
    const clean = data.title.trim() || "Cet article";
    const neg = data.negotiable ? " Prix discutable sur WhatsApp." : "";
    return {
      description: `${clean} de belle qualité, disponible immédiatement en boutique ou en livraison rapide Yango.${neg}`,
      source: "local-template",
    };
  }
}
