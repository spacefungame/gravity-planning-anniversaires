/**
 * Fichier de Configuration - Organisation Space Fun Games
 * Thème : Beige Chaleureux, Mode Clair & Sobre (Aucun Gris)
 */

const CONFIG = {
    // Nom officiel du site
    SITE_NAME: "Organisation Space Fun Games",

    // Mot de passe pour accéder au site (vous pouvez changer facilement ce texte ou le hash SHA-256 ci-dessous)
    RAW_PASSWORD: "1503",
    // Hachage SHA-256 précalculé pour 1503 (pour validation sécurisée en local)
    PASSWORD_HASH_SHA256: "45fcf3f6c8d76ffef5406dcc4a9bbf629ab1db42bb709774deff11c7ce2fc4ab",

    // Amplitude horaire par défaut pour le "planning classique"
    HOURS_START: 10, // 10h00
    HOURS_END: 23,   // 23h00
    HOURS_STEP: 60,  // Pas de 60 minutes par défaut (ou 30 min)

    // Définition des onglets / pages du site
    TABS: [
        { id: "home", label: "Accueil / Calendrier", icon: "📅" },
        { id: "complet", label: "Planning Complet", icon: "📋" },
        { id: "anniversaire", label: "Planning Anniversaire", icon: "🎂" },
        { id: "laser", label: "Planning Laser Game", icon: "🔫" },
        { id: "team", label: "Planning Team Game", icon: "🤝" },
        { id: "quiz", label: "Planning Quiz Game", icon: "🧠" },
        { id: "postit", label: "Post It", icon: "📌" }
    ],

    // Types d'activités avec palette de couleurs chaudes (Beige, Chocolat, Terracotta, Ambre, Saphir, Émeraude) - STRICTEMENT SANS GRIS
    ACTIVITIES: {
        anniversaire: {
            label: "Anniversaire",
            colorBg: "#FDF0D5",
            colorBorder: "#D4A373",
            colorText: "#5E3A1C"
        },
        laser: {
            label: "Laser Game",
            colorBg: "#FCE8E6",
            colorBorder: "#D9534F",
            colorText: "#6A1E1A"
        },
        team: {
            label: "Team Game",
            colorBg: "#E8F4F8",
            colorBorder: "#3182CE",
            colorText: "#1A4971"
        },
        quiz: {
            label: "Quiz Game",
            colorBg: "#F3E8FF",
            colorBorder: "#805AD5",
            colorText: "#442A75"
        },
        autre: {
            label: "Divers / Maintenance",
            colorBg: "#F0EBE3",
            colorBorder: "#A89F91",
            colorText: "#3D362D"
        }
    },

    // Configuration des tables pour l'attribution automatique (Planning Anniversaire)
    TABLES: [
        { id: "STG+", capacity: 22, priority: 1, zone: "STG" },
        { id: "STG-", capacity: 17, priority: 1, zone: "STG" },
        { id: "R1", capacity: 10, priority: 2, zone: "R" },
        { id: "R2", capacity: 10, priority: 2, zone: "R" },
        { id: "R4", capacity: 14, priority: 2, zone: "R" },
        { id: "R3", capacity: 6, priority: 2, zone: "R" },
        { id: "T1", capacity: 17, priority: 3, zone: "T" },
        { id: "T2", capacity: 12, priority: 3, zone: "T" },
        { id: "T3", capacity: 12, priority: 3, zone: "T" },
        { id: "T4", capacity: 12, priority: 3, zone: "T" },
        { id: "T5", capacity: 8, priority: 3, zone: "T" },
        { id: "T6", capacity: 8, priority: 3, zone: "T" }
    ],

    // Données de démonstration réalistes pour que le planning ne soit pas vide au premier lancement
    DEMO_DATA: {
        "2026-07-10": [
            { id: 1, type: "anniversaire", title: "Anniversaire Lucas (10 ans) - Formule VIP", startHour: "14:00", endHour: "16:30", court: "Salle 1", notes: "Gâteau chocolat + 12 enfants" },
            { id: 2, type: "laser", title: "Session Laser Game - Groupe Entreprise Alpha", startHour: "18:00", endHour: "20:00", court: "Arène Laser", notes: "20 joueurs" },
            { id: 3, type: "quiz", title: "Quiz Tournoi - Famille Martin", startHour: "15:00", endHour: "16:00", court: "Plateau Quiz A", notes: "8 joueurs" }
        ],
    },

    // ----------------------------------------------------------------------
    // GESTION CENTRALISÉE DES TOKENS ET API (EXTRAITE SELON RECOMMANDATION)
    // ----------------------------------------------------------------------
    // Clé API Qweekle (Format Laravel Sanctum : ID|TOKEN)
    QWEEKLE_API_TOKEN: "1504|dLt4sg4TJItm7U3UBXQOELOSjFtCUYqjKl13q6dm0780e9ce",
    // URL de base de l'API Qweekle (susceptible de changer lors de leur MAJ)
    QWEEKLE_API_BASE_URL: "https://api.qweekle.io/api",
    
    // Fonction utilitaire pour générer les en-têtes d'authentification Qweekle
    getQweekleHeaders: function() {
        return {
            "Authorization": "Bearer " + this.QWEEKLE_API_TOKEN,
            "Accept": "application/json"
        };
    },

    // Base de Données Live Supabase (Webhooks fallback)
    SUPABASE_URL: "https://uyptbypqzfkdsvpdvwyz.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cHRieXBxemZrZHN2cGR2d3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTA1ODAsImV4cCI6MjA5NTcyNjU4MH0.ZEZxlWA9H0u6iP3IHn97XjqNABUEl3kqVcsecx9GPKg",

    // Données de réservations Qweekle (vides par défaut en production pour privilégier le flux live Supabase)
    QWEEKLE_RESERVATIONS_DATA: {}
};

if (typeof module !== "undefined") {
    module.exports = CONFIG;
}
