import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
    props: {
        isLoggedIn: {
            type: Boolean,
            default: false
        }
    },

    setup(props) {
        const reviews = ref([]);
        const isLoading = ref(true);

        // Pour le nouveau formulaire
        const newReview = ref({ rating: 5, comment: '' });
        const isSubmitting = ref(false);
        const submitMessage = ref('');
        const submitError = ref('');

        const fetchReviews = async () => {
            try {
                const response = await fetch('/api/reviews');
                if (response.ok) {
                    reviews.value = await response.json();
                }
            } catch (error) {
                console.error("Erreur lors du chargement des avis", error);
            } finally {
                isLoading.value = false;
            }
        };

        const submitReviewForm = async () => {
            if (!newReview.value.comment || newReview.value.rating < 1) {
                submitError.value = "Veuillez laisser une note et un commentaire.";
                return;
            }

            isSubmitting.value = true;
            submitError.value = '';
            submitMessage.value = '';

            try {
                const response = await fetch('/api/reviews/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        rating: newReview.value.rating,
                        comment: newReview.value.comment
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    submitMessage.value = result.message;
                    newReview.value.comment = ''; // On vide le champ
                    newReview.value.rating = 5;
                } else {
                    submitError.value = result.error || "Une erreur est survenue.";
                }
            } catch (error) {
                submitError.value = "Erreur de communication avec le serveur.";
            } finally {
                isSubmitting.value = false;
            }
        };

        const setRating = (star) => {
            newReview.value.rating = star;
        };

        onMounted(fetchReviews);

        return {
            reviews, isLoading, props,
            newReview, isSubmitting, submitMessage, submitError,
            submitReviewForm, setRating
        };
    },

    template: `
        <div class="container py-5">
            <h2 class="text-center mb-5 fw-bold" style="color: var(--vosges-sapin); font-family: 'Playfair Display', serif;">
                L'avis de nos voyageurs
            </h2>

            <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border text-success" role="status"></div>
            </div>

            <div v-else-if="reviews.length === 0" class="alert alert-light text-center border-0 shadow-sm rounded-3 py-4 text-muted">
                Soyez le premier à laisser un avis après votre séjour au Chalet !
            </div>

            <div v-else class="row g-4 mb-5">
                <div v-for="review in reviews" :key="review.id" class="col-md-6 col-lg-4">
                    <div class="card h-100 border-0 shadow-sm p-3" style="border-radius: 12px; background-color: var(--vosges-brume);">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="mb-0 fw-bold" style="color: var(--vosges-sapin);">{{ review.authorName }}</h5>
                            <small class="text-muted">{{ review.date }}</small>
                        </div>
                        <div class="mb-2" style="color: #ffc107;">
                            <i v-for="i in 5" :key="i" class="bi" :class="i <= review.rating ? 'bi-star-fill' : 'bi-star'"></i>
                        </div>
                        <p class="card-text text-muted fst-italic flex-grow-1" style="font-size: 0.95rem;">
                            "{{ review.comment }}"
                        </p>
                    </div>
                </div>
            </div>

            <hr style="border-color: var(--vosges-bois); opacity: 0.2; margin: 3rem 0;">

            <div class="row justify-content-center">
                <div class="col-md-8">
                    <div class="card border border-light shadow-sm" style="border-radius: 12px;">
                        <div class="card-body p-4 p-md-5">

                            <h4 class="mb-4 text-center" style="color: var(--vosges-sapin);">Partagez votre expérience</h4>

                            <div v-if="props.isLoggedIn">
                                <div v-if="submitMessage" class="alert alert-success fw-bold text-center">
                                    <i class="bi bi-check-circle-fill me-2"></i> {{ submitMessage }}
                                </div>
                                <div v-if="submitError" class="alert alert-danger">{{ submitError }}</div>

                                <form @submit.prevent="submitReviewForm" v-if="!submitMessage">
                                    <div class="mb-4 text-center">
                                        <label class="form-label fw-bold d-block text-muted">Votre note</label>
                                        <div style="font-size: 2rem; color: #ffc107; cursor: pointer;">
                                            <i v-for="i in 5" :key="i" class="bi me-2"
                                               :class="i <= newReview.rating ? 'bi-star-fill' : 'bi-star'"
                                               @click="setRating(i)">
                                            </i>
                                        </div>
                                    </div>

                                    <div class="mb-4">
                                        <label class="form-label fw-bold text-muted">Votre commentaire</label>
                                        <textarea class="form-control" v-model="newReview.comment" rows="4" placeholder="Qu'avez-vous pensé de votre séjour au chalet ?" required></textarea>
                                    </div>

                                    <div class="text-center">
                                        <button type="submit" class="btn px-5 py-2 fw-bold text-white" style="background-color: var(--vosges-bois);" :disabled="isSubmitting">
                                            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                                            {{ isSubmitting ? 'Envoi...' : 'Publier mon avis' }}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div v-else class="text-center py-3">
                                <p class="text-muted mb-4">Vous devez être connecté à votre espace client pour laisser un avis.</p>
                                <a href="/login" class="btn text-white fw-bold px-4" style="background-color: var(--vosges-sapin);">
                                    Se connecter
                                </a>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
});
