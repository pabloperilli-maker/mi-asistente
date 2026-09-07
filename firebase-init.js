import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkVqmXR3s8Kwf8JG4Vn7u_9kMAaC2H0ys",
  authDomain: "mi-asistente-e09db.firebaseapp.com",
  projectId: "mi-asistente-e09db",
  storageBucket: "mi-asistente-e09db.firebasestorage.app",
  messagingSenderId: "113319484998",
  appId: "1:113319484998:web:1a9b9134b4714ec2783447"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.FB = {
  onAuthStateChanged: function (cb) { return onAuthStateChanged(auth, cb); },
  signIn: function (email, password) { return signInWithEmailAndPassword(auth, email, password); },
  signUp: function (email, password) { return createUserWithEmailAndPassword(auth, email, password); },
  logout: function () { return signOut(auth); },
  tasksCollection: function (uid) { return collection(db, 'users', uid, 'tasks'); },
  taskDoc: function (uid, id) { return doc(db, 'users', uid, 'tasks', id); },
  onTasksSnapshot: function (uid, cb) { return onSnapshot(collection(db, 'users', uid, 'tasks'), cb); },
  getTasksOnce: function (uid) { return getDocs(collection(db, 'users', uid, 'tasks')); },
  setDoc: setDoc,
  updateDoc: updateDoc,
  deleteDoc: deleteDoc
};

window.dispatchEvent(new Event('firebase-ready'));
