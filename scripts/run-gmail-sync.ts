/**
 * Script to run Gmail sync directly
 */

import { prisma } from '../lib/db';
import { syncEmails } from '../lib/gmail/sync-service';

async function main() {
  // Get the Gmail connection
  const connection = await prisma.gmailConnection.findFirst();

  if (!connection) {
    console.log('No Gmail connection found');
    return;
  }

  console.log('Found Gmail connection for:', connection.email);
  console.log('Last sync:', connection.lastSyncAt || 'Never');
  console.log('');
  console.log('Starting sync...');

  const result = await syncEmails(connection.id, { maxMessages: 500 });

  console.log('');
  console.log('=== Sync Result ===');
  console.log('Success:', result.success);
  console.log('Messages found:', result.messagesFound);
  console.log('Messages created:', result.messagesCreated);
  console.log('Messages skipped:', result.messagesSkipped);
  console.log('Persons linked:', result.entitiesLinked.persons);
  console.log('Organizations linked:', result.entitiesLinked.organizations);

  if (result.errors.length > 0) {
    console.log('Errors (first 5):', result.errors.slice(0, 5));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
