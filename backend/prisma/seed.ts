import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPowerCurve = [
  { v: 0, p: 0 },
  { v: 3, p: 0 },
  { v: 5, p: 500 },
  { v: 8, p: 1500 },
  { v: 11, p: 2500 },
  { v: 14, p: 3000 },
  { v: 25, p: 3000 },
];

const windRose = {
  bins: [
    { direction: 0, speed: 8.5, frequency: 0.12 },
    { direction: 30, speed: 7.2, frequency: 0.08 },
    { direction: 60, speed: 6.5, frequency: 0.06 },
    { direction: 90, speed: 7.8, frequency: 0.10 },
    { direction: 120, speed: 8.2, frequency: 0.11 },
    { direction: 150, speed: 9.1, frequency: 0.14 },
    { direction: 180, speed: 8.8, frequency: 0.13 },
    { direction: 210, speed: 9.5, frequency: 0.15 },
    { direction: 240, speed: 7.5, frequency: 0.07 },
    { direction: 270, speed: 6.8, frequency: 0.03 },
    { direction: 300, speed: 5.9, frequency: 0.01 },
    { direction: 330, speed: 7.0, frequency: 0.00 },
  ],
};

function jitter(base: number, amount: number): number {
  return base + (Math.random() - 0.5) * amount;
}

async function main() {
  console.log('Seeding database...');

  await prisma.scenarioVersion.deleteMany();
  await prisma.turbine.deleteMany();
  await prisma.result.deleteMany();
  await prisma.scenario.deleteMany();

  const scenario = await prisma.scenario.create({
    data: {
      id: 'default',
      name: 'Large Wind Farm - 10k+ Turbines',
      windRose,
    },
  });

  console.log(`Created scenario: ${scenario.name}`);

  const turbines: any[] = [];
  const rows = 100;
  const cols = 110;
  const spacing = 800;
  const rotation = 15;

  const cosR = Math.cos((rotation * Math.PI) / 180);
  const sinR = Math.sin((rotation * Math.PI) / 180);

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const baseX = j * spacing;
      const baseY = i * spacing;

      const rotatedX = baseX * cosR - baseY * sinR;
      const rotatedY = baseX * sinR + baseY * cosR;

      turbines.push({
        id: `t${i}_${j}`,
        scenarioId: scenario.id,
        x: jitter(rotatedX, 50),
        y: jitter(rotatedY, 50),
        hubHeight: jitter(100, 5),
        rotorD: jitter(120, 3),
        powerCurve: defaultPowerCurve,
      });

      if (turbines.length >= 1000) {
        await prisma.turbine.createMany({ data: turbines });
        console.log(`Created ${turbines.length} turbines...`);
        turbines.length = 0;
      }
    }
  }

  if (turbines.length > 0) {
    await prisma.turbine.createMany({ data: turbines });
  }

  const count = await prisma.turbine.count({
    where: { scenarioId: scenario.id },
  });

  console.log(`Total turbines created: ${count}`);

  const snapshot = {
    turbines: await prisma.turbine.findMany({
      where: { scenarioId: scenario.id },
      select: {
        id: true,
        x: true,
        y: true,
        hubHeight: true,
        rotorD: true,
        powerCurve: true,
      },
    }),
  };

  await prisma.scenarioVersion.create({
    data: {
      scenarioId: scenario.id,
      version: 1,
      snapshot,
    },
  });

  console.log('Created initial snapshot (version 1)');
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
