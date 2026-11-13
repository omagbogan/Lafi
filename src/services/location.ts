import * as Location from "expo-location";
import { Alert } from "react-native";

export type LocationResult = {
  latitude: number;
  longitude: number;
  addressText: string;
};

/**
 * Récupère la position GPS actuelle de l'appareil et son quartier / adresse lisible.
 */
export async function getCurrentAddress(): Promise<LocationResult | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Autorisation GPS refusée",
        "Pour détecter automatiquement votre quartier, veuillez autoriser l'accès à la localisation dans les réglages de votre téléphone.",
      );
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = loc.coords;

    let addressText = "Cocody, Abidjan";
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (places && places.length > 0) {
        const p = places[0];
        const parts: string[] = [];

        // Préférer quartier/district (ex: Cocody, Plateau, Riviera)
        if (p.district) {
          parts.push(p.district);
        } else if (p.subregion) {
          parts.push(p.subregion);
        } else if (p.street) {
          parts.push(p.street);
        } else if (p.name) {
          parts.push(p.name);
        }

        // Ville (ex: Abidjan)
        if (p.city && !parts.includes(p.city)) {
          parts.push(p.city);
        } else if (p.region && !parts.includes(p.region)) {
          parts.push(p.region);
        }

        if (parts.length > 0) {
          addressText = parts.join(", ");
        }
      }
    } catch {
      // Si le géocodage inverse est temporairement inaccessible, repli propre
      addressText = "Position GPS enregistrée";
    }

    return { latitude, longitude, addressText };
  } catch (error) {
    Alert.alert(
      "Localisation indisponible",
      "Impossible d'obtenir votre position GPS. Assurez-vous que la localisation de votre téléphone est bien activée.",
    );
    return null;
  }
}

