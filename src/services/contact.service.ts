import prisma from '../db';
import { Contact } from '@prisma/client';
import { ConsolidatedContact } from '../types';

/**
 * Find contacts by email
 */
export async function findContactsByEmail(email: string): Promise<Contact[]> {
  return prisma.contact.findMany({
    where: {
      email: email,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * Find contacts by phone number
 */
export async function findContactsByPhone(phoneNumber: string): Promise<Contact[]> {
  return prisma.contact.findMany({
    where: {
      phoneNumber: phoneNumber,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * Find a contact by ID
 */
export async function findContactById(id: number): Promise<Contact | null> {
  return prisma.contact.findUnique({
    where: { id },
  });
}

/**
 * Get the primary contact for a given contact
 * If the contact is already primary, return it
 * Otherwise, traverse up the linkedId chain to find the primary
 */
export async function getPrimaryContact(contact: Contact): Promise<Contact> {
  if (contact.linkPrecedence === 'primary') {
    return contact;
  }
  
  if (contact.linkedId) {
    const linkedContact = await findContactById(contact.linkedId);
    if (linkedContact) {
      return getPrimaryContact(linkedContact);
    }
  }
  
  // Fallback: if no linked contact found, return the current one
  return contact;
}

/**
 * Get all contacts linked to a primary contact (including the primary itself)
 */
export async function getAllLinkedContacts(primaryId: number): Promise<Contact[]> {
  const primary = await findContactById(primaryId);
  if (!primary) {
    return [];
  }

  const secondaries = await prisma.contact.findMany({
    where: {
      linkedId: primaryId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return [primary, ...secondaries];
}

/**
 * Create a new primary contact
 */
export async function createPrimaryContact(
  email: string | null,
  phoneNumber: string | null
): Promise<Contact> {
  return prisma.contact.create({
    data: {
      email,
      phoneNumber,
      linkPrecedence: 'primary',
      linkedId: null,
    },
  });
}

/**
 * Create a new secondary contact linked to a primary
 */
export async function createSecondaryContact(
  email: string | null,
  phoneNumber: string | null,
  primaryId: number
): Promise<Contact> {
  return prisma.contact.create({
    data: {
      email,
      phoneNumber,
      linkPrecedence: 'secondary',
      linkedId: primaryId,
    },
  });
}

/**
 * Convert a primary contact to secondary and link it to another primary
 */
export async function convertToSecondary(
  contactId: number,
  newPrimaryId: number
): Promise<Contact> {
  return prisma.contact.update({
    where: { id: contactId },
    data: {
      linkPrecedence: 'secondary',
      linkedId: newPrimaryId,
    },
  });
}

/**
 * Update all contacts linked to oldPrimaryId to be linked to newPrimaryId
 */
export async function relinkSecondaries(
  oldPrimaryId: number,
  newPrimaryId: number
): Promise<void> {
  await prisma.contact.updateMany({
    where: {
      linkedId: oldPrimaryId,
    },
    data: {
      linkedId: newPrimaryId,
    },
  });
}

/**
 * Build consolidated contact response from a primary contact
 */
export async function buildConsolidatedContact(
  primaryId: number
): Promise<ConsolidatedContact> {
  const allContacts = await getAllLinkedContacts(primaryId);
  
  const emails: string[] = [];
  const phoneNumbers: string[] = [];
  const secondaryContactIds: number[] = [];

  for (const contact of allContacts) {
    // Add email if not already present
    if (contact.email && !emails.includes(contact.email)) {
      emails.push(contact.email);
    }
    
    // Add phone number if not already present
    if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
      phoneNumbers.push(contact.phoneNumber);
    }
    
    // Add to secondary IDs if it's a secondary contact
    if (contact.linkPrecedence === 'secondary') {
      secondaryContactIds.push(contact.id);
    }
  }

  return {
    primaryContactId: primaryId,
    emails,
    phoneNumbers,
    secondaryContactIds,
  };
}
