import Vue from 'vue'
import moment from 'moment';
import axios from 'axios'
import VueMomentJS from "vue-momentjs";
import App from './App.vue'

Vue.config.productionTip = false
Vue.use(VueMomentJS, moment);
Vue.prototype.$axios = axios.create()

new Vue({
  render: h => h(App),
}).$mount('#app')
