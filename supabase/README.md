# Supabase setup

The site runs on Supabase once two environment variables are set. Without
them it falls back to the in-browser demo, where any password works.

| File | What it is |
|---|---|
| `schema.sql` | The table, the permission rules, and the photo bucket. |
| `seed-content.sql` | What the site shows today: 5 editions, the news categories, the Edition 5 articles, the front-page picks and the Tribunee roster. No emails. |
| `people.sql` | **Not in this repo.** The allowlist and each profile's email. It's in the project files (`website/supabase/people.sql`). Never commit it. |

## How it works

Every collection the engine uses (articles, threads, cases, …) is stored in
one table, `fitr_records`, as JSON. Nobody can touch that table directly.
The site goes through four database functions (`fitr_list`, `fitr_get`,
`fitr_save`, `fitr_remove`), and those check every rule in CLAUDE.md
against the signed-in user's email. So a reader who opens the browser
console still can't read someone else's feedback note, post to the forum,
or see a Tribunee's email.

Emails live in the `owner` column and are only sent to the people allowed
to see them: your own email to you, and the team's emails to admins. A
feedback sender's email is shown to nobody, and their name is not even
stored unless they ticked "show my name".

Photos picked in the editors are uploaded to the public `media` bucket. The
record keeps only the link.

## One-time setup

1. **Create the project.** Go to supabase.com, then New project. Pick the
   Southeast Asia (Singapore) region and save the database password
   somewhere safe.

2. **Create the tables.** In the dashboard, open SQL Editor, then New query.
   Paste in all of `schema.sql` and click Run. Then do the same for
   `seed-content.sql`, and then for `people.sql` from the project files.

3. **Turn on Google sign-in.**
   - In Google Cloud Console, go to APIs & Services, then Credentials, then
     Create credentials, then OAuth client ID.
     - Choose the Web application type.
     - Under "Authorized redirect URIs", add
       `https://<your-project-ref>.supabase.co/auth/v1/callback`. The exact
       URL is shown on the Supabase Google provider page.
     - If Google asks for a consent screen first, choose External. Set the
       app name to Fitrah Tribune.
   - In Supabase, go to Authentication, then Sign In / Providers, then
     Google. Turn it on and paste in the Client ID and Client secret.
   - In the same Providers list, **turn Email off.** With email sign-up on,
     anyone could register `someone@fiwa.sch.id` without owning it. Google
     only signs in people who really own the address.

4. **Allow the site's addresses.** Go to Authentication, then URL
   Configuration.
   - Set the Site URL to `https://fitrahtribune.pages.dev`, or the real
     domain once there is one.
   - Under Redirect URLs, add these three:
     - `https://fitrahtribune.pages.dev/**`
     - `https://*.fitrahtribune.pages.dev/**` (branch previews)
     - `http://localhost:5173/**` (`npm run dev`)

5. **Connect the site.**
   - In Supabase, go to Project Settings, then API Keys. Copy the Project
     URL and the public key: the `publishable` key on newer projects, or
     the `anon` key on older ones. Either one works.
   - In Cloudflare, go to the fitrahtribune project, then Settings, then
     Variables and Secrets. Add both variables for Production and for
     Preview:
     - `VITE_SUPABASE_URL` = the Project URL
     - `VITE_SUPABASE_ANON_KEY` = the publishable (or anon) key
   - Redeploy. The variables are read at build time.
   - For local work, put the same two lines in `fitr/.env.local`. That file
     is git-ignored.
   - The publishable or anon key is meant to be public. The **secret** or
     **service_role** key is not:
     never put it in the site, Cloudflare, or the repo.

6. **Check it.** Test as each tier:
   - A guest reads everything.
   - A Gmail account can send a feedback note.
   - Khalifah's school account can post to the forum but not reply to notes.
   - An admin can reply to and close notes.

   Test a school account first. If FIWA's Google Workspace blocks
   third-party sign-ins, the school's admin has to allow the app.

## Day to day

- **Adding a Tribunee:** an admin adds the profile on the About page, with
  the person's email. Then, so they get Tribunee access, run this in the SQL
  editor:

  ```sql
  insert into public.fitr_records (coll, id, owner, data)
  values ('allowlist', 'al-firstname', 'firstname.lastname@fiwa.sch.id', '{"admin": false}');
  ```

  To make someone an admin, set `{"admin": true}`. To remove someone's
  access, delete their `allowlist` row in the Table Editor.

- **Changing a rule:** edit the function in `schema.sql`, update CLAUDE.md
  to match, and run the whole file again. Every statement in it can be
  re-run safely.

- **Previews share the database.** With the variables set for Preview, a
  branch preview reads and writes the real content, so test with care. A
  second Supabase project for previews is the fix if that becomes a problem.
