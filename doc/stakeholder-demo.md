# Daya Cares — Stakeholder Demo Walkthrough

Use this script when presenting Daya Cares to centre managers, care staff, families, or investors.
Estimated time: **35–45 minutes**.

---

## Before you start

1. Start the demo environment:
   ```bash
   npm run demo
   ```
2. Open **http://localhost:8081** in a browser (use a wide window — the layout is designed for desktop web).
3. Keep this document open on a second screen or print it.
4. Demo password for every account: **`Daya@2026`**

| Username   | Role            | Who they represent              |
|------------|-----------------|---------------------------------|
| `admin`    | Centre Manager  | Daya Cares operations lead      |
| `caregiver`| Care Giver      | Priya Sen — field worker        |
| `rahul`    | Care Giver      | Second worker on the roster     |
| `family`   | Family member   | Arjun Banerjee — linked family  |
| `customer` | Care Recipient  | Anjali Banerjee — elderly member |

**Tip:** Sign out between roles using **Profile →** (top right) or by clearing the session and returning to the login screen.

---

## Demo storyline (what you are showing)

> Daya Cares runs home visits for elderly members in Durgapur. The centre registers members, assigns Care Givers, schedules visits, records vitals on every stop, bills families, and responds to emergencies — all in one place.

Walk through each role in order: **Admin → Care Giver → Family → Care Recipient**.

---

## Part 1 — Centre Manager (Admin)

**Sign in:** `admin` / `Daya@2026`

### 1.1 Home dashboard

**Say:** *"This is the morning control room for the centre."*

1. Point out the **welcome banner** and role label (Centre Manager).
2. Show the **quick-action tiles**: Members, Worker routing, Scheduling, Reports, Billing, Emergencies.
3. Scroll the **feed**:
   - **Operations** — how many Care Recipients are active in Durgapur.
   - **Today's routing** — visits scheduled for today with times and assigned workers.
   - **Emergencies** — open SOS count (or "no open emergencies").
4. Show the **Staff on shift** sidebar and the link to **Manage users and roles**.

---

### 1.2 Members — register and manage Care Recipients

**Go to:** Members (home tile or `/admin/members`)

**Say:** *"Every elderly member starts with a full digital registration — the same paper form, but searchable and editable."*

1. Show the member list with name, address, plan, and subscription status.
2. Tap **Register Care Recipient** to open the 7-step wizard:
   - **Step 1** — Office use: plan tier (Essential / Enhanced / Comprehensive), payment mode.
   - **Step 2** — Demographics, contact, baseline vitals.
   - **Step 3** — Home address.
   - **Step 4** — Emergency contacts.
   - **Step 5** — Medical history and conditions.
   - **Step 6** — Doctors and insurance.
   - **Step 7** — Family login, Care Giver assignment, document checklist, consents.
3. Tap **Submit registration** — note the confirmation with member ID.
4. Return to the list and tap **Edit registration** on an existing member to show records can be updated later.
5. Mention that **duplicate mobile numbers are rejected** at the database level.

---

### 1.3 Users — staff and family accounts

**Go to:** Manage users and roles (sidebar link or `/admin/users`)

**Say:** *"The centre controls who can log in — workers, families, and admins."*

1. Browse accounts grouped by role (Admin, Care Giver, Family, Customer).
2. Tap **Create user** — show name, mobile, email, role selection.
3. On an existing user, demonstrate **Edit** / **Save changes**.
4. Demonstrate **Block** on a test account (e.g. `rahul`) — explain login will fail with a blocked message.
5. **Unblock** to restore access.
6. Try **Delete** on a user with visit history — show it is refused to protect records.

---

### 1.4 Worker routing — assign Care Givers

**Go to:** Worker routing (`/admin/routing`)

**Say:** *"Each member gets a primary Care Giver. The board shows daily capacity so we don't overload anyone."*

1. Show the **unassigned queue** and assigned members per worker.
2. Tap a Care Giver chip to **assign** or **remove** a member.
3. Tap **Make primary** on a worker–member pair.
4. Point out **daily capacity** counts (e.g. "3/5 visits today").
5. Tap **Open area map** to show the member's area on OpenStreetMap.
6. Tap **Open Scheduling** to move to the next screen.

---

### 1.5 Scheduling — plan the week

**Go to:** Scheduling (`/admin/schedule`)

**Say:** *"Visits are scheduled in Indian Standard Time. Plans can auto-fill the week."*

1. Show today's board grouped by Care Giver with time-ordered stops.
2. Change the **Date (IST)** picker to another day.
3. Tap **Auto-book this week from plans** — explain this creates visits from each member's care plan.
4. Use **Add visit** to manually book:
   - Select Care Recipient and Care Giver.
   - Set start time, duration, visit type (Home Visit / Welfare Call / Follow-up).
   - Add notes → **Schedule visit**.
5. Cancel a visit with **Cancel visit** to show schedule changes are tracked.

---

### 1.6 Reports — visit history and exports

**Go to:** Reports (`/visits`)

**Say:** *"Every visit is searchable. Paper forms and ops reports export as PDF or CSV."*

1. Select a Care Recipient from the horizontal chip list.
2. Show the **latest visit** with vitals grid and clinical flags (normal / warning / critical).
3. Scroll to **earlier visits** and tap **Open this visit** for full detail.
4. Scroll to **Operations report**:
   - Missed visits, open SOS, outstanding dues, plan SLA summary.
   - Tap **Download ops pack** for a CSV export.
5. Under **Paper forms**, download:
   - **Prefilled** Registration, Home Assessment, Schedule Home Visit, Shift Log.
   - **Blank original** versions of the same forms.
6. Open a visit and tap **Edit this visit** to show admins can correct a saved log.

---

### 1.7 Billing — invoices and reminders

**Go to:** Billing (`/admin/billing`)

**Say:** *"Billing is tied to each member's plan. GST is split on every invoice."*

1. Show the **dues summary** (count and total INR outstanding).
2. Browse a member's plan, monthly fee, and invoice list.
3. Point out **GST lines** on an invoice.
4. Tap **Receipt** to download a PDF receipt.
5. Tap **Send due reminders** for in-app dunning to families with outstanding balances.
6. Change subscription status chips: **ACTIVE** / **PAUSED** / **INACTIVE**.
7. On an unpaid invoice: **Mark paid** or **Waive**.
8. Tap **Add [period] fee** when no current-period invoice exists.

---

### 1.8 Emergencies — SOS response

**Go to:** Emergencies (`/admin/emergencies`)

**Say:** *"When a family or member raises SOS, the centre sees it here immediately."*

1. Show open vs resolved incidents.
2. Tap **Raise an emergency** — select member, type (SOS / Fall / Medical / Other), add notes → **Send SOS to the centre**.
3. On an open incident:
   - Tap **Call [name]** — opens the phone dialer (`tel:` link).
   - Tap **Mark family called** to record outreach.
   - Assign a Care Giver from the chip list.
   - Tap **Acknowledge** then **Resolve** when handled.

**Sign out** before moving to the next role.

---

## Part 2 — Care Giver (Worker)

**Sign in:** `caregiver` / `Daya@2026` (Priya Sen)

### 2.1 Home dashboard

**Say:** *"The Care Giver sees today's route, assigned members, and any SOS they need to respond to."*

1. Show quick actions: Emergency SOS, Home visits, Today's route, Visit results, Messages.
2. Read the **Today's route** feed card — next stop with time and address.
3. Check **My Care Focus** sidebar for assigned members.

---

### 2.2 Today's route

**Go to:** Today's route (`/worker/schedule`)

1. Show stops in order with time, visit type, address, duration, and notes.
2. Tap **Start visit** on a Home Visit stop.

---

### 2.3 Record a home visit (17-step guided form)

**Go to:** Visit form (`/worker/visit/[customerId]`)

**Say:** *"This replaces the paper home-visit form. It works offline and syncs when connectivity returns."*

Walk through key sections (you do not need every step in a live demo):

| Step | What to show |
|------|--------------|
| 1 | Visit ID and confirm presence at the home |
| 2 | Well-being check |
| 3 | Emergency screening |
| 4 | **Vital signs** — BP, pulse, SpO₂, glucose, temperature |
| 5 | Health observation |
| 6–11 | Medication, food/sleep, mobility, home safety, hygiene |
| 12 | Mental well-being |
| 13 | Healthcare and family contacts |
| 14 | Requests and actions |
| 15 | Assessment — attach a photo of prescription/report |
| 16 | Review and acknowledgement |
| 17 | **Submit visit log** |

After submit, show the **success screen** with vitals summary and clinical flags.

**Optional:** Mention the form **auto-saves a draft offline** and queues submission if the network drops.

---

### 2.4 Care Focus list (unscheduled visits)

**Go to:** Home visits (`/worker/clients`)

1. Show all assigned members with plan and address.
2. Tap **Enter Care Focus data** to start a visit outside the schedule.

---

### 2.5 Visit history and messages

**Go to:** Visit results (`/visits`)

1. Show past visits for assigned members.
2. Tap a visit to view full detail.

**Go to:** Messages (home tile)

1. Tap **Messages** — opens email to the assigned Care Giver contact.

**Sign out** before the next role.

---

## Part 3 — Family member

**Sign in:** `family` / `Daya@2026` (Arjun Banerjee)

### 3.1 Home dashboard

**Say:** *"Families see their linked Care Recipient's status without calling the centre."*

1. Show quick actions: Emergency SOS, Health records, Visit history, Messages.
2. Read the **Last visit** card — vitals and whether flags are normal or need attention.
3. Read the **Next visit** card — who is coming and when.
4. Show **Linked Care Focus** in the sidebar.

---

### 3.2 Raise an emergency SOS

**Go to:** Emergency SOS (home tile)

1. Tap **Emergency SOS** → confirm **Send SOS**.
2. Show the confirmation that the centre has been alerted.
3. Explain the admin sees this on the Emergencies board (refer back to Part 1.8).

---

### 3.3 Health records and visit detail

**Go to:** Health records or Visit history (`/visits`)

1. Open the latest visit.
2. Show vitals, observations, and who recorded the visit.
3. Tap through to full visit detail.

---

### 3.4 Notifications

**Go to:** Bell icon in the header (`/notifications`)

1. Show SOS and visit-alert notifications.
2. Tap one to open the detail view (read/unread status, timestamp, message).

---

### 3.5 Profile

**Go to:** Profile (header)

1. Show name, role, username.
2. Edit mobile or email → **Save profile**.

**Sign out** before the next role.

---

## Part 4 — Care Recipient (Customer)

**Sign in:** `customer` / `Daya@2026` (Anjali Banerjee)

### 4.1 Home dashboard

**Say:** *"The elderly member has a simpler view focused on their own care."*

1. Show quick actions: Emergency SOS, My health, Visits, Messages.
2. Read **Last visit** and **Next visit** cards.
3. Show **My care team** sidebar with assigned workers.

---

### 4.2 SOS and health

1. Tap **Emergency SOS** — same flow as family; centre is alerted immediately.
2. Go to **My health** (`/visits`) — view own visit history and vitals.
3. Open **Profile** — edit contact details (address field is available for Care Recipients).

**Sign out** when done.

---

## Part 5 — Wrap up (5 minutes)

Return to **Admin** and show the end-to-end loop:

1. **Members** — the person you registered (or seeded data) is on the roster.
2. **Scheduling** — today's visit appears on the board.
3. **Reports** — the visit the Care Giver submitted shows vitals and flags.
4. **Billing** — invoice and receipt are available.
5. **Emergencies** — any SOS raised by family/customer appears and can be resolved.

### Talking points for stakeholders

- **One platform** for registration, routing, visits, billing, and emergencies.
- **Paper forms preserved** — same documents, now prefilled from live data.
- **Offline-capable** visit recording for field workers.
- **Role-based access** — admin, worker, family, and member each see only what they need.
- **IST scheduling** — built for how the Durgapur centre actually operates.
- **Audit trail** — visit logs cannot be deleted by removing user accounts.

### Questions to invite

- Which plan tiers and visit frequencies should we configure for launch?
- Who at the centre will be the primary admin?
- Which reports does the finance team need monthly?

---

## Quick reference — admin capabilities checklist

- [ ] Register and edit Care Recipients (7-step form)
- [ ] Create, edit, block, and delete user accounts
- [ ] Assign primary Care Givers with daily capacity limits
- [ ] Schedule visits manually or auto-book from plans (IST)
- [ ] View and edit all visit logs
- [ ] Download paper forms (blank and prefilled PDFs)
- [ ] Export operations report CSV
- [ ] Manage billing, GST invoices, receipts, and due reminders
- [ ] Respond to SOS — call family, acknowledge, resolve

## Quick reference — Care Giver capabilities checklist

- [ ] View today's route in stop order
- [ ] Start scheduled or unscheduled visits
- [ ] Complete 17-step guided visit form with vitals
- [ ] Submit offline with auto-sync
- [ ] View visit history for assigned members
- [ ] Send SOS and email messages

## Quick reference — Family / Care Recipient capabilities checklist

- [ ] View linked member's latest vitals and visit schedule
- [ ] Raise emergency SOS
- [ ] Receive in-app notifications for SOS and visit alerts
- [ ] View visit history
- [ ] Update own profile and contact details
- [ ] Send messages to the care team via email
