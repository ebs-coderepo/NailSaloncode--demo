// Seed script — creates one demo tenant with services, staff, and working hours.
// Run with: npm run db:seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding database...');

  // ── Tenant ─────────────────────────────────────────────────────────────────
  const defaultBusinessHours = {
    '0': null,                                      // Sunday — closed
    '1': { open: '09:00', close: '19:00' },         // Monday
    '2': { open: '09:00', close: '19:00' },         // Tuesday
    '3': { open: '09:00', close: '19:00' },         // Wednesday
    '4': { open: '09:00', close: '19:00' },         // Thursday
    '5': { open: '09:00', close: '19:00' },         // Friday
    '6': { open: '09:00', close: '15:00' },         // Saturday
  };

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'luxe-nails' },
    update: {},
    create: {
      name: 'Luxe Nails & Spa',
      slug: 'luxe-nails',
      phone: '+12125550100',
      email: 'hello@luxenails.com',
      address: '123 Fifth Ave, New York, NY 10001',
      timezone: 'America/New_York',
      tagline: 'Your luxury nail experience in the heart of New York',
      primaryColor: '#db2777',
      theme: 'light',
      businessHours: defaultBusinessHours,
      bookingEnabled: true,
      socialInstagram: 'https://instagram.com/luxenailsnyc',
      socialWebsite: 'https://luxenails.com',
    },
  });

  console.log(`✅  Tenant: ${tenant.name}`);
  console.log(`🔑  API Key: ${tenant.apiKey}`);

  // ── Owner user ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'owner@luxenails.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'owner@luxenails.com',
      passwordHash,
      name: 'Salon Owner',
      role: 'OWNER',
    },
  });

  console.log('✅  Owner user: owner@luxenails.com / password123');

  // Staff user accounts — email must match the Staff record email so the
  // login service can link staffId into the JWT payload automatically.
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'jessica@luxenails.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'jessica@luxenails.com',
      passwordHash: await bcrypt.hash('password123', 10),
      name: 'Jessica Tran',
      role: 'STAFF',
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'maria@luxenails.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'maria@luxenails.com',
      passwordHash: await bcrypt.hash('password123', 10),
      name: 'Maria Santos',
      role: 'STAFF',
    },
  });

  console.log('✅  Staff users: jessica@luxenails.com / password123 | maria@luxenails.com / password123');

  // ── Services ───────────────────────────────────────────────────────────────
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 'seed-svc-1' },
      update: {},
      create: {
        id: 'seed-svc-1',
        tenantId: tenant.id,
        name: 'Classic Manicure',
        description: 'Shape, buff, and polish with regular nail color.',
        duration: 30,
        price: 25.00,
      },
    }),
    prisma.service.upsert({
      where: { id: 'seed-svc-2' },
      update: {},
      create: {
        id: 'seed-svc-2',
        tenantId: tenant.id,
        name: 'Gel Manicure',
        description: 'Long-lasting gel polish with LED cure. Includes nail prep.',
        duration: 60,
        price: 45.00,
      },
    }),
    prisma.service.upsert({
      where: { id: 'seed-svc-3' },
      update: {},
      create: {
        id: 'seed-svc-3',
        tenantId: tenant.id,
        name: 'Classic Pedicure',
        description: 'Soak, exfoliate, trim, and polish.',
        duration: 45,
        price: 40.00,
      },
    }),
    prisma.service.upsert({
      where: { id: 'seed-svc-4' },
      update: {},
      create: {
        id: 'seed-svc-4',
        tenantId: tenant.id,
        name: 'Gel Pedicure',
        description: 'Full pedicure with gel polish application.',
        duration: 75,
        price: 60.00,
      },
    }),
    prisma.service.upsert({
      where: { id: 'seed-svc-5' },
      update: {},
      create: {
        id: 'seed-svc-5',
        tenantId: tenant.id,
        name: 'Full Set Acrylic',
        description: 'Full set of acrylic nail extensions with color.',
        duration: 90,
        price: 75.00,
      },
    }),
  ]);

  console.log(`✅  Services: ${services.map((s) => s.name).join(', ')}`);

  // ── Staff ──────────────────────────────────────────────────────────────────
  const staff1 = await prisma.staff.upsert({
    where: { id: 'seed-staff-1' },
    update: {},
    create: {
      id: 'seed-staff-1',
      tenantId: tenant.id,
      name: 'Jessica Tran',
      email: 'jessica@luxenails.com',
      phone: '+12125550101',
      bio: 'Specializes in gel nails and nail art. 8 years experience.',
    },
  });

  const staff2 = await prisma.staff.upsert({
    where: { id: 'seed-staff-2' },
    update: {},
    create: {
      id: 'seed-staff-2',
      tenantId: tenant.id,
      name: 'Maria Santos',
      email: 'maria@luxenails.com',
      phone: '+12125550102',
      bio: 'Pedicure and acrylic specialist. 5 years experience.',
    },
  });

  console.log(`✅  Staff: ${staff1.name}, ${staff2.name}`);

  // ── Staff ↔ Service assignments ────────────────────────────────────────────
  // Jessica: Classic Mani, Gel Mani, Classic Pedi
  // Maria: Classic Pedi, Gel Pedi, Full Set Acrylic
  const assignments = [
    { staffId: staff1.id, serviceId: 'seed-svc-1' },
    { staffId: staff1.id, serviceId: 'seed-svc-2' },
    { staffId: staff1.id, serviceId: 'seed-svc-3' },
    { staffId: staff2.id, serviceId: 'seed-svc-3' },
    { staffId: staff2.id, serviceId: 'seed-svc-4' },
    { staffId: staff2.id, serviceId: 'seed-svc-5' },
  ];

  for (const a of assignments) {
    await prisma.staffService.upsert({
      where: { staffId_serviceId: a },
      update: {},
      create: a,
    });
  }

  console.log('✅  Staff service assignments created');

  // ── Working hours (Mon–Sat, 9am–7pm for both staff) ───────────────────────
  const workingDays = [1, 2, 3, 4, 5, 6]; // Mon–Sat
  for (const staffMember of [staff1, staff2]) {
    for (const day of workingDays) {
      await prisma.workingHours.upsert({
        where: { staffId_dayOfWeek: { staffId: staffMember.id, dayOfWeek: day } },
        update: {},
        create: {
          tenantId: tenant.id,
          staffId: staffMember.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '19:00',
          isWorking: true,
        },
      });
    }
  }

  console.log('✅  Working hours set (Mon–Sat 9am–7pm)');

  // ── Voice config ───────────────────────────────────────────────────────────
  await prisma.voiceConfig.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      greeting: "Thank you for calling Luxe Nails and Spa! I'm your AI receptionist. How can I help you today?",
      language: 'en-US',
      systemPrompt: 'You are a friendly receptionist for Luxe Nails & Spa. Help callers book, reschedule, or cancel nail appointments. Always confirm the service, preferred staff, and date/time.',
    },
  });

  console.log('✅  Voice config created');

  console.log('\n──────────────────────────────────────────');
  console.log('🎉  Seed complete! Test the services endpoint:');
  console.log(`\ncurl -H "x-api-key: ${tenant.apiKey}" http://localhost:3001/v1/tools/services\n`);
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
