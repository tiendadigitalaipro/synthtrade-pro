import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const keys = [
    { key: 'STPP-A2K1-PROX-2026', clientName: 'Abigail - A2K Studio', type: 'PRO', status: 'ACTIVE' },
    { key: 'STPD-DEMO-TEST-2026', clientName: 'Demo User', type: 'DEMO', status: 'ACTIVE' },
    { key: 'STPP-SINT-RADE-PRO1', clientName: 'SynthTrade PRO', type: 'PRO', status: 'ACTIVE' },
  ];

  for (const data of keys) {
    await db.license.upsert({
      where: { key: data.key },
      update: {},
      create: data,
    });
    console.log(`✓ ${data.key} (${data.type})`);
  }

  console.log('\nLicencias disponibles:');
  const all = await db.license.findMany({ select: { key: true, type: true, status: true } });
  all.forEach(l => console.log(`  ${l.key} | ${l.type} | ${l.status}`));
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
