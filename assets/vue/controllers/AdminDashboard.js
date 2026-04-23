import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
    setup() {
        const bookings = ref([]);
        const isLoading = ref(true);

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
                    // Mise à jour locale pour éviter de tout recharger
                    const booking = bookings.value.find(b => b.id === id);
                    if (booking) booking.status = newStatus;
                }
            } catch (error) {
                alert("Erreur lors de la mise à jour.");
            }
        };

        const getStatusBadgeClass = (status) => {
            switch (status) {
                case 'EN_ATTENTE': return 'bg-warning text-dark';
                case 'CONFIRMEE': return 'bg-success';
                case 'ANNULEE': return 'bg-danger';
                default: return 'bg-secondary';
            }
        };

        onMounted(fetchAllBookings);

        return { bookings, isLoading, updateStatus, getStatusBadgeClass };
    },

    template: `
        <div class="container-fluid py-5">
            <h2 class="mb-4 d-flex align-items-center" style="color: var(--vosges-sapin);">
                <span class="me-3">📑</span> Gestion des Réservations
            </h2>

            <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border text-success" role="status"></div>
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
                        <tr v-for="booking in bookings" :key="booking.id">
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
                                <span :class="'badge ' + getStatusBadgeClass(booking.status)">
                                    {{ booking.status }}
                                </span>
                            </td>
                            <td class="text-end">
                                <div v-if="booking.status === 'EN_ATTENTE'">
                                    <button @click="updateStatus(booking.id, 'CONFIRMEE')" class="btn btn-sm btn-success me-1">Confirmer</button>
                                    <button @click="updateStatus(booking.id, 'ANNULEE')" class="btn btn-sm btn-outline-danger">Refuser</button>
                                </div>
                                <div v-else-if="booking.status === 'CONFIRMEE'">
                                    <button @click="updateStatus(booking.id, 'ANNULEE')" class="btn btn-sm btn-link text-danger p-0">Annuler</button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `
});
