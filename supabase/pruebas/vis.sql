begin; set local role anon; select string_agg(id, ',') from tarifas; commit;
