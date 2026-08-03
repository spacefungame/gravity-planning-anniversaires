/**
 * Module d'attribution automatique des tables
 * Se base sur CONFIG.TABLES
 */

class TableAssigner {
    constructor(tablesConfig) {
        this.tables = tablesConfig;
        this.adjacencies = {
            "T1": ["T2"],
            "T2": ["T1", "T3"],
            "T3": ["T2", "T4"],
            "T4": ["T3", "T5"],
            "T5": ["T4", "T6"],
            "T6": ["T5"],
            "STG+": ["STG-"],
            "STG-": ["STG+"],
            "R1": ["R2", "R3", "R4"],
            "R2": ["R1", "R3", "R4"],
            "R3": ["R1", "R2", "R4"],
            "R4": ["R1", "R2", "R3"]
        };
        // Pré-calcul de toutes les combinaisons valides de tables
        this.validCombinations = this._generateAllCombinations();
    }

    _generateAllCombinations() {
        const combos = [];

        // 1. Tables individuelles
        this.tables.forEach(t => {
            combos.push({
                tables: [t.id],
                capacity: t.capacity,
                priority: t.priority,
                isSingle: true
            });
        });

        // Fonction utilitaire pour éviter les doublons de combinaisons
        const addCombo = (tablesArray, priorityOverride = null) => {
            tablesArray.sort(); // Pour comparer facilement
            if (combos.find(c => c.tables.slice().sort().join(',') === tablesArray.join(','))) return;
            
            const cap = tablesArray.reduce((sum, id) => sum + this.tables.find(t=>t.id===id).capacity, 0);
            const prio = priorityOverride !== null ? priorityOverride : Math.min(...tablesArray.map(id => this.tables.find(t=>t.id===id).priority));
            
            combos.push({
                tables: tablesArray,
                capacity: cap,
                priority: prio,
                isSingle: false
            });
        };

        // 2. Fusions autorisées (2 tables)
        for (const [tId, neighbors] of Object.entries(this.adjacencies)) {
            neighbors.forEach(nId => addCombo([tId, nId]));
        }

        // Fusions de 3+ tables (surtout pour R et T)
        const rTables = ["R1", "R2", "R3", "R4"];
        // 3 tables R
        for (let i=0; i<rTables.length; i++) {
            for (let j=i+1; j<rTables.length; j++) {
                for (let k=j+1; k<rTables.length; k++) {
                    addCombo([rTables[i], rTables[j], rTables[k]], 1);
                }
            }
        }
        // 4 tables R
        addCombo(rTables, 1);

        // 3 tables T (T1+T2+T3, etc.)
        for (let i=1; i<=4; i++) {
            addCombo([`T${i}`, `T${i+1}`, `T${i+2}`], 2);
        }

        // 4 tables T
        for (let i=1; i<=3; i++) {
            addCombo([`T${i}`, `T${i+1}`, `T${i+2}`, `T${i+3}`], 2);
        }

        // Tri des combinaisons : par capacité croissante (pour minimiser le gaspillage)
        combos.sort((a, b) => a.capacity - b.capacity);
        return combos;
    }

    _timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + (m || 0);
    }

    _areTimesOverlapping(start1, end1, start2, end2) {
        // start1 < end2 AND start2 < end1
        return start1 < end2 && start2 < end1;
    }

    _isTableAvailable(tablesRequired, start, end, assignments) {
        for (const t of tablesRequired) {
            for (const assigned of assignments) {
                if (assigned.tables.includes(t)) {
                    if (this._areTimesOverlapping(start, end, assigned.start, assigned.end)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Attribue les tables pour une liste de réservations sur une journée
     * @param {Array} reservations 
     * @returns {Map} Map(reservation_id => { tables: ["T1"], reducedTime: false })
     */
    assign(reservations) {
        const assignmentsMap = new Map();
        const timeline = []; 

        // On trie d'abord par taille de groupe décroissante (les plus grands d'abord)
        // pour s'assurer qu'ils obtiennent les grandes tables simples avant les petits groupes.
        // En cas d'égalité, on trie chronologiquement.
        const sortedRes = [...reservations].sort((a, b) => {
            const aNb = Number(a.nbPersonnes) || 0;
            const bNb = Number(b.nbPersonnes) || 0;
            if (aNb !== bNb) {
                return bNb - aNb;
            }
            const aStart = this._timeToMinutes(a.heureArrivee);
            const bStart = this._timeToMinutes(b.heureArrivee);
            return aStart - bStart;
        });

        sortedRes.forEach(res => {
            const nbP = Number(res.nbPersonnes) || 0;
            if (nbP === 0) return;

            const isAdult = res.categories && (res.categories.includes("évènement adulte") || res.categories.includes("team building"));

            const fullStart = this._timeToMinutes(res.heureArrivee);
            const fullEnd = this._timeToMinutes(res.heureDepart);
            
            let tableStart = fullStart;
            let tableEnd = fullEnd;
            let reducedTime = false;

            let bestCombo = this._findBestCombination(nbP, fullStart, fullEnd, timeline, isAdult);

            if (!bestCombo && res.activites) {
                const tableAct = res.activites.find(a => 
                    a.nom.toLowerCase().includes("table réservée") || 
                    a.nom.toLowerCase().includes("table reservee")
                );
                if (tableAct) {
                    const reducedStart = this._timeToMinutes(tableAct.heureDebut);
                    const reducedEnd = this._timeToMinutes(tableAct.heureFin);
                    
                    bestCombo = this._findBestCombination(nbP, reducedStart, reducedEnd, timeline, isAdult);
                    if (bestCombo) {
                        tableStart = reducedStart;
                        tableEnd = reducedEnd;
                        reducedTime = true;
                    }
                }
            }

            if (bestCombo) {
                timeline.push({
                    tables: bestCombo.tables,
                    start: tableStart,
                    end: tableEnd,
                    resId: res.id
                });
                assignmentsMap.set(res.id, {
                    tables: bestCombo.tables,
                    reducedTime: reducedTime
                });
            } else {
                assignmentsMap.set(res.id, {
                    tables: [], // "A PLACER"
                    reducedTime: false
                });
            }
        });

        return assignmentsMap;
    }

    _findBestCombination(nbPersons, start, end, currentAssignments, isAdult) {
        const candidates = this.validCombinations.filter(c => 
            c.capacity >= nbPersons && this._isTableAvailable(c.tables, start, end, currentAssignments)
        );

        if (candidates.length === 0) return null;

        const getReuseCount = (combo) => {
            let count = 0;
            combo.tables.forEach(t => {
                count += currentAssignments.filter(assign => assign.tables.includes(t)).length;
            });
            return count;
        };

        const getAdultPenalty = (combo) => {
            if (!isAdult) return 0;
            let hasT = combo.tables.some(t => {
                const tableConfig = this.tables.find(tc => tc.id === t);
                return tableConfig && tableConfig.zone === "T";
            });
            return hasT ? 1 : 0;
        };

        // Tri: 
        // 0. (Adultes seulement) Éviter la zone T à tout prix
        // 1. Éviter la réutilisation de tables (ceux avec le moins de réutilisations d'abord)
        // 2. Préférence ABSOLUE pour une table simple plutôt qu'une fusion (si capacité suffisante)
        // 3. Priorité (1 = meilleur : STG > R > T)
        // 4. Capacité (DESCENDANT) : Les plus grands groupes (traités en premier) 
        // prendront les plus grandes tables de la zone pour avoir plus d'espace.
        candidates.sort((a, b) => {
            if (isAdult) {
                const penaltyA = getAdultPenalty(a);
                const penaltyB = getAdultPenalty(b);
                if (penaltyA !== penaltyB) return penaltyA - penaltyB;
            }

            const reuseA = getReuseCount(a);
            const reuseB = getReuseCount(b);
            if (reuseA !== reuseB) return reuseA - reuseB;

            // Une table simple gagne toujours contre une fusion (évite de bouger les tables)
            if (a.isSingle && !b.isSingle) return -1;
            if (!a.isSingle && b.isSingle) return 1;

            if (a.priority !== b.priority) return a.priority - b.priority;

            // 4. Capacité (DESCENDANT) : Les plus grands groupes (traités en premier) 
            // prendront les plus grandes tables de la zone pour avoir plus d'espace.
            return b.capacity - a.capacity;
        });

        return candidates[0];
    }
}

// Export pour le navigateur
window.TableAssigner = TableAssigner;
