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
    const name = email.split('@')[0]
      .split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
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
    this._user = await Store.getCurrentUser();
    await this._syncBodyClasses();
    return this.current();
  },

  current() {
    return this._user || { email: null, tier: 'guest', name: 'Guest' };
  },

  async signIn(email, password) {
    const user = await Store.signIn(email, password);
    this._user = user;
    await this._syncBodyClasses();
    return user;
  },

  async signOut() {
    await Store.signOut();
    this._user = null;
    await this._syncBodyClasses();
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
    if (Editor._articleState && Editor._articleState.bodyEditor && Editor._articleState.bodyEditor.destroy) {
      try { Editor._articleState.bodyEditor.destroy(); } catch (e) {}
      Editor._articleState.bodyEditor = null;
    }
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
  tribunee:    '/tribunee'
};

const Router = {
  current: 'home',
  params: {},
  _navigate: null,                       // set by App.jsx

  go(path) {
    if (typeof path !== 'string' || !path) path = 'home';
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
      setTimeout(() => $('#fc-subject')?.focus(), 520);
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
  empty:   `<svg class="es-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M32 8L24 24v18l8 16 8-16V24L32 8z"/><circle cx="32" cy="28" r="3" fill="currentColor"/><circle cx="14" cy="20" r="1" fill="currentColor"/><circle cx="50" cy="22" r="1" fill="currentColor"/><circle cx="48" cy="40" r="1" fill="currentColor"/></svg>`
};

/* =====================================================================
   TABS / NAV RENDERING
   ===================================================================== */

const NAV_TABS = [
  { id: 'home',        label: 'Home',        icon: 'home' },
  { id: 'news',        label: 'News',        icon: 'news' },
  { id: 'archive',     label: 'Archive',     icon: 'archive' },
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

  newArticle(existing = null) {
    const a = existing || {};
    const isEditing = !!(existing && a.id);
    const articleState = {
      coverImage: a.coverImage || null,
      coverAspect: parseAspect(a.coverAspect, 16/9),
      coverFit: a.coverFit === 'letterbox' ? 'letterbox' : 'crop',
      bodyEditor: null
    };

    Modal.open({
      title: isEditing ? 'Edit article' : 'New article',
      wide: true,
      body: `
        ${!isEditing ? `
          <div class="pdf-import-row">
            <div class="pdf-icon">PDF</div>
            <div class="pdf-text">
              <strong>Import from PDF</strong> — text gets dropped into the editor; images go at the bottom for you to place.
            </div>
            <button id="pdf-import-btn">Choose PDF</button>
          </div>
        ` : ''}

        <div class="field">
          <label>Cover image (optional)</label>
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
            <div class="afp-hint">Crop trims the source to fit; letterbox preserves every pixel and fills the slack with cream so nothing is lost.</div>
          </div>
          <div class="cover-preview afp-preview" id="cover-preview" style="aspect-ratio: ${articleState.coverAspect};">
            ${articleState.coverImage
              ? `<img src="${articleState.coverImage}" alt="" /><button type="button" class="cover-clear" id="cover-clear">×</button>`
              : 'Click to upload cover image'}
          </div>
        </div>

        <div class="field">
          <label>Category (top-level tab)</label>
          <select id="art-tab"></select>
        </div>
        <div class="field">
          <label>Sub-category (optional)</label>
          <select id="art-subtab"><option value="">— None —</option></select>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Visibility</label>
            <select id="art-visibility">
              <option value="public" ${a.visibility !== 'fiwa' ? 'selected' : ''}>Public — visible to everyone</option>
              <option value="fiwa" ${a.visibility === 'fiwa' ? 'selected' : ''}>FIWA only — hidden from non-FIWA</option>
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
          <label>Title</label>
          <input type="text" id="art-title" value="${escapeHtml(a.title || '')}" placeholder="Article headline" />
        </div>
        <div class="field">
          <label>Deck (subtitle / one-line summary)</label>
          <input type="text" id="art-deck" value="${escapeHtml(a.deck || '')}" placeholder="A brief summary shown under the title" />
        </div>
        <div class="field">
          <label>Body</label>
          <div id="art-body-editor"></div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Author (byline)</label>
            <input type="text" id="art-author" value="${escapeHtml(a.author || Auth.current().name)}" />
          </div>
          <div class="field">
            <label>Edition number (optional)</label>
            <input type="number" id="art-edition" value="${a.edition || ''}" placeholder="e.g. 2" />
          </div>
        </div>
        ${isEditing ? `
          <div class="field" style="background: var(--paper-deep); padding: 0.9rem 1rem; border-left: 3px solid var(--gold);">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="art-log-correction" style="width: auto;" />
              <span style="text-transform: none; letter-spacing: 0; font-family: var(--sans); font-size: 0.9rem; color: var(--ink);">Log this edit as a public correction</span>
            </label>
            <div class="field-hint" style="margin-top: 0.4rem;">If checked, this change appears on the Corrections page (article itself stays clean).</div>
            <input type="text" id="art-correction-note" placeholder="What was corrected? (e.g. 'Misspelled name', 'Wrong date')" style="margin-top: 0.6rem; display: none;" />
          </div>
        ` : ''}
      `,
      foot: `
        ${isEditing ? `<button class="btn-ghost" style="margin-right: auto; color: #c0392b;" onclick="Editor.deleteArticle('${a.id}')">Delete</button>` : ''}
        <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn-navy" onclick="Editor.saveArticle(${a.id ? `'${a.id}'` : 'null'})">${isEditing ? 'Save changes' : 'Publish'}</button>
      `
    });

    // Make modal fullscreen-ish for the rich editor
    $('#modal-shell').classList.add('fullscreen');

    // Wire everything up after DOM exists
    setTimeout(async () => {
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
      tabSelect.innerHTML = '<option value="">— Select category —</option>' +
        tabs.map(t => `<option value="${t.id}" ${a.tab === t.id ? 'selected' : ''}>${escapeHtml(t.label)}</option>`).join('');
      const refreshSubtabs = () => {
        const subSelect = $('#art-subtab');
        const tab = tabs.find(t => t.id === tabSelect.value);
        const subs = tab && tab.subtabs ? tab.subtabs : [];
        subSelect.innerHTML = '<option value="">— None —</option>' +
          subs.map(s => `<option value="${escapeHtml(s)}" ${a.subtab === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
      };
      tabSelect.onchange = refreshSubtabs;
      refreshSubtabs();

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
              previewEl.innerHTML = 'Click to upload cover image';
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
          previewEl.innerHTML = 'Click to upload cover image';
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
    }, 50);

    // Stash state on the editor for saveArticle to retrieve
    Editor._articleState = articleState;
  },

  async saveArticle(id) {
    const state = Editor._articleState || {};
    const item = id ? (await Store.get('articles', id)) || {} : {};
    item.title = $('#art-title').value.trim();
    item.deck = $('#art-deck').value.trim();
    item.body = state.bodyEditor ? state.bodyEditor.getHTML() : '';
    item.author = $('#art-author').value.trim();
    item.authorEmail = item.authorEmail || Auth.current().email;
    item.tab = $('#art-tab').value;
    item.subtab = $('#art-subtab').value;
    item.visibility = $('#art-visibility').value;
    item.lang = $('#art-lang').value;
    item.coverImage = state.coverImage || null;
    item.coverAspect = parseAspect(state.coverAspect, 16/9);
    item.coverFit = state.coverFit === 'letterbox' ? 'letterbox' : 'crop';
    const ed = $('#art-edition').value;
    item.edition = ed ? parseInt(ed, 10) : null;

    if (!item.title) { toast('Title is required', 'error'); return; }
    if (!item.tab)   { toast('Category is required', 'error'); return; }

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

    $('#modal-shell').classList.remove('fullscreen');
    Modal.close();
    Editor._articleState = null;

    // If currently viewing the article being saved, re-render it
    if (Router.current === 'article' && Router.params.id === saved.id) {
      Pages.article.render(Router.params);
    } else {
      Pages[Router.current]?.render?.(Router.params);
    }
    toast(id ? 'Article updated' : 'Article published', 'success');
  },

  async deleteArticle(id) {
    if (!confirm('Delete this article? This cannot be undone.')) return;
    await Store.remove('articles', id);
    $('#modal-shell').classList.remove('fullscreen');
    Modal.close();
    if (Router.current === 'article') {
      Router.go('news');
    } else {
      Pages[Router.current]?.render?.(Router.params);
    }
    toast('Article deleted');
  },

  async deleteArticleAndReturn(id) {
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
        <p style="font-family: var(--serif); line-height: 1.5; margin-bottom: 1.1rem; font-size: 1rem; color: var(--ink-soft);">
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

    // Admins can edit identity fields (name, email, role, grade).
    // Non-admins editing their own card can only update the photo and bio.
    const identityReadOnly = isEditing && !isAdmin ? 'readonly' : '';
    const identityHint = isEditing && !isAdmin
      ? '<div class="field-hint" style="margin-bottom: 0.8rem; color: var(--ink-muted);">Name, role, and grade are managed by admins. You can update your photo and bio below.</div>'
      : '';

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
              <div class="field"><label>Role</label><input type="text" id="tr-role" value="${escapeHtml(t.role || '')}" placeholder="e.g. Writer, Translator" ${identityReadOnly} /></div>
              <div class="field"><label>Grade</label><input type="text" id="tr-grade" value="${escapeHtml(t.grade || '')}" placeholder="e.g. G8" ${identityReadOnly} /></div>
            </div>
            <div class="field-hint">Click the portrait to upload a photo. If left empty, a placeholder with initials is used.</div>
          </div>
        </div>
        <div class="field">
          <label>Bio (in their own words)</label>
          <div id="tr-bio-editor"></div>
        </div>
      `,
      foot: `
        ${isEditing && isAdmin ? `<button class="btn-ghost" style="margin-right: auto; color: #c0392b;" onclick="Editor.deleteTribunee('${t.id}')">Remove</button>` : ''}
        <button class="btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn-navy" onclick="Editor.saveTribunee(${t.id ? `'${t.id}'` : 'null'})">${isEditing ? 'Save' : 'Add'}</button>
      `
    });

    $('#modal-shell').classList.add('fullscreen');

    setTimeout(() => {
      // Mount rich bio editor (no images allowed)
      const mount = RichEditor.mount($('#tr-bio-editor'), {
        initial: t.bio || '',
        placeholder: 'Tell readers about yourself — your interests, what you write about, why you joined Fitrah Tribune…',
        allowImages: false
      });
      tribuneeState.bioEditor = mount;

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
    }

    t.bio = state.bioEditor ? state.bioEditor.getHTML() : (existing.bio || '');
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
    Store.list('newsTabs').then(tabs => {
      Modal.open({
        title: 'Manage News Categories',
        body: `
          <div class="field-hint" style="margin-bottom: 1rem;">Add top-level tabs. Each tab can have sub-tabs (e.g. "Sports" → "Football", "Motorsport").</div>
          <div id="tab-list">
            ${tabs.map(t => `
              <div class="field" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; align-items: end;" data-tab-id="${t.id}">
                <div>
                  <label>Label</label>
                  <input type="text" value="${escapeHtml(t.label)}" data-tab-label />
                </div>
                <div>
                  <label>Sub-tabs (comma separated)</label>
                  <input type="text" value="${escapeHtml((t.subtabs || []).join(', '))}" data-tab-subs />
                </div>
                <button class="btn-ghost" onclick="Editor.removeTab('${t.id}')" style="padding: 0.7rem;">×</button>
              </div>
            `).join('')}
          </div>
          <div class="field" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; align-items: end; padding-top: 1rem; border-top: 1px dashed var(--rule);">
            <div><label>New label</label><input type="text" id="new-tab-label" placeholder="e.g. Sports" /></div>
            <div><label>Sub-tabs</label><input type="text" id="new-tab-subs" placeholder="e.g. Football, Motorsport" /></div>
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
    const label = $('#new-tab-label').value.trim();
    const subsRaw = $('#new-tab-subs').value.trim();
    if (!label) { toast('Label required', 'error'); return; }
    const subs = subsRaw ? subsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    await Store.save('newsTabs', { label, subtabs: subs });
    Editor.manageTabs();
    Pages.news.render();
    toast('Category added', 'success');
  },

  async removeTab(id) {
    if (!confirm('Remove this category? Articles tagged with it will lose their category.')) return;
    await Store.remove('newsTabs', id);
    Editor.manageTabs();
    Pages.news.render();
  },

  async saveTabs() {
    const rows = $$('#tab-list > .field');
    for (const row of rows) {
      const id = row.dataset.tabId;
      const label = row.querySelector('[data-tab-label]').value.trim();
      const subsRaw = row.querySelector('[data-tab-subs]').value.trim();
      const subs = subsRaw ? subsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
      const t = await Store.get('newsTabs', id);
      if (t) {
        t.label = label;
        t.subtabs = subs;
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
                  <div style="font-family: var(--serif); font-weight: 500; color: var(--ink);">${escapeHtml(a.title)}</div>
                  <div style="font-size: 0.78rem; color: var(--ink-muted); margin-top: 0.2rem;">By ${escapeHtml(a.author)} · ${escapeHtml(a.tabLabel || '—')}</div>
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

    // Wire up buttons
    toolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        const arg = btn.dataset.arg;
        editor.focus();
        if (cmd === 'image') {
          if (allowImages) this._insertImage(editor);
        } else if (cmd === 'foreColor') {
          document.execCommand('foreColor', false, arg);
        } else if (cmd === 'formatBlock') {
          document.execCommand('formatBlock', false, arg);
        } else {
          document.execCommand(cmd, false, null);
        }
      });
    });

    // Track the selection inside the editor so dropdowns (which steal focus
    // when opened) don't lose it. We save on mousedown of the dropdown and
    // restore on change. Without this, the bio editor breaks because the
    // modal stacking context swallows the selection.
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
    // Save whenever the user changes selection inside the editor.
    editor.addEventListener('keyup',   _saveSelection);
    editor.addEventListener('mouseup', _saveSelection);
    editor.addEventListener('focus',   _saveSelection);
    editor.addEventListener('blur',    _saveSelection);

    toolbar.querySelectorAll('select[data-cmd]').forEach(sel => {
      // Save the live selection BEFORE the native dropdown opens and steals focus.
      sel.addEventListener('mousedown', () => _saveSelection());
      sel.addEventListener('change', () => {
        const cmd = sel.dataset.cmd;
        const value = sel.value;
        editor.focus();
        // Restore the selection that existed before the dropdown opened.
        _restoreSelection();
        if (cmd === 'formatBlock') {
          document.execCommand('formatBlock', false, value);
          sel.selectedIndex = 0;
        } else if (cmd === 'fontName') {
          this._applyInlineStyle(editor, 'font-family', `'${value}', serif`);
          // Reflect the chosen font in the closed dropdown's own appearance.
          sel.style.fontFamily = `'${value}', serif`;
        } else if (cmd === 'fontSize') {
          // Map old execCommand sizes (1–7) to readable rem sizes
          const pxMap = { '1': '0.7rem', '2': '0.85rem', '3': '1rem', '4': '1.15rem', '5': '1.4rem', '6': '1.7rem', '7': '2.1rem' };
          this._applyInlineStyle(editor, 'font-size', pxMap[value] || '1rem');
        }
        // Save the new (post-edit) selection so successive dropdown changes stack.
        _saveSelection();
      });
    });

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
    const _onDocClick = (e) => {
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
        this._removeHandles();
      }
    };
  },

  _toolbarHTML(allowImages) {
    return `
      <div class="rte-tool-group">
        <select class="rte-tool" data-cmd="formatBlock" title="Block style">
          <option value="">— Style —</option>
          <option value="p">Body</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
          <option value="blockquote">Quote</option>
        </select>
      </div>
      <div class="rte-tool-group">
        <select class="rte-tool" data-cmd="fontName" title="Font" style="min-width: 130px;">
          <optgroup label="Site fonts">
            <option value="Fraunces" style="font-family:'Fraunces',serif">Fraunces</option>
            <option value="Albert Sans" style="font-family:'Albert Sans',sans-serif">Albert Sans</option>
            <option value="Bitter" style="font-family:'Bitter',serif">Bitter</option>
          </optgroup>
          <optgroup label="Editorial">
            <option value="IM Fell English SC" style="font-family:'IM Fell English SC',serif">IM Fell English SC</option>
            <option value="Special Elite" style="font-family:'Special Elite',monospace">Special Elite</option>
            <option value="Crimson Pro" style="font-family:'Crimson Pro',serif">Crimson Pro</option>
            <option value="Times New Roman" style="font-family:'Times New Roman',serif">Times New Roman</option>
          </optgroup>
        </select>
        <select class="rte-tool" data-cmd="fontSize" title="Size">
          <option value="2">XS</option>
          <option value="3" selected>S</option>
          <option value="4">M</option>
          <option value="5">L</option>
          <option value="6">XL</option>
          <option value="7">XXL</option>
        </select>
      </div>
      <div class="rte-tool-group">
        <button class="rte-tool" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
        <button class="rte-tool" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
        <button class="rte-tool" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
        <button class="rte-tool" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
      </div>
      <div class="rte-tool-group" title="Text color">
        <button class="rte-tool" data-cmd="foreColor" data-arg="#1a1814" title="Black"><span class="rte-color-dot" style="background:#1a1814"></span></button>
        <button class="rte-tool" data-cmd="foreColor" data-arg="#1c3658" title="Navy"><span class="rte-color-dot" style="background:#1c3658"></span></button>
        <button class="rte-tool" data-cmd="foreColor" data-arg="#c08e3a" title="Gold"><span class="rte-color-dot" style="background:#c08e3a"></span></button>
        <button class="rte-tool" data-cmd="foreColor" data-arg="#a73e3e" title="Red"><span class="rte-color-dot" style="background:#a73e3e"></span></button>
        <button class="rte-tool" data-cmd="foreColor" data-arg="#3e7a4a" title="Green"><span class="rte-color-dot" style="background:#3e7a4a"></span></button>
        <button class="rte-tool" data-cmd="foreColor" data-arg="#877f6e" title="Muted"><span class="rte-color-dot" style="background:#877f6e"></span></button>
      </div>
      <div class="rte-tool-group">
        <button class="rte-tool" data-cmd="justifyLeft" title="Align left">⬅</button>
        <button class="rte-tool" data-cmd="justifyCenter" title="Center">↔</button>
        <button class="rte-tool" data-cmd="justifyRight" title="Align right">➡</button>
      </div>
      <div class="rte-tool-group">
        <button class="rte-tool" data-cmd="insertUnorderedList" title="Bulleted list">•</button>
        <button class="rte-tool" data-cmd="insertOrderedList" title="Numbered list">1.</button>
      </div>
      ${allowImages ? `
      <div class="rte-tool-group">
        <button class="rte-tool" data-cmd="image" title="Insert image" style="font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.1em;">+ IMG</button>
      </div>
      ` : ''}
    `;
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
      // Wrap the selected fragment in a styled span
      const span = document.createElement('span');
      span.style.setProperty(prop, value);
      try {
        // surroundContents fails if the selection crosses element boundaries.
        // In that case, fall back to extracting+wrapping which handles partial
        // overlaps gracefully.
        range.surroundContents(span);
      } catch (e) {
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      }
      // Reselect the wrapped content so consecutive style changes stack
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  },

  _attachResizeHandle(img, editor) {
    this._removeHandles();
    const wrap = editor.parentElement;
    if (!wrap) return;
    wrap.style.position = 'relative';

    const handle = document.createElement('div');
    handle.className = 'rte-resize-handle';
    wrap.appendChild(handle);

    const positionHandle = () => {
      const imgRect = img.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      handle.style.left = (imgRect.right - wrapRect.left - 7) + 'px';
      handle.style.top  = (imgRect.bottom - wrapRect.top - 7) + 'px';
    };
    positionHandle();

    let resizing = false;
    let startX = 0, startW = 0, startH = 0, ratio = 1, freeAspect = false;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      resizing = true;
      startX = e.clientX;
      startW = img.offsetWidth;
      startH = img.offsetHeight;
      ratio = startW / startH;
      freeAspect = e.shiftKey;
    });

    const onMove = (e) => {
      if (!resizing) return;
      const dx = e.clientX - startX;
      const newW = Math.max(80, startW + dx);
      img.style.width = newW + 'px';
      if (!freeAspect) {
        img.style.height = (newW / ratio) + 'px';
      }
      positionHandle();
    };
    const onUp = () => {
      if (resizing) {
        resizing = false;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    handle._cleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
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
      const coverClass = (a) => a.coverImage ? '' : 'placeholder';
      fa.innerHTML = `
        <div class="featured-grid">
          <article class="featured-main" onclick="Pages.news.openArticle('${main.id}')">
            <div class="feat-img ${coverClass(main)}" ${coverStyle(main)}></div>
            <div class="feat-cat">${escapeHtml(main.tabLabel || 'News')}</div>
            <h3 class="feat-title">${escapeHtml(main.title)}</h3>
            <p class="feat-deck">${escapeHtml(main.deck || '')}</p>
            <div class="feat-byline">
              <span>By <span class="author">${escapeHtml(main.author)}</span></span>
              <span>${formatDate(main.createdAt)}</span>
            </div>
          </article>
          <div class="featured-side">
            ${sides.length ? sides.map(a => `
              <article class="featured-card" onclick="Pages.news.openArticle('${a.id}')">
                <div class="feat-img ${coverClass(a)}" ${coverStyle(a)}></div>
                <div class="feat-cat">${escapeHtml(a.tabLabel || 'News')}</div>
                <h3 class="feat-title">${escapeHtml(a.title)}</h3>
                <p class="feat-deck">${escapeHtml(a.deck || '')}</p>
                <div class="feat-byline">
                  <span class="author">${escapeHtml(a.author)}</span>
                  <span>${formatDate(a.createdAt)}</span>
                </div>
              </article>
            `).join('') : `<div class="empty-state" style="padding: 2rem 1rem;"><p style="font-size: 0.9rem;">Two more featured slots available.</p></div>`}
          </div>
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
          <div class="story-cat">${escapeHtml(a.tabLabel || 'News')}</div>
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
      fp.innerHTML = `<p style="font-family: var(--serif); font-style: italic; color: var(--ink-muted); padding: 1rem 0;">Nothing posted yet. Announcements and notices from the Tribune will appear here.</p>`;
    } else {
      fp.innerHTML = posts.map(p => {
        const isAnn = p.category === 'announcement';
        return `
          <div onclick="Router.go('forum/${p.id}')" style="display: grid; grid-template-columns: auto 1fr auto; gap: 1rem; padding: 0.7rem 0; border-bottom: 1px dashed var(--rule); cursor: pointer; align-items: center;">
            <div class="thread-avatar" style="width: 36px; height: 36px; font-size: 0.85rem;">${initials(p.author)}</div>
            <div>
              <div style="font-family: var(--serif); font-weight: 500; font-size: 0.95rem; line-height: 1.2;">${escapeHtml(p.title)}</div>
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
  state: { activeTab: 'all', activeSubtab: null, lang: 'en', search: '' },

  async render() {
    const isEditing = Editor.active;
    const tabs = await Store.list('newsTabs');

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
      ${isEditing ? `<button class="filter-pill" style="border-style: dashed; color: var(--gold);" onclick="Editor.manageTabs()">+ Manage tabs</button>` : ''}
    `;

    // Sub-tabs
    const subs = $('#news-subtabs');
    const activeTab = tabs.find(t => t.id === this.state.activeTab);
    if (activeTab && activeTab.subtabs && activeTab.subtabs.length) {
      subs.style.display = 'flex';
      subs.innerHTML = `
        <button class="subtab-pill ${!this.state.activeSubtab ? 'active' : ''}" onclick="Pages.news.setSubtab(null)">All</button>
        ${activeTab.subtabs.map((s, i) => `
          <button class="subtab-pill ${this.state.activeSubtab === s ? 'active' : ''}" onclick="Pages.news.setSubtabByIndex(${i})">${escapeHtml(s)}</button>
        `).join('')}
      `;
    } else {
      subs.style.display = 'none';
    }

    // Articles
    let articles = await listVisibleArticles();
    if (this.state.activeTab !== 'all') articles = articles.filter(a => a.tab === this.state.activeTab);
    if (this.state.activeSubtab) articles = articles.filter(a => a.subtab === this.state.activeSubtab);
    articles = articles.filter(a => (a.lang || 'en') === this.state.lang);
    if (this.state.search) {
      const q = this.state.search.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.deck || '').toLowerCase().includes(q) ||
        (a.body || '').toLowerCase().includes(q)
      );
    }
    articles.sort((a, b) => b.createdAt - a.createdAt);

    const grid = $('#news-grid');
    if (articles.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          ${Icons.empty}
          <h3>${this.state.search ? 'No articles match your search' : 'No articles in this category yet'}</h3>
          <p>${isEditing ? 'Click "+ New Article" up top to publish the first piece.' : 'Tribunees are still drafting. New stories every fortnight.'}</p>
        </div>
      `;
    } else {
      const newsCoverStyle = (a) => {
        const ar = parseAspect(a.coverAspect, 16/9);
        return a.coverImage
          ? `style="background-image: url('${a.coverImage}'); background-size: cover; background-position: center; aspect-ratio: ${ar};"`
          : `style="aspect-ratio: ${ar};"`;
      };
      grid.innerHTML = `<div class="news-grid">${articles.map(a => `
        <article class="story-card" onclick="Pages.news.openArticle('${a.id}')">
          <div class="feat-img ${a.coverImage ? '' : 'placeholder'}" ${newsCoverStyle(a)}></div>
          <div class="story-cat">${escapeHtml(a.tabLabel || 'News')}${a.subtab ? ' · ' + escapeHtml(a.subtab) : ''}${a.visibility === 'fiwa' ? ' · FIWA' : ''}</div>
          <h3 class="story-title">${escapeHtml(a.title)}</h3>
          <p class="story-deck">${escapeHtml(a.deck || '')}</p>
          <div class="story-meta">By <span class="author">${escapeHtml(a.author)}</span> · ${formatDate(a.createdAt)}</div>
        </article>
      `).join('')}</div>`;
    }
  },

  setTab(id) { this.state.activeTab = id; this.state.activeSubtab = null; this.render(); },
  setSubtab(s) { this.state.activeSubtab = s; this.render(); },
  async setSubtabByIndex(i) {
    const tabs = await Store.list('newsTabs');
    const tab = tabs.find(t => t.id === this.state.activeTab);
    if (tab && tab.subtabs && tab.subtabs[i] != null) {
      this.state.activeSubtab = tab.subtabs[i];
      this.render();
    }
  },
  setLang(lang) {
    this.state.lang = lang;
    $$('.lang-toggle button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    this.render();
  },
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
    const hasOwner = a.authorEmail && a.authorEmail === Auth.current().email;

    root.innerHTML = `
      <div class="article-page">
        <a class="ar-back" onclick="Router.go('news')">← Back to News</a>
        <div class="article-cover ${a.coverImage ? '' : 'placeholder'}" style="aspect-ratio: ${coverAspect};">
          ${a.coverImage ? `<img src="${a.coverImage}" alt="" />` : ''}
        </div>
        <div class="ar-cat">${escapeHtml(tabLabel)}${a.subtab ? ' · ' + escapeHtml(a.subtab) : ''}${a.visibility === 'fiwa' ? ' · FIWA-only' : ''}</div>
        <h1 class="article-headline">${escapeHtml(a.title)}</h1>
        ${a.deck ? `<p class="article-deck">${escapeHtml(a.deck)}</p>` : ''}
        <div class="article-byline">By <span class="author">${escapeHtml(a.author)}</span> · ${formatDate(a.createdAt)}${a.edition ? ` · From Edition ${a.edition}` : ''}</div>
        <div class="article-body">${renderArticleBody(a.body)}</div>
        ${isEditing ? `
          <div class="article-edit-bar">
            <button class="btn-ghost" onclick="Editor.editArticleById('${a.id}')">Edit article</button>
            <button class="btn-ghost" style="color: #c0392b; border-color: rgba(192,57,62,0.4);" onclick="Editor.deleteArticleAndReturn('${a.id}')">Delete</button>
          </div>
        ` : ''}
      </div>
    `;
  }
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

    root.innerHTML = `
      <div class="tribunee-profile">
        <div class="tp-portrait" style="aspect-ratio: ${photoAspect};">
          ${t.photo ? `<img src="${t.photo}" alt="${escapeHtml(t.name)}" />` : escapeHtml(initials(t.name))}
        </div>
        <div class="tp-content">
          <a class="tp-back" onclick="Router.go('about')">← Back to About</a>
          <h1>${escapeHtml(t.name)}</h1>
          ${t.role ? `<div class="tp-role">${escapeHtml(t.role)}</div>` : ''}
          ${t.grade ? `<div class="tp-grade">${escapeHtml(t.grade)}</div>` : '<div class="tp-grade" style="border:none;"></div>'}
          <div class="tp-bio ${t.bio ? '' : 'empty'}">
            ${t.bio
              ? renderArticleBody(t.bio)
              : '<p>This tribunee hasn\'t written their bio yet.</p>'}
          </div>
          ${canEdit ? `
            <div class="tp-edit-bar">
              <button class="btn-ghost" onclick="Editor.editTribuneeById('${t.id}')">Edit profile</button>
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
          <p>${canEdit ? 'Click "+ Archive Edition" up top to add a Canva or PDF link to the archive.' : 'The archive will fill as Fitrah Tribune publishes its first editions.'}</p>
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
            <span style="font-family: var(--mono); font-size: 0.7rem; color: var(--ink-muted); letter-spacing: 0.14em;">Posting as ${escapeHtml(Auth.current().name)}</span>
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

/* ── CORRECTIONS ─────────────────────────────────────────────────────── */
/* ── FEEDBACK & CORRECTIONS ───────────────────────────────────────────
   Two things live on this page, and the boundary between them is the
   whole point:

     · CASES     — private. A reader writes to the Tribune. Nobody outside
                   the Tribune and the submitter ever sees it. Ever.
     · THE LOG   — public. If a case (or anything else) produces a factual
                   correction, the CORRECTION is published — never the
                   message that prompted it.

   Permissions:
     Guest      → read the public log. Sign-in prompt.
     Public+    → submit cases, track + follow up on their own.
     Tribunee   → all of the above + READ the case inbox.
     Admin      → all of the above + REPLY and CLOSE/REOPEN.

   Why Tribunees can read but not reply: a reader writing in is addressing
   the Tribune, not whichever Tribunee happened to open the tab. Writers
   need to see what's being flagged about their own work; the Tribune needs
   to answer with one voice. Read wide, reply narrow.

   A closed case is FROZEN — read-only for everyone, including admins.
   Reopen it if there's more to say.
   ─────────────────────────────────────────────────────────────────── */

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

  async messagesFor(caseId) {
    const msgs = await Store.list('casemsgs', m => m.caseId === caseId);
    return msgs.sort((a, b) => a.createdAt - b.createdAt);
  },

  async isMine(c) {
    const email = (Auth.current().email || '').toLowerCase();
    return !!email && (c.submitterEmail || '').toLowerCase() === email;
  }
};

Pages.corrections = {
  async render() {
    await this.renderSubmit();
    await this.renderMyCases();
    await this.renderInbox();
    await this.renderLog();
  },

  /* ── Entry point used by every "Report a Tip" affordance on the site.
        Home band, forum sidebar, footer — all land here. ─────────────── */
  openSubmit() {
    Router.go('corrections/submit');
  },

  /* ── SUBMIT ────────────────────────────────────────────────────────── */
  async renderSubmit() {
    const el = $('#fc-submit-area');
    if (!el) return;
    if (Auth.isGuest()) {
      el.innerHTML = `
        <div class="fc-submit locked">
          <div class="compose-locked-msg">
            <a onclick="SignIn.open()">Sign in</a> to send us a correction. We ask for an account so we can write back to you — not so we can publish your name.
          </div>
        </div>
      `;
      return;
    }
    el.innerHTML = `
      <div class="fc-submit">
        <input type="text" class="fc-subject" id="fc-subject" placeholder="What is this about? (e.g. 'Error in the Edition 3 sports report')" />
        <textarea class="fc-body" id="fc-body" placeholder="Tell us what we got wrong, and how you know. The more specific you are, the faster we can check it."></textarea>
        <div class="fc-submit-foot">
          <span class="fc-submit-note">You'll get a case number to track this.</span>
          <button class="btn-navy" onclick="Pages.corrections.submitCase()">Send privately</button>
        </div>
      </div>
    `;
  },

  async submitCase() {
    if (!(await Cases.canSubmit())) { SignIn.open(); return; }
    const subject = $('#fc-subject').value.trim();
    const body    = $('#fc-body').value.trim();
    if (!subject || !body) { toast('Please fill in both fields', 'error'); return; }

    const rec = await Store.save('cases', {
      ref: Cases.newRef(),
      subject,
      status: 'open',
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

    $('#fc-subject').value = '';
    $('#fc-body').value = '';
    await this.render();
    toast(`Sent — your case is ${rec.ref}`, 'success');
    setTimeout(() => {
      $('#fc-mycases-block')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  },

  /* ── YOUR CASES (Public+) ──────────────────────────────────────────── */
  async renderMyCases() {
    const block = $('#fc-mycases-block');
    const el    = $('#fc-mycases-area');
    if (!block || !el) return;

    if (Auth.isGuest()) { block.style.display = 'none'; return; }
    const email = (Auth.current().email || '').toLowerCase();
    const mine  = (await Store.list('cases', c => (c.submitterEmail || '').toLowerCase() === email))
                    .sort((a, b) => b.createdAt - a.createdAt);

    block.style.display = '';
    $('#fc-mycases-count').textContent = mine.length ? `${mine.length} total` : '';

    if (mine.length === 0) {
      el.innerHTML = `<div class="empty-state"><h3>No cases yet</h3><p>When you send us something, it appears here so you can follow it.</p></div>`;
      return;
    }
    el.innerHTML = `<div class="case-list">${
      (await Promise.all(mine.map(c => this.caseCard(c, 'reader')))).join('')
    }</div>`;
  },

  /* ── CASE INBOX (Tribunee read / Admin act) ────────────────────────── */
  async renderInbox() {
    const block = $('#fc-inbox-block');
    const el    = $('#fc-inbox-area');
    if (!block || !el) return;

    if (!(await Cases.canViewInbox())) { block.style.display = 'none'; return; }

    const all  = (await Store.list('cases')).sort((a, b) => {
      // open first, then newest
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
    const open = all.filter(c => c.status === 'open').length;

    block.style.display = '';
    $('#fc-inbox-count').textContent = all.length ? `${open} open · ${all.length} total` : '';

    if (all.length === 0) {
      el.innerHTML = `<div class="empty-state"><h3>The inbox is empty</h3><p>Reader submissions land here. Nothing has come in yet.</p></div>`;
      return;
    }
    el.innerHTML = `<div class="case-list">${
      (await Promise.all(all.map(c => this.caseCard(c, 'tribune')))).join('')
    }</div>`;
  },

  /* ── A single case card. `view` is 'reader' (my cases) or 'tribune'
        (the inbox). Same data, different affordances. ─────────────────── */
  async caseCard(c, view) {
    const msgs      = await Cases.messagesFor(c.id);
    const isOpen    = c.status === 'open';
    const canReply  = view === 'tribune' && isOpen && await Cases.canReply();
    const canFollow = view === 'reader'  && isOpen && await Cases.isMine(c);
    const canClose  = view === 'tribune' && await Cases.canClose();
    const domId     = `case-${view}-${c.id}`;

    const thread = msgs.map(m => `
      <div class="case-msg ${m.side === 'tribune' ? 'tribune' : 'reader'}">
        <div class="msg-meta">${m.side === 'tribune' ? 'Fitrah Tribune' : escapeHtml(m.author)} · ${relativeTime(m.createdAt)}</div>
        <p>${escapeHtml(m.body)}</p>
      </div>
    `).join('');

    let footer = '';
    if (canReply) {
      footer = `
        <div class="case-reply-form">
          <input type="text" id="reply-${domId}" placeholder="Reply to ${escapeHtml(c.submitterName)}…"
                 onkeydown="if(event.key==='Enter')Pages.corrections.replyToCase('${c.id}','${view}')" />
          <button onclick="Pages.corrections.replyToCase('${c.id}','${view}')">Reply</button>
        </div>
      `;
    } else if (canFollow) {
      footer = `
        <div class="case-reply-form">
          <input type="text" id="reply-${domId}" placeholder="Add something to this case…"
                 onkeydown="if(event.key==='Enter')Pages.corrections.followUp('${c.id}','${view}')" />
          <button onclick="Pages.corrections.followUp('${c.id}','${view}')">Send</button>
        </div>
      `;
    } else if (!isOpen) {
      footer = `<div class="case-frozen">This case is closed. The record above is final and can no longer be changed.</div>`;
    } else if (view === 'tribune') {
      footer = `<div class="case-frozen">Only admins can reply to cases.</div>`;
    }

    const actions = canClose ? `
      <div class="case-actions">
        ${isOpen
          ? `<button class="primary" onclick="Pages.corrections.closeCase('${c.id}')">Close as resolved</button>`
          : `<button onclick="Pages.corrections.reopenCase('${c.id}')">Reopen case</button>`}
        ${isOpen ? `<button onclick="Pages.corrections.caseToCorrection('${c.id}')">Log a public correction</button>` : ''}
      </div>
    ` : '';

    return `
      <div class="case-card ${isOpen ? '' : 'resolved'}" id="${domId}">
        <div class="case-head" onclick="Pages.corrections.toggleCase('${domId}')">
          <span class="case-ref">${escapeHtml(c.ref)}</span>
          <div class="case-summary">
            <h4>${escapeHtml(c.subject)}</h4>
            <div class="case-meta">
              ${view === 'tribune'
                ? `<span>From <span class="author">${escapeHtml(c.submitterName)}</span></span><span>·</span>`
                : ''}
              <span>${relativeTime(c.createdAt)}</span>
              <span>·</span>
              <span>${msgs.length} message${msgs.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <span class="case-status ${isOpen ? 'open' : 'resolved'}">${isOpen ? 'Open' : 'Resolved'}</span>
        </div>
        <div class="case-thread">
          ${thread}
          ${footer}
          ${actions}
        </div>
      </div>
    `;
  },

  toggleCase(domId) {
    $('#' + domId)?.classList.toggle('expanded');
  },

  /* ── Actions ───────────────────────────────────────────────────────── */

  async replyToCase(caseId, view) {
    if (!(await Cases.canReply())) { toast('Only admins can reply to cases', 'error'); return; }
    const c = await Store.get('cases', caseId);
    if (!c) return;
    if (c.status !== 'open') { toast('This case is closed', 'error'); return; }

    const input = $(`#reply-case-${view}-${caseId}`);
    const body  = input?.value.trim();
    if (!body) return;

    await Store.save('casemsgs', {
      caseId, body,
      side: 'tribune',
      author: Auth.current().name,
      authorEmail: Auth.current().email
    });
    c.updatedAt = Date.now();
    await Store.save('cases', c);
    await this.render();
    setTimeout(() => $(`#case-${view}-${caseId}`)?.classList.add('expanded'), 50);
    toast('Reply sent', 'success');
  },

  async followUp(caseId, view) {
    const c = await Store.get('cases', caseId);
    if (!c) return;
    if (!(await Cases.isMine(c))) { toast('This is not your case', 'error'); return; }
    if (c.status !== 'open') { toast('This case is closed', 'error'); return; }

    const input = $(`#reply-case-${view}-${caseId}`);
    const body  = input?.value.trim();
    if (!body) return;

    await Store.save('casemsgs', {
      caseId, body,
      side: 'reader',
      author: Auth.current().name,
      authorEmail: Auth.current().email
    });
    c.updatedAt = Date.now();
    await Store.save('cases', c);
    await this.render();
    setTimeout(() => $(`#case-${view}-${caseId}`)?.classList.add('expanded'), 50);
    toast('Sent', 'success');
  },

  async closeCase(caseId) {
    if (!(await Cases.canClose())) { toast('Only admins can close cases', 'error'); return; }
    const c = await Store.get('cases', caseId);
    if (!c || c.status !== 'open') return;
    if (!confirm('Close this case? Once closed it is frozen — neither you nor the reader can add to it. You can reopen it later if needed.')) return;
    c.status   = 'resolved';
    c.closedAt = Date.now();
    c.closedBy = Auth.current().name;
    await Store.save('cases', c);
    await this.render();
    toast(`Case ${c.ref} closed`);
  },

  async reopenCase(caseId) {
    if (!(await Cases.canClose())) { toast('Only admins can reopen cases', 'error'); return; }
    const c = await Store.get('cases', caseId);
    if (!c || c.status === 'open') return;
    c.status = 'open';
    c.closedAt = null;
    c.closedBy = null;
    await Store.save('cases', c);
    await this.render();
    toast(`Case ${c.ref} reopened`);
  },

  /* Publish a correction that a case surfaced. The correction goes on the
     public record; the CASE DOES NOT. Nothing from the reader's message is
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
          This publishes a correction to the public record. <strong>Nothing from case ${escapeHtml(c.ref)} is copied across</strong> — not the reader's name, not their words, not the fact that they wrote in. Write the note yourself, in the Tribune's voice.
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
      const bioPreview = t.bio
        ? (() => {
            // Show the first non-empty block of content — paragraph, quote,
            // heading, or list item. Bios written in the rich editor may
            // start with <p><br></p>, so we walk past empty blocks until we
            // find one with real text.
            const tmp = document.createElement('div');
            tmp.innerHTML = t.bio;
            const blocks = tmp.querySelectorAll('p, blockquote, h2, h3, h4, li');
            let firstPara = '';
            for (const b of blocks) {
              const txt = (b.textContent || '').trim();
              if (txt) { firstPara = txt; break; }
            }
            if (!firstPara) {
              // No recognised block with content — fall back to the raw text.
              const all = (tmp.textContent || '').trim();
              firstPara = all.split(/\n\n+/)[0].trim();
            }
            return firstPara
              ? `<div class="tribunee-bio">"${escapeHtml(firstPara)}"</div>`
              : '';
          })()
        : '<div class="tribunee-bio empty">— bio coming soon —</div>';
      return `
        <article class="tribunee-card" onclick="Router.go('tribunee/${t.id}')">
          ${canEditCard ? `<div class="edit-overlay"><button class="edit-icon-btn" onclick="event.stopPropagation(); Editor.editTribuneeById('${t.id}')">✎</button></div>` : ''}
          <div class="tribunee-portrait" style="${portraitStyle}">${portraitInner}</div>
          <div class="tribunee-name">${escapeHtml(t.name)}</div>
          ${t.role ? `<div class="tribunee-role">${escapeHtml(t.role)}</div>` : ''}
          ${t.grade ? `<div class="tribunee-grade">${escapeHtml(t.grade)}</div>` : ''}
          ${bioPreview}
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

const SCHEMA_VERSION = 3;

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
    /* ─── EDIT THIS LIST as new tribunees join ────────────────────────
       Any email here, when paired with a FIWA-tier sign-in (the email
       must end in @fiwa.sch.id), unlocks editing mode for that user.
       Set admin: true on accounts that can also:
         · add and remove tribunees
         · edit OTHER tribunees' profiles (everyone can edit their own)
         · create, edit, and remove archive editions
       All emails are stored lowercase. Sign-in is case-insensitive.
       ──────────────────────────────────────────────────────────────── */
    const seedAllow = [
      { email: 'ammar.mufiid@fiwa.sch.id',      admin: true  },
      { email: 'aldebaran.gibran@fiwa.sch.id',  admin: true  },
      { email: 'fathan.assyauqi@fiwa.sch.id',   admin: true  },
      { email: 'shahza.muhammad1@fiwa.sch.id',  admin: false },
      { email: 'arza.zaydan1@fiwa.sch.id',      admin: false },
      { email: 'akio.hideaka1@fiwa.sch.id',     admin: false },
      { email: 'khalifah.agidra@fiwa.sch.id',   admin: false },
      { email: 'fathi.rizqi1@fiwa.sch.id',      admin: false },
      { email: 'naufal.rian1@fiwa.sch.id',      admin: false },
      { email: 'muhammad.razqa@fiwa.sch.id',    admin: false }
    ];
    for (const a of seedAllow) await Store.save('allowlist', a);
  }

  // Tribunees — names + roles + grades only, no bios (they fill those in)
  const tribunees = await Store.list('tribunees');
  if (tribunees.length === 0) {
    const seedT = [
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
    for (const t of seedT) await Store.save('tribunees', t);
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
