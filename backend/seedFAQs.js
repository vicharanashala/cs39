const mongoose = require('mongoose');
const { FAQThread, Answer, User } = require('./models/Schemas');
const seedData = require('./seedFAQsData');

async function seedOfficialFAQs() {
  try {
    // 1. Get or create admin user
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('[FAQ Seeder] No admin user found. Creating tentative admin user...');
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const adminPassword = await bcrypt.hash('admin123', salt);
      admin = new User({
        username: 'Admin_Ropar',
        email: 'admin@iitr.ac.in',
        password: adminPassword,
        role: 'admin',
        spPoints: 0,
        level: 1,
        trustScore: 100,
        badges: ['Staff Administrator']
      });
      await admin.save();
    }

    console.log(`[FAQ Seeder] Starting seeding of ${seedData.length} official FAQs...`);

    // Track per-section counters for auto-numbering
    const sectionCounters = {};
    for (const item of seedData) {
      const sec = item.section || '0';
      sectionCounters[sec] = (sectionCounters[sec] || 0) + 1;
    }
    // Reset and rebuild counters in order
    const resetCounters = {};

    let seededCount = 0;
    let updateCount = 0;
    for (const item of seedData) {
      const sec = item.section || '0';
      resetCounters[sec] = (resetCounters[sec] || 0) + 1;
      const faqNumber = `${sec}.${resetCounters[sec]}`;

      // Check if thread already exists
      let thread = await FAQThread.findOne({ title: item.title, isOfficial: true });
      if (!thread) {
        thread = new FAQThread({
          title: item.title,
          body: item.title,
          category: item.category,
          author: admin._id,
          authorName: admin.username,
          isOfficial: true,
          faqNumber,
          repliesCount: 1,
          status: 'active'
        });
        await thread.save();

        const answer = new Answer({
          threadId: thread._id,
          body: item.answer,
          author: admin._id,
          authorName: admin.username,
          authorRole: 'admin',
          isVerified: true,
          isPinned: false
        });
        await answer.save();
        seededCount++;
      } else {
        // Back-fill faqNumber if missing
        if (!thread.faqNumber) {
          thread.faqNumber = faqNumber;
          await thread.save();
          updateCount++;
        }
        // Ensure answer is verified
        const answer = await Answer.findOne({ threadId: thread._id, isVerified: true });
        if (!answer) {
          const newAnswer = new Answer({
            threadId: thread._id,
            body: item.answer,
            author: admin._id,
            authorName: admin.username,
            authorRole: 'admin',
            isVerified: true,
            isPinned: false
          });
          await newAnswer.save();
        }
      }
    }

    // 3. Cleanup obsolete official FAQs
    const validTitles = seedData.map(item => item.title);
    const obsoleteThreads = await FAQThread.find({ isOfficial: true, title: { $nin: validTitles } });
    if (obsoleteThreads.length > 0) {
      console.log(`[FAQ Seeder] Found ${obsoleteThreads.length} obsolete official FAQs. Cleaning up...`);
      for (const t of obsoleteThreads) {
        await Answer.deleteMany({ threadId: t._id });
        await FAQThread.findByIdAndDelete(t._id);
      }
    }

    console.log(`[FAQ Seeder] Completed. Seeded ${seededCount} new, updated ${updateCount} existing official FAQs.`);
  } catch (error) {
    console.error('[FAQ Seeder] Seeding error:', error.message);
  }
}

module.exports = seedOfficialFAQs;
