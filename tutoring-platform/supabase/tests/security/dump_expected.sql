\pset tuples_only on
\pset format unaligned
select json_build_object(
 'functions', (select json_agg(json_build_object(
      'sig', p.oid::regprocedure::text,
      'def', pg_get_functiondef(p.oid),
      'h', md5(regexp_replace(p.prosrc, '\s+', '', 'g')),
      'grantees', (select coalesce(json_agg(case when a.grantee = 0 then 'public' else a.grantee::regrole::text end), '[]'::json)
                   from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                   where a.privilege_type = 'EXECUTE')
    ) order by p.oid::regprocedure::text)
    from pg_proc p where p.pronamespace = 'public'::regnamespace),
 'triggers', (select json_agg(json_build_object(
      'tbl', c.relnamespace::regnamespace::text || '.' || c.relname, 'name', t.tgname, 'def', pg_get_triggerdef(t.oid)) order by c.relname, t.tgname)
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where not t.tgisinternal and c.relnamespace::regnamespace::text in ('public','auth')),
 'policies', (select json_agg(json_build_object(
      'schema', schemaname, 'tbl', tablename, 'name', policyname, 'permissive', permissive,
      'roles', roles, 'cmd', cmd, 'qual', qual, 'check', with_check,
      'h', md5(regexp_replace(coalesce(qual,'') || '#' || coalesce(with_check,''), '\s+', '', 'g'))) order by schemaname, tablename, policyname)
    from pg_policies where schemaname in ('public','storage')),
 'columns', (select json_agg(json_build_object(
      'tbl', c.relname, 'col', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
      'notnull', a.attnotnull, 'default', pg_get_expr(d.adbin, d.adrelid), 'kind', c.relkind) order by c.relname, a.attnum)
    from pg_attribute a join pg_class c on c.oid = a.attrelid left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','v') and a.attnum > 0 and not a.attisdropped),
 'tables', (select json_agg(c.relname order by c.relname) from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'),
 'indexes', (select json_agg(json_build_object('name', i.indexname, 'def', i.indexdef) order by i.indexname)
    from pg_indexes i where i.schemaname = 'public'
      and not exists (select 1 from pg_constraint k where k.conname = i.indexname)),
 'views', (select json_agg(json_build_object('name', c.relname, 'def', pg_get_viewdef(c.oid, true),
      'opts', c.reloptions) order by c.relname)
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'),
 'buckets', (select json_agg(row_to_json(b) order by b.id) from storage.buckets b)
);
