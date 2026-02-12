import {
  listAddresses,
  addressListSchema,
  getAddressLinks,
  listSubjects,
  type AddressLinkEntry,
} from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const raw = Object.fromEntries(url.searchParams);
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ''));
  const parsed = addressListSchema.safeParse(cleaned);
  const params = parsed.success ? parsed.data : { limit: 50, offset: 0 };
  const listResult = listAddresses(locals.db, params);

  const subjects = listSubjects(locals.db, { limit: 1, offset: 0 });
  const subjectId = params.subjectId ?? subjects.items[0]?.subjectId ?? null;

  let addressLinks: AddressLinkEntry[] = [];
  if (subjectId) {
    addressLinks = getAddressLinks(locals.db, subjectId);
  }

  return {
    ...listResult,
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    addressLinks,
  };
};
