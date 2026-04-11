const { db } = require('../config/firebase');

class ActivityService {
  constructor() {
    this.collection = db.collection('loginActivities');
  }

  async recordLogin(userId) {
    const now = new Date();
    await this.collection.add({
      userId,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      timestamp: now.toISOString()
    });
    await this.cleanup(userId);
  }

  async cleanup(userId) {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    if (snapshot.size <= 2) return;

    const activities = [];
    snapshot.forEach(doc => {
      activities.push({ ref: doc.ref, timestamp: doc.data().timestamp || '' });
    });

    activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    await Promise.all(activities.slice(2).map(a => a.ref.delete()));
  }

  async getLastLogin(userId) {
    // Requires Firestore index: (userId ASC, timestamp DESC) on loginActivities
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  // Fetch all login activities in one query and return a userId → latest-activity map.
  // Use this on the admin dashboard instead of N individual getLastLogin() calls.
  async getAllLastLogins() {
    const snapshot = await this.collection.get();
    const map = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const { userId, timestamp } = data;
      if (!userId) return;
      if (!map[userId] || (timestamp || '') > (map[userId].timestamp || '')) {
        map[userId] = data;
      }
    });
    return map;
  }
}

module.exports = new ActivityService();
