import { NextRequest, NextResponse } from "next/server";
import { requireAdminForAuditLog } from "@/lib/page-guards";
import { getAuditLogsForExport } from "@/features/audit/queries";

function actionLabel(action: string) {
  switch (action) {
    case "appointment_created": return "Dodan termin";
    case "appointment_updated": return "Uređen termin";
    case "appointment_cancelled": return "Otkazan termin";
    case "appointment_status_changed": return "Promijenjen status termina";
    case "appointment_deleted": return "Obrisan termin";
    case "client_created": return "Dodan klijent";
    case "client_updated": return "Uređen klijent";
    case "client_deleted": return "Obrisan klijent";
    case "employee_created": return "Dodan zaposlenik";
    case "employee_updated": return "Uređen zaposlenik";
    case "employee_deactivated": return "Deaktiviran zaposlenik";
    case "employee_password_reset": return "Resetirana lozinka zaposlenika";
    case "service_created": return "Dodana usluga";
    case "service_deleted": return "Obrisana usluga";
    case "services_bulk_updated": return "Uređene usluge";
    case "room_created": return "Dodana soba";
    case "room_deleted": return "Obrisana soba";
    case "rooms_bulk_updated": return "Uređene sobe";
    case "equipment_created": return "Dodana oprema";
    case "equipment_deleted": return "Obrisana oprema";
    case "equipment_bulk_updated": return "Uređena oprema";
    case "service_rooms_bulk_updated": return "Uređeno mapiranje usluga i soba";
    case "employee_services_bulk_updated": return "Uređeno mapiranje zaposlenika i usluga";
    case "service_equipment_bulk_updated": return "Uređeno mapiranje usluga i opreme";
    case "salon_hours_bulk_updated": return "Uređeno radno vrijeme salona";
    case "service_group_limits_bulk_updated": return "Uređeni group limits";
    default: return action;
  }
}

function entityLabel(entityType: string) {
  switch (entityType) {
    case "appointment": return "Termin";
    case "client": return "Klijent";
    case "employee": return "Zaposlenik";
    case "service": return "Usluga";
    case "room": return "Soba";
    case "equipment": return "Oprema";
    case "service_room_mapping": return "Usluge i sobe";
    case "employee_service_mapping": return "Zaposlenici i usluge";
    case "service_equipment_mapping": return "Usluge i oprema";
    case "salon_working_hours": return "Radno vrijeme";
    case "service_group_limit": return "Group limits";
    default: return entityType;
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("hr-HR", {
    timeZone: "Europe/Zagreb",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function csvCell(value: string | null | undefined) {
  const normalized = value ?? "";
  return `"${normalized.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  await requireAdminForAuditLog();

  const searchParams = request.nextUrl.searchParams;
  const logs = await getAuditLogsForExport({
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    actor: searchParams.get("actor") || undefined,
    action: searchParams.get("action") || undefined,
    entityType: searchParams.get("entityType") || undefined,
    search: searchParams.get("search") || undefined,
  });

  const header = ["Datum i vrijeme", "Korisnik", "E-mail", "Akcija", "Entitet", "Naziv entiteta", "ID entiteta"];
  const rows = logs.map((log) => [
    formatDateTime(log.created_at),
    log.actor_display_name || log.actor_email || "Nepoznato",
    log.actor_email || "",
    actionLabel(log.action),
    entityLabel(log.entity_type),
    log.entity_label || "",
    log.entity_id || "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvCell(cell)).join(";"))
    .join("\r\n");

  const date = new Date().toISOString().slice(0, 10);
  const filename = `audit-log-${logs.length}-zapisa-${date}.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
