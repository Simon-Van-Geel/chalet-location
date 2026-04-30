import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
    setup() {
        const images = ref([]);
        const floors = ref([]); // NOUVEAU : Pour stocker la liste des étages
        const isLoading = ref(true);
        const isUploading = ref(false);

        // Références pour le formulaire
        const selectedFile = ref(null);
        const altText = ref('');
        const selectedFloorId = ref(''); // NOUVEAU : Pour stocker l'ID de l'étage choisi
        const fileInput = ref(null);

        // Variables pour nos messages visuels
        const errorMessage = ref('');
        const successMessage = ref('');

        // NOUVEAU : Fonction pour récupérer les étages depuis ton API
        const fetchFloors = async () => {
            try {
                // On utilise ta route /api/calendrier qui renvoie déjà la liste des étages
                const response = await fetch('/api/calendrier');
                if (response.ok) {
                    const data = await response.json();
                    floors.value = data.floors;
                }
            } catch (error) {
                console.error("Erreur de chargement des étages :", error);
            }
        };

        const fetchGallery = async () => {
            try {
                const response = await fetch('/api/gallery');
                if (response.ok) {
                    images.value = await response.json();
                }
            } catch (error) {
                console.error("Erreur de chargement de la galerie :", error);
            } finally {
                isLoading.value = false;
            }
        };

        const onFileChange = (event) => {
            selectedFile.value = event.target.files[0];
            errorMessage.value = ''; // On cache l'erreur si l'utilisateur change de fichier
        };

        const uploadPhoto = async () => {
            if (!selectedFile.value) {
                errorMessage.value = "Veuillez sélectionner une image.";
                return;
            }

            isUploading.value = true;
            errorMessage.value = '';
            successMessage.value = '';

            const formData = new FormData();
            formData.append('photo', selectedFile.value);
            formData.append('altText', altText.value);
            // NOUVEAU : On ajoute l'ID de l'étage s'il a été sélectionné
            if (selectedFloorId.value) {
                formData.append('floorId', selectedFloorId.value);
            }

            try {
                const response = await fetch('/api/admin/gallery/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    successMessage.value = result.message;

                    // On recharge la galerie pour afficher la nouvelle photo
                    await fetchGallery();

                    // On vide le formulaire
                    altText.value = '';
                    selectedFloorId.value = ''; // On réinitialise la liste déroulante
                    selectedFile.value = null;
                    if (fileInput.value) fileInput.value.value = '';

                    // Le message vert disparaît après 3 secondes
                    setTimeout(() => successMessage.value = '', 3000);
                } else {
                    const error = await response.json();
                    errorMessage.value = error.error || "Erreur lors de l'envoi.";
                }
            } catch (error) {
                errorMessage.value = "Erreur de connexion au serveur.";
            } finally {
                isUploading.value = false;
            }
        };

        const deletePhoto = async (id) => {
            if (!confirm("Êtes-vous sûr de vouloir supprimer cette photo définitivement ?")) {
                return;
            }

            try {
                const response = await fetch(`/api/admin/gallery/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    const result = await response.json();
                    successMessage.value = result.message;
                    errorMessage.value = '';

                    await fetchGallery();

                    setTimeout(() => successMessage.value = '', 3000);
                } else {
                    const error = await response.json();
                    errorMessage.value = error.error || "Erreur lors de la suppression.";
                }
            } catch (error) {
                errorMessage.value = "Erreur de communication avec le serveur.";
            }
        };

        onMounted(() => {
            fetchGallery();
            fetchFloors(); // NOUVEAU : On charge les étages au montage du composant
        });

        return {
            images, floors, isLoading, isUploading,
            altText, selectedFloorId, fileInput, onFileChange, uploadPhoto,
            errorMessage, successMessage,
            deletePhoto
        };
    },

    template: `
        <div class="bg-white p-4 rounded shadow-sm border">
            <h3 class="mb-4" style="color: var(--vosges-sapin);">Ajouter une photo</h3>

            <div v-if="errorMessage" class="alert alert-danger fw-bold shadow-sm" role="alert">
                 {{ errorMessage }}
            </div>
            <div v-if="successMessage" class="alert alert-success fw-bold shadow-sm" role="alert">
                 {{ successMessage }}
            </div>
            <form @submit.prevent="uploadPhoto" class="mb-5 p-3 bg-light rounded border">
                <div class="row align-items-end">
                    <div class="col-md-3 mb-3 mb-md-0">
                        <label class="form-label fw-bold">Sélectionnez une image</label>
                        <input type="file" class="form-control" @change="onFileChange" ref="fileInput" accept="image/jpeg, image/png, image/webp" required>
                    </div>

                    <!-- NOUVEAU : Liste déroulante pour les étages -->
                    <div class="col-md-3 mb-3 mb-md-0">
                        <label class="form-label fw-bold">Étage (Optionnel)</label>
                        <select class="form-select" v-model="selectedFloorId">
                            <option value="">Tous les étages / Extérieur</option>
                            <option v-for="floor in floors" :key="floor.id" :value="floor.id">
                                {{ floor.name }}
                            </option>
                        </select>
                    </div>

                    <div class="col-md-4 mb-3 mb-md-0">
                        <label class="form-label fw-bold">Texte (Optionnel)</label>
                        <input type="text" class="form-control" v-model="altText" placeholder="Laissé vide = géré auto">
                    </div>

                    <div class="col-md-2">
                        <button type="submit" class="btn btn-vosges w-100" :disabled="isUploading">
                            <span v-if="isUploading" class="spinner-border spinner-border-sm"></span>
                            {{ isUploading ? 'Envoi...' : 'Ajouter' }}
                        </button>
                    </div>
                </div>
            </form>

            <hr class="mb-4">

            <h3 class="mb-4" style="color: var(--vosges-sapin);">Photos actuelles</h3>

            <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border text-success" role="status"></div>
            </div>

            <div v-else-if="images.length === 0" class="alert alert-info">
                La galerie est vide. Ajoutez votre première photo ci-dessus !
            </div>

            <div v-else class="row g-3">
                <div v-for="img in images" :key="img.id" class="col-6 col-md-4 col-lg-3">
                    <div class="card h-100 shadow-sm border-0">
                        <img :src="img.url" :alt="img.altText" class="card-img-top" style="height: 150px; object-fit: cover;">
                        <div class="card-body p-2 d-flex justify-content-between align-items-center">
                            <small class="text-muted text-truncate" :title="img.altText" style="max-width: 75%;">
                                {{ img.altText || 'Sans description' }}
                            </small>
                            <button @click="deletePhoto(img.id)" class="btn btn-sm btn-outline-danger border-0" title="Supprimer la photo">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
});
