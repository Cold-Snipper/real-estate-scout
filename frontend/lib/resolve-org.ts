import { createAdminClient } from "@/lib/supabase/admin"
import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Returns the organization_id for a user.
 * If the profile has no organization_id yet (users who signed up before the
 * org-creation flow was added), auto-creates an org from user_metadata.company
 * and links it to the profile.
 */
export async function resolveOrgId(
  userId: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single()

  if (profile?.organization_id) return profile.organization_id

  const adminClient = createAdminClient()
  const { data: authData } = await adminClient.auth.admin.getUserById(userId)
  const company = authData?.user?.user_metadata?.company || "My Organization"

  const baseSlug = company.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`

  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({ name: company, slug })
    .select("id")
    .single()

  if (orgError) {
    console.error("[resolveOrgId] org insert error:", orgError)
    return null
  }

  await adminClient.from("profiles").update({ organization_id: org.id }).eq("id", userId)

  return org.id
}
