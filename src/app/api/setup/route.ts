import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

type SetupPayload =
  | { type: "employee"; first_name?: string; last_name?: string; color?: string }
  | { type: "service"; name?: string; duration_minutes?: number; price?: number | null }
  | { type: "room"; name?: string };

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return jsonError("Niste prijavljeni ili nemate aktivan salon.", 401);
  }

  const canManageSetup =
    permissions.organizationRole === "owner" ||
    permissions.organizationRole === "admin" ||
    permissions.organizationRole === "manager";

  if (!canManageSetup) {
    return jsonError("Nemate ovlasti za uređivanje osnovnih podataka salona.", 403);
  }

  let payload: SetupPayload;

  try {
    payload = (await request.json()) as SetupPayload;
  } catch {
    return jsonError("Zahtjev nije valjan.");
  }

  const supabase = await createClient();
  const organizationId = permissions.organizationId;

  if (payload.type === "employee") {
    const firstName = payload.first_name?.trim() ?? "";
    const lastName = payload.last_name?.trim() || null;
    const color = payload.color?.trim() || "#776B5D";

    if (!firstName) return jsonError("Ime zaposlenika je obavezno.");

    const { error } = await supabase.from("employees").insert({
      organization_id: organizationId,
      first_name: firstName,
      last_name: lastName,
      color,
      is_active: true,
    });

    if (error) {
      console.error("Greška pri dodavanju zaposlenika:", error);
      return jsonError(error.message || "Zaposlenika nije moguće dodati.", 500);
    }

    return NextResponse.json({ ok: true, message: "Zaposlenik je dodan." });
  }

  if (payload.type === "service") {
    const name = payload.name?.trim() ?? "";
    const durationMinutes = Number(payload.duration_minutes);
    const price = payload.price == null ? null : Number(payload.price);

    if (!name) return jsonError("Naziv usluge je obavezan.");
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      return jsonError("Trajanje usluge mora biti pozitivan broj minuta.");
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return jsonError("Cijena usluge nije valjana.");
    }

    const { error } = await supabase.from("services").insert({
      organization_id: organizationId,
      name,
      duration_minutes: durationMinutes,
      price,
      is_active: true,
    });

    if (error) {
      console.error("Greška pri dodavanju usluge:", error);
      return jsonError(error.message || "Uslugu nije moguće dodati.", 500);
    }

    return NextResponse.json({ ok: true, message: "Usluga je dodana." });
  }

  if (payload.type === "room") {
    const name = payload.name?.trim() ?? "";
    if (!name) return jsonError("Naziv sobe je obavezan.");

    const { error } = await supabase.from("rooms").insert({
      organization_id: organizationId,
      name,
      is_active: true,
    });

    if (error) {
      console.error("Greška pri dodavanju sobe:", error);
      return jsonError(error.message || "Sobu nije moguće dodati.", 500);
    }

    return NextResponse.json({ ok: true, message: "Soba je dodana." });
  }

  return jsonError("Nepoznata vrsta unosa.");
}
