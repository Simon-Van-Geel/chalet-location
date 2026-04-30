import { defineComponent, ref, computed, onMounted } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.min.css';
import { fr } from 'date-fns/locale';

export default defineComponent({
    components: {
        VueDatePicker
    },

    setup() {
        const floors = ref([]);
        const bookings = ref([]);
        const seasons = ref([]);
        const isLoading = ref(true);
        const selectedFloor = ref(null);
        const dateRange = ref(null);

        // NOUVEAU : Variable pour vérifier si le client a accepté le règlement
        const cgvAccepted = ref(false);

        const displayFloors = computed(() => {
            if (!floors.value.length) return [];
            let list = [...floors.value];
            const total = list.reduce((sum, f) => sum + f.basePrice, 0);
            list.push({ id: 'complet', name: 'Le Chalet Complet', basePrice: total });
            return list;
        });

        const disabledDates = computed(() => {
            if (!selectedFloor.value) return [];
            let blocked = [];
            bookings.value.forEach(booking => {
                let isConflict = (selectedFloor.value === 'complet') || booking.floors.includes(selectedFloor.value);
                if (isConflict) {
                    let current = new Date(booking.startDate);
                    const end = new Date(booking.endDate);
                    while (current <= end) {
                        blocked.push(new Date(current));
                        current.setDate(current.getDate() + 1);
                    }
                }
            });
            return blocked;
        });

        const totalPrice = computed(() => {
            if (!dateRange.value || dateRange.value.length !== 2 || !selectedFloor.value) return 0;

            const start = new Date(dateRange.value[0]);
            const end = new Date(dateRange.value[1]);
            let total = 0;

            const formula = displayFloors.value.find(f => f.id === selectedFloor.value);
            if (!formula) return 0;

            const basePricePerNight = formula.basePrice;

            for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                const currentSeason = seasons.value.find(s => {
                    const seasonStart = new Date(s.startDate);
                    const seasonEnd = new Date(s.endDate);
                    return d >= seasonStart && d <= seasonEnd;
                });
                const modifier = currentSeason ? currentSeason.seasonPrice : 1.0;
                total += (basePricePerNight * modifier);
            }

            return total;
        });

        // NOUVEAU : Calcul visuel de l'acompte (30%)
        const acomptePrice = computed(() => {
            return (totalPrice.value * 0.30).toFixed(2);
        });

        const submitBooking = async () => {
            // Sécurité supplémentaire : on vérifie que la case est cochée
            if (!cgvAccepted.value) {
                alert("Veuillez accepter le règlement intérieur pour continuer.");
                return;
            }

            if (!dateRange.value || dateRange.value.length !== 2) return;

            const startDate = dateRange.value[0].toISOString().split('T')[0];
            const endDate = dateRange.value[1].toISOString().split('T')[0];

            let floorIds = [];
            if (selectedFloor.value === 'complet') {
                floorIds = floors.value.map(f => f.id);
            } else {
                floorIds = [selectedFloor.value];
            }

            try {
                const btn = document.querySelector('.btn-vosges');
                if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Redirection vers le paiement...';

                const response = await fetch('/api/reserver', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        startDate: startDate,
                        endDate: endDate,
                        floors: floorIds
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    if (result.url) {
                        window.location.href = result.url;
                    } else {
                        alert("Réservation initiée, mais erreur de redirection Stripe.");
                        window.location.reload();
                    }
                } else {
                    if (btn) btn.innerHTML = "Payer l'acompte et Réserver";
                    alert("Erreur : " + (result.error || "Une erreur est survenue."));
                }
            } catch (error) {
                console.error("Erreur lors de la réservation :", error);
                alert("Erreur de connexion au serveur.");
            }
        };

        onMounted(async () => {
            try {
                const response = await fetch('/api/calendrier');
                const data = await response.json();
                floors.value = data.floors;
                bookings.value = data.bookings;

                const seasonRes = await fetch('/api/saisons');
                seasons.value = await seasonRes.json();
            } catch (error) {
                console.error("Erreur API :", error);
            } finally {
                isLoading.value = false;
            }
        });

        return { floors, bookings, seasons, isLoading, selectedFloor, dateRange, displayFloors, disabledDates, totalPrice, acomptePrice, cgvAccepted, fr, submitBooking };
    },

    template: `
        <div class="p-4 p-md-5 rounded shadow-sm" style="background-color: var(--vosges-brume); color: var(--vosges-roche);">
            <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border" style="color: var(--vosges-sapin);" role="status"></div>
                <p class="mt-2">Chargement du planning...</p>
            </div>
            <div v-else>
                <h4 class="mb-4 text-center" style="color: var(--vosges-sapin); font-family: 'Playfair Display', serif;">
                    1. Sélectionnez votre formule
                </h4>
                <div class="row g-3 mb-4">
                    <div v-for="floor in displayFloors" :key="floor.id" class="col-md-4">
                        <div class="p-3 border rounded h-100 transition-all text-center bg-white"
                             style="cursor:pointer; transition: all 0.3s ease;"
                             :style="selectedFloor === floor.id ? 'border: 2px solid var(--vosges-bois) !important; transform: scale(1.02); box-shadow: 0 4px 6px rgba(0,0,0,0.05);' : 'border: 1px solid #ddd;'"
                             @click="selectedFloor = floor.id">
                            <h5 style="font-family: 'Playfair Display', serif; color: var(--vosges-sapin);">{{ floor.name }}</h5>
                            <p class="mb-0 fw-bold" style="color: var(--vosges-bois); font-size: 1.1rem;">{{ floor.basePrice }}€ <small class="text-muted fw-normal" style="font-size: 0.9rem;">/nuit standard</small></p>
                        </div>
                    </div>
                </div>

                <div v-if="selectedFloor" class="mt-5 text-center">
                    <h4 class="mb-4" style="color: var(--vosges-sapin); font-family: 'Playfair Display', serif;">
                        2. Vos dates de séjour
                    </h4>

                    <div class="d-flex justify-content-center w-100 mb-4">
                        <div style="background: white; border-radius: 8px; padding: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                            <VueDatePicker
                                v-model="dateRange"
                                range inline auto-apply
                                :enable-time-picker="false"
                                :disabled-dates="disabledDates"
                                :locale="fr"
                                :min-date="new Date()"
                            />
                        </div>
                    </div>

                    <div v-if="dateRange && dateRange.length === 2" class="mt-5 p-4 p-md-5 bg-white text-center" style="border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 10px 30px rgba(0,0,0,0.03);">

                        <!-- Ligne des prix revisitée -->
                        <p class="text-uppercase mb-2" style="font-size: 0.85rem; letter-spacing: 1px; color: var(--vosges-roche);">
                            Montant total du séjour : <span class="text-decoration-line-through opacity-75">{{ totalPrice }} €</span>
                        </p>

                        <h3 class="mb-4" style="color: var(--vosges-sapin); font-family: 'Playfair Display', serif;">
                            Acompte à régler aujourd'hui : <span style="color: var(--vosges-bois);">{{ acomptePrice }} €</span>
                        </h3>

                        <!-- Petit séparateur élégant -->
                        <hr style="border-color: var(--vosges-bois); opacity: 0.2; width: 50%; margin: 0 auto 2rem auto;">

                        <!-- Case à cocher épurée -->
                        <div class="d-flex justify-content-center mb-4">
                            <div class="form-check text-start" style="max-width: 500px;">
                                <!-- On force la bordure marron sur la case pour l'assortir au thème -->
                                <input class="form-check-input shadow-none" type="checkbox" v-model="cgvAccepted" id="cgvCheck" style="cursor: pointer; border-color: var(--vosges-bois); margin-top: 0.35rem;">
                                <label class="form-check-label" for="cgvCheck" style="cursor: pointer; font-size: 0.95rem; color: var(--vosges-roche);">
                                    J'ai lu et j'accepte le <a href="/reglement" target="_blank" style="color: var(--vosges-bois); text-decoration: underline;">règlement intérieur</a> (capacité, non-fumeur, etc.) et les conditions d'annulation.
                                </label>
                            </div>
                        </div>

                        <!-- Bouton avec gestion du style 'désactivé' pour garder le fond marron -->
                        <button @click="submitBooking"
                                :disabled="!cgvAccepted"
                                class="btn btn-vosges px-5 py-3"
                                :style="!cgvAccepted ? 'opacity: 0.4; cursor: not-allowed; filter: grayscale(30%);' : 'box-shadow: 0 4px 15px rgba(156, 111, 68, 0.3);'">
                            Payer l'acompte et Réserver
                        </button>

                    </div>
                </div>
                <div v-else class="text-center p-5 mt-4 border rounded" style="border-color: rgba(0,0,0,0.1) !important; border-style: dashed !important;">
                    <p class="mb-0 text-muted fs-5">Veuillez choisir une formule pour voir les dates disponibles.</p>
                </div>
            </div>
        </div>
    `
});
