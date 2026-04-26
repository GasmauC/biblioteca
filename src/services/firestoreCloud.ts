import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import type { DocItem } from './db';

export interface CloudProvider {
  pushDocument(doc: DocItem): Promise<void>;
  pullUserDocuments(userId: string): Promise<DocItem[]>;
}

export class FirestoreCloudProvider implements CloudProvider {
  async pushDocument(docItem: DocItem): Promise<void> {
    const { id, userId, content, ...metadata } = docItem;
    
    let finalContent = content;

    // If content is a Blob (file uploaded locally), upload it to Storage
    if (content instanceof Blob) {
      const storageRef = ref(storage, `documents/${userId}/${id}`);
      await uploadBytes(storageRef, content);
      finalContent = await getDownloadURL(storageRef);
    }

    // Save metadata and content reference to Firestore
    const docRef = doc(db, 'documents', id);
    await setDoc(docRef, {
      id,
      userId,
      ...metadata,
      content: finalContent,
      syncAt: Date.now()
    }, { merge: true });
  }

  async pullUserDocuments(userId: string): Promise<DocItem[]> {
    const q = query(collection(db, 'documents'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const docs: DocItem[] = [];
    querySnapshot.forEach((doc) => {
      docs.push(doc.data() as DocItem);
    });
    
    return docs;
  }
}
