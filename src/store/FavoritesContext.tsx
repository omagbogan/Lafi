import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const FAVORITES_KEY = "@lafi_favorites";

type FavoritesContextType = {
  favoriteIds: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setFavoriteIds(parsed.map(String));
          }
        }
      })
      .catch(() => {
        // Ignoré
      });
  }, []);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(String(id)),
    [favoriteIds],
  );

  const toggleFavorite = useCallback((id: string) => {
    const strId = String(id);
    setFavoriteIds((prev) => {
      const next = prev.includes(strId)
        ? prev.filter((item) => item !== strId)
        : [...prev, strId];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites doit être utilisé dans FavoritesProvider");
  }
  return context;
}

