import { initializeApp } from './modules/state.js';
import { setupEventListeners } from './modules/events.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => { /* Service Worker: Registered successfully */ })
            .catch(error => console.log('Service Worker: Registration failed', error));
    });
}