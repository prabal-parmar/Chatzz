// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut} from "firebase/auth";
import {getFirestore, setDoc, doc, query, collection, getDoc, where, getDocs} from "firebase/firestore"
import { toast } from "react-toastify";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_APIKEY,
  authDomain: import.meta.env.VITE_AUTHDOMAIN,
  projectId: import.meta.env.VITE_PROJECTID,
  storageBucket: import.meta.env.VITE_STORAGEBUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGINGSENDERID,
  appId: import.meta.env.VITE_APPID,
  measurementId: import.meta.env.VITE_MEASUREMENTID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Now I can change
const auth = getAuth(app);
const db = getFirestore(app);

const signup = async (username, email, password) => {
    try {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const user = res.user;
        await setDoc(doc(db, "users", user.uid), {
            id: user.uid,
            username:username.toLowerCase(),
            email,
            name:"",
            avatar:"",
            bio:"Hey, I am on Chatzz",
            lastseen: Date.now()
        })

        await setDoc(doc(db, "chats", user.uid), {
            chatsData:[]
        })
    } catch (error) {
        toast.error(error.code.split('/')[1].split("-").join(" "));
    }
    
}

const login = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        toast.error(error.code.split('/')[1].split("-").join(" "));
    }
}

const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error(error);
        toast.error(error.code.split('/')[1].split("-").join(" "));
    }
}

const resetPass = async (email) => {
    if(!email){
        toast.error("Enter your email");
        return null;
    }
    try {
        const userRef = collection(db, 'users');
        const q = query(userRef, where("email", "==", email));
        const querySnap = await getDocs(q);
        if(!querySnap.empty){
            await sendPasswordResetEmail(auth, email);
            toast.success("Reset Email sent");
        }
        else{
            toast.error("No user found with this email")
        }
    } catch (error) {
        console.error(error);
        toast.error(error.message)
    }
}
export {signup, login, logout, auth, db, resetPass}