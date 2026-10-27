import { API_URL } from "../config";
import type { Article } from "../data/articles";

export type OrderStatus = "pending" | "accepted" | "refused" | "expired";

export type Order = {
  id: string;
  shop: string;
  items: {
    article: { id: string; name: string; price: number };
    qty: number;
  }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  mode: "pickup" | "yango";
  status: OrderStatus;
  createdAt: number;
};

export type NewArticleInput = {
  name: string;
  price: number;
  category: string;
  negotiable: boolean;
  color?: string;
  localPhotoUri?: string;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (typeof options.body === "string")
    headers["Content-Type"] = "application/json";

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = "Une erreur est survenue.";
      try {
        const data = await response.json();
        if (typeof data.detail === "string") message = data.detail;
      } catch {
        // la réponse n'était pas du JSON : on garde le message par défaut
      }
      throw new ApiError(message, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Impossible de joindre le serveur. Vérifiez votre connexion.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Formes envoyées par l'API (noms en snake_case) ----------

type ArticleDto = {
  id: number;
  name: string;
  price: number;
  category: string;
  negotiable: boolean;
  hidden: boolean;
  out_of_stock: boolean;
  color: string;
  photo_url: string | null;
  shop: string;
  shop_phone: string;
  open: boolean;
  distance_m: number;
};

type OrderDto = {
  id: number;
  shop: string;
  mode: "pickup" | "yango";
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  created_at: number;
  items: { article_id: number; name: string; price: number; qty: number }[];
};

// ---------- Conversion vers les types utilisés par l'application ----------

function toArticle(d: ArticleDto): Article {
  return {
    id: String(d.id),
    name: d.name,
    price: d.price,
    shop: d.shop,
    shopPhone: d.shop_phone,
    distanceM: d.distance_m,
    category: d.category,
    open: d.open,
    color: d.color,
    negotiable: d.negotiable,
    hidden: d.hidden,
    outOfStock: d.out_of_stock,
    photoUri: d.photo_url ? `${API_URL}${d.photo_url}` : undefined,
  };
}

function toOrder(d: OrderDto): Order {
  return {
    id: String(d.id),
    shop: d.shop,
    mode: d.mode,
    subtotal: d.subtotal,
    deliveryFee: d.delivery_fee,
    total: d.total,
    status: d.status,
    createdAt: d.created_at,
    items: d.items.map((i) => ({
      article: { id: String(i.article_id), name: i.name, price: i.price },
      qty: i.qty,
    })),
  };
}

export const api = {
  getCatalog: async () =>
    (await request<ArticleDto[]>("/articles")).map(toArticle),
  getMyArticles: async () =>
    (await request<ArticleDto[]>("/shops/me/articles")).map(toArticle),
  getShop: () => request<{ is_open: boolean }>("/shops/me"),

  setShopOpen: (isOpen: boolean) =>
    request("/shops/me", {
      method: "PATCH",
      body: JSON.stringify({ is_open: isOpen }),
    }),

  createArticle: (
    data: Omit<NewArticleInput, "localPhotoUri"> & { photoUrl?: string },
  ) =>
    request<ArticleDto>("/articles", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        price: data.price,
        category: data.category,
        negotiable: data.negotiable,
        color: data.color ?? "#B9854A",
        photo_url: data.photoUrl ?? null,
      }),
    }),

  updateArticle: (id: string, changes: Partial<Article>) => {
    const body: Record<string, unknown> = {};
    if (changes.price !== undefined) body.price = changes.price;
    if (changes.negotiable !== undefined) body.negotiable = changes.negotiable;
    if (changes.hidden !== undefined) body.hidden = changes.hidden;
    if (changes.outOfStock !== undefined)
      body.out_of_stock = changes.outOfStock;
    return request<ArticleDto>(`/articles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  uploadPhoto: async (uri: string) => {
    const form = new FormData();
    form.append("file", {
      uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
    const result = await request<{ url: string }>("/uploads", {
      method: "POST",
      body: form,
    });
    return result.url;
  },

  createOrder: async (
    mode: "pickup" | "yango",
    items: { articleId: string; qty: number }[],
  ) =>
    toOrder(
      await request<OrderDto>("/orders", {
        method: "POST",
        body: JSON.stringify({
          mode,
          items: items.map((i) => ({
            article_id: Number(i.articleId),
            qty: i.qty,
          })),
        }),
      }),
    ),

  getOrder: async (id: string) =>
    toOrder(await request<OrderDto>(`/orders/${id}`)),
  getMyOrders: async () =>
    (await request<OrderDto[]>("/shops/me/orders")).map(toOrder),

  setOrderStatus: async (id: string, status: "accepted" | "refused") =>
    toOrder(
      await request<OrderDto>(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    ),

  suggestCategory: (title: string) =>
    request<{
      category: string | null;
      confidence: number | null;
      source: string;
    }>("/ai/category", { method: "POST", body: JSON.stringify({ title }) }),
};
