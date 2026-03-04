import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import 'firebase/compat/analytics';
import 'firebase/compat/remote-config';

const firebaseConfig = {
    apiKey: "AIzaSyC5nqsx4Fe4gMKkKdvnbMf8VFnI6TYL64k",
    authDomain: "pida-ai.com",
    projectId: "pida-ai-v20",
    storageBucket: "pida-ai-v20.firebasestorage.app",
    messagingSenderId: "465781488910",
    appId: "1:465781488910:web:6f9c2b4bc91317a6bbab5f",
    measurementId: "G-4FEDD254GY"
};

// Inicializar Firebase solo si no se ha iniciado antes
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    firebase.analytics();
}

// Exportar los servicios para usarlos en el resto de la app
export const auth = firebase.auth();
export const db = firebase.firestore();
export const remoteConfig = firebase.remoteConfig();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });