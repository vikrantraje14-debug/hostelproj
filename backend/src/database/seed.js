import { env } from "../config/env.js";
import { getMongoDatabase } from "../config/database.js";
import { log } from "../utils/logger.js";

const demoLabel = "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA";
const fixtures = {
  hostels: [
    {
      _id: "00000000-0000-4000-8000-000000000001",
      code: "DEMO-HOSTEL-001",
      name: `${demoLabel}: Example Hostel`,
      description: `${demoLabel}: Example description only.`,
      address: `${demoLabel}: No address supplied.`,
      capacity: null,
      is_active: true,
      is_demo: true,
    },
  ],
  facilities: [
    {
      _id: "00000000-0000-4000-8000-000000000011",
      code: "DEMO-FACILITY-001",
      name: `${demoLabel}: Example facility A`,
      description: `${demoLabel}: No facility details supplied.`,
      is_demo: true,
    },
    {
      _id: "00000000-0000-4000-8000-000000000012",
      code: "DEMO-FACILITY-002",
      name: `${demoLabel}: Example facility B`,
      description: `${demoLabel}: No facility details supplied.`,
      is_demo: true,
    },
  ],
  notices: [
    {
      _id: "00000000-0000-4000-8000-000000000021",
      title: `${demoLabel}: Example notice`,
      body: `${demoLabel}: No notice was supplied.`,
      status: "draft",
      is_demo: true,
    },
  ],
  rules: [
    {
      _id: "00000000-0000-4000-8000-000000000031",
      rule_code: "DEMO-RULE-001",
      title: `${demoLabel}: Example rule`,
      body: `${demoLabel}: No approved rules were supplied.`,
      status: "draft",
      is_demo: true,
    },
  ],
  important_dates: [
    {
      _id: "00000000-0000-4000-8000-000000000041",
      admission_year: 2099,
      event_code: "DEMO-DATE-001",
      title: `${demoLabel}: No date supplied`,
      description: `${demoLabel}: Dates are intentionally blank.`,
      status: "draft",
      is_demo: true,
    },
  ],
};

async function seedDevelopmentData() {
  if (env.NODE_ENV !== "development" || !env.SEED_DEMO_DATA) {
    throw new Error(
      "Demo seeding requires NODE_ENV=development and SEED_DEMO_DATA=true.",
    );
  }
  const database = await getMongoDatabase();
  for (const [collectionName, records] of Object.entries(fixtures)) {
    const collection = database.collection(collectionName);
    for (const record of records) {
      await collection.updateOne(
        { _id: record._id },
        {
          $setOnInsert: {
            ...record,
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
        { upsert: true },
      );
    }
  }
  log("info", "Development demo seed completed", { label: demoLabel });
}

seedDevelopmentData().catch((error) => {
  log("error", "Development demo seed failed", { errorName: error.name });
  process.exitCode = 1;
});
