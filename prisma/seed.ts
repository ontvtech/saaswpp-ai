import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Create Admin
  const password = await bcrypt.hash('123456', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@saaswpp.com' },
    update: {},
    create: {
      email: 'admin@saaswpp.com',
      name: 'Super Admin',
      password
    }
  });

  // 1.1. Create Niches
  const nicheMecanica = await prisma.nicheTemplate.upsert({
    where: { name: 'Mecânica' },
    update: {},
    create: {
      name: 'Mecânica',
      basePrompt: 'Você é um assistente de uma oficina mecânica de elite. Fale sobre prazos, peças originais e agendamento de revisão.'
    }
  });

  const nicheClinica = await prisma.nicheTemplate.upsert({
    where: { name: 'Clínica Médica' },
    update: {},
    create: {
      name: 'Clínica Médica',
      basePrompt: 'Você é um assistente de uma clínica médica humanizada. Priorize o acolhimento, fale sobre especialidades e agendamento de consultas.'
    }
  });

  // 1.2. Create Plans
  const planStart = await prisma.plan.upsert({
    where: { name: 'Start' },
    update: {},
    create: {
      name: 'Start',
      price: 97.0,
      tokenLimit: 50000,
      instanceLimit: 1
    }
  });

  const planPro = await prisma.plan.upsert({
    where: { name: 'Pro' },
    update: {},
    create: {
      name: 'Pro',
      price: 197.0,
      tokenLimit: 200000,
      instanceLimit: 2
    }
  });

  // 2. Create Reseller
  const reseller = await prisma.reseller.upsert({
    where: { email: 'reseller@demo.com' },
    update: {},
    create: {
      email: 'reseller@demo.com',
      name: 'Revendedor VIP',
      password,
      status: 'active'
    }
  });

  // 3. Create Merchant
  const merchant = await prisma.merchant.upsert({
    where: { email: 'merchant@demo.com' },
    update: {},
    create: {
      email: 'merchant@demo.com',
      name: 'Lojista Demo',
      status: 'active',
      planId: planPro.id,
      nicheId: nicheMecanica.id,
      resellerId: reseller.id,
      evolutionInstance: 'demo_instance',
      aiConfig: {
        prompt: 'Você é um assistente de uma loja de tecnologia. Seja ágil e técnico.'
      }
    }
  });

  // 4. Create KnowledgeBase
  await prisma.knowledgeBase.create({
    data: {
      merchantId: merchant.id,
      content: 'Nossa loja abre das 08h às 18h. Vendemos notebooks, smartphones e acessórios. Oferecemos garantia de 1 ano em todos os produtos.'
    }
  });

  // 5. Create AI Keys
  await prisma.aiKey.upsert({
    where: { key: 'demo-key-1' },
    update: {},
    create: {
      key: 'demo-key-1',
      status: 'active'
    }
  });

  // 6. Create Interaction Logs
  await prisma.interactionLog.create({
    data: {
      merchantId: merchant.id,
      sender: '5511999999999',
      question: 'Qual o horário de funcionamento?',
      answer: 'Olá! Nossa loja funciona das 08h às 18h.',
      tokensUsed: 50
    }
  });

  console.log('✅ Seed completed!');
  console.log('🔑 Admin: admin@saaswpp.com');
  console.log('🔑 Reseller: reseller@demo.com');
  console.log('🔑 Merchant: merchant@demo.com');
  console.log('🔒 Pass: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
