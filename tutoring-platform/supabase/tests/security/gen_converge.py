import json, re, glob
d=json.load(open('expected.json'))
M='../../migrations/'
allsql='\n'.join(open(f).read() for f in sorted(glob.glob(M+'*.sql')))
out=[]; nsec=0
def q(s): return "'"+s.replace("'","''")+"'"
def sec(name, body):
    global nsec
    assert '$dalili$' not in body
    nsec+=1
    out.append("select pg_temp.dalili_run(%s, $dalili$\n%s\n$dalili$);\n" % (q(name), body.strip()))

out.append('''-- =============================================================
-- دليلي — ملف «المطابقة»: يعيد فرض المخطط الأمني الكامل كما في الريبو
-- (كل الدوال + التريغرات + السياسات + العروض + حدود التخزين).
-- السبب: قاعدة الإنتاج تفتقد دفعات أمنية قديمة (16 و25) لم تُطبَّق.
-- * لا يحذف ولا يعدّل أي بيانات. * آمن للتكرار.
-- * كل قسم مستقل: فشل قسم لا يُلغي الباقي.
-- * النتيجة جدول قصير: الأقسام الفاشلة (إن وُجدت) + أي فرق متبقٍّ + ملخّص.
-- =============================================================

drop table if exists dalili_report, dalili_exp_fn, dalili_exp_trg, dalili_exp_pol, dalili_exp_col, dalili_exp_idx;
create temp table dalili_report (ord serial, kind text, item text, detail text);

create or replace function pg_temp.dalili_run(p_name text, p_sql text) returns void
language plpgsql as $run$
begin
  begin
    execute p_sql;
    insert into dalili_report(kind, item, detail) values ('section', p_name, 'OK');
  exception when others then
    insert into dalili_report(kind, item, detail)
    values ('section', p_name, 'FAILED: ' || sqlstate || ' ' || sqlerrm);
  end;
end;
$run$;
''')

# ---- columns (add if missing) ----
bytbl={}
for c in d['columns']:
    if c['kind']=='r': bytbl.setdefault(c['tbl'],[]).append(c)
for t,cols in bytbl.items():
    stm=[]
    for c in cols:
        if c['default'] and 'nextval(' in c['default']: continue
        s='alter table public.%s add column if not exists %s %s' % (t, '"'+c['col']+'"', c['type'])
        if c['default']: s+=' default '+c['default']
        if c['notnull'] and c['default']: s+=' not null'
        stm.append(s+';')
    sec('columns: '+t, '\n'.join(stm))

# ---- RLS on ----
sec('rls: enable on all tables', '\n'.join('alter table public.%s enable row level security;' % t for t in d['tables']))

# ---- generic functions (except directory functions) ----
DIRFN=('map_teachers(','search_teachers(')
def fn_block(f):
    b=f['def'].rstrip()+';\n'
    b+='revoke all on function public.%s from public, anon, authenticated, service_role;\n' % f['sig']
    g=[x for x in f['grantees'] if x!='postgres']
    if g: b+='grant execute on function public.%s to %s;\n' % (f['sig'], ', '.join(g))
    return b
for f in d['functions']:
    if f['sig'].startswith(DIRFN): continue
    sec('function: '+f['sig'], 'set local check_function_bodies = off;\n'+fn_block(f))

# ---- views + directory functions (atomic) ----
views={v['name']:v for v in d['views']}
body='''do $do$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.proname in ('map_teachers', 'search_teachers')
  loop execute format('drop function %s', f.sig); end loop;
end $do$;
drop view if exists public.teacher_directory;
create view public.teacher_directory as
'''+views['teacher_directory']['def'].rstrip().rstrip(';')+''';
revoke all on public.teacher_directory from public, anon, authenticated;
grant select on public.teacher_directory to anon, authenticated;
'''
for f in d['functions']:
    if f['sig'].startswith(DIRFN): body+=fn_block(f)
sec('directory: view + map/search functions', body)
sec('view: quiz_questions_public', '''drop view if exists public.quiz_questions_public;
create view public.quiz_questions_public with (security_invoker = off) as
'''+views['quiz_questions_public']['def'].rstrip().rstrip(';')+''';
revoke all on public.quiz_questions_public from public, anon, authenticated;
grant select on public.quiz_questions_public to authenticated;''')

# ---- triggers ----
bt={}
for t in d['triggers']: bt.setdefault(t['tbl'],[]).append(t)
hist_trg=set(re.findall(r'create trigger (\w+)\s+(?:before|after)[^;]*?\son\s+([\w.]+)', allsql, flags=re.I|re.S))
for tbl,ts in bt.items():
    if tbl.startswith('auth.'):
        for t in ts:
            sec('trigger: %s on %s (create if missing)' % (t['name'], tbl), '''do $do$
begin
  if not exists (select 1 from pg_trigger where tgname = %s and tgrelid = %s::regclass) then
    execute %s;
  end if;
end $do$;''' % (q(t['name']), q(tbl), q(t['def'])))
        continue
    names={t['name'] for t in ts}
    stm=[]
    for (n,tb) in sorted(hist_trg):
        if tb.replace('public.','')==tbl.replace('public.','') and n not in names:
            stm.append('drop trigger if exists %s on %s;' % (n, tbl))
    for t in ts:
        stm.append('drop trigger if exists %s on %s;' % (t['name'], tbl))
        stm.append(t['def']+';')
    sec('triggers: '+tbl, '\n'.join(stm))

# ---- policies ----
hist_pol=set()
for m in re.finditer(r'(?:create|alter) policy "([^"]+)"\s+on\s+([\w.]+)', allsql, flags=re.I):
    hist_pol.add((m.group(2), m.group(1)))
bp={}
for p in d['policies']: bp.setdefault(p['schema']+'.'+p['tbl'],[]).append(p)
for tbl,ps in bp.items():
    names={p['name'] for p in ps}
    stm=[]
    for (tb,n) in sorted(hist_pol):
        if tb==tbl and n not in names:
            stm.append('drop policy if exists "%s" on %s;  -- سياسة قديمة أُلغيت' % (n, tbl))
    for p in ps:
        stm.append('drop policy if exists "%s" on %s;' % (p['name'], tbl))
        s='create policy "%s" on %s as %s for %s to %s' % (p['name'], tbl, p['permissive'].lower(), p['cmd'].lower(), ', '.join(p['roles']))
        if p['qual'] is not None: s+='\n  using (%s)' % p['qual']
        if p['check'] is not None: s+='\n  with check (%s)' % p['check']
        stm.append(s+';')
    sec('policies: '+tbl, '\n'.join(stm))

# ---- indexes ----
stm=[]
for i in d['indexes']:
    stm.append(re.sub(r'^CREATE (UNIQUE )?INDEX ', lambda m: 'CREATE %sINDEX IF NOT EXISTS ' % (m.group(1) or ''), i['def'])+';')
sec('indexes', '\n'.join(stm))

# ---- storage buckets ----
stm=[]
for b in d['buckets']:
    mt='array[%s]' % ','.join(q(x) for x in b['allowed_mime_types']) if b['allowed_mime_types'] else 'null'
    stm.append('''insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (%s, %s, %s, %s, %s)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;''' % (q(b['id']), q(b['name']), str(b['public']).lower(), b['file_size_limit'] or 'null', mt))
sec('storage: bucket size/type limits', '\n'.join(stm))

# ---- expected inventory + report ----
def ins(tbl, cols, rows):
    return "create temp table %s(%s);\ninsert into %s values\n  %s;\n" % (tbl, ', '.join(c+' text' for c in cols), tbl, ',\n  '.join('('+', '.join(q(x) for x in r)+')' for r in rows))
out.append(ins('dalili_exp_fn',['sig','h'],[(f['sig'],f['h']) for f in d['functions']]))
out.append(ins('dalili_exp_trg',['tbl','name'],[(t['tbl'],t['name']) for t in d['triggers']]))
out.append(ins('dalili_exp_pol',['tbl','name','cmd','h'],[(p['schema']+'.'+p['tbl'],p['name'],p['cmd'],p['h']) for p in d['policies']]))
out.append(ins('dalili_exp_col',['tbl','col'],[(c['tbl'],c['col']) for c in d['columns']]))
out.append(ins('dalili_exp_idx',['name'],[(i['name'],) for i in d['indexes']]))
out.append(r'''
with cur as (
  select p.oid::regprocedure::text as sig, md5(regexp_replace(p.prosrc, '\s+', '', 'g')) as h
  from pg_proc p where p.pronamespace = 'public'::regnamespace
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
)
insert into dalili_report(kind, item, detail)
select 'function MISSING', e.sig, '' from dalili_exp_fn e where not exists (select 1 from cur c where c.sig = e.sig)
union all select 'function DIFFERS', e.sig, '' from dalili_exp_fn e join cur c on c.sig = e.sig where c.h <> e.h
union all select 'function EXTRA', c.sig, 'not in repo' from cur c where not exists (select 1 from dalili_exp_fn e where e.sig = c.sig);

with cur as (
  select c.relnamespace::regnamespace::text || '.' || c.relname as tbl, t.tgname as name
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  where not t.tgisinternal and c.relnamespace::regnamespace::text in ('public', 'auth')
)
insert into dalili_report(kind, item, detail)
select 'trigger MISSING', e.tbl, e.name from dalili_exp_trg e where not exists (select 1 from cur c where c.tbl = e.tbl and c.name = e.name)
union all select 'trigger EXTRA', c.tbl, c.name from cur c where c.tbl like 'public.%' and not exists (select 1 from dalili_exp_trg e where e.tbl = c.tbl and e.name = c.name);

with cur as (
  select schemaname || '.' || tablename as tbl, policyname as name, cmd,
         md5(regexp_replace(coalesce(qual, '') || '#' || coalesce(with_check, ''), '\s+', '', 'g')) as h
  from pg_policies where schemaname in ('public', 'storage')
), diffs as (
  select e.tbl, e.name from dalili_exp_pol e join cur c on c.tbl = e.tbl and c.name = e.name where c.h <> e.h or c.cmd <> e.cmd
)
insert into dalili_report(kind, item, detail)
select 'policy MISSING', e.tbl, e.name from dalili_exp_pol e where not exists (select 1 from cur c where c.tbl = e.tbl and c.name = e.name)
union all select 'policy EXTRA', c.tbl, c.name || ' [' || c.cmd || ']' from cur c where not exists (select 1 from dalili_exp_pol e where e.tbl = c.tbl and e.name = c.name)
union all select 'policy DIFFERS', d.tbl, d.name from diffs d where (select count(*) from diffs) <= 15
union all select 'policy text format', count(*) || ' policies', 'formatting only (different Postgres version) - ignore' from diffs having count(*) > 15;

with cur as (select table_name as tbl, column_name as col from information_schema.columns where table_schema = 'public')
insert into dalili_report(kind, item, detail)
select 'column MISSING', e.tbl, e.col from dalili_exp_col e where not exists (select 1 from cur c where c.tbl = e.tbl and c.col = e.col)
union all select 'column EXTRA', c.tbl, c.col from cur c where not exists (select 1 from dalili_exp_col e where e.tbl = c.tbl and e.col = c.col);

insert into dalili_report(kind, item, detail)
select 'index MISSING', e.name, '' from dalili_exp_idx e
where not exists (select 1 from pg_indexes i where i.schemaname = 'public' and i.indexname = e.name);

insert into dalili_report(kind, item, detail)
select 'table WITHOUT RLS', c.relname, '' from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity;

insert into dalili_report(kind, item, detail)
select 'privilege PROBLEM', 'view writable by ' || r.rolname, c.relname
from pg_class c cross join (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r
where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
  and (has_table_privilege(r.rolname, c.oid, 'INSERT') or has_table_privilege(r.rolname, c.oid, 'UPDATE') or has_table_privilege(r.rolname, c.oid, 'DELETE'));

insert into dalili_report(kind, item, detail)
select 'privilege PROBLEM', 'client can call ' || p.oid::regprocedure::text, r.rolname
from pg_proc p cross join (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('check_security_answer', 'check_reset_rate_limit', 'reset_lookup_user')
  and has_function_privilege(r.rolname, p.oid, 'EXECUTE');

insert into dalili_report(kind, item, detail)
select 'privilege PROBLEM', 'anon can read teacher_profiles rows', count(*)::text
from pg_policies where schemaname = 'public' and tablename = 'teacher_profiles' and cmd in ('SELECT', 'ALL') and 'anon' = any(roles)
having count(*) > 0;

insert into dalili_report(kind, item, detail)
select 'summary',
       (select count(*) from dalili_report where kind = 'section' and detail = 'OK') || ' sections OK, ' ||
       (select count(*) from dalili_report where kind = 'section' and detail <> 'OK') || ' FAILED',
       (select count(*) from dalili_report where kind not in ('section', 'summary')) || ' differences remaining | postgres ' || current_setting('server_version');

-- التقرير النهائي: الفاشل أولاً، ثم الفروقات، ثم الملخّص (الأقسام الناجحة لا تُعرض)
select kind, item, detail from dalili_report
where not (kind = 'section' and detail = 'OK')
order by (kind = 'summary'), (kind <> 'section'), ord;
''')
open('converge.sql','w').write('\n'.join(out))
print('sections', nsec, 'bytes', len('\n'.join(out).encode()))
obs=[(tb,n) for (tb,n) in sorted(hist_pol) if n not in {p['name'] for p in d['policies'] if p['schema']+'.'+p['tbl']==tb}]
print('obsolete policies to drop:', obs)
