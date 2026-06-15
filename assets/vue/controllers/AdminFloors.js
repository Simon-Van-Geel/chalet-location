import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
    setup() {
        const floors = ref([]);
        const isLoading = ref(true);
        const notification = ref({ show: false, message: '', type: 'success' });

        const editModal = ref({
            show: false,
            floor: null,
            isLoading: false,
            error: ''
        });

        const showNotification = (message, type = 'success') => {
            notification.value = { show: true, message, type };
            setTimeout(() => { notification.value.show = false; }, 4000);
        };

        const fetchFloors = async () => {
            try {
                const response = await fetch('/api/admin/floors');
                if (response.ok) {
                    floors.value = await response.json();
                }
            } catch (error) {
                console.error("Erreur de chargement :", error);
            } finally {
                isLoading.value = false;
            }
        };

        const openEditModal = (floor) => {
            // On fait une copie de l'objet pour ne pas modifier l'affichage en direct
            editModal.value = {
                show: true,
                floor: { ...floor },
                isLoading: false,
                error: ''
            };
        };

        const closeEditModal = () => {
            editModal.value.show = false;
        };

        const saveFloor = async () => {
            editModal.value.isLoading = true;
            editModal.value.error = '';

            try {
                const response = await fetch(`/api/admin/floors/${editModal.value.floor.id}/edit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editModal.value.floor)
                });

                if (response.ok) {
                    // Met à jour l'étage dans la liste affichée
                    const index = floors.value.findIndex(f => f.id === editModal.value.floor.id);
                    if (index !== -1) floors.value[index] = { ...editModal.value.floor };

                    showNotification(`Les informations pour "${editModal.value.floor.name}" ont été sauvegardées.`, "success");
                    closeEditModal();
                } else {
                    const errorData = await response.json();
                    editModal.value.error = errorData.error || "Mise à jour impossible.";
                }
            } catch (error) {
                editModal.value.error = "Erreur de connexion au serveur.";
            } finally {
                editModal.value.isLoading = false;
            }
        };

        onMounted(fetchFloors);

        return { floors, isLoading, editModal, openEditModal, closeEditModal, saveFloor, notification };
    },

    template: `
        <div class="bg-white p-4 rounded border shadow-sm">
            <h3 class="mb-4" style="color: var(--vosges-roche);">
                <i class="bi bi-house-door me-2"></i> Formules de Location (Étages)
            </h3>

            <p class="text-muted mb-4">
                Gérez ici le nom, la description, la capacité d'accueil et les tarifs de vos différentes formules de location.
            </p>

            <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border" style="color: var(--vosges-sapin);" role="status"></div>
            </div>

            <div v-else class="row g-4">
                <div v-for="floor in floors" :key="floor.id" class="col-md-6 col-xl-4">
                    <div class="card h-100 border-0 shadow-sm" style="background-color: #f8f9fa;">
                        <div class="card-body d-flex flex-column">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title fw-bold m-0" style="color: var(--vosges-sapin);">{{ floor.name }}</h5>
                                <span class="badge bg-secondary"><i class="bi bi-people-fill me-1"></i> {{ floor.capacity }} pers.</span>
                            </div>

                            <p class="small text-muted flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                                {{ floor.description || 'Aucune description renseignée pour le moment.' }}
                            </p>

                            <ul class="list-group list-group-flush bg-transparent mb-3">
                                <li class="list-group-item bg-transparent px-0 d-flex justify-content-between align-items-center">
                                    <span class="small text-muted fw-bold">Prix de base</span>
                                    <span class="fw-bold">{{ floor.basePrice }} € / nuit</span>
                                </li>
                                <li class="list-group-item bg-transparent px-0 d-flex justify-content-between align-items-center">
                                    <span class="small text-muted fw-bold">Caution requise</span>
                                    <span>{{ floor.deposit }} €</span>
                                </li>
                            </ul>

                            <button class="btn btn-outline-secondary w-100" @click="openEditModal(floor)">
                                <i class="bi bi-pencil-square me-2"></i> Modifier
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="editModal.show" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5); z-index: 1050;">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header text-white border-0" style="background-color: var(--vosges-sapin);">
                            <h5 class="modal-title"><i class="bi bi-pencil-square me-2"></i> Modifier l'étage</h5>
                        </div>
                        <div class="modal-body p-4">
                            <div v-if="editModal.error" class="alert alert-danger py-2 small fw-bold">{{ editModal.error }}</div>

                            <div class="row g-3">
                                <div class="col-md-8">
                                    <label class="form-label fw-bold" style="color: var(--vosges-roche);">Nom de la formule</label>
                                    <input type="text" class="form-control" v-model="editModal.floor.name" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-bold" style="color: var(--vosges-roche);">Capacité (personnes)</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-people-fill"></i></span>
                                        <input type="number" class="form-control" v-model="editModal.floor.capacity" min="1">
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-bold" style="color: var(--vosges-roche);">Description publique</label>
                                    <textarea class="form-control" v-model="editModal.floor.description" rows="4" placeholder="Décrivez les atouts de cet étage (chambres, équipements spécifiques...)"></textarea>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-bold small text-muted">Prix de base / nuit (€)</label>
                                    <div class="input-group">
                                        <input type="number" class="form-control" v-model="editModal.floor.basePrice" min="0" step="0.01">
                                        <span class="input-group-text">€</span>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-bold small text-muted">Montant de la caution (€)</label>
                                    <div class="input-group">
                                        <input type="number" class="form-control" v-model="editModal.floor.deposit" min="0" step="10">
                                        <span class="input-group-text">€</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer bg-light border-0 justify-content-between">
                            <button type="button" class="btn btn-secondary" @click="closeEditModal" :disabled="editModal.isLoading">Annuler</button>
                            <button type="button" class="btn text-white" style="background-color: var(--vosges-sapin);" @click="saveFloor" :disabled="editModal.isLoading">
                                <span v-if="editModal.isLoading" class="spinner-border spinner-border-sm me-2"></span>
                                <i v-else class="bi bi-save me-2"></i> Enregistrer les modifications
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="notification.show" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1100;">
                <div class="toast show align-items-center text-white border-0 shadow bg-success" role="alert">
                    <div class="d-flex">
                        <div class="toast-body fw-bold">
                            <i class="bi bi-check-circle-fill me-2"></i> {{ notification.message }}
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="notification.show = false"></button>
                    </div>
                </div>
            </div>

        </div>
    `
});
