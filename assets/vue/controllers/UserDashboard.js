import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
    setup() {
        const bookings = ref([]);
        const isLoading = ref(true);
        const error = ref(null);

        // NOUVEAU : État pour le bouton de paiement
        const isPaying = ref(false);

        const fetchMyBookings = async () => {
            try {
                const response = await fetch('/api/mes-reservations');

                if (response.status === 403) {
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

        // On remplace getStatusClass par getBadgeStyle pour coller à ta charte graphique
        const getBadgeStyle = (status) => {
            switch (status) {
                case 'ACOMPTE_PAYE': return 'background-color: var(--vosges-bois); color: white;';
                case 'CONFIRMEE': return 'background-color: var(--vosges-sapin); color: white;';
                case 'EN_ATTENTE': return 'background-color: #f39c12; color: white;';
                case 'ANNULEE': return 'background-color: #e74c3c; color: white;';
                case 'TERMINEE': return 'background-color: var(--vosges-brume); color: var(--vosges-roche); border: 1px solid rgba(0,0,0,0.1);';
                default: return 'background-color: var(--vosges-roche); color: white;';
            }
        };

        // NOUVEAU : Traduction propre des statuts pour l'affichage client
        const getStatusLabel = (status) => {
            switch (status) {
                case 'ACOMPTE_PAYE': return 'Acompte Payé';
                case 'CONFIRMEE': return 'Totalité Payée';
                case 'EN_ATTENTE': return 'En Attente';
                case 'ANNULEE': return 'Annulée';
                case 'TERMINEE': return 'Séjour Terminé';
                default: return status;
            }
        };

        // NOUVEAU : Fonction pour appeler la route de paiement du solde
        const payBalance = async (id) => {
            isPaying.value = true;
            try {
                const response = await fetch(`/api/reserver/${id}/payer-solde`, {
                    method: 'POST'
                });

                const result = await response.json();

                if (response.ok && result.url) {
                    // Redirection vers Stripe
                    window.location.href = result.url;
                } else {
                    alert("Erreur : " + (result.error || "Impossible d'initier le paiement du solde."));
                }
            } catch (err) {
                alert("Erreur de connexion au serveur.");
            } finally {
                isPaying.value = false;
            }
        };

        onMounted(fetchMyBookings);

        return { bookings, isLoading, error, isPaying, getBadgeStyle, getStatusLabel, payBalance };
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
                        <div class="card shadow-sm border-0 mb-4" style="border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.03) !important;">
                            <div class="card-body p-4 p-md-5">
                                <!-- En-tête de la carte -->
                                <div class="d-flex justify-content-between align-items-start mb-4 pb-3" style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                                    <div>
                                        <h4 class="mb-1" style="color: var(--vosges-sapin); font-family: 'Playfair Display', serif;">
                                            Séjour du {{ booking.startDate }} au {{ booking.endDate }}
                                        </h4>
                                        <p class="text-muted small mb-0" style="letter-spacing: 0.5px;">Réservé le {{ booking.createdAt }}</p>
                                    </div>
                                    <!-- Le badge utilise maintenant tes couleurs -->
                                    <span class="badge px-3 py-2 shadow-sm" :style="getBadgeStyle(booking.status)" style="font-weight: 500; letter-spacing: 1px; border-radius: 30px;">
                                        {{ getStatusLabel(booking.status) }}
                                    </span>
                                </div>

                                <!-- Contenu : Formule (Gauche) / Paiement (Droite) -->
                                <div class="row align-items-end">

                                    <!-- Colonne de gauche : La formule -->
                                    <div class="col-md-5 mb-4 mb-md-0">
                                        <p class="text-uppercase mb-2 text-muted" style="font-size: 0.8rem; letter-spacing: 1px;">Formule choisie</p>
                                        <div>
                                            <span v-for="floor in booking.floors" :key="floor"
                                                  class="d-inline-block px-3 py-2 me-2 mb-2"
                                                  style="background-color: var(--vosges-brume); color: var(--vosges-sapin); border: 1px solid rgba(0,0,0,0.05); border-radius: 6px; font-size: 0.9rem;">
                                                {{ floor }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Colonne de droite : Les montants -->
                                    <div class="col-md-7 text-md-end">
                                        <!-- Petit trait séparateur vertical sur grand écran -->
                                        <div class="ps-md-4" style="border-left: 1px solid rgba(0,0,0,0.03);">

                                            <p class="text-uppercase mb-1" style="font-size: 0.85rem; letter-spacing: 1px; color: var(--vosges-roche);">
                                                Prix total du séjour : <span class="fw-bold">{{ booking.totalPrice }} €</span>
                                            </p>

                                            <!-- Zone d'Acompte (Épurée) -->
                                            <div v-if="booking.status === 'ACOMPTE_PAYE'" class="mt-4">
                                                <p class="text-uppercase mb-2" style="font-size: 0.8rem; color: #198754; letter-spacing: 1px;">
                                                    <i class="bi bi-check2-circle"></i> Acompte réglé : {{ (booking.totalPrice * 0.3).toFixed(2) }} €
                                                </p>

                                                <h3 class="mb-3" style="color: var(--vosges-sapin); font-family: 'Playfair Display', serif;">
                                                    Reste à payer : <span style="color: var(--vosges-bois);">{{ (booking.totalPrice * 0.7).toFixed(2) }} €</span>
                                                </h3>

                                                <button @click="payBalance(booking.id)" :disabled="isPaying" class="btn btn-vosges px-4 py-3 w-100 w-md-auto mt-2" style="box-shadow: 0 4px 15px rgba(156, 111, 68, 0.25);">
                                                    <span v-if="isPaying" class="spinner-border spinner-border-sm me-2"></span>
                                                    Payer le solde par carte
                                                </button>
                                            </div>

                                            <!-- Zone Totalement payé -->
                                            <div v-else-if="booking.status === 'CONFIRMEE' || booking.status === 'TERMINEE'" class="mt-4">
                                                <p class="h4 mb-0" style="color: var(--vosges-sapin); font-family: 'Playfair Display', serif;">
                                                    <i class="bi bi-check-circle" style="color: var(--vosges-bois);"></i> Payé en totalité
                                                </p>
                                            </div>

                                        </div>
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
