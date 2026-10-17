# CLAUDE.md — Fitrah Tribune website

Fitrah Tribune (FITR) is a student newspaper at Fitrah Islamic World Academy
(FIWA). This repo is its website. Motto: **"Documenting FIWA And Beyond."**

Read this whole file before changing anything.

---

## Repo layout

| Path | What it is |
|---|---|
| `fitr/` | **The live website.** React + Vite. All work happens here. |
| `fitr-template.html` | The old single-file version. **Frozen backup. Never edit it.** |
| `LICENSE`, `README.md` | MIT for code; README states content/brand terms. |

Run it: `cd fitr && npm install && npm run dev`. Check before committing:
`npm run build` must pass.

---

## Architecture — read this before touching any page

The site is a **React shell around an older engine**. This is deliberate and
temporary. Pages are moved into real React one at a time.

**React owns:** URLs (React Router), the layout (band, masthead, nav, footer),
and the brand assets.

**The engine owns:** storage, sign-in, permissions, and the content *inside*
each page.

```
fitr/
├── index.html              loads fonts, pdf.js, then the engine, then React
├── public/fitr-engine.js   THE ENGINE — plain script, not a module
└── src/
    ├── App.jsx             all routes
    ├── fitr.css            all styles
    ├── assets/             masthead.svg, mark.svg (import them, never inline)
    ├── components/         Layout.jsx, Masthead.jsx, Mark.jsx
    ├── lib/
    │   ├── LegacyPage.jsx     renders a page's HTML for the engine to fill
    │   └── useLegacyPage.js   hands a mounted page to the engine
    └── pages/              one .jsx per page
```

### How the two halves talk

- `public/fitr-engine.js` is loaded as a **classic script before React**, on
  purpose. The engine builds HTML strings with `onclick="Pages.forum…"`
  handlers, and those need its functions to be global. Don't turn it into an
  ES module without fixing every inline handler first.
- The engine exposes one object to React:
  `window.FITR = { ready, mountChrome, renderTabs, renderUserArea, Router, Pages, Auth, Store, Editor, Modal, SignIn, toast }`.
  React code uses `window.FITR.x`, never bare globals.
- `FITR.ready` is a promise: data migrated, seeded, current user known.
- `Layout.jsx` calls `FITR.mountChrome()` once. The engine fills
  `#tabs-list` and `#tabs-user`. Keep those divs empty in JSX.
- Each page `.jsx` calls `useLegacyPage('<key>')` and renders
  `<LegacyPage html={…} />`. The hook sets `Router.current`/`Router.params`,
  calls `Pages[key].render()`, then deep-links.
- **Why `dangerouslySetInnerHTML`:** the engine rewrites the inside of these
  pages directly. If React also owned those elements, they would undo each
  other's changes. Don't "fix" this by converting the HTML strings to JSX
  unless you are converting that whole page (see below).
- `Router.go('page')` / `Router.go('page/id')` still works everywhere. It is a
  bridge to React Router's `navigate`, registered in `App.jsx`.
- Every `Pages[key].render` is wrapped: it does nothing if `#page-<key>` isn't
  on screen. So the forum calling `Pages.home.render()` is safe.

### Routes

| URL | Engine key | Component |
|---|---|---|
| `/` | `home` | `Home.jsx` |
| `/news` | `news` | `News.jsx` |
| `/archive` | `archive` | `Archive.jsx` |
| `/forum`, `/forum/:postId` | `forum` | `Forum.jsx` |
| `/feedback`, `/feedback/submit` | `corrections` | `Feedback.jsx` |
| `/about`, `/about/standards`, `/about/tribunees` | `about` | `About.jsx` |
| `/article/:id` | `article` | `Article.jsx` |
| `/tribunee/:id` | `tribunee` | `Tribunee.jsx` |

Note the one mismatch: URL `/feedback` → engine key `corrections`.

---

## Rules for changing code

1. **Convert one page at a time. Never rewrite the engine wholesale.** A
   previous AI tool tried to rewrite the whole thing at once, silently skipped
   half the file, and produced a site that looked right and did nothing.
2. **To convert a page to real React:** rewrite its component in JSX with its
   own state, move its logic out of `Pages.<key>` in the engine, keep every
   permission check (below), then delete the old `Pages.<key>` code. Leave the
   other pages alone.
3. **Keep changes small** and explain what changed. One feature per commit.
4. **No base64 images.** Assets are files in `src/assets/`, imported.
5. **Work on the `development` branch.** Only push to `main` when asked.
6. If `npm run lint` complains about `public/fitr-engine.js`, add `'public'` to
   `globalIgnores` in `eslint.config.js`. Don't "fix" the engine to please
   the linter.

---

## Typography

The site uses the same three fonts as the printed paper (since Edition 3.5).
Each has one job. Use the CSS variables in `fitr.css`, never a font name.

| Variable | Font | Job |
|---|---|---|
| `--headline` | Libre Baskerville | **Bold:** the masthead, page titles, section heads, box headers (e.g. "From the Forum"), and article headlines (including headlines on article cards). **Italic:** pull quotes inside an article. |
| `--article` | Times New Roman | Text people actually read: the body of an article (and the article editor), decks/summaries (italic, regular weight) on cards and article pages, forum posts, bios, intro and explainer paragraphs, empty-state messages, the footer blurb. Reading on the site should feel like reading the paper. |
| `--ui` | Work Sans | The site's machinery: nav, buttons, menus, tabs, dates, categories, bylines, captions, small labels and kicker lines, in-article subheads (uppercase), forms, editor dialogs, footer links. |

The rule is the print rule: headline, article, everything around the
article. On the web, anything a reader settles in to read counts as
"article" text, so the serifs carry most of the words and Work Sans is
kept for navigation, labels and controls. (Changed Oct 2026: Work Sans
felt too dominant.)

- Libre Baskerville has **no bold italic**. Never make a headline italic;
  a highlighted word inside a headline stays upright (colour only).
- New element? Decide which of the three jobs it does and use that variable.
  If people read it as sentences, it's `--article`; if it's a label or
  control, it's Work Sans.
- Times New Roman isn't on every device; `--article` falls back to Tinos,
  its free metric twin, which `index.html` loads.

---

## Copy sheet

All user-visible text on the site is tracked in one Google Sheet:
https://docs.google.com/spreadsheets/d/1SfqBOvc5Zm0mwZZPsqN4sG_3wTZwD1o0loFL1hwLBXo/edit?usp=sharing

File "FITR | Website Text Lists", tab "Main". One row per piece of text.
Columns: **A** ID · **B** Page · **C** Where on the page · **D** Current
text · **E** Our version · **F** Status · **G** Source (file:line).
`{name}`-style slots are filled in by the site; keep them when rewriting.
`A / B` means one spot that switches between versions.

1. **"Apply the copy sheet"** means: apply every row whose Status is
   **Ready** — replace the site's text with "Our version" — then set those
   rows to **Applied**, and open a PR into `development`. Touch no other
   rows. Engine strings live in `public/fitr-engine.js`; that is a text
   edit, not a page conversion.
   - Find each string by its **Source** and **Where on the page**, not by
     searching for "Current text": people edit that column in the sheet, so
     it may not match the code. Line numbers drift as files change.
   - In the PR, list every applied row whose code text didn't match
     "Current text", so a person can check it.
2. **Whenever you add or change visible text on the site**, add or update
   its row in the sheet in the same piece of work.

If you can't open or edit the sheet, don't guess its contents. Say so, and
put the rows you would have added or changed in the PR description so a
person can paste them in.

---

## Permission rules — must never break

These are promises the Tribune has made to readers. Any change touching the
forum, feedback, corrections, or profiles must keep all of them. Enforce them
**inside the functions**, not only by hiding buttons.

**Tiers:** guest → public (any signed-in email) → fiwa (`@fiwa.sch.id`).
Tribunee and admin come from the `allowlist` collection
(`Auth.isTribunee()`, `Auth.isAdmin()`). Admins: Ammar, Aldebaraan, Fathan.

**Forum (a feed, not a discussion board)**
- Only Tribunees can post. Guests and public users read only.
- **Announcement** posts: admins only. **General** posts: any Tribunee.
- Delete: admins delete anything; a Tribunee deletes only their own.
- No comments. Readers respond through Feedback.

**Feedback & Corrections (private tickets)**
- Any signed-in user can submit a case and gets a ref like `FTR-7KQ2`.
- A submitter sees only their own cases.
- All Tribunees can **read** the case inbox. Only **admins** can reply,
  close, or reopen.
- A closed case is **frozen**: nobody can add to it, admins included, until
  it is reopened.
- **Case content is never public.** Not the name, not the words, not the fact
  that someone wrote in.
- "Log a public correction" from a case copies **nothing** from the case. The
  admin writes the public note from scratch. Keep it that way.

**Corrections log:** public and permanent. Admins can edit/delete entries, in
editing mode only.

**Profiles:** admins edit anyone. A Tribunee edits only their own photo and bio.

After changing any of these areas, test each rule by signing in as a guest, a
public user, a non-admin Tribunee, and an admin.

---

## Storage and the coming backend

- `STORAGE_DRIVER` in the engine is `'localStorage'` (demo). A
  `firebaseDriver` stub marks where Firebase goes; it must keep the same
  function signatures as the localStorage driver.
- Collections: `articles`, `editions`, `corrections`, `threads` (forum posts),
  `tribunees`, `allowlist`, `cases`, `casemsgs`. (`comments` is legacy and
  wiped.)
- Schema changes: bump `SCHEMA_VERSION` and add a guarded step in
  `migrateLegacyData()`. Each step must run only once (`if (current < N)`).

**Security, before any public launch:**
- **Sign-in is fake right now** — any password works. Anyone who reads this
  public repo can sign in as an admin. The site must not go public until real
  auth (Firebase) is in.
- All permission checks are client-side and therefore advisory until the same
  rules exist as **Firestore security rules**. Those rules are what make the
  privacy promises above actually true.
- The Firebase **web config** is safe to commit. A **service account key**
  must never be committed.
- The `allowlist` currently holds students' real school emails in a public
  repo. Move it out of the code when Firebase lands.

---

## Who decides

- **Ammar** (founder) makes the final call on anything that changes how the
  Tribune operates, not just how the site works.
- **Alde** (Aldebaraan) leads the platform and technical decisions.
- When a request is unclear or would change how the Tribune works, **ask
  before building.**
