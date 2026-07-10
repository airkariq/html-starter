import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import webpush from 'web-push';

function db() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return getFirestore();
}
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-app-key');
}
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (req.headers['x-app-key'] !== process.env.APP_KEY) return res.status(401).json({ error: 'unauthorized' });
  const { title, body, url, tag } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required' });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({ title, body: body || '', url: url || '/', tag: tag || null });

  const snap = await db().collection('push_subscriptions').get();
  let sent = 0, removed = 0;
  await Promise.all(snap.docs.map(async (doc) => {
    const s = doc.data();
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload); sent++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { await doc.ref.delete(); removed++; } }
  }));
  return res.status(200).json({ ok: true, sent, removed, total: snap.size });
}
