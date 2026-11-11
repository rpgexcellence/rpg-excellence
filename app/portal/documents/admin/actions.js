'use server';
// Old action references cannot grant access to RPG's private document collection.
import { redirect } from 'next/navigation';
export async function createControlledDocument(){redirect('/portal/documents');}
export async function createDocumentRevision(){redirect('/portal/documents');}
export async function updateControlledDocument(){redirect('/portal/documents');}
export async function supersedeControlledDocument(){redirect('/portal/documents');}
export async function withdrawControlledDocument(){redirect('/portal/documents');}
