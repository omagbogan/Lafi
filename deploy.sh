#!/bin/bash
# ==============================================================================
# Script de déploiement automatique Lafi pour VPS Ubuntu / Debian
# Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Industrialisation)
# ==============================================================================

set -e

echo "🚀 [1/4] Mise à jour des paquets système..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

echo "🐳 [2/4] Installation de Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

echo "🛡️ [3/4] Configuration du pare-feu UFW..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "📦 [4/4] Démarrage des conteneurs Lafi..."
docker compose up -d --build

echo ""
echo "======================================================================"
echo "✅ Déploiement terminé avec succès !"
echo "🌐 Application Web : http://$(curl -s ifconfig.me)"
echo "📱 Téléchargement APK : http://$(curl -s ifconfig.me)/lafi.apk"
echo "📚 Documentation API : http://$(curl -s ifconfig.me)/docs"
echo "======================================================================"

