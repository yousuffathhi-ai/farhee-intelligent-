import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

// Read config from firebase-applet-config.json
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Database ID if configured
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Authentication helper
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Record user profile in Firestore
    if (user) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLoginAt: serverTimestamp(),
      }, { merge: true });
    }
    return user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

export const logOut = async (): Promise<void> => {
  await fbSignOut(auth);
};

export interface CloudChatSession {
  id?: string;
  userId: string;
  title: string;
  messages: any[];
  updatedAt: any;
  createdAt: any;
}

// Cloud sync functions
export const CloudStoreService = {
  async saveChatSession(userId: string, sessionId: string, title: string, messages: any[]) {
    if (!userId) return;
    try {
      const chatDocRef = doc(db, 'users', userId, 'chat_sessions', sessionId);
      await setDoc(chatDocRef, {
        userId,
        title: title || 'Chat Session',
        messages,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error('Error saving chat session to cloud:', e);
    }
  },

  async loadUserChatSessions(userId: string): Promise<any[]> {
    if (!userId) return [];
    try {
      const q = query(
        collection(db, 'users', userId, 'chat_sessions'),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error loading chat sessions:', e);
      return [];
    }
  },

  async deleteChatSession(userId: string, sessionId: string) {
    if (!userId || !sessionId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'chat_sessions', sessionId));
    } catch (e) {
      console.error('Error deleting session:', e);
    }
  },

  async savePresentation(userId: string, presentationData: any) {
    if (!userId) return;
    try {
      const docRef = doc(db, 'users', userId, 'presentations', presentationData.id || String(Date.now()));
      await setDoc(docRef, {
        userId,
        ...presentationData,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error('Error saving presentation:', e);
    }
  }
};
