// Service worker for FCM background notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config object template. Handled in useNotifications to inject during service worker registration if necessary,
// or initialized with local project presets which safely fall back.
const firebaseConfig = {
  apiKey: "mock-apiKey",
  authDomain: "mock-authDomain",
  projectId: "stiri-api",
  storageBucket: "mock-storageBucket",
  messagingSenderId: "mock-messagingSenderId",
  appId: "mock-appId"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Chronos Time Guardian';
  const notificationOptions = {
    body: payload.notification?.body || 'You have an approaching task deadline!',
    icon: payload.notification?.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: {
      url: payload.data?.click_action || '/dashboard'
    },
    actions: [
      { action: 'open', title: 'Open Chronos' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
