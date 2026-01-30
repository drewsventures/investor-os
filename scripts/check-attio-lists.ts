/**
 * Check available Attio lists
 */

import { createAttioClient } from '../lib/attio';

async function main() {
  try {
    const client = createAttioClient();
    console.log('Attio API key found, fetching lists...\n');

    const lists = await client.listLists();
    console.log('Available Attio lists:');
    lists.forEach((list) => {
      console.log(`- "${list.name}" (ID: ${list.id.list_id}, Parent: ${list.parent_object.join(', ')})`);
    });

    // Try to find the LP fundraising list
    const lpList = lists.find((l) => l.name.toLowerCase().includes('lp') || l.name.toLowerCase().includes('fundrais'));
    if (lpList) {
      console.log(`\nFound potential LP list: "${lpList.name}"`);

      // Fetch entries
      const entries = await client.getListEntries(lpList.id.list_id, 10);
      console.log(`\nFirst ${entries.length} entries:`);
      entries.forEach((entry, i) => {
        console.log(`\n${i + 1}. Entry ID: ${entry.id.entry_id}`);
        console.log(`   Parent: ${entry.parent_object} (${entry.parent_record_id})`);
        console.log(`   Values:`, Object.keys(entry.values));
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
