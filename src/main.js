import App from './App.html';
import { Store } from 'svelte/store.js';

/** Service Worker */
if (window.navigator.serviceWorker) {
  window.navigator.serviceWorker.register('sw.js')
}

/** State Management */
/*** set up */
const store = new Store({
  name: 'Web Application',
  page: 'homepage',
  addScrumb: false,
  scrumbs: localStorage.getItem('scrumbs')
  ? JSON.parse(localStorage.getItem('scrumbs'))
  : {todo: [], wip: [], testing: [], done: [], unassigned: []},
  draggedScrumb: {}
});
/*** handling */
store.on('state', ({changed, current}) => {
  /**** Routing event */
  if (changed.page) location.hash = `#${current.page}`;
  /**** localStorage on scrumbs */
  if (changed.scrumbs) localStorage.setItem('scrumbs', JSON.stringify(current.scrumbs))
})

/** Routing */
/*** on create */
location.hash.indexOf('#') < 0
? location.hash = '#scrumb-dashboard'
: store.set({
  page: location.hash === '' || location.hash.substr(1) === '' ? 'scrumb-dashboard' : location.hash.substr(1)
});
/*** location on state  */
window.onhashchange = () => {
  if (store.get().page !== location.hash.substr(1)) store.set({page: location.hash.substr(1)})
}

/** Rendering */
const app = new App({
	target: document.body.querySelector('#nwa'),
  store
});

/** Debugging */
window.store = store;


export default app;
