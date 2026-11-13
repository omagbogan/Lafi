# Étape 1 : Construction de l'export Web Expo
FROM node:20-alpine AS builder

WORKDIR /app

# Installation des dépendances avec versions exactes
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copie des sources et export statique
COPY . .
RUN npx expo export -p web

# Étape 2 : Serveur Nginx Alpine ultra-léger (< 25 Mo)
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Emplacement pour l'APK Android téléchargeable
RUN touch /usr/share/nginx/html/lafi.apk

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

