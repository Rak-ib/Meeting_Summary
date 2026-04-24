import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';

/**
 * Deletes multiple meeting documents from Firestore
 */
export const deleteMeetings = async (docIds) => {
  try {
    for (const id of docIds) {
      const docRef = doc(db, 'summaries', id);
      await deleteDoc(docRef);
    }
  } catch (error) {
    console.error("Firestore Delete Error:", error);
    throw error;
  }
};

/**
 * Saves a meeting note and its summary to Firestore
 */
export const saveMeetingSummary = async (userId, rawNotes, summary, actionItems = [], title = "Untitled Meeting") => {
  try {
    const docRef = await addDoc(collection(db, 'summaries'), {
      userId,
      rawNotes,
      summary,
      actionItems,
      title,
      createdAt: serverTimestamp(),
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
  }, (error) => {
    console.error("Firestore Subscribe Error:", error);
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

/**
 * Updates the completion status of a specific action item in a summary document
 */
export const updateActionItemStatus = async (docId, actionItems) => {
  try {
    const docRef = doc(db, 'summaries', docId);
    await updateDoc(docRef, { actionItems });
  } catch (error) {
    console.error("Error updating action item:", error);
    throw error;
  }
};

/**
 * Updates the title of a specific meeting document
 */
export const updateMeetingTitle = async (docId, title) => {
  try {
    const docRef = doc(db, 'summaries', docId);
    await updateDoc(docRef, { title });
  } catch (error) {
    console.error("Error updating title:", error);
    throw error;
  }
};

