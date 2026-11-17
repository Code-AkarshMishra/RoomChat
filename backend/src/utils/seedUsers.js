require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const CoupleMeta = require('../models/CoupleMeta');

const seedUsers = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<username>')) {
    console.log('ℹ️  Skipping Atlas seeding: MONGO_URI not configured. In-memory accounts are active.');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Atlas for seeding...');

    const p1Id = (process.env.PARTNER_ONE_USER_ID || 'alex').toLowerCase();
    const p1Pass = process.env.PARTNER_ONE_PASS || 'SecretPass@123';
    const p1Pin = process.env.PARTNER_ONE_PIN || '1337';
    const p1Name = process.env.PARTNER_ONE_NAME || 'Alex';

    const p2Id = (process.env.PARTNER_TWO_USER_ID || 'sam').toLowerCase();
    const p2Pass = process.env.PARTNER_TWO_PASS || 'SecretPass@456';
    const p2Pin = process.env.PARTNER_TWO_PIN || '7331';
    const p2Name = process.env.PARTNER_TWO_NAME || 'Sam';

    // Partner 1
    const p1Exists = await User.findOne({ userId: p1Id });
    if (!p1Exists) {
      const passHash1 = await User.hashPassword(p1Pass);
      const pinHash1 = await User.hashPIN(p1Pin);
      await User.create({
        userId: p1Id,
        displayName: p1Name,
        passwordHash: passHash1,
        pinHash: pinHash1,
        partnerId: p2Id,
        vibeStatus: { emoji: '💖', text: 'Thinking of you' },
      });
      console.log(`✅ Seeded partner 1: ${p1Name} (${p1Id})`);
    } else {
      console.log(`ℹ️  Partner 1 (${p1Id}) already exists.`);
    }

    // Partner 2
    const p2Exists = await User.findOne({ userId: p2Id });
    if (!p2Exists) {
      const passHash2 = await User.hashPassword(p2Pass);
      const pinHash2 = await User.hashPIN(p2Pin);
      await User.create({
        userId: p2Id,
        displayName: p2Name,
        passwordHash: passHash2,
        pinHash: pinHash2,
        partnerId: p1Id,
        vibeStatus: { emoji: '✨', text: 'Counting down the seconds' },
      });
      console.log(`✅ Seeded partner 2: ${p2Name} (${p2Id})`);
    } else {
      console.log(`ℹ️  Partner 2 (${p2Id}) already exists.`);
    }

    // Couple Meta
    const metaExists = await CoupleMeta.findOne({ coupleId: 'couple_primary' });
    if (!metaExists) {
      await CoupleMeta.create({
        coupleId: 'couple_primary',
        countdownTitle: 'Next Time We Meet ✈️💖',
        countdownTargetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        notes: 'Our private universe 🌌',
      });
      console.log('✅ Seeded couple countdown metadata.');
    }

    console.log('✨ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedUsers();
}

module.exports = seedUsers;

