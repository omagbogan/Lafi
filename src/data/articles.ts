export type Article = {
  id: string;
  name: string;
  price: number;
  shop: string;
  distanceM: number;
  category: string;
  open: boolean;
  color: string;
  negotiable?: boolean;
  photoUri?: string;
  shopPhone?: string;
  hidden?: boolean;
  outOfStock?: boolean;
};

export const categories = [
  "Tout",
  "Alimentation",
  "Mode",
  "Beauté",
  "Électronique",
];

export const MY_SHOP = "Chez Aïcha";

export const articles: Article[] = [
  {
    id: "1",
    name: "Sac à main en cuir",
    price: 15000,
    shop: "Chez Aïcha",
    distanceM: 350,
    category: "Mode",
    open: true,
    color: "#B9854A",
  },
  {
    id: "2",
    name: "Attiéké poisson",
    price: 2500,
    shop: "Maman Awa",
    distanceM: 600,
    category: "Alimentation",
    open: true,
    color: "#E0A93B",
  },
  {
    id: "3",
    name: "Beurre de karité",
    price: 3000,
    shop: "Beauté Naturelle",
    distanceM: 800,
    category: "Beauté",
    open: true,
    color: "#C9B28A",
  },
  {
    id: "4",
    name: "Écouteurs sans fil",
    price: 9500,
    shop: "Tech Plateau",
    distanceM: 950,
    category: "Électronique",
    open: true,
    color: "#4A4A4A",
  },
  {
    id: "5",
    name: "Robe wax",
    price: 12500,
    shop: "Chez Aïcha",
    distanceM: 350,
    category: "Mode",
    open: true,
    color: "#D9663F",
  },
  {
    id: "6",
    name: "Sandales en cuir",
    price: 8000,
    shop: "Boutique Karim",
    distanceM: 1400,
    category: "Mode",
    open: true,
    color: "#7A5C3E",
  },
];

// Numéros fictifs : remplacez-en un par le vôtre pour tester WhatsApp (format international, sans +)
export const SHOP_PHONES: Record<string, string> = {
  "Chez Aïcha": "2250700000001",
  "Maman Awa": "2250700000002",
  "Beauté Naturelle": "2250700000003",
  "Tech Plateau": "2250700000004",
  "Boutique Karim": "2250700000005",
};

export const DELIVERY_FEE = 1500;
