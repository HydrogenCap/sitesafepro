import React, { createContext, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OrgMembership, MemberRole } from "@/types/org";
import { hasMinimumRole } from "@/types/org";

interface OrgContextValue {
  membership: OrgMembership | null;
  memberships: OrgMembership[];
  loading: boolean;
  switchOrg: (orgId: string) => void;
  hasRole: (required: MemberRole) => boolean;
  can: (action: "read" | "write" | "approve" | "admin") => boolean;
}

export const OrgContext = createContext<OrgContextValue>({
  membership: null,
  memberships: [],
  loading: true,
  switchOrg: () => {},
  hasRole: () => false,
  can: () => false,
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [activeMembership, setActiveMembership] = useState<OrgMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMemberships([]);
        setActiveMembership(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("organisation_members")
        .select(`
          organisation_id,
          role,
          status,
          organisations (
            name,
            slug
          )
        `)
        .eq("profile_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      const mapped: OrgMembership[] = (data ?? []).map((row: any) => ({
        orgId: row.organisation_id,
        orgName: row.organisations?.name ?? "",
        orgSlug: row.organisations?.slug ?? "",
        role: row.role as MemberRole,
        status: row.status,
      }));

      setMemberships(mapped);

      const savedOrgId = localStorage.getItem("ssp_active_org_id");
      const found = mapped.find((m) => m.orgId === savedOrgId) ?? mapped[0] ?? null;
      setActiveMembership(found);
    } catch (err) {
      console.error("[OrgProvider] Failed to fetch memberships:", err);
      setMemberships([]);
      setActiveMembership(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemberships();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") fetchMemberships();
      if (event === "SIGNED_OUT") {
        setMemberships([]);
        setActiveMembership(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchMemberships]);

  const switchOrg = useCallback(
    (orgId: string) => {
      const found = memberships.find((m) => m.orgId === orgId);
      if (found) {
        setActiveMembership(found);
        localStorage.setItem("ssp_active_org_id", orgId);
      }
    },
    [memberships]
  );

  const hasRole = useCallback(
    (required: MemberRole) => hasMinimumRole(activeMembership?.role, required),
    [activeMembership]
  );

  const can = useCallback(
    (action: "read" | "write" | "approve" | "admin") => {
      const role = activeMembership?.role;
      if (!role) return false;
      switch (action) {
        case "read":
          return hasMinimumRole(role, "client_viewer");
        case "write":
          return hasMinimumRole(role, "site_manager");
        case "approve":
          return hasMinimumRole(role, "admin");
        case "admin":
          return hasMinimumRole(role, "admin");
      }
    },
    [activeMembership]
  );

  return (
    <OrgContext.Provider
      value={{
        membership: activeMembership,
        memberships,
        loading,
        switchOrg,
        hasRole,
        can,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
