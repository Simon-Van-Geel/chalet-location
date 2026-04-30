import { defineComponent, ref } from 'vue';
import AdminBookings from './AdminBookings.js';
import AdminMessages from './AdminMessages.js';
import AdminGallery from './AdminGallery.js';

export default defineComponent({
    components: {
        AdminBookings,
        AdminMessages,
        AdminGallery
    },

    setup() {
        const activeTab = ref('bookings');
        return { activeTab };
    },

    template: `
        <div class="container-fluid py-4">
            <h1 class="mb-4" style="color: var(--vosges-sapin); font-family: 'Playfair Display', serif;">
                Tableau de bord Administrateur
            </h1>

            <ul class="nav nav-tabs mb-4">
                <li class="nav-item">
                    <a class="nav-link fw-bold"
                       :class="{ active: activeTab === 'bookings' }"
                       @click.prevent="activeTab = 'bookings'"
                       href="#"
                       :style="activeTab === 'bookings' ? 'color: var(--vosges-sapin); border-bottom: 2px solid var(--vosges-sapin);' : 'color: #6c757d;'">
                         Gestion des Réservations
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link fw-bold"
                       :class="{ active: activeTab === 'messages' }"
                       @click.prevent="activeTab = 'messages'"
                       href="#"
                       :style="activeTab === 'messages' ? 'color: var(--vosges-sapin); border-bottom: 2px solid var(--vosges-sapin);' : 'color: #6c757d;'">
                       Boîte de réception (Messages)
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link fw-bold"
                       :class="{ active: activeTab === 'gallery' }"
                       @click.prevent="activeTab = 'gallery'"
                       href="#"
                       :style="activeTab === 'gallery' ? 'color: var(--vosges-sapin); border-bottom: 2px solid var(--vosges-sapin);' : 'color: #6c757d;'">
                       Gallerie Photo
                    </a>
                </li>
            </ul>

            <div class="p-2">
                <AdminBookings v-if="activeTab === 'bookings'" />
                <AdminMessages v-if="activeTab === 'messages'" />
                <AdminGallery v-if="activeTab === 'gallery'" />
            </div>
        </div>
    `
});
