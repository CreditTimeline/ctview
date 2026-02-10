import {
  searchRecord,
  creditScore,
  publicRecord,
  noticeOfCorrection,
  propertyRecord,
  goneAwayRecord,
  fraudMarker,
  attributableItem,
  dispute,
} from '../../schema/sqlite/index.js';
import { toJsonText, boolToInt } from '../transforms.js';
import type { IngestContext } from '../ingest-context.js';

export function insertSearchRecords(ctx: IngestContext): void {
  const searches = ctx.file.searches ?? [];
  if (!searches.length) return;

  for (const s of searches) {
    ctx.tx
      .insert(searchRecord)
      .values({
        search_id: s.search_id,
        subject_id: ctx.subjectId,
        searched_at: s.searched_at,
        organisation_id: s.organisation_id,
        organisation_name_raw: s.organisation_name_raw,
        search_type: s.search_type,
        visibility: s.visibility,
        joint_application: boolToInt(s.joint_application),
        input_name: s.input_name,
        input_dob: s.input_dob,
        input_address_id: s.input_address_id,
        reference: s.reference,
        purpose_text: s.purpose_text,
        source_import_id: s.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(s.source_import_id)!,
        extensions_json: toJsonText(s.extensions),
      })
      .run();
  }
  ctx.entityCounts.searches = searches.length;
}

export function insertCreditScores(ctx: IngestContext): void {
  const scores = ctx.file.credit_scores ?? [];
  if (!scores.length) return;

  for (const c of scores) {
    ctx.tx
      .insert(creditScore)
      .values({
        score_id: c.score_id,
        subject_id: ctx.subjectId,
        score_type: c.score_type,
        score_name: c.score_name,
        score_value: c.score_value,
        score_min: c.score_min,
        score_max: c.score_max,
        score_band: c.score_band,
        calculated_at: c.calculated_at,
        score_factors_json: toJsonText(c.score_factors),
        source_import_id: c.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(c.source_import_id)!,
        extensions_json: toJsonText(c.extensions),
      })
      .run();
  }
  ctx.entityCounts.credit_scores = scores.length;
}

export function insertPublicRecords(ctx: IngestContext): void {
  const records = ctx.file.public_records ?? [];
  if (!records.length) return;

  for (const p of records) {
    ctx.tx
      .insert(publicRecord)
      .values({
        public_record_id: p.public_record_id,
        subject_id: ctx.subjectId,
        record_type: p.record_type,
        court_or_register: p.court_or_register,
        amount: p.amount,
        recorded_at: p.recorded_at,
        satisfied_at: p.satisfied_at,
        status: p.status,
        address_id: p.address_id,
        source_import_id: p.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(p.source_import_id)!,
        extensions_json: toJsonText(p.extensions),
      })
      .run();
  }
  ctx.entityCounts.public_records = records.length;
}

export function insertNoticesOfCorrection(ctx: IngestContext): void {
  const notices = ctx.file.notices_of_correction ?? [];
  if (!notices.length) return;

  for (const n of notices) {
    ctx.tx
      .insert(noticeOfCorrection)
      .values({
        notice_id: n.notice_id,
        subject_id: ctx.subjectId,
        text: n.text,
        created_at: n.created_at,
        expires_at: n.expires_at,
        scope: n.scope,
        scope_entity_id: n.scope_entity_id,
        source_import_id: n.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(n.source_import_id)!,
        extensions_json: toJsonText(n.extensions),
      })
      .run();
  }
  ctx.entityCounts.notices_of_correction = notices.length;
}

export function insertPropertyRecords(ctx: IngestContext): void {
  const records = ctx.file.property_records ?? [];
  if (!records.length) return;

  for (const p of records) {
    ctx.tx
      .insert(propertyRecord)
      .values({
        property_record_id: p.property_record_id,
        subject_id: ctx.subjectId,
        address_id: p.address_id,
        property_type: p.property_type,
        price_paid: p.price_paid,
        deed_date: p.deed_date,
        tenure: p.tenure,
        is_new_build: boolToInt(p.is_new_build),
        source_import_id: p.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(p.source_import_id)!,
        extensions_json: toJsonText(p.extensions),
      })
      .run();
  }
  ctx.entityCounts.property_records = records.length;
}

export function insertGoneAwayRecords(ctx: IngestContext): void {
  const records = ctx.file.gone_away_records ?? [];
  if (!records.length) return;

  for (const g of records) {
    ctx.tx
      .insert(goneAwayRecord)
      .values({
        gone_away_id: g.gone_away_id,
        subject_id: ctx.subjectId,
        network: g.network,
        recorded_at: g.recorded_at,
        old_address_id: g.old_address_id,
        new_address_id: g.new_address_id,
        notes: g.notes,
        source_import_id: g.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(g.source_import_id)!,
        extensions_json: toJsonText(g.extensions),
      })
      .run();
  }
  ctx.entityCounts.gone_away_records = records.length;
}

export function insertFraudMarkers(ctx: IngestContext): void {
  const markers = ctx.file.fraud_markers ?? [];
  if (!markers.length) return;

  for (const f of markers) {
    ctx.tx
      .insert(fraudMarker)
      .values({
        fraud_marker_id: f.fraud_marker_id,
        subject_id: ctx.subjectId,
        scheme: f.scheme,
        marker_type: f.marker_type,
        placed_at: f.placed_at,
        expires_at: f.expires_at,
        address_scope: f.address_scope,
        address_id: f.address_id,
        source_import_id: f.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(f.source_import_id)!,
        extensions_json: toJsonText(f.extensions),
      })
      .run();
  }
  ctx.entityCounts.fraud_markers = markers.length;
}

export function insertAttributableItems(ctx: IngestContext): void {
  const items = ctx.file.attributable_items ?? [];
  if (!items.length) return;

  for (const a of items) {
    ctx.tx
      .insert(attributableItem)
      .values({
        attributable_item_id: a.attributable_item_id,
        subject_id: ctx.subjectId,
        entity_domain: a.entity_domain,
        linked_entity_id: a.linked_entity_id,
        summary: a.summary,
        confidence: a.confidence,
        reason: a.reason,
        source_import_id: a.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(a.source_import_id)!,
        extensions_json: toJsonText(a.extensions),
      })
      .run();
  }
  ctx.entityCounts.attributable_items = items.length;
}

export function insertDisputes(ctx: IngestContext): void {
  const disputes = ctx.file.disputes ?? [];
  if (!disputes.length) return;

  for (const d of disputes) {
    ctx.tx
      .insert(dispute)
      .values({
        dispute_id: d.dispute_id,
        subject_id: ctx.subjectId,
        entity_domain: d.entity_domain,
        entity_id: d.entity_id,
        opened_at: d.opened_at,
        closed_at: d.closed_at,
        status: d.status,
        notes: d.notes,
        source_import_id: d.source_import_id,
        source_system: ctx.sourceSystemByImportId.get(d.source_import_id)!,
        extensions_json: toJsonText(d.extensions),
      })
      .run();
  }
  ctx.entityCounts.disputes = disputes.length;
}
