"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import type { OrgContext } from "@/lib/data";
import { pushSupported, getExistingPushSubscription, enablePushNotifications, disablePushNotifications } from "@/lib/push";

const PLAN_TIERS: Record<string, { label: string; price: string; seats: string }> = {
  free: { label: "Free (you)", price: "$0", seats: "Up to 3 seats" },
  starter: { label: "Starter", price: "$15/mo", seats: "Up to 10 seats" },
  growth: { label: "Growth", price: "$30/mo", seats: "11–25 seats" },
  scale: { label: "Scale", price: "$55/mo", seats: "26–50 seats" },
};

const INVITE_ROLES = [
  { key: "member", label: "Member — can add/edit data" },
  { key: "viewer", label: "Viewer — read-only" },
  { key: "admin", label: "Admin — can also manage team & settings" },
];

type Member = { id: string; user_id: string; role: string; email: string; created_at: string | null };
type Invite = { id: string; email: string; role: string; created_at: string };

export default function SettingsClient({
  ctx,
  members,
  invites,
}: {
  ctx: OrgContext;
  members: Member[];
  invites: Invite[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const isEditor = ctx.role === "owner" || ctx.role === "admin";

  const [batchPrefix, setBatchPrefix] = useState(ctx.batchIdPrefix ?? "B");
  const [savingPrefix, setSavingPrefix] = useState(false);

  const [operationTypes, setOperationTypes] = useState<string[]>(ctx.operationTypes ?? ["microgreens"]);
  const [savingOps, setSavingOps] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [invitingBusy, setInvitingBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [pushState, setPushState] = useState<"checking" | "unsupported" | "off" | "on">("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO_MODE) { setPushState("unsupported"); return; }
    if (!pushSupported()) { setPushState("unsupported"); return; }
    getExistingPushSubscription().then((sub) => setPushState(sub ? "on" : "off"));
  }, []);

  async function togglePush() {
    setPushError(null);
    setPushBusy(true);
    try {
      if (pushState === "on") {
        const sub = await getExistingPushSubscription();
        await disablePushNotifications();
        if (sub) await fetch("/api/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) });
        setPushState("off");
      } else {
        const sub = await enablePushNotifications();
        await fetch("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription: sub.toJSON() }) });
        setPushState("on");
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Could not update notification settings");
    } finally {
      setPushBusy(false);
    }
  }

  async function toggleOperationType(type: string) {
    if (!isEditor) return;
    const next = operationTypes.includes(type)
      ? operationTypes.filter((t) => t !== type)
      : [...operationTypes, type];
    // Always keep at least one operation type selected — an org with none would lose every
    // tracking module's nav item at once, which is more confusing than useful.
    if (next.length === 0) return;
    setOperationTypes(next);
    if (DEMO_MODE) return;
    setSavingOps(true);
    await supabase.from("organizations").update({ operation_types: next }).eq("id", ctx.orgId);
    setSavingOps(false);
    router.refresh();
  }

  async function saveBatchPrefix() {
    if (DEMO_MODE) return;
    setSavingPrefix(true);
    await supabase.from("organizations").update({ batch_id_prefix: batchPrefix.trim().toUpperCase() || "B" }).eq("id", ctx.orgId);
    setSavingPrefix(false);
    router.refresh();
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    if (DEMO_MODE) {
      setInviteSuccess("Demo mode — invites aren't sent, but this is exactly how it'll work once connected.");
      return;
    }
    setInvitingBusy(true);
    try {
      const { error } = await supabase.from("org_invites").insert({
        org_id: ctx.orgId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: ctx.userId,
      });
      if (error) throw error;
      setInviteSuccess(`Invited ${inviteEmail}. They'll get access automatically the moment they sign up (or log in, if they already have an account) with that email.`);
      setInviteEmail("");
      router.refresh();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Could not send invite");
    } finally {
      setInvitingBusy(false);
    }
  }

  async function cancelInvite(id: string) {
    if (DEMO_MODE) return;
    await supabase.from("org_invites").delete().eq("id", id);
    router.refresh();
  }

  async function changeRole(membershipId: string, role: string) {
    if (DEMO_MODE) return;
    await supabase.from("memberships").update({ role }).eq("id", membershipId);
    router.refresh();
  }

  async function removeMember(membershipId: string) {
    if (DEMO_MODE) return;
    await supabase.from("memberships").delete().eq("id", membershipId);
    router.refresh();
  }

  const tier = PLAN_TIERS[ctx.planTier ?? "free"] ?? PLAN_TIERS.free;

  return (
    <div className="space-y-6">
      {/* Org info + plan */}
      <div className="card p-5">
        <h2 className="font-semibold text-stone-800 mb-1">{ctx.orgName || "Your farm"}</h2>
        <p className="text-xs text-stone-400 mb-4">Signed in as {ctx.userEmail}</p>

        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div className="rounded-lg border border-stone-200 p-3">
            <div className="text-xs text-stone-400">Current plan</div>
            <div className="font-semibold text-stone-800">{tier.label}</div>
            <div className="text-xs text-stone-500">{tier.price} · {tier.seats}</div>
          </div>
          <div className="rounded-lg border border-stone-200 p-3">
            <div className="text-xs text-stone-400">Team members</div>
            <div className="font-semibold text-stone-800">{members.length}</div>
          </div>
          <div className="rounded-lg border border-stone-200 p-3">
            <div className="text-xs text-stone-400">Your role</div>
            <div className="font-semibold text-stone-800 capitalize">{ctx.role}</div>
          </div>
        </div>
        <p className="text-xs text-stone-400">
          Paid tiers (Starter $15, Growth $30, Scale $55/mo by team size) aren't live yet — every farm runs free
          during MVP. This is here so upgrading later won't require rebuilding anything.
        </p>
      </div>

      {/* What do you grow/raise */}
      <div className="card p-5">
        <h2 className="font-semibold text-stone-800 mb-1">What do you grow or raise?</h2>
        <p className="text-xs text-stone-500 mb-3">
          Turns tracking modules on or off for your farm — nothing is deleted when you turn one off, it just
          leaves the menu, and you can always turn it back on later.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "microgreens", label: "Microgreens / indoor trays (Batches)" },
            { key: "field_crop", label: "Field, high tunnel, or commercial crops (Fields)" },
          ].map((opt) => {
            const on = operationTypes.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                disabled={!isEditor || savingOps}
                onClick={() => toggleOperationType(opt.key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  on ? "bg-brand-700 text-white border-brand-700" : "bg-white text-stone-500 border-stone-300"
                } ${isEditor ? "cursor-pointer" : "cursor-default opacity-70"}`}
              >
                {on ? "✓ " : ""}{opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-stone-400 mt-3">
          Livestock/ranching tracking and cannabis-specific grow tracking are on the roadmap but not built yet.
        </p>
      </div>

      {/* Batch ID prefix */}
      <div className="card p-5">
        <h2 className="font-semibold text-stone-800 mb-1">Batch ID format</h2>
        <p className="text-xs text-stone-500 mb-3">
          Auto-generated batch IDs look like <span className="font-mono">{(batchPrefix || "B").toUpperCase()}-20260716-001</span>. Change the prefix to match your farm.
        </p>
        <div className="flex gap-2 max-w-xs">
          <input
            className="input"
            value={batchPrefix}
            maxLength={8}
            disabled={!isEditor}
            onChange={(e) => setBatchPrefix(e.target.value)}
          />
          {isEditor && (
            <button className="btn-secondary whitespace-nowrap" onClick={saveBatchPrefix} disabled={savingPrefix}>
              {savingPrefix ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>

      {/* Push notifications */}
      <div className="card p-5">
        <h2 className="font-semibold text-stone-800 mb-1">Notifications</h2>
        <p className="text-xs text-stone-500 mb-3">
          Get a push notification on this device when a crop is running low or a batch is ready to harvest —
          works whether Harvest OS is open or not, once it's installed to your home screen.
        </p>
        {pushState === "unsupported" ? (
          <p className="text-xs text-stone-400">
            {DEMO_MODE ? "Not available in demo mode." : "Not supported on this browser/device."}
          </p>
        ) : (
          <>
            <button
              className={pushState === "on" ? "btn-secondary" : "btn-primary"}
              onClick={togglePush}
              disabled={pushBusy || pushState === "checking"}
            >
              {pushBusy
                ? "Working…"
                : pushState === "on"
                ? "Turn off notifications on this device"
                : "Enable notifications on this device"}
            </button>
            {pushError && <p className="text-xs text-red-600 mt-2">{pushError}</p>}
          </>
        )}
      </div>

      {/* Team */}
      <div className="card p-5">
        <h2 className="font-semibold text-stone-800 mb-3">Team</h2>
        <div className="divide-y divide-stone-100">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2.5 gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-stone-800 truncate">{m.email}</div>
              </div>
              {isEditor && m.role !== "owner" ? (
                <div className="flex items-center gap-2 shrink-0">
                  <select className="input !py-1 !w-auto text-sm" value={m.role} onChange={(e) => changeRole(m.id, e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button className="text-xs text-red-600 hover:underline" onClick={() => removeMember(m.id)}>Remove</button>
                </div>
              ) : (
                <span className="badge bg-stone-100 text-stone-600 capitalize shrink-0">{m.role}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite */}
      {isEditor && (
        <div className="card p-5">
          <h2 className="font-semibold text-stone-800 mb-1">Invite someone</h2>
          <p className="text-xs text-stone-500 mb-4">
            Give a team member access with less control than you have. They'll be added automatically
            the moment they sign up or log in with the email below — no email service required on our end.
          </p>
          <form onSubmit={sendInvite} className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-start">
            <input
              className="input"
              type="email"
              placeholder="their@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <select className="input !w-auto" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {INVITE_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <button className="btn-primary whitespace-nowrap" type="submit" disabled={invitingBusy}>
              {invitingBusy ? "Sending…" : "Invite"}
            </button>
          </form>
          {inviteError && <p className="text-sm text-red-600 mt-2">{inviteError}</p>}
          {inviteSuccess && <p className="text-sm text-emerald-700 mt-2">{inviteSuccess}</p>}

          {invites.length > 0 && (
            <div className="mt-5 pt-4 border-t border-stone-100">
              <div className="text-xs font-medium text-stone-500 mb-2">Pending invites</div>
              <div className="divide-y divide-stone-100">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2">
                    <div className="text-sm text-stone-700">{inv.email}</div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-amber-100 text-amber-700 capitalize">{inv.role} · pending</span>
                      <button className="text-xs text-stone-400 hover:text-red-600 hover:underline" onClick={() => cancelInvite(inv.id)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
