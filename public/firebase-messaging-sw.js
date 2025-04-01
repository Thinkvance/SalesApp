importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAwHe1Ci22MD09r-skn7OZLyYBdEX35L74",
  authDomain: "shiphitmobileapppickup-4d0a1.firebaseapp.com",
  projectId: "shiphitmobileapppickup-4d0a1",
  storageBucket: "shiphitmobileapppickup-4d0a1.appspot.com",
  messagingSenderId: "977746945332",
  appId: "1:977746945332:web:17c4aa3b217b35cf58f161",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
