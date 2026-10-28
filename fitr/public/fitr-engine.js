/* =====================================================================
   FITRAH TRIBUNE — APPLICATION SCRIPT
   ===================================================================== */

/* =====================================================================
   ★★★  STORAGE LAYER — SINGLE SWAP POINT  ★★★
   =====================================================================
   This is the only place in the entire codebase that talks to a backend.
   Every page, every modal, every form goes through `Store` below.

   ─────────────────────────────────────────────────────────────────────
   TO SWITCH FROM localStorage (DEMO) TO FIREBASE (PRODUCTION):
   ─────────────────────────────────────────────────────────────────────
     1. Add the Firebase SDK to <head> of this file:
        <script src="https://www.gstatic.com/firebasejs/10.x/firebase-app-compat.js"></sc​ript>
        <script src="https://www.gstatic.com/firebasejs/10.x/firebase-auth-compat.js"></sc​ript>
        <script src="https://www.gstatic.com/firebasejs/10.x/firebase-firestore-compat.js"></sc​ript>

     2. Fill in FIREBASE_CONFIG below with your project credentials
        (Firebase console → Project settings → Your apps → Config).

     3. Change ONE line:
            const STORAGE_DRIVER = 'localStorage';
        to:
            const STORAGE_DRIVER = 'firebase';

     4. Implement the methods inside `firebaseDriver` below — they all
        match the localStorage driver's signatures, so you only fill in
        the bodies. Stubs are provided.

     5. Done. No other code in the app changes.
   ===================================================================== */

const STORAGE_DRIVER = 'localStorage'; // 'localStorage' | 'firebase'

const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

/* ── localStorage driver (demo) ─────────────────────────────────────── */
const localStorageDriver = {
  _key(coll) { return `fitrah:${coll}`; },
  _read(coll) {
    try { return JSON.parse(localStorage.getItem(this._key(coll))) || []; }
    catch { return []; }
  },
  _write(coll, items) {
    localStorage.setItem(this._key(coll), JSON.stringify(items));
  },

  async list(coll, filterFn) {
    const items = this._read(coll);
    return filterFn ? items.filter(filterFn) : items.slice();
  },
  async get(coll, id) {
    return this._read(coll).find(i => i.id === id) || null;
  },
  async save(coll, item) {
    const items = this._read(coll);
    if (!item.id) item.id = `${coll.slice(0, 3)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (!item.createdAt) item.createdAt = Date.now();
    item.updatedAt = Date.now();
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) items[idx] = item; else items.push(item);
    this._write(coll, items);
    return item;
  },
  async remove(coll, id) {
    const items = this._read(coll).filter(i => i.id !== id);
    this._write(coll, items);
  },

  async signIn(email, password) {
    if (!email || !password) throw new Error('Email and password required');
    const tier = email.toLowerCase().endsWith('@fiwa.sch.id') ? 'fiwa' : 'public';
    // Fallback name from the address ("akio.hideaka1" → "Akio Hideaka").
    // Auth swaps in the roster name when the email belongs to a Tribunee.
    const name = email.split('@')[0]
      .split(/[._-]/).map(p => p.replace(/\d+$/, '')).filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    const user = { email: email.toLowerCase(), tier, name };
    localStorage.setItem('fitrah:currentUser', JSON.stringify(user));
    return user;
  },
  async signOut() {
    localStorage.removeItem('fitrah:currentUser');
  },
  async getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('fitrah:currentUser')) || null; }
    catch { return null; }
  }
};

/* ── Firebase driver (production — IMPLEMENT WHEN READY) ─────────────── */
const firebaseDriver = {
  _initialized: false,
  _init() {
    if (this._initialized) return;
    /* TODO:
       firebase.initializeApp(FIREBASE_CONFIG);
       this.db = firebase.firestore();
       this.auth = firebase.auth();
       this._initialized = true;
    */
  },

  async list(coll, filterFn) {
    this._init();
    /* TODO: const snap = await this.db.collection(coll).get();
       const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       return filterFn ? items.filter(filterFn) : items;
    */
    return [];
  },
  async get(coll, id) {
    this._init();
    /* TODO: const doc = await this.db.collection(coll).doc(id).get();
       return doc.exists ? { id: doc.id, ...doc.data() } : null;
    */
    return null;
  },
  async save(coll, item) {
    this._init();
    /* TODO: if (item.id) {
         await this.db.collection(coll).doc(item.id).set(item, { merge: true });
       } else {
         const ref = await this.db.collection(coll).add({ ...item, createdAt: Date.now() });
         item.id = ref.id;
       }
       return item;
    */
    return item;
  },
  async remove(coll, id) {
    this._init();
    /* TODO: await this.db.collection(coll).doc(id).delete(); */
  },

  async signIn(email, password) {
    this._init();
    /* TODO: const cred = await this.auth.signInWithEmailAndPassword(email, password);
       const tier = email.toLowerCase().endsWith('@fiwa.sch.id') ? 'fiwa' : 'public';
       const user = { email: cred.user.email, tier, name: cred.user.displayName || email.split('@')[0] };
       return user;
    */
  },
  async signOut() {
    this._init();
    /* TODO: await this.auth.signOut(); */
  },
  async getCurrentUser() {
    this._init();
    /* TODO: const u = this.auth.currentUser;
       if (!u) return null;
       const tier = u.email.toLowerCase().endsWith('@fiwa.sch.id') ? 'fiwa' : 'public';
       return { email: u.email, tier, name: u.displayName || u.email.split('@')[0] };
    */
    return null;
  }
};

/* ── The single Store the rest of the app uses ───────────────────────── */
const Store = STORAGE_DRIVER === 'firebase' ? firebaseDriver : localStorageDriver;

/* =====================================================================
   AUTH HELPER — wraps Store with tier/permission logic
   ===================================================================== */

const Auth = {
  _user: null,

  async refresh() {
    this._user = await this._withRosterName(await Store.getCurrentUser());
    await this._syncBodyClasses();
    return this.current();
  },

  current() {
    return this._user || { email: null, tier: 'guest', name: 'Guest' };
  },

  async signIn(email, password) {
    const user = await this._withRosterName(await Store.signIn(email, password));
    this._user = user;
    await this._syncBodyClasses();
    return user;
  },

  async signOut() {
    await Store.signOut();
    this._user = null;
    await this._syncBodyClasses();
  },

  /* A Tribunee signs in with their school email; show their roster name
     (e.g. "Akio Hideaka Takijoeddin"), not one built from the address. */
  async _withRosterName(user) {
    if (!user || !user.email) return user;
    const email = user.email.toLowerCase();
    const t = (await Store.list('tribunees')).find(x => (x.email || '').toLowerCase() === email);
    return t && t.name ? { ...user, name: t.name } : user;
  },

  isGuest()    { return this.current().tier === 'guest'; },
  isPublic()   { return this.current().tier === 'public'; },
  isFiwa()     { return this.current().tier === 'fiwa'; },
  canPost()    { return !this.isGuest(); },

  async isTribunee() {
    if (!this.isFiwa()) return false;
    const list = await Store.list('allowlist');
    const email = (this.current().email || '').toLowerCase();
    return list.some(a => (a.email || '').toLowerCase() === email);
  },

  async isAdmin() {
    if (!this.isFiwa()) return false;
    const list = await Store.list('allowlist');
    const email = (this.current().email || '').toLowerCase();
    return list.some(a => (a.email || '').toLowerCase() === email && a.admin);
  },

  /* Returns true if the current user can edit the given tribunee record:
     admins can edit anyone; regular tribunees can edit only their own profile. */
  async canEditTribunee(t) {
    if (!t) return false;
    if (await this.isAdmin()) return true;
    if (!(await this.isTribunee())) return false;
    const email = (this.current().email || '').toLowerCase();
    return !!t.email && t.email.toLowerCase() === email;
  },

  /* Keep body classes in sync with current auth state so CSS can gate
     admin-only affordances. Also sets a data-attr on body for any future
     selectors that need to key off the current user's email. */
  async _syncBodyClasses() {
    const body = document.body;
    if (!body) return;
    const isTrib  = await this.isTribunee();
    const isAdm   = await this.isAdmin();
    body.classList.toggle('is-tribunee', isTrib);
    body.classList.toggle('is-admin',    isAdm);
    body.dataset.userEmail = (this.current().email || '').toLowerCase();
  }
};

/* =====================================================================
   UTILITIES
   ===================================================================== */

const $  = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const initials = (name) => name.split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase();

const formatDate = (ts) => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
const formatDateShort = (ts) => {
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', sameYear
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
};
const relativeTime = (ts) => {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return formatDateShort(ts);
};

const toast = (msg, kind = '') => {
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; }, 2700);
  setTimeout(() => el.remove(), 3000);
};

/* =====================================================================
   MODAL SYSTEM
   ===================================================================== */

const Modal = {
  open({ title, body, foot = '', wide = false }) {
    const titleEl = $('#modal-title');
    titleEl.textContent = title;
    titleEl.style.display = title ? '' : 'none';
    $('#modal-body').innerHTML = body;
    $('#modal-foot').innerHTML = foot;
    $('#modal-shell').classList.toggle('wide', !!wide);
    $('#modal-backdrop').classList.add('open');
  },
  close() {
    // Tear down any active rich editor BEFORE removing modal DOM, otherwise
    // the document-level click listeners pile up across modal opens.
    if (Editor._tribuneeState && Editor._tribuneeState.bioEditor && Editor._tribuneeState.bioEditor.destroy) {
      try { Editor._tribuneeState.bioEditor.destroy(); } catch (e) {}
      Editor._tribuneeState.bioEditor = null;
    }
    $('#modal-shell').classList.remove('fullscreen');
    $('#modal-backdrop').classList.remove('open');
  }
};

/* =====================================================================
   ROUTER
   ===================================================================== */

/* =====================================================================
   ROUTER BRIDGE
   ─────────────────────────────────────────────────────────────────────
   React Router owns the URL. This object keeps the old Router.go('page')
   and Router.go('page/id') calls working everywhere in the engine by
   handing them to React's navigate(), which App.jsx registers on load.

   Router.current / Router.params are set by each React page when it
   mounts (see src/lib/useLegacyPage.js).
   ===================================================================== */

const ROUTE_PATHS = {
  home:        '/',
  news:        '/news',
  archive:     '/archive',
  forum:       '/forum',
  corrections: '/feedback',
  about:       '/about',
  article:     '/article',
  tribunee:    '/tribunee',
  write:       '/write'
};

const Router = {
  current: 'home',
  params: {},
  _navigate: null,                       // set by App.jsx

  go(path) {
    if (typeof path !== 'string' || !path) path = 'home';
    // Leaving the Writer's desk with unpublished work asks first.
    if (Editor._guardDesk(() => this.go(path))) return;
    const [page, id] = path.split('/');
    const base = ROUTE_PATHS[page] || '/';
    const url = id && base !== '/' ? `${base}/${id}` : base;

    // Same URL again (e.g. "Report a Tip" while already on it): just re-run.
    if (location.pathname === url) {
      Pages[this.current]?.render?.(this.params);
      this._deepLink(this.current, this.params.id);
      return;
    }
    if (this._navigate) this._navigate(url);
    else location.href = url;
  },

  /* Scroll to a spot inside the page after it renders. */
  _deepLink(page, id) {
    if (!id) return;
    const go = (sel, block = 'start') =>
      setTimeout(() => document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block }), 120);

    if (page === 'forum') go('#post-' + CSS.escape(id), 'center');
    if (page === 'about' && id === 'standards') go('.standards-block');
    if (page === 'about' && id === 'tribunees') go('#tribunees-grid-area');
    if (page === 'corrections' && id === 'submit') {
      go('#fc-submit-block', 'center');
      setTimeout(() => $('#fc-body')?.focus(), 520);
    }
  }
};

/* =====================================================================
   ICON SET (inline SVG)
   ===================================================================== */

const Icons = {
  home:    `<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V11z"/></svg>`,
  news:    `<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="7" y1="9" x2="13" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="17" y2="17"/></svg>`,
  archive: `<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="5"/><path d="M5 9v11h14V9"/><line x1="10" y1="13" x2="14" y2="13"/></svg>`,
  forum:   `<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  pencil:  `<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  about:   `<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L8 8v6l4 8 4-8V8l-4-6z"/><circle cx="12" cy="10" r="1.5" fill="currentColor"/></svg>`,
  view_list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><rect x="3" y="5" width="2.5" height="2.5" fill="currentColor" stroke="none"/><rect x="3" y="11" width="2.5" height="2.5" fill="currentColor" stroke="none"/><rect x="3" y="17" width="2.5" height="2.5" fill="currentColor" stroke="none"/></svg>`,
  view_grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="6.5" height="6.5"/><rect x="13.5" y="4" width="6.5" height="6.5"/><rect x="4" y="13.5" width="6.5" height="6.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5"/></svg>`,
  empty:   `<svg class="es-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M32 8L24 24v18l8 16 8-16V24L32 8z"/><circle cx="32" cy="28" r="3" fill="currentColor"/><circle cx="14" cy="20" r="1" fill="currentColor"/><circle cx="50" cy="22" r="1" fill="currentColor"/><circle cx="48" cy="40" r="1" fill="currentColor"/></svg>`
};

/* =====================================================================
   TABS / NAV RENDERING
   ===================================================================== */

const NAV_TABS = [
  { id: 'home',        label: 'Home',        icon: 'home' },
  { id: 'news',        label: 'News',        icon: 'news' },
  { id: 'archive',     label: 'Editions',    icon: 'archive' },
  { id: 'forum',       label: 'Forum',       icon: 'forum' },
  { id: 'corrections', label: 'Feedback',    icon: 'pencil' },
  { id: 'about',       label: 'About',       icon: 'about' }
];

async function renderTabs() {
  $('#tabs-list').innerHTML = NAV_TABS.map(t => `
    <button class="tab-btn ${Router.current === t.id ? 'active' : ''}" data-page="${t.id}" onclick="Router.go('${t.id}')">
      ${Icons[t.icon]}<span>${t.label}</span>
    </button>
  `).join('');
}

async function renderUserArea() {
  const user = Auth.current();
  const isTribunee = await Auth.isTribunee();
  const slot = $('#tabs-user');

  if (Auth.isGuest()) {
    slot.innerHTML = `
      <span class="tier-badge guest">Guest</span>
      <button class="btn-signin" onclick="SignIn.open()">Sign in</button>
    `;
  } else {
    const editingActive = Editor.active;
    slot.innerHTML = `
      ${isTribunee ? `<button class="btn-ghost btn-write" style="display:inline-flex" onclick="Router.go('write')">Write</button>` : ''}
      ${isTribunee ? `<button class="btn-ghost ${editingActive ? 'editing-active' : ''}" style="display:inline-flex" onclick="Editor.toggle(${!editingActive})">${editingActive ? 'Exit editing' : 'Editing mode'}</button>` : ''}
      <span class="tier-badge ${user.tier}">${user.tier === 'fiwa' ? 'FIWA' : 'Public'}</span>
      <span class="user-name">${escapeHtml(user.name)}</span>
      <div class="user-avatar">${initials(user.name)}</div>
      <button class="btn-signout" onclick="SignIn.signOut()">Sign out</button>
    `;
  }
}

/* =====================================================================
   SIGN-IN FLOW
   ===================================================================== */

const SignIn = {
  open() {
    Modal.open({
      title: 'Sign in to Fitrah Tribune',
      body: `
        <div class="signin-tier-info">
          <strong>Three modes of access:</strong>
          <br>· <strong>Guest</strong> — read everything, no posting (default).
          <br>· <strong>Public account</strong> — any email; can read the forum and submit corrections.
          <br>· <strong>FIWA account</strong> — emails ending <strong>@fiwa.sch.id</strong> see additional reporting. Tribunees can post to the forum.
        </div>
        <div class="field">
          <label for="signin-email">Email</label>
          <input type="email" id="signin-email" placeholder="you@example.com or you@fiwa.sch.id" />
        </div>
        <div class="field">
          <label for="signin-password">Password</label>
          <input type="password" id="signin-password" placeholder="••••••••" />
          <div class="field-hint">Demo mode — any password works. Real authentication arrives with the production backend.</div>
        </div>
      `,
      foot: `
        <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn-navy" onclick="SignIn.submit()">Sign in</button>
      `
    });
    setTimeout(() => $('#signin-email')?.focus(), 100);
  },

  async submit() {
    const email = $('#signin-email').value.trim();
    const password = $('#signin-password').value;
    if (!email || !password) {
      toast('Please enter email and password', 'error');
      return;
    }
    try {
      const user = await Auth.signIn(email, password);
      Modal.close();
      await renderUserArea();
      Pages[Router.current]?.render?.(Router.params);
      toast(`Signed in as ${user.name}` + (user.tier === 'fiwa' ? ' (FIWA)' : ''), 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  },

  async signOut() {
    await Auth.signOut();
    Editor.active = false;
    try { sessionStorage.removeItem('fitrah:editing'); } catch (e) {}
    document.body.classList.remove('editing');
    $('#edit-banner').style.display = 'none';
    await renderUserArea();
    Pages[Router.current]?.render?.(Router.params);
    toast('Signed out');
  }
};

/* =====================================================================
   EDITING MODE
   ===================================================================== */

const Editor = {
  active: false,

  async toggle(on) {
    const allowed = await Auth.isTribunee();
    if (on && !allowed) {
      toast('Editing mode is for tribunees only', 'error');
      return;
    }
    this.active = !!on;
    try { sessionStorage.setItem('fitrah:editing', this.active ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('editing', this.active);
    $('#edit-banner').style.display = this.active ? 'flex' : 'none';
    await renderUserArea();
    // Re-render the current page. We re-derive params from the URL hash so
    // that toggling editing mode while on /tribunee/:id or /article/:id
    // never loses the id and shows a "Not specified" empty state.
    Pages[Router.current]?.render?.(Router.params);
  },

  /* Article ─────────────────────────── */
  async editArticleById(id) {
    const a = await Store.get('articles', id);
    if (a) this.newArticle(a);
  },

  // Articles are written on the Writer's desk, a page of its own
  // (/write and /write/:id). See Pages.write and mountDesk below.
  newArticle(existing = null) {
    Router.go(existing && existing.id ? `write/${existing.id}` : 'write');
  },

  _teardownDesk() {
    const s = Editor._articleState;
    if (s && s.bodyEditor && s.bodyEditor.destroy) {
      try { s.bodyEditor.destroy(); } catch (e) {}
    }
    if (s && s.stopDraft) s.stopDraft();
    Editor._articleState = null;
  },

  /* Drafts: the desk saves unpublished work as you go, one draft per
     writer per article ("new" for a story not yet published). Opening the
     desk again brings it back. Publishing deletes it. */
  _draftId(articleId) {
    const who = (Auth.current().email || 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `draft-${who}-${articleId || 'new'}`;
  },

  /* Returns true (and asks) if leaving now would leave the desk with
     unpublished changes; `go` runs if the writer chooses to leave. */
  _guardDesk(go) {
    const s = Editor._articleState;
    if (!s || !s.isDirty || !document.querySelector('.desk') || !s.isDirty()) return false;
    s.flushDraft();
    Modal.open({
      title: 'Leave the Writer’s desk?',
      body: `<p class="desk-leave-text">Your changes aren’t published yet. They’re saved as a draft, and come back when you open ${s.isEditing ? 'this article’s editor' : 'the Writer’s desk'} again.</p>`,
      foot: `<button class="btn-ghost" id="desk-stay">Keep writing</button><button class="btn-navy" id="desk-leave">Leave</button>`
    });
    $('#desk-stay').onclick = () => Modal.close();
    $('#desk-leave').onclick = () => { Modal.close(); Editor._teardownDesk(); go(); };
    return true;
  },

  /* Builds the Writer's desk into `root`. The page column shows the story in
     the reader's own fonts; settings sit in the side panel. Field ids
     (#art-*) are what saveArticle reads. */
  async mountDesk(root, existing = null) {
    const isEditing = !!(existing && existing.id);
    const draftId = Editor._draftId(isEditing ? existing.id : null);
    const draft = await Store.get('drafts', draftId);
    const a = { ...(existing || {}), ...(draft ? draft.fields : {}) };
    const articleState = {
      coverImage: a.coverImage || null,
      coverAspect: parseAspect(a.coverAspect, 16/9),
      coverFit: a.coverFit === 'letterbox' ? 'letterbox' : 'crop',
      bodyEditor: null
    };
    Editor._articleState = articleState;

    const tribunees = (await Store.list('tribunees')).slice().sort((x, y) => (x.name || '').localeCompare(y.name || ''));
    const writers = (a.author || Auth.current().name || '').split(/\s*(?:&|,|\band\b)\s*/).filter(Boolean);
    const emptyCover = 'Click to add a cover photo (optional)';

    root.innerHTML = `
      <div class="desk">
        <div class="desk-bar">
          <a class="desk-back" onclick="Router.go(${isEditing ? `'article/${existing.id}'` : `'news'`})">← Back</a>
          <span class="desk-name">Writer’s desk</span>
          <span class="desk-status">${isEditing ? 'Editing a published article' : 'New article'}</span>
          <span class="desk-saved" id="desk-saved">${draft ? `Draft from ${relativeTime(draft.savedAt)} · <a id="desk-discard">Discard draft</a>` : ''}</span>
          <span class="desk-actions">
            ${isEditing ? `<button class="btn-ghost desk-delete" onclick="Editor.deleteArticle('${a.id}')">Delete</button>` : ''}
            <button class="btn-gold" onclick="Editor.saveArticle(${isEditing ? `'${a.id}'` : 'null'})">${isEditing ? 'Save changes' : 'Publish'}</button>
          </span>
        </div>
        <div class="desk-main">
          <div class="desk-page">
            <div class="desk-kicker" id="desk-kicker"></div>
            <textarea id="art-title" class="desk-headline" rows="1" placeholder="Headline">${escapeHtml(a.title || '')}</textarea>
            <textarea id="art-deck" class="desk-deck" rows="1" placeholder="Deck: one line that sums up the story">${escapeHtml(a.deck || '')}</textarea>
            <div class="desk-byline" id="desk-byline"></div>
            <div class="cover-preview afp-preview desk-cover" id="cover-preview" style="aspect-ratio: ${articleState.coverAspect};">
              ${articleState.coverImage
                ? `<img src="${articleState.coverImage}" alt="" /><button type="button" class="cover-clear" id="cover-clear">×</button>`
                : emptyCover}
            </div>
            <input type="text" id="art-cover-caption" class="desk-caption" value="${escapeHtml(a.coverCaption || '')}" placeholder="Caption: what the photo shows, and who took it" />
            <div id="art-body-editor" class="desk-body"></div>
          </div>

          <aside class="desk-panel">
            <h2>Article settings</h2>
            <div class="field">
              <label>Section</label>
              <div class="desk-seg" id="desk-section">
                ${NEWS_SECTIONS.map(x => `<button type="button" data-sec="${x.id}" class="${a.section === x.id ? 'active' : ''}">${x.label}</button>`).join('')}
              </div>
              <select id="art-section" hidden>
                <option value=""></option>
                ${NEWS_SECTIONS.map(x => `<option value="${x.id}" ${a.section === x.id ? 'selected' : ''}>${x.label}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Category (optional)</label>
              <select id="art-tab"></select>
            </div>
            <div class="field">
              <label>Writers</label>
              <div class="desk-chips" id="desk-writers"></div>
              <select id="desk-add-writer">
                <option value="">+ Add a Tribunee</option>
                ${tribunees.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`).join('')}
              </select>
              <input type="text" id="desk-other-writer" placeholder="Or type another name and press Enter" />
              <input type="hidden" id="art-author" />
              <div class="field-hint">Tribunees’ names link to their profiles on the article.</div>
            </div>
            <div class="field">
              <label>Cover photo</label>
              <div class="afp-picker" id="art-afp">
                <div class="afp-row">
                  <label>Aspect</label>
                  <div class="afp-pills">
                    <button type="button" data-w="16" data-h="9">16:9</button>
                    <button type="button" data-w="4" data-h="3">4:3</button>
                    <button type="button" data-w="3" data-h="2">3:2</button>
                    <button type="button" data-w="1" data-h="1">1:1</button>
                    <button type="button" data-custom="1">Custom</button>
                  </div>
                  <div class="afp-custom-row" style="display:none">
                    <input type="number" class="afp-w" min="0.1" step="any" value="16" />
                    <span>:</span>
                    <input type="number" class="afp-h" min="0.1" step="any" value="9" />
                  </div>
                </div>
                <div class="afp-row afp-fit">
                  <label>Fit</label>
                  <div class="afp-pills">
                    <button type="button" data-fit="crop">Crop</button>
                    <button type="button" data-fit="letterbox">Letterbox</button>
                  </div>
                </div>
                <div class="afp-hint">Pick these before uploading. Click the picture area on the page to upload.</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Visibility</label>
                <select id="art-visibility">
                  <option value="public" ${a.visibility !== 'fiwa' ? 'selected' : ''}>Public</option>
                  <option value="fiwa" ${a.visibility === 'fiwa' ? 'selected' : ''}>FIWA only</option>
                </select>
              </div>
              <div class="field">
                <label>Language</label>
                <select id="art-lang">
                  <option value="en" ${(a.lang || 'en') === 'en' ? 'selected' : ''}>English</option>
                  <option value="id" ${a.lang === 'id' ? 'selected' : ''}>Indonesian</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Also in print? Edition number</label>
              <input type="number" id="art-edition" value="${a.edition || ''}" placeholder="Leave empty for web-only" min="1" />
              <div class="field-hint">Adds “In print · Edition N” to the byline.</div>
            </div>
            ${!isEditing ? `
              <div class="pdf-import-row">
                <div class="pdf-icon">PDF</div>
                <div class="pdf-text"><strong>Import from PDF</strong>: text goes into the page; images go at the bottom for you to place.</div>
                <button id="pdf-import-btn">Choose PDF</button>
              </div>
            ` : `
              <div class="field" style="background: var(--paper-deep); padding: 0.9rem 1rem; border-left: 3px solid var(--gold);">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="checkbox" id="art-log-correction" style="width: auto;" />
                  <span style="text-transform: none; letter-spacing: 0; font-family: var(--ui); font-size: 0.9rem; color: var(--ink);">Log this edit as a public correction</span>
                </label>
                <div class="field-hint" style="margin-top: 0.4rem;">If checked, this change appears on the Corrections page (article itself stays clean).</div>
                <input type="text" id="art-correction-note" placeholder="What was corrected? (e.g. 'Misspelled name', 'Wrong date')" style="margin-top: 0.6rem; display: none;" />
              </div>
            `}
            <div class="desk-count" id="desk-count"></div>
          </aside>
        </div>
      </div>
    `;

    // Headline and deck grow with their text; Enter doesn't add a line.
    root.querySelectorAll('.desk-headline, .desk-deck').forEach(t => {
      const fit = () => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };
      t.addEventListener('input', fit);
      t.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
      requestAnimationFrame(fit);
    });

    // Section buttons drive the hidden select the save code reads.
    $('#desk-section').querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        $('#desk-section').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
        $('#art-section').value = b.dataset.sec;
        $('#art-section').onchange?.();
      };
    });

    // Writers: chips, kept in sync with the hidden byline field.
    const drawWriters = () => {
      $('#art-author').value = writers.join(' & ');
      $('#desk-writers').innerHTML = writers.map((n, i) => `
        <span class="desk-chip"><span class="ar-avatar sm">${escapeHtml(initials(n))}</span>${escapeHtml(n)}
          <button type="button" data-i="${i}" title="Remove">×</button></span>`).join('');
      $('#desk-writers').querySelectorAll('button').forEach(b => {
        b.onclick = () => { writers.splice(+b.dataset.i, 1); drawWriters(); };
      });
      drawByline();
    };
    const addWriter = (n) => { n = (n || '').trim(); if (n && !writers.includes(n)) writers.push(n); drawWriters(); };
    $('#desk-add-writer').onchange = (e) => { addWriter(e.target.value); e.target.value = ''; };
    $('#desk-other-writer').onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault(); addWriter(e.target.value); e.target.value = '';
    };

    // Live kicker, byline and word count, as the reader will see them.
    const countWords = () => {
      const ed = articleState.bodyEditor && articleState.bodyEditor.editor;
      return ed ? ed.textContent.replace(/\u200B/g, '').split(/\s+/).filter(Boolean).length : 0;
    };
    const drawByline = () => {
      const words = countWords();
      const mins = Math.max(1, Math.round(words / 200));
      $('#desk-byline').innerHTML = `
        <span class="ar-avatars">${writers.map(n => `<span class="ar-avatar">${escapeHtml(initials(n))}</span>`).join('')}</span>
        <span>By <b>${writers.map(escapeHtml).join(' &amp; ') || '…'}</b> <span class="ar-date">· ${mins} min read</span></span>`;
      $('#desk-count').textContent = `${words} word${words === 1 ? '' : 's'} · ${mins} min read`;
    };
    const tabsAll = await Store.list('newsTabs');
    const drawKicker = () => {
      const tabLabel = tabsAll.find(t => t.id === $('#art-tab').value)?.label || '';
      $('#desk-kicker').textContent = articleKicker({ section: $('#art-section').value, tabLabel, visibility: $('#art-visibility').value }, { fiwaLabel: 'FIWA-only' });
    };
    const coverPreview = $('#cover-preview');
    const syncCaption = () => { $('#art-cover-caption').style.display = articleState.coverImage ? '' : 'none'; };
    new MutationObserver(syncCaption).observe(coverPreview, { childList: true });
    syncCaption();

    // Mount rich editor
    const mount = RichEditor.mount($('#art-body-editor'), {
      initial: a.body || '',
      placeholder: 'Write your article here. Use the toolbar above to format text, add headings, lists, quotes, and images…',
      allowImages: true
    });
    articleState.bodyEditor = mount;

    // Wire tab dropdown
    const tabs = await Store.list('newsTabs');
    const tabSelect = $('#art-tab');
    const sectionSelect = $('#art-section');
    // Only offer categories that belong to the chosen section.
    const refreshTabs = () => {
      const sec = sectionSelect.value;
      const keep = tabSelect.value || a.tab;
      const fits = tabs.filter(t => !sec || t.section === sec);
      tabSelect.innerHTML = '<option value="">— None —</option>' +
        fits.map(t => `<option value="${t.id}" ${keep === t.id ? 'selected' : ''}>${escapeHtml(t.label)}</option>`).join('');
    };
    refreshTabs();
    sectionSelect.onchange = () => { refreshTabs(); drawKicker(); };
    tabSelect.onchange = drawKicker;
    $('#art-visibility').onchange = drawKicker;

    // Cover image: aspect + fit picker
    const previewEl = $('#cover-preview');
    const pickerEl = $('#art-afp');
    wireAspectFitPicker(pickerEl, previewEl, articleState, 'coverAspect', 'coverFit');

    // Cover image: click preview to upload
    previewEl.onclick = async (e) => {
      if (e.target.id === 'cover-clear') return; // handled below
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        try {
          const cropped = await compressImageWithFit(
            file, articleState.coverFit, articleState.coverAspect, 1600, 0.85
          );
          articleState.coverImage = cropped;
          previewEl.innerHTML = `<img src="${cropped}" alt="" /><button type="button" class="cover-clear" id="cover-clear">×</button>`;
          // Re-bind clear button
          $('#cover-clear').onclick = (e2) => {
            e2.stopPropagation();
            articleState.coverImage = null;
            previewEl.innerHTML = emptyCover;
          };
        } catch (err) {
          toast('Cover image upload failed: ' + err.message, 'error');
        }
      };
      input.click();
    };
    // Bind clear if image already there
    const existingClear = $('#cover-clear');
    if (existingClear) {
      existingClear.onclick = (e2) => {
        e2.stopPropagation();
        articleState.coverImage = null;
        previewEl.innerHTML = emptyCover;
      };
    }

    // PDF import button
    const pdfBtn = $('#pdf-import-btn');
    if (pdfBtn) {
      pdfBtn.onclick = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,.pdf';
        input.onchange = async (ev) => {
          const file = ev.target.files[0];
          if (!file) return;
          pdfBtn.disabled = true;
          pdfBtn.textContent = 'Importing…';
          try {
            const result = await importFromPDF(file);
            if (!result) { pdfBtn.disabled = false; pdfBtn.textContent = 'Choose PDF'; return; }

            // Inject text as paragraphs into editor
            const editor = articleState.bodyEditor.editor;
            const textHTML = result.text.split(/\n\n+/)
              .filter(p => p.trim())
              .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
              .join('');

            // Append images at the bottom with a visible header
            const imagesHTML = result.images.length
              ? `<hr><p><em>— Images extracted from the PDF (drag/move them into place):</em></p>` +
                result.images.map(src => `<img class="rte-image" src="${src}" alt="" />`).join('')
              : '';

            editor.innerHTML = (textHTML || '<p><br></p>') + imagesHTML;
            toast(`Imported ${result.text.split(/\s+/).length} words${result.images.length ? ' + ' + result.images.length + ' images' : ''}`, 'success');
          } catch (err) {
            console.error(err);
            toast('PDF import failed: ' + (err.message || 'unknown error'), 'error');
          }
          pdfBtn.disabled = false;
          pdfBtn.textContent = 'Choose PDF';
        };
        input.click();
      };
    }

    // Correction checkbox
    const cb = $('#art-log-correction');
    if (cb) cb.onchange = () => {
      $('#art-correction-note').style.display = cb.checked ? 'block' : 'none';
    };

    mount.editor.addEventListener('input', drawByline);
    drawWriters();
    drawKicker();

    // Autosave the draft a moment after each change, and on the way out.
    const collect = () => ({
      title: $('#art-title').value, deck: $('#art-deck').value,
      body: mount.getHTML(), author: $('#art-author').value,
      section: $('#art-section').value, tab: $('#art-tab').value,
      visibility: $('#art-visibility').value, lang: $('#art-lang').value,
      edition: $('#art-edition').value ? parseInt($('#art-edition').value, 10) : null,
      coverImage: articleState.coverImage, coverAspect: articleState.coverAspect,
      coverFit: articleState.coverFit,
      coverCaption: articleState.coverImage ? $('#art-cover-caption').value : ''
    });
    const original = JSON.stringify(collect());
    let lastSaved = draft ? null : original;
    let timer = null;
    const deskEl = root.querySelector('.desk');
    const flush = () => {
      clearTimeout(timer);
      if (!document.contains(deskEl)) return;
      const snap = JSON.stringify(collect());
      if (snap === lastSaved) return;
      lastSaved = snap;
      const label = $('#desk-saved');
      if (snap === original && !draft) {
        Store.remove('drafts', draftId);
        if (label) label.textContent = '';
        return;
      }
      Store.save('drafts', { id: draftId, articleId: isEditing ? existing.id : null,
        email: Auth.current().email, fields: JSON.parse(snap), savedAt: Date.now() })
        .then(() => { if (label) label.textContent = 'Draft saved'; })
        .catch(() => { if (label) label.textContent = 'Couldn’t save the draft (too big for this browser)'; });
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(flush, 1200); };
    ['input', 'change', 'click'].forEach(ev => deskEl.addEventListener(ev, schedule));
    const coverWatch = new MutationObserver(schedule);
    coverWatch.observe($('#cover-preview'), { childList: true });
    const onUnload = (e) => {
      flush();
      if (articleState.isDirty()) { e.preventDefault(); e.returnValue = ''; }
    };
    // Links React handles itself (the footer) go through the same question.
    const onLink = (e) => {
      const link = e.target.closest('a[href]');
      if (!link || deskEl.contains(link) || link.target === '_blank') return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (Editor._guardDesk(() => Router._navigate ? Router._navigate(url.pathname) : (location.href = url.href))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('popstate', flush);
    document.addEventListener('click', onLink, true);
    articleState.isEditing = isEditing;
    articleState.flushDraft = flush;
    articleState.isDirty = () => JSON.stringify(collect()) !== original || !!draft;
    articleState.discardDraft = () => Store.remove('drafts', draftId);
    articleState.stopDraft = () => {
      clearTimeout(timer);
      coverWatch.disconnect();
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('popstate', flush);
      document.removeEventListener('click', onLink, true);
    };

    const discard = $('#desk-discard');
    if (discard) discard.onclick = async () => {
      if (!confirm('Discard this draft? Your unpublished changes will be lost.')) return;
      await Store.remove('drafts', draftId);
      Editor._teardownDesk();
      Pages.write.render(Router.params);
    };
  },

  async saveArticle(id) {
    // Only Tribunees publish. (Later: writers' stories wait for an Editor.)
    if (!(await Auth.isTribunee())) { toast('Only Tribunees can publish articles', 'error'); return; }
    const state = Editor._articleState || {};
    const item = id ? (await Store.get('articles', id)) || {} : {};
    item.title = $('#art-title').value.trim();
    item.deck = $('#art-deck').value.trim();
    item.body = state.bodyEditor ? state.bodyEditor.getHTML() : '';
    item.author = $('#art-author').value.trim();
    item.authorEmail = item.authorEmail || Auth.current().email;
    item.section = $('#art-section').value;
    item.tab = $('#art-tab').value;
    item.subtab = '';
    item.visibility = $('#art-visibility').value;
    item.lang = $('#art-lang').value;
    item.coverImage = state.coverImage || null;
    item.coverAspect = parseAspect(state.coverAspect, 16/9);
    item.coverFit = state.coverFit === 'letterbox' ? 'letterbox' : 'crop';
    item.coverCaption = item.coverImage ? $('#art-cover-caption').value.trim() : '';
    const ed = $('#art-edition').value;
    item.edition = ed ? parseInt(ed, 10) : null;

    if (!item.title) { toast('Title is required', 'error'); return; }
    if (!item.section) { toast('Choose Internal or External News', 'error'); return; }

    if (id) item.id = id;
    const saved = await Store.save('articles', item);

    // Optionally log a correction
    const logCb = $('#art-log-correction');
    if (id && logCb && logCb.checked) {
      const note = $('#art-correction-note').value.trim();
      await Store.save('corrections', {
        articleId: id,
        articleTitle: item.title,
        edition: item.edition,
        note: note || 'Edited',
        editor: Auth.current().name
      });
    }

    state.discardDraft?.();
    Editor._teardownDesk();
    Router.go(`article/${saved.id}`);
    toast(id ? 'Article updated' : 'Article published', 'success');
  },

  async deleteArticle(id) {
    if (!(await Auth.isTribunee())) return;
    if (!confirm('Delete this article? This cannot be undone.')) return;
    await Store.remove('articles', id);
    Editor._articleState?.discardDraft?.();
    Editor._teardownDesk();
    Router.go('news');
    toast('Article deleted');
  },

  async deleteArticleAndReturn(id) {
    if (!(await Auth.isTribunee())) return;
    if (!confirm('Delete this article? This cannot be undone.')) return;
    await Store.remove('articles', id);
    Router.go('news');
    toast('Article deleted');
  },

  /* Edition (archive) ───────────────── */
  async newEdition() {
    if (!(await Auth.isAdmin())) {
      toast('Only admins can manage archive editions', 'error');
      return;
    }
    Editor._editingEditionId = null;
    const editionState = {
      coverImage: null,
      coverAspect: 1/1.4,
      coverFit: 'crop'
    };
    Editor._editionState = editionState;

    Modal.open({
      title: 'Archive a newspaper edition',
      body: `
        <div class="field">
          <label>Front-page cover (optional)</label>
          <div class="afp-picker" id="ed-afp">
            <div class="afp-row">
              <label>Aspect</label>
              <div class="afp-pills">
                <button type="button" data-w="1" data-h="1.4">A4 ↕</button>
                <button type="button" data-w="1.4" data-h="1">A4 ↔</button>
                <button type="button" data-w="1" data-h="1">1:1</button>
                <button type="button" data-w="16" data-h="9">16:9</button>
                <button type="button" data-custom="1">Custom</button>
              </div>
              <div class="afp-custom-row" style="display:none">
                <input type="number" class="afp-w" min="0.1" step="any" value="1" />
                <span>:</span>
                <input type="number" class="afp-h" min="0.1" step="any" value="1.4" />
              </div>
            </div>
            <div class="afp-row afp-fit">
              <label>Fit</label>
              <div class="afp-pills">
                <button type="button" data-fit="crop">Crop</button>
                <button type="button" data-fit="letterbox">Letterbox</button>
              </div>
            </div>
            <div class="afp-hint">A4 ↕ matches a printed front page. Use letterbox if you'd rather keep the whole image and pad with cream.</div>
          </div>
          <div class="cover-preview afp-preview" id="ed-cover-preview" style="aspect-ratio: ${editionState.coverAspect}; max-width: 320px;">
            Click to upload a screenshot of the front page
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Edition number</label>
            <input type="number" id="ed-num" placeholder="e.g. 3" />
          </div>
          <div class="field">
            <label>Publication date</label>
            <input type="date" id="ed-date" />
          </div>
        </div>
        <div class="field">
          <label>Headline / cover title</label>
          <input type="text" id="ed-title" placeholder="The lead story of this edition" />
        </div>
        <div class="field">
          <label>Canva (or PDF) link — view-only</label>
          <input type="url" id="ed-link" placeholder="https://www.canva.com/design/..." />
          <div class="field-hint">Paste the Canva share link (set to "Anyone with link can view").</div>
        </div>
        <div class="field">
          <label>Brief description</label>
          <textarea id="ed-desc" rows="3" placeholder="A short note about this edition's contents."></textarea>
          <div class="field-hint">Shown below the title on the archive card. Keep it to a sentence or two — it's clamped to 3 lines.</div>
        </div>
        <div class="signin-tier-info">
          <strong>Note:</strong> Once archived, an edition is preserved exactly as it was — including any errors. Archived editions are immune to silent corrections.
        </div>
      `,
      foot: `
        <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn-navy" onclick="Editor.saveEdition()">Archive edition</button>
      `
    });

    setTimeout(() => Editor._wireEditionCoverPicker(editionState), 50);
  },

  _wireEditionCoverPicker(state) {
    const previewEl = $('#ed-cover-preview');
    if (!previewEl) return;
    const pickerEl = $('#ed-afp');
    if (pickerEl) {
      wireAspectFitPicker(pickerEl, previewEl, state, 'coverAspect', 'coverFit');
    }

    // If state already carries an image (edit mode), render it
    if (state.coverImage) {
      previewEl.innerHTML = `<img src="${state.coverImage}" alt="" /><button type="button" class="cover-clear" id="ed-cover-clear">×</button>`;
    }

    const bindClear = () => {
      const clearBtn = $('#ed-cover-clear');
      if (!clearBtn) return;
      clearBtn.onclick = (e) => {
        e.stopPropagation();
        state.coverImage = null;
        previewEl.innerHTML = 'Click to upload a screenshot of the front page';
      };
    };
    bindClear();

    previewEl.onclick = (e) => {
      if (e.target.id === 'ed-cover-clear') return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        try {
          const cropped = await compressImageWithFit(
            file, state.coverFit, state.coverAspect, 1200, 0.85
          );
          state.coverImage = cropped;
          previewEl.innerHTML = `<img src="${cropped}" alt="" /><button type="button" class="cover-clear" id="ed-cover-clear">×</button>`;
          bindClear();
        } catch (err) {
          toast('Cover upload failed: ' + err.message, 'error');
        }
      };
      input.click();
    };
  },

  async saveEdition() {
    if (!(await Auth.isAdmin())) {
      toast('Only admins can manage archive editions', 'error');
      return;
    }
    const num = parseInt($('#ed-num').value, 10);
    const date = $('#ed-date').value;
    const title = $('#ed-title').value.trim();
    const desc = $('#ed-desc').value.trim();

    if (!num || !date || !title) {
      toast('Edition number, date, and title are required', 'error');
      return;
    }

    const state = Editor._editionState || {};
    const wasEditing = !!Editor._editingEditionId;
    const existing = wasEditing
      ? (await Store.get('editions', Editor._editingEditionId)) || {}
      : {};

    // The link field is only present on the NEW edition modal. When editing
    // an existing edition, the link is locked — fall back to existing.link.
    const linkEl = $('#ed-link');
    const link = linkEl ? linkEl.value.trim() : (existing.link || '');

    const item = {
      ...existing,
      number: num,
      date: new Date(date).getTime(),
      title, link, desc,
      coverImage: state.coverImage || null,
      coverAspect: parseAspect(state.coverAspect, 1/1.4),
      coverFit: state.coverFit === 'letterbox' ? 'letterbox' : 'crop',
      archivedBy: existing.archivedBy || Auth.current().name
    };
    if (wasEditing) item.id = Editor._editingEditionId;

    await Store.save('editions', item);
    Editor._editingEditionId = null;
    Editor._editionState = null;

    Modal.close();
    Pages.archive.render();
    Pages.home.render();
    toast(`Edition ${num} ${wasEditing ? 'updated' : 'archived'}`, 'success');
  },

  async editEdition(id) {
    if (!(await Auth.isAdmin())) {
      toast('Only admins can manage archive editions', 'error');
      return;
    }
    const e = await Store.get('editions', id);
    if (!e) { toast('Edition not found', 'error'); return; }
    Editor._editingEditionId = id;
    const editionState = {
      coverImage: e.coverImage || null,
      coverAspect: parseAspect(e.coverAspect, 1/1.4),
      coverFit: e.coverFit === 'letterbox' ? 'letterbox' : 'crop'
    };
    Editor._editionState = editionState;

    const dateStr = new Date(e.date).toISOString().slice(0, 10);
    Modal.open({
      title: `Edit Edition ${e.number}`,
      body: `
        <div class="field">
          <label>Front-page cover (optional)</label>
          <div class="afp-picker" id="ed-afp">
            <div class="afp-row">
              <label>Aspect</label>
              <div class="afp-pills">
                <button type="button" data-w="1" data-h="1.4">A4 ↕</button>
                <button type="button" data-w="1.4" data-h="1">A4 ↔</button>
                <button type="button" data-w="1" data-h="1">1:1</button>
                <button type="button" data-w="16" data-h="9">16:9</button>
                <button type="button" data-custom="1">Custom</button>
              </div>
              <div class="afp-custom-row" style="display:none">
                <input type="number" class="afp-w" min="0.1" step="any" value="1" />
                <span>:</span>
                <input type="number" class="afp-h" min="0.1" step="any" value="1.4" />
              </div>
            </div>
            <div class="afp-row afp-fit">
              <label>Fit</label>
              <div class="afp-pills">
                <button type="button" data-fit="crop">Crop</button>
                <button type="button" data-fit="letterbox">Letterbox</button>
              </div>
            </div>
            <div class="afp-hint">Re-uploading applies the chosen aspect + fit. The existing image stays as-is until you upload a new one.</div>
          </div>
          <div class="cover-preview afp-preview" id="ed-cover-preview" style="aspect-ratio: ${editionState.coverAspect}; max-width: 320px;">
            Click to upload a screenshot of the front page
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Edition number</label>
            <input type="number" id="ed-num" value="${e.number}" />
          </div>
          <div class="field">
            <label>Publication date</label>
            <input type="date" id="ed-date" value="${dateStr}" />
          </div>
        </div>
        <div class="field">
          <label>Headline / cover title</label>
          <input type="text" id="ed-title" value="${escapeHtml(e.title || '')}" />
        </div>
        <div class="field">
          <label>Canva link
            <span style="color: var(--ink-muted); font-weight: 400; font-size: 0.7rem; letter-spacing: 0.06em; text-transform: none; margin-left: 0.5rem;">— locked once archived</span>
          </label>
          <div class="readonly-link">
            ${e.link
              ? `<a href="${escapeHtml(e.link)}" target="_blank" rel="noopener">${escapeHtml(e.link)}</a>`
              : `<span class="empty">No link saved.</span>`}
          </div>
          <div class="field-hint">Archive entries preserve the original link as it was published — that's the whole point of an archive. To replace the link, remove this entry and archive a new edition.</div>
        </div>
        <div class="field">
          <label>Brief description</label>
          <textarea id="ed-desc" rows="3">${escapeHtml(e.desc || '')}</textarea>
          <div class="field-hint">Shown below the title on the archive card. Keep it to a sentence or two — it's clamped to 3 lines.</div>
        </div>
      `,
      foot: `
        <button class="btn-ghost" style="margin-right: auto; color: #c0392b;" onclick="Editor.deleteEdition('${id}')">Remove</button>
        <button class="btn-ghost" onclick="Editor._editingEditionId = null; Editor._editionState = null; Modal.close()">Cancel</button>
        <button class="btn-navy" onclick="Editor.saveEdition()">Save changes</button>
      `
    });

    setTimeout(() => Editor._wireEditionCoverPicker(editionState), 50);
  },

  async deleteEdition(id) {
    if (!(await Auth.isAdmin())) {
      toast('Only admins can manage archive editions', 'error');
      return;
    }
    const e = await Store.get('editions', id);
    if (!e) { toast('Edition not found', 'error'); return; }
    Modal.open({
      title: `Remove Edition ${e.number}?`,
      body: `
        <p style="font-family: var(--ui); line-height: 1.5; margin-bottom: 1.1rem; font-size: 1rem; color: var(--ink-soft);">
          You're about to remove <strong style="color: var(--ink);">"${escapeHtml(e.title)}"</strong> from the archive. The entry on this site will be wiped — including the front-page screenshot if you uploaded one.
        </p>
        <div class="signin-tier-info" style="background: rgba(192, 57, 62, 0.08); border-left: 3px solid #c0392b;">
          <strong>This cannot be undone.</strong> The Canva file itself isn't affected — only the archive entry on Fitrah Tribune.
        </div>
      `,
      foot: `
        <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn-navy" style="background: #c0392b; border-color: #c0392b;" onclick="Editor._confirmDeleteEdition('${id}')">Remove permanently</button>
      `
    });
  },

  async _confirmDeleteEdition(id) {
    await Store.remove('editions', id);
    Editor._editingEditionId = null;
    Editor._editionState = null;
    Modal.close();
    Pages.archive.render();
    Pages.home.render();
    toast('Edition removed');
  },

  /* Correction ───────────────────────── */
  async editCorrection(id) {
    if (!(await Auth.isAdmin())) {
      toast('Only admins can edit corrections', 'error');
      return;
    }
    const c = await Store.get('corrections', id);
    if (!c) { toast('Correction not found', 'error'); return; }
    Modal.open({
      title: `Edit correction`,
      body: `
        <div class="field">
          <label>Article title</label>
          <input type="text" id="corr-title" value="${escapeHtml(c.articleTitle || '')}" />
        </div>
        <div class="field">
          <label>Edition number (optional)</label>
          <input type="number" id="corr-edition" value="${c.edition || ''}" placeholder="leave blank for online-only" min="1" />
        </div>
        <div class="field">
          <label>Description of the correction</label>
          <textarea id="corr-note" rows="4" placeholder="What was corrected and why.">${escapeHtml(c.note || '')}</textarea>
        </div>
        <div class="field-hint">Editing a correction updates the public record. The timestamp and original author are preserved.</div>
      `,
      foot: `
        <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn-navy" onclick="Editor.saveCorrection('${id}')">Save changes</button>
      `
    });
  },

  async saveCorrection(id) {
    if (!(await Auth.isAdmin())) {
      toast('Only admins can edit corrections', 'error');
      return;
    }
    const c = await Store.get('corrections', id);
    if (!c) { toast('Correction not found', 'error'); return; }
    c.articleTitle = $('#corr-title').value.trim();
    const ed = $('#corr-edition').value;
    c.edition = ed ? parseInt(ed, 10) : null;
    c.note = $('#corr-note').value.trim();
    if (!c.articleTitle) { toast('Article title is required', 'error'); return; }
    if (!c.note) { toast('Description is required', 'error'); return; }
    await Store.save('corrections', c);
    Modal.close();
    Pages.corrections.render();
    toast('Correction updated', 'success');
  },

  async deleteCorrection(id) {
    if (!(await Auth.isAdmin())) {
      toast('Only admins can remove corrections', 'error');
      return;
    }
    if (!confirm('Remove this correction from the public record?')) return;
    await Store.remove('corrections', id);
    Pages.corrections.render();
    toast('Correction removed');
  },

  /* Tribunee ─────────────────────────── */
  async editTribuneeById(id) {
    const t = await Store.get('tribunees', id);
    if (!t) return;
    if (!(await Auth.canEditTribunee(t))) {
      toast('You can only edit your own profile', 'error');
      return;
    }
    this.newTribunee(t);
  },

  async newTribunee(existing = null) {
    const t = existing || {};
    const isEditing = !!(existing && t.id);
    const isAdmin = await Auth.isAdmin();

    // Adding a brand-new tribunee is admin-only.
    if (!isEditing && !isAdmin) {
      toast('Only admins can add new tribunees', 'error');
      return;
    }
    // Editing someone else's profile is admin-only.
    if (isEditing && !(await Auth.canEditTribunee(t))) {
      toast('You can only edit your own profile', 'error');
      return;
    }

    const tribuneeState = {
      photo: t.photo || null,
      photoAspect: parseAspect(t.photoAspect, 4/5),
      photoFit: t.photoFit === 'letterbox' ? 'letterbox' : 'crop',
      bioEditor: null
    };

    // Admins edit everything. A Tribunee editing their own profile changes
    // only the photo: bios are written by the admins with them (Ammar, Oct
    // 2026), so they stay short and fit the paper.
    const identityReadOnly = isEditing && !isAdmin ? 'readonly' : '';
    const identityHint = isEditing && !isAdmin
      ? '<div class="field-hint" style="margin-bottom: 0.8rem; color: var(--ink-muted);">You can change your photo here. Your name, role, grade and bio are kept by the admins: tell them what you\'d like your bio to say.</div>'
      : '';
    const latestEdition = Math.max(0, ...(await Store.list('editions')).map(e => Number(e.number) || 0));
    const editionChoices = Array.from({ length: Math.max(6, latestEdition + 1) }, (_, i) => i + 1);
    const tEditions = Credits.editions(t);
    const tStats = t.stats || {};

    Modal.open({
      title: isEditing ? `Edit profile — ${t.name}` : 'Add tribunee',
      wide: true,
      body: `
        ${identityHint}
        <div style="display: flex; gap: 1.4rem; align-items: flex-start; margin-bottom: 1rem;">
          <div style="display: flex; flex-direction: column; gap: 0.8rem; flex-shrink: 0;">
            <div class="tribunee-photo-picker ${tribuneeState.photo ? 'has-image' : ''}" id="tp-photo-picker" style="aspect-ratio: ${tribuneeState.photoAspect};">
              ${tribuneeState.photo
                ? `<img src="${tribuneeState.photo}" alt="" /><button type="button" class="tp-clear" id="tp-photo-clear">×</button>`
                : escapeHtml(initials(t.name || 'New'))}
            </div>
            <div class="afp-picker" id="tr-afp" style="width: 200px;">
              <div class="afp-row">
                <label>Aspect</label>
                <div class="afp-pills">
                  <button type="button" data-w="4" data-h="5">4:5</button>
                  <button type="button" data-w="1" data-h="1">1:1</button>
                  <button type="button" data-w="3" data-h="4">3:4</button>
                  <button type="button" data-w="16" data-h="9">16:9</button>
                  <button type="button" data-custom="1">Custom</button>
                </div>
                <div class="afp-custom-row" style="display:none">
                  <input type="number" class="afp-w" min="0.1" step="any" value="4" />
                  <span>:</span>
                  <input type="number" class="afp-h" min="0.1" step="any" value="5" />
                </div>
              </div>
              <div class="afp-row afp-fit">
                <label>Fit</label>
                <div class="afp-pills">
                  <button type="button" data-fit="crop">Crop</button>
                  <button type="button" data-fit="letterbox">Letterbox</button>
                </div>
              </div>
              <div class="afp-hint">The About-page card always crops to 4:5 — your chosen aspect shows on your full profile page.</div>
            </div>
          </div>
          <div style="flex: 1;">
            <div class="field"><label>Full name</label><input type="text" id="tr-name" value="${escapeHtml(t.name || '')}" placeholder="e.g. Ammar Mufiid Johansyah" ${identityReadOnly} /></div>
            <div class="field"><label>FIWA email</label><input type="email" id="tr-email" value="${escapeHtml(t.email || '')}" placeholder="e.g. firstname.lastname@fiwa.sch.id" ${identityReadOnly} /></div>
            <div class="field-row">
              <div class="field"><label>Role</label><input type="text" id="tr-role" value="${escapeHtml(t.role || '')}" placeholder="e.g. Writer, Journalist" ${identityReadOnly} /></div>
              <div class="field"><label>Grade</label><input type="text" id="tr-grade" value="${escapeHtml(t.grade || '')}" placeholder="e.g. G8" ${identityReadOnly} /></div>
            </div>
            <div class="field-hint">Click the portrait to upload a photo. If left empty, a placeholder with initials is used.</div>
          </div>
        </div>
        ${isAdmin ? `
        <div class="field">
          <label>Bio</label>
          <div id="tr-bio-editor"></div>
          <div class="field-hint">Written by the admins with the Tribunee. The first two lines show on the About page.</div>
        </div>
        <div class="tr-credits">
          <div class="tr-credits-head">Credits · admins only</div>
          <div class="field-row">
            <div class="field"><label>Articles in print</label><input type="number" min="0" step="1" id="tr-articles" value="${Number.isFinite(tStats.articles) ? tStats.articles : ''}" placeholder="Counted from this site" /></div>
            <div class="field"><label>Photos credited</label><input type="number" min="0" step="1" id="tr-photos" value="${Number.isFinite(tStats.photos) ? tStats.photos : ''}" placeholder="0" /></div>
          </div>
          <div class="field">
            <label>Editions worked on</label>
            <div class="tr-editions">
              ${editionChoices.map(n => `<label><input type="checkbox" value="${n}" ${tEditions.includes(n) ? 'checked' : ''} /> Ed. ${Credits.roman(n)}</label>`).join('')}
            </div>
            <div class="field-hint">Articles in print: leave empty to count only this site's bylines; web-only articles are added on top. "Tribunee since" is the first edition ticked.</div>
          </div>
        </div>` : ''}
      `,
      foot: `
        ${isEditing && isAdmin ? `<button class="btn-ghost" style="margin-right: auto; color: #c0392b;" onclick="Editor.deleteTribunee('${t.id}')">Remove</button>` : ''}
        <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn-navy" onclick="Editor.saveTribunee(${t.id ? `'${t.id}'` : 'null'})">${isEditing ? 'Save' : 'Add'}</button>
      `
    });

    $('#modal-shell').classList.add('fullscreen');

    setTimeout(() => {
      // Rich bio editor, admins only (no images allowed)
      if ($('#tr-bio-editor')) {
        tribuneeState.bioEditor = RichEditor.mount($('#tr-bio-editor'), {
          initial: t.bio || '',
          placeholder: 'Who they are, what they write about, what they enjoy…',
          allowImages: false
        });
      }

      // Wire aspect + fit picker (preview = the photo box itself)
      const picker = $('#tp-photo-picker');
      const pickerEl = $('#tr-afp');
      if (pickerEl) {
        wireAspectFitPicker(pickerEl, picker, tribuneeState, 'photoAspect', 'photoFit');
      }

      // Photo upload
      picker.onclick = (e) => {
        if (e.target.id === 'tp-photo-clear') return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (ev) => {
          const file = ev.target.files[0];
          if (!file) return;
          try {
            const cropped = await compressImageWithFit(
              file, tribuneeState.photoFit, tribuneeState.photoAspect, 800, 0.85
            );
            tribuneeState.photo = cropped;
            picker.classList.add('has-image');
            picker.innerHTML = `<img src="${cropped}" alt="" /><button type="button" class="tp-clear" id="tp-photo-clear">×</button>`;
            $('#tp-photo-clear').onclick = (e2) => {
              e2.stopPropagation();
              tribuneeState.photo = null;
              picker.classList.remove('has-image');
              const name = $('#tr-name').value.trim() || 'New';
              picker.innerHTML = escapeHtml(initials(name));
            };
          } catch (err) {
            toast('Photo upload failed: ' + err.message, 'error');
          }
        };
        input.click();
      };
      const existingClear = $('#tp-photo-clear');
      if (existingClear) {
        existingClear.onclick = (e2) => {
          e2.stopPropagation();
          tribuneeState.photo = null;
          picker.classList.remove('has-image');
          const name = $('#tr-name').value.trim() || 'New';
          picker.innerHTML = escapeHtml(initials(name));
        };
      }

      // Update placeholder initials as the name is typed (when no photo set)
      $('#tr-name').addEventListener('input', () => {
        if (tribuneeState.photo) return;
        const name = $('#tr-name').value.trim() || 'New';
        picker.innerHTML = escapeHtml(initials(name));
      });
    }, 50);

    Editor._tribuneeState = tribuneeState;
  },

  async saveTribunee(id) {
    const state = Editor._tribuneeState || {};
    const isAdmin = await Auth.isAdmin();
    const existing = id ? (await Store.get('tribunees', id)) || {} : {};

    // Permission re-check (defence in depth — UI is already gated, but a
    // direct console call must also be blocked).
    if (id) {
      if (!(await Auth.canEditTribunee(existing))) {
        toast('You can only edit your own profile', 'error');
        return;
      }
    } else if (!isAdmin) {
      toast('Only admins can add new tribunees', 'error');
      return;
    }

    const t = { ...existing };

    // Admins can change identity fields. Non-admins can only update photo
    // and bio — identity values are taken from the existing record so a
    // tampered-with read-only field cannot be persisted.
    if (isAdmin) {
      t.name  = $('#tr-name').value.trim();
      t.email = ($('#tr-email').value || '').trim().toLowerCase();
      t.role  = $('#tr-role').value.trim();
      t.grade = $('#tr-grade').value.trim();
      // Bio and credits are admin-only too; a non-admin save keeps them as they were.
      if (state.bioEditor) t.bio = state.bioEditor.getHTML();
      const count = (sel) => {
        const v = ($(sel)?.value || '').trim();
        const n = parseInt(v, 10);
        return v === '' || !(n >= 0) ? null : n;
      };
      t.stats = { articles: count('#tr-articles'), photos: count('#tr-photos') };
      t.editions = $$('.tr-editions input:checked').map(i => Number(i.value));
    }
    t.bio = t.bio || '';
    t.photo = state.photo || null;
    t.photoAspect = parseAspect(state.photoAspect, 4/5);
    t.photoFit = state.photoFit === 'letterbox' ? 'letterbox' : 'crop';

    if (!t.name) { toast('Name is required', 'error'); return; }
    if (id) t.id = id;
    const saved = await Store.save('tribunees', t);

    $('#modal-shell').classList.remove('fullscreen');
    Modal.close();
    Editor._tribuneeState = null;

    // Re-render whatever page is showing
    if (Router.current === 'tribunee' && Router.params.id === saved.id) {
      Pages.tribunee.render(Router.params);
    } else {
      Pages[Router.current]?.render?.(Router.params);
    }
    toast(id ? 'Profile updated' : 'Tribunee added', 'success');
  },

  async deleteTribunee(id) {
    if (!(await Auth.isAdmin())) {
      toast('Only admins can remove tribunees', 'error');
      return;
    }
    if (!confirm('Remove this tribunee?')) return;
    await Store.remove('tribunees', id);
    $('#modal-shell').classList.remove('fullscreen');
    Modal.close();
    if (Router.current === 'tribunee') {
      Router.go('about');
    } else {
      Pages.about.render();
    }
    toast('Tribunee removed');
  },

  /* Tabs ─────────────────────────────── */
  manageTabs() {
    const sectionOptions = (cur) =>
      NEWS_SECTIONS.map(x => `<option value="${x.id}" ${cur === x.id ? 'selected' : ''}>${x.label}</option>`).join('');
    Store.list('newsTabs').then(tabs => {
      Modal.open({
        title: 'Manage News Categories',
        body: `
          <div class="field-hint" style="margin-bottom: 1rem;">Each category sits inside Internal or External News (e.g. Internal News → Construction, External News → Sports).</div>
          <div id="tab-list">
            ${tabs.map(t => `
              <div class="field" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; align-items: end;" data-tab-id="${t.id}">
                <div>
                  <label>Label</label>
                  <input type="text" value="${escapeHtml(t.label)}" data-tab-label />
                </div>
                <div>
                  <label>Section</label>
                  <select data-tab-section>${sectionOptions(t.section)}</select>
                </div>
                <button class="btn-ghost" onclick="Editor.removeTab('${t.id}')" style="padding: 0.7rem;">×</button>
              </div>
            `).join('')}
          </div>
          <div class="field" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; align-items: end; padding-top: 1rem; border-top: 1px dashed var(--rule);">
            <div><label>New label</label><input type="text" id="new-tab-label" placeholder="e.g. Sports" /></div>
            <div><label>Section</label><select id="new-tab-section">${sectionOptions('')}</select></div>
            <button class="btn-add" onclick="Editor.addTab()">+ Add</button>
          </div>
        `,
        foot: `
          <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
          <button class="btn-navy" onclick="Editor.saveTabs()">Save all</button>
        `
      });
    });
  },

  async addTab() {
    if (!(await Auth.isTribunee())) { toast('Only Tribunees can change categories', 'error'); return; }
    const label = $('#new-tab-label').value.trim();
    if (!label) { toast('Label required', 'error'); return; }
    const section = $('#new-tab-section').value;
    await Store.save('newsTabs', { label, section, subtabs: [] });
    Editor.manageTabs();
    Pages.news.render();
    toast('Category added', 'success');
  },

  async removeTab(id) {
    if (!(await Auth.isTribunee())) { toast('Only Tribunees can change categories', 'error'); return; }
    if (!confirm('Remove this category? Articles tagged with it will lose their category.')) return;
    await Store.remove('newsTabs', id);
    Editor.manageTabs();
    Pages.news.render();
  },

  async saveTabs() {
    if (!(await Auth.isTribunee())) { toast('Only Tribunees can change categories', 'error'); return; }
    const rows = $$('#tab-list > .field');
    for (const row of rows) {
      const id = row.dataset.tabId;
      const label = row.querySelector('[data-tab-label]').value.trim();
      const t = await Store.get('newsTabs', id);
      if (t) {
        t.label = label;
        t.section = row.querySelector('[data-tab-section]').value;
        t.subtabs = [];
        await Store.save('newsTabs', t);
      }
    }
    Modal.close();
    Pages.news.render();
    toast('Categories updated', 'success');
  },

  /* Featured (home) ──────────────────── */
  async featureArticle() {
    const articles = await listVisibleArticles();
    if (!articles.length) { toast('No articles to feature yet', 'error'); return; }
    const featured = await Store.list('featured');
    Modal.open({
      title: 'Feature articles on Front Page',
      body: `
        <div class="field-hint" style="margin-bottom: 1rem;">Select up to 3 articles. The first appears as the lead, the next two as side features.</div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${articles.map(a => {
            const fIdx = featured.findIndex(f => f.articleId === a.id);
            return `
              <label style="display: flex; gap: 0.7rem; padding: 0.6rem; border: 1px solid var(--rule); border-radius: 2px; cursor: pointer; background: ${fIdx >= 0 ? 'var(--paper-deep)' : 'var(--paper-lift)'};">
                <input type="checkbox" data-article-id="${a.id}" ${fIdx >= 0 ? 'checked' : ''} style="width: auto;" />
                <div style="flex: 1;">
                  <div style="font-family: var(--headline); font-weight: 700; color: var(--ink);">${escapeHtml(a.title)}</div>
                  <div style="font-size: 0.78rem; color: var(--ink-muted); margin-top: 0.2rem;">By ${escapeHtml(a.author)} · ${escapeHtml(articleKicker(a))}</div>
                </div>
              </label>
            `;
          }).join('')}
        </div>
      `,
      foot: `
        <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn-navy" onclick="Editor.saveFeatured()">Save</button>
      `
    });
  },

  async saveFeatured() {
    const checked = $$('#modal-body input[data-article-id]:checked').map(c => c.dataset.articleId);
    if (checked.length > 3) {
      toast('Pick up to 3 articles', 'error');
      return;
    }
    const existing = await Store.list('featured');
    for (const f of existing) await Store.remove('featured', f.id);
    let order = 0;
    for (const articleId of checked) {
      await Store.save('featured', { articleId, order: order++ });
    }
    Modal.close();
    Pages.home.render();
    toast('Front page updated', 'success');
  }
};

/* =====================================================================
   ARTICLE LIST HELPERS (apply tier filtering)
   ===================================================================== */

/* Every article belongs to one of two permanent sections. Categories
   (newsTabs) are optional and sit inside a section; a category with no
   section shows under both. */
const NEWS_SECTIONS = [
  { id: 'internal', label: 'Internal News', hint: 'What happens inside FIWA' },
  { id: 'external', label: 'External News', hint: 'Everything outside FIWA' }
];
const sectionLabel = (id) => NEWS_SECTIONS.find(x => x.id === id)?.label || '';

/* Kicker line on cards and article pages: "Internal News · Sports · Football". */
function articleKicker(a, { fiwaLabel = 'FIWA' } = {}) {
  const parts = [sectionLabel(a.section), a.tabLabel].filter(Boolean);
  if (a.visibility === 'fiwa') parts.push(fiwaLabel);
  return parts.join(' · ') || 'News';
}

async function listVisibleArticles(filter = null) {
  const all = await Store.list('articles');
  const isFiwa = Auth.isFiwa();
  const visible = all.filter(a => isFiwa || a.visibility !== 'fiwa');
  const tabs = await Store.list('newsTabs');
  visible.forEach(a => {
    a.tabLabel = tabs.find(t => t.id === a.tab)?.label || '';
  });
  return filter ? visible.filter(filter) : visible;
}

/* =====================================================================
   IMAGE COMPRESSION + PDF IMPORT HELPERS
   ===================================================================== */

/* Normalize a stored aspect value to a positive number.
 *
 * Older articles stored coverAspect as the strings '16:9' or '4:3'. New
 * articles, editions, and tribunees store it as a raw number (e.g. 1.7777).
 * Anywhere we read the saved aspect, we route through this so old data
 * keeps working.
 */
function parseAspect(val, defaultRatio) {
  if (typeof val === 'number' && isFinite(val) && val > 0) return val;
  if (typeof val === 'string') {
    if (val.includes(':')) {
      const [w, h] = val.split(':').map(parseFloat);
      if (w > 0 && h > 0) return w / h;
    }
    const n = parseFloat(val);
    if (isFinite(n) && n > 0) return n;
  }
  return defaultRatio;
}

/* Pick the appropriate compressor based on a fit-mode string.
 * 'letterbox' preserves all source pixels and fills slack with bg.
 * 'crop' (default) center-crops the source to the target aspect.
 */
async function compressImageWithFit(file, fit, aspectRatio, maxWidth, quality, bg) {
  if (fit === 'letterbox') {
    return compressImageFit(file, aspectRatio, maxWidth, quality, bg || '#f5ecdb');
  }
  return compressImageCropped(file, aspectRatio, maxWidth, quality);
}

/* Wire up an aspect + fit picker that was rendered by renderAspectFitPicker.
 *
 * Caller passes:
 *   pickerEl    — the .afp-picker container element
 *   previewEl   — the .cover-preview element (gets aspect-ratio set inline)
 *   state       — an object on the caller's side; this fn reads/writes
 *                 state[aspectKey] (number) and state[fitKey] ('crop'|'letterbox')
 *   aspectKey   — name of the aspect field on state (e.g. 'coverAspect')
 *   fitKey      — name of the fit field on state (e.g. 'coverFit')
 *   onChange?   — optional callback fired after each change, useful for
 *                 re-displaying the preview at the new aspect.
 *
 * Initial values come from whatever is already on `state` — caller is
 * responsible for seeding sensible defaults before calling.
 */
function wireAspectFitPicker(pickerEl, previewEl, state, aspectKey, fitKey, onChange) {
  const presetBtns = Array.from(pickerEl.querySelectorAll('.afp-pills button[data-w]'));
  const customBtn = pickerEl.querySelector('.afp-pills button[data-custom="1"]');
  const customRow = pickerEl.querySelector('.afp-custom-row');
  const wInput = pickerEl.querySelector('.afp-w');
  const hInput = pickerEl.querySelector('.afp-h');
  const fitBtns = Array.from(pickerEl.querySelectorAll('.afp-fit button'));

  function applyAspect(w, h, isCustom) {
    if (!(w > 0 && h > 0)) return;
    presetBtns.forEach(b => b.classList.remove('active'));
    if (customBtn) customBtn.classList.remove('active');
    if (isCustom) {
      if (customBtn) customBtn.classList.add('active');
      if (customRow) customRow.style.display = '';
    } else {
      const match = presetBtns.find(b => parseFloat(b.dataset.w) === w && parseFloat(b.dataset.h) === h);
      if (match) match.classList.add('active');
      if (customRow) customRow.style.display = 'none';
    }
    state[aspectKey] = w / h;
    if (previewEl) previewEl.style.aspectRatio = `${w} / ${h}`;
    if (onChange) onChange();
  }
  function applyFit(mode) {
    fitBtns.forEach(b => b.classList.toggle('active', b.dataset.fit === mode));
    state[fitKey] = mode;
  }

  presetBtns.forEach(b => {
    b.onclick = () => {
      const w = parseFloat(b.dataset.w);
      const h = parseFloat(b.dataset.h);
      applyAspect(w, h, false);
    };
  });
  if (customBtn) {
    customBtn.onclick = () => {
      const w = parseFloat(wInput && wInput.value) || 1;
      const h = parseFloat(hInput && hInput.value) || 1;
      applyAspect(w, h, true);
    };
  }
  if (wInput && hInput) {
    const onCustomInput = () => {
      const w = parseFloat(wInput.value) || 0;
      const h = parseFloat(hInput.value) || 0;
      if (w > 0 && h > 0) applyAspect(w, h, true);
    };
    wInput.oninput = onCustomInput;
    hInput.oninput = onCustomInput;
  }
  fitBtns.forEach(b => {
    b.onclick = () => applyFit(b.dataset.fit);
  });

  // Seed UI from state. If state's aspect matches a preset, light it up;
  // otherwise default to custom and show the W:H inputs.
  const initial = state[aspectKey];
  let matched = false;
  if (typeof initial === 'number' && isFinite(initial) && initial > 0) {
    for (const b of presetBtns) {
      const w = parseFloat(b.dataset.w);
      const h = parseFloat(b.dataset.h);
      if (Math.abs(w / h - initial) < 0.005) {
        applyAspect(w, h, false);
        matched = true;
        break;
      }
    }
    if (!matched && wInput && hInput) {
      // Render as ratio:1 so the user can read it as e.g. 1.5 : 1.
      const w = parseFloat(initial.toFixed(4));
      wInput.value = w;
      hInput.value = 1;
      applyAspect(w, 1, true);
    }
  }
  applyFit(state[fitKey] === 'letterbox' ? 'letterbox' : 'crop');
}

async function compressImage(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        const w = Math.min(maxWidth, img.width);
        const h = Math.round(w / ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

async function compressImageCropped(file, aspectRatio, maxWidth = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const srcW = img.width, srcH = img.height;
        const srcRatio = srcW / srcH;
        let sx = 0, sy = 0, sw = srcW, sh = srcH;
        if (srcRatio > aspectRatio) {
          sw = srcH * aspectRatio;
          sx = (srcW - sw) / 2;
        } else {
          sh = srcW / aspectRatio;
          sy = (srcH - sh) / 2;
        }
        const outW = Math.min(maxWidth, sw);
        const outH = Math.round(outW / aspectRatio);
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

/* compressImageFit — letterbox/pillarbox version of the above.
 *
 * Unlike compressImageCropped, this NEVER discards source pixels. The full
 * source image is scaled (without upscaling beyond its native resolution) to
 * fit inside an output canvas locked to `aspectRatio`, and the slack on the
 * pair of sides that doesn't match is filled with `bg`.
 *
 * Defaults to cream (--paper, #f5ecdb) so bars vanish into the page on
 * article and edition covers. Pass a different bg for cards on dark
 * backgrounds (e.g. '#0f2138' navy for tribunees).
 *
 * Args:
 *   file        - File from <input type="file">
 *   aspectRatio - target output W/H (e.g. 16/9, 4/3, 1/1.4, 4/5)
 *   maxWidth    - cap on output width (1600 articles, 1200 editions, 800 tribunees)
 *   quality     - JPEG quality 0..1
 *   bg          - hex color for the letterbox/pillarbox bars; default cream
 */
async function compressImageFit(file, aspectRatio, maxWidth = 1600, quality = 0.85, bg = '#f5ecdb') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const srcW = img.width, srcH = img.height;
        const srcRatio = srcW / srcH;

        // Natural fit width — biggest output that doesn't upscale the source.
        // If the source is wider than target ratio, source W is the bound;
        // if taller, the source's height-projected-to-target-ratio is.
        const natural = srcRatio > aspectRatio
          ? srcW
          : Math.round(srcH * aspectRatio);
        const outW = Math.min(maxWidth, natural);
        const outH = Math.round(outW / aspectRatio);

        // Scale source to fit inside (outW × outH), preserving aspect.
        let drawW, drawH;
        if (srcRatio > aspectRatio) {
          // Source wider — fit to outW, center vertically; bars top & bottom.
          drawW = outW;
          drawH = Math.round(outW / srcRatio);
        } else {
          // Source taller (or matching) — fit to outH, center horizontally; bars left & right.
          drawH = outH;
          drawW = Math.round(outH * srcRatio);
        }
        const dx = Math.round((outW - drawW) / 2);
        const dy = Math.round((outH - drawH) / 2);

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, 0, 0, srcW, srcH, dx, dy, drawW, drawH);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

async function importFromPDF(file) {
  if (!window.pdfjsLib) {
    toast('PDF library not loaded — refresh and try again', 'error');
    return null;
  }
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts = [];
  const allImages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);

    // ── Text extraction ──
    try {
      const textContent = await page.getTextContent();
      let pageText = '';
      let lastY = null;
      for (const item of textContent.items) {
        const y = item.transform ? item.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
          pageText += '\n';
        }
        pageText += item.str;
        if (item.hasEOL) pageText += '\n';
        else pageText += ' ';
        lastY = y;
      }
      pageText = pageText.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      if (pageText) pageTexts.push(pageText);
    } catch (e) {
      console.warn('Text extraction failed for page', i, e);
    }

    // ── Image extraction (best-effort; some PDFs don't expose images) ──
    try {
      const opList = await page.getOperatorList();
      const seen = new Set();
      for (let j = 0; j < opList.fnArray.length; j++) {
        if (opList.fnArray[j] === pdfjsLib.OPS.paintImageXObject ||
            opList.fnArray[j] === pdfjsLib.OPS.paintInlineImageXObject) {
          const args = opList.argsArray[j];
          const imgName = args && args[0];
          if (!imgName || seen.has(imgName)) continue;
          seen.add(imgName);
          try {
            const imgObj = await new Promise((res) => {
              try { page.objs.get(imgName, (img) => res(img)); }
              catch { res(null); }
            });
            if (!imgObj || !imgObj.data || !imgObj.width || !imgObj.height) continue;
            if (imgObj.width < 30 || imgObj.height < 30) continue;
            const canvas = document.createElement('canvas');
            canvas.width = imgObj.width;
            canvas.height = imgObj.height;
            const ctx = canvas.getContext('2d');
            const imgData = ctx.createImageData(imgObj.width, imgObj.height);
            const src = imgObj.data;
            // Detect format by data length / pixel ratio
            const expectedRGBA = imgObj.width * imgObj.height * 4;
            const expectedRGB  = imgObj.width * imgObj.height * 3;
            const expectedGray = imgObj.width * imgObj.height;
            if (src.length === expectedRGBA) {
              imgData.data.set(src);
            } else if (src.length === expectedRGB) {
              for (let k = 0, p = 0; k < src.length; k += 3, p += 4) {
                imgData.data[p]   = src[k];
                imgData.data[p+1] = src[k+1];
                imgData.data[p+2] = src[k+2];
                imgData.data[p+3] = 255;
              }
            } else if (src.length === expectedGray) {
              for (let k = 0, p = 0; k < src.length; k++, p += 4) {
                const v = src[k];
                imgData.data[p] = v; imgData.data[p+1] = v; imgData.data[p+2] = v;
                imgData.data[p+3] = 255;
              }
            } else {
              // Unknown format — skip
              continue;
            }
            ctx.putImageData(imgData, 0, 0);
            allImages.push(canvas.toDataURL('image/jpeg', 0.82));
          } catch (e) {
            // Single image fail — keep going
          }
        }
      }
    } catch (e) {
      // Whole page failed — keep going
    }
  }

  return {
    text: pageTexts.join('\n\n'),
    images: allImages
  };
}

/* Render article body — handle both HTML (rich) and legacy plain text */
function renderArticleBody(body) {
  if (!body) return '';
  // If contains tags, render as-is (trusted: only tribunees can write)
  if (/<\w+/.test(body)) return body;
  // Otherwise treat as plain text with paragraph breaks
  return body.split(/\n\n+/).map(p =>
    `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`
  ).join('');
}

/* =====================================================================
   RICH TEXT EDITOR
   ===================================================================== */

const RichEditor = {
  // Text sizes are numbered like a word processor; 12 is normal article text.
  // A size is stored as a multiple of the editor's base size (--rte-base),
  // so it scales with the page and never compounds when sizes are nested.
  SIZES: [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72],
  COLOURS: [
    { name: 'Tribune colours', list: [
      ['Ink', '#1a1814'], ['Navy', '#1c3658'], ['Deep navy', '#0f2138'], ['Soft navy', '#2d4f7a'],
      ['Gold', '#c08e3a'], ['Bright gold', '#d8a956'], ['Muted', '#877f6e'], ['Paper', '#ebdfc4'],
    ]},
    { name: 'Standard', list: [
      ['Black', '#000000'], ['Dark grey', '#555555'], ['Grey', '#999999'], ['Red', '#c0392b'],
      ['Orange', '#d9822b'], ['Yellow', '#e2b714'], ['Green', '#3e7a4a'], ['Blue', '#2f6fb5'],
      ['Purple', '#7a4fa0'], ['Pink', '#c2477f'],
    ]},
  ],

  // Mount editor into target element. Returns { editor, getHTML, destroy }
  mount(target, opts = {}) {
    const { initial = '', placeholder = 'Start writing…', allowImages = true } = opts;

    target.innerHTML = `
      <div class="rte-shell">
        <div class="rte-toolbar"></div>
        <div class="rte-editor" contenteditable="true" spellcheck="true" autocapitalize="sentences" autocorrect="on" data-placeholder="${escapeHtml(placeholder)}"></div>
      </div>
    `;
    const editor  = target.querySelector('.rte-editor');
    const toolbar = target.querySelector('.rte-toolbar');

    toolbar.innerHTML = this._toolbarHTML(allowImages);

    if (initial && initial.trim()) {
      // Inject as HTML if it has tags, else as plain-text-with-paragraph-breaks
      if (/<\w+/.test(initial)) {
        editor.innerHTML = initial;
      } else {
        editor.innerHTML = initial.split(/\n\n+/)
          .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
      }
    } else {
      editor.innerHTML = '<p><br></p>';
    }

    // Track the selection inside the editor so toolbar controls that take
    // focus (dropdowns, the size box, colour and link menus) still act on the
    // text the writer selected.
    let _savedRange = null;
    const _saveSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      if (editor.contains(r.commonAncestorContainer)) {
        _savedRange = r.cloneRange();
      }
    };
    const _restoreSelection = () => {
      if (!_savedRange) return false;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(_savedRange);
      return true;
    };
    editor.addEventListener('focus', _saveSelection);
    editor.addEventListener('blur',  _saveSelection);
    // Pin the selection when the writer reaches for a control that takes
    // focus, and put it back before applying.
    let _pinned = null;
    const _pin = () => { _saveSelection(); if (_savedRange) _pinned = _savedRange.cloneRange(); };
    const _unpin = () => {
      editor.focus();
      if (_pinned) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(_pinned);
        _pinned = null;
      } else {
        _restoreSelection();
      }
    };
    const $t = (sel) => toolbar.querySelector(sel);

    /* ── Undo / redo ──────────────────────────────────────────────────
       Toolbar actions rewrite the page directly, which the browser's own
       undo can't follow (that's what made Ctrl+Z jump about). So the editor
       keeps its own history of snapshots: typing is grouped into one step
       per pause, every toolbar action is one step. */
    const hist = { stack: [], at: -1, timer: null, mute: false };
    const cleanHTML = () => {
      const clone = editor.cloneNode(true);
      clone.querySelectorAll('img.rte-image.selected').forEach(i => i.classList.remove('selected'));
      clone.querySelectorAll('.rte-resize-handle').forEach(h => h.remove());
      return clone.innerHTML;
    };
    const offsetOf = (node, off) => {
      const r = document.createRange();
      r.selectNodeContents(editor);
      r.setEnd(node, off);
      return r.toString().length;
    };
    const pointAt = (n) => {
      const w = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      let t, last = null;
      while ((t = w.nextNode())) {
        if (n <= t.data.length) return [t, n];
        n -= t.data.length;
        last = t;
      }
      return last ? [last, last.data.length] : [editor, editor.childNodes.length];
    };
    const snap = () => {
      const sel = window.getSelection();
      let at = null;
      if (sel.rangeCount && editor.contains(sel.anchorNode)) {
        const r = sel.getRangeAt(0);
        at = [offsetOf(r.startContainer, r.startOffset), offsetOf(r.endContainer, r.endOffset)];
      }
      return { html: cleanHTML(), at };
    };
    const record = () => {
      clearTimeout(hist.timer);
      hist.timer = null;
      const s = snap();
      const cur = hist.stack[hist.at];
      if (cur && cur.html === s.html) { if (s.at) cur.at = s.at; return; }
      hist.stack.splice(hist.at + 1);
      hist.stack.push(s);
      if (hist.stack.length > 200) hist.stack.shift();
      hist.at = hist.stack.length - 1;
      updateState();
    };
    const restore = (i) => {
      hist.at = i;
      const s = hist.stack[i];
      this._removeHandles();
      editor.innerHTML = s.html;
      editor.focus();
      if (s.at) {
        const r = document.createRange();
        r.setStart(...pointAt(s.at[0]));
        r.setEnd(...pointAt(s.at[1]));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      updateState();
    };
    // Commands that change the page in several steps (a style is
    // formatBlock and then a span) are saved as one undo step.
    const asOneStep = (fn) => { hist.mute = true; try { fn(); } finally { hist.mute = false; } record(); };
    const undo = () => { if (hist.timer) record(); if (hist.at > 0) restore(hist.at - 1); };
    const redo = () => { if (hist.at < hist.stack.length - 1) restore(hist.at + 1); };
    editor.addEventListener('input', (e) => {
      if (hist.mute) return;
      const typing = e.inputType && /^(insertText|insertCompositionText|deleteContent)/.test(e.inputType);
      if (typing) { clearTimeout(hist.timer); hist.timer = setTimeout(record, 700); }
      else record();
    });
    editor.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    });
    editor.addEventListener('beforeinput', (e) => {
      if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); }
      if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); }
    });
    // A toolbar action is its own step: close off any typing first.
    toolbar.addEventListener('mousedown', () => { if (hist.timer) record(); }, true);

    /* ── Show what's under the caret (like Docs) ─────────────────────── */
    const styleSel = $t('select[data-cmd="formatBlock"]');
    const fontSel = $t('select[data-cmd="fontName"]');
    const sizeInput = $t('.rte-size-input');
    const updateState = () => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) return;
      const el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
      toolbar.querySelectorAll('button[data-cmd]').forEach(b => {
        let on = false;
        try { on = document.queryCommandState(b.dataset.cmd); } catch (e) {}
        b.classList.toggle('on', !!on);
      });
      const block = el.closest('h2, h3, blockquote, p, li, div.rte-editor');
      const tag = block && block !== editor ? block.tagName.toLowerCase() : 'p';
      styleSel.value = tag === 'p' && block.classList.contains('drop-cap') ? 'dropcap'
        : ['h2', 'h3', 'blockquote'].includes(tag) ? tag : 'p';
      const fam = getComputedStyle(el).fontFamily;
      const match = [...fontSel.options].find(o => fam.includes(o.value));
      if (match) fontSel.value = match.value;
      if (document.activeElement !== sizeInput) {
        const base = parseFloat(getComputedStyle(editor).fontSize);
        const px = parseFloat(getComputedStyle(el).fontSize);
        if (base && px) sizeInput.value = Math.round(px / base * 12);
      }
    };
    const _onSelChange = () => {
      _saveSelection();
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) updateState();
    };
    document.addEventListener('selectionchange', _onSelChange);

    /* ── Buttons ─────────────────────────────────────────────────────── */
    toolbar.querySelectorAll('button[data-cmd], button[data-act]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const act = btn.dataset.act;
        if (act === 'undo') return undo();
        if (act === 'redo') return redo();
        editor.focus();
        _restoreSelection();
        if (act === 'image') { if (allowImages) this._insertImage(editor); return; }
        if (act === 'indent' || act === 'outdent') return this._indent(editor, act === 'indent' ? 1 : -1);
        if (act === 'clear') {
          document.execCommand('removeFormat', false, null);
          this._clearInline(editor);
          return;
        }
        document.execCommand(btn.dataset.cmd, false, null);
        updateState();
      });
    });

    /* ── Style and font dropdowns ────────────────────────────────────── */
    [styleSel, fontSel].forEach(sel => {
      sel.addEventListener('mousedown', _pin);
      sel.addEventListener('change', () => {
        _unpin();
        if (sel === styleSel) {
          asOneStep(() => this._applyBlockStyle(editor, sel.value));
        } else {
          const fallback = sel.value === 'Work Sans' ? 'sans-serif' : 'serif';
          this._applyInlineStyle(editor, 'font-family', `'${sel.value}', ${fallback}`);
        }
        _saveSelection();
        updateState();
      });
    });

    /* ── Text size: number box with − / +. 12 = normal text. ─────────── */
    const applySize = (n) => {
      n = Math.max(6, Math.min(96, Math.round(+n || 12)));
      sizeInput.value = n;
      _unpin();
      this._applyInlineStyle(editor, 'font-size', n === 12 ? 'var(--rte-base)' : `calc(var(--rte-base) * ${n} / 12)`);
      _saveSelection();
    };
    sizeInput.addEventListener('focus', _pin);
    sizeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applySize(sizeInput.value); } });
    sizeInput.addEventListener('change', () => { if (_pinned) applySize(sizeInput.value); });
    toolbar.querySelectorAll('[data-size-step]').forEach(b => {
      b.addEventListener('mousedown', (e) => { e.preventDefault(); _pin(); });
      b.addEventListener('click', () => {
        const cur = +sizeInput.value || 12;
        const up = +b.dataset.sizeStep > 0;
        const next = up ? this.SIZES.find(x => x > cur) : [...this.SIZES].reverse().find(x => x < cur);
        applySize(next || cur);
      });
    });

    /* ── Pop-up menus: text colour, highlight, link ──────────────────── */
    const closeMenus = (except) => toolbar.querySelectorAll('.rte-pop').forEach(p => { if (p !== except && !p.contains(except)) p.hidden = true; });
    const customKey = 'fitrah:customColours';
    const readCustom = () => { try { return JSON.parse(localStorage.getItem(customKey) || '[]'); } catch (e) { return []; } };
    const swatch = (name, hex) =>
      `<button type="button" class="rte-swatch" data-colour="${hex}" title="${escapeHtml(name)}" style="background:${hex}"></button>`;
    const colourTool = (wrap, prop, first, autoValue, autoLabel) => {
      const menu = wrap.querySelector('.rte-pop');
      const bar = wrap.querySelector('.rte-colour-bar');
      let last = first;
      bar.style.background = last;
      const apply = (c) => {
        _unpin();
        this._applyInlineStyle(editor, prop, c || autoValue);
        _saveSelection();
        if (c) { last = c; bar.style.background = c; }
        menu.hidden = true;
      };
      const draw = () => {
        menu.innerHTML = `
          <button type="button" class="rte-colour-auto" data-colour="">${autoLabel}</button>
          ${this.COLOURS.map(g => `
            <div class="rte-colour-label">${g.name}</div>
            <div class="rte-swatches">${g.list.map(([n, h]) => swatch(n, h)).join('')}</div>`).join('')}
          <div class="rte-colour-label">Custom</div>
          <div class="rte-swatches">
            ${readCustom().map(h => swatch(h, h)).join('')}
            <label class="rte-swatch rte-swatch-add" title="Add a custom colour">+<input type="color" value="${last}" /></label>
          </div>`;
        menu.querySelectorAll('[data-colour]').forEach(b => {
          b.addEventListener('mousedown', (e) => e.preventDefault());
          b.addEventListener('click', () => apply(b.dataset.colour));
        });
        const picker = menu.querySelector('input[type=color]');
        picker.addEventListener('change', () => {
          const h = picker.value;
          const list = [h, ...readCustom().filter(x => x !== h)].slice(0, 16);
          try { localStorage.setItem(customKey, JSON.stringify(list)); } catch (e) {}
          apply(h);
        });
      };
      const main = wrap.querySelector('.rte-colour-apply');
      const open = wrap.querySelector('.rte-colour-open');
      main.addEventListener('mousedown', (e) => { e.preventDefault(); _pin(); });
      main.addEventListener('click', () => apply(last));
      open.addEventListener('mousedown', (e) => { e.preventDefault(); _pin(); });
      open.addEventListener('click', () => {
        if (menu.hidden) draw();
        closeMenus(menu);
        menu.hidden = !menu.hidden;
      });
    };
    colourTool($t('.rte-colour[data-prop="color"]'), 'color', '#c08e3a', 'inherit', 'Automatic');
    colourTool($t('.rte-colour[data-prop="background-color"]'), 'background-color', '#f3e3b5', 'transparent', 'None');

    // Link: a small box to paste the address into.
    const linkWrap = $t('.rte-link');
    const linkMenu = linkWrap.querySelector('.rte-pop');
    const linkInput = linkMenu.querySelector('input');
    linkWrap.querySelector('.rte-link-open').addEventListener('mousedown', (e) => { e.preventDefault(); _pin(); });
    linkWrap.querySelector('.rte-link-open').addEventListener('click', () => {
      closeMenus(linkMenu);
      linkMenu.hidden = !linkMenu.hidden;
      if (!linkMenu.hidden) {
        const a = _pinned && (_pinned.startContainer.nodeType === 1 ? _pinned.startContainer : _pinned.startContainer.parentElement).closest('a');
        linkInput.value = a ? a.getAttribute('href') : '';
        linkInput.focus();
      }
    });
    const applyLink = () => {
      let url = linkInput.value.trim();
      if (url && !/^(https?:|mailto:)/i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
      linkMenu.hidden = true;
      _unpin();
      if (!url) { document.execCommand('unlink', false, null); return; }
      if (window.getSelection().isCollapsed) {
        document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
      } else {
        document.execCommand('createLink', false, url);
      }
      editor.querySelectorAll('a[href]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    };
    linkInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
      if (e.key === 'Escape') { linkMenu.hidden = true; _unpin(); }
    });
    linkMenu.querySelector('[data-link="apply"]').addEventListener('click', applyLink);
    linkMenu.querySelector('[data-link="remove"]').addEventListener('click', () => { linkInput.value = ''; applyLink(); });

    record();

    // Image select on click
    editor.addEventListener('click', (e) => {
      editor.querySelectorAll('img.rte-image.selected').forEach(i => i.classList.remove('selected'));
      this._removeHandles();
      if (e.target.tagName === 'IMG' && e.target.classList.contains('rte-image')) {
        e.target.classList.add('selected');
        this._attachResizeHandle(e.target, editor);
      }
    });
    // Click outside editor deselects images. We track this listener so it can
    // be removed when the editor unmounts — otherwise opening the article/bio
    // editor repeatedly leaks one listener per open.
    // Like Docs: whatever doesn't fit on one line goes into a ⋮ menu at
    // the end, a group at a time, and comes back when there's room.
    const more = toolbar.querySelector('.rte-more');
    const morePop = more.querySelector('.rte-pop');
    more.querySelector('.rte-more-open').addEventListener('click', () => {
      closeMenus(morePop);
      morePop.hidden = !morePop.hidden;
    });
    const fitToolbar = () => {
      while (morePop.firstChild) toolbar.insertBefore(morePop.firstChild, more);
      more.hidden = true;
      if (toolbar.scrollWidth <= toolbar.clientWidth + 1) return;
      more.hidden = false;
      while (toolbar.scrollWidth > toolbar.clientWidth + 1) {
        const group = [];
        let el = more.previousElementSibling;
        while (el && !el.classList.contains('rte-sep')) { group.unshift(el); el = el.previousElementSibling; }
        if (!el || !el.previousElementSibling) break;
        group.unshift(el);
        group.reverse().forEach(g => morePop.prepend(g));
      }
    };
    const _fitObserver = new ResizeObserver(fitToolbar);
    _fitObserver.observe(toolbar);

    const _onDocClick = (e) => {
      toolbar.querySelectorAll('.rte-pop').forEach(p => { if (!p.parentElement.contains(e.target)) p.hidden = true; });
      if (!target.contains(e.target)) {
        editor.querySelectorAll('img.rte-image.selected').forEach(i => i.classList.remove('selected'));
        this._removeHandles();
      }
    };
    document.addEventListener('click', _onDocClick);

    // Ensure images get the rte-image class even after paste
    editor.addEventListener('input', () => {
      editor.querySelectorAll('img:not(.rte-image)').forEach(img => img.classList.add('rte-image'));
    });

    return {
      editor,
      getHTML: () => {
        // Strip selection styling
        const clone = editor.cloneNode(true);
        clone.querySelectorAll('img.rte-image.selected').forEach(i => i.classList.remove('selected'));
        clone.querySelectorAll('.rte-resize-handle').forEach(h => h.remove());
        return clone.innerHTML;
      },
      destroy: () => {
        document.removeEventListener('click', _onDocClick);
        document.removeEventListener('selectionchange', _onSelChange);
        _fitObserver.disconnect();
        this._removeHandles();
      }
    };
  },

  // Toolbar icons (Material icon shapes, drawn inline like Icons above).
  ICONS: {
    undo: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
    redo: 'M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z',
    bold: 'M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z',
    italic: 'M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z',
    underline: 'M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z',
    strike: 'M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z',
    textcolor: 'M5.49 17h2.42l1.27-3.58h5.65L16.09 17h2.42L13.25 3h-2.5L5.49 17zm4.42-5.61l2.03-5.79h.12l2.03 5.79H9.91z',
    highlight: 'M13.06 3.19l3.75 3.75L7.75 16H4v-3.75l9.06-9.06zm4.82 2.68-3.75-3.75 1.83-1.83c.39-.39 1.02-.39 1.41 0l2.34 2.34c.39.39.39 1.02 0 1.41l-1.83 1.83z',
    link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
    image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    left: 'M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z',
    center: 'M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z',
    right: 'M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z',
    justify: 'M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z',
    bullets: 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z',
    numbers: 'M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z',
    outdent: 'M11 17h10v-2H11v2zm-8-5l4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z',
    indent: 'M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z',
    more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    clear: 'M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.55 5.27 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z',
    caret: 'M7 10l5 5 5-5z',
  },

  _toolbarHTML(allowImages) {
    const ic = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${RichEditor.ICONS[name]}"/></svg>`;
    const btn = (attr, name, title) => `<button type="button" class="rte-btn" ${attr} title="${title}">${ic(name)}</button>`;
    const sep = '<span class="rte-sep"></span>';
    return `
      ${btn('data-act="undo"', 'undo', 'Undo (Ctrl+Z)')}
      ${btn('data-act="redo"', 'redo', 'Redo (Ctrl+Y)')}
      ${sep}
      <select class="rte-select rte-style" data-cmd="formatBlock" title="Styles">
        <option value="p">Normal text</option>
        <option value="h2">Heading</option>
        <option value="h3">Subheading</option>
        <option value="blockquote">Quote</option>
        <option value="dropcap">Drop cap</option>
      </select>
      ${sep}
      <select class="rte-select rte-font" data-cmd="fontName" title="Font">
        <option value="Times New Roman">Times New Roman</option>
        <option value="Libre Baskerville">Libre Baskerville</option>
        <option value="Work Sans">Work Sans</option>
      </select>
      ${sep}
      <span class="rte-size" title="Font size (12 = normal text)">
        <button type="button" class="rte-btn rte-step" data-size-step="-1" title="Decrease font size">−</button>
        <input class="rte-size-input" type="number" min="6" max="96" step="1" value="12" list="rte-size-list" aria-label="Font size" />
        <datalist id="rte-size-list">${RichEditor.SIZES.map(n => `<option value="${n}">`).join('')}</datalist>
        <button type="button" class="rte-btn rte-step" data-size-step="1" title="Increase font size">+</button>
      </span>
      ${sep}
      ${btn('data-cmd="bold"', 'bold', 'Bold (Ctrl+B)')}
      ${btn('data-cmd="italic"', 'italic', 'Italic (Ctrl+I)')}
      ${btn('data-cmd="underline"', 'underline', 'Underline (Ctrl+U)')}
      ${btn('data-cmd="strikeThrough"', 'strike', 'Strikethrough')}
      <span class="rte-colour" data-prop="color">
        <button type="button" class="rte-btn rte-colour-apply" title="Text colour">${ic('textcolor')}<span class="rte-colour-bar"></span></button><button type="button" class="rte-btn rte-colour-open" title="More text colours">${ic('caret')}</button>
        <div class="rte-pop" hidden></div>
      </span>
      <span class="rte-colour" data-prop="background-color">
        <button type="button" class="rte-btn rte-colour-apply" title="Highlight colour">${ic('highlight')}<span class="rte-colour-bar"></span></button><button type="button" class="rte-btn rte-colour-open" title="More highlight colours">${ic('caret')}</button>
        <div class="rte-pop" hidden></div>
      </span>
      ${sep}
      <span class="rte-link">
        <button type="button" class="rte-btn rte-link-open" title="Insert link (paste a web address)">${ic('link')}</button>
        <div class="rte-pop rte-link-pop" hidden>
          <input type="text" placeholder="Paste or type a link" />
          <div class="rte-link-actions">
            <button type="button" data-link="remove">Remove</button>
            <button type="button" data-link="apply" class="primary">Apply</button>
          </div>
        </div>
      </span>
      ${allowImages ? btn('data-act="image"', 'image', 'Insert image') : ''}
      ${sep}
      ${btn('data-cmd="justifyLeft"', 'left', 'Left align')}
      ${btn('data-cmd="justifyCenter"', 'center', 'Center align')}
      ${btn('data-cmd="justifyRight"', 'right', 'Right align')}
      ${btn('data-cmd="justifyFull"', 'justify', 'Justify')}
      ${sep}
      ${btn('data-cmd="insertUnorderedList"', 'bullets', 'Bulleted list')}
      ${btn('data-cmd="insertOrderedList"', 'numbers', 'Numbered list')}
      ${btn('data-act="outdent"', 'outdent', 'Decrease indent')}
      ${btn('data-act="indent"', 'indent', 'Increase indent')}
      ${sep}
      ${btn('data-act="clear"', 'clear', 'Clear formatting')}
      <span class="rte-more" hidden>
        <button type="button" class="rte-btn rte-more-open" title="More">${ic('more')}</button>
        <div class="rte-pop rte-more-pop" hidden></div>
      </span>
    `;
  },

  // Indent paragraphs by 2em steps (lists use the browser's own nesting).
  // Not execCommand('indent') on paragraphs: Chrome wraps them in a
  // blockquote, which would look like a Quote.
  _indent(editor, dir) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const el = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    if (el.closest('li')) {
      document.execCommand(dir > 0 ? 'indent' : 'outdent', false, null);
      return;
    }
    [...editor.children].filter(b => range.intersectsNode(b)).forEach(b => {
      const cur = parseFloat(b.style.marginLeft) || 0;
      const next = Math.max(0, Math.min(8, cur + 2 * dir));
      b.style.marginLeft = next ? next + 'em' : '';
      if (!b.getAttribute('style')) b.removeAttribute('style');
    });
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  },

  // Clear formatting also removes the size, font and colour spans this
  // editor adds (the browser's removeFormat leaves some of them).
  _clearInline(editor) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    editor.querySelectorAll('span[style]:not([data-style]), font').forEach(el => {
      if (range.intersectsNode(el)) el.replaceWith(...el.childNodes);
    });
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  },

  _insertImage(editor) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await compressImage(file, 1200, 0.82);
        editor.focus();
        // Use insertHTML so it goes at cursor
        const html = `<img class="rte-image" src="${dataUrl}" alt="" />`;
        document.execCommand('insertHTML', false, html);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (err) {
        toast('Image insert failed: ' + err.message, 'error');
      }
    };
    input.click();
  },

  /* Text styles. Choosing one sets the block's size and spacing (CSS) and
     gives its text a starting format: a span the writer can change like any
     other formatting. Choosing another style swaps that span; Body removes it.
     "Drop cap" is a Body paragraph with a large first letter, only when the
     writer asks for it. */
  STYLE_PRESETS: {
    h2:         { fontFamily: "'Libre Baskerville', serif", fontWeight: 'bold' },
    h3:         { fontFamily: "'Times New Roman', serif", fontWeight: 'bold' },
    blockquote: { fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' },
  },

  _applyBlockStyle(editor, value) {
    document.execCommand('formatBlock', false, value === 'dropcap' ? 'p' : value);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const blocks = [...editor.children].filter(b => range.intersectsNode(b));
    const preset = this.STYLE_PRESETS[value];
    let last = null;
    for (const block of blocks) {
      block.querySelectorAll('span[data-style]').forEach(s => s.replaceWith(...s.childNodes));
      block.classList.remove('drop-cap');
      if (value === 'dropcap') block.classList.add('drop-cap');
      if (!block.classList.length) block.removeAttribute('class');
      if (!preset) continue;
      const span = document.createElement('span');
      span.dataset.style = value;
      Object.assign(span.style, preset);
      const empty = !block.textContent.replace(/\u200B/g, '').trim();
      if (empty) {
        block.textContent = '';
        span.textContent = '\u200B';
      } else {
        span.append(...block.childNodes);
      }
      block.append(span);
      last = span;
    }
    // Keep the caret in the styled text so typing carries the format.
    if (last && blocks.length === 1) {
      const r = document.createRange();
      if (last.textContent === '\u200B') { r.setStart(last.firstChild, 1); r.collapse(true); }
      else r.selectNodeContents(last);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  },

  // Apply an inline CSS style to the current selection by wrapping in a <span>.
  // Works for both ranged selections (wraps the selected text) and collapsed
  // selections (inserts an empty styled span and places caret inside, so the
  // next-typed characters take the style — matching user expectation).
  _applyInlineStyle(editor, prop, value) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Make sure the selection is still inside the editor
    if (!editor.contains(range.commonAncestorContainer)) return;

    if (range.collapsed) {
      // Empty span with a zero-width space so the caret can sit inside it
      const span = document.createElement('span');
      span.style.setProperty(prop, value);
      span.appendChild(document.createTextNode('\u200B'));
      range.insertNode(span);
      // Move caret inside the span, after the ZWSP
      const newRange = document.createRange();
      newRange.setStart(span.firstChild, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      // Style each selected run of text on its own, so a selection that
      // crosses paragraphs never wraps whole paragraphs in a span.
      const { startContainer: sc, startOffset: so, endContainer: ec, endOffset: eo } = range;
      const root = range.commonAncestorContainer;
      const texts = [];
      if (root.nodeType === 3) texts.push(root);
      else {
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let t;
        while ((t = w.nextNode())) if (range.intersectsNode(t)) texts.push(t);
      }
      const wrapped = [];
      texts.forEach(t => {
        const s = t === sc ? so : 0;
        const e = t === ec ? eo : t.data.length;
        if (s >= e) return;
        // Skip the line breaks between paragraphs and list items.
        if (!t.data.slice(s, e).trim() && /^(UL|OL|DIV)$/.test(t.parentElement.tagName)) return;
        let node = t;
        if (e < node.data.length) node.splitText(e);
        if (s > 0) node = node.splitText(s);
        const par = node.parentElement;
        if (par.tagName === 'SPAN' && !par.dataset.style && par.childNodes.length === 1) {
          par.style.setProperty(prop, value);
          wrapped.push(par);
        } else {
          const span = document.createElement('span');
          span.style.setProperty(prop, value);
          node.replaceWith(span);
          span.appendChild(node);
          wrapped.push(span);
        }
      });
      if (!wrapped.length) return;
      // The new style replaces the same style further up the same text.
      wrapped.forEach(span => {
        for (let el = span.parentElement; el && el !== editor; el = el.parentElement) {
          if (el.tagName === 'SPAN' && el.style.getPropertyValue(prop) && el.textContent === span.textContent) {
            el.style.removeProperty(prop);
          }
          if (el.tagName === 'FONT' && prop === 'color' && el.textContent === span.textContent) el.removeAttribute('color');
        }
      });
      // Tidy up: drop empty spans, and unwrap spans with no style left.
      editor.querySelectorAll('span').forEach(el => {
        if (wrapped.includes(el)) return;
        if (!el.textContent && !el.querySelector('img')) el.remove();
        else if ([...el.attributes].every(a => a.name === 'style' && !a.value.trim())) el.replaceWith(...el.childNodes);
      });
      // Reselect the styled text so consecutive style changes stack
      const newRange = document.createRange();
      newRange.setStartBefore(wrapped[0].firstChild);
      newRange.setEndAfter(wrapped[wrapped.length - 1].lastChild);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  },

  /* Image resizing, Canva-style, from the gold corner handle:
     · drag        crop: the frame changes shape, the picture is never
                   stretched (object-fit: cover keeps it filled).
     · Shift+drag  scale: the whole image grows or shrinks, keeping its
                   current shape.
     Size is saved as a % of the column width plus an aspect ratio, so the
     image keeps its look on phones, and two or more small images sit side
     by side in the same row. */
  _attachResizeHandle(img, editor) {
    this._removeHandles();
    const wrap = editor.parentElement;
    if (!wrap) return;
    wrap.style.position = 'relative';

    const handle = document.createElement('div');
    handle.className = 'rte-resize-handle';
    handle.title = 'Drag to crop · Shift + drag to resize';
    const hint = document.createElement('div');
    hint.className = 'rte-resize-hint';
    hint.textContent = 'Drag: crop · Shift + drag: resize';
    wrap.appendChild(handle);
    wrap.appendChild(hint);

    const positionHandle = () => {
      const imgRect = img.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      handle.style.left = (imgRect.right - wrapRect.left - 9) + 'px';
      handle.style.top  = (imgRect.bottom - wrapRect.top - 9) + 'px';
      hint.style.left = (imgRect.left - wrapRect.left) + 'px';
      hint.style.top  = (imgRect.bottom - wrapRect.top + 8) + 'px';
    };
    positionHandle();

    const columnWidth = () => {
      const cs = getComputedStyle(editor);
      return editor.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    };

    let drag = null;
    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const w = img.offsetWidth, h = img.offsetHeight;
      drag = { x: e.clientX, y: e.clientY, w, h, ratio: w / h, col: columnWidth() };
      handle.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!drag) return;
      const maxW = drag.col;
      let w = Math.min(maxW, Math.max(60, drag.w + (e.clientX - drag.x)));
      let h;
      if (e.shiftKey) {
        h = w / drag.ratio;                                   // scale
      } else {
        h = Math.max(40, drag.h + (e.clientY - drag.y));      // crop
      }
      img.style.width = (w / maxW * 100).toFixed(2) + '%';
      img.style.height = '';
      img.style.aspectRatio = `${Math.round(w)} / ${Math.round(h)}`;
      img.style.objectFit = 'cover';
      positionHandle();
    };
    const onUp = () => {
      if (!drag) return;
      drag = null;
      positionHandle();
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    };
    handle.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    editor.addEventListener('scroll', positionHandle);
    window.addEventListener('resize', positionHandle);
    handle._cleanup = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      editor.removeEventListener('scroll', positionHandle);
      window.removeEventListener('resize', positionHandle);
      hint.remove();
    };
  },

  _removeHandles() {
    document.querySelectorAll('.rte-resize-handle').forEach(h => {
      if (h._cleanup) h._cleanup();
      h.remove();
    });
  }
};

/* =====================================================================
   PAGES
   ===================================================================== */

const Pages = {};

/* ── HOME ────────────────────────────────────────────────────────────── */
Pages.home = {
  async render() {
    const isEditing = Editor.active;
    const articles = await listVisibleArticles();
    const featured = (await Store.list('featured')).sort((a, b) => a.order - b.order);
    const featArticles = featured
      .map(f => articles.find(a => a.id === f.articleId))
      .filter(Boolean);

    // Featured area
    const fa = $('#home-featured-area');
    if (featArticles.length === 0) {
      fa.innerHTML = `
        <div class="empty-state">
          ${Icons.empty}
          <h3>The front page is unlit</h3>
          <p>No articles have been featured yet. ${isEditing ? 'Use the "+ Feature Article" button above to surface stories from the news desk.' : 'Tribunees will surface stories here as they\'re published.'}</p>
          <div class="es-hint">Lighthouse · standing by</div>
        </div>
      `;
    } else {
      const main = featArticles[0];
      const sides = featArticles.slice(1, 3);
      const coverStyle = (a) => a.coverImage
        ? `style="background-image: url('${a.coverImage}'); background-size: cover; background-position: center;"`
        : '';
      const single = sides.length === 0 && !isEditing;
      fa.innerHTML = `
        <div class="featured-grid${single ? ' single' : ''}">
          <article class="featured-main" onclick="Pages.news.openArticle('${main.id}')">
            ${main.coverImage ? `<div class="feat-img" ${coverStyle(main)}></div>` : ''}
            <div class="feat-cat">${escapeHtml(articleKicker(main))}</div>
            <h3 class="feat-title">${escapeHtml(main.title)}</h3>
            <p class="feat-deck">${escapeHtml(main.deck || '')}</p>
            <div class="feat-byline">
              <span>By <span class="author">${escapeHtml(main.author)}</span></span>
              <span>${formatDate(main.createdAt)}</span>
            </div>
          </article>
          ${single ? '' : `<div class="featured-side">
            <h3 class="feat-side-head">Also Featured</h3>
            ${sides.length ? sides.map(a => `
              <article class="featured-card" onclick="Pages.news.openArticle('${a.id}')">
                <div class="feat-cat">${escapeHtml(articleKicker(a))}</div>
                <h3 class="feat-title">${escapeHtml(a.title)}</h3>
                <p class="feat-deck">${escapeHtml(a.deck || '')}</p>
                <div class="feat-byline">
                  <span class="author">${escapeHtml(a.author)}</span>
                  <span>${formatDate(a.createdAt)}</span>
                </div>
              </article>
            `).join('') : `<div class="empty-state" style="padding: 2rem 1rem;"><p style="font-size: 0.9rem;">Two more featured slots available.</p></div>`}
          </div>`}
        </div>
      `;
    }

    // More stories
    const others = articles.filter(a => !featArticles.some(f => f.id === a.id))
      .sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
    const sa = $('#home-stories-area');
    if (others.length === 0) {
      sa.innerHTML = `
        <div class="empty-state">
          ${Icons.empty}
          <h3>No additional stories yet</h3>
          <p>The news desk is just getting started. ${isEditing ? 'Use the News tab to add articles.' : 'Check back soon — we publish every fortnight.'}</p>
        </div>
      `;
    } else {
      sa.innerHTML = `<div class="stories-grid">${others.map(a => `
        <article class="story-card" onclick="Pages.news.openArticle('${a.id}')">
          ${a.coverImage ? `<div class="story-img" style="background-image: url('${a.coverImage}');"></div>` : ''}
          <div class="story-cat">${escapeHtml(articleKicker(a))}</div>
          <h3 class="story-title">${escapeHtml(a.title)}</h3>
          <p class="story-deck">${escapeHtml(a.deck || '')}</p>
          <div class="story-meta">By <span class="author">${escapeHtml(a.author)}</span> · ${formatDate(a.createdAt)}</div>
        </article>
      `).join('')}</div>`;
    }

    // Forum preview — latest posts from the feed
    const posts = (await Store.list('threads')).sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
    const fp = $('#home-forum-preview');
    if (posts.length === 0) {
      fp.innerHTML = `<p style="font-family: var(--article); font-style: italic; font-size: 1.05rem; color: var(--ink-soft); padding: 1rem 0;">Nothing posted yet. Announcements and notices from the Tribune will appear here.</p>`;
    } else {
      fp.innerHTML = posts.map(p => {
        const isAnn = p.category === 'announcement';
        return `
          <div onclick="Router.go('forum/${p.id}')" style="display: grid; grid-template-columns: auto 1fr auto; gap: 1rem; padding: 0.7rem 0; border-bottom: 1px dashed var(--rule); cursor: pointer; align-items: center;">
            <div class="thread-avatar" style="width: 36px; height: 36px; font-size: 0.85rem;">${initials(p.author)}</div>
            <div>
              <div style="font-family: var(--ui); font-weight: 500; font-size: 0.95rem; line-height: 1.2;">${escapeHtml(p.title)}</div>
              <div style="font-size: 0.76rem; color: var(--ink-muted); margin-top: 0.2rem;">By <span style="color: var(--navy);">${escapeHtml(p.author)}</span> · ${relativeTime(p.createdAt)}</div>
            </div>
            <span class="post-cat ${isAnn ? 'announcement' : ''}">${isAnn ? 'Announcement' : 'General'}</span>
          </div>
        `;
      }).join('');
    }
  }
};

/* ── NEWS ────────────────────────────────────────────────────────────── */
Pages.news = {
  state: { activeSection: 'all', activeTab: 'all', search: '' },

  async render() {
    const isEditing = Editor.active;
    const sec = this.state.activeSection;
    const allTabs = await Store.list('newsTabs');
    // Under All News, categories with the same name in both sections
    // (e.g. Sports) show as one pill and match both.
    const tabs = allTabs.filter((t, i) => sec === 'all'
      ? allTabs.findIndex(x => x.label === t.label) === i
      : t.section === sec);
    if (this.state.activeTab !== 'all' && !tabs.some(t => t.id === this.state.activeTab)) {
      this.state.activeTab = 'all';
    }

    // Section switch: Internal / External News
    $('#news-sections').innerHTML = [{ id: 'all', label: 'All News' }, ...NEWS_SECTIONS].map(x => `
      <button class="section-tab ${sec === x.id ? 'active' : ''}" onclick="Pages.news.setSection('${x.id}')">${x.label}</button>
    `).join('');

    // Tab pills
    const tabsEl = $('#news-tabs');
    tabsEl.innerHTML = `
      <button class="filter-pill ${this.state.activeTab === 'all' ? 'active' : ''}" onclick="Pages.news.setTab('all')">All</button>
      ${tabs.map(t => `
        <button class="filter-pill ${this.state.activeTab === t.id ? 'active' : ''}" onclick="Pages.news.setTab('${t.id}')">
          ${escapeHtml(t.label)}
          <span class="pill-edit" onclick="event.stopPropagation(); Editor.manageTabs()">✎</span>
        </button>
      `).join('')}
      ${isEditing ? `<button class="filter-pill" style="border-style: dashed; color: var(--gold);" onclick="Editor.manageTabs()">+ Manage categories</button>` : ''}
    `;

    // Articles
    let articles = await listVisibleArticles();
    if (sec !== 'all') articles = articles.filter(a => a.section === sec);
    if (this.state.activeTab !== 'all') {
      const label = allTabs.find(t => t.id === this.state.activeTab)?.label;
      const ids = sec === 'all' ? allTabs.filter(t => t.label === label).map(t => t.id) : [this.state.activeTab];
      articles = articles.filter(a => ids.includes(a.tab));
    }
    // No EN/ID toggle for now (Ammar, Oct 2026): every language shows.
    if (this.state.search) {
      // Search the words people read, not the HTML around them.
      const q = this.state.search.toLowerCase();
      const d = document.createElement('div');
      const bodyText = (html) => { d.innerHTML = html || ''; return d.textContent.toLowerCase(); };
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.deck || '').toLowerCase().includes(q) ||
        (a.author || '').toLowerCase().includes(q) ||
        bodyText(a.body).includes(q)
      );
    }
    // The page's HTML is rebuilt each visit, but the filters are kept,
    // so show the language and search the list is actually using.
    const searchBox = $('.news-search');
    if (searchBox && document.activeElement !== searchBox) searchBox.value = this.state.search;
    articles.sort((a, b) => b.createdAt - a.createdAt);

    // List or grid: each reader's choice, kept in this browser.
    const view = this.view();
    $('#news-view').innerHTML = [['list', 'List'], ['grid', 'Grid']].map(([v, label]) => `
      <button type="button" class="${view === v ? 'active' : ''}" aria-pressed="${view === v}" onclick="Pages.news.setView('${v}')">${Icons['view_' + v]}<span>${label}</span></button>
    `).join('');

    // Browse: every category with how many stories it has.
    const visible = await listVisibleArticles();
    const count = (fn) => visible.filter(fn).length;
    const browseLink = (label, n, active, onclick) => `
      <a class="browse-link ${active ? 'active' : ''}" onclick="${onclick}"><span>${escapeHtml(label)}</span><span class="browse-n">${n}</span></a>`;
    $('#news-browse').innerHTML = `
      <div class="browse-head">Browse</div>
      ${browseLink('Everything', visible.length, sec === 'all' && this.state.activeTab === 'all', "Pages.news.browse('all','all')")}
      ${NEWS_SECTIONS.map(x => `
        <div class="browse-head">${x.label}</div>
        ${browseLink('All ' + x.label, count(a => a.section === x.id), sec === x.id && this.state.activeTab === 'all', `Pages.news.browse('${x.id}','all')`)}
        ${allTabs.filter(t => t.section === x.id).map(t =>
          browseLink(t.label, count(a => a.section === x.id && a.tab === t.id), sec === x.id && this.state.activeTab === t.id, `Pages.news.browse('${x.id}','${t.id}')`)).join('')}
      `).join('')}
      ${isEditing ? `<button class="browse-manage" onclick="Editor.manageTabs()">+ Manage categories</button>` : ''}
      <p class="browse-note">Looking for a printed paper? The <a onclick="Router.go('archive')">Editions</a> page has every PDF.</p>
    `;

    const grid = $('#news-grid');
    if (articles.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          ${Icons.empty}
          <h3>${this.state.search ? `Nothing matches “${escapeHtml(this.state.search)}”`
            : 'No stories here yet'}</h3>
          <p>${this.state.search ? 'Try another word, or clear the search to see every story.'
            : isEditing ? 'Click "+ New Article" up top to write the first one.'
            : 'Tribunees are working on it. Check back soon.'}</p>
        </div>
      `;
    } else if (view === 'list') {
      // Newest first, grouped by the day they were published.
      const plain = document.createElement('div');
      const mins = (a) => { plain.innerHTML = renderArticleBody(a.body); return Math.max(1, Math.round(plain.textContent.split(/\s+/).filter(Boolean).length / 200)); };
      const days = [];
      articles.forEach(a => {
        const d = formatDate(a.createdAt);
        if (!days.length || days[days.length - 1].d !== d) days.push({ d, items: [] });
        days[days.length - 1].items.push(a);
      });
      grid.innerHTML = days.map(({ d, items }) => `
        <div class="news-day"><h2>${escapeHtml(d)}</h2><span>${items.length} ${items.length === 1 ? 'story' : 'stories'}</span></div>
        ${items.map(a => `
          <article class="news-row" onclick="Pages.news.openArticle('${a.id}')">
            <div class="news-row-text">
              <div class="story-cat">${escapeHtml(articleKicker(a))}</div>
              <h3 class="story-title">${escapeHtml(a.title)}</h3>
              ${a.deck ? `<p class="story-deck">${escapeHtml(a.deck)}</p>` : ''}
              <div class="story-meta">By <span class="author">${escapeHtml(a.author)}</span> · ${mins(a)} min read</div>
            </div>
            ${a.coverImage ? `<img class="news-row-img" src="${a.coverImage}" alt="" />` : ''}
          </article>
        `).join('')}
      `).join('');
    } else {
      const newsCoverStyle = (a) => {
        const ar = parseAspect(a.coverAspect, 16/9);
        return `style="background-image: url('${a.coverImage}'); background-size: cover; background-position: center; aspect-ratio: ${ar};"`;
      };
      grid.innerHTML = `<div class="news-grid">${articles.map(a => `
        <article class="story-card" onclick="Pages.news.openArticle('${a.id}')">
          ${a.coverImage ? `<div class="feat-img" ${newsCoverStyle(a)}></div>` : ''}
          <div class="story-cat">${escapeHtml(articleKicker(a))}</div>
          <h3 class="story-title">${escapeHtml(a.title)}</h3>
          <p class="story-deck">${escapeHtml(a.deck || '')}</p>
          <div class="story-meta">By <span class="author">${escapeHtml(a.author)}</span> · ${formatDate(a.createdAt)}</div>
        </article>
      `).join('')}</div>`;
    }
  },

  setSection(id) { this.state.activeSection = id; this.render(); },
  browse(sec, tab) { this.state.activeSection = sec; this.state.activeTab = tab; this.render(); },
  view() {
    let v = null;
    try { v = localStorage.getItem('fitrah:newsView'); } catch (e) {}
    return v === 'grid' ? 'grid' : 'list';
  },
  setView(v) {
    try { localStorage.setItem('fitrah:newsView', v); } catch (e) {}
    this.render();
  },
  setTab(id) { this.state.activeTab = id; this.render(); },
  search(q) {
    this.state.search = q.trim();
    this.render();
    const input = $('.news-search');
    if (input && document.activeElement !== input) input.value = q;
  },

  openArticle(id) {
    Router.go('article/' + id);
  }
};

/* ── ARTICLE FULL PAGE ──────────────────────────────────────────────── */
Pages.article = {
  async render(params) {
    const id = params && params.id;
    const root = $('#article-content');
    if (!id) {
      root.innerHTML = `<div class="empty-state">${Icons.empty}<h3>No article specified</h3></div>`;
      return;
    }
    const a = await Store.get('articles', id);
    if (!a) {
      root.innerHTML = `<div class="empty-state">${Icons.empty}<h3>Article not found</h3><p>It may have been removed or never existed.</p></div>`;
      return;
    }
    if (a.visibility === 'fiwa' && !Auth.isFiwa()) {
      root.innerHTML = `<div class="empty-state">${Icons.empty}<h3>Article not found</h3></div>`;
      return;
    }

    const tabs = await Store.list('newsTabs');
    const tabLabel = tabs.find(t => t.id === a.tab)?.label || '';
    const isEditing = Editor.active;
    const coverAspect = parseAspect(a.coverAspect, 16/9);

    // Writers: match each name in the byline to a Tribunee profile, if any.
    const tribunees = await Store.list('tribunees');
    const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const names = (a.author || '').split(/\s*(?:&|,|\band\b)\s*/).filter(Boolean);
    const writers = names.map(n => ({ name: n, t: tribunees.find(t => norm(t.name) === norm(n)) }));
    const avatar = (w, cls) => w.t && w.t.photo
      ? `<span class="${cls}"><img src="${w.t.photo}" alt="" /></span>`
      : `<span class="${cls}">${escapeHtml(initials(w.name))}</span>`;
    const nameLink = (w) => w.t
      ? `<a class="author" onclick="Router.go('tribunee/${w.t.id}')">${escapeHtml(w.name)}</a>`
      : `<span class="author">${escapeHtml(w.name)}</span>`;
    const byline = writers.map(nameLink).join(' &amp; ');
    const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.replace(/\s+/g, ' ').trim(); };
    const words = plain(renderArticleBody(a.body)).split(' ').filter(Boolean).length;
    const readMins = Math.max(1, Math.round(words / 200));

    // More stories from the same section, newest first.
    const more = (await listVisibleArticles(x => x.id !== a.id && x.section === a.section))
      .sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0)).slice(0, 3);
    const secLabel = sectionLabel(a.section);

    root.innerHTML = `
      <div class="article-page">
        <div class="ar-head">
          <a class="ar-back" onclick="Router.go('news')">← News</a>
          <div class="ar-cat">${escapeHtml(articleKicker({ ...a, tabLabel }, { fiwaLabel: 'FIWA-only' }))}</div>
          <h1 class="article-headline">${escapeHtml(a.title)}</h1>
          ${a.deck ? `<p class="article-deck">${escapeHtml(a.deck)}</p>` : ''}
          <div class="article-byline">
            <span class="ar-avatars">${writers.map(w => avatar(w, 'ar-avatar')).join('')}</span>
            <div class="ar-byline-text">
              <div>By ${byline}</div>
              <div class="ar-date">${formatDate(a.createdAt)} · ${readMins} min read</div>
            </div>
            ${a.edition ? `<span class="ar-print">In print · Edition ${a.edition}</span>` : ''}
          </div>
        </div>
        ${a.coverImage ? `<figure class="article-cover-fig">
          <div class="article-cover" style="aspect-ratio: ${coverAspect};">
            <img src="${a.coverImage}" alt="" />
          </div>
          ${a.coverCaption ? `<figcaption>${escapeHtml(a.coverCaption)}</figcaption>` : ''}
        </figure>` : ''}
        <div class="article-body">${renderArticleBody(a.body)}</div>
        <div class="ar-after">
          ${writers.filter(w => w.t).map(w => `
            <div class="ar-writer">
              ${avatar(w, 'ar-avatar lg')}
              <div>
                <div class="ar-writer-name">${escapeHtml(w.t.name)}</div>
                ${w.t.bio ? `<p class="ar-writer-bio">${escapeHtml(plain(w.t.bio).slice(0, 220))}${plain(w.t.bio).length > 220 ? '…' : ''}</p>` : ''}
                <a class="ar-link" onclick="Router.go('tribunee/${w.t.id}')">More by ${escapeHtml(w.t.name.split(' ')[0])}</a>
              </div>
            </div>
          `).join('')}
          <div class="ar-error-box">
            <p><strong>Spot an error in this story?</strong> Send a note to the editors. Only the editorial team sees it. If we got it wrong, we fix it and log a public correction.</p>
            <button class="btn-navy" onclick="Pages.corrections.reportError('${a.id}')">Report an error</button>
          </div>
          ${isEditing ? `
            <div class="article-edit-bar">
              <button class="btn-ghost" onclick="Editor.editArticleById('${a.id}')">Edit article</button>
              <button class="btn-ghost" style="color: #c0392b; border-color: rgba(192,57,62,0.4);" onclick="Editor.deleteArticleAndReturn('${a.id}')">Delete</button>
            </div>
          ` : ''}
        </div>
        ${more.length ? `
          <div class="ar-more">
            <div class="ar-more-head">
              <h2>More ${escapeHtml(secLabel || 'News')}</h2>
              <a class="ar-link" onclick="Router.go('news')">All news</a>
            </div>
            <div class="ar-more-grid">${more.map(m => `
              <article class="ar-more-card" onclick="Router.go('article/${m.id}')">
                ${m.coverImage ? `<div class="ar-more-img" style="background-image: url('${m.coverImage}')"></div>` : ''}
                <div class="story-cat">${escapeHtml(articleKicker(m))}</div>
                <h3>${escapeHtml(m.title)}</h3>
                <div class="ar-date">${formatDate(m.createdAt)}</div>
              </article>
            `).join('')}</div>
          </div>
        ` : ''}
      </div>
    `;
  }
};

/* ── WRITER'S DESK (/write, /write/:id) ──────────────────────────────── */
Pages.write = {
  async render(params) {
    const root = $('#write-content');
    Editor._teardownDesk();
    if (!(await Auth.isTribunee())) {
      root.innerHTML = `<div class="empty-state">${Icons.empty}<h3>The Writer’s desk is for Tribunees</h3><p>Sign in with your FIWA email to write for the Tribune.</p></div>`;
      return;
    }
    const id = params && params.id;
    const a = id ? await Store.get('articles', id) : null;
    if (id && !a) {
      root.innerHTML = `<div class="empty-state">${Icons.empty}<h3>Article not found</h3><p>It may have been removed.</p></div>`;
      return;
    }
    await Editor.mountDesk(root, a);
  }
};

/* ── TRIBUNEE CREDITS ──────────────────────────────────────────────────
   Articles on this site are matched to a Tribunee by the names in their
   byline ("A & B" credits both). Print credits the site can't see
   (articles in print, photos, editions worked on) are kept on the profile
   and edited by admins; see PRINT_CREDITS for the starting values. */
const Credits = {
  norm: (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim(),
  bylineNames: (a) => (a.author || '').split(/\s*(?:&|,|\band\b)\s*/).filter(Boolean),
  wrote(t, a) { return this.bylineNames(a).some(n => this.norm(n) === this.norm(t.name)); },
  // Visible articles by this Tribunee, newest first.
  async articlesBy(t) {
    return (await listVisibleArticles(a => this.wrote(t, a)))
      .sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
  },
  // Print articles (admin-entered) plus web-only articles on the site.
  // A site article with an edition number is a copy of a printed one, so
  // it is already in the print count.
  articleCount(t, siteArticles) {
    const printed = t.stats && t.stats.articles;
    if (!Number.isFinite(printed)) return siteArticles.length;
    return printed + siteArticles.filter(a => !a.edition).length;
  },
  roman(n) {
    const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '';
    for (const [v, r] of map) while (n >= v) { out += r; n -= v; }
    return out;
  },
  editions: (t) => (Array.isArray(t.editions) ? t.editions : []).slice().sort((a, b) => a - b)
};

/* ── TRIBUNEE FULL PROFILE PAGE ─────────────────────────────────────── */
Pages.tribunee = {
  async render(params) {
    const id = params && params.id;
    const root = $('#tribunee-content');
    if (!id) {
      root.innerHTML = `<div class="empty-state">${Icons.empty}<h3>No tribunee specified</h3></div>`;
      return;
    }
    const t = await Store.get('tribunees', id);
    if (!t) {
      root.innerHTML = `<div class="empty-state">${Icons.empty}<h3>Tribunee not found</h3><p>They may have moved on from the team.</p></div>`;
      return;
    }
    const isEditing = Editor.active;
    const canEdit   = isEditing && (await Auth.canEditTribunee(t));
    const photoAspect = parseAspect(t.photoAspect, 4/5);

    // Credits: site articles from bylines; print numbers typed in by admins.
    const articles = await Credits.articlesBy(t);
    const articleTotal = Credits.articleCount(t, articles);
    const editions = Credits.editions(t);
    const photos = (t.stats && t.stats.photos) || 0;
    const editionRange = !editions.length ? ''
      : editions.length === 1 ? `Edition ${Credits.roman(editions[0])}`
      : editions.every((n, i) => i === 0 || n === editions[i - 1] + 1)
        ? `${Credits.roman(editions[0])} to ${Credits.roman(editions[editions.length - 1])}`
        : editions.map(Credits.roman).join(', ');
    const stat = (n, label, sub) => `
      <div class="tp-stat"><span class="tp-stat-n">${n}</span><span class="tp-stat-label">${label}</span>${sub ? `<span class="tp-stat-sub">${escapeHtml(sub)}</span>` : ''}</div>`;
    const stats = [
      articleTotal ? stat(articleTotal, articleTotal === 1 ? 'Article' : 'Articles',
        Number.isFinite(t.stats && t.stats.articles) ? 'in print and online' : 'on this site') : '',
      editions.length ? stat(editions.length, editions.length === 1 ? 'Edition' : 'Editions', editionRange) : '',
      photos ? stat(photos, photos === 1 ? 'Photo' : 'Photos', 'credited') : ''
    ].join('');
    const meta = [t.grade, editions.length ? `Tribunee since Edition ${Credits.roman(editions[0])}` : '']
      .filter(Boolean).map(escapeHtml).join(' · ');
    const firstName = (t.name || '').split(/\s+/)[0];
    const SHOWN = 3;
    const articleRow = (a, i) => `
      <article class="tp-article${i >= SHOWN ? ' tp-more' : ''}" onclick="Router.go('article/${a.id}')">
        <div class="story-cat">${escapeHtml(articleKicker(a))}</div>
        <h3 class="tp-article-title">${escapeHtml(a.title)}</h3>
        <div class="tp-article-date">${escapeHtml(formatDate(a.createdAt))}</div>
      </article>`;

    root.innerHTML = `
      <div class="tribunee-profile">
        <div class="tp-portrait" style="aspect-ratio: ${photoAspect};">
          ${t.photo ? `<img src="${t.photo}" alt="${escapeHtml(t.name)}" />` : escapeHtml(initials(t.name))}
        </div>
        <div class="tp-content">
          <a class="tp-back" onclick="Router.go('about/tribunees')">← The Tribunees</a>
          <h1>${escapeHtml(t.name)}</h1>
          ${t.role ? `<div class="tp-role">${escapeHtml(t.role)}</div>` : ''}
          <div class="tp-grade">${meta}</div>
          ${stats ? `<div class="tp-stats">${stats}</div>` : ''}
          ${t.bio ? `<div class="tp-bio"><div class="bio-label">Bio:</div>${renderArticleBody(t.bio)}</div>` : ''}
          ${canEdit ? `
            <div class="tp-edit-bar">
              <button class="btn-ghost" onclick="Editor.editTribuneeById('${t.id}')">Edit profile</button>
            </div>
          ` : ''}
          ${articles.length ? `
            <div class="tp-articles">
              <h2>Articles by ${escapeHtml(firstName)}</h2>
              ${articles.map(articleRow).join('')}
              ${articles.length > SHOWN ? `<button class="tp-show-all" onclick="this.parentNode.classList.add('all'); this.remove();">Show all ${articles.length}</button>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
};

/* ── ARCHIVE ─────────────────────────────────────────────────────────── */
Pages.archive = {
  async render() {
    const isEditing = Editor.active;
    const isAdmin   = await Auth.isAdmin();
    const canEdit   = isEditing && isAdmin;
    const editions = (await Store.list('editions')).sort((a, b) => b.number - a.number);
    const grid = $('#archive-grid-area');

    if (editions.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          ${Icons.empty}
          <h3>No editions archived yet</h3>
          <p>${canEdit ? 'Click "+ Add Edition" up top to add a Canva or PDF link to the archive.' : 'The archive will fill as Fitrah Tribune publishes its first editions.'}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = `<div class="archive-grid">${editions.map(e => {
      const ar = parseAspect(e.coverAspect, 1/1.4);
      const arStyle = e.coverImage ? `style="aspect-ratio: ${ar};"` : '';
      return `
      <div class="archive-item">
        <a class="archive-card" href="${escapeHtml(e.link || '#')}" target="_blank" rel="noopener" ${canEdit ? `oncontextmenu="event.preventDefault(); Editor.editEdition('${e.id}')"` : ''}>
          <div class="archive-cover ${e.coverImage ? 'has-image' : ''}" ${arStyle}>
            ${e.coverImage ? `
              <img class="ac-img" src="${e.coverImage}" alt="Edition ${e.number} front page" />
            ` : `
              <div class="ac-name">Fitrah Tribune</div>
              <div class="ac-num">${e.number}<span>Edition</span></div>
              <div class="ac-tag">★ ${formatDateShort(e.date)} ★</div>
            `}
          </div>
          <div class="archive-info">
            <div class="ai-date">${formatDate(e.date)}</div>
            <div class="ai-title">${escapeHtml(e.title)}</div>
            ${e.desc ? `<div class="ai-desc">${escapeHtml(e.desc)}</div>` : ''}
          </div>
        </a>
        ${canEdit ? `
          <div class="edit-overlay">
            <button class="edit-icon-btn" title="Edit edition" onclick="Editor.editEdition('${e.id}')">✎</button>
            <button class="edit-icon-btn delete" title="Remove edition" onclick="Editor.deleteEdition('${e.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        ` : ''}
      </div>
    `;
    }).join('')}</div>`;
  }
};

/* ── FORUM ────────────────────────────────────────────────────────────── */
Pages.forum = {
  /* The Forum is a single mixed feed of Tribune posts.
     Two categories:
       · announcement — admin-only. The Tribune's institutional voice.
       · general      — any Tribunee. Everything else.
     No comments. Readers respond via the (forthcoming) private ticket flow.
     Moderation is post-with-admin-delete, not an approval queue. */
  state: { sort: 'newest', composeCategory: 'general' },

  async render() {
    const isAdmin    = await Auth.isAdmin();
    const isTribunee = await Auth.isTribunee();
    const myEmail    = (Auth.current().email || '').toLowerCase();

    /* ── Composer: Tribunees only ─────────────────────────────────── */
    const composeArea = $('#forum-compose-area');
    if (!isTribunee) {
      composeArea.innerHTML = `
        <div class="forum-compose locked">
          <div class="compose-locked-msg">
            ${Auth.isGuest()
              ? `The forum is where the Tribune posts announcements and notices. <a onclick="SignIn.open()">Sign in</a> to follow along.`
              : `The forum is where the Tribune posts announcements and notices. Only Tribunees can post here — but you can always <a onclick="Pages.forum.reportTip()">send us a correction</a>.`}
          </div>
        </div>
      `;
    } else {
      // Non-admin tribunees can't select Announcement; force them onto general.
      if (!isAdmin && this.state.composeCategory === 'announcement') this.state.composeCategory = 'general';
      composeArea.innerHTML = `
        <div class="forum-compose">
          <div class="compose-head">
            <h3>New Post</h3>
            <span style="font-family: var(--ui); font-size: 0.7rem; color: var(--ink-muted); letter-spacing: 0.14em;">Posting as ${escapeHtml(Auth.current().name)}</span>
          </div>
          <input type="text" class="compose-title" id="post-title" placeholder="Title — what is this about?" />
          <textarea class="compose-body" id="post-body" placeholder="Write your post…"></textarea>
          <div class="compose-foot">
            <div class="compose-cats">
              <button class="cat-chip ${this.state.composeCategory === 'announcement' ? 'selected' : ''}"
                      ${isAdmin ? '' : 'disabled title="Admins only"'}
                      onclick="Pages.forum.setComposeCategory('announcement')">Announcement</button>
              <button class="cat-chip ${this.state.composeCategory === 'general' ? 'selected' : ''}"
                      onclick="Pages.forum.setComposeCategory('general')">General</button>
            </div>
            <button class="btn-navy" onclick="Pages.forum.postToFeed()">Publish post</button>
          </div>
        </div>
      `;
    }

    /* ── Feed ─────────────────────────────────────────────────────── */
    let posts = await Store.list('threads');

    if (this.state.sort === 'announcement')  posts = posts.filter(p => p.category === 'announcement');
    else if (this.state.sort === 'general')  posts = posts.filter(p => p.category !== 'announcement');

    if (this.state.sort === 'oldest') posts.sort((a, b) => a.createdAt - b.createdAt);
    else                              posts.sort((a, b) => b.createdAt - a.createdAt);

    const list = $('#forum-post-list');
    if (posts.length === 0) {
      const emptyCopy = this.state.sort === 'announcement'
        ? 'No announcements have been posted yet.'
        : this.state.sort === 'general'
          ? 'No general posts yet.'
          : (isTribunee
              ? 'Nothing here yet. Publish the first post — announcements carry the Tribune\'s voice, general posts carry yours.'
              : 'Nothing here yet. When the Tribune posts an announcement or notice, it appears here.');
      list.innerHTML = `
        <div class="empty-state">
          ${Icons.empty}
          <h3>The feed is empty</h3>
          <p>${emptyCopy}</p>
        </div>
      `;
      return;
    }

    list.innerHTML = posts.map(p => {
      const isAnn   = p.category === 'announcement';
      const isOwner = (p.authorEmail || '').toLowerCase() === myEmail;
      const canDel  = isAdmin || (isTribunee && isOwner);
      return `
        <div class="feed-post${isAnn ? ' announcement' : ''}" id="post-${p.id}">
          <div class="thread-avatar">${initials(p.author)}</div>
          <div class="post-body">
            <div class="post-meta">
              <span>By <span class="author">${escapeHtml(p.author)}</span></span>
              <span>·</span>
              <span>${relativeTime(p.createdAt)}</span>
              <span class="post-cat ${isAnn ? 'announcement' : ''}">${isAnn ? 'Announcement' : 'General'}</span>
              ${canDel ? `<button onclick="Pages.forum.deletePost('${p.id}')" class="thread-delete-btn">× Delete</button>` : ''}
            </div>
            <h4>${escapeHtml(p.title)}</h4>
            <p>${escapeHtml(p.body)}</p>
          </div>
        </div>
      `;
    }).join('');
  },

  setSort(sort) {
    this.state.sort = sort;
    $$('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === sort));
    this.render();
  },

  async setComposeCategory(cat) {
    // Defence in depth: the disabled attribute is a UI hint, not a guarantee.
    if (cat === 'announcement' && !(await Auth.isAdmin())) {
      toast('Only admins can post announcements', 'error');
      return;
    }
    this.state.composeCategory = cat;
    this.render();
  },

  async postToFeed() {
    if (!(await Auth.isTribunee())) { toast('Only Tribunees can post to the forum', 'error'); return; }
    const cat = this.state.composeCategory;
    if (cat === 'announcement' && !(await Auth.isAdmin())) {
      toast('Only admins can post announcements', 'error');
      return;
    }
    const title = $('#post-title').value.trim();
    const body  = $('#post-body').value.trim();
    if (!title || !body) { toast('Title and body are required', 'error'); return; }
    await Store.save('threads', {
      title, body,
      category: cat,
      author: Auth.current().name,
      authorEmail: Auth.current().email
    });
    this.render();
    Pages.home.render();
    toast(cat === 'announcement' ? 'Announcement published' : 'Post published', 'success');
  },

  async deletePost(id) {
    const post = await Store.get('threads', id);
    if (!post) return;
    const isAdmin    = await Auth.isAdmin();
    const isTribunee = await Auth.isTribunee();
    const isOwner    = (post.authorEmail || '').toLowerCase() === (Auth.current().email || '').toLowerCase();
    if (!isAdmin && !(isTribunee && isOwner)) { toast('You can only delete your own posts', 'error'); return; }
    if (!confirm('Delete this post? This cannot be undone.')) return;
    await Store.remove('threads', id);
    this.render();
    Pages.home.render();
    toast('Post deleted');
  },

  /* Kept as an alias — older call sites may still reference it. */
  reportTip() {
    Pages.corrections.openSubmit();
  }
};

/* ── FEEDBACK & CORRECTIONS ───────────────────────────────────────────
   Two things live on this page, and the boundary between them is the
   whole point:

     · TICKETS   — private. A reader writes to the editors. Nobody outside
                   the Tribune and the sender ever sees it. Ever.
     · THE LOG   — public. If a ticket (or anything else) produces a
                   factual correction, the CORRECTION is published — never
                   the conversation that prompted it.

   Each ticket is a small chat between its sender and the editors. Replies
   are shown to the reader as "Fitrah Tribune Editors", never a person.

   Permissions:
     Guest      → read the public log. Sign-in prompt.
     Public+    → send tickets, see and add to their own (and only their own).
     Tribunee   → all of the above + READ every ticket in the inbox.
     Admin      → all of the above + REPLY, SET A STATUS (which can close) and REOPEN.

   The sender decides whether the editors see their name. The site still
   stores who sent it, so it can show them their own tickets.

   Each ticket has a status (NOTE_STATUSES). A final one closes it, and a
   closed ticket is FROZEN: nobody can add to it, admins included. Only an
   admin can reopen it.
   ─────────────────────────────────────────────────────────────────── */

const NOTE_KINDS = {
  mistake: 'A mistake in a story',
  tip:     'A news tip',
  other:   'Other feedback'
};

/* Every note has a status. The final ones close it: a closed note is
   frozen until an admin reopens it. */
const NOTE_STATUSES = {
  received:  { label: 'Received',                   cls: 'recv',    final: false, help: 'The editors have your note.' },
  progress:  { label: 'In progress',                cls: 'prog',    final: false, help: 'The editors are checking it.' },
  corrected: { label: 'Corrected',                  cls: 'fixed',   final: true,  help: 'We fixed the story and logged it below.' },
  checked:   { label: 'Checked, no change needed',  cls: 'checked', final: true,  help: 'We looked into it; the story stands.' },
  passed:    { label: 'Thanks, passed to a writer', cls: 'passed',  final: true,  help: 'For tips: a Tribunee will follow it up.' }
};

const Cases = {
  /* Human-readable, quotable reference. Short enough to write on paper. */
  newRef() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — misread on paper
    let out = '';
    for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `FTR-${out}`;
  },

  async canSubmit()    { return !Auth.isGuest(); },
  async canViewInbox() { return await Auth.isTribunee(); },
  async canReply()     { return await Auth.isAdmin(); },
  async canClose()     { return await Auth.isAdmin(); },

  status(c) { return NOTE_STATUSES[c.status] || NOTE_STATUSES.received; },
  isOpen(c) { return !this.status(c).final; },
  chip(c) { const st = this.status(c); return `<span class="note-st ${st.cls}">${st.label}</span>`; },

  async messagesFor(caseId) {
    const msgs = await Store.list('casemsgs', m => m.caseId === caseId);
    return msgs.sort((a, b) => a.createdAt - b.createdAt);
  },

  async isMine(c) {
    const email = (Auth.current().email || '').toLowerCase();
    return !!email && (c.submitterEmail || '').toLowerCase() === email;
  },

  /* One message in a ticket's chat. `team` shows the inbox view: which
     admin replied, and the sender's name only if they chose to share it. */
  msg(m, c, team) {
    const editors = m.side === 'tribune';
    let who;
    if (editors) who = `Fitrah Tribune Editors${team && m.author ? ` <span class="msg-by">· ${escapeHtml(m.author)}</span>` : ''}`;
    else if (team) who = c.showName ? escapeHtml(c.submitterName || 'Reader') : 'Name not shared';
    else who = 'You';
    return `
      <div class="note-msg ${editors ? 'editors' : 'reader'}">
        <div class="note-msg-meta"><b>${who}</b> · ${relativeTime(m.createdAt)}</div>
        <p>${escapeHtml(m.body)}</p>
      </div>`;
  }
};

Pages.corrections = {
  state: { kind: 'mistake', articleId: '', inbox: 'open', inboxKind: 'all', selected: null },
  _preset: null,

  async render() {
    await this.renderSubmit();
    await this.renderMyCases();
    await this.renderInbox();
    await this.renderLog();
  },

  /* ── Entry points. "Report a Tip" (home, forum, footer) opens the form
        with "A news tip" picked; an article's error box picks "A mistake"
        and that story. ─────────────────────────────────────────────── */
  openSubmit(kind = 'tip', articleId = '') {
    this._preset = { kind, articleId };
    Router.go('corrections/submit');
  },
  reportError(articleId) { this.openSubmit('mistake', articleId); },

  /* ── SUBMIT ────────────────────────────────────────────────────────── */
  async renderSubmit() {
    const el = $('#fc-submit-area');
    if (!el) return;
    if (Auth.isGuest()) {
      el.innerHTML = `
        <div class="fc-submit locked">
          <div class="compose-locked-msg">
            <a onclick="SignIn.open()">Sign in</a> to send a note to the editors. We ask for an account so the editors can reply to you, not so we can publish your name.
          </div>
        </div>
      `;
      return;
    }
    // A preset from "Report a Tip" or an article; /feedback/submit alone is the footer's tip link.
    // The URL preset applies once per visit, so picking another kind isn't undone by a re-render.
    const visit = history.state && history.state.key;
    let preset = this._preset;
    if (!preset && Router.params && Router.params.id === 'submit' && visit !== this._presetVisit) preset = { kind: 'tip', articleId: '' };
    this._preset = null;
    if (preset) this._presetVisit = visit;
    if (preset) { this.state.kind = preset.kind; this.state.articleId = preset.articleId || ''; }
    const articles = (await listVisibleArticles()).sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
    const placeholder = {
      mistake: 'Tell us what we got wrong and how you know. Links or the page number help us check faster.',
      tip:     'What’s happening, where, and when? Tell us how you know.',
      other:   'What would you like the editors to know?'
    }[this.state.kind];
    el.innerHTML = `
      <div class="fc-form">
        <div class="fc-q">What is it?</div>
        <div class="fc-kinds">${Object.entries(NOTE_KINDS).map(([k, label]) =>
          `<button type="button" class="${this.state.kind === k ? 'active' : ''}" onclick="Pages.corrections.setKind('${k}')">${label}</button>`).join('')}</div>
        <label class="fc-q" for="fc-article">Which story? (optional)</label>
        <select id="fc-article">
          <option value="">No particular story</option>
          ${articles.map(a => `<option value="${a.id}" ${this.state.articleId === a.id ? 'selected' : ''}>${escapeHtml(a.title)}</option>`).join('')}
        </select>
        <label class="fc-q" for="fc-body">Your note</label>
        <textarea class="fc-body" id="fc-body" maxlength="3000" placeholder="${placeholder}"></textarea>
        <label class="fc-showname">
          <input type="checkbox" id="fc-showname" />
          <span><b>Let the editors see my name</b><br>Leave this off and the editors see only the reference. Either way, your name is never published.</span>
        </label>
        <div class="fc-submit-foot">
          <span class="fc-submit-note">You’ll get a reference like <b>FTR-7KQ2</b>. The editors reply under your note, and you can add to it until it’s closed.</span>
          <button class="btn-navy" onclick="Pages.corrections.submitCase()">Send to the editors</button>
        </div>
      </div>
    `;
  },

  setKind(k) {
    if (!NOTE_KINDS[k]) return;
    // Keep what's been typed while switching.
    const body = $('#fc-body')?.value || '';
    const art = $('#fc-article')?.value || '';
    const show = $('#fc-showname')?.checked;
    this.state.kind = k;
    this.state.articleId = art;
    this.renderSubmit().then(() => {
      $('#fc-body').value = body;
      $('#fc-showname').checked = !!show;
    });
  },

  async submitCase() {
    if (!(await Cases.canSubmit())) { SignIn.open(); return; }
    const body = $('#fc-body').value.trim();
    if (!body) { toast('Please write your note first', 'error'); return; }
    const articleId = $('#fc-article').value;
    const article = articleId ? await Store.get('articles', articleId) : null;
    const rec = await Store.save('cases', {
      ref: Cases.newRef(),
      kind: NOTE_KINDS[this.state.kind] ? this.state.kind : 'other',
      articleId: article ? article.id : '',
      articleTitle: article ? article.title : '',
      showName: !!$('#fc-showname').checked,
      status: 'received',
      submitterName:  Auth.current().name,
      submitterEmail: Auth.current().email
    });
    await Store.save('casemsgs', {
      caseId: rec.id,
      body,
      side: 'reader',
      author: Auth.current().name,
      authorEmail: Auth.current().email
    });
    this.state.articleId = '';
    await this.render();
    toast(`Sent. Your reference is ${rec.ref}`, 'success');
    setTimeout(() => {
      $('#fc-mycases-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  },

  /* ── YOUR NOTES (Public+) ──────────────────────────────────────────── */
  async renderMyCases() {
    const block = $('#fc-mycases-block');
    const el    = $('#fc-mycases-area');
    if (!block || !el) return;

    if (Auth.isGuest()) { block.style.display = 'none'; return; }
    const email = (Auth.current().email || '').toLowerCase();
    const mine  = (await Store.list('cases', c => (c.submitterEmail || '').toLowerCase() === email))
                    .sort((a, b) => b.createdAt - a.createdAt);

    block.style.display = '';
    $('#fc-mycases-count').textContent = mine.length ? `${mine.length} sent` : '';

    if (mine.length === 0) {
      el.innerHTML = `<p class="fc-empty">Nothing sent yet. When you send a note, it appears here with the editors’ replies.</p>`;
      return;
    }
    el.innerHTML = (await Promise.all(mine.map(async c => {
      const msgs = await Cases.messagesFor(c.id);
      const foot = Cases.isOpen(c) ? `
        <div class="note-add">
          <input type="text" id="add-${c.id}" maxlength="3000" placeholder="Add something to this note…"
                 onkeydown="if(event.key==='Enter')Pages.corrections.followUp('${c.id}')" />
          <button class="btn-ghost" onclick="Pages.corrections.followUp('${c.id}')">Send</button>
        </div>` : `<p class="note-frozen">${Cases.status(c).help} This note is closed. To add something, send a new note and mention ${escapeHtml(c.ref)}.</p>`;
      const last = msgs[msgs.length - 1];
      const open = this._expanded.has(c.id);
      return `
        <article class="note-row ${open ? 'expanded' : ''}" id="note-${c.id}">
          <div class="note-head" role="button" tabindex="0" aria-expanded="${open}"
               onclick="Pages.corrections.toggleNote('${c.id}')"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Pages.corrections.toggleNote('${c.id}')}">
            <div class="note-top">
              <span class="note-ref">${escapeHtml(c.ref)}</span>
              <span class="note-meta">${NOTE_KINDS[c.kind] || 'Other feedback'} · ${relativeTime(c.createdAt)}</span>
              ${Cases.chip(c)}
            </div>
            ${c.articleTitle || c.subject ? `<h3 class="note-title">${escapeHtml(c.articleTitle || c.subject)}</h3>` : ''}
            ${last ? `<p class="note-latest"><b>${last.side === 'tribune' ? 'Fitrah Tribune Editors' : 'You'}:</b> ${escapeHtml(last.body)}</p>` : ''}
            <span class="note-toggle">${msgs.length} message${msgs.length === 1 ? '' : 's'} · <span class="when-closed">Show conversation</span><span class="when-open">Hide</span></span>
          </div>
          <div class="note-thread">
            <div class="note-chat">${msgs.map(m => Cases.msg(m, c, false)).join('')}</div>
            ${foot}
          </div>
        </article>`;
    }))).join('');
  },

  /* Open notes stay open across re-renders (e.g. after adding to one). */
  _expanded: new Set(),
  toggleNote(id) {
    const el = $(`#note-${id}`);
    if (!el) return;
    const open = !this._expanded.has(id);
    if (open) this._expanded.add(id); else this._expanded.delete(id);
    el.classList.toggle('expanded', open);
    el.querySelector('.note-head')?.setAttribute('aria-expanded', String(open));
  },

  /* ── EDITORS' INBOX (Tribunees read / admins reply, close, reopen) ─── */
  async renderInbox() {
    const block = $('#fc-inbox-block');
    const el    = $('#fc-inbox-area');
    if (!block || !el) return;

    if (!(await Cases.canViewInbox())) { block.style.display = 'none'; return; }
    block.style.display = '';

    const all = (await Store.list('cases')).sort((a, b) => b.createdAt - a.createdAt);
    const open = all.filter(c => Cases.isOpen(c));
    const st = this.state;
    let list = st.inbox === 'open' ? open : st.inbox === 'closed' ? all.filter(c => !Cases.isOpen(c)) : all;
    if (st.inboxKind !== 'all') list = list.filter(c => (c.kind || 'other') === st.inboxKind);
    $('#fc-inbox-count').textContent = all.length ? `${open.length} open · ${all.length} total` : '';

    const tabs = [['open', 'Open', open.length], ['closed', 'Closed', all.length - open.length], ['all', 'All', null]];
    const head = `
      <div class="inbox-bar">
        <div class="inbox-tabs">${tabs.map(([k, label, n]) =>
          `<button class="${st.inbox === k ? 'active' : ''}" onclick="Pages.corrections.inboxTab('${k}')">${label}${n !== null ? ` <span>${n}</span>` : ''}</button>`).join('')}</div>
        <div class="inbox-kinds">${[['all', 'All kinds'], ['mistake', 'Mistakes'], ['tip', 'Tips'], ['other', 'Other']].map(([k, label]) =>
          `<button class="${st.inboxKind === k ? 'active' : ''}" onclick="Pages.corrections.inboxKind('${k}')">${label}</button>`).join('')}</div>
      </div>`;

    if (list.length === 0) {
      el.innerHTML = head + `<p class="fc-empty">${all.length ? 'Nothing here.' : 'No notes from readers yet.'}</p>`;
      return;
    }
    if (!list.some(c => c.id === st.selected)) st.selected = list[0].id;
    const c = list.find(x => x.id === st.selected);
    el.innerHTML = head + `
      <div class="inbox">
        <div class="inbox-list">${list.map(x => `
          <button class="inbox-item ${x.id === c.id ? 'active' : ''}" onclick="Pages.corrections.selectNote('${x.id}')">
            <span class="inbox-item-top"><span class="note-ref">${escapeHtml(x.ref)}</span><span class="note-meta">${relativeTime(x.updatedAt || x.createdAt)}</span></span>
            <span class="inbox-item-title">${escapeHtml(x.articleTitle || x.subject || 'No story picked')}</span>
            <span class="inbox-item-top"><span class="note-meta">${NOTE_KINDS[x.kind] || 'Other feedback'}</span>${Cases.chip(x)}</span>
          </button>`).join('')}
        </div>
        <div class="inbox-detail">${await this.noteDetail(c)}</div>
      </div>`;
  },

  async noteDetail(c) {
    const canReply = await Cases.canReply();
    const open = Cases.isOpen(c);
    const msgs = await Cases.messagesFor(c.id);
    const when = new Date(c.createdAt);
    const stamp = `${when.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    const from = c.showName
      ? `From <b>${escapeHtml(c.submitterName || '')}</b>`
      : `From <b>Name not shared</b> · the sender chose to stay anonymous`;

    let action;
    if (!open) {
      action = `
        <p class="inbox-locked">Closed${c.closedBy ? ` by ${escapeHtml(c.closedBy)}` : ''}${c.closedAt ? ` · ${formatDate(c.closedAt)}` : ''}. Nobody can add to it${canReply ? ' unless you reopen it' : ''}.</p>
        ${canReply ? `<div class="inbox-actions"><button class="btn-ghost" onclick="Pages.corrections.reopenCase('${c.id}')">Reopen</button></div>` : ''}`;
    } else if (!canReply) {
      action = `<p class="inbox-locked">Only admins reply to notes or set a status.</p>`;
    } else {
      action = `
        <label class="fc-q" for="inbox-reply">Reply to the reader</label>
        <textarea id="inbox-reply" maxlength="3000" placeholder="Shown to the reader as “Fitrah Tribune Editors”."></textarea>
        <div class="inbox-actions">
          <button class="btn-ghost" onclick="Pages.corrections.caseToCorrection('${c.id}')">Log a public correction</button>
          <button class="btn-navy" onclick="Pages.corrections.replyToCase('${c.id}')">Send reply</button>
        </div>
        <div class="fc-q">Set a status</div>
        <div class="inbox-statuses">${Object.entries(NOTE_STATUSES).filter(([k]) => k !== 'received').map(([k, st]) =>
          `<button class="${c.status === k ? 'active' : ''}" onclick="Pages.corrections.setStatus('${c.id}','${k}')">${st.label}</button>`).join('')}</div>
        <p class="inbox-hint">${Object.values(NOTE_STATUSES).filter(st => st.final).map(st => `“${st.label}”`).join(', ')} close the note.</p>`;
    }
    return `
      <div class="note-top"><span class="note-ref">${escapeHtml(c.ref)}</span><span class="note-meta">${NOTE_KINDS[c.kind] || 'Other feedback'} · ${escapeHtml(c.articleTitle || c.subject || 'No story picked')} · ${stamp}</span>${Cases.chip(c)}</div>
      <div class="inbox-from">${from}</div>
      <div class="note-chat">${msgs.map(m => Cases.msg(m, c, true)).join('')}</div>
      <div class="inbox-head">${action}</div>
    `;
  },

  inboxTab(k) { this.state.inbox = k; this.state.selected = null; this.renderInbox(); },
  inboxKind(k) { this.state.inboxKind = k; this.state.selected = null; this.renderInbox(); },
  selectNote(id) { this.state.selected = id; this.renderInbox(); },

  /* ── Actions ───────────────────────────────────────────────────────── */

  async replyToCase(caseId) {
    if (!(await Cases.canReply())) { toast('Only admins can reply to notes', 'error'); return; }
    const c = await Store.get('cases', caseId);
    if (!c) return;
    if (!Cases.isOpen(c)) { toast('This note is closed', 'error'); return; }
    const body = ($('#inbox-reply')?.value || '').trim();
    if (!body) { toast('Write a reply first', 'error'); return; }
    await Store.save('casemsgs', {
      caseId, body,
      side: 'tribune',
      author: Auth.current().name,
      authorEmail: Auth.current().email
    });
    if (c.status === 'received') c.status = 'progress'; // a reply means someone is on it
    await Store.save('cases', c); // bumps updatedAt
    this.state.selected = c.id;
    await this.render();
    toast('Reply sent', 'success');
  },

  async followUp(caseId) {
    const c = await Store.get('cases', caseId);
    if (!c) return;
    if (!(await Cases.isMine(c))) { toast('This is not your note', 'error'); return; }
    if (!Cases.isOpen(c)) { toast('This note is closed', 'error'); return; }
    const body = ($(`#add-${caseId}`)?.value || '').trim();
    if (!body) return;
    await Store.save('casemsgs', {
      caseId, body,
      side: 'reader',
      author: Auth.current().name,
      authorEmail: Auth.current().email
    });
    await Store.save('cases', c);
    await this.render();
    toast('Sent', 'success');
  },

  /* In progress applies at once; a final status asks first, since it
     closes the note. */
  async setStatus(caseId, status) {
    const st = NOTE_STATUSES[status];
    if (!st || status === 'received') return;
    if (!(await Cases.canClose())) { toast('Only admins can set a status', 'error'); return; }
    if (!st.final) return this.applyStatus(caseId, status);
    Modal.open({
      title: `Mark as “${st.label}” and close?`,
      body: `<p class="field-hint">Once closed the note is frozen: neither the editors nor the reader can add to it. Only an admin can reopen it.</p>`,
      foot: `
        <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn-navy" onclick="Modal.close(); Pages.corrections.applyStatus('${caseId}','${status}')">Close note</button>
      `
    });
  },

  async applyStatus(caseId, status) {
    const st = NOTE_STATUSES[status];
    if (!st || status === 'received') return;
    if (!(await Cases.canClose())) { toast('Only admins can set a status', 'error'); return; }
    const c = await Store.get('cases', caseId);
    if (!c) return;
    if (!Cases.isOpen(c)) { toast('This note is closed. Reopen it first.', 'error'); return; }
    c.status = status;
    if (st.final) { c.closedAt = Date.now(); c.closedBy = Auth.current().name; }
    await Store.save('cases', c);
    this.state.selected = c.id;
    await this.render();
    toast(`${c.ref}: ${st.label}`);
  },

  async reopenCase(caseId) {
    if (!(await Cases.canClose())) { toast('Only admins can reopen notes', 'error'); return; }
    const c = await Store.get('cases', caseId);
    if (!c || Cases.isOpen(c)) return;
    c.status = 'progress';
    c.closedAt = null;
    c.closedBy = null;
    await Store.save('cases', c);
    // Follow the note back to "Open" instead of losing it from the list.
    if (this.state.inbox === 'closed') this.state.inbox = 'open';
    this.state.selected = c.id;
    await this.render();
    toast(`${c.ref} reopened`);
  },

  /* Publish a correction that a note surfaced. The correction goes on the
     public record; the NOTE DOES NOT. Nothing from the reader's note is
     carried over automatically — an admin writes the public note from
     scratch, in the Tribune's own words. That is deliberate. */
  async caseToCorrection(caseId) {
    if (!(await Auth.isAdmin())) { toast('Only admins can log corrections', 'error'); return; }
    const c = await Store.get('cases', caseId);
    if (!c) return;
    Modal.open({
      title: 'Log a public correction',
      body: `
        <div class="field-hint" style="margin-bottom: 1.1rem;">
          This publishes a correction to the public record. <strong>Nothing from note ${escapeHtml(c.ref)} is copied across</strong> — not the reader's name, not their words, not the fact that they wrote in. Write the note yourself, in the Tribune's voice.
        </div>
        <div class="field">
          <label>Article title</label>
          <input type="text" id="c2c-title" placeholder="Which article is being corrected?" />
        </div>
        <div class="field">
          <label>Edition number (optional)</label>
          <input type="number" id="c2c-edition" placeholder="leave blank for online-only" min="1" />
        </div>
        <div class="field">
          <label>Description of the correction</label>
          <textarea id="c2c-note" rows="4" placeholder="A plain, public note: what we got wrong, and what it now says."></textarea>
        </div>
      `,
      foot: `
        <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn-navy" onclick="Pages.corrections.saveCaseCorrection()">Publish correction</button>
      `
    });
  },

  async saveCaseCorrection() {
    if (!(await Auth.isAdmin())) { toast('Only admins can log corrections', 'error'); return; }
    const articleTitle = $('#c2c-title').value.trim();
    const note         = $('#c2c-note').value.trim();
    const edition      = $('#c2c-edition').value.trim();
    if (!articleTitle || !note) { toast('Article title and description are required', 'error'); return; }

    await Store.save('corrections', {
      articleTitle,
      note,
      edition: edition ? parseInt(edition, 10) : null,
      editor: Auth.current().name
    });
    Modal.close();
    await this.render();
    toast('Correction published to the public record', 'success');
  },

  /* ── THE PUBLIC LOG ────────────────────────────────────────────────── */
  async renderLog() {
    const isEditing = Editor.active;
    const isAdmin   = await Auth.isAdmin();
    const canEdit   = isEditing && isAdmin;
    const list = (await Store.list('corrections')).sort((a, b) => b.createdAt - a.createdAt);
    const el = $('#corrections-list');
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          ${Icons.empty}
          <h3>No corrections logged yet</h3>
          <p>When tribunees update an article, the change is recorded here in public — kept transparent for as long as Fitrah Tribune exists.</p>
        </div>
      `;
      return;
    }
    el.innerHTML = `<div class="correction-list">${list.map(c => `
      <div class="correction-entry${canEdit ? ' has-admin-actions' : ''}">
        <div class="correction-date">
          <strong>${formatDate(c.createdAt)}</strong>
          ${relativeTime(c.createdAt)}
        </div>
        <div class="correction-body">
          <div class="cb-edition">${c.edition ? `Edition ${c.edition}` : 'Online article'}</div>
          <h4>${escapeHtml(c.articleTitle)}</h4>
          <p>${escapeHtml(c.note)}</p>
        </div>
        <div class="correction-by">
          Corrected by
          <strong>${escapeHtml(c.editor)}</strong>
        </div>
        ${canEdit ? `
          <div class="correction-admin-actions">
            <button class="edit-icon-btn" title="Edit correction" onclick="Editor.editCorrection('${c.id}')">✎</button>
            <button class="edit-icon-btn delete" title="Remove correction" onclick="Editor.deleteCorrection('${c.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        ` : ''}
      </div>
    `).join('')}</div>`;
  }
};

/* ── ABOUT ───────────────────────────────────────────────────────────── */
Pages.about = {
  async render() {
    const isEditing = Editor.active;
    const isAdmin   = await Auth.isAdmin();
    const currentEmail = (Auth.current().email || '').toLowerCase();
    const tribunees = (await Store.list('tribunees')).sort((a, b) => (a.order || 0) - (b.order || 0));
    const grid = $('#tribunees-grid-area');
    const articles = await listVisibleArticles();

    if (tribunees.length === 0) {
      grid.innerHTML = `<div class="empty-state">${Icons.empty}<h3>The tribunee roster is empty</h3><p>${isEditing && isAdmin ? 'Click "+ Add Tribunee" to add the team.' : 'The team page is being prepared.'}</p></div>`;
      return;
    }

    const colors = [
      ['#1c3658', '#c08e3a'], ['#2d4f7a', '#d8a956'], ['#0f2138', '#c08e3a'],
      ['#1c3658', '#e8cf94'], ['#2d4f7a', '#c08e3a'], ['#1c3658', '#d8a956'],
      ['#0f2138', '#e8cf94'], ['#2d4f7a', '#c08e3a']
    ];
    grid.innerHTML = `<div class="tribunees-grid">${tribunees.map((t, i) => {
      const [c1, c2] = colors[i % colors.length];
      const portraitInner = t.photo
        ? `<img src="${t.photo}" alt="${escapeHtml(t.name)}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
        : escapeHtml(initials(t.name));
      const portraitStyle = t.photo
        ? ''
        : `background: linear-gradient(135deg, ${c1} 0%, ${c2} 100%);`;
      // Per-card edit permission: admin can edit anyone; non-admin tribunees can edit only their own profile.
      const isSelf = !!(t.email && t.email.toLowerCase() === currentEmail);
      const canEditCard = isEditing && (isAdmin || isSelf);
      // The bio's first paragraph only, clamped to two lines by CSS.
      const bioText = (() => {
        if (!t.bio) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = t.bio;
        for (const b of tmp.querySelectorAll('p, blockquote, h2, h3, h4, li')) {
          const txt = (b.textContent || '').replace(/\s+/g, ' ').trim();
          if (txt) return txt;
        }
        return (tmp.textContent || '').trim().split(/\n\s*\n/)[0].replace(/\s+/g, ' ');
      })();
      const articleTotal = Credits.articleCount(t, articles.filter(a => Credits.wrote(t, a)));
      const meta = [t.grade, articleTotal ? `${articleTotal} ${articleTotal === 1 ? 'article' : 'articles'}` : '']
        .filter(Boolean).map(escapeHtml).join(' · ');
      return `
        <article class="tribunee-card" onclick="Router.go('tribunee/${t.id}')">
          ${canEditCard ? `<div class="edit-overlay"><button class="edit-icon-btn" onclick="event.stopPropagation(); Editor.editTribuneeById('${t.id}')">✎</button></div>` : ''}
          <div class="tribunee-head">
            <div class="tribunee-portrait" style="${portraitStyle}">${portraitInner}</div>
            <div class="tribunee-id">
              <div class="tribunee-name">${escapeHtml(t.name)}</div>
              ${t.role ? `<div class="tribunee-role">${escapeHtml(t.role)}</div>` : ''}
              ${meta ? `<div class="tribunee-grade">${meta}</div>` : ''}
            </div>
          </div>
          ${bioText ? `<div class="tribunee-bio-wrap"><span class="bio-label">Bio:</span><p class="tribunee-bio">${escapeHtml(bioText)}</p></div>` : ''}
        </article>
      `;
    }).join('')}</div>`;
  }
};

/* =====================================================================
   MIGRATION — bring older localStorage data forward to the current schema.

   We bump fitrah:schemaVersion in lock-step with breaking shape changes
   so existing browser data isn't silently corrupted or lost.

   Versions:
     v1 → v2  (May 2026)
       · Allowlist: founder boolean renamed to admin; emails updated to
         actual firstname.lastname@fiwa.sch.id form; Alde + Fathan promoted
         to admin alongside Ammar.
       · Tribunees: gained an email field linking each record to its
         allowlist entry, so non-admin tribunees can edit their own
         profile.
       · Two new tribunees added: Muhammad Shahza (Photographer) and
         Muhammad Razqa Abyan (Writer).
       · Fathan Assyauqi Hiliry's default role was extended from
         "Writer · EN/ID Translator" to "Representative · Writer · EN/ID
         Translator" to reflect his Representative duties.

   The migration is conservative: bios, photos, aspect/fit choices, and
   any role text customised by the tribunees themselves are preserved.
   ===================================================================== */

const SCHEMA_VERSION = 11;

/* ─── THE ROSTER — EDIT THIS LIST as tribunees join or leave ───────────
   One list for both the first-time seed and the migrations.
   · email: their @fiwa.sch.id address, or null if we don't have it yet.
     Only people WITH an email go on the allowlist (and so can unlock
     editing mode). Someone without one still gets a card on the About page.
   · admin: true for accounts that can manage the team, archive, and cases.
   · order: About-page order — editors, then operations, then
     journalists/writers, then production.
   When this list changes, bump SCHEMA_VERSION and add a migration step.
   ──────────────────────────────────────────────────────────────────── */
const ROSTER = [
  // Editors
  { name: 'Ammar Mufiid Johansyah',          email: 'ammar.mufiid@fiwa.sch.id',     role: 'Founder · Editor-in-Chief', grade: 'G9',  admin: true  },
  { name: 'Khalifah Agidra Filard',          email: 'khalifah.agidra@fiwa.sch.id',  role: 'Format Editor',             grade: 'G11', admin: false },
  { name: 'Muhammad Ananda Syamsuddin',      email: null,                           role: 'Fact-Checking Editor',      grade: 'G7',  admin: false },
  // Operations
  { name: 'Fathan Assyauqi Hiliry',          email: 'fathan.assyauqi@fiwa.sch.id',  role: 'Administrator',             grade: 'G8',  admin: true  },
  { name: 'Yahya Abdullah Mahmudi',          email: null,                           role: 'Coordinator',               grade: 'G8',  admin: false },
  { name: 'Aldebaran Gibran Altaf',          email: 'aldebaran.gibran@fiwa.sch.id', role: 'IT & Coding · Writer',      grade: 'G8',  admin: true  },
  { name: 'Muhammad Arza Zaydan Suralaga',   email: 'arza.zaydan1@fiwa.sch.id',     role: 'IT & Coding · Writer',      grade: 'G10', admin: false },
  // Journalists and writers
  { name: 'Akio Hideaka Takijoeddin',        email: 'akio.hideaka1@fiwa.sch.id',    role: 'Journalist',                grade: 'G9',  admin: false },
  { name: 'Fathan Rasyid',                   email: null,                           role: 'Journalist',                grade: 'G7',  admin: false },
  { name: 'Fathi Rizqi Ramadhan',            email: 'fathi.rizqi1@fiwa.sch.id',     role: 'Writer',                    grade: 'G12', admin: false },
  { name: 'Muhammad Ziya Ibrahim',           email: null,                           role: 'Writer (Science)',          grade: 'G10', admin: false },
  { name: 'Mohamad Zahran',                  email: null,                           role: 'Writer',                    grade: 'G7',  admin: false },
  { name: 'Kafa Althaf Habibi',              email: null,                           role: 'Writer',                    grade: 'G7',  admin: false },
  { name: 'Tubagus Attariza Rayyan Athaya',  email: null,                           role: 'Writer',                    grade: 'G7',  admin: false },
  { name: 'Yunus Mahdi Abdullah',            email: null,                           role: 'Writer',                    grade: 'G7',  admin: false },
  // Production
  { name: 'Muhammad Shahza Kentzhad Sakrade', email: 'shahza.muhammad1@fiwa.sch.id', role: 'Photographer',             grade: 'G10', admin: false }
].map((p, order) => ({ ...p, order }));

/* Print credits, counted from bylines in Editions I to V (Oct 2026).
   articles: one per story (a story split over sections or pages counts
   once), shared bylines counted for each writer. Left out: quizzes, the
   unprinted Edition 5 Student Challenge, and the "About us" pages that
   only describe Fitrah Tribune (Ammar's call, Oct 2026).
   editions: credited in that edition or named in its team list.
   Photos aren't credited per photo in print, so admins add those. */
const PRINT_CREDITS = {
  'Ammar Mufiid Johansyah':         { articles: 37, editions: [1, 2, 3, 4, 5] },
  'Khalifah Agidra Filard':         { articles: 2,  editions: [2, 3, 4, 5] },
  'Muhammad Ananda Syamsuddin':     { articles: 0,  editions: [5] },
  'Fathan Assyauqi Hiliry':         { articles: 7,  editions: [2, 3, 4, 5] },
  'Yahya Abdullah Mahmudi':         { articles: 0,  editions: [5] },
  'Aldebaran Gibran Altaf':         { articles: 2,  editions: [2, 3, 4, 5] },
  'Muhammad Arza Zaydan Suralaga':  { articles: 2,  editions: [2, 3, 4, 5] },
  'Akio Hideaka Takijoeddin':       { articles: 4,  editions: [2, 3, 4, 5] },
  'Fathan Rasyid':                  { articles: 2,  editions: [5] },
  'Fathi Rizqi Ramadhan':           { articles: 5,  editions: [2, 3, 4, 5] },
  'Muhammad Ziya Ibrahim':          { articles: 2,  editions: [4, 5] },
  'Mohamad Zahran':                 { articles: 1,  editions: [5] },
  'Kafa Althaf Habibi':             { articles: 1,  editions: [5] },
  'Tubagus Attariza Rayyan Athaya': { articles: 2,  editions: [5] },
  'Muhammad Shahza Kentzhad Sakrade': { articles: 0, editions: [3, 4, 5] }
};
const withPrintCredits = (t) => {
  const c = PRINT_CREDITS[t.name];
  if (!c) return t;
  const stats = t.stats || {};
  if (c.articles && !Number.isFinite(stats.articles)) t.stats = { ...stats, articles: c.articles };
  if (!Array.isArray(t.editions) || !t.editions.length) t.editions = c.editions.slice();
  return t;
};

/* Every roster member gets a fixed id made from their name, so a profile
   link (/tribunee/ammar-mufiid-johansyah) opens the same page for anyone. */
const tribuneeSlug = (name) => 'tri-' + name.toLowerCase().normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Tribunee and allowlist records built from ROSTER. */
const rosterTribunee = (p) => {
  const t = { id: tribuneeSlug(p.name), name: p.name, role: p.role, grade: p.grade, order: p.order };
  if (p.email) t.email = p.email;
  return withPrintCredits(t);
};
const rosterAllowlist = () => ROSTER.filter(p => p.email).map(p => ({ email: p.email, admin: p.admin }));

// Default categories, each inside one section (decided by Ammar, Oct 2026).
const DEFAULT_NEWS_TABS = [
  { label: 'Construction', section: 'internal' },
  { label: 'Sports', section: 'internal' },
  { label: 'Science & Technology', section: 'external' },
  { label: 'World', section: 'external' },
  { label: 'Indonesia', section: 'external' },
  { label: 'Sports', section: 'external' },
];
// Used by the v6 migration: the categories that were External News then.
const EXTERNAL_NEWS_TABS = ['Indonesia', 'World'];

async function migrateLegacyData() {
  const stored = localStorage.getItem('fitrah:schemaVersion');
  const current = stored ? parseInt(stored, 10) : 0;
  if (current >= SCHEMA_VERSION) return;

  if (current < 2) {
    // ─── v1 → v2 migration ────────────────────────────────────────────────
    // Rebuild the allowlist entirely — there is no user data on it to lose,
    // and the legacy shape uses the wrong emails and the old "founder" flag.
    const existingAllow = await Store.list('allowlist');
    if (existingAllow.length > 0) {
      for (const a of existingAllow) await Store.remove('allowlist', a.id);
    }
    // seedIfEmpty below will repopulate the allowlist from the canonical seed.

    // For tribunees, preserve bios/photos but patch missing emails and
    // insert any new members that weren't in the legacy roster.
    const canonicalTribunees = [
      { name: 'Ammar Mufiid Johansyah',  email: 'ammar.mufiid@fiwa.sch.id',      role: 'Founder · Graphics Designer',                  grade: 'G9',  order: 0 },
      { name: 'Aldebaraan Gibran Altaf', email: 'aldebaran.gibran@fiwa.sch.id',  role: 'Lead Developer · IT',                          grade: 'G8',  order: 1 },
      { name: 'Fathan Assyauqi Hiliry',  email: 'fathan.assyauqi@fiwa.sch.id',   role: 'Representative · Writer · EN/ID Translator',   grade: 'G8',  order: 2 },
      { name: 'Muhammad Shahza',         email: 'shahza.muhammad1@fiwa.sch.id',  role: 'Photographer',                                 grade: 'G10',  order: 3 },
      { name: 'Arza Zaydan',             email: 'arza.zaydan1@fiwa.sch.id',      role: 'Writer',                                       grade: 'G10',  order: 4 },
      { name: 'Akio Hideaka',            email: 'akio.hideaka1@fiwa.sch.id',     role: 'Writer',                                       grade: 'G9',  order: 5 },
      { name: 'Khalifah Agidra',         email: 'khalifah.agidra@fiwa.sch.id',   role: 'Writer',                                       grade: 'G11', order: 6 },
      { name: 'Fathi Rizqi',             email: 'fathi.rizqi1@fiwa.sch.id',      role: 'Writer',                                       grade: 'G12', order: 7 },
      { name: 'Naufal Rian',             email: 'naufal.rian1@fiwa.sch.id',      role: 'Writer',                                       grade: 'G12', order: 8 },
      { name: 'Muhammad Razqa Abyan',    email: 'muhammad.razqa@fiwa.sch.id',    role: 'Writer',                                       grade: 'G8',  order: 9 }
    ];
    // Old defaults we're allowed to silently overwrite — any custom role
    // edited by a tribunee themselves is left alone.
    const OLD_FATHAN_ROLE = 'Writer · EN/ID Translator';

    const existingTribunees = await Store.list('tribunees');
    if (existingTribunees.length > 0) {
      // 1. Patch existing records: attach email + bump Fathan's stale role.
      for (const t of existingTribunees) {
        const canon = canonicalTribunees.find(c => c.name === t.name);
        let dirty = false;
        if (canon && !t.email) {
          t.email = canon.email;
          dirty = true;
        }
        if (t.name === 'Fathan Assyauqi Hiliry' && t.role === OLD_FATHAN_ROLE) {
          t.role = canon.role;
          dirty = true;
        }
        if (dirty) await Store.save('tribunees', t);
      }
      // 2. Insert any canonical tribunees missing from the existing roster
      //    (this picks up Shahza and Razqa for browsers that already had data).
      const existingNames = new Set(existingTribunees.map(t => t.name));
      for (const canon of canonicalTribunees) {
        if (!existingNames.has(canon.name)) {
          await Store.save('tribunees', canon);
        }
      }
    }
    // If existingTribunees was empty, seedIfEmpty below handles it cleanly.
  }

  // ─── v2 → v3 migration ────────────────────────────────────────────────
  // The Forum is no longer a discussion board — it is a Tribune feed
  // (announcements + general posts, no comments). Legacy threads and
  // comments are demo scaffolding with nothing worth preserving, so they
  // are wiped. Surviving posts would carry the wrong category anyway.
  if (current < 3) {
    for (const c of await Store.list('comments')) await Store.remove('comments', c.id);
    for (const t of await Store.list('threads'))  await Store.remove('threads', t.id);
  }

  // ─── v3 → v4 migration (roster update, Oct 2026) ───────────────────────
  // People are matched by email. Bios and photos are always kept. Name,
  // role and grade are overwritten only if they still hold the value the
  // v3 seed gave them, so anything a tribunee or admin edited stays put.
  // Runs only on browsers that already have data; a fresh browser gets
  // the new roster from seedIfEmpty below.
  if (current < 4) {
    const V3_SEED = {
      'ammar.mufiid@fiwa.sch.id':     { name: 'Ammar Mufiid Johansyah',  role: 'Founder · Graphics Designer',                grade: 'G9'  },
      'aldebaran.gibran@fiwa.sch.id': { name: 'Aldebaraan Gibran Altaf', role: 'Lead Developer · IT',                        grade: 'G8'  },
      'fathan.assyauqi@fiwa.sch.id':  { name: 'Fathan Assyauqi Hiliry',  role: 'Representative · Writer · EN/ID Translator', grade: 'G8'  },
      'shahza.muhammad1@fiwa.sch.id': { name: 'Muhammad Shahza',         role: 'Photographer',                               grade: 'G10' },
      'arza.zaydan1@fiwa.sch.id':     { name: 'Arza Zaydan',             role: 'Writer',                                     grade: 'G10' },
      'akio.hideaka1@fiwa.sch.id':    { name: 'Akio Hideaka',            role: 'Writer',                                     grade: 'G9'  },
      'khalifah.agidra@fiwa.sch.id':  { name: 'Khalifah Agidra',         role: 'Writer',                                     grade: 'G11' },
      'fathi.rizqi1@fiwa.sch.id':     { name: 'Fathi Rizqi',             role: 'Writer',                                     grade: 'G12' }
    };
    const REMOVED = ['naufal.rian1@fiwa.sch.id', 'muhammad.razqa@fiwa.sch.id'];
    const emailOf = (x) => (x.email || '').toLowerCase();

    // Allowlist: drop the people who left; make sure everyone on the
    // roster with an email is on it, with the right admin flag.
    const allow = await Store.list('allowlist');
    if (allow.length > 0) {
      for (const a of allow) {
        if (REMOVED.includes(emailOf(a))) await Store.remove('allowlist', a.id);
      }
      for (const want of rosterAllowlist()) {
        const have = allow.find(a => emailOf(a) === want.email);
        if (!have) await Store.save('allowlist', want);
        else if (!!have.admin !== want.admin) await Store.save('allowlist', { ...have, admin: want.admin });
      }
    }

    // Tribunees.
    const people = await Store.list('tribunees');
    if (people.length > 0) {
      for (const t of people) {
        if (REMOVED.includes(emailOf(t))) await Store.remove('tribunees', t.id);
      }
      for (const p of ROSTER) {
        if (p.email) {
          const t = people.find(x => emailOf(x) === p.email);
          if (!t) { await Store.save('tribunees', rosterTribunee(p)); continue; }
          const old = V3_SEED[p.email] || {};
          if (t.name  === old.name)  t.name  = p.name;
          if (t.role  === old.role)  t.role  = p.role;
          if (t.grade === old.grade) t.grade = p.grade;
          t.order = p.order;
          await Store.save('tribunees', t);   // bio, photo, aspect/fit untouched
        } else if (!people.some(x => x.name === p.name)) {
          await Store.save('tribunees', rosterTribunee(p));
        }
      }
    }

    // News categories: seed the four defaults once, only if there are none.
    if ((await Store.list('newsTabs')).length === 0) {
      for (const { label, section } of DEFAULT_NEWS_TABS) {
        await Store.save('newsTabs', { label, section, subtabs: [] });
      }
    }
  }

  // ─── v4 → v5 migration (fixed profile ids, Oct 2026) ───────────────────
  // Roster members used to get a random id per browser, so a shared profile
  // link opened nothing for anyone else. Move each roster member's record to
  // the fixed id from tribuneeSlug(), matched by email, else by roster name.
  // The record itself (bio, photo, edits) moves across unchanged.
  if (current < 5) {
    const people = await Store.list('tribunees');
    const emailOf = (x) => (x.email || '').toLowerCase();
    for (const p of ROSTER) {
      const id = tribuneeSlug(p.name);
      if (people.some(x => x.id === id)) continue;
      const t = people.find(x => (p.email && emailOf(x) === p.email)) || people.find(x => x.name === p.name);
      if (!t) continue;
      await Store.remove('tribunees', t.id);
      t.id = id;
      await Store.save('tribunees', t);
    }
  }

  // ─── v5 → v6 migration (Internal / External News, Oct 2026) ───────────
  // Articles now sit in one of two sections and categories are optional.
  // Indonesia and World stories become External News, the rest Internal;
  // those two categories move into External News, the rest show in both.
  if (current < 6) {
    const tabs = await Store.list('newsTabs');
    for (const t of tabs) {
      if (t.section === undefined) {
        t.section = EXTERNAL_NEWS_TABS.includes(t.label) ? 'external' : '';
        await Store.save('newsTabs', t);
      }
    }
    for (const a of await Store.list('articles')) {
      if (a.section) continue;
      const label = tabs.find(t => t.id === a.tab)?.label;
      a.section = EXTERNAL_NEWS_TABS.includes(label) ? 'external' : 'internal';
      await Store.save('articles', a);
    }
  }

  // ─── v6 → v7 migration (two tiers only, Oct 2026) ─────────────────────
  // Sections → categories; sub-categories are gone. Every category now sits
  // in exactly one section: "Technology/Science" becomes "Science &
  // Technology", the old defaults and any "both" category go to External
  // News, and Construction and Sports are added under Internal News. An
  // article keeps its section; if its category now sits in the other
  // section, it moves to the category with the same name in its own
  // section, or loses its category if there is none.
  if (current < 7) {
    const tabs = await Store.list('newsTabs');
    for (const t of tabs) {
      if (t.label === 'Technology/Science') t.label = 'Science & Technology';
      if (t.section !== 'internal') t.section = 'external';
      t.subtabs = [];
      await Store.save('newsTabs', t);
    }
    for (const label of ['Construction', 'Sports']) {
      if (tabs.length && !tabs.some(t => t.label === label && t.section === 'internal')) {
        tabs.push(await Store.save('newsTabs', { label, section: 'internal', subtabs: [] }));
      }
    }
    for (const a of await Store.list('articles')) {
      const tab = tabs.find(t => t.id === a.tab);
      if (!a.subtab && (!a.tab || (tab && tab.section === a.section))) continue;
      a.subtab = '';
      if (a.tab && (!tab || tab.section !== a.section)) {
        a.tab = tabs.find(t => tab && t.label === tab.label && t.section === a.section)?.id || '';
      }
      await Store.save('articles', a);
    }
  }

  // ─── v7 → v8 migration (Sports under Internal News too, Oct 2026) ──────
  // Browsers that already ran v7 before Sports was added to Internal News.
  if (current < 8 && current >= 7) {
    const tabs = await Store.list('newsTabs');
    if (tabs.length && !tabs.some(t => t.label === 'Sports' && t.section === 'internal')) {
      await Store.save('newsTabs', { label: 'Sports', section: 'internal', subtabs: [] });
    }
  }

  // ─── v8 → v9 migration (feedback form with kinds, Oct 2026) ─────────
  // Older tickets predate the kind and name choices. They were sent under
  // the reader's own name, so it stays visible to the editors.
  if (current < 9) {
    for (const c of await Store.list('cases')) {
      if (c.kind) continue;
      c.kind = 'other';
      c.showName = true;
      c.status = c.status === 'resolved' ? 'checked'
        : (await Store.list('casemsgs', m => m.caseId === c.id && m.side === 'tribune')).length ? 'progress' : 'received';
      c.articleId = c.articleId || '';
      c.articleTitle = c.articleTitle || '';
      await Store.save('cases', c);
    }
  }

  // ─── v9 → v10 migration (roster, Oct 2026) ─────────────────────────────
  // Muhammad Baary Salman has left FIWA, so his card comes off the team.
  if (current < 10) {
    for (const t of await Store.list('tribunees')) {
      if (t.name === 'Muhammad Baary Salman') await Store.remove('tribunees', t.id);
    }
  }

  // ─── v10 → v11 migration (print credits, Oct 2026) ─────────────────────
  // Fill in each Tribunee's print credits, leaving any an admin already set.
  if (current < 11) {
    for (const t of await Store.list('tribunees')) {
      if (PRINT_CREDITS[t.name]) await Store.save('tribunees', withPrintCredits(t));
    }
  }

  localStorage.setItem('fitrah:schemaVersion', String(SCHEMA_VERSION));
}

/* =====================================================================
   SEED — only the absolute minimum the system needs to function:
   · An allowlist of tribunee emails so editing mode is unlockable
     (with admin: true marking which accounts can manage the team and archive)
   · The named tribunees as cards (name + email + role + grade only)
   ===================================================================== */

async function seedIfEmpty() {
  // Allowlist — at least one tribunee email so the editor role is reachable
  const allowlist = await Store.list('allowlist');
  if (allowlist.length === 0) {
    /* Built from ROSTER (top of this section): everyone with an email.
       An email here, paired with a FIWA-tier sign-in, unlocks editing mode.
       admin: true accounts can also add/remove tribunees, edit other
       tribunees' profiles, manage archive editions, and act on cases.
       All emails are stored lowercase. Sign-in is case-insensitive. */
    const seedAllow = rosterAllowlist();
    for (const a of seedAllow) await Store.save('allowlist', a);
  }

  // Tribunees — names + roles + grades only, no bios (they fill those in)
  const tribunees = await Store.list('tribunees');
  if (tribunees.length === 0) {
    const seedT = ROSTER.map(rosterTribunee);
    for (const t of seedT) await Store.save('tribunees', t);
  }

  await seedDemoArticles();
  await seedDemoPlaceholders();
}

/* Placeholder articles from Edition 5 (public/fitr-demo-articles.js), so the
   pages have something to show while the site is built. Seeded once, and
   only into a browser with no articles of its own. Remove before launch. */
async function seedDemoArticles() {
  const demo = window.FITR_DEMO_ARTICLES;
  if (!Array.isArray(demo) || localStorage.getItem('fitrah:demoSeeded')) return;
  localStorage.setItem('fitrah:demoSeeded', '1');
  if ((await Store.list('articles')).length > 0) return;

  const tabs = await Store.list('newsTabs');
  const published = Date.UTC(2026, 9, 21, 1, 0);   // 21 Oct 2026, 08:00 WIB
  for (const [i, d] of demo.entries()) {
    const { featured, tabLabel, ...article } = d;
    await Store.save('articles', {
      ...article,
      tab: tabs.find(t => t.label === tabLabel && t.section === article.section)?.id || '',
      subtab: '',
      visibility: 'public',
      lang: 'en',
      coverAspect: 16 / 9,
      coverFit: 'crop',
      createdAt: published - i * 60000,
    });
    if (featured !== undefined) {
      await Store.save('featured', { articleId: article.id, order: featured });
    }
  }
}

// Second demo step (Oct 2026): the rest of Edition 5, so every category has
// an article. It also files all the demo stories under the current
// categories (they changed in v7). Runs once per browser per version
// (fitrah:demoPlaceholders), even if the browser already has articles.
async function seedDemoPlaceholders() {
  const items = window.FITR_DEMO_PLACEHOLDERS;
  const first = window.FITR_DEMO_ARTICLES;
  if (!Array.isArray(items) || localStorage.getItem('fitrah:demoPlaceholders') === '2') return;
  localStorage.setItem('fitrah:demoPlaceholders', '2');

  const tabs = await Store.list('newsTabs');
  const tabFor = (label, section) => tabs.find(t => t.label === label && t.section === section)?.id || '';
  const existing = await Store.list('articles');
  for (const { id, tabLabel } of Array.isArray(first) ? first : []) {
    const a = existing.find(x => x.id === id);
    if (a) { a.tab = tabFor(tabLabel, a.section); a.subtab = ''; await Store.save('articles', a); }
  }
  const published = Date.UTC(2026, 9, 21, 1, 0);   // 21 Oct 2026, 08:00 WIB
  for (const [i, { tabLabel, ...article }] of items.entries()) {
    const old = existing.find(x => x.id === article.id);
    if (old) { old.tab = tabFor(tabLabel, old.section); old.subtab = ''; await Store.save('articles', old); continue; }
    await Store.save('articles', {
      coverAspect: 16 / 9,
      coverFit: 'crop',
      ...article,
      edition: 5,
      tab: tabFor(tabLabel, article.section),
      subtab: '',
      visibility: 'public',
      lang: 'en',
      createdAt: published - (10 + i) * 60000,
    });
  }
}

/* =====================================================================
   BOOTSTRAP
   ===================================================================== */

/* =====================================================================
   BOOT
   ─────────────────────────────────────────────────────────────────────
   FITR.ready       data is migrated, seeded, and the user is known.
   FITR.mountChrome fills the nav and user area; Layout.jsx calls it once
                    the header exists in the DOM.
   ===================================================================== */

const ready = (async () => {
  await migrateLegacyData();
  await seedIfEmpty();
  await Auth.refresh();

  // React unmounts pages it isn't showing. Any render() for a page that is
  // not on screen (e.g. the forum refreshing the home preview) is a no-op,
  // and a render interrupted by navigating away is dropped quietly.
  Object.keys(Pages).forEach(key => {
    const original = Pages[key].render;
    if (typeof original !== 'function') return;
    Pages[key].render = async function (...args) {
      if (!document.getElementById('page-' + key)) return;
      try { return await original.apply(this, args); }
      catch (e) { if (document.getElementById('page-' + key)) throw e; }
    };
  });
})();

let chromeMounted = false;
async function mountChrome() {
  await ready;
  // Editing mode survives a page reload (per browser tab).
  try {
    if (sessionStorage.getItem('fitrah:editing') === '1' && await Auth.isTribunee()) {
      Editor.active = true;
      document.body.classList.add('editing');
      $('#edit-banner').style.display = 'flex';
      // The page may have drawn itself before this check finished.
      Pages[Router.current]?.render?.(Router.params);
    }
  } catch (e) {}
  await renderTabs();
  await renderUserArea();
  if (!chromeMounted) {
    chromeMounted = true;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.close(); });
  }
}

/* The only door between the engine and React. */
window.FITR = {
  ready, mountChrome, renderTabs, renderUserArea,
  Router, Pages, Auth, Store, Editor, Modal, SignIn, toast
};
