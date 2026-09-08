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
  writeBatch
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

function coleccion(uid, nombre) {
  return collection(db, 'perfumeria', uid, nombre);
}
function documento(uid, nombre, id) {
  return doc(db, 'perfumeria', uid, nombre, id);
}

window.FB = {
  onAuthStateChanged: function (cb) { return onAuthStateChanged(auth, cb); },
  signIn: function (email, password) { return signInWithEmailAndPassword(auth, email, password); },
  signUp: function (email, password) { return createUserWithEmailAndPassword(auth, email, password); },
  logout: function () { return signOut(auth); },
  coleccion: coleccion,
  documento: documento,
  onColeccionSnapshot: function (uid, nombre, cb) { return onSnapshot(coleccion(uid, nombre), cb); },
  setDoc: setDoc,
  updateDoc: updateDoc,
  deleteDoc: deleteDoc,
  // Guarda la venta y descuenta el stock en una sola operación atómica:
  // si una parte falla, no se aplica ninguna (evita que stock y ventas
  // queden desincronizados).
  registrarVenta: function (uid, ventaId, venta, productoId, nuevoStock) {
    var batch = writeBatch(db);
    batch.set(documento(uid, 'ventas', ventaId), venta);
    batch.update(documento(uid, 'productos', productoId), { stock: nuevoStock });
    return batch.commit();
  }
};

window.dispatchEvent(new Event('firebase-ready'));
