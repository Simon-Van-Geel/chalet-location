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
        const seasons = ref([]); // NOUVEAU : Stockage des saisons
        const isLoading = ref(true);
        const selectedFloor = ref(null);
        const dateRange = ref(null);

        // Création des formules (RDC, 1er, Complet)
        const displayFloors = computed(() => {
            if (!floors.value.length) return [];
            let list = [...floors.value];
            const total = list.reduce((sum, f) => sum + f.basePrice, 0);
            list.push({ id: 'complet', name: 'Le Chalet Complet', basePrice: total });
            return list;
        });

        // Calcul des dates bloquées
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

        // NOUVEAU : Calcul dynamique du prix total avec multiplicateur de saison
        const totalPrice = computed(() => {
            if (!dateRange.value || dateRange.value.length !== 2 || !selectedFloor.value) return 0;

            const start = new Date(dateRange.value[0]);
            const end = new Date(dateRange.value[1]);
            let total = 0;

            // On récupère le prix de base de la formule sélectionnée
            const formula = displayFloors.value.find(f => f.id === selectedFloor.value);
            if (!formula) return 0;

            const basePricePerNight = formula.basePrice;

            // Boucle : On calcule le prix pour CHAQUE nuit
            for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {

                // On cherche si ce jour précis tombe dans une saison spéciale
                const currentSeason = seasons.value.find(s => {
                    const seasonStart = new Date(s.startDate);
                    const seasonEnd = new Date(s.endDate);
                    return d >= seasonStart && d <= seasonEnd;
                });

                // Si on trouve une saison, on prend son multiplicateur (ex: 1.5). Sinon, c'est 1.0 (Prix normal).
                // On utilise seasonPrice car c'est le nom de ta colonne en base de données.
                const modifier = currentSeason ? currentSeason.seasonPrice : 1.0;

                // On additionne le prix de la nuit avec le multiplicateur
                total += (basePricePerNight * modifier);
            }

            return total;
        });

        const submitBooking = async () => {
            if (!dateRange.value || dateRange.value.length !== 2) return;

            // ... (Le début de ta fonction reste identique : formatage des dates et des IDs d'étages)
            const startDate = dateRange.value[0].toISOString().split('T')[0];
            const endDate = dateRange.value[1].toISOString().split('T')[0];

            let floorIds = [];
            if (selectedFloor.value === 'complet') {
                floorIds = floors.value.map(f => f.id);
            } else {
                floorIds = [selectedFloor.value];
            }

            try {
                // On met un petit feedback visuel pour rassurer le client pendant le chargement Stripe
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
                    // 🔥 LA MODIFICATION EST ICI 🔥
                    // On vérifie si Symfony nous a bien renvoyé l'URL Stripe
                    if (result.url) {
                        // On redirige le navigateur du client vers la page de paiement Stripe
                        window.location.href = result.url;
                    } else {
                        // Sécurité au cas où il n'y a pas d'URL
                        alert("Réservation confirmée, mais erreur de redirection vers le paiement.");
                        window.location.reload();
                    }
                } else {
                    if (btn) btn.innerHTML = 'Réserver maintenant'; // On remet le bouton normal
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

        return { floors, bookings, seasons, isLoading, selectedFloor, dateRange, displayFloors, disabledDates, totalPrice, fr, submitBooking };
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

                    <div v-if="dateRange && dateRange.length === 2" class="mt-4 p-4 border rounded bg-white shadow-sm text-center">
                        <h5 class="text-muted mb-2">Montant total de votre séjour</h5>
                        <h2 class="fw-bold mb-3" style="color: var(--vosges-bois);">{{ totalPrice }} €</h2>

                        <button @click="submitBooking" class="btn btn-vosges shadow-sm fs-5 px-5 py-3 w-100 w-md-auto">
                            Réserver maintenant
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
