/**
 * src/store/AuthContext.tsx
 * -------------------------
 * Contexte global d'authentification et de gestion des profils (Client & Commerçant).
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Gestion bi-rôle exclusive : un utilisateur est soit un Client (achats, historique, profil),
 *   soit un Commerçant (gestion de boutique, articles, réceptions de commandes).
 * - Persistance locale : sauvegarde automatique de la session dans AsyncStorage (@lafi_customer / @lafi_merchant).
 * - Multi-boutique sécurisé : synchronisation de l'identifiant actif via setActiveShopId(shopId).
 * - Mise à jour de profil en direct : fonctions updateCustomer() et updateMerchant() garantissant
 *   la synchronisation simultanée de la base SQLite distante et de l'état local du mobile.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  api,
  CustomerUser,
  MerchantUser,
  setActiveShopId,
} from "../services/api";

export type { CustomerUser, MerchantUser } from "../services/api";

type AuthContextType = {
  customer: CustomerUser | null;
  merchant: MerchantUser | null;
  isLoading: boolean;
  loginCustomer: (
    credentials: { email?: string; password?: string; phone?: string } | string,
  ) => Promise<CustomerUser>;
  registerCustomer: (data: {
    name: string;
    phone: string;
    address: string;
    email?: string;
    password?: string;
  }) => Promise<CustomerUser>;
  updateCustomer: (data: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  }) => Promise<CustomerUser>;
  logoutCustomer: () => Promise<void>;
  loginMerchant: (
    credentials: { email?: string; password?: string; phone?: string } | string,
  ) => Promise<MerchantUser>;
  registerMerchant: (data: {
    ownerName: string;
    shopName: string;
    phone: string;
    address: string;
    email?: string;
    password?: string;
    lat?: number;
    lng?: number;
  }) => Promise<MerchantUser>;
  updateMerchant: (data: {
    shopName?: string;
    ownerName?: string;
    address?: string;
    phone?: string;
    email?: string;
    lat?: number;
    lng?: number;
  }) => Promise<MerchantUser>;
  logoutMerchant: () => Promise<void>;
  forgotPassword: (
    email: string,
    userType?: "customer" | "merchant",
  ) => Promise<{ status: string; message: string; email: string }>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string,
    userType?: "customer" | "merchant",
  ) => Promise<{ status: string; message: string }>;
  sendEmailVerificationCode: (
    email: string,
    name?: string,
  ) => Promise<{ status: string; message: string; email: string }>;
  verifyEmailCode: (
    email: string,
    code: string,
  ) => Promise<{ status: string; valid: boolean; message: string }>;
};

const STORAGE_KEY_CUSTOMER = "@lafi_customer";
const STORAGE_KEY_MERCHANT = "@lafi_merchant";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [merchant, setMerchant] = useState<MerchantUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les sessions sauvegardées au démarrage
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const [savedCustomer, savedMerchant] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_CUSTOMER),
          AsyncStorage.getItem(STORAGE_KEY_MERCHANT),
        ]);

        if (savedCustomer) {
          setCustomer(JSON.parse(savedCustomer));
        }
        if (savedMerchant) {
          const parsedMerchant: MerchantUser = JSON.parse(savedMerchant);
          setMerchant(parsedMerchant);
          setActiveShopId(parsedMerchant.shopId);
        }
      } catch {
        // En cas d'erreur de lecture AsyncStorage, on continue en invité
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const registerCustomer = useCallback(
    async (data: {
      name: string;
      phone: string;
      address: string;
      email?: string;
      password?: string;
    }) => {
      const user = await api.registerCustomer(data);
      setCustomer(user);
      setMerchant(null);
      setActiveShopId(null);
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_CUSTOMER, JSON.stringify(user)),
        AsyncStorage.removeItem(STORAGE_KEY_MERCHANT),
      ]);
      return user;
    },
    [],
  );

  const loginCustomer = useCallback(
    async (credentials: { email?: string; password?: string; phone?: string } | string) => {
      const user = await api.loginCustomer(credentials);
      setCustomer(user);
      setMerchant(null);
      setActiveShopId(null);
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_CUSTOMER, JSON.stringify(user)),
        AsyncStorage.removeItem(STORAGE_KEY_MERCHANT),
      ]);
      return user;
    },
    [],
  );

  const logoutCustomer = useCallback(async () => {
    setCustomer(null);
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_CUSTOMER),
      AsyncStorage.removeItem("@lafi_client_order_ids"),
    ]);
  }, []);

  const registerMerchant = useCallback(
    async (data: {
      ownerName: string;
      shopName: string;
      phone: string;
      address: string;
      email?: string;
      password?: string;
      lat?: number;
      lng?: number;
    }) => {
      const shopUser = await api.registerMerchant(data);
      setMerchant(shopUser);
      setCustomer(null);
      setActiveShopId(shopUser.shopId);
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_MERCHANT, JSON.stringify(shopUser)),
        AsyncStorage.removeItem(STORAGE_KEY_CUSTOMER),
      ]);
      return shopUser;
    },
    [],
  );

  const loginMerchant = useCallback(
    async (credentials: { email?: string; password?: string; phone?: string } | string) => {
      const shopUser = await api.loginMerchant(credentials);
      setMerchant(shopUser);
      setCustomer(null);
      setActiveShopId(shopUser.shopId);
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_MERCHANT, JSON.stringify(shopUser)),
        AsyncStorage.removeItem(STORAGE_KEY_CUSTOMER),
      ]);
      return shopUser;
    },
    [],
  );

  const logoutMerchant = useCallback(async () => {
    setMerchant(null);
    setActiveShopId(null);
    await AsyncStorage.removeItem(STORAGE_KEY_MERCHANT);
  }, []);

  const forgotPassword = useCallback(
    async (email: string, userType: "customer" | "merchant" = "customer") => {
      return await api.forgotPassword({ email, userType });
    },
    [],
  );

  const resetPassword = useCallback(
    async (
      email: string,
      code: string,
      newPassword: string,
      userType: "customer" | "merchant" = "customer",
    ) => {
      return await api.resetPassword({ email, code, newPassword, userType });
    },
    [],
  );

  const updateCustomer = useCallback(
    async (data: { name?: string; address?: string; phone?: string }) => {
      if (!customer?.id) throw new Error("Aucun client connecté.");
      const updated = await api.updateCustomer(customer.id, data);
      setCustomer(updated);
      await AsyncStorage.setItem(STORAGE_KEY_CUSTOMER, JSON.stringify(updated));
      return updated;
    },
    [customer?.id],
  );

  const updateMerchant = useCallback(
    async (data: {
      shopName?: string;
      ownerName?: string;
      address?: string;
      phone?: string;
      lat?: number;
      lng?: number;
    }) => {
      if (!merchant) throw new Error("Aucune boutique connectée.");
      const updatedShop = await api.updateShop({
        name: data.shopName,
        ownerName: data.ownerName,
        address: data.address,
        phone: data.phone,
        lat: data.lat,
        lng: data.lng,
      });
      const updatedMerchantUser: MerchantUser = {
        id: updatedShop.id,
        shopId: updatedShop.shopId,
        shopName: updatedShop.shopName,
        ownerName: updatedShop.ownerName,
        phone: updatedShop.phone,
        address: updatedShop.address,
        lat: updatedShop.lat,
        lng: updatedShop.lng,
      };
      setMerchant(updatedMerchantUser);
      await AsyncStorage.setItem(
        STORAGE_KEY_MERCHANT,
        JSON.stringify(updatedMerchantUser),
      );
      return updatedMerchantUser;
    },
    [merchant],
  );

  const sendEmailVerificationCode = useCallback(
    async (email: string, name?: string) => {
      return await api.sendEmailVerificationCode({ email, name });
    },
    [],
  );

  const verifyEmailCode = useCallback(
    async (email: string, code: string) => {
      return await api.verifyEmailCode({ email, code });
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        customer,
        merchant,
        isLoading,
        registerCustomer,
        loginCustomer,
        updateCustomer,
        logoutCustomer,
        registerMerchant,
        loginMerchant,
        updateMerchant,
        logoutMerchant,
        forgotPassword,
        resetPassword,
        sendEmailVerificationCode,
        verifyEmailCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}

