# ☕ Hanoi Café Workspace · v2.0

> Bản lưu cấu trúc. Bản thật là trang Notion đã publish (link trong `bai-dang.md`), dựng trực tiếp ngày 29/10/2026. Markdown không mang được database, view và nút, nên file này ghi lại nội dung chữ và schema để dựng lại khi cần.

A window seat over Hanoi's train street, a phin coffee, music without words. Every few minutes a train rolls past. Press play and start.

`/embed` https://applebin.me/chill/embed

> ☕ New here? Open **Start here** first (2 minutes). When it's time to work, pick a task below and brew a phin: 15, 25 or 45 minutes on that one thing. Want the full café with the phin timer, the cat's shelf and the diary wall? [Open the café ↗](https://applebin.me/chill?utm_source=notion&utm_medium=template&utm_campaign=hanoi-cafe-workspace&utm_content=home)

3 columns: 👋 Start here · 🧭 Product Desk · 🗃 Back of house

---

## 🌤 Today

Your top 3, then small things for breaks. Set a task's Status to Today to bring it here, Brewing while you work on it, Done when it's finished.

*Linked view of Tasks · table "Today": Status in (Today, Brewing), grouped by Focus, shows Name, Status, Phin size, Cups, Project.*

## ⏳ Today's phins

One phin is one sitting on one task. Add a row when you start: pick the task, the size and the time. Then brew it in the café: write the task on the paper slip next to the phin timer and cross it off when the coffee has dripped through. [Brew a phin in the café ↗](https://applebin.me/chill?utm_source=notion&utm_medium=template&utm_campaign=hanoi-cafe-workspace&utm_content=phins)

*Linked view of Phin Log · table: Brewed at = today, shows Phin, Task, Size, Brewed at, Seat, Taste.*

## 📊 Week in phins

*Linked view of Phin Log · board "Phins per day": Brewed at ≥ one week ago, grouped by Day (formula `formatDate(prop("Brewed at"), "MM/DD ddd")`), compact cards with Size and Taste. No chart view: Notion Free allows only 1 chart per workspace.*

---

## 🌙 End of day

- What I finished:
- What made me smile:
- Tomorrow I'll start with:

Move unfinished tasks back to Backlog or keep them on Today for tomorrow. Give today's phins a Taste: Smooth, Bitter or Weak.

> Want to leave a few lines for a stranger? The café keeps a diary on the counter: a question and a quote every day, two notes each, pinned on the wall for a week. [Write on the wall ↗](https://applebin.me/chill?utm_source=notion&utm_medium=template&utm_campaign=hanoi-cafe-workspace&utm_content=end-of-day)

## 📝 Quick notes

Ideas, links, things that pop into your head… jot them here and get back to work.

---

## 🗺 Change your seat

The window opens in Hanoi. To sit somewhere else, copy a link below, then click the window's ⋯ menu → Replace and paste it. The light follows the real time there.

| Place | Window link |
| --- | --- |
| Hanoi, train street | `https://applebin.me/chill/embed?place=hanoi-tau` |
| Da Lat | `https://applebin.me/chill/embed?place=dalat` |
| Saigon | `https://applebin.me/chill/embed?place=saigon` |
| Hue | `https://applebin.me/chill/embed?place=hue` |
| Da Nang, Dragon Bridge | `https://applebin.me/chill/embed?place=danang` |
| Tien Giang | `https://applebin.me/chill/embed?place=tiengiang` |
| Can Tho | `https://applebin.me/chill/embed?place=cantho` |
| Mekong countryside | `https://applebin.me/chill/embed?place=mientay` |
| Nha Trang | `https://applebin.me/chill/embed?place=nhatrang` |

Change the default station: add `&station=` and one of `acoustic`, `focus`, `sax`, `lofi`, `study`, for example `https://applebin.me/chill/embed?place=hue&station=sax`

---

**🆕 New in version 2.0 (October 2026)** *(toggle heading)*

- Today and Today's phins are now real databases: every phin is logged against a task, and Week in phins shows them day by day
- Product Desk: a Now / Next / Later roadmap, a timeline, ideas ranked by RICE (effort counted in phins), a backlog with blocked tasks, and docs for PRDs, SOPs, launch checklists and retros
- Sample data so you can see it working; clear it in Start here
- Change your seat now gives you the full window link to paste

Already duplicated an older version? Your café window updates by itself. Duplicate this page again to get the databases and the Product Desk.

Café made by Bin Nguyen · [applebin.me/chill](https://applebin.me/chill?utm_source=notion&utm_medium=template&utm_campaign=hanoi-cafe-workspace&utm_content=footer)

---

# 👋 Start here

Two minutes to set up your café. Everything else can wait.

**1. Make it yours.** Click Duplicate at the top right. Everything works on Notion's free plan. Press ▶ on the café window for music; Change your seat is at the bottom of the home page.

**2. Brew your first phin.**
1. In Today, add a task and set Status to Today.
2. When you start, set Status to Brewing and add a row in Today's phins: task, size (15, 25 or 45), time.
3. Work until the phin is done. In the café the phin timer drips while you work: [open the café ↗](https://applebin.me/chill?utm_source=notion&utm_medium=template&utm_campaign=hanoi-cafe-workspace&utm_content=start-here)
4. The task's Cups fill up ☕☕· and Week in phins grows.

**3. Building something? Use the Product Desk.** Roadmap, RICE, backlog, and PRDs, SOPs, launch checklists and retros in Docs. Tasks are shared with Today.

**4. Clear the sample data.** Every example row has Sample ticked. Select all rows in each table under Sample data and press Delete. The four Blank docs are not samples.

**More from the café:** [Chill for work](https://chromewebstore.google.com/detail/gidomdfggefliiidbfijmknejmjafafi) (Chrome extension) · [Lofi Pixel Cafe on YouTube](https://www.youtube.com/@lofipixel.cafevn) · a rating on the Notion Marketplace helps other people find the café.

*Sample data: 4 linked tables (Tasks, Phin Log, Projects, Docs) filtered Sample = true.*

---

# 🧭 Product Desk

The product side of the café: what you're building, what's next, and the docs that keep it on track. Same tasks as Today, so a phin on a backlog task counts here too.

`/embed` https://applebin.me/chill/embed?place=dalat&station=focus

> 🧭 Roadmap moves projects between Later, Next and Now. Ideas by RICE ranks what to build: Reach × Impact × Confidence ÷ Effort, with Effort counted in phins. To start a PRD, SOP, launch checklist or retro, open Docs and duplicate the matching Blank doc.

| Section | Database | Views |
| --- | --- | --- |
| 🗺 Roadmap | Projects | Now · Next · Later (board by Stage, Idea and Shipped hidden) · Timeline · Ideas by RICE (table, RICE desc) |
| 📥 Backlog | Tasks | Backlog (table, Status ≠ Done, grouped by Project, quick filter Type) · Board (by Status, Project not empty) |
| 📄 Docs | Docs | Library (board by Type) · SOPs to review (list, Type = SOP) |

---

# 🗃 Back of house · schema

**☕ Tasks**

| Property | Type | Notes |
| --- | --- | --- |
| Name | Title | |
| Status | Status | Backlog, Today (to-do) · Brewing (in progress) · Done |
| Focus | Select | Top 3, Small thing, Someday |
| Do date | Date | |
| Phin size | Select | 15, 25, 45 |
| Phins planned | Number | |
| Type | Select | Task, Feature, Bug, Chore |
| Project | Relation ↔ Projects.Tasks | |
| Blocked by / Blocking | Self relation | |
| Phins | Relation ↔ Phin Log.Task | |
| Phins done | Rollup | Phins → count |
| Minutes focused | Rollup | Phins → Minutes → sum |
| Cups | Formula | `repeat("☕", toNumber(prop("Phins done"))) + repeat("·", max(toNumber(prop("Phins planned")) - toNumber(prop("Phins done")), 0))` |
| Focus hours | Formula | `round(toNumber(prop("Minutes focused")) / 6) / 10` |
| Overdue | Formula | `prop("Status") != "Done" and not empty(prop("Do date")) and prop("Do date") < today()` |
| Sample | Checkbox | |

**⏳ Phin Log**

| Property | Type | Notes |
| --- | --- | --- |
| Phin | Title | "Phin · task name" |
| Task | Relation ↔ Tasks.Phins | |
| Size | Select | 15, 25, 45 |
| Minutes | Formula | `toNumber(prop("Size"))` |
| Brewed at | Date (with time) | |
| Day | Formula | `formatDate(prop("Brewed at"), "MM/DD ddd")`, groups the Phins per day board |
| Seat | Select | 9 places of the café |
| Station | Select | Acoustic, Deep Focus, Sax Lounge, Lo-fi, Study Beats |
| Taste | Select | Smooth, Bitter, Weak |
| Note | Text | |
| Sample | Checkbox | |

**🗂 Projects**

| Property | Type | Notes |
| --- | --- | --- |
| Name | Title | |
| Stage | Status | Idea, Later, Next (to-do) · Now · Shipped |
| Owner | Person | |
| Timeline | Date range | |
| Reach · Impact · Confidence · Effort | Number · Select (0.25–3) · Select (50/80/100) · Number (phins) | |
| RICE | Formula | Reach × Impact × Confidence/100 ÷ Effort, rounded |
| Tasks | Relation ↔ Tasks.Project | |
| Docs | Relation ↔ Docs.Project | |
| Progress | Rollup | Tasks → Status → percent per group |
| Focus hours | Rollup | Tasks → Focus hours → sum (Notion forbids a rollup of a rollup) |
| Sample | Checkbox | |

**📄 Docs**

| Property | Type | Notes |
| --- | --- | --- |
| Name | Title | |
| Type | Select | PRD, SOP, Launch checklist, Retro, Meeting note, Decision |
| Status | Status | Draft · In review · Approved, Outdated |
| Owner · Project | Person · Relation | |
| Last reviewed · Review every | Date · Select (30/90/180) | |
| Needs review | Formula | `dateBetween(today(), prop("Last reviewed"), "days") > toNumber(prop("Review every"))` |
| Sample | Checkbox | |

Blank docs: Blank PRD, Blank SOP, Blank launch checklist, Blank retro (Smooth / Bitter / Next brew, with a link to the café diary wall `utm_content=retro`).

Sample story: "Launch a tiny Chrome extension" (Now), "Weekly newsletter" (Next), "Dark mode" (Idea); 10 tasks, 12 phins from 23 to 29 Oct 2026, a PRD, the SOP "Publish a release" (flags Needs review), a Product Hunt launch checklist and a retro.
