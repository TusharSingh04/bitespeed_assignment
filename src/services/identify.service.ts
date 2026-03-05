import { Contact } from '@prisma/client';
import { IdentifyRequest, IdentifyResponse } from '../types';
import {
  findContactsByEmail,
  findContactsByPhone,
  getPrimaryContact,
  createPrimaryContact,
  createSecondaryContact,
  convertToSecondary,
  relinkSecondaries,
  buildConsolidatedContact,
} from './contact.service';

/**
 * Main identity reconciliation logic
 * 
 * This function handles all scenarios:
 * 1. No existing contacts - creates a new primary contact
 * 2. Existing contacts with same primary - optionally creates secondary
 * 3. Existing contacts with different primaries - merges them
 */
export async function identifyContact(
  request: IdentifyRequest
): Promise<IdentifyResponse> {
  const { email, phoneNumber } = request;

  // Find existing contacts matching email and/or phone
  const emailContacts = email ? await findContactsByEmail(email) : [];
  const phoneContacts = phoneNumber ? await findContactsByPhone(phoneNumber) : [];

  // Combine all matching contacts (remove duplicates by ID)
  const allMatchingContacts = [...emailContacts];
  for (const pc of phoneContacts) {
    if (!allMatchingContacts.find(c => c.id === pc.id)) {
      allMatchingContacts.push(pc);
    }
  }

  // SCENARIO A: No existing contacts found - create new primary
  if (allMatchingContacts.length === 0) {
    const newPrimary = await createPrimaryContact(email || null, phoneNumber || null);
    const consolidated = await buildConsolidatedContact(newPrimary.id);
    return { contact: consolidated };
  }

  // Get all unique primary contacts from the matches
  const primaryContacts: Contact[] = [];
  for (const contact of allMatchingContacts) {
    const primary = await getPrimaryContact(contact);
    if (!primaryContacts.find(p => p.id === primary.id)) {
      primaryContacts.push(primary);
    }
  }

  // Sort primaries by createdAt to find the oldest
  primaryContacts.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const oldestPrimary = primaryContacts[0];

  // SCENARIO C: Multiple primaries need to be merged
  if (primaryContacts.length > 1) {
    // Convert all other primaries to secondary and relink their secondaries
    for (let i = 1; i < primaryContacts.length; i++) {
      const newerPrimary = primaryContacts[i];
      
      // Relink all secondaries of the newer primary to the oldest primary
      await relinkSecondaries(newerPrimary.id, oldestPrimary.id);
      
      // Convert the newer primary to secondary
      await convertToSecondary(newerPrimary.id, oldestPrimary.id);
    }
  }

  // SCENARIO B: Check if we need to create a secondary contact
  // We create a secondary if the request has new information not in existing contacts
  const needsNewSecondary = await shouldCreateSecondary(
    oldestPrimary.id,
    email || null,
    phoneNumber || null,
    allMatchingContacts
  );

  if (needsNewSecondary) {
    await createSecondaryContact(email || null, phoneNumber || null, oldestPrimary.id);
  }

  // Build and return the consolidated contact
  const consolidated = await buildConsolidatedContact(oldestPrimary.id);
  return { contact: consolidated };
}

/**
 * Determine if a new secondary contact should be created
 * 
 * A secondary is created when:
 * - The request contains a new email not in any linked contact
 * - OR the request contains a new phone not in any linked contact
 * - AND there's at least one matching piece of information (email or phone)
 */
async function shouldCreateSecondary(
  primaryId: number,
  email: string | null,
  phoneNumber: string | null,
  existingContacts: Contact[]
): Promise<boolean> {
  // Check if the exact combination already exists
  const exactMatch = existingContacts.find(
    c => c.email === email && c.phoneNumber === phoneNumber
  );
  
  if (exactMatch) {
    return false; // Exact match exists, no need for new contact
  }

  // Check if there's new information that doesn't exist in any contact
  const hasNewEmail = email && !existingContacts.some(c => c.email === email);
  const hasNewPhone = phoneNumber && !existingContacts.some(c => c.phoneNumber === phoneNumber);

  // If both are new and we have matches, it means we matched on one field
  // and the other field is completely new - create secondary
  if (hasNewEmail || hasNewPhone) {
    return true;
  }

  // Check if we have a combination that doesn't exist
  // e.g., email A with phone B, where A and B exist but not together
  if (email && phoneNumber) {
    const hasEmail = existingContacts.some(c => c.email === email);
    const hasPhone = existingContacts.some(c => c.phoneNumber === phoneNumber);
    
    // If we have both separately but not together, and no exact match exists
    if (hasEmail && hasPhone && !exactMatch) {
      // Check if any contact has this exact combination
      const combinationExists = existingContacts.some(
        c => c.email === email && c.phoneNumber === phoneNumber
      );
      return !combinationExists;
    }
  }

  return false;
}
