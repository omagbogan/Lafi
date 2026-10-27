import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Alert } from "react-native";
import { Article } from "../data/articles";
import { api, NewArticleInput } from "../services/api";

type ArticlesContextType = {
  articles: Article[];
  catalog: Article[];
  myArticles: Article[];
  shopOpen: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setShopOpen: (open: boolean) => Promise<void>;
  addArticle: (input: NewArticleInput) => Promise<boolean>;
  updateArticle: (id: string, changes: Partial<Article>) => Promise<void>;
};

const ArticlesContext = createContext<ArticlesContextType | null>(null);

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Réessayez dans un instant.";
}

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Article[]>([]);
  const [myArticles, setMyArticles] = useState<Article[]>([]);
  const [shopOpen, setShopOpenState] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [c, m, s] = await Promise.all([api.getCatalog(), api.getMyArticles(), api.getShop()]);
      setCatalog(c);
      setMyArticles(m);
      setShopOpenState(s.is_open);
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Tous les articles connus (catalogue + ceux de ma boutique), sans doublon
  const articles = useMemo(() => {
    const byId = new Map<string, Article>();
    [...catalog, ...myArticles].forEach((a) => byId.set(a.id, a));
    return Array.from(byId.values());
  }, [catalog, myArticles]);

  const setShopOpen = async (open: boolean) => {
    try {
      await api.setShopOpen(open);
      await refresh();
    } catch (e) {
      Alert.alert("Action impossible", messageOf(e));
    }
  };

  const addArticle = async (input: NewArticleInput) => {
    try {
      const photoUrl = input.localPhotoUri ? await api.uploadPhoto(input.localPhotoUri) : undefined;
      await api.createArticle({ ...input, photoUrl });
      await refresh();
      return true;
    } catch (e) {
      Alert.alert("Publication impossible", messageOf(e));
      return false;
    }
  };

  const updateArticle = async (id: string, changes: Partial<Article>) => {
    try {
      await api.updateArticle(id, changes);
      await refresh();
    } catch (e) {
      Alert.alert("Modification impossible", messageOf(e));
    }
  };

  return (
    <ArticlesContext.Provider
      value={{
        articles,
        catalog,
        myArticles,
        shopOpen,
        loading,
        error,
        refresh,
        setShopOpen,
        addArticle,
        updateArticle,
      }}
    >
      {children}
    </ArticlesContext.Provider>
  );
}

export function useArticles() {
  const context = useContext(ArticlesContext);
  if (!context) throw new Error("useArticles doit être utilisé dans ArticlesProvider");
  return context;
}