/**
 * Script to help populate missing organization domains
 * Maps known company names to their domains
 */

import { prisma } from '../lib/db';

// Known domain mappings for portfolio/common companies
const KNOWN_DOMAINS: Record<string, string> = {
  // Portfolio companies
  'Dapper Labs': 'dapperlabs.com',
  'SuperRare': 'superrare.com',
  'Genies': 'genies.com',
  'Venus Aerospace': 'venusaero.com',
  'Azteco': 'azte.co',
  'Zed Run': 'zed.run',
  'MoneyMade': 'moneymade.io',
  'AltoIRA': 'altoira.com',
  'Holler': 'holler.com',
  'Oasis': 'oasis.app',
  'LVL': 'lvl.co',
  'RoboTire (YC W20)': 'robotire.com',
  'Noah': 'noah.com',
  'STUDIO': 'studio.com',
  'Reactive': 'reactive.network',
  'Teleportal': 'teleportal.gg',
  'Hermes Robotics (YC W21)': 'hermesrobotics.com',
  'Epic Kitchens': 'epickitchens.io',
  'Veremark': 'veremark.com',
  'Roll': 'tryroll.com',
  'Parcel': 'parcel.money',
  'GreenPark Sports': 'greenparksports.com',
  'nameless': 'nameless.io',
  'Calaxy': 'calaxy.com',
  'round21': 'round21.com',
  'Stardust': 'stardust.gg',
  'Indoor Robotics': 'indoorrobotics.com',
  'Agoric': 'agoric.com',
  'Layer3': 'layer3.xyz',
  'GigLabs': 'giglabs.io',
  'Concept Art House': 'conceptarthouse.com',
  'Auroboros': 'auroboros.io',
  'Basic Space': 'basicspace.xyz',
  'Maidbot': 'maidbot.com',
  'Oorbit': 'oorbit.com',
  'Gather': 'gather.town',
  'Blockade Games': 'blockadegames.com',
  'Fan Controlled Football': 'fcf.io',
  'Due Dilly': 'duedilly.io',
  'HeroMaker': 'heromaker.io',
  'The Sandbox': 'sandbox.game',
  'Uplandme': 'upland.me',
  'Tilt Five': 'tiltfive.com',
  'Neupeak': 'neupeak.com',
  'Unstoppable Domains': 'unstoppabledomains.com',
  'One of None': 'oneofnone.io',
  'Knights of Degen': 'knightsofdegen.io',
  'One Earth Rising': 'oneearthrising.com',
  'Brightvine': 'brightvine.com',
  'Anduril Industries': 'anduril.com',
  'Terran Biosciences': 'terranbiosciences.com',
  'LayerZero Labs': 'layerzero.network',
  'MetaMundo': 'metamundo.co',
  'Atmos Labs': 'atmoslabs.io',
  '3Box Labs': '3box.io',
  'Limewire': 'limewire.com',
  'Firehawk Aerospace': 'firehawkaerospace.com',
  'Alexandria Labs': 'alexandrialabs.xyz',
  'Heights Labs': 'heights.xyz',
  'WAGMI United': 'wagmiunited.io',
  'Wilder World': 'wilderworld.com',
  'Atlas Reality': 'atlasreality.com',
  'Proof of Attendance Protocol': 'poap.xyz',
  'Humane Genomics': 'humanegenomics.com',
  'SuperWorld': 'superworldapp.com',
  'Aethir': 'aethir.com',
  'Halborn Security': 'halborn.com',
  'Alethea Ai': 'alethea.ai',
  'Shardeum': 'shardeum.org',

  // More portfolio companies
  'Aethero': 'aethero.space',
  'Aunt Flow': 'goauntflow.com',
  'Azarus': 'azarus.io',
  'Azuro': 'azuro.org',
  'Base Power': 'basepower.com',
  'Belay': 'belay.space',
  'bitsCrunch': 'bitscrunch.com',
  'Bunch': 'bunch.ai',
  'CryptoSlam': 'cryptoslam.io',
  'Dejavu': 'dejavu.art',
  'Dfns': 'dfns.co',
  'Emerge': 'emerge.io',
  'Fireside': 'fireside.fm',
  'Flowty': 'flowty.io',
  'FungyProof': 'fungyproof.com',
  'G8Keep': 'g8keep.com',
  'Gateway': 'gateway.fm',
  'Gilded': 'gilded.finance',
  'Glow Labs': 'glowlabs.org',
  'GUTS International': 'guts.tickets',
  'Hangout': 'hangout.fm',
  'iRocket': 'irocket.space',
  'Lemonade Technologies': 'lemonade.tech',
  'Lumina': 'lumina.com',
  'Minima': 'minima.global',
  'Moxie': 'moxie.xyz',
  'Nephos Networks': 'nephosnetworks.com',
  'Oortech': 'oortech.com',
  'Paradromics': 'paradromics.com',
  'SAGA Chain': 'saga.xyz',
  'Setscale': 'setscale.com',
  'Stationhead': 'stationhead.com',
  'Swoops': 'playswoops.com',
  'Texas Ranchers': 'texasranchers.xyz',
  'That App': 'thatapp.io',
  'Toka': 'toka.io',
  'Truflation': 'truflation.com',
  'Upstream': 'upstream.app',
  'VatnForn (DeepWaters)': 'deepwaters.xyz',
  'Verif3r': 'verif3r.com',
  'ZERO': 'zero.tech',
  'Zero Tech': 'zero.tech',
  'Cub3': 'cub3.ai',
  'Sudrania': 'sudrania.com',
  'Tokenproof': 'tokenproof.xyz',
  'Opolis': 'opolis.co',

  // Common companies from emails
  'Gaingels': 'gaingels.com',
  'Gusto': 'gusto.com',
  'Fenwick': 'fenwick.com',
  'Flybridge': 'flybridge.com',
  'Echo': 'echo.xyz',
  'Fireflies': 'fireflies.ai',
  'Luma': 'lu.ma',
  'DocuSign': 'docusign.com',
};

async function main() {
  console.log('Checking organizations that need domains...\n');

  // Find orgs without domains
  const orgsWithoutDomain = await prisma.organization.findMany({
    where: { domain: null },
    select: { id: true, name: true }
  });

  console.log(`Found ${orgsWithoutDomain.length} organizations without domains.\n`);

  // Check which ones we have known domains for
  const updates: Array<{ id: string; name: string; domain: string }> = [];

  for (const org of orgsWithoutDomain) {
    // Try exact match first
    if (KNOWN_DOMAINS[org.name]) {
      updates.push({ id: org.id, name: org.name, domain: KNOWN_DOMAINS[org.name] });
      continue;
    }

    // Try partial match (org name contains known company name)
    for (const [knownName, domain] of Object.entries(KNOWN_DOMAINS)) {
      if (org.name.toLowerCase().includes(knownName.toLowerCase())) {
        updates.push({ id: org.id, name: org.name, domain });
        break;
      }
    }
  }

  if (updates.length === 0) {
    console.log('No automatic domain matches found.');
    console.log('\nTo add domains manually, update the KNOWN_DOMAINS object in this script.');
    return;
  }

  console.log(`Found ${updates.length} organizations to update:\n`);
  updates.forEach((u) => {
    console.log(`  ${u.name} -> ${u.domain}`);
  });

  // Check for --apply flag
  const shouldApply = process.argv.includes('--apply');

  if (!shouldApply) {
    console.log('\n--- DRY RUN ---');
    console.log('To apply these changes, run: npx tsx scripts/populate-org-domains.ts --apply');
    return;
  }

  console.log('\nApplying updates...');

  for (const update of updates) {
    await prisma.organization.update({
      where: { id: update.id },
      data: { domain: update.domain }
    });
    console.log(`  Updated: ${update.name}`);
  }

  console.log('\nDone! Now re-run email sync to link emails to these organizations.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
