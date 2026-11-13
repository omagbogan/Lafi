import { forwardRef, useImperativeHandle } from "react";
import { StyleSheet, View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../../theme";

export type ShopMarker = {
  id: string;
  name: string;
  phone?: string;
  open: boolean;
  distanceM: number;
  lat: number;
  lng: number;
  articlesCount: number;
  previewArticles: any[];
};

type LafiMapProps = {
  shops: ShopMarker[];
  selectedShop: ShopMarker | null;
  onSelectShop: (shop: ShopMarker) => void;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  pinStyles?: any;
};

export type LafiMapRef = {
  animateToRegion: (region: any, duration?: number) => void;
};

export const LafiMap = forwardRef<LafiMapRef, LafiMapProps>(function LafiMap(
  { shops, selectedShop, onSelectShop },
  ref,
) {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {
      // Sur le web, l'actualisation visuelle est assurée par l'état React
    },
  }));

  const activeLat = selectedShop ? selectedShop.lat : 5.36;
  const activeLng = selectedShop ? selectedShop.lng : -3.99;

  // URL iframe OpenStreetMap centrée sur Abidjan Cocody
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${activeLng - 0.03}%2C${activeLat - 0.02}%2C${activeLng + 0.03}%2C${activeLat + 0.02}&layer=mapnik&marker=${activeLat}%2C${activeLng}`;

  return (
    <View style={styles.webContainer}>
      <iframe
        title="Carte Lafi Abidjan"
        src={mapUrl}
        style={{
          width: "100%",
          height: "100%",
          border: 0,
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  webContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
  },
});
