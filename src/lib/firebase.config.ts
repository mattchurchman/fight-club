// Firebase web config is public, not a secret (docs/ARCHITECTURE.md "Environments").
export const firebaseConfig = {
  apiKey: 'AIzaSyD8l6vE3l1HaiJZZBww7HIO5NGFL3dOrAQ',
  // Matches the domain the app is actually served from (fight-club-4de90.web.app), not the
  // default .firebaseapp.com — a redirect sign-in that hops through a *different* domain and
  // back is exactly the case Safari's cross-site storage restrictions (ITP) silently break,
  // losing the pending-redirect state and dropping the user back on /login with no error.
  authDomain: 'fight-club-4de90.web.app',
  projectId: 'fight-club-4de90',
  storageBucket: 'fight-club-4de90.firebasestorage.app',
  messagingSenderId: '947055080588',
  appId: '1:947055080588:web:a2beba2cf382ef3a08b7a9',
};
