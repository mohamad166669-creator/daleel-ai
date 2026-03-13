import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    addDoc,
    query,
    orderBy,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBQoxpxtlJGEYpyg82SZbyZnsRJw79hdFY",
    authDomain: "dalel-7cf8e.firebaseapp.com",
    projectId: "dalel-7cf8e",
    storageBucket: "dalel-7cf8e.appspot.com",
    messagingSenderId: "869340541234",
    appId: "1:869340541234:web:7bfcfb8355e48dbe45672b",
    measurementId: "G-REQL4FK3QL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export {
    auth,
    db,
    provider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    doc,
    getDoc,
    setDoc,
    collection,
    addDoc,
    query,
    orderBy,
    getDocs
};

export async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user exists in Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                firstLoginDate: new Date().toISOString()
            });
            // Mark as new user in session storage to handle first greeting
            sessionStorage.setItem('isNewUser', 'true');
        } else {
            sessionStorage.setItem('isNewUser', 'false');
        }

        window.location.href = 'chat.html';
    } catch (error) {
        console.error("Error signing in with Google", error);
        alert("فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.");
    }
}
