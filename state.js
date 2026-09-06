/**
 * Gestionnaire d'État (AppStateManager) - Organisation Space Fun Games
 * Gère la date active sélectionnée, la synchronisation entre les vues,
 * et la persistance des données dans le stockage local.
 */

class AppStateManager {
  constructor() {
    // Date active sélectionnée (par défaut aujourd'hui ou la date courante)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    this.currentDate = `${yyyy}-${mm}-${dd}`;

    // État d'authentification
    this.isAuthenticated = this.hasSessionStorage()
      ? sessionStorage.getItem("auth_token_sfg") === "authenticated"
      : false;

    // Écouteurs d'événements pour les changements de date
    this.dateChangeListeners = [];
    this.authChangeListeners = [];

    // Initialisation de la base de données locale (si vide, on charge les données de démonstration)
    this.initStore();
  }

  hasLocalStorage() {
    return (
      typeof localStorage !== "undefined" &&
      typeof localStorage.getItem === "function"
    );
  }

  hasSessionStorage() {
    return (
      typeof sessionStorage !== "undefined" &&
      typeof sessionStorage.getItem === "function"
    );
  }

  initStore() {
    if (!this.hasLocalStorage()) return;
    if (!localStorage.getItem("SFG_EVENTS_STORE")) {
      localStorage.setItem(
        "SFG_EVENTS_STORE",
        JSON.stringify(typeof CONFIG !== "undefined" ? CONFIG.DEMO_DATA : {}),
      );
    }
    if (!localStorage.getItem("SFG_POSTITS_STORE")) {
      const initialPostIts = {
        general: [
          {
            id: 1,
            title: "Note d'équipe",
            content:
              "Penser à vérifier les batteries des pistolets Laser Game avant le week-end.",
            color: "#FDF0D5",
          },
          {
            id: 2,
            title: "Livraison boissons",
            content:
              "Réception de la commande sodas & jus prévue mardi après-midi.",
            color: "#E8F4F8",
          },
        ],
        "2026-07-10": [
          {
            id: 3,
            title: "Consigne Salle 1",
            content:
              "Préparer la table VIP pour l'anniversaire de Lucas à 13h30.",
            color: "#FCE8E6",
          },
        ],
      };
      localStorage.setItem("SFG_POSTITS_STORE", JSON.stringify(initialPostIts));
    }
  }

  // Gestion de la date active
  setDate(newDateStr) {
    if (this.currentDate !== newDateStr) {
      this.currentDate = newDateStr;
      this.notifyDateChange();
    }
  }

  getDate() {
    return this.currentDate;
  }

  onDateChange(callback) {
    this.dateChangeListeners.push(callback);
  }

  notifyDateChange() {
    this.dateChangeListeners.forEach((cb) => cb(this.currentDate));
  }

  // Gestion de l'authentification
  setAuthenticated(status) {
    this.isAuthenticated = status;
    if (this.hasSessionStorage()) {
      if (status) {
        sessionStorage.setItem("auth_token_sfg", "authenticated");
      } else {
        sessionStorage.removeItem("auth_token_sfg");
      }
    }
    this.notifyAuthChange();
  }

  onAuthChange(callback) {
    this.authChangeListeners.push(callback);
  }

  notifyAuthChange() {
    this.authChangeListeners.forEach((cb) => cb(this.isAuthenticated));
  }

  // Accès et modification des événements de planning
  getEventsForDate(dateStr, filterType = null) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_EVENTS_STORE") || "{}")
      : {};
    const events = store[dateStr] || [];
    if (filterType) {
      return events.filter((ev) => ev.type === filterType);
    }
    return events.sort((a, b) => a.startHour.localeCompare(b.startHour));
  }

  addEvent(dateStr, eventObj) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_EVENTS_STORE") || "{}")
      : {};
    if (!store[dateStr]) {
      store[dateStr] = [];
    }
    // Attribuer un ID unique
    eventObj.id = Date.now();
    store[dateStr].push(eventObj);
    if (this.hasLocalStorage())
      localStorage.setItem("SFG_EVENTS_STORE", JSON.stringify(store));
    this.notifyDateChange(); // Rafraîchir les vues
    return eventObj;
  }

  deleteEvent(dateStr, eventId) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_EVENTS_STORE") || "{}")
      : {};
    if (store[dateStr]) {
      store[dateStr] = store[dateStr].filter((ev) => ev.id !== eventId);
      if (this.hasLocalStorage())
        localStorage.setItem("SFG_EVENTS_STORE", JSON.stringify(store));
      this.notifyDateChange();
    }
  }

  // Accès et modification des Post-Its
  getPostIts(scope = "general") {
    // scope peut être "general" ou une date YYYY-MM-DD
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_POSTITS_STORE") || "{}")
      : {};
    return store[scope] || [];
  }

  addPostIt(scope, postItObj) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_POSTITS_STORE") || "{}")
      : {};
    if (!store[scope]) {
      store[scope] = [];
    }
    postItObj.id = Date.now();
    store[scope].push(postItObj);
    if (this.hasLocalStorage())
      localStorage.setItem("SFG_POSTITS_STORE", JSON.stringify(store));
    this.notifyDateChange();
    return postItObj;
  }

  deletePostIt(scope, postItId) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_POSTITS_STORE") || "{}")
      : {};
    if (store[scope]) {
      store[scope] = store[scope].filter((p) => p.id !== postItId);
      if (this.hasLocalStorage())
        localStorage.setItem("SFG_POSTITS_STORE", JSON.stringify(store));
      this.notifyDateChange();
    }
  }

  // =========================================================================
  // GESTION DES ENFANTS FÊTÉS MANUELS QWEEKLE
  // =========================================================================
  getQweekleCustomEnfants(bookingId) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_QWEEKLE_ENFANTS_STORE") || "{}")
      : {};
    return store[bookingId] || {};
  }

  async pushCustomOverrideToSupabase(bookingId) {
    if (
      typeof CONFIG === "undefined" ||
      !CONFIG.SUPABASE_URL ||
      !CONFIG.SUPABASE_KEY
    )
      return;

    const note = this.getQweekleCustomNote(bookingId);
    const enfants = this.getQweekleCustomEnfants(bookingId);
    const table = this.getQweekleCustomTable(bookingId);

    const payload = {
      qweekle_booking_id: `NOTE_${bookingId}`,
      order_id: "CUSTOM_NOTE",
      start_at: `${this.currentDate}T00:00:00+00:00`,
      raw_payload: {
        customNote: note,
        customEnfants: enfants,
        customTable: table,
      },
    };

    try {
      await fetch(
        CONFIG.SUPABASE_URL +
          "/rest/v1/booking_activities?on_conflict=qweekle_booking_id",
        {
          method: "POST",
          headers: {
            apikey: CONFIG.SUPABASE_KEY,
            Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(payload),
        },
      );
    } catch (e) {
      console.warn("Erreur push custom override", e);
    }
  }

  // =========================================================================
  // GESTION DES TABLES PERSONNALISÉES
  // =========================================================================
  getCustomTables() {
    if (this.hasLocalStorage()) {
      const stored = localStorage.getItem("SFG_CUSTOM_TABLES");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch(e) {}
      }
    }
    return null;
  }

  saveCustomTables(tables) {
    if (this.hasLocalStorage()) {
      localStorage.setItem("SFG_CUSTOM_TABLES", JSON.stringify(tables));
    }
    this.pushCustomTablesToSupabase(tables);
  }

  async pushCustomTablesToSupabase(tables) {
    if (typeof CONFIG === "undefined" || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) return;

    const payload = {
      qweekle_booking_id: `GLOBAL_CONFIG_TABLES`,
      order_id: "CUSTOM_CONFIG",
      start_at: `2099-12-31T00:00:00+00:00`,
      raw_payload: { tables: tables }
    };

    try {
      await fetch(
        CONFIG.SUPABASE_URL + "/rest/v1/booking_activities?on_conflict=qweekle_booking_id",
        {
          method: "POST",
          headers: {
            apikey: CONFIG.SUPABASE_KEY,
            Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(payload),
        }
      );
    } catch (e) {
      console.warn("Erreur push custom tables", e);
    }
  }

  async syncCustomTablesFromSupabase() {
    if (typeof CONFIG === "undefined" || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) return;

    try {
      const url = `${CONFIG.SUPABASE_URL}/rest/v1/booking_activities?select=raw_payload&qweekle_booking_id=eq.GLOBAL_CONFIG_TABLES`;
      const res = await fetch(url, {
        headers: {
          apikey: CONFIG.SUPABASE_KEY,
          Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
        },
      });
      const data = await res.json();
      if (data && data.length > 0 && data[0].raw_payload && data[0].raw_payload.tables) {
        if (this.hasLocalStorage()) {
          localStorage.setItem("SFG_CUSTOM_TABLES", JSON.stringify(data[0].raw_payload.tables));
        }
      }
    } catch (e) {
      console.warn("Erreur sync custom tables", e);
    }
  }

  // =========================================================================
  // GESTION DES NOTES MANUELLES PARTAGEES (EN LIGNE)
  // =========================================================================
  getAppNotes(type, dateStr = null) {
    const key = type === 'general' ? 'SFG_APP_NOTES_GENERAL' : `SFG_APP_NOTES_DATE_${dateStr}`;
    if (this.hasLocalStorage()) {
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
    return [];
  }

  saveAppNotes(type, dateStr, notesArray) {
    const key = type === 'general' ? 'SFG_APP_NOTES_GENERAL' : `SFG_APP_NOTES_DATE_${dateStr}`;
    if (this.hasLocalStorage()) {
      localStorage.setItem(key, JSON.stringify(notesArray));
    }
    this.pushAppNotesToSupabase(type, dateStr, notesArray);
  }

  async pushAppNotesToSupabase(type, dateStr, notesArray) {
    if (typeof CONFIG === "undefined" || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) return;
    const qid = type === 'general' ? 'APP_NOTE_GENERAL' : `APP_NOTE_DATE_${dateStr}`;
    const payload = {
      qweekle_booking_id: qid,
      order_id: "CUSTOM_NOTE",
      start_at: `2099-12-31T00:00:00+00:00`,
      raw_payload: { notes: notesArray }
    };
    try {
      await fetch(CONFIG.SUPABASE_URL + "/rest/v1/booking_activities?on_conflict=qweekle_booking_id", {
        method: "POST",
        headers: {
          apikey: CONFIG.SUPABASE_KEY,
          Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) { console.warn("Erreur push notes", e); }
  }

  async syncAppNotesFromSupabase(type, dateStr = null) {
    if (typeof CONFIG === "undefined" || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) return;
    const qid = type === 'general' ? 'APP_NOTE_GENERAL' : `APP_NOTE_DATE_${dateStr}`;
    try {
      const url = `${CONFIG.SUPABASE_URL}/rest/v1/booking_activities?select=raw_payload&qweekle_booking_id=eq.${qid}`;
      const res = await fetch(url, { headers: { apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_KEY}` } });
      const data = await res.json();
      if (data && data.length > 0 && data[0].raw_payload && data[0].raw_payload.notes) {
        const key = type === 'general' ? 'SFG_APP_NOTES_GENERAL' : `SFG_APP_NOTES_DATE_${dateStr}`;
        if (this.hasLocalStorage()) {
          localStorage.setItem(key, JSON.stringify(data[0].raw_payload.notes));
        }
      }
    } catch (e) { console.warn("Erreur sync notes", e); }
  }

  async hideQweekleBooking(bookingId) {
    if (!confirm("Voulez-vous vraiment masquer cette réservation fantôme ? (Utile quand une annulation n'a pas été synchronisée par Qweekle). Elle disparaîtra de l'écran pour tout le monde.")) return;
    
    // Save in local storage
    if (this.hasLocalStorage()) {
      const store = JSON.parse(localStorage.getItem("SFG_QWEEKLE_HIDDEN_STORE") || "{}");
      store[bookingId] = true;
      localStorage.setItem("SFG_QWEEKLE_HIDDEN_STORE", JSON.stringify(store));
    }
    
    // Save in Supabase
    const payload = {
      qweekle_booking_id: `NOTE_${bookingId}`,
      order_id: "CUSTOM_NOTE",
      start_at: `${this.currentDate}T00:00:00+00:00`,
      raw_payload: {
        hidden: true,
      },
    };
    try {
      await fetch(
        CONFIG.SUPABASE_URL + "/rest/v1/booking_activities?on_conflict=qweekle_booking_id",
        {
          method: "POST",
          headers: {
            apikey: CONFIG.SUPABASE_KEY,
            Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(payload),
        },
      );
    } catch (e) {
      console.warn("Erreur push custom hide", e);
    }

    if (typeof window !== "undefined") {
      const btn = document.getElementById("btn-sync-qweekle");
      if (btn) btn.click();
    }
  }

  saveQweekleCustomEnfant(bookingId, index, key, value) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_QWEEKLE_ENFANTS_STORE") || "{}")
      : {};
    if (!store[bookingId]) store[bookingId] = {};
    if (!store[bookingId][index]) store[bookingId][index] = {};

    if (value && value.trim() !== "") {
      store[bookingId][index][key] = value.trim();
    } else {
      delete store[bookingId][index][key];
    }

    if (Object.keys(store[bookingId][index]).length === 0)
      delete store[bookingId][index];
    if (Object.keys(store[bookingId]).length === 0) delete store[bookingId];

    if (this.hasLocalStorage()) {
      localStorage.setItem("SFG_QWEEKLE_ENFANTS_STORE", JSON.stringify(store));
    }

    // Synchroniser avec Supabase
    this.pushCustomOverrideToSupabase(bookingId);
  }

  saveQweekleCustomTable(bookingId, value) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_QWEEKLE_TABLE_STORE") || "{}")
      : {};

    if (value && value.trim() !== "") {
      store[bookingId] = value.trim();
    } else {
      delete store[bookingId];
    }

    if (this.hasLocalStorage()) {
      localStorage.setItem("SFG_QWEEKLE_TABLE_STORE", JSON.stringify(store));
    }
    
    // Synchroniser avec Supabase
    this.pushCustomOverrideToSupabase(bookingId);
  }

  getQweekleCustomTable(bookingId) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_QWEEKLE_TABLE_STORE") || "{}")
      : {};
    return store[bookingId] || null;
  }

  // =========================================================================
  // GESTION DES NOTES MANUELLES QWEEKLE
  // =========================================================================
  getQweekleCustomNote(bookingId) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_QWEEKLE_NOTES_STORE") || "{}")
      : {};
    return store[bookingId];
  }

  saveQweekleCustomNote(bookingId, noteText) {
    const store = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_QWEEKLE_NOTES_STORE") || "{}")
      : {};
    
    if (noteText !== null && noteText !== undefined) {
      store[bookingId] = noteText.trim();
    } else {
      delete store[bookingId];
    }
    if (this.hasLocalStorage()) {
      localStorage.setItem("SFG_QWEEKLE_NOTES_STORE", JSON.stringify(store));
    }

    // Synchroniser avec Supabase
    this.pushCustomOverrideToSupabase(bookingId);
  }

  // =========================================================================
  // GESTION ET SYNCHRONISATION DES OVERRIDES DEPUIS SUPABASE
  // =========================================================================
  async syncOverridesFromSupabase(dateStr) {
    if (
      typeof CONFIG === "undefined" ||
      !CONFIG.SUPABASE_URL ||
      !CONFIG.SUPABASE_KEY
    )
      return;
    try {
      const url = `${CONFIG.SUPABASE_URL}/rest/v1/booking_activities?select=qweekle_booking_id,raw_payload&qweekle_booking_id=like.NOTE_*&start_at=gte.${dateStr}T00:00:00&start_at=lte.${dateStr}T23:59:59`;
      const res = await fetch(url, {
        headers: {
          apikey: CONFIG.SUPABASE_KEY,
          Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) return;
      const rows = await res.json();

      rows.forEach((r) => {
        if (r.qweekle_booking_id && r.qweekle_booking_id.startsWith("NOTE_")) {
          const bid = r.qweekle_booking_id.replace("NOTE_", "");
          if (r.raw_payload) {
              if (r.raw_payload.customNote !== undefined) {
              const store = this.hasLocalStorage()
                ? JSON.parse(
                    localStorage.getItem("SFG_QWEEKLE_NOTES_STORE") || "{}",
                  )
                : {};
              // On accepte explicitement les chaînes vides ("") pour la suppression de notes
              if (r.raw_payload.customNote !== null && r.raw_payload.customNote !== undefined)
                store[bid] = r.raw_payload.customNote;
              else delete store[bid];
              if (this.hasLocalStorage())
                localStorage.setItem(
                  "SFG_QWEEKLE_NOTES_STORE",
                  JSON.stringify(store),
                );
            }
            if (r.raw_payload.customEnfants) {
              const eStore = this.hasLocalStorage()
                ? JSON.parse(
                    localStorage.getItem("SFG_QWEEKLE_ENFANTS_STORE") || "{}",
                  )
                : {};
              eStore[bid] = r.raw_payload.customEnfants;
              if (this.hasLocalStorage())
                localStorage.setItem(
                  "SFG_QWEEKLE_ENFANTS_STORE",
                  JSON.stringify(eStore),
                );
            }
            if (r.raw_payload.customTable !== undefined) {
              const tStore = this.hasLocalStorage()
                ? JSON.parse(
                    localStorage.getItem("SFG_QWEEKLE_TABLE_STORE") || "{}",
                  )
                : {};
              if (r.raw_payload.customTable)
                tStore[bid] = r.raw_payload.customTable;
              else delete tStore[bid];
              if (this.hasLocalStorage())
                localStorage.setItem(
                  "SFG_QWEEKLE_TABLE_STORE",
                  JSON.stringify(tStore),
                );
            }
          }
        }
      });
    } catch (e) {
      console.warn("Erreur sync overrides", e);
    }
  }

  // =========================================================================
  // GESTION ET SYNCHRONISATION DES ALERTES EMAILS (SUPABASE)
  // =========================================================================
  async syncEmailAlertsFromSupabase() {
    if (
      typeof CONFIG === "undefined" ||
      !CONFIG.SUPABASE_URL ||
      !CONFIG.SUPABASE_KEY
    )
      return;
    try {
      // On récupère toutes les alertes non résolues (ou liées à des réservations récentes)
      // Pour simplifier, on prend celles dont le status n'est pas 'resolved'
      const url = `${CONFIG.SUPABASE_URL}/rest/v1/email_alerts?status=eq.unread&select=id,qweekle_booking_id,email_subject,email_sender,detected_changes,received_at`;
      const res = await fetch(url, {
        headers: {
          apikey: CONFIG.SUPABASE_KEY,
          Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) return;
      const rows = await res.json();

      const store = {};
      rows.forEach((r) => {
        if (r.qweekle_booking_id) {
          if (!store[r.qweekle_booking_id]) {
            store[r.qweekle_booking_id] = [];
          }
          store[r.qweekle_booking_id].push(r);
        }
      });

      if (this.hasLocalStorage()) {
        localStorage.setItem("SFG_EMAIL_ALERTS_STORE", JSON.stringify(store));
      }
    } catch (e) {
      console.warn("Erreur sync email alerts", e);
    }
  }

  getEmailAlerts(booking) {
    try {
      const store = this.hasLocalStorage()
        ? JSON.parse(localStorage.getItem("SFG_EMAIL_ALERTS_STORE") || "{}")
        : {};
        
      const cleanBookingId = (booking.id || "").toString().replace(/^QW-/, "");
      
      // Collecte tous les IDs à chercher (le principal + les activités)
      const idsToCheck = [cleanBookingId];
      
      if (booking.activites && Array.isArray(booking.activites) && booking.activites.length > 0) {
        booking.activites.forEach(act => {
          const actIdsStr = (act.id || "").toString();
          actIdsStr.split(',').forEach(idStr => {
            const actId = idStr.trim().replace(/^QW-/, "");
            if (actId) idsToCheck.push(actId);
          });
        });
      }

      // Normalisation: on retire tout ce qui est non alphanumérique et les préfixes ABXX/OXXX/OIXX etc.
      const normalizeId = (id) => (id || "").toString().replace(/[^a-zA-Z0-9]/g, '').replace(/^(ABXX|OXXX|OIXX|QW)/i, '');

      const normalizedIdsToCheck = idsToCheck.map(normalizeId).filter(id => id.length > 5);

      let allAlerts = [];
      const addedAlertIds = new Set();
      let storeModified = false;
      
      // On parcourt tout le store pour faire un match souple
      if (store && typeof store === 'object') {
        Object.entries(store).forEach(([alertBookingId, alerts]) => {
          const normAlertId = normalizeId(alertBookingId);
          
          // Est-ce que cet ID d'alerte correspond à l'un des IDs de cette réservation ?
          const isMatch = normalizedIdsToCheck.some(idToCheck => 
            normAlertId.includes(idToCheck) || idToCheck.includes(normAlertId)
          );
          
          if (isMatch && Array.isArray(alerts)) {
             alerts.forEach((al, index) => {
               if (al && al.id && !addedAlertIds.has(al.id)) {
                 const detected = (al.detected_changes || "").trim();
                 
                 let shouldIgnore = false;
                 if (detected.toLowerCase() === "null") {
                    shouldIgnore = true;
                 } else {
                    let alertPax = null;
                    const pMatch1 = detected.match(/Changement du nombre de participants\s*:\s*(\d+)/i);
                    const pMatch2 = detected.match(/(?:passe|passant) de \d+ [aà] (\d+)/i);
                    const pMatch3 = detected.match(/(\d+)\s*(?:personnes|enfants|participants|jeunes)/i);
                    
                    if (pMatch1) alertPax = parseInt(pMatch1[1], 10);
                    else if (pMatch2) alertPax = parseInt(pMatch2[1], 10);
                    else if (pMatch3) alertPax = parseInt(pMatch3[1], 10);

                    if (alertPax !== null) {
                       const bookingPax = parseInt(booking.nbPersonnes || booking.personnes, 10);
                       if (!isNaN(alertPax) && !isNaN(bookingPax) && alertPax === bookingPax) {
                           shouldIgnore = true;
                       }
                    }
                 }
                 
                 if (shouldIgnore) {
                    this.markEmailAlertAsRead(al.id); // Auto-resolve in backend
                    alerts[index] = null; // Mark for removal locally
                    storeModified = true;
                    return; // Skip adding to allAlerts
                 }

                 addedAlertIds.add(al.id);
                 allAlerts.push(al);
               }
             });
          }
        });
      }
      
      if (storeModified) {
         Object.keys(store).forEach(k => {
            if (store[k]) store[k] = store[k].filter(Boolean);
         });
         if (this.hasLocalStorage()) {
            localStorage.setItem("SFG_EMAIL_ALERTS_STORE", JSON.stringify(store));
         }
      }
      
      return allAlerts;
    } catch (err) {
      console.warn("Erreur dans getEmailAlerts:", err);
      return []; // Return empty array to prevent crashing the rendering
    }
  }

  async markEmailAlertAsRead(alertId) {
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) return false;
    try {
      const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/email_alerts?id=eq.${alertId}`, {
        method: "PATCH",
        headers: {
          apikey: CONFIG.SUPABASE_KEY,
          Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ status: "read" })
      });
      if (response.ok) {
        await this.syncEmailAlertsFromSupabase();
        return true;
      }
    } catch (e) {
      console.error("Erreur markEmailAlertAsRead:", e);
    }
    return false;
  }

  // =========================================================================
  // GESTION ET SYNCHRONISATION DE L'API QWEEKLE
  // =========================================================================
  getQweekleReservationsForDate(dateStr) {
    // 1. Vérifier si des données Qweekle synchronisées ou en cache sont disponibles pour cette date
    const cachedStore = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_QWEEKLE_STORE_V7") || "{}")
      : {};
    if (cachedStore[dateStr] && Array.isArray(cachedStore[dateStr])) {
      // Ne pas utiliser un cache démo ancien (Marc Dupont QW-90102) si la base Supabase est active
      const isDemoCache = cachedStore[dateStr].some(
        (r) =>
          r &&
          (r.id === "QW-90102" || r.id === "QW-90145" || r.nom === "DUPONT"),
      );
      if (
        !isDemoCache ||
        typeof CONFIG === "undefined" ||
        !CONFIG.SUPABASE_URL
      ) {
        return cachedStore[dateStr];
      }
    }
    // 2. Repli vers les données structurées officielles de la configuration uniquement si Supabase n'est pas configuré
    if (
      typeof CONFIG !== "undefined" &&
      !CONFIG.SUPABASE_URL &&
      CONFIG.QWEEKLE_RESERVATIONS_DATA &&
      CONFIG.QWEEKLE_RESERVATIONS_DATA[dateStr]
    ) {
      return CONFIG.QWEEKLE_RESERVATIONS_DATA[dateStr];
    }
    return [];
  }

  cleanLabel(text) {
    if (!text || typeof text !== "string") return text;
    let clean = text.replace(/\[.*?\]\s*/g, "").trim();
    const matchQty = clean.match(/^(\d+)\s*[xX]\s*(.+)$/);
    if (matchQty) {
      clean = matchQty[2].trim();
    }
    return clean;
  }

  isOptionLabel(text) {
    if (!text || typeof text !== "string") return false;
    const lower = text.toLowerCase();
    return (
      lower.includes("option") ||
      lower.includes("produit") ||
      lower.includes("bar") ||
      lower.includes("gâteau") ||
      lower.includes("gateau") ||
      lower.includes("kidibul") ||
      lower.includes("champagne") ||
      lower.includes("brownie") ||
      lower.includes("donut") ||
      lower.includes("bonbon") ||
      lower.includes("chips") ||
      lower.includes("granit") ||
      lower.includes("crêpe") ||
      lower.includes("crepe") ||
      lower.includes("formule") ||
      lower.includes("goûter") ||
      lower.includes("gouter") ||
      lower.includes("boisson") ||
      lower.includes("bière") ||
      lower.includes("biere") ||
      lower.includes("soda") ||
      lower.includes("jeton") ||
      lower.includes("gobelet") ||
      lower.includes("pitch") ||
      lower.includes("capri") ||
      lower.includes("café") ||
      lower.includes("cafe") ||
      lower.includes("nourriture") ||
      lower.includes("buffet") ||
      lower.includes("privatisation") ||
      lower.includes("ticket") ||
      lower.includes("repas") ||
      lower.includes("traiteur") ||
      lower.includes("apéro") ||
      lower.includes("apero") ||
      lower.includes("pause") ||
      lower.includes("snack") ||
      lower.includes("pizza") ||
      lower.includes("tapas") ||
      lower.includes("planche") ||
      lower.includes("hot dog") ||
      lower.includes("croque") ||
      lower.includes("burger")
    );
  }

  async fetchAndSyncQweekleReservations(dateStr) {
    if (dateStr === true || !dateStr) dateStr = this.currentDate;
    if (typeof CONFIG === "undefined") {
      return {
        status: "fallback",
        data: this.getQweekleReservationsForDate(dateStr),
      };
    }

    // 3. Charger le cache, puis rafraîchir en arrière-plan depuis Supabase si configuré
    await this.syncEmailAlertsFromSupabase();
    await this.syncOverridesFromSupabase(dateStr);
    await this.syncCustomTablesFromSupabase();

    // 1. Tenter en direct via l'API REST officielle de Qweekle (Priorité 1 absolue maintenant qu'on a le token !)
    if (CONFIG.QWEEKLE_API_TOKEN && CONFIG.QWEEKLE_API_BASE_URL) {
      try {
        let allBookingsData = [];
        let currentPage = 1;
        let lastPage = 1;
        let isSuccess = true;

        do {
          const url = `${CONFIG.QWEEKLE_API_BASE_URL}/bookings?filter[agenda.starts_between]=${dateStr}T00:00:00,${dateStr}T23:59:59&withOrder=true&perPage=100&page=${currentPage}&_=${Date.now()}`;
          const response = await fetch(url, {
            method: "GET",
            headers: CONFIG.getQweekleHeaders(),
            cache: "no-store",
          });

          if (!response.ok) {
            isSuccess = false;
            break;
          }

          const json = await response.json();
          if (json.data && Array.isArray(json.data)) {
            allBookingsData = allBookingsData.concat(json.data);
          }

          lastPage = json.metadata?.lastPage || 1;
          currentPage++;
        } while (currentPage <= lastPage);

        if (isSuccess) {
          const rawBookings = allBookingsData.filter((b) => {
            const st = (b.state || "").toLowerCase();
            const orderSt = (b.order?.state || b.order_item?.order?.state || "").toLowerCase();
            
            if (st === "cancelled" || st === "canceled" || st === "deleted" || st === "rejected") return false;
            if (orderSt === "cancelled" || orderSt === "canceled" || orderSt === "deleted" || orderSt === "rejected") return false;
            
            if (b.deleted_at) return false;
            if (b.order?.deleted_at) return false;
            if (b.order_item?.deleted_at) return false;
            if (b.order_item?.order?.deleted_at) return false;

            const orderType = b.order_item?.order?.type || b.order?.type;

            // Exclure les blocs fantômes/orphelins (souvent d'anciennes modifications de propositions)
            if (st === "unconfirmed" && !b.order_item && !b.sale_item_id)
              return false;

            // Conserver les 'propositions' (unconfirmed) si elles ont été créées par le staff (sale_order)
            // Rejeter les paniers abandonnés sur le site web (front_order)
            if (st === "unconfirmed" && orderType === "front_order")
              return false;

            return true;
          });

          // --- NOUVEAU : Récupérer les infos clients et les items supplémentaires ---
          const orderIds = Array.from(
            new Set(
              rawBookings
                .map((b) => b.order_item?.order_id || b.sale_id || b.order_id)
                .filter(Boolean),
            ),
          );
          const clientIds = Array.from(
            new Set(
              rawBookings
                .map(
                  (b) =>
                    b.client_id ||
                    b.order_item?.order?.client_id ||
                    b.order?.client_id,
                )
                .filter(Boolean),
            ),
          );

          let clientsMap = {};
          let ordersMap = {};

          try {
            const clientPromises = clientIds.map((cid) =>
              fetch(`${CONFIG.QWEEKLE_API_BASE_URL}/clients/${cid}`, {
                headers: CONFIG.getQweekleHeaders(),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data && data.data) clientsMap[cid] = data.data;
                })
                .catch(() => null),
            );

            const orderPromises = orderIds.map((oid) =>
              fetch(
                `${CONFIG.QWEEKLE_API_BASE_URL}/orders/${oid}?include=items`,
                { headers: CONFIG.getQweekleHeaders() },
              )
                .then((r) => r.json())
                .then((data) => {
                  if (data && data.data) ordersMap[oid] = data.data;
                })
                .catch(() => null),
            );

            await Promise.all([...clientPromises, ...orderPromises]);

            Object.values(ordersMap).forEach((orderData) => {
              if (orderData && orderData.items) {
                orderData.items.forEach((item) => {
                  const lbl =
                    item.label || item.product_name || item.name || "";
                  const lblLower = lbl.toLowerCase();

                  // Ignorer les acomptes, déductions et frais divers qui ne sont pas des vrais produits/options
                  if (
                    lblLower.includes("acompte") ||
                    lblLower.includes("déduction") ||
                    lblLower.includes("deduction") ||
                    item.type === "DEPOSIT" ||
                    item.type === "PAID_DEPOSIT" ||
                    item.type === "VOUCHER"
                  )
                    return;

                  // Injecter comme une ligne factice
                  rawBookings.push({
                    id: item.id || `item_${Math.random()}`,
                    order_item: { order_id: orderData.id },
                    client_id: orderData.client_id,
                    activity: { label: lbl },
                    qty: item.qty,
                    type: item.type || "PRODUCT",
                    deleted_at: item.deleted_at,
                    state: item.state,
                    global_status: item.global_status || item.state,
                    raw_payload: {
                      ...item,
                      type: item.type || "PRODUCT",
                      label: lbl,
                      order_item: { order_id: orderData.id },
                    },
                  });
                });
              }
            });
          } catch (e) {
            console.warn(
              "⚠️ Impossible de récupérer infos supplémentaires API :",
              e,
            );
          }

          // --- NOUVEAU : Récupérer les sous-comptes (enfants) depuis Supabase pour pallier aux manques de l'API REST Qweekle ---
          let supabaseSubclientsMap = {};
          if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY) {
            try {
              const prevDate = new Date(dateStr);
              prevDate.setDate(prevDate.getDate() - 1);
              const prevDateStr = prevDate.toISOString().split("T")[0];
              const nextDate = new Date(dateStr);
              nextDate.setDate(nextDate.getDate() + 1);
              const nextDateStr = nextDate.toISOString().split("T")[0];
              const supaUrl = `${CONFIG.SUPABASE_URL}/rest/v1/booking_activities?select=order_id,qweekle_booking_id,raw_payload&start_at=gte.${prevDateStr}T12:00:00Z&start_at=lt.${nextDateStr}T23:59:59Z`;

              const responseSupa = await fetch(supaUrl, {
                method: "GET",
                headers: {
                  apikey: CONFIG.SUPABASE_KEY,
                  Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
                },
                cache: "no-store",
              });
              if (responseSupa.ok) {
                const supaData = await responseSupa.json();
                supaData.forEach((row) => {
                  if (row.raw_payload) {
                    const subs =
                      row.raw_payload.subclients ||
                      row.raw_payload.client?.sub_clients ||
                      [];
                    if (subs.length > 0) {
                      if (row.order_id) supabaseSubclientsMap[row.order_id] = subs;
                      if (row.qweekle_booking_id) supabaseSubclientsMap[row.qweekle_booking_id] = subs;
                    }
                  }
                });
              }
            } catch (e) {
              console.warn(
                "⚠️ Impossible de récupérer les sous-comptes Supabase :",
                e,
              );
            }
          }

          // Convertir au format unifié "Supabase" pour utiliser le parseur ultra-optimisé
          const unifiedRows = rawBookings.map((b) => {
            const orderId =
              b.order_item?.order_id || b.sale_id || b.order_id || b.id;
            let startAt =
              b.agenda?.start_at || b.agenda?.convoc_start_at || null;
            if (!startAt && b.created_at && b.type !== "PRODUCT")
              startAt = b.created_at;

            const cid =
              b.client_id ||
              b.order_item?.order?.client_id ||
              b.order?.client_id;
            const clientData = clientsMap[cid] || {};
            const orderData = ordersMap[orderId] || {};

            // Recréer le payload pour leurrer parseSupabaseActivitiesToBookings
            const fakePayload = {
              ...b,
              order: {
                ...b.order,
                ...orderData,
              },
              client: {
                ...b.client,
                ...clientData,
                firstname:
                  clientData.firstname || b.client?.firstname || "Client",
                lastname:
                  clientData.lastname || b.client?.lastname || "Qweekle",
                society: clientData.society || b.client?.society || "",
                type: clientData.type || "B2C",
                sub_clients: supabaseSubclientsMap[orderId] || [],
              },
            };

            return {
              id: b.id,
              order_id: orderId,
              label: b.activity?.label || b.label || "Produit Qweekle",
              category:
                b.type === "PRODUCT"
                  ? "Options"
                  : b.activity?.category || "Activité",
              qty: b.qty || b.agenda?.qty_pax || 1,
              start_at: startAt,
              end_at: b.agenda?.end_at || b.agenda?.convoc_end_at || null,
              raw_payload: fakePayload,
            };
          });

          // Utiliser parseSupabaseActivitiesToBookings !
          const parsedList = this.parseSupabaseActivitiesToBookings(
            unifiedRows,
            dateStr,
          );
          // --- FIN NOUVEAU ---

          if (this.hasLocalStorage()) {
            const cachedStore = JSON.parse(
              localStorage.getItem("SFG_QWEEKLE_STORE_V7") || "{}",
            );
            cachedStore[dateStr] = parsedList;
            const keys = Object.keys(cachedStore).sort();
            if (keys.length > 30) {
              keys.slice(0, keys.length - 30).forEach((k) => delete cachedStore[k]);
            }
            try {
              localStorage.setItem(
                "SFG_QWEEKLE_STORE_V7",
                JSON.stringify(cachedStore),
              );
            } catch (err) {
              console.warn("⚠️ Impossible de sauvegarder dans le cache local (Quota ?) :", err);
            }
          }
          return {
            status: "success",
            data: parsedList,
            source: "qweekle_rest",
          };
        }
      } catch (error) {
        console.warn("⚠️ Erreur API directe Qweekle :", error.message);
      }
    }

    // 2. Tenter en fallback la base de production Live Supabase (Webhooks Qweekle)
    if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY) {
      try {
        const prevDate = new Date(dateStr);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split("T")[0];
        const nextDate = new Date(dateStr);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split("T")[0];
        const supaUrl = `${CONFIG.SUPABASE_URL}/rest/v1/booking_activities?select=*&start_at=gte.${prevDateStr}T12:00:00Z&start_at=lt.${nextDateStr}T23:59:59Z&order=order_id,pack_step.asc`;

        const response = await fetch(supaUrl, {
          method: "GET",
          headers: {
            apikey: CONFIG.SUPABASE_KEY,
            Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (response.ok) {
          let rows = await response.json();

          // Récupérer également toutes les lignes rattachées aux order_id trouvés
          const activeOrderIds = Array.from(
            new Set((rows || []).map((r) => r.order_id).filter(Boolean)),
          );
          if (activeOrderIds.length > 0) {
            try {
              const chunkedIds = activeOrderIds.slice(0, 50); // Éviter une URL trop longue
              const orderFilter = chunkedIds.map((id) => `"${id}"`).join(",");
              const optUrl = `${CONFIG.SUPABASE_URL}/rest/v1/booking_activities?select=*&order_id=in.(${orderFilter})&order=pack_step.asc`;
              const optRes = await fetch(optUrl, {
                method: "GET",
                headers: {
                  apikey: CONFIG.SUPABASE_KEY,
                  Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
                  Accept: "application/json",
                },
                cache: "no-store",
              });
              if (optRes.ok) {
                const optRows = await optRes.json();
                const rowMap = new Map();
                rows.forEach((r) => rowMap.set(r.id || JSON.stringify(r), r));
                (optRows || []).forEach((r) =>
                  rowMap.set(r.id || JSON.stringify(r), r),
                );
                rows = Array.from(rowMap.values());
              }
            } catch (e) {
              console.warn(
                "⚠️ Erreur lors de la récupération complémentaire des options :",
                e.message,
              );
            }

            // --- NOUVEAU : Récupérer les notes depuis l'API Qweekle pour ces commandes ---
            if (CONFIG.QWEEKLE_API_TOKEN && CONFIG.QWEEKLE_API_BASE_URL) {
              try {
                const orderPromises = activeOrderIds.map((oid) =>
                  fetch(`${CONFIG.QWEEKLE_API_BASE_URL}/orders/${oid}?_=${Date.now()}`, {
                    headers: CONFIG.getQweekleHeaders(),
                    cache: "no-store",
                  })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((data) =>
                      data && data.data
                        ? { id: oid, orderData: data.data }
                        : null,
                    )
                    .catch(() => null),
                );
                const ordersResults = await Promise.all(orderPromises);
                const ordersExtraMap = new Map();
                ordersResults.forEach((res) => {
                  if (res) ordersExtraMap.set(res.id, res.orderData);
                });

                rows.forEach((r) => {
                  if (r.order_id && ordersExtraMap.has(r.order_id)) {
                    const o = ordersExtraMap.get(r.order_id);
                    if (!r.raw_payload) r.raw_payload = {};
                    if (!r.raw_payload.order) r.raw_payload.order = {};
                    r.raw_payload.order.note = o.note || o.comment || null;
                    r.raw_payload.order.front_note =
                      o.front_note || o.internal_note || null;
                  }
                });
              } catch (e) {
                console.warn(
                  "⚠️ Erreur lors de la récupération des notes commandes :",
                  e,
                );
              }
            }
            // --- FIN RECUPERATION NOTES ---
          }

          const parsedList = this.parseSupabaseActivitiesToBookings(
            rows || [],
            dateStr,
          );

          if (this.hasLocalStorage()) {
            const cachedStore = JSON.parse(
              localStorage.getItem("SFG_QWEEKLE_STORE_V7") || "{}",
            );
            cachedStore[dateStr] = parsedList;
            const keys = Object.keys(cachedStore).sort();
            if (keys.length > 30) {
              keys.slice(0, keys.length - 30).forEach((k) => delete cachedStore[k]);
            }
            try {
              localStorage.setItem(
                "SFG_QWEEKLE_STORE_V7",
                JSON.stringify(cachedStore),
              );
            } catch (err) {
              console.warn("⚠️ Impossible de sauvegarder dans le cache local (Quota ?) :", err);
            }
          }
          return { status: "success", data: parsedList, source: "supabase" };
        }
      } catch (error) {
        console.warn(
          "⚠️ Erreur de synchronisation Supabase Live :",
          error.message,
        );
      }
    }

    return {
      status: "fallback",
      data: this.getQweekleReservationsForDate(dateStr),
    };
  }

  parseSupabaseActivitiesToBookings(rows, dateStr) {
    // Collecter les order_id légitimes pour la date ciblée (ceux qui ont une activité ce jour-là)
    const validOrderIds = new Set();
    const cleanRows = [];

    (rows || []).forEach((r) => {
      // 1. Intercepter les notes/overrides globaux
      if (r.qweekle_booking_id && r.qweekle_booking_id.startsWith("NOTE_")) {
        const bid = r.qweekle_booking_id.replace("NOTE_", "");
        if (r.raw_payload) {
          if (r.raw_payload.customNote !== undefined) {
            const store = this.hasLocalStorage()
              ? JSON.parse(
                  localStorage.getItem("SFG_QWEEKLE_NOTES_STORE") || "{}",
                )
              : {};
            if (r.raw_payload.customNote) store[bid] = r.raw_payload.customNote;
            else delete store[bid];
            if (this.hasLocalStorage())
              localStorage.setItem(
                "SFG_QWEEKLE_NOTES_STORE",
                JSON.stringify(store),
              );
          }
            if (r.raw_payload.customEnfants) {
              const eStore = this.hasLocalStorage()
                ? JSON.parse(
                    localStorage.getItem("SFG_QWEEKLE_ENFANTS_STORE") || "{}",
                  )
                : {};
              eStore[bid] = r.raw_payload.customEnfants;
              if (this.hasLocalStorage())
                localStorage.setItem(
                  "SFG_QWEEKLE_ENFANTS_STORE",
                  JSON.stringify(eStore),
                );
            }
            if (r.raw_payload.hidden !== undefined) {
              const hStore = this.hasLocalStorage()
                ? JSON.parse(
                    localStorage.getItem("SFG_QWEEKLE_HIDDEN_STORE") || "{}",
                  )
                : {};
              if (r.raw_payload.hidden) hStore[bid] = true;
              else delete hStore[bid];
              if (this.hasLocalStorage())
                localStorage.setItem(
                  "SFG_QWEEKLE_HIDDEN_STORE",
                  JSON.stringify(hStore),
                );
            }
          }
          return; // on ne le garde pas comme une vraie réservation
      }

      cleanRows.push(r);

      if (
        r.start_at &&
        new Date(r.start_at).toLocaleDateString("en-CA", {
          timeZone: "Europe/Brussels",
        }) === dateStr
      ) {
        if (r.order_id) validOrderIds.add(r.order_id);
        if (r.qweekle_booking_id) validOrderIds.add(r.qweekle_booking_id);
      }
    });

    // Remplacer rows par cleanRows
    rows = cleanRows;

    // Filtrer par date locale du dossier OU conserver si la ligne est une option rattachée à un order_id de ce jour
    const filteredRows = (rows || []).filter((r) => {
      // 1. Filtrer les réservations annulées/supprimées
      if (r.deleted_at !== null && r.deleted_at !== undefined) return false;
      if (r.raw_payload && r.raw_payload.deleted_at !== null && r.raw_payload.deleted_at !== undefined) return false;
      if (r.state === "CANCELLED" || r.state === "CANCELED" || r.state === "DELETED") return false;

      const gStatus = (
        r.global_status ||
        r.raw_payload?.order?.global_status ||
        r.raw_payload?.global_status ||
        r.raw_payload?.order_item?.global_status ||
        r.state ||
        r.raw_payload?.state ||
        ""
      ).toUpperCase();
      
      if (
        gStatus === "CANCELLED" ||
        gStatus === "CANCELED" ||
        gStatus === "DELETED" ||
        gStatus === "REFUNDED" ||
        gStatus === "REJECTED"
      ) {
        return false;
      }

      if (r.start_at) {
        const rowDate = new Date(r.start_at).toLocaleDateString("en-CA", {
          timeZone: "Europe/Brussels",
        });
        if (rowDate === dateStr) return true;
      }
      const oid =
        r.order_id || r.order_item?.order_id || r.order_item?.order?.id;
      if (oid && validOrderIds.has(oid)) return true;
      if (r.qweekle_booking_id && validOrderIds.has(r.qweekle_booking_id))
        return true;

      // Cas particulier pour les lignes injectées depuis l'API qui n'ont pas forcément de validOrderIds mais un order_id explicite
      if (
        r.type === "PRODUCT" ||
        r.type === "OPTION" ||
        r.type === "PACK" ||
        r.type === "DEPOSIT"
      )
        return true;

      return false;
    });

    // 0.5 Charger les réservations masquées manuellement
    const hiddenStore = this.hasLocalStorage()
      ? JSON.parse(localStorage.getItem("SFG_QWEEKLE_HIDDEN_STORE") || "{}")
      : {};

    // Regrouper par order_id ou par identifiant unique de réservation
    const groups = {};
    filteredRows.forEach((r) => {
      const oid =
        r.order_id ||
        r.order_item?.order_id ||
        r.order_item?.order?.id ||
        r.qweekle_booking_id ||
        r.id;

      if (hiddenStore[oid] || hiddenStore[`QW-${oid}`] || hiddenStore[r.qweekle_booking_id] || hiddenStore[r.id]) {
        return; // IGNORER LES RÉSERVATIONS MASQUÉES
      }

      if (!groups[oid]) groups[oid] = [];
      groups[oid].push(r);
    });

    const bookings = [];
    Object.keys(groups).forEach((oid) => {
      const group = groups[oid];
      // Tri chronologique des activités au sein du dossier
      group.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

      // 1. Informations Client et Notes
      let nom = "Client Inconnu";
      let prenom = "";
      let societe = "";
      let qweekleNote = "";
      let qweekleInternalNote = "";

      for (const act of group) {
        const rp = act.raw_payload || {};
        const cl = rp.client || {};
        const o = rp.order || {};

        if (!qweekleNote) {
          qweekleNote =
            o.front_note ||
            o.note ||
            o.comment ||
            rp.front_note ||
            rp.note ||
            rp.comment ||
            act.front_note ||
            act.note ||
            act.comment ||
            "";
        }
        if (!qweekleInternalNote) {
          qweekleInternalNote =
            o.internal_note ||
            rp.internal_note ||
            act.internal_note ||
            cl.note ||
            cl.internal_note ||
            cl.comment ||
            "";
        }

        const fn = act.client_firstname || cl.firstname || "";
        const ln = act.client_lastname || cl.lastname || "";
        const soc = cl.society || "";
        const clientType = cl.type || "";

        if (fn || ln || soc) {
          prenom = fn;
          if (
            clientType === "association" ||
            clientType === "entreprise" ||
            soc
          ) {
            societe = soc;
            nom = (ln ? `${ln} (${soc})` : soc).toUpperCase();
          } else {
            nom = ln.toUpperCase() || "CLIENT";
          }
          break;
        }
      }
      if (nom === "Client Inconnu") {
        const email = group.find(
          (a) => a.client_email || a.raw_payload?.client?.email,
        );
        if (email) {
          const em = email.client_email || email.raw_payload?.client?.email;
          nom = em.split("@")[0].toUpperCase();
        } else {
          nom = `CLIENT (${oid.slice(-8)})`;
        }
      }

      // 1.5 Séparer les activités principales des options pures
      const mainActivities = group.filter((a) => {
        const typeRaw = (a.raw_payload?.type || a.type || "").toUpperCase();
        return (
          typeRaw !== "PRODUCT" &&
          typeRaw !== "OPTION" &&
          typeRaw !== "PACK" &&
          typeRaw !== "DEPOSIT" &&
          typeRaw !== "PAID_DEPOSIT" &&
          typeRaw !== "FEE" &&
          a.start_at // Doit avoir une heure de début planifiée
        );
      });
      const activitiesForSchedule =
        mainActivities.length > 0 ? mainActivities : group;

      // 2. Plage horaire globale (arrivée et départ)
      const earliestDate = new Date(
        activitiesForSchedule[0].start_at ||
          activitiesForSchedule[0].created_at ||
          Date.now(),
      );
      let maxEndMs = earliestDate.getTime();
      activitiesForSchedule.forEach((act) => {
        const sMs = new Date(
          act.start_at || act.created_at || Date.now(),
        ).getTime();
        let eMs = act.end_at
          ? new Date(act.end_at).getTime()
          : sMs + (Number(act.duration) || 60) * 60000;

        // --- NOUVEAU: SURPASSER LA DUREE DE "1 Heure de Team Games" ET "Table réservée" ---
        const nomAct = (act.label || "").toLowerCase();
        if (nomAct.includes("1 heure de team game")) {
          eMs = sMs + 60 * 60000; // Forcer 1h
        } else if (
          nomAct.includes("table") &&
          (nomAct.includes("réservée") ||
            nomAct.includes("reservee") ||
            nomAct.includes("installée"))
        ) {
          eMs = sMs + 40 * 60000; // Forcer 40 min
        }

        if (eMs > maxEndMs) maxEndMs = eMs;
      });
      const latestDate = new Date(maxEndMs);

      const heureArrivee = earliestDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const heureDepart = latestDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // 3. Nombre de personnes (en priorité la somme des activités d'accueil / arrivées, sinon le max)
      const arrivGroup = group.filter(
        (a) =>
          (a.label || a.raw_payload?.order_item?.label || "")
            .toLowerCase()
            .includes("accueil") ||
          (a.zone || a.raw_payload?.order_item?.zone || "")
            .toLowerCase()
            .includes("arrivées"),
      );
      let nbPersonnes = 0;
      if (arrivGroup.length > 0) {
        nbPersonnes = arrivGroup.reduce(
          (sum, a) =>
            sum +
            (Number(a.qty) ||
              Number(a.raw_payload?.client?.qty) ||
              Number(a.raw_payload?.qty) ||
              0),
          0,
        );
      }
      if (!nbPersonnes || isNaN(nbPersonnes) || nbPersonnes <= 0) {
        nbPersonnes = Math.max(
          ...group.map(
            (a) =>
              Number(a.qty) ||
              Number(a.raw_payload?.client?.qty) ||
              Number(a.raw_payload?.qty) ||
              0,
          ),
          1,
        );
      }

      // 4. Activités détaillées (seulement les activités, pas les produits injectés)
      const activites = activitiesForSchedule.map((act) => {
        const s = new Date(act.start_at || act.created_at || Date.now());
        const sMs = s.getTime();
        let eMs = act.end_at
          ? new Date(act.end_at).getTime()
          : sMs + (Number(act.duration) || 60) * 60000;

        // --- NOUVEAU: SURPASSER LA DUREE DE "1 Heure de Team Games" ET "Table réservée" ---
        const nomAct = (act.label || "").toLowerCase();
        if (nomAct.includes("1 heure de team game")) {
          eMs = sMs + 60 * 60000; // Forcer 1h
        } else if (
          nomAct.includes("table") &&
          (nomAct.includes("réservée") ||
            nomAct.includes("reservee") ||
            nomAct.includes("installée"))
        ) {
          eMs = sMs + 40 * 60000; // Forcer 40 min
        }

        const e = new Date(eMs);
        const actQty =
          Number(act.qty) ||
          Number(act.raw_payload?.client?.qty) ||
          Number(act.raw_payload?.qty) ||
          nbPersonnes ||
          1;
        return {
          id: `QW-${act.qweekle_booking_id || act.id}`,
          heureDebut: s.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          heureFin: e.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          nom: this.cleanLabel(act.label || "Activité Qweekle"),
          zone: act.location || act.category || "Zone Générale",
          nbPersonnes: actQty,
        };
      });

      // 5. Nom du pack (en priorité depuis le titre exact de commande/produit dans Qweekle, sinon calculé depuis les activités)
      let nomPack = "";
      const orderPacks = new Set();
      group.forEach((act) => {
        const rp = act.raw_payload || {};
        const typeRaw = (rp.type || act.type || "").toUpperCase();

        // Si c'est un produit injecté qui représente le pack principal
        if (!act.start_at && typeRaw !== "OPTION" && typeRaw !== "DEPOSIT") {
          const lbl = this.cleanLabel(
            (rp.label || act.label || act.nom || "").trim(),
          );
          if (lbl && !this.isOptionLabel(lbl)) {
            orderPacks.add(lbl);
          }
          return;
        }

        // Ignorer les autres produits injectés pour le calcul du nom du pack
        if (
          typeRaw === "OPTION" ||
          typeRaw === "DEPOSIT"
        )
          return;

        const itemLabel = this.cleanLabel(
          rp.order_item?.label ||
            rp.product?.label ||
            rp.pack_label ||
            rp.activity?.product_label ||
            act.pack_label ||
            act.product_label,
        );
        if (
          itemLabel &&
          typeof itemLabel === "string" &&
          itemLabel.trim() &&
          !itemLabel.toLowerCase().includes("accueil") &&
          !itemLabel.toLowerCase().includes("table réservée") &&
          !this.isOptionLabel(itemLabel)
        ) {
          orderPacks.add(itemLabel.trim());
        }
      });
      let originalPackStr = "";
      if (orderPacks.size > 0) {
        originalPackStr = Array.from(orderPacks).join(" + ");
        const distinctActTypes = new Set(
          activitiesForSchedule
            .map((a) => (a.label || a.nom || "").replace(/▶\s*/g, "").trim())
            .filter(
              (n) =>
                !n.toLowerCase().includes("accueil") &&
                !n.toLowerCase().includes("table réservée"),
            ),
        );

        const isGeneric = (str) => {
          const l = (str || "").toLowerCase();
          return l.includes("sur mesure") || 
                 l.includes("multi-activité") || 
                 l.includes("multi activité") || 
                 l.includes("qweekle") ||
                 l.includes("pack");
        };

        // Si le nom du pack est très générique, on le recompose à partir des activités
        if (isGeneric(originalPackStr) && distinctActTypes.size > orderPacks.size && orderPacks.size === 1) {
          nomPack = this.computePackLabelFromActivities(group, originalPackStr);
        } else {
          nomPack = originalPackStr;
        }
      } else {
        let parentOrderLabel =
          group[0]?.raw_payload?.order?.label ||
          group[0]?.raw_payload?.order?.product_label ||
          group[0]?.raw_payload?.order?.name ||
          "";
        parentOrderLabel = this.cleanLabel(parentOrderLabel);

        if (parentOrderLabel.includes("+")) {
          parentOrderLabel = parentOrderLabel
            .split("+")
            .map((p) => p.trim())
            .filter((p) => p && !this.isOptionLabel(p))
            .join(" + ");
        }

        const isGeneric = (str) => {
          const l = (str || "").toLowerCase();
          return !l || l.includes("sur mesure") || 
                 l.includes("multi-activité") || 
                 l.includes("multi activité") || 
                 l.includes("qweekle") ||
                 l.includes("pack");
        };

        if (isGeneric(parentOrderLabel)) {
          nomPack = this.computePackLabelFromActivities(group, parentOrderLabel);
        } else {
          nomPack = parentOrderLabel;
        }
      }

      // --- NOUVEAU : Nettoyage GARANTI de originalPackStr et nomPack ---
      originalPackStr = this.cleanLabel(originalPackStr);
      if (originalPackStr.includes("+")) {
        originalPackStr = originalPackStr
          .split("+")
          .map((p) => this.cleanLabel(p.trim()))
          .filter((p) => p && !this.isOptionLabel(p))
          .join(" + ");
      }

      nomPack = this.cleanLabel(nomPack);
      if (nomPack.includes("+")) {
        nomPack = nomPack
          .split("+")
          .map((p) => this.cleanLabel(p.trim()))
          .filter((p) => p && !this.isOptionLabel(p))
          .join(" + ");
      }
      // -----------------------------------------------------------------

      // 6. Catégories détectées
      const allTextForCats = `${nom} ${societe} ${nomPack} ${group.map((a) => `${a.label || ""} ${a.category || ""} ${a.subcategory || ""} ${a.raw_payload?.client?.type || ""}`).join(" ")}`;
      const categories = this.detectQweekleCategories(
        nom,
        societe,
        nomPack,
        allTextForCats,
      );

      // 7. Options supplémentaires choisies (accumuler les quantités, ignorer les packs/activités)
      const optionsMap = new Map();
      const processedOptionIds = new Set();

      const addOption = (lblRaw, qtyRaw, itemId) => {
        if (!lblRaw) return;

        // Anti-doublon robuste basé sur l'ID de l'item (pour éviter de recompter les mêmes options
        // issues de raw_payload.order.items présents dans chaque webhook d'activité)
        if (itemId) {
          if (processedOptionIds.has(itemId)) return;
          processedOptionIds.add(itemId);
        }

        let clean = this.cleanLabel(lblRaw.trim());
        const cleanLower = clean.toLowerCase();

        if (
          cleanLower.includes("acompte") ||
          cleanLower.includes("déduction") ||
          cleanLower.includes("deduction")
        ) {
          return;
        }

        if (cleanLower.includes("brownie")) clean = "Brownie";
        else if ((cleanLower.includes("gâteau") || cleanLower.includes("gateau")) && (cleanLower.includes("crêpe") || cleanLower.includes("crepe"))) {
          clean = "Gâteau de Crêpes";
          const match = cleanLower.match(/(\d+)\s*cr[êe]pes?/);
          if (match) {
            clean += ` (${match[1]} crêpes)`;
          }
        }
        else if (cleanLower.includes("crêpe") || cleanLower.includes("crepe")) clean = "Crêpe(s)";
        else if (cleanLower.includes("bonbon")) clean = "Bonbons";
        else if (cleanLower.includes("champagne") || cleanLower.includes("kidibul"))
          clean = "Kidibull";
        else if (cleanLower.includes("nourriture externe"))
          clean = "Frais Nourriture Externe";
        else if (cleanLower.includes("ticket boisson"))
          clean = "Ticket boisson";
        else if (cleanLower.includes("buffet libanais"))
          clean = "Buffet Libanais";
        else if (cleanLower.includes("buffet") && clean.includes("("))
          clean = clean.split("(")[0].trim();

        const existingQty = optionsMap.get(clean) || 0;
        const newQty = Number(qtyRaw) || 1;
        // Additionner au lieu de Math.max, puisque le Set anti-doublon protège des répétitions du même ID
        optionsMap.set(clean, existingQty + newQty);
      };

      group.forEach((act) => {
        const catLower = (act.category || "").toLowerCase();
        const lblRaw = (act.label || "").trim();
        let lbl = this.cleanLabel(lblRaw);
        
        const isOptionKeyword = this.isOptionLabel(catLower) || this.isOptionLabel(lbl.toLowerCase());

        if (lbl.includes("+")) {
          // If it's a known option/product, don't strip its own option keywords!
          if (!isOptionKeyword) {
            lbl = lbl
              .split("+")
              .map((p) => this.cleanLabel(p.trim()))
              .filter((p) => p && !this.isOptionLabel(p))
              .join(" + ");
          }
        }
        const lblLower = lbl.toLowerCase();
        const typeRaw = (act.raw_payload?.type || act.type || "").toUpperCase();

        // On ne met jamais en option une activité qui est déjà prévue à une heure précise (ex: table réservée)
        const isRealActivity = act.start_at && !this.isOptionLabel(lblLower);

        // Filtre anti-pack: ne pas afficher l'activité principale dans les options
        const matchesNomPack =
          (nomPack &&
            (nomPack.toLowerCase().includes(lblLower) ||
              lblLower.includes(nomPack.toLowerCase()))) ||
          (originalPackStr &&
            (originalPackStr.toLowerCase().includes(lblLower) ||
              lblLower.includes(originalPackStr.toLowerCase())));
        const isAlreadyActivity = activitiesForSchedule.some((mainAct) => {
          const mainLbl = (mainAct.label || mainAct.nom || "").toLowerCase();
          if (!mainLbl || !lblLower) return false;
          return (
            mainLbl === lblLower ||
            (lblLower.includes("laser game") &&
              mainLbl.includes("laser game")) ||
            (lblLower.includes("quiz") && mainLbl.includes("quiz"))
          );
        });

        if (!isRealActivity && !matchesNomPack && !isAlreadyActivity) {
          if (
            typeRaw === "PRODUCT" ||
            typeRaw === "OPTION" ||
            typeRaw === "PACK" ||
            isOptionKeyword ||
            !act.start_at
          ) {
            if (lbl) {
              addOption(lbl, act.qty, act.id || act.order_item_id);
            }
          }
        }

        // Vérifier dans raw_payload si des options imbriquées sont présentes
        if (act.raw_payload) {
          const checkItems = (items) => {
            if (Array.isArray(items)) {
              items.forEach((oi) => {
                const oiType = (oi.type || "").toUpperCase();
                const oiLabelRaw = (oi.label || oi.nom || "").trim();
                let oiLabel = this.cleanLabel(oiLabelRaw);
                if (oiLabel.includes("+")) {
                  const oiIsOptionKeyword = this.isOptionLabel(oiLabel.toLowerCase()) || this.isOptionLabel((oi.category || "").toLowerCase());
                  if (!oiIsOptionKeyword) {
                    oiLabel = oiLabel
                      .split("+")
                      .map((p) => this.cleanLabel(p.trim()))
                      .filter((p) => p && !this.isOptionLabel(p))
                      .join(" + ");
                  }
                }
                const oiLower = oiLabel.toLowerCase();
                const oiMatchesPack =
                  nomPack.toLowerCase().includes(oiLower) ||
                  oiLower.includes(nomPack.toLowerCase()) ||
                  (originalPackStr &&
                    (originalPackStr.toLowerCase().includes(oiLower) ||
                      oiLower.includes(originalPackStr.toLowerCase())));

                if (
                  oiLabel &&
                  !oiMatchesPack &&
                  (oiType === "PRODUCT" ||
                    oiType === "OPTION" ||
                    oi.category?.toLowerCase().includes("option") ||
                    oi.category?.toLowerCase().includes("produit") ||
                    !oi.start_at) &&
                  oiType !== "VOUCHER"
                ) {
                  // Fallback: si pas d'ID, on génère un hash basé sur le label pour ne pas tout accumuler aveuglément
                  // à chaque boucle (7 webhooks = 7 accumulations)
                  const itemHash =
                    oi.id || oi.order_item_id || `hash_${oiLabel}_${oi.qty}`;
                  addOption(oiLabel, oi.qty, itemHash);
                }
              });
            }
          };
          checkItems(act.raw_payload.order?.items);
          checkItems(act.raw_payload.order?.order_items);
          checkItems(act.raw_payload.items);
          checkItems(act.raw_payload.options);
          checkItems(act.raw_payload.products);
        }
      });

      const options = Array.from(optionsMap.entries()).map(([label, qty]) => {
        return `${qty} x ${label}`;
      });
      // 8. Sous-compte enfant anniversaire (si réservation anniversaire)
      let enfantAnniversaire = null;
      if (categories.some(c => c.includes("anniv"))) {
        const allSubclients = [];
        group.forEach((act) => {
          if (Array.isArray(act.subclients)) {
            act.subclients.forEach((sc) => allSubclients.push(sc));
          } else if (act.client?.sub_clients && Array.isArray(act.client.sub_clients)) {
            act.client.sub_clients.forEach((sc) => allSubclients.push(sc));
          } else if (act.raw_payload && Array.isArray(act.raw_payload.subclients)) {
            act.raw_payload.subclients.forEach((sc) => allSubclients.push(sc));
          } else if (
            act.raw_payload?.client?.sub_clients &&
            Array.isArray(act.raw_payload.client.sub_clients)
          ) {
            act.raw_payload.client.sub_clients.forEach((sc) =>
              allSubclients.push(sc),
            );
          }
        });

        if (allSubclients.length > 0) {
          const targetDateObj = new Date(dateStr);
          let bestChild = allSubclients[0];
          let bestDist = 9999;

          allSubclients.forEach((sc) => {
            if (sc.birthday_at || sc.birthdate) {
              const bDate = new Date(sc.birthday_at || sc.birthdate);
              const dist = Math.abs(
                (bDate.getMonth() - targetDateObj.getMonth()) * 30 +
                  (bDate.getDate() - targetDateObj.getDate()),
              );
              if (dist < bestDist) {
                bestDist = dist;
                bestChild = sc;
              }
            }
          });

          let age = bestChild.age || bestChild.age_years || "";
          if (!age && (bestChild.birthday_at || bestChild.birthdate || bestChild.date_naissance)) {
            const bDate = new Date(
              bestChild.birthday_at || bestChild.birthdate || bestChild.date_naissance,
            );
            if (!isNaN(bDate.getTime())) {
              let calcAge = targetDateObj.getFullYear() - bDate.getFullYear();
              const m = targetDateObj.getMonth() - bDate.getMonth();
              if (m < 0 || (m === 0 && targetDateObj.getDate() < bDate.getDate())) calcAge--;
              age = calcAge;
            }
          }

          enfantAnniversaire = {
            prenom:
              bestChild.firstname ||
              bestChild.prenom ||
              bestChild.name ||
              bestChild.lastname ||
              "???",
            age: age && !isNaN(Number(age)) ? Number(age) : age || "???",
            dateNaissance:
              (bestChild.birthday_at || bestChild.birthdate || "").split(
                "T",
              )[0] || null,
            sousCompteId: bestChild.id || null,
          };
        } else {
          for (const act of group) {
            const ext = this.extractBirthdayChildInfo(
              act.raw_payload || act,
              categories,
            );
            if (ext) {
              enfantAnniversaire = ext;
              break;
            }
          }
        }
        if (!enfantAnniversaire) {
          enfantAnniversaire = {
            prenom: "???",
            age: "???",
            dateNaissance: null,
            sousCompteId: null,
          };
        }
      }

      bookings.push({
        id: `QW-${oid}`,
        nom,
        prenom,
        societe,
        heureArrivee,
        heureDepart,
        nbPersonnes,
        nomPack,
        typeActivite: group[0].category || "Activité Qweekle",
        categories,
        enfantAnniversaire,
        activites,
        options,
        qweekleNote,
        qweekleInternalNote,
      });
    });

    // Trier les réservations par heure d'arrivée chronologique puis regrouper les doublons (adulte + enfant même heure)
    bookings.sort((a, b) => a.heureArrivee.localeCompare(b.heureArrivee));
    return this.mergeDuplicateClientBookings(bookings);
  }

  computePackLabelFromActivities(group, fallbackLabel) {
    if (!group || group.length === 0) return fallbackLabel;

    // 1. Détection des packs standards basés sur les activités (ignorer les produits)
    const mainActs = group.filter((a) => {
      const typeRaw = (a.raw_payload?.type || a.type || "").toUpperCase();
      return (
        typeRaw !== "PRODUCT" && typeRaw !== "OPTION" && typeRaw !== "PACK"
      );
    });

    // Filtrer les activités d'accueil ou de table
    const filteredActs = mainActs.filter((a) => {
      const l = (a.nom || a.label || "").toLowerCase();
      return !l.includes("accueil") && !l.includes("table réservée");
    });

    const actLabels = filteredActs.map((a) =>
      (a.label || a.nom || "").toLowerCase(),
    );

    if (!filteredActs.length) {
      return (
        fallbackLabel || group[0].nom || group[0].label || "Réservation Qweekle"
      );
    }

    // Vérifier si toutes les activités principales sont du Laser Game
    const allLaser = mainActs.every((a) => {
      const l = (a.nom || a.label || "").toLowerCase();
      return l.includes("laser");
    });

    if (allLaser) {
      let totalMin = 0;
      mainActs.forEach((a) => {
        let dur = Number(a.duration);
        if (!dur || isNaN(dur)) {
          const [sH, sM] = (a.heureDebut || "00:00").split(":").map(Number);
          const [eH, eM] = (a.heureFin || "00:00").split(":").map(Number);
          dur = eH * 60 + eM - (sH * 60 + sM);
        }
        totalMin += dur > 0 ? dur : 20;
      });

      if (totalMin > 0) {
        const firstLabel =
          mainActs[0].nom || mainActs[0].label || fallbackLabel || "";
        if (
          firstLabel.toLowerCase().includes("7-12") ||
          firstLabel.toLowerCase().includes("enfant") ||
          (fallbackLabel || "").toLowerCase().includes("enfant")
        ) {
          return `${totalMin} Min Laser Games | Enfant 7-12ans`;
        } else if (
          firstLabel.toLowerCase().includes("adulte") ||
          firstLabel.toLowerCase().includes("+18") ||
          (fallbackLabel || "").toLowerCase().includes("adulte")
        ) {
          return `${totalMin} Min Laser Games | Adulte +18ans`;
        } else {
          return `${totalMin} Min Laser Games`;
        }
      }
    }

    // Si ce n'est pas uniquement du Laser Game (ex: 1 Heure de Team Games + 20 Min Laser Game 7-12 ans)
    // Récupérer les noms distincts
    const distinctNames = [];
    filteredActs.forEach((a) => {
      let n = (a.nom || a.label || "").replace(/▶\s*/g, "").trim();
      if (n && !distinctNames.includes(n)) {
        distinctNames.push(n);
      }
    });

    if (distinctNames.length > 0) {
      return distinctNames.join(" + ");
    }

    return fallbackLabel || "Réservation Qweekle";
  }

  splitBookingsBySessions(list) {
    if (!list || !list.length) return [];
    const splitList = [];

    list.forEach((booking) => {
      if (!booking.activites || booking.activites.length <= 1) {
        splitList.push(booking);
        return;
      }

      // Trier les activités par heure chronologique
      const sortedActs = [...booking.activites].sort((a, b) =>
        (a.heureDebut || "").localeCompare(b.heureDebut || ""),
      );
      const sessions = [];
      let currentSession = [sortedActs[0]];

      for (let i = 1; i < sortedActs.length; i++) {
        const prev = currentSession[currentSession.length - 1];
        const curr = sortedActs[i];

        const [pEndH, pEndM] = (prev.heureFin || "00:00")
          .split(":")
          .map(Number);
        const prevEndMin = pEndH * 60 + pEndM;

        const [cStartH, cStartM] = (curr.heureDebut || "00:00")
          .split(":")
          .map(Number);
        const currStartMin = cStartH * 60 + cStartM;

        const gap = currStartMin - prevEndMin;
        const isNewAccueil =
          (curr.nom || "").toLowerCase().includes("accueil") && gap >= 30;

        const isCurrentSessionOnlyAccueil = currentSession.every((a) =>
          (a.nom || "").toLowerCase().includes("accueil"),
        );

        // Si l'écart entre la fin de l'activité précédente et le début de la nouvelle est >= 90 min, on scinde.
        // CEPENDANT, on ne scinde pas si la session actuelle n'est composée QUE d'un accueil (il doit être relié aux activités suivantes).
        // Si la nouvelle activité est AUSSI un accueil (isNewAccueil), on scinde quand même car c'est un groupe différent.
        if ((gap >= 90 && !isCurrentSessionOnlyAccueil) || isNewAccueil) {
          sessions.push(currentSession);
          currentSession = [curr];
        } else {
          currentSession.push(curr);
        }
      }
      sessions.push(currentSession);

      if (sessions.length === 1) {
        splitList.push(booking);
      } else {
        // Plusieurs sessions distinctes sur la journée sous le même nom
        sessions.forEach((sessActs, idx) => {
          const firstAct = sessActs[0];
          const lastAct = sessActs[sessActs.length - 1];
          const hArr = firstAct.heureDebut || booking.heureArrivee;
          const hDep = lastAct.heureFin || booking.heureDepart;

          const arrivActs = sessActs.filter(
            (a) =>
              (a.nom || "").toLowerCase().includes("accueil") ||
              (a.zone || "").toLowerCase().includes("arrivées") ||
              (a.type || "").toLowerCase().includes("accueil"),
          );
          let totalArrivees = 0;
          if (arrivActs.length > 0) {
            totalArrivees = arrivActs.reduce(
              (sum, a) => sum + (Number(a.nbPersonnes) || Number(a.qty) || 0),
              0,
            );
          }
          const maxActPers = Math.max(
            ...sessActs.map((a) => Number(a.nbPersonnes) || Number(a.qty) || 0),
            1,
          );
          const sessNbPers = Math.max(totalArrivees, maxActPers);
          const sessionPack =
            booking.nomPack ||
            this.computePackLabelFromActivities(sessActs, booking.nomPack);

          splitList.push({
            ...booking,
            id: `${booking.id || "QW"}-S${idx + 1}`,
            heureArrivee: hArr,
            heureDepart: hDep,
            nbPersonnes: sessNbPers,
            nomPack: sessionPack || `${booking.nomPack} (Session ${idx + 1})`,
            activites: sessActs,
            isSplit: true,
          });
        });
      }
    });

    return splitList;
  }

  mergeDuplicateClientBookings(list) {
    if (!list || !list.length) return [];

    // 1. D'abord, séparer en sous-réservations distinctes les dossiers qui ont plusieurs arrivées/sessions dans la journée (écart >= 60 min ou nouvel Accueil > 30 min)
    const splitList = this.splitBookingsBySessions(list);

    // 2. Trier par heure d'arrivée d'abord
    const sorted = [...splitList].sort((a, b) =>
      (a.heureArrivee || "00:00").localeCompare(b.heureArrivee || "00:00"),
    );
    const merged = [];

    sorted.forEach((booking) => {
      const cleanNom = (booking.nom || "CLIENT").trim().toUpperCase();

      // Chercher si une réservation existante dans merged a le même nom et une heure d'arrivée proche (<= 30 min)
      let match = null;
      if (cleanNom !== "CLIENT" && !cleanNom.startsWith("CLIENT (")) {
        const [bH, bM] = (booking.heureArrivee || "00:00")
          .split(":")
          .map(Number);
        const bookingMin = bH * 60 + bM;

        for (const existing of merged) {
          const existingNom = (existing.nom || "").trim().toUpperCase();
          if (existingNom === cleanNom) {
            const [eH, eM] = (existing.heureArrivee || "00:00")
              .split(":")
              .map(Number);
            const existingMin = eH * 60 + eM;
            if (Math.abs(bookingMin - existingMin) <= 30) {
              match = existing;
              break;
            }
          }
        }
      }

      if (!match) {
        // Pas de doublon trouvé, on ajoute une copie propre de la réservation
        merged.push({
          ...booking,
          categories: Array.isArray(booking.categories)
            ? [...booking.categories]
            : [],
          activites: Array.isArray(booking.activites)
            ? booking.activites.map((a) => ({ ...a }))
            : [],
          options: Array.isArray(booking.options) ? [...booking.options] : [],
        });
      } else {
        // Fusionner avec la réservation existante (match) !
        // 1. Fusion des IDs
        const existingIds = match.id.split(" + ");
        if (!existingIds.includes(booking.id)) {
          match.id = `${match.id} + ${booking.id}`;
        }

        // 2. Fusion des Prénoms
        const prenomsSet = new Set(
          match.prenom
            ? match.prenom
                .split(" & ")
                .map((p) => p.trim())
                .filter(Boolean)
            : [],
        );
        if (booking.prenom) {
          booking.prenom.split(" & ").forEach((p) => {
            const cp = p.trim();
            if (cp) prenomsSet.add(cp);
          });
        }
        match.prenom = Array.from(prenomsSet).join(" & ");

        // 3. Fusion des Sociétés
        const socSet = new Set(
          match.societe
            ? match.societe
                .split(" / ")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        );
        if (booking.societe) {
          booking.societe.split(" / ").forEach((s) => {
            const cs = s.trim();
            if (cs) socSet.add(cs);
          });
        }
        match.societe = Array.from(socSet).join(" / ");

        // 4. Heure d'arrivée = le plus tôt, Heure de départ = le plus tard
        if (booking.heureArrivee < match.heureArrivee) {
          match.heureArrivee = booking.heureArrivee;
        }
        if (booking.heureDepart > match.heureDepart) {
          match.heureDepart = booking.heureDepart;
        }

        // 5. Somme des personnes
        match.nbPersonnes =
          (Number(match.nbPersonnes) || 0) + (Number(booking.nbPersonnes) || 0);

        // 6. Fusion des Catégories (badges ex: enfant + adulte)
        const catSet = new Set(match.categories || []);
        if (Array.isArray(booking.categories)) {
          booking.categories.forEach((c) => catSet.add(c));
        }
        match.categories = Array.from(catSet);
        match.enfantAnniversaire =
          match.enfantAnniversaire || booking.enfantAnniversaire;

        // 7. Fusion des Options
        const optSet = new Set(match.options || []);
        if (Array.isArray(booking.options)) {
          booking.options.forEach((o) => optSet.add(o));
        }
        match.options = Array.from(optSet);

        // 8. Fusion du Nom de Pack et Type Activité
        const packSet = new Set();
        (match.nomPack || "").split(" + ").forEach((p) => {
          const cp = p.trim();
          if (cp && !cp.toLowerCase().includes("accueil")) packSet.add(cp);
        });
        (booking.nomPack || "").split(" + ").forEach((p) => {
          const cp = p.trim();
          if (cp && !cp.toLowerCase().includes("accueil")) packSet.add(cp);
        });
        const sortedPacks = Array.from(packSet).sort((a, b) => {
          if (
            a.toLowerCase().includes("enfant") &&
            !b.toLowerCase().includes("enfant")
          )
            return -1;
          if (
            !a.toLowerCase().includes("enfant") &&
            b.toLowerCase().includes("enfant")
          )
            return 1;
          return b.localeCompare(a);
        });
        match.nomPack =
          sortedPacks.length > 0
            ? sortedPacks.join(" + ")
            : match.nomPack || booking.nomPack;

        const typeSet = new Set(
          match.typeActivite
            ? match.typeActivite.split(" & ").map((t) => t.trim())
            : [],
        );
        if (booking.typeActivite) {
          booking.typeActivite.split(" & ").forEach((t) => {
            const ct = t.trim();
            if (ct) typeSet.add(ct);
          });
        }
        match.typeActivite = Array.from(typeSet).join(" & ");

        // 9. Enfant anniversaire
        if (!match.enfantAnniversaire && booking.enfantAnniversaire) {
          match.enfantAnniversaire = booking.enfantAnniversaire;
        }

        // 10. Fusion & Dédoublonnage des Activités
        const existingActs = [...(match.activites || [])];
        if (Array.isArray(booking.activites)) {
          booking.activites.forEach((newAct) => {
            const existingMatch = existingActs.find(
              (ea) =>
                ea.heureDebut === newAct.heureDebut &&
                ea.heureFin === newAct.heureFin &&
                (ea.nom || "").trim().toLowerCase() ===
                  (newAct.nom || "").trim().toLowerCase(),
            );
            if (!existingMatch) {
              existingActs.push({ ...newAct });
            } else {
              existingMatch.nbPersonnes =
                (Number(existingMatch.nbPersonnes) || 0) +
                (Number(newAct.nbPersonnes) || 0);
            }
          });
        }
        // Tri chronologique des activités après fusion
        existingActs.sort((a, b) => {
          const cmp = (a.heureDebut || "").localeCompare(b.heureDebut || "");
          if (cmp !== 0) return cmp;
          return (a.nom || "").localeCompare(b.nom || "");
        });
        match.activites = existingActs;
      }
    });

    // Regrouper les activités simultanées et s'assurer que les informations d'anniversaire sont complètes
    merged.forEach((item) => {
      item.activites = this.groupSimultaneousActivities(
        item.activites,
        item.nbPersonnes,
      );
      if (
        item.categories &&
        item.categories.some(c => c.includes("anniv")) &&
        !item.enfantAnniversaire
      ) {
        item.enfantAnniversaire = {
          prenom: "???",
          age: "???",
          dateNaissance: null,
          sousCompteId: null,
        };
      }

      // Mettre à jour l'effectif global (case de gauche) pour qu'il corresponde au maximum entre la somme des arrivées et l'effectif des activités
      const arrivActs = (item.activites || []).filter(
        (a) =>
          (a.nom || "").toLowerCase().includes("accueil") ||
          (a.zone || "").toLowerCase().includes("arrivées") ||
          (a.type || "").toLowerCase().includes("accueil"),
      );
      const totalArrivees = arrivActs.reduce(
        (sum, a) => sum + (Number(a.nbPersonnes) || 0),
        0,
      );
      const maxActPers =
        item.activites && item.activites.length > 0
          ? Math.max(...item.activites.map((a) => Number(a.nbPersonnes) || 0))
          : 0;
      const finalNb = Math.max(
        totalArrivees,
        maxActPers,
        Number(item.nbPersonnes) || 1,
      );
      if (finalNb > 0) {
        item.nbPersonnes = finalNb;
      }
    });

    return merged;
  }

  groupSimultaneousActivities(activites, fallbackQty = 1) {
    if (!activites || !activites.length) return [];

    const groupedMap = new Map();

    activites.forEach((act) => {
      const hDebut = act.heureDebut || "";
      const hFin = act.heureFin || "";
      const zone = (act.zone || "Salle de jeu").trim();
      const key = `${hDebut}_${hFin}_${zone.toLowerCase()}`;

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          heureDebut: hDebut,
          heureFin: hFin,
          zone: zone,
          noms: [(act.nom || "").trim()],
          ids: act.id ? [act.id] : [],
          nbPersonnes: Number(act.nbPersonnes) || Number(fallbackQty) || 1,
        });
      } else {
        const existing = groupedMap.get(key);
        const cleanNom = (act.nom || "").trim();
        if (!existing.noms.includes(cleanNom)) {
          existing.noms.push(cleanNom);
        }
        if (act.id && !existing.ids.includes(act.id)) {
          existing.ids.push(act.id);
        }
        const newQty = Number(act.nbPersonnes) || Number(fallbackQty) || 1;
        const currentQty = Number(existing.nbPersonnes) || 0;
        
        // Si les quantités sont identiques, c'est probablement un doublon généré par Qweekle
        // (ex: un client achète 2 packs pour les mêmes 10 personnes, Qweekle génère 2 'Accueil' de 10)
        // Si les quantités sont différentes, c'est probablement un ajout (ex: 10 personnes + 2 ajoutées plus tard)
        if (currentQty === newQty) {
          existing.nbPersonnes = Math.max(currentQty, newQty);
        } else {
          existing.nbPersonnes = currentQty + newQty;
        }
      }
    });

    const result = [];
    groupedMap.forEach((item) => {
      let combinedNom = item.noms[0];
      if (item.noms.length > 1) {
        // Si plusieurs noms sur le même créneau ex: "20 Min Laser Game | Adulte +18 ans" et "20 Min Laser Game 7-12 ans"
        const hasAdulte = item.noms.some(
          (n) =>
            n.toLowerCase().includes("adulte") ||
            n.toLowerCase().includes("+18"),
        );
        const hasEnfant = item.noms.some(
          (n) =>
            n.toLowerCase().includes("7-12") ||
            n.toLowerCase().includes("enfant"),
        );
        const hasLaser = item.noms.some((n) =>
          n.toLowerCase().includes("laser"),
        );

        if (hasLaser && hasAdulte && hasEnfant) {
          combinedNom = "20 Min Laser Game | Adulte & Enfant";
        } else if (hasLaser && item.noms.length > 1) {
          combinedNom =
            "20 Min Laser Game (" +
            item.noms
              .map((n) => n.replace(/20 Min Laser Game\s*(\|\s*)?/i, "").trim())
              .filter(Boolean)
              .join(" & ") +
            ")";
        } else {
          combinedNom = item.noms.join(" + ");
        }
      }
      result.push({
        id: item.ids && item.ids.length > 0 ? item.ids.join(',') : undefined,
        heureDebut: item.heureDebut,
        heureFin: item.heureFin,
        zone: item.zone,
        nom: combinedNom,
        nbPersonnes: item.nbPersonnes,
      });
    });

    result.sort((a, b) => {
      const cmp = (a.heureDebut || "").localeCompare(b.heureDebut || "");
      if (cmp !== 0) return cmp;
      return (a.nom || "").localeCompare(b.nom || "");
    });

    return result;
  }

  parseRawQweekleBookings(rawBookings, dateStr) {
    // Transformation des données brutes Qweekle vers notre format complet multi-occurrences
    const bookingsMap = {};

    rawBookings.forEach((item) => {
      const orderId = item.sale_item_id || item.id;
      if (!bookingsMap[orderId]) {
        // Déduire les informations client
        let nom = "Client";
        let prenom = "Qweekle";
        let societe = "";

        if (item.client) {
          nom = (
            item.client.lastname ||
            item.client.society ||
            "Client"
          ).toUpperCase();
          prenom = item.client.firstname || "";
          societe = item.client.society || "";
        } else if (item.order && item.order.client) {
          nom = (
            item.order.client.lastname ||
            item.order.client.society ||
            "Client"
          ).toUpperCase();
          prenom = item.order.client.firstname || "";
          societe = item.order.client.society || "";
        }

        // Déduire le nom du pack
        let nomPack = item.activity || "Réservation Qweekle";
        if (item.order && item.order.label) {
          nomPack = item.order.label;
        } else if (item.agenda && item.agenda.short_description) {
          nomPack = item.agenda.short_description;
        }

        // Heures d'arrivée et de départ globales par défaut pour ce dossier
        let heureArrivee = "10:00";
        let heureDepart = "12:00";
        if (item.agenda) {
          if (item.agenda.convoc_start_at) {
            heureArrivee = new Date(
              item.agenda.convoc_start_at,
            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          } else if (item.agenda.start_at) {
            heureArrivee = new Date(item.agenda.start_at).toLocaleTimeString(
              [],
              { hour: "2-digit", minute: "2-digit" },
            );
          }
          if (item.agenda.convoc_end_at) {
            heureDepart = new Date(
              item.agenda.convoc_end_at,
            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          } else if (item.agenda.end_at) {
            heureDepart = new Date(item.agenda.end_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          }
        }

        const detectedCats = this.detectQweekleCategories(
          nom,
          societe,
          nomPack,
          item.activity,
        );
        const enfantInfo = this.extractBirthdayChildInfo(item, detectedCats);

        bookingsMap[orderId] = {
          id: `QW-${item.id || orderId}`,
          nom: nom,
          prenom: prenom,
          societe: societe,
          heureArrivee: heureArrivee,
          heureDepart: heureDepart,
          nbPersonnes: item.qty || (item.agenda ? item.agenda.qty_pax : 1),
          nomPack: nomPack,
          typeActivite: item.type || "Activité",
          categories: detectedCats,
          enfantAnniversaire: enfantInfo,
          activites: [],
          options: [],
        };
      }

      // Si l'information anniversaire enfant n'a pas été trouvée sur la première occurrence, tenter sur la courante
      if (
        !bookingsMap[orderId].enfantAnniversaire &&
        bookingsMap[orderId].categories.some(c => c.includes("anniv"))
      ) {
        bookingsMap[orderId].enfantAnniversaire = this.extractBirthdayChildInfo(
          item,
          bookingsMap[orderId].categories,
        );
      }

      // Ajouter chaque activité (occurrence) du dossier
      let hDebut = "10:00";
      let hFin = "11:00";
      let actName = item.activity || "Activité";
      let actZone =
        item.agenda && item.agenda.location
          ? item.agenda.location.label || item.agenda.location
          : "Zone Générale";

      if (item.agenda) {
        if (item.agenda.start_at) {
          hDebut = new Date(item.agenda.start_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
        if (item.agenda.end_at) {
          hFin = new Date(item.agenda.end_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      }

      bookingsMap[orderId].activites.push({
        id: `QW-${item.id}`,
        heureDebut: hDebut,
        heureFin: hFin,
        nom: actName,
        zone:
          typeof actZone === "string"
            ? actZone
            : actZone.label || "Salle / Arène",
        nbPersonnes:
          Number(item.qty) ||
          Number(item.quantity) ||
          Number(item.client?.qty) ||
          Number(bookingsMap[orderId].nbPersonnes) ||
          1,
      });

      // Extraire les options/produits supplémentaires si présents
      if (item.order && item.order.items) {
        item.order.items.forEach((oi) => {
          if (oi.label && !bookingsMap[orderId].options.includes(oi.label)) {
            bookingsMap[orderId].options.push(oi.label);
          }
        });
      }
    });

    Object.values(bookingsMap).forEach((booking) => {
      if (
        booking.categories &&
        booking.categories.some(c => c.includes("anniv")) &&
        !booking.enfantAnniversaire
      ) {
        booking.enfantAnniversaire = {
          prenom: "???",
          age: "???",
          dateNaissance: null,
          sousCompteId: null,
        };
      }
    });

    return this.mergeDuplicateClientBookings(Object.values(bookingsMap));
  }

  extractBirthdayChildInfo(item, categories) {
    if (!categories.some(c => c.includes("anniv"))) return null;

    // 1. Chercher directement un sous-compte dans l'objet de réservation / commande
    const sc =
      item.sub_client ||
      item.child ||
      item.beneficiary ||
      (item.order &&
        (item.order.sub_client || item.order.beneficiary || item.order.child));
    if (sc) {
      let age = sc.age || sc.age_years || "";
      if (!age && (sc.birthdate || sc.birthday_at || sc.date_naissance)) {
        const bDate = new Date(sc.birthdate || sc.birthday_at || sc.date_naissance);
        if (!isNaN(bDate.getTime())) {
           const eventDate = item.start_at ? new Date(item.start_at) : new Date();
           let calcAge = eventDate.getFullYear() - bDate.getFullYear();
           const m = eventDate.getMonth() - bDate.getMonth();
           if (m < 0 || (m === 0 && eventDate.getDate() < bDate.getDate())) calcAge--;
           age = calcAge;
        }
      }
      return {
        prenom: sc.firstname || sc.prenom || sc.name || "???",
        age: age && !isNaN(Number(age)) ? Number(age) : age || "???",
        dateNaissance:
          (sc.birthdate || sc.date_naissance || "").split("T")[0] || null,
        sousCompteId: sc.id || sc.client_id || sc.sub_client_id || null,
      };
    }

    // 2. Chercher dans la liste des sous-comptes du client principal (sub_clients / children)
    const parentClient = item.client || (item.order && item.order.client);
    if (
      parentClient &&
      (parentClient.sub_clients ||
        parentClient.children ||
        parentClient.contacts)
    ) {
      const list =
        parentClient.sub_clients ||
        parentClient.children ||
        parentClient.contacts;
      if (Array.isArray(list) && list.length > 0) {
        const firstChild = list[0];
        let age = firstChild.age || firstChild.age_years || "";
        if (!age && (firstChild.birthdate || firstChild.birthday_at || firstChild.date_naissance)) {
          const bDate = new Date(firstChild.birthdate || firstChild.birthday_at || firstChild.date_naissance);
          if (!isNaN(bDate.getTime())) {
             const eventDate = item.start_at ? new Date(item.start_at) : new Date();
             let calcAge = eventDate.getFullYear() - bDate.getFullYear();
             const m = eventDate.getMonth() - bDate.getMonth();
             if (m < 0 || (m === 0 && eventDate.getDate() < bDate.getDate())) calcAge--;
             age = calcAge;
          }
        }
        return {
          prenom:
            firstChild.firstname ||
            firstChild.prenom ||
            firstChild.name ||
            "???",
          age: age && !isNaN(Number(age)) ? Number(age) : age || "???",
          dateNaissance:
            (firstChild.birthdate || firstChild.date_naissance || "").split(
              "T",
            )[0] || null,
          sousCompteId: firstChild.id || firstChild.client_id || null,
        };
      }
    }

    // 3. Extraction depuis les métadonnées, notes ou libellés
    const textToSearch = `${item.order && item.order.notes ? item.order.notes : ""} ${item.activity || ""} ${item.agenda && item.agenda.title ? item.agenda.title : ""}`;
    const matchAge = textToSearch.match(/\b(\d{1,2})\s*ans?\b/i);
    let matchName = textToSearch.match(/Anniversaire\s+([A-ZÉÈÀa-zéèà-]+)/i);
    const forbiddenWords = [
      "laser",
      "game",
      "games",
      "enfant",
      "enfants",
      "space",
      "gravity",
      "formule",
      "pack",
      "ado",
      "ados",
      "junior",
      "juniors",
      "de",
      "du",
      "des",
      "le",
      "la",
      "les",
      "party",
    ];
    let prenomFound = "???";
    if (
      matchName &&
      matchName[1] &&
      !forbiddenWords.includes(matchName[1].toLowerCase())
    ) {
      prenomFound = matchName[1];
    }

    if (prenomFound !== "???" || matchAge) {
      return {
        prenom: prenomFound,
        age: matchAge ? parseInt(matchAge[1], 10) : "???",
        dateNaissance: null,
        sousCompteId: null,
      };
    }

    return null;
  }

  detectQweekleCategories(nom, societe, pack, activity) {
    const fullStr = `${nom} ${societe} ${pack} ${activity}`.toLowerCase();
    const cats = [];

    // Enfant: 7-12 ans, enfant, junior
    if (/\b(enfant|enfants|7\s*-\s*12|junior|juniors)\b/i.test(fullStr)) {
      cats.push("enfant");
    }

    // Ado: 13-18 ans, ado, ados, adolescent, teen (regex \b pour ne pas matcher "mikado")
    if (
      /\b(ado|ados|adolescent|adolescents|13\s*-\s*18|teen|teens)\b/i.test(
        fullStr,
      )
    ) {
      cats.push("ado");
    }

    // Adulte: +18 ans, 18+, adulte, adultes, senior
    if (
      /\b(adulte|adultes|senior|seniors)\b/i.test(fullStr) ||
      /(?:\+\s*18|18\s*\+)/.test(fullStr)
    ) {
      cats.push("adulte");
    }

    // Anniversaire: anniversaire, birthday
    if (/\b(anniversaire|birthday)\b/i.test(fullStr) || /\banniv/i.test(fullStr)) {
      cats.push("anniversaire");
    }

    // Team building: team building (strict pour ne pas matcher "team games"), entreprise, séminaire, challenge entreprise
    if (
      /\b(team\s+building|s[eéè]minaire|s[eéè]minaires|entreprise|entreprises|collaborateur|collaborateurs|teambuilding)\b/i.test(
        fullStr,
      )
    ) {
      cats.push("team building");
    }

    // Évènement adulte: évènement, soirée privée, gala, cocktail
    if (
      /(?:^|[\s/|-])([eéè]v[eéè]nement|soir[eéè]e\s+priv[eéè]e|gala|cocktail)\b/i.test(fullStr)
    ) {
      cats.push("évènement adulte");
    }

    // ASBL / Association: asbl, association, école, ecole, centre de jeunesse, centre de loisirs, maison de jeunes, mj
    if (
      /(?:^|[\s/|-])(asbl|association|[eéè]cole|centre\s+de\s+jeunesse|centre\s+de\s+loisirs|maison\s+de\s+jeunes|mj)\b/i.test(
        fullStr,
      )
    ) {
      cats.push("asbl");
    }

    // Correction majeure: Si c'est un anniversaire d'enfant, on retire les tags adultes erronés
    // (ex: si le client est de type "entreprise", ça déclenchait "team building" à tort)
    if (cats.includes("enfant") && cats.includes("anniversaire")) {
       const tbIndex = cats.indexOf("team building");
       if (tbIndex > -1) cats.splice(tbIndex, 1);
       
       const eaIndex = cats.indexOf("évènement adulte");
       if (eaIndex > -1) cats.splice(eaIndex, 1);
       
       const adIndex = cats.indexOf("adulte");
       if (adIndex > -1) cats.splice(adIndex, 1);
    }

    if (cats.length === 0) {
      cats.push("adulte"); // Par défaut si non spécifié
    }
    return cats;
  }
}

// Instance globale singleton
const appState = new AppStateManager();

if (typeof module !== "undefined") {
  module.exports = appState;
}
