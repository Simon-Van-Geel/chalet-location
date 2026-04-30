import { defineComponent, ref } from 'vue';

export default defineComponent({
    setup() {
        const email = ref('');
        const subject = ref('');
        const content = ref('');
        const botField = ref(''); // Le Honeypot
        const statusMessage = ref('');
        const isError = ref(false);
        const isLoading = ref(false);

        const submitForm = async () => {
            isLoading.value = true;
            statusMessage.value = '';

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email.value,
                        subject: subject.value,
                        content: content.value,
                        phone_number_bot: botField.value // On envoie le champ piège
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    statusMessage.value = result.message;
                    isError.value = false;
                    // On vide le formulaire
                    email.value = '';
                    subject.value = '';
                    content.value = '';
                } else {
                    statusMessage.value = result.error || 'Une erreur est survenue.';
                    isError.value = true;
                }
            } catch (error) {
                statusMessage.value = "Erreur de connexion au serveur.";
                isError.value = true;
            } finally {
                isLoading.value = false;
            }
        };

        return { email, subject, content, botField, statusMessage, isError, isLoading, submitForm };
    },

    template: `
        <div class="p-4 p-md-5 rounded shadow-sm bg-white" style="color: var(--vosges-roche); max-width: 600px; margin: 0 auto;">
            <h3 class="mb-4 text-center" style="color: var(--vosges-sapin); font-family: 'Playfair Display', serif;">
                Contactez-nous
            </h3>

            <form @submit.prevent="submitForm">
                <div style="display: none;">
                    <label>Ne remplissez pas ce champ si vous êtes humain :</label>
                    <input type="text" v-model="botField" tabindex="-1" autocomplete="off">
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">Votre adresse email</label>
                    <input type="email" class="form-control" v-model="email" required placeholder="jean.dupont@email.com">
                </div>

                <div class="mb-3">
                    <label class="form-label fw-bold">Sujet</label>
                    <input type="text" class="form-control" v-model="subject" required placeholder="Question sur les équipements">
                </div>

                <div class="mb-4">
                    <label class="form-label fw-bold">Votre message</label>
                    <textarea class="form-control" v-model="content" rows="5" required placeholder="Écrivez votre message ici..."></textarea>
                </div>

                <div v-if="statusMessage" :class="['alert', isError ? 'alert-danger' : 'alert-success']" role="alert">
                    {{ statusMessage }}
                </div>

                <button type="submit" class="btn btn-vosges shadow-sm w-100 py-2" :disabled="isLoading">
                    <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                    {{ isLoading ? 'Envoi en cours...' : 'Envoyer le message' }}
                </button>
            </form>
        </div>
    `
});
