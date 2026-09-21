const mongoose = require('mongoose');
const env = require('../src/config/env');
const Competition = require('../src/models/Competition');

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const competitions = await Competition.find({});
  for (const comp of competitions) {
    console.log(`\nCompetition: ${comp.name} (${comp._id})`);
    console.log(`Main Image: ${comp.imageUrl}`);
    if (comp.categoryGroups) {
      comp.categoryGroups.forEach((g, idx) => {
        console.log(` Group ${idx + 1} (${g.name}):`, g.pictures);
      });
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
