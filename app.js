/**
 * Logique Principale de l'Application - Organisation Space Fun Games
 * Thème Beige Chaleureux / Mode Clair (Aucun Gris)
 * Plannings Classiques & Synchronisation Globale
 */

// Mois en français pour affichage convivial
const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const DAYS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

// Mois courant affiché sur le calendrier central de l'accueil
let calendarDisplayYear = new Date().getFullYear();
let calendarDisplayMonth = new Date().getMonth();

// Onglet actif actuel
let currentActiveTab = "home";

// ============================================================================
// 1. INITIALISATION AU CHARGEMENT DE LA PAGE
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initNavigation();
  initDateController();
  initModals();

  // S'abonner aux changements d'état
  appState.onDateChange((newDate) => {
    updateHeaderDateDisplay(newDate);
    renderCalendar();
    renderCurrentView();
  });

  appState.onAuthChange((isAuth) => {
    if (isAuth) {
      document.getElementById("login-modal").style.display = "none";
      document.getElementById("app-header").style.display = "flex";
      document.getElementById("app-content").style.display = "block";
      updateHeaderDateDisplay(appState.currentDate);
      renderCalendar();
      renderCurrentView();
    } else {
      document.getElementById("login-modal").style.display = "flex";
      document.getElementById("app-header").style.display = "none";
      document.getElementById("app-content").style.display = "none";
    }
  });

  // Vérifier l'état initial
  if (appState.isAuthenticated) {
    appState.notifyAuthChange();
  } else {
    document.getElementById("password-input").focus();
  }
});

// ============================================================================
// 2. AUTHENTIFICATION SÉCURISÉE (Web Crypto API & Mot de passe 1503)
// ============================================================================
function initAuth() {
  const loginForm = document.getElementById("login-form");
  const passwordInput = document.getElementById("password-input");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("btn-logout");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pwd = passwordInput.value.trim();
    if (!pwd) return;

    // Vérification directe avec RAW_PASSWORD (1503) ou vérification SHA-256
    if (pwd === CONFIG.RAW_PASSWORD) {
      loginError.textContent = "";
      passwordInput.value = "";
      appState.setAuthenticated(true);
      return;
    }

    // Calcul du hash SHA-256 si la vérification directe échoue
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pwd);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (hashHex === CONFIG.PASSWORD_HASH_SHA256) {
        loginError.textContent = "";
        passwordInput.value = "";
        appState.setAuthenticated(true);
      } else {
        loginError.textContent =
          "❌ Mot de passe incorrect. Veuillez réessayer.";
        passwordInput.select();
      }
    } catch (err) {
      loginError.textContent =
        "❌ Erreur de vérification. Essayez de retaper le mot de passe.";
    }
  });

  logoutBtn.addEventListener("click", () => {
    if (confirm("Voulez-vous vraiment verrouiller la session ?")) {
      appState.setAuthenticated(false);
    }
  });
}

// ============================================================================
// 3. NAVIGATION ENTRE LES ONGLET & ROUTAGE SPA
// ============================================================================
function initNavigation() {
  const tabButtons = document.querySelectorAll(".nav-tab");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  currentActiveTab = tabId;
  appState.currentTab = tabId === "complet" ? "planning-complet" : tabId;

  // Mise à jour des boutons
  document.querySelectorAll(".nav-tab").forEach((btn) => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Mise à jour des sections de vue
  document.querySelectorAll(".view-section").forEach((sec) => {
    if (sec.id === `view-${tabId}`) {
      sec.classList.add("active");
    } else {
      sec.classList.remove("active");
    }
  });

  // Rendu spécifique de la vue
  renderCurrentView();
}

function renderCurrentView() {
  switch (currentActiveTab) {
    case "home":
      renderHomeDashboard();
      break;
    case "complet":
      renderPlanningComplet();
      break;
    case "anniversaire":
      renderClassicPlanning(
        "anniversaire",
        "tbody-anniversaire",
        "subtitle-anniversaire",
      );
      break;
    case "laser":
      renderClassicPlanning("laser", "tbody-laser", "subtitle-laser");
      break;
    case "team":
      renderClassicPlanning("team", "tbody-team", "subtitle-team");
      break;
    case "quiz":
      renderClassicPlanning("quiz", "tbody-quiz", "subtitle-quiz");
      break;
    case "postit":
      renderPostIts();
      break;
  }
}

// ============================================================================
// 4. CONTRÔLE DE LA DATE ET DU CALENDRIER
// ============================================================================
function initDateController() {
  const prevBtn = document.getElementById("date-prev-btn");
  const nextBtn = document.getElementById("date-next-btn");
  const todayBtn = document.getElementById("date-today-btn");
  const dateInput = document.getElementById("header-date-input");

  const calPrevMonth = document.getElementById("cal-prev-month");
  const calNextMonth = document.getElementById("cal-next-month");

  prevBtn.addEventListener("click", () => changeDateByDays(-1));
  nextBtn.addEventListener("click", () => changeDateByDays(1));
  todayBtn.addEventListener("click", () => {
    const todayStr = new Date().toISOString().split("T")[0];
    appState.setDate(todayStr);
    calendarDisplayYear = new Date().getFullYear();
    calendarDisplayMonth = new Date().getMonth();
    renderCalendar();
  });

  dateInput.addEventListener("change", (e) => {
    if (e.target.value) {
      appState.setDate(e.target.value);
      const chosenDate = new Date(e.target.value);
      calendarDisplayYear = chosenDate.getFullYear();
      calendarDisplayMonth = chosenDate.getMonth();
      renderCalendar();
    }
  });

  calPrevMonth.addEventListener("click", () => {
    calendarDisplayMonth--;
    if (calendarDisplayMonth < 0) {
      calendarDisplayMonth = 11;
      calendarDisplayYear--;
    }
    renderCalendar();
  });

  calNextMonth.addEventListener("click", () => {
    calendarDisplayMonth++;
    if (calendarDisplayMonth > 11) {
      calendarDisplayMonth = 0;
      calendarDisplayYear++;
    }
    renderCalendar();
  });
}

function changeDateByDays(daysDelta) {
  const parts = appState.currentDate.split("-");
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + daysDelta);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  appState.setDate(`${yyyy}-${mm}-${dd}`);

  calendarDisplayYear = yyyy;
  calendarDisplayMonth = d.getMonth();
  renderCalendar();
}

function updateHeaderDateDisplay(dateStr) {
  const parts = dateStr.split("-");
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayName = DAYS_FR[d.getDay()];
  const monthName = MONTHS_FR[d.getMonth()];

  document.getElementById("header-date-text").textContent =
    `${dayName} ${d.getDate()} ${monthName} ${d.getFullYear()}`;
  document.getElementById("header-date-input").value = dateStr;

  // Mettre à jour aussi l'intitulé du tableau de bord d'accueil
  const dashTitle = document.getElementById("dashboard-date-title");
  if (dashTitle) {
    dashTitle.textContent = `Synthèse du ${dayName.toLowerCase()} ${d.getDate()} ${monthName.toLowerCase()}`;
  }
}

// Rendu du Calendrier Interactif sur l'Accueil
function renderCalendar() {
  const monthYearEl = document.getElementById("cal-month-year");
  const gridEl = document.getElementById("calendar-dates-grid");
  if (!monthYearEl || !gridEl) return;

  monthYearEl.textContent = `${MONTHS_FR[calendarDisplayMonth]} ${calendarDisplayYear}`;
  gridEl.innerHTML = "";

  // Premier jour du mois (ajustement lundi = 0)
  const firstDay = new Date(calendarDisplayYear, calendarDisplayMonth, 1);
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6; // Dimanche devient index 6

  // Nombre de jours dans le mois
  const daysInMonth = new Date(
    calendarDisplayYear,
    calendarDisplayMonth + 1,
    0,
  ).getDate();

  // Remplir les espaces vides avant le premier jour
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyCell = document.createElement("div");
    gridEl.appendChild(emptyCell);
  }

  // Récupérer toutes les dates qui ont des événements dans localStorage pour mettre un point de repère
  const store = JSON.parse(localStorage.getItem("SFG_EVENTS_STORE") || "{}");

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-day-cell";
    cell.textContent = day;

    const dateStr = `${calendarDisplayYear}-${String(calendarDisplayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (dateStr === appState.currentDate) {
      cell.classList.add("selected");
    }

    const qRes = appState.getQweekleReservationsForDate(dateStr) || [];
    const localEvs = store[dateStr] || [];
    if (qRes.length > 0 || localEvs.length > 0) {
      cell.classList.add("has-events");
    }

    cell.addEventListener("click", () => {
      appState.setDate(dateStr);
    });

    gridEl.appendChild(cell);
  }
}

// ============================================================================
// 5. RENDU DU TABLEAU DE BORD ACCUEIL & STATISTIQUES DÉTAILLÉES
// ============================================================================
function getDetailedDateStats(dateStr) {
  const qweekleRes = appState.getQweekleReservationsForDate(dateStr) || [];
  const localEvents = appState.getEventsForDate(dateStr) || [];

  let totalReservations = 0;
  let totalPersonnes = 0;

  let annivRes = 0,
    annivPers = 0;
  let asblRes = 0,
    asblPers = 0;
  let teamRes = 0,
    teamPers = 0;
  let teamGameRes = 0,
    teamGamePers = 0;
  let laserRes = 0,
    laserPers = 0;
  let quizRes = 0,
    quizPers = 0;

  // 1. Dépouillement Qweekle
  qweekleRes.forEach((r) => {
    totalReservations++;
    const pers = Number(r.nbPersonnes) || 1;
    totalPersonnes += pers;

    const cats = r.categories || [];
    const actType = (r.typeActivite || "").toLowerCase();
    const pack = (r.nomPack || "").toLowerCase();
    const fullTxt =
      `${r.nom || ""} ${r.societe || ""} ${pack} ${actType} ${cats.join(" ")}`.toLowerCase();

    // Anniversaires
    if (
      cats.includes("anniversaire") ||
      actType.includes("anniversaire") ||
      pack.includes("anniv")
    ) {
      annivRes++;
      annivPers += pers;
    }

    // ASBL / Écoles / Associations / Centres
    if (
      cats.includes("asbl") ||
      /\b(asbl|association|école|ecole|centre\s+de\s+jeunesse|centre\s+de\s+loisirs|maison\s+de\s+jeunes|mj)\b/i.test(
        fullTxt,
      )
    ) {
      asblRes++;
      asblPers += pers;
    }

    // Team building / Séminaire d'entreprise
    if (
      cats.includes("team building") ||
      /\b(team\s+building|séminaire|séminaires|entreprise|collaborateur|teambuilding)\b/i.test(
        fullTxt,
      )
    ) {
      teamRes++;
      teamPers += pers;
    }

    // Team Game (Sensas, Prison Island, Action Game, sessions Team Game)
    if (
      cats.includes("team game") ||
      actType.includes("team game") ||
      pack.includes("team game") ||
      pack.includes("prison") ||
      pack.includes("sensas") ||
      actType.includes("prison") ||
      actType.includes("sensas") ||
      (r.activites &&
        r.activites.some(
          (a) =>
            (a.nom || "").toLowerCase().includes("team") ||
            (a.nom || "").toLowerCase().includes("prison") ||
            (a.nom || "").toLowerCase().includes("sensas"),
        ))
    ) {
      teamGameRes++;
      teamGamePers += pers;
    }

    // Laser Game
    if (
      actType.includes("laser") ||
      pack.includes("laser") ||
      (r.activites &&
        r.activites.some((a) => (a.nom || "").toLowerCase().includes("laser")))
    ) {
      laserRes++;
      laserPers += pers;
    }

    // Quiz Game
    if (
      actType.includes("quiz") ||
      pack.includes("quiz") ||
      (r.activites &&
        r.activites.some((a) => (a.nom || "").toLowerCase().includes("quiz")))
    ) {
      quizRes++;
      quizPers += pers;
    }
  });

  // 2. Dépouillement Événements Locaux / Manuels
  localEvents.forEach((ev) => {
    totalReservations++;
    let pers = Number(ev.nbPersonnes);
    if (!pers || isNaN(pers)) {
      const match = `${ev.title || ""} ${ev.notes || ""}`.match(
        /(\d+)\s*(joueurs|enfants|personnes|pers|pax)\b/i,
      );
      pers = match ? parseInt(match[1], 10) : 1;
    }
    totalPersonnes += pers;

    const evType = (ev.type || "").toLowerCase();
    const fullTxt = `${ev.title || ""} ${ev.notes || ""}`.toLowerCase();

    if (evType === "anniversaire" || fullTxt.includes("anniversaire")) {
      annivRes++;
      annivPers += pers;
    }
    if (
      evType === "asbl" ||
      /\b(asbl|association|école|ecole|centre\s+de\s+jeunesse|centre\s+de\s+loisirs|maison\s+de\s+jeunes|mj)\b/i.test(
        fullTxt,
      )
    ) {
      asblRes++;
      asblPers += pers;
    }
    if (
      /\b(team\s+building|séminaire|entreprise|collaborateur|teambuilding)\b/i.test(
        fullTxt,
      )
    ) {
      teamRes++;
      teamPers += pers;
    }
    if (
      evType === "team" ||
      fullTxt.includes("team game") ||
      fullTxt.includes("prison") ||
      fullTxt.includes("sensas")
    ) {
      teamGameRes++;
      teamGamePers += pers;
    }
    if (evType === "laser" || fullTxt.includes("laser")) {
      laserRes++;
      laserPers += pers;
    }
    if (evType === "quiz" || fullTxt.includes("quiz")) {
      quizRes++;
      quizPers += pers;
    }
  });

  return {
    totalReservations,
    totalPersonnes,
    annivRes,
    annivPers,
    asblRes,
    asblPers,
    teamRes,
    teamPers,
    teamGameRes,
    teamGamePers,
    laserRes,
    laserPers,
    quizRes,
    quizPers,
  };
}

function renderHomeDashboard() {
  const listEl = document.getElementById("dashboard-summary-list");
  const countEl = document.getElementById("dashboard-event-count");
  const titleEl = document.getElementById("dashboard-date-title");
  if (!listEl) return;

  // Déclencher une synchro Qweekle en tâche de fond si la date n'est pas encore synchronisée
  appState._autoSyncedDates = appState._autoSyncedDates || {};
  if (!appState._autoSyncedDates[appState.currentDate]) {
    appState._autoSyncedDates[appState.currentDate] = true;
    setTimeout(() => {
      syncQweekleReservations(true);
    }, 10);
  }

  const stats = getDetailedDateStats(appState.currentDate);

  // Mise à jour du titre et du badge de comptage
  const parts = appState.currentDate.split("-");
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const formattedDate = `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;

  if (titleEl) {
    titleEl.textContent = `Synthèse du ${formattedDate}`;
  }
  if (countEl) {
    countEl.style.display = "inline-block";
    countEl.textContent = `${stats.totalReservations} réservation${stats.totalReservations > 1 ? "s" : ""} • ${stats.totalPersonnes} pers.`;
  }

  listEl.innerHTML = `
        <div class="stat-card-compact" style="border-color: var(--border-color);">
            <div class="stat-card-title"><span>📊</span> <span>TOTAL</span></div>
            <div class="stat-card-stats">
                <span class="stat-card-number">${stats.totalReservations} <small style="font-size: 0.62rem; font-weight: 600; color: var(--text-muted);">rés.</small></span>
                <span class="stat-card-pill" style="background: var(--bg-card); color: var(--text-main);">👥 ${stats.totalPersonnes}</span>
            </div>
        </div>
        <div class="stat-card-compact" style="border-color: #D4A373;">
            <div class="stat-card-title"><span>🎂</span> <span>ANNIV.</span></div>
            <div class="stat-card-stats">
                <span class="stat-card-number" style="color: #5E3A1C;">${stats.annivRes} <small style="font-size: 0.62rem; font-weight: 600; color: #8C6A4B;">rés.</small></span>
                <span class="stat-card-pill" style="background: #FDF0D5; color: #5E3A1C;">👥 ${stats.annivPers}</span>
            </div>
        </div>
        <div class="stat-card-compact" style="border-color: #2F855A;">
            <div class="stat-card-title"><span>🏛️</span> <span>ASBL</span></div>
            <div class="stat-card-stats">
                <span class="stat-card-number" style="color: #1C4532;">${stats.asblRes} <small style="font-size: 0.62rem; font-weight: 600; color: #38A169;">rés.</small></span>
                <span class="stat-card-pill" style="background: #E6FFFA; color: #234E52;">👥 ${stats.asblPers}</span>
            </div>
        </div>
        <div class="stat-card-compact" style="border-color: #3182CE;">
            <div class="stat-card-title"><span>🤝</span> <span>TEAM B.</span></div>
            <div class="stat-card-stats">
                <span class="stat-card-number" style="color: #1A4971;">${stats.teamRes} <small style="font-size: 0.62rem; font-weight: 600; color: #4299E1;">rés.</small></span>
                <span class="stat-card-pill" style="background: #E8F4F8; color: #1A4971;">👥 ${stats.teamPers}</span>
            </div>
        </div>
        <div class="stat-card-compact" style="border-color: #DD6B20;">
            <div class="stat-card-title"><span>🏆</span> <span>TEAM G.</span></div>
            <div class="stat-card-stats">
                <span class="stat-card-number" style="color: #7B341E;">${stats.teamGameRes} <small style="font-size: 0.62rem; font-weight: 600; color: #C05621;">rés.</small></span>
                <span class="stat-card-pill" style="background: #FFFAF0; color: #7B341E;">👥 ${stats.teamGamePers}</span>
            </div>
        </div>
        <div class="stat-card-compact" style="border-color: #D9534F;">
            <div class="stat-card-title"><span>🔫</span> <span>LASER</span></div>
            <div class="stat-card-stats">
                <span class="stat-card-number" style="color: #6A1E1A;">${stats.laserRes} <small style="font-size: 0.62rem; font-weight: 600; color: #E53E3E;">rés.</small></span>
                <span class="stat-card-pill" style="background: #FCE8E6; color: #6A1E1A;">👥 ${stats.laserPers}</span>
            </div>
        </div>
        <div class="stat-card-compact" style="border-color: #805AD5;">
            <div class="stat-card-title"><span>🧠</span> <span>QUIZ</span></div>
            <div class="stat-card-stats">
                <span class="stat-card-number" style="color: #442A75;">${stats.quizRes} <small style="font-size: 0.62rem; font-weight: 600; color: #9F7AEA;">rés.</small></span>
                <span class="stat-card-pill" style="background: #F3E8FF; color: #442A75;">👥 ${stats.quizPers}</span>
            </div>
        </div>
    `;

  loadHomeManualNote();
}

// ============================================================================
// 6. RENDU DES PLANNINGS CLASSIQUES (GRILLES DE TABLEAU HORAIRES)
// ============================================================================
function renderClassicPlanning(filterType, tbodyId, subtitleId) {
  const tbody = document.getElementById(tbodyId);
  const subtitle = document.getElementById(subtitleId);
  if (!tbody) return;

  const events = appState.getEventsForDate(appState.currentDate, filterType);

  if (subtitle) {
    const parts = appState.currentDate.split("-");
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    subtitle.textContent = `Planning du ${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} (${events.length} réservation${events.length > 1 ? "s" : ""})`;
  }

  tbody.innerHTML = "";

  // Générer les lignes horaires classiques (de 10h00 à 23h00 par pas de 1h ou demi-heure selon événements)
  for (let hour = CONFIG.HOURS_START; hour <= CONFIG.HOURS_END; hour++) {
    const hourStr = `${String(hour).padStart(2, "0")}:00`;
    const nextHourStr = `${String(hour + 1).padStart(2, "0")}:00`;

    // Trouver les événements qui commencent dans cette tranche horaire
    const matchingEvents = events.filter((ev) => {
      const evHour = parseInt(ev.startHour.split(":")[0], 10);
      return evHour === hour;
    });

    const tr = document.createElement("tr");

    // Colonne Horaire
    const tdTime = document.createElement("td");
    tdTime.className = "time-cell";
    tdTime.textContent = hourStr;
    tr.appendChild(tdTime);

    // Colonne Activités
    const tdContent = document.createElement("td");
    if (matchingEvents.length === 0) {
      tdContent.innerHTML = `<span style="color: rgba(107, 94, 81, 0.4); font-size: 0.85rem; font-style: italic;">Créneau disponible</span>`;
    } else {
      matchingEvents.forEach((ev) => {
        const actInfo = CONFIG.ACTIVITIES[ev.type] || CONFIG.ACTIVITIES.autre;
        const div = document.createElement("div");
        div.className = "activity-card";
        div.style.borderLeftColor = actInfo.colorBorder;
        div.style.backgroundColor = actInfo.colorBg;
        div.style.marginBottom = "8px";

        div.innerHTML = `
                    <div class="activity-info" style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <span class="activity-badge" style="background: var(--bg-card); border-color: ${actInfo.colorBorder}; color: ${actInfo.colorText}; font-size: 0.8rem;">${actInfo.label}</span>
                            <strong style="color: ${actInfo.colorText}; font-size: 1.05rem;">${ev.title}</strong>
                        </div>
                        <p style="margin-top: 4px; color: var(--text-main); font-weight: 500;">⏱ ${ev.startHour} à ${ev.endHour} ${ev.court ? `| 📍 <strong>${ev.court}</strong>` : ""}</p>
                        ${ev.notes ? `<p style="margin-top: 4px; font-size: 0.88rem; color: var(--text-muted); background: rgba(255,255,255,0.6); padding: 4px 8px; border-radius: 4px; display: inline-block;">💬 ${ev.notes}</p>` : ""}
                    </div>
                    <div>
                        <button class="btn-action" onclick="deleteEventItem(${ev.id})" title="Supprimer">🗑️</button>
                    </div>
                `;
        tdContent.appendChild(div);
      });
    }
    tr.appendChild(tdContent);
    tbody.appendChild(tr);
  }
}

// Variable globale pour stocker le filtre de catégorie actif sur la page Planning Complet
let currentQweekleCategoryFilter = "all";

// ============================================================================
// 6bis. RENDU SPÉCIFIQUE DU PLANNING COMPLET (AVEC INTEGRATION API QWEEKLE)
// ============================================================================
function renderPlanningComplet(filterCategory = currentQweekleCategoryFilter) {
  currentQweekleCategoryFilter = filterCategory;
  const container = document.getElementById("qweekle-reservations-container");
  const titleComplet = document.getElementById("title-complet");
  const subtitle = document.getElementById("subtitle-complet");
  if (!container) return;

  // Mettre à jour le sous-titre de la date
  const parts = appState.currentDate.split("-");
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const formattedDate = `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${parts[0]}`;

  if (titleComplet) {
    titleComplet.textContent = `Planning complet - ${formattedDate}`;
  }
  if (subtitle) {
    subtitle.style.display = "none";
  }

  // Récupérer toutes les réservations Qweekle pour cette date
  let reservations = appState.getQweekleReservationsForDate(
    appState.currentDate,
  );

  // Déclencher une synchronisation automatique transparente en tâche de fond si la date n'a pas encore été synchronisée
  appState._autoSyncedDates = appState._autoSyncedDates || {};
  if (!appState._autoSyncedDates[appState.currentDate]) {
    appState._autoSyncedDates[appState.currentDate] = true;
    setTimeout(() => {
      syncQweekleReservations(true);
    }, 10);
  }

  // Filtrage par catégorie
  if (filterCategory !== "all") {
    reservations = reservations.filter(
      (res) => res.categories && res.categories.includes(filterCategory),
    );
  }

  // Mettre à jour l'état visuel des boutons de filtres
  document.querySelectorAll(".qweekle-filter-btn").forEach((btn) => {
    if (btn.getAttribute("data-filter") === filterCategory) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  container.innerHTML = "";

  if (reservations.length === 0) {
    container.innerHTML = `
            <div style="background: var(--bg-card); border: 2px dashed var(--border-color); border-radius: var(--radius-lg); padding: 40px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 12px;">📭</div>
                <h3 style="color: var(--text-main); font-size: 1.3rem; margin-bottom: 8px;">Aucune réservation pour ce filtre / cette journée</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 450px; margin: 0 auto 18px;">
                    Aucun dossier Qweekle correspondant au ${formattedDate}. Cliquez sur le bouton ci-dessous pour lancer une synchronisation vers les serveurs Qweekle.
                </p>
                <button type="button" class="btn-sync" style="margin: 0 auto;" onclick="syncQweekleReservations()">⚡ Synchroniser depuis Qweekle</button>
            </div>
        `;
    return;
  }

  // Trier les réservations par heure d'arrivée
  reservations.sort((a, b) => a.heureArrivee.localeCompare(b.heureArrivee));

  // Dictionnaire de labels & classes pour les catégories
  const catBadgesMap = {
    enfant: { label: "🧒 Enfant (7-12 ans)", className: "badge-enfant" },
    ado: { label: "🧑‍🦱 Ado (13-18 ans)", className: "badge-ado" },
    adulte: { label: "👨 Adulte (+18 ans)", className: "badge-adulte" },
    anniversaire: { label: "🎂 Anniversaire", className: "badge-anniversaire" },
    "team building": { label: "🤝 Team Building", className: "badge-team" },
    "évènement adulte": {
      label: "🥂 Évènement Adulte",
      className: "badge-evenement",
    },
    asbl: { label: "🏛️ ASBL / Association", className: "badge-asbl" },
  };

  reservations.forEach((res) => {
    const card = document.createElement("div");
    card.className = "qweekle-reservation-card";

    // Génération des badges de catégories mis en évidence
    // Formatage d'un ID court pour ne pas surcharger l'en-tête (ex: #a23b6489... + a23bea61...)
    const shortId = (res.id || "")
      .split(" + ")
      .map((idStr) => {
        const clean = idStr.replace(/^QW-/, "").replace(/^OXXX/, "");
        return clean.length > 8 ? clean.slice(0, 8) + "…" : clean;
      })
      .join(" + ");

    // Génération des badges de catégories mis en évidence
    let badgesHtml = "";
    if (res.categories && res.categories.length > 0) {
      res.categories.forEach((cat) => {
        const badgeInfo = catBadgesMap[cat] || {
          label: `🌟 ${cat.toUpperCase()}`,
          className: "badge-adulte",
        };
        badgesHtml += `<span class="qweekle-badge ${badgeInfo.className}">${badgeInfo.label}</span>`;
      });
    } else {
      badgesHtml = `<span class="qweekle-badge badge-adulte">👨 Adulte (+18 ans)</span>`;
    }

    // Génération de la chronologie des activités (Si plusieurs occurrences, les afficher en bandeaux horizontaux ultra compacts)
    let activitesHtml = "";
    if (res.activites && res.activites.length > 0) {
      res.activites.sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
      res.activites.forEach((act) => {
        activitesHtml += `
                    <div class="activity-item-card">
                        <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 140px; flex-wrap: wrap;">
                            <span class="activity-time-pill">⏰ ${act.heureDebut} ➔ ${act.heureFin}</span>
                            <span style="font-weight: 700; font-size: 0.76rem; color: var(--text-main);">${act.nom}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                            <span style="font-size: 0.72rem; font-weight: 700; color: var(--accent-primary); background: var(--bg-main); padding: 1px 6px; border-radius: 3px; border: 1px solid var(--accent-primary);" title="Nombre de personnes pour ce créneau">👥 ${act.nbPersonnes || res.nbPersonnes || 1} pers.</span>
                            <span style="font-size: 0.68rem; color: var(--text-muted); background: var(--bg-main); padding: 1px 5px; border-radius: 3px; border: 1px solid var(--border-light);">📍 ${act.zone || "Salle de jeu"}</span>
                        </div>
                    </div>
                `;
      });
    } else {
      activitesHtml = `<div style="color: var(--text-muted); font-style: italic; font-size: 0.76rem;">Détail des activités non spécifié</div>`;
    }

    // Génération de la liste des options et produits supplémentaires
    let optionsHtml = "";
    const hasOptions = res.options && res.options.length > 0;
    if (hasOptions) {
      optionsHtml = `<ul class="options-list" style="margin: 0; padding: 0;">`;
      res.options.forEach((opt) => {
        optionsHtml += `<li class="option-pill" style="padding: 3px 8px; font-size: 0.76rem;">📦 ${opt}</li>`;
      });
      optionsHtml += `</ul>`;
    } else {
      optionsHtml = `<div style="color: var(--text-muted); font-style: italic; font-size: 0.74rem;">Aucune option supplémentaire</div>`;
    }

    card.innerHTML = `
            <div class="qweekle-card-header">
                <div class="qweekle-badges-group">
                    <span style="font-weight: 700; font-size: 0.74rem; color: var(--text-main); margin-right: 4px;" title="ID complet: #${res.id}">🏷️ #${shortId}</span>
                    ${badgesHtml}
                </div>
                <div class="qweekle-time-badge">
                    <span>⏰ Arrivée : <strong>${res.heureArrivee}</strong></span>
                    <span style="color: var(--border-strong);">|</span>
                    <span>🏁 Départ : <strong>${res.heureDepart}</strong></span>
                </div>
            </div>
            <div class="qweekle-card-body ${hasOptions ? "" : "no-options"}">
                <!-- Colonne 1 : Client & Groupe -->
                <div class="qweekle-column">
                    <div class="qweekle-column-title">👤 Client & Groupe</div>
                    <div class="client-main-name">${res.nom} ${res.prenom || ""}</div>
                    ${res.societe ? `<div class="client-detail-row" style="font-weight: 600; color: var(--accent-secondary);">🏢 ${res.societe}</div>` : ""}
                    <div class="client-detail-row">👥 Personnes : <strong style="font-size: 0.84rem; margin-left: 2px;">${res.nbPersonnes} pers.</strong></div>
                    <div class="client-detail-row">📌 Type : <strong>${res.typeActivite}</strong></div>
                    
                    <div class="pack-highlight">
                        🎁 Pack : <strong style="display: block; margin-top: 1px;">${res.nomPack}</strong>
                    </div>

                    ${
                      (res.categories &&
                        res.categories.includes("anniversaire")) ||
                      res.enfantAnniversaire
                        ? (() => {
                            const ea = res.enfantAnniversaire || {};
                            let p = ea.prenom || "???";
                            if (
                              p === "Enfant fêté" ||
                              p === "Enfant" ||
                              p.trim() === ""
                            )
                              p = "???";
                            let a = ea.age || "???";
                            let aDisplay = "???";
                            if (
                              a !== "???" &&
                              a !== "Non précisé" &&
                              a !== "Âge non précisé" &&
                              a !== "" &&
                              !isNaN(Number(a))
                            ) {
                              aDisplay = `${Number(a)} ans`;
                            } else if (
                              typeof a === "string" &&
                              a.includes("ans")
                            ) {
                              aDisplay = a;
                            }
                            const isUnknown = p === "???" || aDisplay === "???";
                            let dateDisplay = "";
                            if (ea.dateNaissance) {
                              const cleanDate = String(ea.dateNaissance)
                                .split("T")[0]
                                .trim();
                              const parts = cleanDate.split("-");
                              if (parts.length === 3) {
                                dateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
                              } else {
                                dateDisplay = cleanDate;
                              }
                            }
                            return `
                        <div class="birthday-child-banner" style="padding: 5px 8px; margin: 5px 0 2px 0; gap: 6px; background: ${isUnknown ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 152, 0, 0.12)"}; border: 1px solid ${isUnknown ? "rgba(239, 68, 68, 0.35)" : "rgba(255, 152, 0, 0.35)"}; border-radius: 6px; display: flex; align-items: center;">
                            <span class="birthday-cake-icon" style="width: 26px; height: 26px; font-size: 1.15rem; display: flex; align-items: center; justify-content: center;">🎂</span>
                            <div class="birthday-child-info" style="flex: 1;">
                                <div class="birthday-child-title" style="font-size: 0.68rem; font-weight: 700; color: ${isUnknown ? "#ef4444" : "#d97706"}; text-transform: uppercase; letter-spacing: 0.4px;">Enfant fêté ${ea.sousCompteId ? `<span style="text-transform: none; font-weight: 500; color: var(--text-muted);">(#${ea.sousCompteId})</span>` : ""}</div>
                                <div class="birthday-child-name" style="font-size: 0.83rem; margin-top: 1px;">
                                    Nom : <strong style="color: ${p === "???" ? "#ef4444" : "var(--text-main)"}">${p}</strong>
                                    <span style="margin: 0 4px; color: var(--border-strong);">|</span>
                                    Âge : <strong style="color: ${aDisplay === "???" ? "#ef4444" : "var(--text-main)"}">${aDisplay}</strong>
                                </div>
                                ${dateDisplay ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px;">📅 ${dateDisplay}</div>` : ""}
                            </div>
                        </div>`;
                          })()
                        : ""
                    }
                </div>

                <!-- Colonne 2 : Activités (Heures de début de chaque activité) -->
                <div class="qweekle-column">
                    <div class="qweekle-column-title">⚡ Activités & Heures (${res.activites ? res.activites.length : 0})</div>
                    <div style="margin-top: 4px;">
                        ${activitesHtml}
                    </div>
                </div>

                <!-- Colonne 3 : Options supplémentaires -->
                <div class="qweekle-column">
                    <div class="qweekle-column-title">🛍️ Options (${res.options ? res.options.length : 0})</div>
                    <div style="margin-top: 4px;">
                        ${optionsHtml}
                    </div>
                </div>
            </div>

            <!-- Notes API et Manuelles -->
            <div class="qweekle-card-notes" style="padding: 10px 15px; border-top: 1px solid var(--border-soft); background-color: rgba(0,0,0,0.015);">
                ${
                  res.qweekleNote || res.qweekleInternalNote
                    ? `
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${res.qweekleNote ? `<strong>📝 Note Qweekle:</strong> ${res.qweekleNote.replace(/\n/g, "<br>")}<br>` : ""}
                        ${res.qweekleInternalNote ? `<strong>🔒 Note Interne Qweekle:</strong> ${res.qweekleInternalNote.replace(/\n/g, "<br>")}` : ""}
                    </div>
                `
                    : ""
                }
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <span style="font-size: 1.1rem; margin-top: 2px;">✍️</span>
                    <textarea 
                        placeholder="Ajouter une note manuelle pour cette réservation (allergies, retard, etc.)..." 
                        class="qweekle-manual-note" 
                        onchange="appState.saveQweekleCustomNote('${res.id}', this.value)"
                        style="width: 100%; min-height: 44px; border: 1px solid var(--border-soft); border-radius: 4px; padding: 6px 8px; font-size: 0.85rem; font-family: inherit; background: var(--bg-main); color: var(--text-main); resize: vertical; line-height: 1.4;"
                    >${appState.getQweekleCustomNote(res.id) || ""}</textarea>
                </div>
            </div>
        `;

    container.appendChild(card);
  });
}

function filterQweeklePlanning(category) {
  renderPlanningComplet(category);
}

async function syncQweekleReservations(silent = false) {
  const btn = document.getElementById("btn-sync-qweekle");
  const badge = document.getElementById("qweekle-status-badge");
  if (btn && !silent) {
    btn.disabled = true;
    btn.innerHTML = `⌛ Synchronisation en cours...`;
  }

  const result = await appState.fetchAndSyncQweekleReservations(
    appState.currentDate,
  );

  if (btn && !silent) {
    btn.disabled = false;
    btn.innerHTML = `⚡ Synchroniser API Qweekle`;
  }

  if (badge) {
    badge.style.display = "none";
  }

  // Ré-afficher dès que la synchro Qweekle/Supabase est terminée
  if (
    currentActiveTab === "complet" ||
    appState.currentTab === "planning-complet"
  ) {
    renderPlanningComplet();
  } else if (currentActiveTab === "home") {
    renderHomeDashboard();
    renderCalendar();
  }
}

// ============================================================================
// 7. RENDU ET GESTION DES POST-IT
// ============================================================================
function renderPostIts() {
  const containerDate = document.getElementById("postits-date-container");
  const containerGeneral = document.getElementById("postits-general-container");
  const dateLabel = document.getElementById("postit-date-label");
  const modalDateLabel = document.getElementById("postit-modal-date-label");

  if (!containerDate || !containerGeneral) return;

  const parts = appState.currentDate.split("-");
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const formattedDate = `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;

  if (dateLabel) dateLabel.textContent = formattedDate;
  if (modalDateLabel) modalDateLabel.textContent = formattedDate;

  // Post-It pour la date sélectionnée
  const datePostIts = appState.getPostIts(appState.currentDate);
  containerDate.innerHTML = "";
  if (datePostIts.length === 0) {
    containerDate.innerHTML = `<p style="color: var(--text-muted); font-style: italic; grid-column: 1 / -1;">Aucun Post-It spécifique pour le ${formattedDate}. Cliquez sur + Nouveau Post-It pour en ajouter un.</p>`;
  } else {
    datePostIts.forEach((p) => {
      containerDate.appendChild(createPostItCard(p, appState.currentDate));
    });
  }

  // Post-It généraux (permanents)
  const genPostIts = appState.getPostIts("general");
  containerGeneral.innerHTML = "";
  if (genPostIts.length === 0) {
    containerGeneral.innerHTML = `<p style="color: var(--text-muted); font-style: italic; grid-column: 1 / -1;">Aucune consigne générale.</p>`;
  } else {
    genPostIts.forEach((p) => {
      containerGeneral.appendChild(createPostItCard(p, "general"));
    });
  }
}

function createPostItCard(postIt, scope) {
  const card = document.createElement("div");
  card.className = "postit-card";
  card.style.backgroundColor = postIt.color || "#FDF0D5";

  card.innerHTML = `
        <button class="postit-delete" onclick="deletePostItItem('${scope}', ${postIt.id})" title="Supprimer la note">✕</button>
        <h4>${postIt.title}</h4>
        <p>${postIt.content}</p>
    `;
  return card;
}

// ============================================================================
// 8. FENÊTRES MODALES & ACTIONS (SUPPRESSION/AJOUT)
// ============================================================================
function initModals() {
  // Initialiser les listes déroulantes d'horaires
  const startSelect = document.getElementById("event-start");
  const endSelect = document.getElementById("event-end");
  if (startSelect && endSelect) {
    for (let h = 9; h <= 23; h++) {
      for (let m of ["00", "30"]) {
        const timeStr = `${String(h).padStart(2, "0")}:${m}`;
        startSelect.innerHTML += `<option value="${timeStr}">${timeStr}</option>`;
        endSelect.innerHTML += `<option value="${timeStr}">${timeStr}</option>`;
      }
    }
    startSelect.value = "14:00";
    endSelect.value = "16:00";
  }

  // Soumission formulaire Événement
  const formEvent = document.getElementById("form-event");
  if (formEvent) {
    formEvent.addEventListener("submit", (e) => {
      e.preventDefault();
      const newEvent = {
        type: document.getElementById("event-type").value,
        title: document.getElementById("event-title").value.trim(),
        startHour: document.getElementById("event-start").value,
        endHour: document.getElementById("event-end").value,
        court: document.getElementById("event-court").value.trim(),
        notes: document.getElementById("event-notes").value.trim(),
      };
      appState.addEvent(appState.currentDate, newEvent);
      closeModal("event-modal");
      formEvent.reset();
    });
  }

  // Soumission formulaire Post-It
  const formPostIt = document.getElementById("form-postit");
  if (formPostIt) {
    formPostIt.addEventListener("submit", (e) => {
      e.preventDefault();
      const scopeVal = document.getElementById("postit-scope").value;
      const targetScope =
        scopeVal === "date" ? appState.currentDate : "general";

      const newPostIt = {
        title: document.getElementById("postit-title").value.trim(),
        content: document.getElementById("postit-content").value.trim(),
        color: document.getElementById("postit-color").value,
      };

      appState.addPostIt(targetScope, newPostIt);
      closeModal("postit-modal");
      formPostIt.reset();
    });
  }
}

function openEventModal(defaultType = null) {
  const modal = document.getElementById("event-modal");
  const typeSelect = document.getElementById("event-type");
  const titleEl = document.getElementById("modal-event-title");

  if (defaultType && typeSelect) {
    typeSelect.value = defaultType;
  } else if (typeSelect) {
    typeSelect.value = "anniversaire";
  }

  const parts = appState.currentDate.split("-");
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (titleEl) {
    titleEl.textContent = `Ajouter au planning du ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
  }

  modal.style.display = "flex";
  document.getElementById("event-title").focus();
}

function openPostItModal() {
  document.getElementById("postit-modal").style.display = "flex";
  document.getElementById("postit-title").focus();
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.style.display = "none";
}

// Global functions accessible from HTML onClick attributes
window.openEventModal = openEventModal;
window.openPostItModal = openPostItModal;
window.closeModal = closeModal;
window.switchTab = switchTab;

window.deleteEventItem = function (eventId) {
  if (confirm("Voulez-vous supprimer cette activité du planning ?")) {
    appState.deleteEvent(appState.currentDate, eventId);
  }
};

window.deletePostItItem = function (scope, postItId) {
  if (confirm("Voulez-vous supprimer ce Post-It ?")) {
    appState.deletePostIt(scope, postItId);
  }
};

// ============================================================================
// 9. GESTION DES NOTES MANUELLES ET CONSIGNES (ACCUEIL)
// ============================================================================
let currentHomeNoteType = "date"; // "date" ou "general"
let homeNoteTimeout = null;

function saveHomeManualNote() {
  const textarea = document.getElementById("home-manual-note");
  const statusEl = document.getElementById("home-note-status");
  if (!textarea) return;

  const key =
    currentHomeNoteType === "date"
      ? `SFG_HOME_NOTE_DATE_${appState.currentDate}`
      : `SFG_HOME_NOTE_GENERAL`;

  if (appState.hasLocalStorage()) {
    localStorage.setItem(key, textarea.value);
  }

  if (statusEl) {
    statusEl.style.opacity = "1";
    if (homeNoteTimeout) clearTimeout(homeNoteTimeout);
    homeNoteTimeout = setTimeout(() => {
      statusEl.style.opacity = "0";
    }, 1800);
  }
}

function loadHomeManualNote() {
  const textarea = document.getElementById("home-manual-note");
  if (!textarea) return;

  const key =
    currentHomeNoteType === "date"
      ? `SFG_HOME_NOTE_DATE_${appState.currentDate}`
      : `SFG_HOME_NOTE_GENERAL`;

  const val = appState.hasLocalStorage() ? localStorage.getItem(key) || "" : "";
  textarea.value = val;

  // Mettre à jour l'état visuel des boutons de tabs
  document.querySelectorAll(".home-note-tab").forEach((btn) => {
    if (btn.getAttribute("data-notetype") === currentHomeNoteType) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
    if (btn.getAttribute("data-notetype") === "date") {
      const parts = appState.currentDate.split("-");
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      btn.textContent = `📅 Jour (${d.getDate()}/${parts[1]})`;
    } else {
      btn.textContent = `📌 Note Générale`;
    }
  });
}

function switchHomeNoteTab(type) {
  currentHomeNoteType = type;
  loadHomeManualNote();
}

window.saveHomeManualNote = saveHomeManualNote;
window.loadHomeManualNote = loadHomeManualNote;
window.switchHomeNoteTab = switchHomeNoteTab;

// =========================================================================
// GESTION DU RAPPORT D'ERREUR (AUDIT EXCEL QWEEKLE VS SITE)
// =========================================================================
let importedExcelDataRows = [];
let importedExcelFilename = "";

function openErrorReportModal() {
  resetErrorReportImport();
  const modal = document.getElementById("error-report-modal");
  if (modal) modal.style.display = "flex";
}

function resetErrorReportImport() {
  importedExcelDataRows = [];
  importedExcelFilename = "";
  const stepImport = document.getElementById("error-report-step-import");
  const stepResults = document.getElementById("error-report-step-results");
  const fileInfo = document.getElementById("error-report-file-info");
  const loadingEl = document.getElementById("error-report-loading");
  const printBtn = document.getElementById("btn-print-report");
  const fileInput = document.getElementById("error-report-file-input");

  if (stepImport) stepImport.style.display = "block";
  if (stepResults) stepResults.style.display = "none";
  if (fileInfo) fileInfo.style.display = "none";
  if (loadingEl) loadingEl.style.display = "none";
  if (printBtn) printBtn.style.display = "none";
  if (fileInput) fileInput.value = "";
}

function handleErrorReportFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  importedExcelFilename = file.name;
  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      if (typeof XLSX === "undefined") {
        alert("Erreur : La bibliothèque SheetJS (XLSX) n'est pas chargée.");
        return;
      }
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonRows && jsonRows.length > 1) {
        // Filtrer les lignes vides
        importedExcelDataRows = jsonRows.filter(
          (r) => r && r.length > 2 && r[2],
        );
        const fileInfo = document.getElementById("error-report-file-info");
        const filenameEl = document.getElementById("error-report-filename");
        const filemetaEl = document.getElementById("error-report-filemeta");

        if (filenameEl) filenameEl.textContent = importedExcelFilename;
        if (filemetaEl)
          filemetaEl.textContent = `${importedExcelDataRows.length - 1} réservations et créneaux détectés`;
        if (fileInfo) fileInfo.style.display = "flex";
      } else {
        alert(
          "Le fichier Excel sélectionné semble vide ou son format n'a pas été reconnu.",
        );
      }
    } catch (err) {
      console.error("Erreur lecture Excel :", err);
      alert("Erreur lors de la lecture du fichier Excel : " + err.message);
    }
  };

  reader.readAsArrayBuffer(file);
}

function isSameClientForAudit(excelClient, booking) {
  if (!excelClient || !booking) return false;
  const cleanExcel = String(excelClient)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim();
  const cleanNom = String(booking.nom || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim();
  const cleanSoc = String(booking.societe || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim();

  if (!cleanExcel) return false;
  if (cleanNom && cleanExcel.includes(cleanNom)) return true;
  if (cleanSoc && cleanExcel.includes(cleanSoc)) return true;
  if (cleanNom && cleanNom.includes(cleanExcel)) return true;
  if (cleanSoc && cleanSoc.includes(cleanExcel)) return true;

  const wordsExcel = cleanExcel
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 3 &&
        ![
          "monsieur",
          "madame",
          "asbl",
          "ecole",
          "collège",
          "lycée",
          "institut",
        ].includes(w),
    );
  const wordsNom = cleanNom.split(/\s+/).filter((w) => w.length >= 3);
  const wordsSoc = cleanSoc.split(/\s+/).filter((w) => w.length >= 3);

  for (const w of wordsExcel) {
    if (wordsNom.includes(w) || wordsSoc.includes(w)) {
      return true;
    }
  }
  return false;
}

async function runErrorReportAudit() {
  if (!importedExcelDataRows || importedExcelDataRows.length <= 1) {
    alert("Veuillez d'abord sélectionner un fichier Excel valide.");
    return;
  }

  const fileInfo = document.getElementById("error-report-file-info");
  const loadingEl = document.getElementById("error-report-loading");
  const loadingText = document.getElementById("error-report-loading-text");

  if (fileInfo) fileInfo.style.display = "none";
  if (loadingEl) loadingEl.style.display = "block";

  // 1. Extraire les dates uniques des lignes Excel (format AAAA-MM-JJ)
  const distinctDates = new Set();
  const rowsWithoutHeader = importedExcelDataRows.slice(1);

  rowsWithoutHeader.forEach((r) => {
    const dateTimeStr = String(r[2] || "").trim(); // Créneau réservé
    const datePart = dateTimeStr.split(" ")[0];
    if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      distinctDates.add(datePart);
    }
  });

  const datesArray = Array.from(distinctDates).sort();
  if (loadingText)
    loadingText.textContent = `Synchronisation temps réel et vérification sur ${datesArray.length} journées...`;

  // 2. Synchroniser ou charger les données en ligne/cache pour chaque date
  for (const d of datesArray) {
    const cached = appState.getQweekleReservationsForDate(d);
    // Si le cache est vide et que l'API/Supabase est configurée, on tente un fetch
    if (
      (!cached || cached.length === 0) &&
      typeof CONFIG !== "undefined" &&
      (CONFIG.SUPABASE_URL || CONFIG.QWEEKLE_API_KEY)
    ) {
      try {
        await appState.fetchAndSyncQweekleReservations(d);
      } catch (e) {
        console.warn("Audit - Erreur de synchro pour", d, e);
      }
    }
  }

  // 3. Procéder au contrôle croisé ligne par ligne
  const auditResults = [];
  let countMissing = 0;
  let countQty = 0;
  let countTime = 0;
  let countOk = 0;

  // Regrouper les lignes Excel par client et par date pour une vue d'ensemble propre
  const excelByDateClient = {};

  rowsWithoutHeader.forEach((r) => {
    const dateTimeStr = String(r[2] || "").trim();
    const dateStr = dateTimeStr.split(" ")[0] || "Date inconnue";
    const timeStr = dateTimeStr.split(" ")[1]
      ? dateTimeStr.split(" ")[1].slice(0, 5)
      : "";
    const clientName = String(r[3] || "Client Inconnu").trim();
    const actLabel = String(r[6] || "Activité").trim();
    const qty = Number(r[7]) || 1;
    const status = String(r[9] || "").toLowerCase();
    const isActive =
      r[0] !== false &&
      r[0] !== "false" &&
      r[0] !== 0 &&
      status !== "cancelled" &&
      status !== "canceled";

    const key = `${dateStr}____${clientName.toLowerCase()}`;
    if (!excelByDateClient[key]) {
      excelByDateClient[key] = {
        dateStr,
        clientName,
        email: String(r[4] || ""),
        phone: String(r[5] || ""),
        status,
        isActive,
        activities: [],
        totalQty: 0,
      };
    }
    excelByDateClient[key].activities.push({
      timeStr,
      actLabel,
      qty,
      status,
      isActive,
    });
    if (qty > excelByDateClient[key].totalQty) {
      excelByDateClient[key].totalQty = qty;
    }
  });

  // Analyser chaque client/date présent dans l'Excel
  Object.values(excelByDateClient).forEach((item) => {
    const { dateStr, clientName, totalQty, activities, isActive, status } =
      item;
    const siteBookings = appState.getQweekleReservationsForDate(dateStr) || [];
    const localEvents = appState.getEventsForDate(dateStr) || [];

    // Chercher une correspondance sur le site
    const matchBooking = siteBookings.find((b) =>
      isSameClientForAudit(clientName, b),
    );
    const matchEvent = localEvents.find((e) =>
      isSameClientForAudit(clientName, { nom: e.title || e.clientName }),
    );

    const activitiesText = activities
      .map(
        (a) =>
          `${a.timeStr ? a.timeStr + " - " : ""}${a.actLabel} (${a.qty} pers.)`,
      )
      .join("<br>");

    if (!isActive) {
      // Le dossier est annulé ou inactif dans l'Excel
      if (matchBooking || matchEvent) {
        auditResults.push({
          dateStr,
          clientName,
          type: "⚠️ Annulé dans Qweekle mais présent sur le site",
          badgeClass: "badge-err-missing",
          detailQweekle: `Marqué comme '${status || "inactif"}' dans l'Excel Qweekle :<br>${activitiesText}`,
          detailSite: matchBooking
            ? `Dossier actif sur le site (${matchBooking.nbPersonnes} pers., ${matchBooking.heureArrivee})`
            : `Activité manuelle active : ${matchEvent.title}`,
          action: "À supprimer du site ou vérifier Qweekle",
        });
        countMissing++;
      } else {
        countOk++;
      }
      return;
    }

    if (!matchBooking && !matchEvent) {
      auditResults.push({
        dateStr,
        clientName,
        type: "❌ Réservation manquante sur le site",
        badgeClass: "badge-err-missing",
        detailQweekle: activitiesText,
        detailSite: `<span style="color: #C53030; font-weight: 700;">Introuvable dans le planning en ligne du ${dateStr}</span>`,
        action: "À synchroniser d'urgence",
      });
      countMissing++;
      return;
    }

    if (matchBooking || matchEvent) {
      countOk++;
    }
  });

  // 4. Vérifier les "Orphelins" : Dossiers présents sur le site pour ces dates mais absents du fichier Excel
  datesArray.forEach((d) => {
    const siteBookings = appState.getQweekleReservationsForDate(d) || [];
    siteBookings.forEach((booking) => {
      const fullName = `${booking.nom || ""} ${booking.societe || ""}`.trim();
      if (!fullName) return;

      const foundInExcel = Object.values(excelByDateClient).some(
        (item) =>
          item.dateStr === d && isSameClientForAudit(item.clientName, booking),
      );
      if (!foundInExcel) {
        auditResults.push({
          dateStr: d,
          clientName: fullName,
          type: "❓ Présent sur le site mais absent du fichier Excel",
          badgeClass: "badge-err-time",
          detailQweekle: `<span style="color: #718096; font-style: italic;">Aucune ligne dans l'export Excel pour ce client le ${d}</span>`,
          detailSite: `Dossier #${booking.id} (${booking.heureArrivee} - ${booking.heureDepart}) • <strong>${booking.nbPersonnes} pers.</strong><br>Pack : ${booking.nomPack || "Activité"}`,
          action: "Vérifier si annulé dans Qweekle",
        });
        countMissing++;
      }
    });
  });

  // 5. Mettre à jour l'affichage du rapport
  const tbody = document.getElementById("a4-error-tbody");
  if (tbody) {
    if (auditResults.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 35px 15px; color: #276749; background: #F0FFF4;">
                        <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">🎉</span>
                        <strong style="font-size: 1.1rem; display: block; margin-bottom: 4px;">Zéro anomalie ! Votre site est 100% conforme au fichier Excel.</strong>
                        <span style="font-size: 0.88rem; color: #2F855A;">Toutes les ${importedExcelDataRows.length - 1} lignes et ${datesArray.length} dates ont été vérifiées avec succès.</span>
                    </td>
                </tr>
            `;
    } else {
      auditResults.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      tbody.innerHTML = auditResults
        .map(
          (item) => `
                <tr>
                    <td style="font-weight: 700; color: #1A202C;">${item.dateStr.split("-").reverse().join("/")}</td>
                    <td style="font-weight: 700; color: #2D3748;">${item.clientName}</td>
                    <td><span class="report-badge-err ${item.badgeClass}">${item.type}</span></td>
                    <td style="line-height: 1.4; color: #4A5568;">
                        <div style="margin-bottom: 4px;"><strong>Qweekle :</strong><br>${item.detailQweekle}</div>
                        <div><strong>Planning :</strong> ${item.detailSite}</div>
                    </td>
                    <td style="font-weight: 600; color: #C53030; font-size: 0.82rem;">${item.action}</td>
                </tr>
            `,
        )
        .join("");
    }
  }

  if (document.getElementById("badge-err-missing"))
    document.getElementById("badge-err-missing").textContent = countMissing;
  if (document.getElementById("badge-err-ok"))
    document.getElementById("badge-err-ok").textContent = countOk;

  const nowStr = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (document.getElementById("report-print-date"))
    document.getElementById("report-print-date").textContent = nowStr;
  if (document.getElementById("report-footer-date"))
    document.getElementById("report-footer-date").textContent = nowStr;
  if (document.getElementById("report-excel-filename-print"))
    document.getElementById("report-excel-filename-print").textContent =
      importedExcelFilename;
  if (document.getElementById("report-excel-rowcount-print"))
    document.getElementById("report-excel-rowcount-print").textContent =
      importedExcelDataRows.length - 1;
  if (document.getElementById("report-excel-datecount-print"))
    document.getElementById("report-excel-datecount-print").textContent =
      datesArray.length;

  if (loadingEl) loadingEl.style.display = "none";
  const stepImport = document.getElementById("error-report-step-import");
  const stepResults = document.getElementById("error-report-step-results");
  const printBtn = document.getElementById("btn-print-report");

  if (stepImport) stepImport.style.display = "none";
  if (stepResults) stepResults.style.display = "block";
  if (printBtn) printBtn.style.display = "inline-block";
}

function printErrorReport() {
  window.print();
}

window.openErrorReportModal = openErrorReportModal;
window.resetErrorReportImport = resetErrorReportImport;
window.handleErrorReportFileSelect = handleErrorReportFileSelect;
window.runErrorReportAudit = runErrorReportAudit;
window.printErrorReport = printErrorReport;
