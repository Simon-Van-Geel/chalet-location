import './styles/app.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import './stimulus_bootstrap.js';

import { registerVueControllerComponents } from '@symfony/ux-vue';

import BookingCalendar from './vue/controllers/BookingCalendar.js';
import UserDashboard from './vue/controllers/UserDashboard.js';
import AdminDashboard from './vue/controllers/AdminDashboard.js';

registerVueControllerComponents({
    BookingCalendar: BookingCalendar,
    UserDashboard: UserDashboard,
    AdminDashboard: AdminDashboard,
});

console.log('AssetMapper est aux commandes ! 🎉');
