import { sql, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { address, addressAssociation, electoralRollEntry } from '../schema/sqlite/identity.js';
import { paginate } from './helpers.js';
import type {
  AddressListParams,
  PaginatedResult,
  AddressWithAssociations,
} from './types.js';

export function listAddresses(
  db: AppDatabase,
  params: AddressListParams,
): PaginatedResult<AddressWithAssociations> {
  const { limit, offset, subjectId, role } = params;

  const hasFilters = !!(subjectId || role);

  let addressIds: string[];
  let total: number;

  if (hasFilters) {
    // Filter through address_association
    const conditions: SQL[] = [];
    if (subjectId) conditions.push(sql`aa.subject_id = ${subjectId}`);
    if (role) conditions.push(sql`aa.role = ${role}`);
    const where = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

    const countRow = db.all<{ count: number }>(sql`
      SELECT COUNT(DISTINCT a.address_id) AS count
      FROM address a
      INNER JOIN address_association aa ON aa.address_id = a.address_id
      ${where}
    `);
    total = countRow[0]?.count ?? 0;

    const idRows = db.all<{ address_id: string }>(sql`
      SELECT DISTINCT a.address_id
      FROM address a
      INNER JOIN address_association aa ON aa.address_id = a.address_id
      ${where}
      ORDER BY aa.valid_from DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    addressIds = idRows.map((r) => r.address_id);
  } else {
    const countRow = db.all<{ count: number }>(sql`
      SELECT COUNT(*) AS count FROM address
    `);
    total = countRow[0]?.count ?? 0;

    const idRows = db.all<{ address_id: string }>(sql`
      SELECT address_id FROM address
      ORDER BY address_id
      LIMIT ${limit} OFFSET ${offset}
    `);
    addressIds = idRows.map((r) => r.address_id);
  }

  if (addressIds.length === 0) {
    return paginate([], total, limit, offset);
  }

  // Fetch full address data for these IDs
  const addresses = db
    .select()
    .from(address)
    .where(sql`${address.address_id} IN ${addressIds}`)
    .all();

  // Fetch associations
  const assocs = db
    .select({
      addressId: addressAssociation.address_id,
      associationId: addressAssociation.association_id,
      role: addressAssociation.role,
      validFrom: addressAssociation.valid_from,
      validTo: addressAssociation.valid_to,
    })
    .from(addressAssociation)
    .where(sql`${addressAssociation.address_id} IN ${addressIds}`)
    .all();

  // Fetch electoral roll entries
  const electorals = db
    .select({
      addressId: electoralRollEntry.address_id,
      electoralEntryId: electoralRollEntry.electoral_entry_id,
      nameOnRegister: electoralRollEntry.name_on_register,
      registeredFrom: electoralRollEntry.registered_from,
      registeredTo: electoralRollEntry.registered_to,
    })
    .from(electoralRollEntry)
    .where(sql`${electoralRollEntry.address_id} IN ${addressIds}`)
    .all();

  // Group by address_id
  const assocsByAddress = new Map<string, typeof assocs>();
  for (const a of assocs) {
    if (!assocsByAddress.has(a.addressId)) assocsByAddress.set(a.addressId, []);
    assocsByAddress.get(a.addressId)!.push(a);
  }

  const electoralByAddress = new Map<string, typeof electorals>();
  for (const e of electorals) {
    if (!electoralByAddress.has(e.addressId!)) electoralByAddress.set(e.addressId!, []);
    electoralByAddress.get(e.addressId!)!.push(e);
  }

  const items: AddressWithAssociations[] = addresses.map((addr) => ({
    addressId: addr.address_id,
    line1: addr.line_1,
    line2: addr.line_2,
    line3: addr.line_3,
    townCity: addr.town_city,
    countyRegion: addr.county_region,
    postcode: addr.postcode,
    countryCode: addr.country_code,
    normalizedSingleLine: addr.normalized_single_line,
    associations: (assocsByAddress.get(addr.address_id) ?? []).map((a) => ({
      associationId: a.associationId,
      role: a.role,
      validFrom: a.validFrom,
      validTo: a.validTo,
    })),
    electoralRollEntries: (electoralByAddress.get(addr.address_id) ?? []).map((e) => ({
      electoralEntryId: e.electoralEntryId,
      nameOnRegister: e.nameOnRegister,
      registeredFrom: e.registeredFrom,
      registeredTo: e.registeredTo,
    })),
  }));

  return paginate(items, total, limit, offset);
}
