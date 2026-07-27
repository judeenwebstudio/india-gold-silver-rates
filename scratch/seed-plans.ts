import 'dotenv/config';
import { seedSchemeData } from '../lib/schemes/seed-data.js';

async function main() {
  console.log('Seeding 6 scheme plans into database...');
  const res = await seedSchemeData();
  console.log('Successfully seeded scheme plans!');
}

main().catch(console.error);
