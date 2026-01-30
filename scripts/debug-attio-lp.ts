/**
 * Debug Attio LP record structure
 */

import { createAttioClient } from '../lib/attio';

async function main() {
  try {
    const client = createAttioClient();

    // Find the LP Fundraising list
    const lists = await client.listLists();
    const lpList = lists.find((l) => l.name === 'RBV LP Fundraising Fund II');

    if (!lpList) {
      console.log('LP list not found. Available lists:');
      lists.forEach((l) => console.log(`- ${l.name}`));
      return;
    }

    console.log('Found list:', lpList.name);
    console.log('Parent object:', lpList.parent_object);
    console.log('List ID:', lpList.id.list_id);

    // Get first few entries
    const entries = await client.getListEntries(lpList.id.list_id, 5);
    console.log(`\nFound ${entries.length} entries\n`);

    for (const entry of entries) {
      console.log('='.repeat(60));
      console.log('Entry ID:', entry.id.entry_id);
      console.log('Parent object:', entry.parent_object);
      console.log('Parent record ID:', entry.parent_record_id);
      console.log('\nEntry values:');

      if (entry.values) {
        for (const [key, value] of Object.entries(entry.values)) {
          console.log(`  ${key}:`, JSON.stringify(value, null, 2).substring(0, 200));
        }
      } else {
        console.log('  (no values)');
      }

      // Try to fetch the parent LP record
      console.log('\n--- Fetching parent LP record ---');
      try {
        const response = await fetch(`https://api.attio.com/v2/objects/lps/records/${entry.parent_record_id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.ATTIO_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const lpRecord = await response.json();
          console.log('LP Record values:');
          if (lpRecord.data?.values) {
            for (const [key, value] of Object.entries(lpRecord.data.values)) {
              console.log(`  ${key}:`, JSON.stringify(value, null, 2).substring(0, 300));
            }
          }
        } else {
          console.log('Failed to fetch LP record:', response.status, await response.text());
        }
      } catch (err) {
        console.log('Error fetching LP record:', err);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
