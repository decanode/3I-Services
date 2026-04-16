const { db, auth } = require('../config/firebase');

class UserService {
  constructor() {
    this.collection = db.collection('users');
  }

  async findByUserId(userId) {
    const snapshot = await this.collection.where('userId', '==', userId).limit(1).get();
    if (snapshot.empty) return null;
    let user = null;
    snapshot.forEach(doc => { user = { id: doc.id, ...doc.data() }; });
    return user;
  }

  async findByEmail(email) {
    const snapshot = await this.collection.where('email', '==', email.toLowerCase().trim()).limit(1).get();
    if (snapshot.empty) return null;
    let user = null;
    snapshot.forEach(doc => { user = { id: doc.id, ...doc.data() }; });
    return user;
  }

  async findByPhone(phone) {
    if (!phone) return null;
    const snapshot = await this.collection.where('phone', '==', phone.trim()).limit(1).get();
    if (snapshot.empty) return null;
    let user = null;
    snapshot.forEach(doc => { user = { id: doc.id, ...doc.data() }; });
    return user;
  }

  async findByAdminNumber(adminNumber) {
    if (!adminNumber) return null;
    const snapshot = await this.collection.where('admin_number', '==', adminNumber.trim()).limit(1).get();
    if (snapshot.empty) return null;
    let user = null;
    snapshot.forEach(doc => { user = { id: doc.id, ...doc.data() }; });
    return user;
  }

  async createUser(userData) {
    const docRef = await this.collection.add({
      ...userData,
      email: userData.email.toLowerCase().trim(),
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...userData };
  }

  async getAllUsers() {
    const snapshot = await this.collection.get();
    const users = [];
    snapshot.forEach(doc => { users.push({ id: doc.id, ...doc.data() }); });
    return users;
  }

  async deleteUser(userId) {
    const user = await this.findByUserId(userId);
    if (!user) throw new Error('User not found in database');

    if (user.email) {
      try {
        const authUser = await auth.getUserByEmail(user.email.toLowerCase().trim());
        await auth.deleteUser(authUser.uid);
      } catch (error) {
        console.warn(`Could not delete from Firebase Auth: ${error.code || error.message}`);
      }
    }

    try {
      await this.collection.doc(user.id).delete();
    } catch (error) {
      throw new Error(`Database deletion failed: ${error.message}`);
    }

    return true;
  }

  async updateUser(userId, data) {
    const user = await this.findByUserId(userId);
    if (!user) throw new Error('User not found');
    await this.collection.doc(user.id).update({ ...data, updatedAt: new Date().toISOString() });
    return { id: user.id, ...user, ...data };
  }
}

module.exports = new UserService();
