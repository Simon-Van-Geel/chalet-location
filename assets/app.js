import './styles/app.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import './stimulus_bootstrap.js';

import { registerVueControllerComponents } from '@symfony/ux-vue';

import BookingCalendar from './vue/controllers/BookingCalendar.js';
import UserDashboard from './vue/controllers/UserDashboard.js';
import AdminDashboard from './vue/controllers/AdminDashboard.js';
import ContactForm from './vue/controllers/ContactForm.js';

registerVueControllerComponents({
    BookingCalendar: BookingCalendar,
    UserDashboard: UserDashboard,
    AdminDashboard: AdminDashboard,
    ContactForm : ContactForm,
});

console.log('AssetMapper est aux commandes ! 🎉');
