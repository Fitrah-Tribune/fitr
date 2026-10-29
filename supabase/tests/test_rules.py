# Permission-rule tests for supabase/schema.sql.
# Needs a local Postgres on port 5499 with a database "fitr" that has
# tests/supabase-shim.sql (a stand-in for Supabase's auth and storage)
# and schema.sql loaded. Run: python3 supabase/tests/test_rules.py
# It empties fitr_records first, so never point it at the real database.
import subprocess, json, sys
DB = ['psql','-h','127.0.0.1','-p','5499','-U','postgres','-d','fitr','-At','-q','-v','ON_ERROR_STOP=1']
def raw(sql):
    r = subprocess.run(DB+['-c',sql],capture_output=True,text=True)
    return r.returncode, (r.stdout.strip() if r.returncode==0 else r.stderr.strip().split('\n')[0])
def q(who, sql):
    role = 'anon' if who is None else 'authenticated'
    claims = json.dumps({'email': who} if who else {})
    full = f"begin; set local role {role}; select set_config('request.jwt.claims', '{claims}', true); {sql}; commit;"
    r = subprocess.run(DB+['-c',full],capture_output=True,text=True)
    if r.returncode: return False, r.stderr.strip().split('\n')[0].replace('ERROR:  ','')
    lines = r.stdout.strip().split('\n')[1:]  # drop set_config output
    return True, '\n'.join(lines)
def save(who, coll, item): return q(who, f"select public.fitr_save('{coll}', $j${json.dumps(item)}$j$::jsonb)")
def lst(who, coll):
    ok, out = q(who, f"select coalesce(json_agg(x), '[]') from public.fitr_list('{coll}') x")
    return json.loads(out) if ok else out
def rm(who, coll, id): return q(who, f"select public.fitr_remove('{coll}', '{id}')")
fails = 0
def check(name, cond, detail=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else f'  -> {detail}'))
    if not cond: fails += 1

raw("truncate public.fitr_records")
# Seed allowlist + tribunees as the database owner (like the seed file does).
raw("""insert into public.fitr_records(coll,id,owner,data) values
 ('allowlist','al-ammar','ammar@fiwa.sch.id','{"admin":true}'),
 ('allowlist','al-khal','khal@fiwa.sch.id','{"admin":false}'),
 ('tribunees','tri-khal','khal@fiwa.sch.id','{"name":"Khalifah","role":"Layout","grade":"G9","bio":""}'),
 ('tribunees','tri-ammar','ammar@fiwa.sch.id','{"name":"Ammar","role":"Founder","grade":"G9"}')""")
GUEST=None; PUB='sam@gmail.com'; FIWA='student@fiwa.sch.id'; KHAL='khal@fiwa.sch.id'; ADMIN='ammar@fiwa.sch.id'
FAKE='khal@fiwa.sch.id.evil.com'

# Role checks
for who,t,a in [(GUEST,'f','f'),(PUB,'f','f'),(FIWA,'f','f'),(KHAL,'t','f'),(ADMIN,'t','t'),(FAKE,'f','f')]:
    ok,out = q(who,"select public.fitr_is_tribunee()::text || ',' || public.fitr_is_admin()::text")
    check(f'roles for {who}', out==f"{'true' if t=='t' else 'false'},{'true' if a=='t' else 'false'}", out)

# Allowlist / emails
check('guest sees no allowlist', lst(GUEST,'allowlist')==[])
check('Khalifah sees only own allowlist row', [r['id'] for r in lst(KHAL,'allowlist')]==['al-khal'])
check('admin sees whole allowlist', len(lst(ADMIN,'allowlist'))==2)
check('Khalifah cannot add to allowlist', not save(KHAL,'allowlist',{'email':'x@fiwa.sch.id','admin':True})[0])
tg = lst(GUEST,'tribunees')
check('guest sees roster without emails', len(tg)==2 and all('email' not in t for t in tg), tg)
tk = {t['id']:t for t in lst(KHAL,'tribunees')}
check('Khalifah sees own email only', tk['tri-khal'].get('email')==KHAL and 'email' not in tk['tri-ammar'])
check('admin sees all roster emails', all('email' in t for t in lst(ADMIN,'tribunees')))
check('direct table read blocked for anon', not q(GUEST,'select count(*) from public.fitr_records')[0])
check('direct table read blocked for signed-in', not q(KHAL,'select count(*) from public.fitr_records')[0])
check('direct table write blocked', not q(ADMIN,"insert into public.fitr_records(coll,id,data) values('articles','x','{}')")[0])

# Profiles
me = tk['tri-khal']
ok,_ = save(KHAL,'tribunees',{**me,'bio':'<p>Hi</p>','photo':'https://x/p.jpg','photoAspect':0.8,'photoFit':'crop'})
check('Tribunee edits own bio and photo', ok, _)
ok,_ = save(KHAL,'tribunees',{**me,'bio':'<p>Hi</p>','role':'Editor-in-Chief'})
check('Tribunee cannot change own role', not ok, _)
ok,_ = save(KHAL,'tribunees',{**tk['tri-ammar'],'bio':'hacked'})
check('Tribunee cannot edit someone else', not ok, _)
ok,_ = save(KHAL,'tribunees',{**me,'email':'other@fiwa.sch.id','bio':'<p>Hi</p>'})
khal_after = [t for t in lst(KHAL,'tribunees') if t['id']=='tri-khal']
check('Tribunee cannot move own profile to another email', khal_after and khal_after[0].get('email')==KHAL, (ok,_,khal_after))
ok,_ = save(ADMIN,'tribunees',{**tk['tri-ammar'],'role':'Founder · Editor-in-Chief','email':ADMIN})
check('admin edits any profile', ok, _)
check('public user cannot add Tribunee', not save(PUB,'tribunees',{'name':'X'})[0])
ok,out = save(ADMIN,'tribunees',{'name':'New Person','email':'New.Person@fiwa.sch.id'})
check('admin adds Tribunee (email lowercased)', ok and json.loads(out).get('email')=='new.person@fiwa.sch.id', out)
check('Khalifah cannot delete Tribunee', not rm(KHAL,'tribunees','tri-ammar')[0])

# Articles
check('guest cannot publish', not save(GUEST,'articles',{'title':'x'})[0])
check('public user cannot publish', not save(PUB,'articles',{'title':'x'})[0])
check('FIWA non-Tribunee cannot publish', not save(FIWA,'articles',{'title':'x'})[0])
ok,out = save(KHAL,'articles',{'title':'Story','section':'internal','visibility':'public','authorEmail':'spoof@x.com'})
art = json.loads(out); check('Tribunee publishes, owner is the signed-in writer', ok and art.get('authorEmail')==KHAL, out)
ok,out = save(KHAL,'articles',{'title':'Secret','section':'internal','visibility':'fiwa'})
fid = json.loads(out)['id']
check('guest sees public article without writer email', [a for a in lst(GUEST,'articles') if a['id']==art['id'] and 'authorEmail' not in a]!=[])
check('guest cannot see FIWA-only article', fid not in [a['id'] for a in lst(GUEST,'articles')])
check('public user cannot see FIWA-only article', fid not in [a['id'] for a in lst(PUB,'articles')])
check('FIWA user sees FIWA-only article', fid in [a['id'] for a in lst(FIWA,'articles')])
ok,out = save(ADMIN,'articles',{**{k:v for k,v in art.items() if k!='authorEmail'},'title':'Story (edited)'})
check('editing keeps original writer', ok and [a for a in lst(KHAL,'articles') if a['id']==art['id']][0].get('authorEmail')==KHAL, out)
check('timestamps are milliseconds', isinstance(art['createdAt'],int) and art['createdAt']>1.7e12)

# Featured / categories
check('Tribunee sets front page', save(KHAL,'featured',{'articleId':art['id'],'order':0})[0])
check('public user cannot set front page', not save(PUB,'featured',{'articleId':art['id'],'order':0})[0])
check('public user cannot add category', not save(PUB,'newsTabs',{'label':'X','section':'internal'})[0])

# Editions / corrections
check('Tribunee cannot add edition', not save(KHAL,'editions',{'number':6})[0])
check('admin adds edition', save(ADMIN,'editions',{'number':6,'title':'Ed 6'})[0])
ok,out = save(KHAL,'corrections',{'articleId':art['id'],'note':'Fixed a name'})
check('Tribunee logs a correction when editing', ok, out)
cid = json.loads(out)['id']
check('Tribunee cannot edit the corrections log', not save(KHAL,'corrections',{'id':cid,'note':'changed'})[0])
check('Tribunee cannot delete a correction', not rm(KHAL,'corrections',cid)[0])
check('admin edits correction', save(ADMIN,'corrections',{'id':cid,'note':'Fixed a name.'})[0])
check('guest reads corrections log', len(lst(GUEST,'corrections'))==1)

# Forum
check('public user cannot post', not save(PUB,'threads',{'body':'hi','category':'general'})[0])
check('FIWA non-Tribunee cannot post', not save(FIWA,'threads',{'body':'hi','category':'general'})[0])
ok,out = save(KHAL,'threads',{'body':'hi','category':'general'}); post=json.loads(out)
check('Tribunee posts general', ok, out)
check('Tribunee cannot post announcement', not save(KHAL,'threads',{'body':'hi','category':'announcement'})[0])
check('Tribunee cannot post pre-pinned', not save(KHAL,'threads',{'body':'hi','category':'general','pinned':True})[0])
ok,out = save(ADMIN,'threads',{'body':'News','category':'announcement'}); ann=json.loads(out)
check('admin posts announcement', ok, out)
check('Tribunee cannot pin', not save(KHAL,'threads',{**post,'pinned':True})[0])
check('admin pins', save(ADMIN,'threads',{**ann,'pinned':True})[0])
check('guest reads feed without emails', all('authorEmail' not in p for p in lst(GUEST,'threads')) and len(lst(GUEST,'threads'))==2)
check('Tribunee cannot delete admin post', not rm(KHAL,'threads',ann['id'])[0])
check('Tribunee deletes own post', rm(KHAL,'threads',post['id'])[0])
ok,out = save(KHAL,'threads',{'body':'again','category':'general'}); post2=json.loads(out)
check('admin deletes anyone\'s post', rm(ADMIN,'threads',post2['id'])[0])
check('comments collection rejected', not save(KHAL,'comments',{'body':'x'})[0])

# Feedback notes
check('guest cannot send a note', not save(GUEST,'cases',{'ref':'FTR-AAAA'})[0])
ok,out = save(PUB,'cases',{'ref':'FTR-AAAA','kind':'mistake','showName':False,'status':'answered','submitterName':'Sam Reader','submitterEmail':PUB})
case=json.loads(out)
check('public user sends note; forced to Received', ok and case['status']=='received', out)
check('sender sees own email on note', case.get('submitterEmail')==PUB)
ok,out = save(PUB,'casemsgs',{'caseId':case['id'],'body':'The date is wrong','side':'reader','author':'Sam Reader','authorEmail':PUB})
check('sender adds first message', ok, out)
ok,out = save('someone@else.com','cases',{'ref':'FTR-BBBB','kind':'tip','showName':True,'submitterName':'Shown Person'})
case2=json.loads(out)
save('someone@else.com','casemsgs',{'caseId':case2['id'],'body':'tip','side':'reader','author':'Shown Person'})
check('other public user cannot see Sam\'s note', case['id'] not in [c['id'] for c in lst('someone@else.com','cases')])
check('other public user cannot see Sam\'s messages', lst('someone@else.com','casemsgs') and all(m['caseId']!=case['id'] for m in lst('someone@else.com','casemsgs')))
check('guest sees no notes', lst(GUEST,'cases')==[] and lst(GUEST,'casemsgs')==[])
check('FIWA non-Tribunee sees no inbox', [c['id'] for c in lst(FIWA,'cases')]==[])
inbox = {c['id']:c for c in lst(KHAL,'cases')}
check('Tribunee reads inbox', set(inbox)=={case['id'],case2['id']})
check('hidden name never reaches editors', 'submitterName' not in inbox[case['id']] and 'submitterEmail' not in inbox[case['id']], inbox[case['id']])
check('shared name reaches editors (no email)', inbox[case2['id']].get('submitterName')=='Shown Person' and 'submitterEmail' not in inbox[case2['id']])
m = [m for m in lst(KHAL,'casemsgs') if m['caseId']==case['id']]
check('hidden name stripped from reader message', m and 'author' not in m[0] and 'authorEmail' not in m[0], m)
check('admin also cannot see hidden name', all('submitterName' not in c for c in lst(ADMIN,'cases') if c['id']==case['id']))
check('Tribunee cannot reply', not save(KHAL,'casemsgs',{'caseId':case['id'],'body':'x','side':'tribune','author':'Khalifah'})[0])
check('Tribunee cannot set status', not save(KHAL,'cases',{**inbox[case['id']],'status':'corrected'})[0])
check('sender cannot set status', not (save(PUB,'cases',{**case,'status':'corrected'})[0] and [c for c in lst(PUB,'cases')][0]['status']=='corrected'))
check('sender cannot reply as editors', not save(PUB,'casemsgs',{'caseId':case['id'],'body':'x','side':'tribune'})[0])
ok,out = save(ADMIN,'casemsgs',{'caseId':case['id'],'body':'Thanks, checking','side':'tribune','author':'Ammar'})
check('admin replies', ok, out)
rm_ = [m for m in lst(PUB,'casemsgs') if m['side']=='tribune']
check('reader sees reply without admin name', rm_ and 'author' not in rm_[0] and 'authorEmail' not in rm_[0], rm_)
tm = [m for m in lst(KHAL,'casemsgs') if m['side']=='tribune']
check('team sees which admin replied', tm and tm[0].get('author')=='Ammar', tm)
c_admin = [c for c in lst(ADMIN,'cases') if c['id']==case['id']][0]
ok,out = save(ADMIN,'cases',{**c_admin,'status':'corrected','closedAt':1,'closedBy':'Ammar','showName':True})
check('admin closes note', ok and json.loads(out)['status']=='corrected', out)
check('admin cannot flip the sender\'s name choice', 'submitterName' not in json.loads(out) and json.loads(out).get('showName') is False, out)
check('closed: sender cannot add', not save(PUB,'casemsgs',{'caseId':case['id'],'body':'more','side':'reader'})[0])
check('closed: admin cannot reply', not save(ADMIN,'casemsgs',{'caseId':case['id'],'body':'more','side':'tribune'})[0])
c_admin = [c for c in lst(ADMIN,'cases') if c['id']==case['id']][0]
check('closed: admin cannot change final status', not save(ADMIN,'cases',{**c_admin,'status':'checked'})[0])
check('Tribunee cannot reopen', not save(KHAL,'cases',{**c_admin,'status':'progress'})[0])
ok,out = save(ADMIN,'cases',{**c_admin,'status':'progress','closedAt':None,'closedBy':None})
check('admin reopens', ok and json.loads(out)['status']=='progress', out)
check('reopened: sender can add again', save(PUB,'casemsgs',{'caseId':case['id'],'body':'more','side':'reader'})[0])
check('nobody deletes notes', not rm(ADMIN,'cases',case['id'])[0] and not rm(ADMIN,'casemsgs',m[0]['id'])[0])
check('messages cannot be edited', not save(ADMIN,'casemsgs',{**m[0],'body':'rewritten'})[0])

# Drafts
ok,out = save(KHAL,'drafts',{'id':'draft-khal-new','fields':{'title':'wip'},'email':KHAL})
check('Tribunee saves a draft', ok, out)
check('others cannot see the draft', lst(ADMIN,'drafts')==[] and lst(GUEST,'drafts')==[])
check('others cannot overwrite the draft', not save(ADMIN,'drafts',{'id':'draft-khal-new','fields':{}})[0])
check('others cannot delete the draft', not rm(ADMIN,'drafts','draft-khal-new')[0])
check('public user cannot save drafts', not save(PUB,'drafts',{'fields':{}})[0])
check('owner deletes draft', rm(KHAL,'drafts','draft-khal-new')[0])

print(f'\n{fails} failed'); sys.exit(1 if fails else 0)
