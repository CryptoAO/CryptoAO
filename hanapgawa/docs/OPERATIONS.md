# Operations Runbook — HanapGawa

Written for the person who will be running this alone, at least at first: one founder, a phone, and an admin console. Everything here is what the built system actually does, not what a larger company's playbook would say.

The through-line: **this platform's only real product is trust.** Every procedure below is written to protect that, and where a rule costs money it says so.

---

## 1. The daily loop (15 minutes)

Run these in order every morning. If you only ever do one thing, do the first.

| # | Check | Where | What "bad" looks like |
|---|---|---|---|
| 1 | **Open SOS alerts** | `/admin` → SOS | Anything unresolved. Handle immediately, ahead of everything else on this page |
| 2 | Open disputes | `/admin` → Disputes | Anything older than 2 working days — you promised 5 in the Terms; aim for 2 |
| 3 | Pending KYC | `/admin` → Verification | A queue growing faster than you clear it means providers are stuck and not earning |
| 4 | Pending payouts | `/admin` → Payouts | Anything older than 1 working day. Slow payouts are the fastest way to lose providers |
| 5 | Abuse reports | `/admin` → Reports | Any report naming the same person twice |
| 6 | Liveness | `GET /api/health` | Anything but `{"status":"ok"}` |
| 7 | Escrow sweep ran | Your scheduler's log for `/api/cron/auto-release` | A 503 means `CRON_SECRET` is unset and **no escrow has auto-released since** |

**Weekly:** read the audit log for `admin.*` actions — including your own. If you ever hire a second operator, this is the only record of what they looked at.

---

## 2. SOS: the 2am scenario

A provider is alone in a stranger's house and has pressed the panic button. The system has already, before you knew anything: written the alert, texted every trusted contact they registered, notified the counterparty, and paged every admin.

**Your job is not to investigate. It is to make sure a human is reaching them.**

1. **Call the raiser first.** The SOS console shows their full number and precise coordinates — this is the one screen in the product that deliberately shows unmasked PII, because you cannot help someone you cannot phone. Every read of it is audit-logged.
2. **If they answer and are safe:** mark the alert `ACKNOWLEDGED`, write what they told you in the resolution note, and stay on the thread until the job ends.
3. **If they answer and are not safe, or do not answer:** call **911** and give the coordinates from the console. Do this before you finish reading the rest of this page. Then call the trusted contacts the system already texted.
4. **Only after the person is safe** does the money matter. Freeze the job by opening a dispute on their behalf if the booking is still live.
5. Mark `RESOLVED` with a factual note when the incident is genuinely over — not when the phone call ends.

**Never:** ask the person to prove it is a real emergency before acting; delay because the alert might be accidental; or resolve an alert you have not spoken to a human about. A false alarm costs you ten minutes. The other error is unrecoverable.

---

## 3. Deciding disputes

You have three outcomes: **refund the client**, **pay the provider**, or **split 50/50**. Whichever you choose, the money moves atomically and the job closes — there is no partial or reversible state, so decide once.

**Read in this order.** Later evidence does not outrank earlier evidence just because it arrived later.

1. **Photos.** Before/after/issue photos appear inline on the dispute card. This is why they exist.
2. **Check-ins.** Arrival and departure timestamps settle "he never showed up" outright.
3. **Chat.** Masked, but the sequence of who said what and when is intact.
4. **History.** Completed jobs and reliability on both sides. A first-time account against a fifty-job account is a signal, not a verdict.

**Defaults when the evidence is genuinely balanced:**

| Situation | Default | Why |
|---|---|---|
| No check-in from the provider, client says no-show | Refund client | Absent a record of arrival, the work cannot be shown to have happened |
| Work demonstrably done, complaint about quality only | Split | Both sides carry some of a subjective disagreement |
| Client cancelled after the provider arrived | Split | The provider spent fare and time on a booking the client made |
| Provider abandoned mid-job | Refund client | The outcome the client paid for did not happen |
| Photos show the work completed as described | Pay provider | This is what the evidence is for |

**Write the reason in the resolution note every time.** The parties see the outcome; you will see the note in six months when the same account is in front of you again.

**Never:** resolve a dispute you are a party to; take payment or a "settlement" outside the platform; or leave one open past 5 working days without telling both sides where it stands.

---

## 4. Verification (KYC)

Three levels: **L1** phone, automatic. **L2** government ID, you review. **L3** clearance, you review. Jobs of ₱2,000 or more require an L2 provider.

**Approve when:** the name matches the account, the document is one of the accepted types, the last four digits match what was typed, and the photo is legible and unaltered.

**Reject when:** the name does not match, the document is expired, the image is a photo of a screen, the corners or edges look edited, or the same document appears on a second account. Say which of these it was — a rejection with no reason generates a support message and a resubmission of the same file.

The image is **deleted the moment you record a decision.** Look once, decide, and write the reason in the note; you cannot go back and re-read it. That is deliberate under RA 10173 and is not a bug to work around.

**Never:** approve a document you could not read; store a copy anywhere outside the system; or discuss the contents of someone's ID over chat, email, or messenger.

---

## 5. Payouts

Every payout request is a person waiting for money they have already earned.

1. Confirm the requested amount is available in their ledger balance (the console shows it).
2. Send it through GCash/Maya/bank to the account reference on the request.
3. Mark it **paid** only after the transfer confirms. Marking paid first and transferring later means one crash separates your books from reality.
4. Reject only for a genuine reason — a mismatched account name, a suspected compromise, an open dispute over the same money — and always with that reason attached.

Target: **same working day.** This is the number providers talk to each other about.

---

## 6. Off-platform leakage and strikes

Contact masking runs automatically. Three strikes flags an account for your review; it does not ban anyone by itself.

When you review a flagged account, ask what they were trying to do. Someone sending their number to arrange a gate code is not the same as someone systematically pulling clients off the platform, even though the filter sees both.

- **First real attempt:** a message explaining that escrow, the dispute process, and the SOS button only work inside the app. Most people stop here — they were not trying to cheat, they were trying to coordinate.
- **Repeat, deliberate:** suspend. Suspension revokes every session immediately.
- **Ban:** reserve for fraud, threats, or safety incidents.

Say the quiet part to yourself honestly: the commission is why the platform can afford escrow and a support queue, so leakage really does hurt. But treating a confused first-timer like a thief costs more than the commission ever will.

---

## 6b. Profile photo takedowns

Photos are only visible to signed-in users, which keeps the blast radius small, but people will still occasionally upload something that has to go: a photo of someone else, a group shot where the provider is not identifiable, or something plainly inappropriate.

You can remove any user's photo from the admin side. It is deleted from storage, not hidden, and the takedown is audit-logged against your account.

Remove without hesitating when the photo shows a different person, more than one person with no clear subject, or anything sexual or violent. Message rather than remove when it is merely a bad photo — dark, blurry, a logo instead of a face. Losing a usable photo costs the provider bookings.

## 7. Incidents

**A data breach that likely affects users must be reported to the National Privacy Commission and to those users within 72 hours.** That clock starts when you become aware, not when you finish investigating. The privacy notice already commits to this.

1. Contain — revoke sessions, rotate `SESSION_SECRET` (this logs everyone out; do it anyway), rotate any leaked API keys.
2. Write down what you know and when you knew it, before you start fixing things.
3. Notify inside 72 hours even if the picture is incomplete. A follow-up correction is fine; a late first report is not.
4. Only then, root-cause and fix.

**Service outage:** `/api/health` reports database reachability only. If it is degraded, the database is the first thing to look at. Users see errors carrying an `X-Request-Id` — that id is in your error reports, so ask for it.

**A payment that never credited:** check the PayMongo webhook log before touching the ledger by hand. Webhook processing is idempotent per event, so a redelivery is safe; a manual ledger entry is not, and it is the one action here with no undo.

---

## 8. Things to never do, in one place

- Move money by editing the database. The ledger is append-only and every balance is derived from it; one manual row and your books stop being true.
- Resolve an SOS you have not spoken to a human about.
- Approve a KYC document you could not read.
- Take a dispute settlement, a fee, or a booking off-platform.
- Share a full phone number, address, or ID detail outside the admin console.
- Mark a payout paid before the transfer confirms.
- Skip the 72-hour breach notification because the investigation is not finished.

---

## 9. What this runbook does not cover yet

Written down so it is a known gap rather than a surprise:

- **No staging environment.** Every deploy goes straight to the thing holding people's money.
- **No database backups configured.** This is the single highest-risk item on the page. Do it before the first real user.
- **No second operator**, so no rota, no handover, and no separation of duties — you review the KYC, you decide the dispute, and you read your own audit log.
- **No fraud scoring.** Detection is you noticing a name twice in the report queue.
