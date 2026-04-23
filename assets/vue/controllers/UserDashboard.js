import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
    setup() {
        const bookings = ref([]);
        const isLoading = ref(true);
        const error = ref(null);

        const fetchMyBookings = async () => {
            try {
                const response = await fetch('/api/mes-reservations');

                if (response.status === 403) {
                    // Si l'utilisateur n'est pas connecté, redirection
                    window.location.href = '/login';
                    return;
                }

                if (!response.ok) throw new Error("Erreur lors de la récupération des données.");

                bookings.value = await response.json();
            } catch (err) {
                error.value = err.message;
            } finally {
                isLoading.value = false;
            }
        };

        // Fonction pour gérer les couleurs des badges de statut
        const getStatusClass = (status) => {
            switch (status) {
                case 'EN_ATTENTE': return 'bg-warning text-dark';
                case 'CONFIRMEE': return 'bg-success';
                case 'ANNULEE': return 'bg-danger';
                case 'TERMINEE': return 'bg-secondary';
                default: return 'bg-info';
            }
        };

        onMounted(fetchMyBookings);

        return { bookings, isLoading, error, getStatusClass };
    },

    template: `
        <div class="container py-5">
            <h2 class="mb-4" style="color: var(--vosges-sapin); font-family: 'Playfair Display', serif;">
                Mon Espace Client
            </h2>

            <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">Récupération de vos séjours...</p>
            </div>

            <div v-else-if="error" class="alert alert-danger">
                {{ error }}
            </div>

            <div v-else>
                <div v-if="bookings.length === 0" class="text-center p-5 border rounded bg-light">
                    <p class="fs-5 text-muted">Vous n'avez pas encore effectué de réservation.</p>
                    <a href="/" class="btn btn-vosges mt-3">Découvrir le chalet</a>
                </div>

                <div v-else class="row g-4">
                    <div v-for="booking in bookings" :key="booking.id" class="col-12">
                        <div class="card shadow-sm border-0">
                            <div class="card-body p-4">
                                <div class="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h5 class="card-title mb-1">Séjour du {{ booking.startDate }} au {{ booking.endDate }}</h5>
                                        <p class="text-muted small mb-0">Réservé le {{ booking.createdAt }}</p>
                                    </div>
                                    <span :class="'badge ' + getStatusClass(booking.status)">
                                        {{ booking.status }}
                                    </span>
                                </div>

                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <p class="mb-1"><strong>Formule choisie :</strong></p>
                                        <ul class="list-inline mb-0">
                                            <li v-for="floor in booking.floors" :key="floor" class="list-inline-item badge border text-dark fw-normal">
                                                {{ floor }}
                                            </li>
                                        </ul>
                                    </div>
                                    <div class="col-md-6 text-md-end mt-3 mt-md-0">
                                        <p class="mb-0 text-muted">Prix total</p>
                                        <p class="h4 mb-0" style="color: var(--vosges-bois);">{{ booking.totalPrice }} €</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
});
