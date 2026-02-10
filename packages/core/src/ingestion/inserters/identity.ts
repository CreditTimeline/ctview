import {
  personName,
  subjectIdentifier,
  address,
  addressAssociation,
  addressLink,
  financialAssociate,
  electoralRollEntry,
} from '../../schema/sqlite/index.js';
import { toJsonText, boolToInt } from '../transforms.js';
import type { IngestContext } from '../ingest-context.js';

export function insertPersonNames(ctx: IngestContext): void {
  const names = ctx.file.subject.names ?? [];
  if (!names.length) return;

  for (const n of names) {
    ctx.tx
      .insert(personName)
      .values({
        name_id: n.name_id,
        subject_id: ctx.subjectId,
        full_name: n.full_name,
        title: n.title,
        given_name: n.given_name,
        middle_name: n.middle_name,
        family_name: n.family_name,
        suffix: n.suffix,
        name_type: n.name_type,
        valid_from: n.valid_from,
        valid_to: n.valid_to,
        source_import_id: n.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(n.source_import_id)!,
        extensions_json: toJsonText(n.extensions),
      })
      .run();
  }
  ctx.entityCounts.person_names = names.length;
}

export function insertSubjectIdentifiers(ctx: IngestContext): void {
  const ids = ctx.file.subject.identifiers ?? [];
  if (!ids.length) return;

  for (const id of ids) {
    ctx.tx
      .insert(subjectIdentifier)
      .values({
        identifier_id: id.identifier_id,
        subject_id: ctx.subjectId,
        identifier_type: id.identifier_type,
        value: id.value,
        source_import_id: id.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(id.source_import_id)!,
        extensions_json: toJsonText(id.extensions),
      })
      .run();
  }
  ctx.entityCounts.subject_identifiers = ids.length;
}

export function insertAddresses(ctx: IngestContext): void {
  const addrs = ctx.file.addresses ?? [];
  if (!addrs.length) return;

  for (const a of addrs) {
    ctx.tx
      .insert(address)
      .values({
        address_id: a.address_id,
        line_1: a.line_1,
        line_2: a.line_2,
        line_3: a.line_3,
        town_city: a.town_city,
        county_region: a.county_region,
        postcode: a.postcode,
        country_code: a.country_code,
        normalized_single_line: a.normalized_single_line,
        extensions_json: toJsonText(a.extensions),
      })
      .run();
  }
  ctx.entityCounts.addresses = addrs.length;
}

export function insertAddressAssociations(ctx: IngestContext): void {
  const assocs = ctx.file.address_associations ?? [];
  if (!assocs.length) return;

  for (const a of assocs) {
    ctx.tx
      .insert(addressAssociation)
      .values({
        association_id: a.association_id,
        subject_id: ctx.subjectId,
        address_id: a.address_id,
        role: a.role,
        valid_from: a.valid_from,
        valid_to: a.valid_to,
        source_import_id: a.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(a.source_import_id)!,
        extensions_json: toJsonText(a.extensions),
      })
      .run();
  }
  ctx.entityCounts.address_associations = assocs.length;
}

export function insertAddressLinks(ctx: IngestContext): void {
  const links = ctx.file.address_links ?? [];
  if (!links.length) return;

  for (const l of links) {
    ctx.tx
      .insert(addressLink)
      .values({
        address_link_id: l.address_link_id,
        subject_id: ctx.subjectId,
        from_address_id: l.from_address_id,
        to_address_id: l.to_address_id,
        source_organisation_name: l.source_organisation_name,
        last_confirmed_at: l.last_confirmed_at,
        source_import_id: l.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(l.source_import_id)!,
        extensions_json: toJsonText(l.extensions),
      })
      .run();
  }
  ctx.entityCounts.address_links = links.length;
}

export function insertFinancialAssociates(ctx: IngestContext): void {
  const fas = ctx.file.financial_associates ?? [];
  if (!fas.length) return;

  for (const f of fas) {
    ctx.tx
      .insert(financialAssociate)
      .values({
        associate_id: f.associate_id,
        subject_id: ctx.subjectId,
        associate_name: f.associate_name,
        relationship_basis: f.relationship_basis,
        status: f.status,
        confirmed_at: f.confirmed_at,
        source_import_id: f.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(f.source_import_id)!,
        extensions_json: toJsonText(f.extensions),
      })
      .run();
  }
  ctx.entityCounts.financial_associates = fas.length;
}

export function insertElectoralRollEntries(ctx: IngestContext): void {
  const entries = ctx.file.electoral_roll_entries ?? [];
  if (!entries.length) return;

  for (const e of entries) {
    ctx.tx
      .insert(electoralRollEntry)
      .values({
        electoral_entry_id: e.electoral_entry_id,
        subject_id: ctx.subjectId,
        address_id: e.address_id,
        name_on_register: e.name_on_register,
        registered_from: e.registered_from,
        registered_to: e.registered_to,
        change_type: e.change_type,
        marketing_opt_out: boolToInt(e.marketing_opt_out),
        source_import_id: e.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(e.source_import_id)!,
        extensions_json: toJsonText(e.extensions),
      })
      .run();
  }
  ctx.entityCounts.electoral_roll_entries = entries.length;
}
