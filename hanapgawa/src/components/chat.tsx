"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "@/lib/client";
import { Button } from "@/components/ui";

interface Msg { id: string; senderId: string; body: string; flagged?: boolean; createdAt: string }

export function ChatBox({ jobId, withUserId, meId }: { jobId: string; withUserId: string; meId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await fetchJson<{ messages: Msg[] }>(`/api/messages?jobId=${jobId}&with=${withUserId}`);
      setMessages(d.messages);
    } catch {
      // chat not available (no offer yet) — parent hides us in that case
    }
  }, [jobId, withUserId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const d = await fetchJson<{ message: Msg; warning?: string }>("/api/messages", {
        method: "POST",
        body: JSON.stringify({ jobId, toUserId: withUserId, body: text }),
      });
      setMessages((m) => [...m, d.message]);
      setWarning(d.warning ?? null);
      setText("");
    } catch (err) {
      setWarning((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-4 py-2 text-xs font-semibold text-gray-500">
        💬 Usap dito sa app — para protektado kayo pareho. Bawal magpalitan ng number.
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-center text-sm text-gray-400">Simulan ang usapan 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === meId ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                m.senderId === meId ? "bg-brand-700 text-white" : "bg-stone-100 text-gray-800"
              }`}
            >
              {m.body}
              {m.flagged && <div className="mt-1 text-[10px] opacity-75">⚠️ may tinago kaming contact info dito</div>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {warning && <div className="mx-4 mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{warning}</div>}
      <form onSubmit={send} className="flex gap-2 border-t border-stone-100 p-3">
        <input
          className="min-h-11 flex-1 rounded-xl border border-stone-300 px-4 text-base"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="I-type ang message…"
          maxLength={2000}
        />
        <Button type="submit" disabled={busy || !text.trim()} className="min-h-11 px-4 py-2">Send</Button>
      </form>
    </div>
  );
}
