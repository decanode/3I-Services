const { db } = require('../config/firebase');
async function reserveIds(counterDocId, n) {
  const counterRef = db.collection('counters').doc(counterDocId);
  return db.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    const current = snap.exists ? (snap.data().count || 0) : 0;
    const newCount = current + n;
    t.set(counterRef, { count: newCount }, { merge: true });
    return { firstId: current + 1, lastId: newCount };
  });
}

async function reserveMasterIds(n = 1) {
  return reserveIds('master_counter', n);
}

async function reserveLogIds(n = 1) {
  return reserveIds('log_counter', n);
}

module.exports = { reserveMasterIds, reserveLogIds };
