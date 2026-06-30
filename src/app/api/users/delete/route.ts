import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { adminDb } from '@/lib/firebase-admin';

// Helper to safely delete all documents in a collection via chunked batching (400 ops max per batch)
async function deleteCollectionDocs(collectionRef: FirebaseFirestore.CollectionReference) {
  const snapshot = await collectionRef.get();
  if (snapshot.size === 0) return;

  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = adminDb.batch();
    const chunk = docs.slice(i, i + 400);
    chunk.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`[API DELETE Users] Commencing complete database purge for user: ${userId}`);

    const subcollections = ['tasks', 'goals', 'habits', 'analytics', 'notifications', 'gamification'];
    const userDocRef = adminDb.collection('users').doc(userId);

    // 1. Purge all subcollections
    for (const sub of subcollections) {
      const colRef = userDocRef.collection(sub);
      await deleteCollectionDocs(colRef);
    }

    // 2. Delete the main user document
    await userDocRef.delete();

    console.log(`[API DELETE Users] Purge complete for user: ${userId}`);
    return NextResponse.json({ success: true, message: 'User account and all collections successfully purged.' });
  } catch (error) {
    const err = error as Error;
    console.error('[API DELETE Users] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
