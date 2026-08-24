"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson, pesos, timeAgo } from "@/lib/client";
import { Badge, Button, Card, ErrorNote, Spinner } from "@/components/ui";

interface Overview {
  users: number; providers: number; jobs: number; completed: number;
  openDisputes: number; pendingKyc: number; pendingPayouts: number; openReports: number;
  flaggedUsers: number; earningsCents: number; gmvCents: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState<"kyc" | "disputes" | "payouts" | "reports">("kyc");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await fetchJson<Overview>("/api/admin/overview");
      setOverview(d);
    } catch (e) {
      if ((e as { status?: number }).status === 403 || (e as { status?: number }).status === 401) router.push("/");
      else setError((e as Error).message);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorNote message={error} />;
  if (!overview) return <Spinner />;

  const stats = [
    { label: "Users", value: overview.users },
    { label: "Providers", value: overview.providers },
    { label: "Jobs", value: overview.jobs },
    { label: "Completed", value: overview.completed },
    { label: "GMV (completed)", value: pesos(overview.gmvCents) },
    { label: "Platform earnings", value: pesos(overview.earningsCents) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Admin Console 🛠️</h1>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <div className="text-lg font-extrabold text-brand-800">{s.value}</div>
            <div className="text-[11px] text-gray-500">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-stone-100 p-1">
        {([
          ["kyc", `KYC (${overview.pendingKyc})`],
          ["disputes", `Disputes (${overview.openDisputes})`],
          ["payouts", `Payouts (${overview.pendingPayouts})`],
          ["reports", `Reports (${overview.openReports + overview.flaggedUsers})`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${tab === id ? "bg-white text-brand-800 shadow-sm" : "text-gray-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "kyc" && <KycQueue onChange={load} />}
      {tab === "disputes" && <DisputeQueue onChange={load} />}
      {tab === "payouts" && <PayoutQueue onChange={load} />}
      {tab === "reports" && <ReportQueue onChange={load} />}
    </div>
  );
}

function useQueue<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const load = useCallback(() => fetchJson<T>(url).then(setData).catch(() => {}), [url]);
  useEffect(() => { load(); }, [load]);
  return { data, load };
}

function KycQueue({ onChange }: { onChange: () => void }) {
  const { data, load } = useQueue<{ queue: { id: string; level: number; docType: string; idLastFour?: string | null; createdAt: string; user: { firstName: string; lastName?: string; phone?: string; kycLevel: number } }[] }>("/api/admin/kyc");
  if (!data) return <Spinner />;
  if (data.queue.length === 0) return <Card className="py-8 text-center text-sm text-gray-500">Walang pending KYC. 🎉</Card>;
  return (
    <div className="space-y-2">
      {data.queue.map((k) => (
        <Card key={k.id} className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-bold">{k.user.firstName} {k.user.lastName} <span className="font-normal text-gray-500">{k.user.phone}</span></div>
            <div className="text-xs text-gray-500">
              Level {k.level} · {k.docType} {k.idLastFour ? `(••••${k.idLastFour})` : ""} · {timeAgo(k.createdAt)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="min-h-10 px-3 py-2 text-sm" onClick={async () => { await fetchJson("/api/admin/kyc", { method: "POST", body: JSON.stringify({ submissionId: k.id, decision: "APPROVED" }) }); load(); onChange(); }}>Approve</Button>
            <Button variant="danger" className="min-h-10 px-3 py-2 text-sm" onClick={async () => { await fetchJson("/api/admin/kyc", { method: "POST", body: JSON.stringify({ submissionId: k.id, decision: "REJECTED" }) }); load(); onChange(); }}>Reject</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function DisputeQueue({ onChange }: { onChange: () => void }) {
  const { data, load } = useQueue<{ disputes: { id: string; reason: string; createdAt: string; job: { title: string; agreedPriceCents?: number | null; clientName: string; providerName?: string | null } }[] }>("/api/admin/disputes");
  if (!data) return <Spinner />;
  if (data.disputes.length === 0) return <Card className="py-8 text-center text-sm text-gray-500">Walang open disputes. 🎉</Card>;
  return (
    <div className="space-y-2">
      {data.disputes.map((d) => (
        <Card key={d.id}>
          <div className="text-sm font-bold">{d.job.title} — {d.job.agreedPriceCents != null ? pesos(d.job.agreedPriceCents) : "?"}</div>
          <div className="text-xs text-gray-500">Client: {d.job.clientName} · Provider: {d.job.providerName ?? "?"} · {timeAgo(d.createdAt)}</div>
          <p className="mt-1 text-sm text-gray-700">&ldquo;{d.reason}&rdquo;</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["REFUND_CLIENT", "PAY_PROVIDER", "SPLIT"] as const).map((r) => (
              <Button key={r} variant="secondary" className="min-h-10 px-3 py-2 text-xs" onClick={async () => { await fetchJson("/api/admin/disputes", { method: "POST", body: JSON.stringify({ disputeId: d.id, resolution: r }) }); load(); onChange(); }}>
                {r.replace("_", " ")}
              </Button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function PayoutQueue({ onChange }: { onChange: () => void }) {
  const { data, load } = useQueue<{ payouts: { id: string; amountCents: number; channel: string; accountRef: string; createdAt: string; userName: string; userPhone: string }[] }>("/api/admin/payouts");
  if (!data) return <Spinner />;
  if (data.payouts.length === 0) return <Card className="py-8 text-center text-sm text-gray-500">Walang pending payouts. 🎉</Card>;
  return (
    <div className="space-y-2">
      {data.payouts.map((p) => (
        <Card key={p.id} className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-bold">{pesos(p.amountCents)} → {p.accountRef}</div>
            <div className="text-xs text-gray-500">{p.userName} · {p.userPhone} · {timeAgo(p.createdAt)}</div>
          </div>
          <div className="flex gap-2">
            <Button className="min-h-10 px-3 py-2 text-sm" onClick={async () => { await fetchJson("/api/admin/payouts", { method: "POST", body: JSON.stringify({ payoutId: p.id, decision: "PAID" }) }); load(); onChange(); }}>Mark paid</Button>
            <Button variant="danger" className="min-h-10 px-3 py-2 text-sm" onClick={async () => { await fetchJson("/api/admin/payouts", { method: "POST", body: JSON.stringify({ payoutId: p.id, decision: "REJECTED" }) }); load(); onChange(); }}>Reject</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ReportQueue({ onChange }: { onChange: () => void }) {
  const { data, load } = useQueue<{
    reports: { id: string; reason: string; details?: string | null; createdAt: string; reporterName: string; targetId: string; targetName: string; targetStrikes: number }[];
    flaggedUsers: { id: string; name: string; strikes: number; kycLevel: number }[];
  }>("/api/admin/reports");
  if (!data) return <Spinner />;
  return (
    <div className="space-y-4">
      {data.flaggedUsers.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold">🚩 Flagged users (3+ strikes sa chat)</h3>
          <div className="mt-2 space-y-2">
            {data.flaggedUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-sm">
                <span>{u.name} <Badge tone="red">{u.strikes} strikes</Badge></span>
                <div className="flex gap-2">
                  <Button variant="danger" className="min-h-9 px-3 py-1.5 text-xs" onClick={async () => { await fetchJson("/api/admin/reports", { method: "POST", body: JSON.stringify({ action: "suspend_user", userId: u.id }) }); load(); onChange(); }}>Suspend</Button>
                  <Button variant="secondary" className="min-h-9 px-3 py-1.5 text-xs" onClick={async () => { await fetchJson("/api/admin/reports", { method: "POST", body: JSON.stringify({ action: "reinstate_user", userId: u.id }) }); load(); onChange(); }}>Clear</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {data.reports.length === 0 ? (
        <Card className="py-8 text-center text-sm text-gray-500">Walang open reports. 🎉</Card>
      ) : (
        data.reports.map((r) => (
          <Card key={r.id}>
            <div className="text-sm"><Badge tone="red">{r.reason}</Badge> <strong>{r.targetName}</strong> — reported by {r.reporterName} · {timeAgo(r.createdAt)}</div>
            {r.details && <p className="mt-1 text-sm text-gray-600">&ldquo;{r.details}&rdquo;</p>}
            <div className="mt-2 flex gap-2">
              <Button variant="danger" className="min-h-9 px-3 py-1.5 text-xs" onClick={async () => { await fetchJson("/api/admin/reports", { method: "POST", body: JSON.stringify({ action: "suspend_user", userId: r.targetId }) }); await fetchJson("/api/admin/reports", { method: "POST", body: JSON.stringify({ action: "resolve_report", reportId: r.id }) }); load(); onChange(); }}>Suspend user</Button>
              <Button variant="secondary" className="min-h-9 px-3 py-1.5 text-xs" onClick={async () => { await fetchJson("/api/admin/reports", { method: "POST", body: JSON.stringify({ action: "resolve_report", reportId: r.id }) }); load(); onChange(); }}>Resolve</Button>
              <Button variant="ghost" className="min-h-9 px-3 py-1.5 text-xs" onClick={async () => { await fetchJson("/api/admin/reports", { method: "POST", body: JSON.stringify({ action: "dismiss_report", reportId: r.id }) }); load(); onChange(); }}>Dismiss</Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
