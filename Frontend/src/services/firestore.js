import { db } from '../config/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';

/**
 * Saves a meeting note and its summary to Firestore
 */
export const saveMeetingSummary = async (userId, rawNotes, summary) => {
  try {
    const docRef = await addDoc(collection(db, 'summaries'), {
      userId,
      rawNotes,
      summary,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving note:", error);
    throw error;
  }
};

/**
 * Sets up a real-time listener for the user's meeting summaries
 * @param {string} userId - The ID of the logged-in user
 * @param {function} callback - Function to run whenever data updates
 */
export const subscribeToUserNotes = (userId, callback) => {
  const q = query(
    collection(db, 'summaries'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(notes);
  });
};

/**
 * One-time fetch of user notes (Alternative to real-time)
 */
export const fetchUserNotes = async (userId) => {
  const q = query(
    collection(db, 'summaries'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
