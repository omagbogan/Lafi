import React, { Component, ErrorInfo, forwardRef, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("[LafiMap] Erreur interceptée dans MapView natif:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[StyleSheet.absoluteFill, styles.fallbackContainer]}>
          <Ionicons name="map-outline" size={42} color="#2C64E8" />
          <Text style={styles.fallbackTitle}>Carte d'Abidjan (Cocody)</Text>
          <Text style={styles.fallbackSub}>
            Sélectionnez une boutique dans la liste ci-dessous
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
  pinStyles: {
    pinContainer: any;
    pinContainerSelected: any;
    pinHead: any;
    pinHeadOpen: any;
    pinHeadClosed: any;
    pinHeadSelected: any;
    pinTip: any;
    pinTipOpen: any;
    pinTipClosed: any;
    pinTipSelected: any;
  };
};

export const LafiMap = forwardRef<MapView, LafiMapProps>(function LafiMap(
  { shops, selectedShop, onSelectShop, initialRegion, pinStyles },
  ref,
) {
  return (
    <MapErrorBoundary>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {shops.map((shop) => {
          const isSelected = selectedShop?.id === shop.id;
          return (
            <Marker
              key={shop.id}
              coordinate={{ latitude: shop.lat, longitude: shop.lng }}
              onPress={() => onSelectShop(shop)}
              tracksViewChanges={false}
            >
              <View
                style={[
                  pinStyles.pinContainer,
                  isSelected && pinStyles.pinContainerSelected,
                ]}
              >
                <View
                  style={[
                    pinStyles.pinHead,
                    shop.open ? pinStyles.pinHeadOpen : pinStyles.pinHeadClosed,
                    isSelected && pinStyles.pinHeadSelected,
                  ]}
                >
                  <Ionicons
                    name="storefront"
                    size={isSelected ? 18 : 16}
                    color="#FFFFFF"
                  />
                </View>
                <View
                  style={[
                    pinStyles.pinTip,
                    shop.open ? pinStyles.pinTipOpen : pinStyles.pinTipClosed,
                    isSelected && pinStyles.pinTipSelected,
                  ]}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>
    </MapErrorBoundary>
  );
});

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  fallbackSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
  },
});

