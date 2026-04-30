import { defineComponent, ref, computed, onMounted } from 'vue';

export default defineComponent({
    setup() {
        const bookings = ref([]);
        const isLoading = ref(true);

        // Variables pour nos 4 filtres
        const searchQuery = ref('');
        const statusFilter = ref('');
        const timeFilter = ref(''); // 'future' ou 'past'
        const floorFilter = ref('');

        const fetchAllBookings = async () => {
            try {
                const response = await fetch('/api/admin/reservations');
                if (response.ok) {
                    bookings.value = await response.json();
                }
            } catch (error) {
                console.error("Erreur chargement admin :", error);
            } finally {
                isLoading.value = false;
            }
        };

        const updateStatus = async (id, newStatus) => {
            if (!confirm(`Voulez-vous passer cette réservation en statut ${newStatus} ?`)) return;

            try {
                const response = await fetch(`/api/admin/reservations/${id}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });

                if (response.ok) {
                    const booking = bookings.value.find(b => b.id === id);
                    if (booking) booking.status = newStatus;
                }
            } catch (error) {
                alert("Erreur lors de la mise à jour.");
            }
        };

        // Fonction utilitaire pour vérifier si une date (jj/mm/aaaa) est dans le passé
        const isPast = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            const endDate = new Date(year, month - 1, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // On ignore l'heure, on ne compare que les jours
            return endDate < today;
        };

        // Gère l'affichage dynamique du statut
        const getStatusDisplay = (booking) => {
            // Si c'est confirmé mais que la date de départ est dépassée -> "Terminée"
            if (booking.status === 'CONFIRMEE' && isPast(booking.endDate)) {
                return { label: 'Terminée', badge: 'bg-info text-dark' };
            }

            // Sinon, on affiche le statut normal de la base de données
            switch (booking.status) {
                case 'EN_ATTENTE': return { label: 'En attente', badge: 'bg-warning text-dark' };
                case 'CONFIRMEE': return { label: 'Confirmée', badge: 'bg-success' };
                case 'ANNULEE': return { label: 'Annulée', badge: 'bg-danger' };
                default: return { label: booking.status, badge: 'bg-secondary' };
            }
        };

        // NOUVEAU : Récupère dynamiquement la liste exacte des étages depuis les réservations
        const availableFloors = computed(() => {
            const floors = new Set();
            bookings.value.forEach(booking => {
                booking.floors.forEach(floor => floors.add(floor));
            });
            return Array.from(floors);
        });

        const filteredBookings = computed(() => {
            return bookings.value.filter(booking => {
                // 1. Recherche Texte (Nom/Email)
                const searchLower = searchQuery.value.toLowerCase();
                const matchesSearch = searchLower === '' ||
                    booking.clientName.toLowerCase().includes(searchLower) ||
                    booking.clientEmail.toLowerCase().includes(searchLower);

                // 2. Filtre Statut
                const matchesStatus = statusFilter.value === '' || booking.status === statusFilter.value;

                // 3. Filtre Chronologique (Dates)
                let matchesTime = true;
                if (timeFilter.value === 'past') {
                    matchesTime = isPast(booking.endDate);
                } else if (timeFilter.value === 'future') {
                    matchesTime = !isPast(booking.endDate);
                }

                // 4. Filtre Étage
                const matchesFloor = floorFilter.value === '' || booking.floors.includes(floorFilter.value);

                return matchesSearch && matchesStatus && matchesTime && matchesFloor;
            });
        });

        onMounted(fetchAllBookings);

        return {
            bookings, isLoading, updateStatus, getStatusDisplay,
            searchQuery, statusFilter, timeFilter, floorFilter, filteredBookings,
            availableFloors
        };
    },

    template: `
        <div class="container-fluid py-5">
            <h2 class="mb-4 d-flex align-items-center" style="color: var(--vosges-sapin);">
                 Gestion des Réservations
            </h2>

            <!-- Section des Filtres -->
            <div class="bg-light p-3 rounded border mb-4 shadow-sm">
                <div class="row g-3">
                    <div class="col-md-12">
                        <input type="text" class="form-control" v-model="searchQuery" placeholder="Rechercher un locataire par nom, prénom ou email...">
                    </div>
                    <div class="col-md-4">
                        <select class="form-select" v-model="timeFilter">
                            <option value="">Toutes les périodes</option>
                            <option value="future">Séjours à venir</option>
                            <option value="past">Séjours passés</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <select class="form-select" v-model="floorFilter">
                            <option value="">Tous les étages</option>
                            <!-- La liste se crée toute seule avec l'orthographe exacte de ta BDD -->
                            <option v-for="floor in availableFloors" :key="floor" :value="floor">
                                {{ floor }}
                            </option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <select class="form-select" v-model="statusFilter">
                            <option value="">Tous les statuts</option>
                            <option value="EN_ATTENTE">En attente</option>
                            <option value="CONFIRMEE">Confirmée</option>
                            <option value="ANNULEE">Annulée</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="d-flex justify-content-end mb-2 text-muted">
                <small class="fw-bold">{{ filteredBookings.length }} réservation(s) trouvée(s)</small>
            </div>

            <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border text-success" role="status"></div>
            </div>

            <div v-else-if="filteredBookings.length === 0" class="alert alert-info text-center">
                Aucune réservation ne correspond à vos filtres.
            </div>

            <div v-else class="table-responsive shadow-sm rounded border bg-white">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>Client</th>
                            <th>Dates</th>
                            <th>Formule</th>
                            <th>Prix</th>
                            <th>Statut</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="booking in filteredBookings" :key="booking.id">
                            <td>
                                <div class="fw-bold">{{ booking.clientName }}</div>
                                <div class="text-muted small">{{ booking.clientEmail }}</div>
                            </td>
                            <td>
                                <div>Du {{ booking.startDate }}</div>
                                <div>Au {{ booking.endDate }}</div>
                            </td>
                            <td>
                                <span v-for="floor in booking.floors" :key="floor" class="badge border text-dark fw-normal me-1">
                                    {{ floor }}
                                </span>
                            </td>
                            <td class="fw-bold">{{ booking.totalPrice }}€</td>
                            <td>
                                <!-- Utilisation dynamique de getStatusDisplay -->
                                <span :class="'badge ' + getStatusDisplay(booking).badge">
                                    {{ getStatusDisplay(booking).label }}
                                </span>
                            </td>
                            <td class="text-end">
                                <div v-if="booking.status === 'EN_ATTENTE'">
                                    <button @click="updateStatus(booking.id, 'CONFIRMEE')" class="btn btn-sm btn-success me-1">Confirmer</button>
                                    <button @click="updateStatus(booking.id, 'ANNULEE')" class="btn btn-sm btn-outline-danger">Refuser</button>
                                </div>
                                <div v-else-if="booking.status === 'CONFIRMEE' && getStatusDisplay(booking).label !== 'Terminée'">
                                    <button @click="updateStatus(booking.id, 'ANNULEE')" class="btn btn-sm btn-link text-danger p-0">Annuler</button>
                                </div>
                                <!-- Si la réservation est 'Terminée', on ne propose plus de l'annuler -->
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `
});
