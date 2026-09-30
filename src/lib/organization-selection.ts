import "server-only";

import { cookies } from "next/headers";

const SELECTED_ORGANIZATION_COOKIE = "mit_salon_selected_organization";

export async function getSelectedOrganizationId() {
  const cookieStore = await cookies();
  return cookieStore.get(SELECTED_ORGANIZATION_COOKIE)?.value ?? null;
}

export async function setSelectedOrganizationId(organizationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SELECTED_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSelectedOrganizationId() {
  const cookieStore = await cookies();
  cookieStore.delete(SELECTED_ORGANIZATION_COOKIE);
}
