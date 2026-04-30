import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
    setup() {
        const messages = ref([]);
        const isLoading = ref(true);

        const fetchMessages = async () => {
            try {
                const response = await fetch('/api/admin/contacts');
                if (response.ok) {
                    messages.value = await response.json();
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des messages :", error);
            } finally {
                isLoading.value = false;
            }
        };

        const markAsRead = async (id) => {
            try {
                const response = await fetch(`/api/admin/contacts/${id}/read`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (response.ok) {
                    const msg = messages.value.find(m => m.id === id);
                    if (msg) msg.isRead = true;
                }
            } catch (error) {
                console.error("Erreur :", error);
            }
        };

        onMounted(fetchMessages);

        return { messages, isLoading, markAsRead };
    },

    template: `
        <div class="bg-white p-4 rounded shadow-sm border">
            <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border text-success" role="status"></div>
            </div>

            <div v-else-if="messages.length === 0" class="alert alert-info">
                Aucun message reçu pour le moment.
            </div>

            <div v-else class="list-group list-group-flush">
                <div v-for="msg in messages" :key="msg.id"
                     class="list-group-item p-4 mb-3 border rounded shadow-sm transition-all"
                     :style="!msg.isRead ? 'border-left: 5px solid var(--vosges-bois) !important; background-color: #f8f9fa;' : ''">

                    <div class="d-flex w-100 justify-content-between align-items-start mb-2">
                        <div>
                            <h5 class="mb-1 fw-bold" style="color: var(--vosges-sapin);">{{ msg.subject }}</h5>
                            <p class="text-muted mb-0" style="font-size: 0.9rem;">
                                <strong>De :</strong> {{ msg.email }}
                            </p>
                        </div>
                        <small class="text-muted">{{ msg.createdAt }}</small>
                    </div>

                    <p class="my-3" style="white-space: pre-wrap; color: var(--vosges-roche);">{{ msg.content }} </p>

                    <div class="text-end mt-2">
                        <button v-if="!msg.isRead" @click="markAsRead(msg.id)" class="btn btn-sm btn-vosges">
                            Marquer comme lu
                        </button>
                        <span v-else class="badge bg-light text-muted border">Message lu</span>
                    </div>
                </div>
            </div>
        </div>
    `
});
