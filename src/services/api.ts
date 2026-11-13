/**
 * src/services/api.ts
 * -------------------
 * Point unique d'accès réseau vers l'API backend FastAPI de Lafi.
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Abstraction réseau : aucun appel fetch n'est disséminé dans les composants graphiques.
 * - Conversion de conventions : transforme le snake_case (Python / SQLite) en camelCase (TypeScript).
 * - Multi-boutique : injection automatique de l'en-tête HTTP 'X-Shop-Id' pour cloisonner les commerçants.
 * - Gestion multipart sécurisée : envoi de photos via l'objet File standard d'expo-file-system.
 * - Typage strict : conversion systématique des réponses JSON en types vérifiés (Article, Order, etc.).
 */

import { File } from "expo-file-system";
import { API_URL } from "../config";
import type { Article } from "../data/articles";

export type OrderStatus = "pending" | "accepted" | "refused" | "completed" | "expired" | "cancelled";

export type CustomerUser = {
  id: number;
  name: string;
  phone: string;
  address: string;
  email?: string | null;
  createdAt?: number;
};

export type MerchantUser = {
  id: number;
  shopId: number;
  shopName: string;
  ownerName: string;
  phone: string;
  email?: string | null;
  address?: string;
  lat?: number;
  lng?: number;
};

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
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  pickupCode?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  driverDispatched?: boolean;
  packageHandedOver?: boolean;
  shopLat?: number | null;
  shopLng?: number | null;
  shopAddress?: string | null;
  shopPhone?: string | null;
};

export type NewArticleInput = {
  name: string;
  price: number;
  category: string;
  description?: string;
  negotiable: boolean;
  color?: string;
  localPhotoUri?: string;
  localPhotoUris?: string[];
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Multi-boutique : identifiant de la boutique active pour les requêtes commerçant
let activeShopId: number | null = null;

export function setActiveShopId(shopId: number | null) {
  activeShopId = shopId;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (typeof options.body === "string")
    headers["Content-Type"] = "application/json";

  if (activeShopId !== null) {
    headers["X-Shop-Id"] = String(activeShopId);
  }

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
    const reason =
      error instanceof Error
        ? `${error.name} : ${error.message}`
        : String(error);
    throw new ApiError(
      `Impossible de joindre le serveur (${API_URL}${path}). Détail : ${reason}`,
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
  description?: string | null;
  negotiable: boolean;
  hidden: boolean;
  out_of_stock: boolean;
  color: string;
  photo_url: string | null;
  photos?: string[];
  shop: string;
  shop_phone: string;
  open: boolean;
  distance_m: number;
  shop_lat?: number | null;
  shop_lng?: number | null;
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
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  pickup_code?: string | null;
  customer_lat?: number | null;
  customer_lng?: number | null;
  driver_dispatched?: boolean | null;
  package_handed_over?: boolean | null;
  shop_lat?: number | null;
  shop_lng?: number | null;
  shop_address?: string | null;
  shop_phone?: string | null;
  items: { article_id: number; name: string; price: number; qty: number }[];
};

type ShopDto = {
  id: number;
  name: string;
  phone: string;
  owner_name?: string | null;
  address?: string | null;
  email?: string | null;
  is_open: boolean;
  lat: number;
  lng: number;
};

// ---------- Conversion vers les types utilisés par l'application ----------

function toArticle(d: ArticleDto): Article {
  const photoList =
    d.photos && d.photos.length > 0
      ? d.photos.map((p) => (p.startsWith("http") ? p : `${API_URL}${p}`))
      : d.photo_url
        ? [`${API_URL}${d.photo_url}`]
        : [];

  return {
    id: String(d.id),
    name: d.name,
    price: d.price,
    shop: d.shop,
    shopPhone: d.shop_phone,
    distanceM: d.distance_m,
    category: d.category,
    description: d.description ?? undefined,
    open: d.open,
    color: d.color,
    negotiable: d.negotiable,
    hidden: d.hidden,
    outOfStock: d.out_of_stock,
    photoUri: photoList[0] ?? (d.photo_url ? `${API_URL}${d.photo_url}` : undefined),
    photos: photoList,
    shopLat: d.shop_lat ?? undefined,
    shopLng: d.shop_lng ?? undefined,
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
    customerId: d.customer_id ?? null,
    customerName: d.customer_name ?? null,
    customerPhone: d.customer_phone ?? null,
    customerAddress: d.customer_address ?? null,
    pickupCode: d.pickup_code ?? null,
    customerLat: d.customer_lat ?? null,
    customerLng: d.customer_lng ?? null,
    driverDispatched: Boolean(d.driver_dispatched),
    packageHandedOver: Boolean(d.package_handed_over),
    shopLat: d.shop_lat ?? null,
    shopLng: d.shop_lng ?? null,
    shopAddress: d.shop_address ?? null,
    shopPhone: d.shop_phone ?? null,
    items: d.items.map((i) => ({
      article: { id: String(i.article_id), name: i.name, price: i.price },
      qty: i.qty,
    })),
  };
}

export const api = {
  getCatalog: async () =>
    (await request<ArticleDto[]>("/articles")).map(toArticle),
  getShops: () => request<ShopDto[]>("/shops"),
  getMyArticles: async () =>
    (await request<ArticleDto[]>("/shops/me/articles")).map(toArticle),
  getShop: () => request<ShopDto>("/shops/me"),

  setShopOpen: (isOpen: boolean) =>
    request("/shops/me", {
      method: "PATCH",
      body: JSON.stringify({ is_open: isOpen }),
    }),

  updateShop: async (data: {
    isOpen?: boolean;
    name?: string;
    ownerName?: string;
    phone?: string;
    address?: string;
    email?: string;
    lat?: number;
    lng?: number;
  }) => {
    const body: Record<string, unknown> = {};
    if (data.isOpen !== undefined) body.is_open = data.isOpen;
    if (data.name !== undefined) body.name = data.name;
    if (data.ownerName !== undefined) body.owner_name = data.ownerName;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.address !== undefined) body.address = data.address;
    if (data.email !== undefined) body.email = data.email;
    if (data.lat !== undefined) body.lat = data.lat;
    if (data.lng !== undefined) body.lng = data.lng;

    const res = await request<ShopDto>("/shops/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return {
      id: res.id,
      shopId: res.id,
      shopName: res.name,
      ownerName: res.owner_name || "",
      phone: res.phone,
      email: res.email,
      address: res.address || undefined,
      lat: res.lat,
      lng: res.lng,
      isOpen: res.is_open,
    };
  },

  createArticle: (
    data: Omit<NewArticleInput, "localPhotoUri" | "localPhotoUris"> & {
      photoUrl?: string;
      photos?: string[];
    },
  ) =>
    request<ArticleDto>("/articles", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        price: data.price,
        category: data.category,
        description: data.description ?? null,
        negotiable: data.negotiable,
        color: data.color ?? "#B9854A",
        photo_url: data.photoUrl ?? (data.photos?.[0] ?? null),
        photos: data.photos ?? (data.photoUrl ? [data.photoUrl] : []),
      }),
    }),

  updateArticle: (id: string, changes: Partial<Article>) => {
    const body: Record<string, unknown> = {};
    if (changes.price !== undefined) body.price = changes.price;
    if (changes.description !== undefined) body.description = changes.description;
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
    form.append("file", new File(uri));
    const result = await request<{ url: string }>("/uploads", {
      method: "POST",
      body: form,
    });
    return result.url;
  },

  createOrder: async (
    mode: "pickup" | "yango",
    items: { articleId: string; qty: number }[],
    customer?: { id?: number; name?: string; phone?: string; address?: string },
    coords?: { latitude: number; longitude: number } | null,
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
          customer_id: customer?.id ?? null,
          customer_name: customer?.name ?? null,
          customer_phone: customer?.phone ?? null,
          customer_address: customer?.address ?? null,
          customer_lat: coords?.latitude ?? null,
          customer_lng: coords?.longitude ?? null,
        }),
      }),
    ),

  getOrder: async (id: string) =>
    toOrder(await request<OrderDto>(`/orders/${id}`)),
  getMyOrders: async () =>
    (await request<OrderDto[]>("/shops/me/orders")).map(toOrder),

  setOrderStatus: async (
    id: string,
    status: "accepted" | "refused" | "completed" | "cancelled",
  ) =>
    toOrder(
      await request<OrderDto>(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    ),

  cancelOrder: async (id: string) =>
    toOrder(
      await request<OrderDto>(`/orders/${id}/cancel`, {
        method: "POST",
      }),
    ),

  validatePickupCode: async (id: string, code: string) =>
    toOrder(
      await request<OrderDto>(`/orders/${id}/validate-pickup`, {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    ),

  dispatchDriver: async (id: string) =>
    toOrder(
      await request<OrderDto>(`/orders/${id}/dispatch-driver`, {
        method: "POST",
      }),
    ),

  handoverPackage: async (id: string) =>
    toOrder(
      await request<OrderDto>(`/orders/${id}/handover-package`, {
        method: "POST",
      }),
    ),

  suggestCategory: (title: string) =>
    request<{
      category: string | null;
      sous_categorie: string | null;
      accepte: boolean;
      source: string;
    }>("/ai/category", { method: "POST", body: JSON.stringify({ title }) }),

  suggestCategoryFromImage: async (uri: string) => {
    const form = new FormData();
    form.append("file", new File(uri));
    return request<{
      category: string | null;
      classe_image: string | null;
      confiance: number;
      accepte: boolean;
      propositions: {
        classe_image: string;
        category: string | null;
        probabilite: number;
      }[];
      source: string;
    }>("/ai/category-image", {
      method: "POST",
      body: form,
    });
  },

  improvePhoto: async (uri: string) => {
    const form = new FormData();
    form.append("file", new File(uri));
    const res = await request<{
      url: string;
      source: string;
      accepte: boolean;
    }>("/ai/improve-image", {
      method: "POST",
      body: form,
    });
    return {
      url: res.url,
      fullUri: `${API_URL}${res.url}`,
      source: res.source,
    };
  },

  generateDescription: async (data: {
    title: string;
    category?: string;
    price?: number;
    negotiable?: boolean;
  }) => {
    return request<{
      description: string;
      source: string;
      accepte: boolean;
    }>("/ai/generate-description", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  askAssistant: async (
    message: string,
    history: { role: "user" | "assistant"; content: string }[] = [],
  ) => {
    const data = await request<{
      reply: string;
      recommended_articles: ArticleDto[];
      intent: string;
      source: string;
      accepte: boolean;
    }>("/ai/assistant", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
    return {
      reply: data.reply,
      recommendedArticles: data.recommended_articles.map(toArticle),
      intent: data.intent,
      source: data.source,
    };
  },

  askAssistantWithImage: async (uri: string) => {
    const form = new FormData();
    form.append("file", new File(uri));
    const data = await request<{
      reply: string;
      recommended_articles: ArticleDto[];
      intent: string;
      source: string;
      accepte: boolean;
    }>("/ai/assistant-image", {
      method: "POST",
      body: form,
    });
    return {
      reply: data.reply,
      recommendedArticles: data.recommended_articles.map(toArticle),
      intent: data.intent,
      source: data.source,
    };
  },

  // ---------- Authentification & Gestion Comptes ----------

  registerCustomer: async (data: {
    name: string;
    phone: string;
    address: string;
    email?: string;
    password?: string;
  }): Promise<CustomerUser> => {
    return await request<CustomerUser>("/auth/customer/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateCustomer: async (
    customerId: number,
    data: { name?: string; address?: string; phone?: string; email?: string },
  ): Promise<CustomerUser> => {
    return await request<CustomerUser>(`/auth/customer/${customerId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  loginCustomer: async (
    credentials: { email?: string; password?: string; phone?: string } | string,
  ): Promise<CustomerUser> => {
    const body = typeof credentials === "string" ? { phone: credentials } : credentials;
    return await request<CustomerUser>("/auth/customer/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  registerMerchant: async (data: {
    ownerName: string;
    shopName: string;
    phone: string;
    address: string;
    email?: string;
    password?: string;
    lat?: number;
    lng?: number;
  }): Promise<MerchantUser> => {
    const res = await request<ShopDto>("/auth/merchant/register", {
      method: "POST",
      body: JSON.stringify({
        owner_name: data.ownerName,
        shop_name: data.shopName,
        phone: data.phone,
        address: data.address,
        email: data.email,
        password: data.password,
        lat: data.lat,
        lng: data.lng,
      }),
    });
    return {
      id: res.id,
      shopId: res.id,
      shopName: res.name,
      ownerName: res.owner_name || data.ownerName,
      phone: res.phone,
      email: res.email || data.email,
      address: res.address || data.address,
      lat: res.lat,
      lng: res.lng,
    };
  },

  loginMerchant: async (
    credentials: { email?: string; password?: string; phone?: string } | string,
  ): Promise<MerchantUser> => {
    const body = typeof credentials === "string" ? { phone: credentials } : credentials;
    const res = await request<ShopDto>("/auth/merchant/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      id: res.id,
      shopId: res.id,
      shopName: res.name,
      ownerName: res.owner_name || "Gérant",
      phone: res.phone,
      email: res.email,
      address: res.address || undefined,
      lat: res.lat,
      lng: res.lng,
    };
  },

  forgotPassword: async (data: {
    email: string;
    userType?: "customer" | "merchant";
  }): Promise<{ status: string; message: string; email: string }> => {
    return await request<{ status: string; message: string; email: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        user_type: data.userType || "customer",
      }),
    });
  },

  resetPassword: async (data: {
    email: string;
    code: string;
    newPassword: string;
    userType?: "customer" | "merchant";
  }): Promise<{ status: string; message: string }> => {
    return await request<{ status: string; message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        code: data.code,
        new_password: data.newPassword,
        user_type: data.userType || "customer",
      }),
    });
  },

  sendEmailVerificationCode: async (data: {
    email: string;
    name?: string;
  }): Promise<{ status: string; message: string; email: string }> => {
    return await request<{ status: string; message: string; email: string }>("/auth/email/send-code", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        name: data.name,
      }),
    });
  },

  verifyEmailCode: async (data: {
    email: string;
    code: string;
  }): Promise<{ status: string; valid: boolean; message: string }> => {
    return await request<{ status: string; valid: boolean; message: string }>("/auth/email/verify-code", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        code: data.code,
      }),
    });
  },

  getCustomerOrders: async (customerId: number): Promise<Order[]> => {
    return (await request<OrderDto[]>(`/customers/${customerId}/orders`)).map(toOrder);
  },

  // ---------- Vérification SMS OTP (Twilio Verify) ----------

  sendOtp: async (phone: string): Promise<{ status: string; to: string; test_mode?: boolean }> => {
    return await request<{ status: string; to: string; test_mode?: boolean }>("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  verifyOtp: async (phone: string, code: string): Promise<boolean> => {
    const res = await request<{ status: string; valid: boolean }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
    return res.valid;
  },
};
