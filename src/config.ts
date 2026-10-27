// 10.0.2.2 = votre ordinateur, vu depuis l'émulateur Android.
// Pour un vrai téléphone : créez un fichier .env à la racine avec
// EXPO_PUBLIC_API_URL=http://IP_DE_VOTRE_PC:8000
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8000";
