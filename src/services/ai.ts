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
};

export type CategorySuggestion = { category: string; confidence: number };

// Repli local si le serveur est injoignable
function suggestLocally(title: string): CategorySuggestion | null {
  const text = title.toLowerCase();
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some((w) => text.includes(w)))
      return { category, confidence: 0.9 };
  }
  return null;
}

// Appelle l'API (votre classifieur dès qu'il sera branché côté serveur)
export async function suggestCategory(
  title: string,
): Promise<CategorySuggestion | null> {
  try {
    const result = await api.suggestCategory(title);
    if (result.category)
      return {
        category: result.category,
        confidence: result.confidence ?? 0.9,
      };
    return null;
  } catch {
    return suggestLocally(title);
  }
}

// SIMULATION : sera remplacée par le détourage du fond (service ou modèle)
export async function improvePhoto(uri: string): Promise<string> {
  await wait(1200);
  return uri;
}

// Extrait le prix et « à débattre » d'une phrase dictée
export function extractFromSpeech(text: string) {
  const match = text.match(/(\d[\d\s.]*\d|\d)\s*(?:f\b|fcfa|francs?)/i);
  const price = match ? Number(match[1].replace(/[\s.]/g, "")) : null;
  const negotiable = /d[ée]battre|n[ée]gociable|discutable/i.test(text);
  return { price, negotiable };
}
