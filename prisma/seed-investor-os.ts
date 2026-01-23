/**
 * Seed Script for Investor OS
 * Creates sample data for testing the complete system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Investor OS database...\n');

  // Clean up existing data (in reverse dependency order)
  console.log('🗑️  Cleaning up existing data...');
  await prisma.task.deleteMany();
  await prisma.fact.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.relationship.deleteMany();
  await prisma.lPCommitment.deleteMany();
  await prisma.investmentMetric.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.organizationMetric.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.person.deleteMany();
  console.log('✅ Cleanup complete\n');

  // === PEOPLE ===
  console.log('👥 Creating people...');

  const people = await Promise.all([
    // LPs
    prisma.person.create({
      data: {
        firstName: 'Sarah',
        lastName: 'Chen',
        fullName: 'Sarah Chen',
        email: 'sarah@allocator.com',
        phone: '+1-415-555-0100',
        linkedInUrl: 'https://linkedin.com/in/sarahchen',
        canonicalKey: 'sarah@allocator.com',
        lastContactedAt: new Date('2026-01-15')
      }
    }),
    prisma.person.create({
      data: {
        firstName: 'Michael',
        lastName: 'Rodriguez',
        fullName: 'Michael Rodriguez',
        email: 'mike@familyoffice.com',
        phone: '+1-212-555-0200',
        linkedInUrl: 'https://linkedin.com/in/mrodriguez',
        canonicalKey: 'mike@familyoffice.com',
        lastContactedAt: new Date('2026-01-10')
      }
    }),

    // Founders
    prisma.person.create({
      data: {
        firstName: 'Alex',
        lastName: 'Thompson',
        fullName: 'Alex Thompson',
        email: 'alex@vertex.xyz',
        phone: '+1-650-555-0300',
        linkedInUrl: 'https://linkedin.com/in/alexthompson',
        canonicalKey: 'alex@vertex.xyz',
        lastContactedAt: new Date('2026-01-20')
      }
    }),
    prisma.person.create({
      data: {
        firstName: 'Emily',
        lastName: 'Park',
        fullName: 'Emily Park',
        email: 'emily@soundwaves.io',
        phone: '+1-310-555-0400',
        linkedInUrl: 'https://linkedin.com/in/emilypark',
        canonicalKey: 'emily@soundwaves.io',
        lastContactedAt: new Date('2026-01-18')
      }
    }),
    prisma.person.create({
      data: {
        firstName: 'James',
        lastName: 'Wilson',
        fullName: 'James Wilson',
        email: 'james@neuralnet.ai',
        phone: '+1-415-555-0500',
        linkedInUrl: 'https://linkedin.com/in/jameswilson',
        canonicalKey: 'james@neuralnet.ai',
        lastContactedAt: new Date('2026-01-12')
      }
    })
  ]);

  console.log(`✅ Created ${people.length} people\n`);

  // === ORGANIZATIONS ===
  console.log('🏢 Creating organizations...');

  // LP Organizations
  const lpOrg = await prisma.organization.create({
    data: {
      name: 'Sequoia Capital',
      legalName: 'Sequoia Capital Operations, LLC',
      domain: 'sequoiacap.com',
      website: 'https://sequoiacap.com',
      organizationType: 'LP',
      industry: 'Venture Capital',
      description: 'Major VC firm and LP investor',
      canonicalKey: 'sequoiacap.com'
    }
  });

  // Portfolio Companies
  const vertexProtocol = await prisma.organization.create({
    data: {
      name: 'Vertex Protocol',
      legalName: 'Vertex Protocol Inc.',
      domain: 'vertex.xyz',
      website: 'https://vertex.xyz',
      organizationType: 'PORTFOLIO',
      industry: 'DeFi',
      stage: 'SERIES_A',
      description: 'Decentralized derivatives exchange',
      canonicalKey: 'vertex.xyz'
    }
  });

  const soundwaves = await prisma.organization.create({
    data: {
      name: 'Soundwaves',
      legalName: 'Soundwaves Inc.',
      domain: 'soundwaves.io',
      website: 'https://soundwaves.io',
      organizationType: 'PORTFOLIO',
      industry: 'Web3',
      stage: 'SEED',
      description: 'Music NFT marketplace',
      canonicalKey: 'soundwaves.io'
    }
  });

  const neuralNet = await prisma.organization.create({
    data: {
      name: 'NeuralNet AI',
      legalName: 'NeuralNet AI Corporation',
      domain: 'neuralnet.ai',
      website: 'https://neuralnet.ai',
      organizationType: 'PORTFOLIO',
      industry: 'AI/ML',
      stage: 'SERIES_B',
      description: 'Enterprise AI infrastructure',
      canonicalKey: 'neuralnet.ai'
    }
  });

  // Prospects
  const quantumLabs = await prisma.organization.create({
    data: {
      name: 'Quantum Labs',
      legalName: 'Quantum Labs Inc.',
      domain: 'quantum-labs.com',
      website: 'https://quantum-labs.com',
      organizationType: 'PROSPECT',
      industry: 'Infrastructure',
      stage: 'SEED',
      description: 'Quantum computing infrastructure',
      canonicalKey: 'quantum-labs.com'
    }
  });

  const ecosync = await prisma.organization.create({
    data: {
      name: 'EcoSync',
      legalName: 'EcoSync Technologies',
      domain: 'ecosync.green',
      website: 'https://ecosync.green',
      organizationType: 'PROSPECT',
      industry: 'Climate Tech',
      stage: 'PRE_SEED',
      description: 'Carbon credit marketplace',
      canonicalKey: 'ecosync.green'
    }
  });

  console.log(`✅ Created 6 organizations\n`);

  // === RELATIONSHIPS ===
  console.log('🔗 Creating relationships...');

  const relationships = await Promise.all([
    // Founders to Companies
    prisma.relationship.create({
      data: {
        sourceType: 'Person',
        sourceId: people[2].id,
        targetType: 'Organization',
        targetId: vertexProtocol.id,
        relationshipType: 'FOUNDED',
        properties: { role: 'CEO', startDate: '2024-01-01' },
        strength: 1.0,
        confidence: 1.0,
        sourceOfTruth: 'manual'
      }
    }),
    prisma.relationship.create({
      data: {
        sourceType: 'Person',
        sourceId: people[3].id,
        targetType: 'Organization',
        targetId: soundwaves.id,
        relationshipType: 'FOUNDED',
        properties: { role: 'CEO & Co-Founder', startDate: '2024-06-01' },
        strength: 1.0,
        confidence: 1.0,
        sourceOfTruth: 'manual'
      }
    }),
    prisma.relationship.create({
      data: {
        sourceType: 'Person',
        sourceId: people[4].id,
        targetType: 'Organization',
        targetId: neuralNet.id,
        relationshipType: 'FOUNDED',
        properties: { role: 'CTO & Co-Founder', startDate: '2023-03-01' },
        strength: 1.0,
        confidence: 1.0,
        sourceOfTruth: 'manual'
      }
    }),

    // LPs to Fund
    prisma.relationship.create({
      data: {
        sourceType: 'Person',
        sourceId: people[0].id,
        targetType: 'Organization',
        targetId: lpOrg.id,
        relationshipType: 'WORKS_AT',
        properties: { role: 'Managing Partner' },
        strength: 1.0,
        confidence: 1.0,
        sourceOfTruth: 'manual'
      }
    }),
    prisma.relationship.create({
      data: {
        sourceType: 'Person',
        sourceId: people[1].id,
        targetType: 'Organization',
        targetId: lpOrg.id,
        relationshipType: 'WORKS_AT',
        properties: { role: 'Investment Director' },
        strength: 0.9,
        confidence: 1.0,
        sourceOfTruth: 'manual'
      }
    })
  ]);

  console.log(`✅ Created ${relationships.length} relationships\n`);

  // === DEALS ===
  console.log('💼 Creating deals...');

  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        name: 'Vertex Protocol Series A',
        organizationId: vertexProtocol.id,
        stage: 'PORTFOLIO',
        dealType: 'EQUITY',
        askAmount: 5000000,
        ourAllocation: 2000000,
        valuation: 25000000,
        valuationType: 'post',
        expectedCloseDate: new Date('2025-09-01'),
        actualCloseDate: new Date('2025-09-15')
      }
    }),
    prisma.deal.create({
      data: {
        name: 'Soundwaves SAFE',
        organizationId: soundwaves.id,
        stage: 'PORTFOLIO',
        dealType: 'SAFE',
        askAmount: 1000000,
        ourAllocation: 500000,
        valuation: 10000000,
        valuationType: 'cap',
        expectedCloseDate: new Date('2025-11-15'),
        actualCloseDate: new Date('2025-11-20')
      }
    }),
    prisma.deal.create({
      data: {
        name: 'NeuralNet Series B',
        organizationId: neuralNet.id,
        stage: 'PORTFOLIO',
        dealType: 'EQUITY',
        askAmount: 15000000,
        ourAllocation: 3000000,
        valuation: 75000000,
        valuationType: 'post',
        expectedCloseDate: new Date('2024-06-01'),
        actualCloseDate: new Date('2024-06-15')
      }
    }),
    prisma.deal.create({
      data: {
        name: 'Quantum Labs Seed',
        organizationId: quantumLabs.id,
        stage: 'DILIGENCE',
        dealType: 'EQUITY',
        askAmount: 3000000,
        valuation: 15000000,
        valuationType: 'pre',
        expectedCloseDate: new Date('2026-03-01')
      }
    }),
    prisma.deal.create({
      data: {
        name: 'EcoSync Pre-Seed',
        organizationId: ecosync.id,
        stage: 'FIRST_CALL',
        dealType: 'SAFE',
        askAmount: 500000,
        valuation: 5000000,
        valuationType: 'cap',
        expectedCloseDate: new Date('2026-04-01')
      }
    })
  ]);

  console.log(`✅ Created ${deals.length} deals\n`);

  // === INVESTMENTS ===
  console.log('💰 Creating investments...');

  const investments = await Promise.all([
    prisma.investment.create({
      data: {
        organizationId: vertexProtocol.id,
        dealId: deals[0].id,
        investmentDate: new Date('2025-09-15'),
        amountInvested: 2000000,
        instrumentType: 'Equity',
        ownership: 8.0,
        valuation: 25000000,
        currentValue: 2400000,
        status: 'ACTIVE'
      }
    }),
    prisma.investment.create({
      data: {
        organizationId: soundwaves.id,
        dealId: deals[1].id,
        investmentDate: new Date('2025-11-20'),
        amountInvested: 500000,
        instrumentType: 'SAFE',
        ownership: 5.0,
        valuation: 10000000,
        currentValue: 600000,
        status: 'ACTIVE'
      }
    }),
    prisma.investment.create({
      data: {
        organizationId: neuralNet.id,
        dealId: deals[2].id,
        investmentDate: new Date('2024-06-15'),
        amountInvested: 3000000,
        instrumentType: 'Equity',
        ownership: 4.0,
        valuation: 75000000,
        currentValue: 5000000,
        status: 'ACTIVE'
      }
    })
  ]);

  console.log(`✅ Created ${investments.length} investments\n`);

  // === LP COMMITMENTS ===
  console.log('💵 Creating LP commitments...');

  const lpCommitments = await Promise.all([
    prisma.lPCommitment.create({
      data: {
        person: { connect: { id: people[0].id } },
        fundName: 'Red Beard Ventures Fund I',
        commitmentAmount: 5000000,
        calledAmount: 3000000,
        distributedAmount: 500000,
        commitmentDate: new Date('2024-01-01'),
        status: 'active'
      }
    }),
    prisma.lPCommitment.create({
      data: {
        person: { connect: { id: people[1].id } },
        fundName: 'Red Beard Ventures Fund I',
        commitmentAmount: 2000000,
        calledAmount: 1500000,
        distributedAmount: 200000,
        commitmentDate: new Date('2024-02-15'),
        status: 'active'
      }
    }),
    prisma.lPCommitment.create({
      data: {
        organization: { connect: { id: lpOrg.id } },
        fundName: 'Red Beard Ventures Fund I',
        commitmentAmount: 10000000,
        calledAmount: 6000000,
        distributedAmount: 800000,
        commitmentDate: new Date('2024-01-15'),
        status: 'active'
      }
    })
  ]);

  console.log(`✅ Created ${lpCommitments.length} LP commitments\n`);

  // === CONVERSATIONS ===
  console.log('💬 Creating conversations...');

  const conversations = await Promise.all([
    prisma.conversation.create({
      data: {
        conversationDate: new Date('2026-01-20'),
        medium: 'CALL',
        title: 'Vertex Protocol Q4 Update',
        summary: 'Strong growth in TVL, discussed Series B plans',
        sourceType: 'manual',
        privacyTier: 'INTERNAL',
        participants: {
          connect: [{ id: people[2].id }]
        },
        organizations: {
          connect: [{ id: vertexProtocol.id }]
        },
        deals: {
          connect: [{ id: deals[0].id }]
        }
      }
    }),
    prisma.conversation.create({
      data: {
        conversationDate: new Date('2026-01-18'),
        medium: 'CALL',
        title: 'Soundwaves User Growth Discussion',
        summary: 'Hit 100K users, exploring B2B opportunities',
        sourceType: 'manual',
        privacyTier: 'INTERNAL',
        participants: {
          connect: [{ id: people[3].id }]
        },
        organizations: {
          connect: [{ id: soundwaves.id }]
        }
      }
    }),
    prisma.conversation.create({
      data: {
        conversationDate: new Date('2026-01-15'),
        medium: 'MEETING',
        title: 'LP Quarterly Update Call',
        summary: 'Presented Fund I performance, pipeline overview',
        sourceType: 'manual',
        privacyTier: 'INTERNAL',
        participants: {
          connect: [
            { id: people[0].id },
            { id: people[1].id }
          ]
        },
        organizations: {
          connect: [{ id: lpOrg.id }]
        }
      }
    })
  ]);

  console.log(`✅ Created ${conversations.length} conversations\n`);

  // === FACTS ===
  console.log('📊 Creating facts...');

  const facts = await Promise.all([
    // Vertex Protocol facts
    prisma.fact.create({
      data: {
        organizationId: vertexProtocol.id,
        factType: 'metric',
        key: 'MRR',
        value: '250000',
        sourceType: 'conversation',
        sourceId: conversations[0].id,
        confidence: 0.9,
        validFrom: new Date('2026-01-20')
      }
    }),
    prisma.fact.create({
      data: {
        organizationId: vertexProtocol.id,
        factType: 'metric',
        key: 'burn_rate',
        value: '180000',
        sourceType: 'conversation',
        sourceId: conversations[0].id,
        confidence: 0.9,
        validFrom: new Date('2026-01-20')
      }
    }),
    prisma.fact.create({
      data: {
        organizationId: vertexProtocol.id,
        factType: 'metric',
        key: 'runway',
        value: '18',
        sourceType: 'conversation',
        sourceId: conversations[0].id,
        confidence: 0.9,
        validFrom: new Date('2026-01-20')
      }
    }),

    // Soundwaves facts
    prisma.fact.create({
      data: {
        organizationId: soundwaves.id,
        factType: 'metric',
        key: 'active_users',
        value: '100000',
        sourceType: 'conversation',
        sourceId: conversations[1].id,
        confidence: 1.0,
        validFrom: new Date('2026-01-18')
      }
    }),
    prisma.fact.create({
      data: {
        organizationId: soundwaves.id,
        factType: 'metric',
        key: 'burn_rate',
        value: '65000',
        sourceType: 'conversation',
        sourceId: conversations[1].id,
        confidence: 0.9,
        validFrom: new Date('2026-01-18')
      }
    })
  ]);

  console.log(`✅ Created ${facts.length} facts\n`);

  // === TASKS ===
  console.log('✅ Creating tasks...');

  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Prepare Series B materials for Vertex',
        description: 'Draft pitch deck and financial model',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date('2026-02-15'),
        relatedOrganizationId: vertexProtocol.id,
        sourceConversationId: conversations[0].id
      }
    }),
    prisma.task.create({
      data: {
        title: 'Introduce Soundwaves to potential B2B customer',
        description: 'Connect Emily to Warner Music contacts',
        status: 'OPEN',
        priority: 'MEDIUM',
        dueDate: new Date('2026-02-01'),
        relatedOrganizationId: soundwaves.id,
        sourceConversationId: conversations[1].id
      }
    }),
    prisma.task.create({
      data: {
        title: 'Send Q1 LP update',
        description: 'Portfolio performance and new investments',
        status: 'OPEN',
        priority: 'HIGH',
        dueDate: new Date('2026-04-05')
      }
    }),
    prisma.task.create({
      data: {
        title: 'Complete technical diligence on Quantum Labs',
        description: 'Review architecture, talk to reference customers',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date('2026-02-10'),
        relatedOrganizationId: quantumLabs.id,
        relatedDealId: deals[3].id
      }
    })
  ]);

  console.log(`✅ Created ${tasks.length} tasks\n`);

  // === METRICS ===
  console.log('📈 Creating metrics...');

  const metrics = await Promise.all([
    // Vertex Protocol metrics (time series)
    prisma.organizationMetric.create({
      data: {
        organizationId: vertexProtocol.id,
        metricType: 'MRR',
        value: 200000,
        unit: 'USD',
        snapshotDate: new Date('2025-12-01'),
        sourceType: 'manual',
        confidence: 1.0
      }
    }),
    prisma.organizationMetric.create({
      data: {
        organizationId: vertexProtocol.id,
        metricType: 'MRR',
        value: 225000,
        unit: 'USD',
        snapshotDate: new Date('2026-01-01'),
        sourceType: 'manual',
        confidence: 1.0
      }
    }),
    prisma.organizationMetric.create({
      data: {
        organizationId: vertexProtocol.id,
        metricType: 'MRR',
        value: 250000,
        unit: 'USD',
        snapshotDate: new Date('2026-01-20'),
        sourceType: 'conversation',
        confidence: 0.9
      }
    }),

    // Investment metrics
    prisma.investmentMetric.create({
      data: {
        investmentId: investments[0].id,
        metricType: 'valuation',
        value: 2400000,
        unit: 'USD',
        snapshotDate: new Date('2026-01-20'),
        sourceType: 'manual',
        confidence: 0.8
      }
    })
  ]);

  console.log(`✅ Created ${metrics.length} metrics\n`);

  console.log('✨ Seed complete! Summary:');
  console.log(`   👥 ${people.length} people`);
  console.log(`   🏢 6 organizations`);
  console.log(`   🔗 ${relationships.length} relationships`);
  console.log(`   💼 ${deals.length} deals`);
  console.log(`   💰 ${investments.length} investments`);
  console.log(`   💵 ${lpCommitments.length} LP commitments`);
  console.log(`   💬 ${conversations.length} conversations`);
  console.log(`   📊 ${facts.length} facts`);
  console.log(`   ✅ ${tasks.length} tasks`);
  console.log(`   📈 ${metrics.length} metrics\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
