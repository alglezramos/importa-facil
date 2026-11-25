# Pruebas de permisos (sin conexión a Supabase)

Simulan en un PostgreSQL local lo mínimo de Supabase (`auth.uid()`, roles `anon`/`authenticated`, Storage) y verifican
que cada rol solo pueda hacer lo que le corresponde.

```bash
# PostgreSQL 16 escuchando en el socket /tmp/pgt, puerto 5544, usuario postgres sin contraseña
psql -h /tmp/pgt -p 5544 -U postgres -c "create database landex"
psql -h /tmp/pgt -p 5544 -U postgres -d landex -f supabase/pruebas/stubs.sql
psql -h /tmp/pgt -p 5544 -U postgres -d landex -f supabase/schema.sql
psql -h /tmp/pgt -p 5544 -U postgres -d landex -c "grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;"
bash supabase/pruebas/permisos.sh
```

Cada línea debe empezar con `OK`. Las comprobaciones con sangría muestran el valor obtenido y el esperado.
Una acción bloqueada por la seguridad de filas no siempre da error: puede modificar 0 filas. Por eso algunas pruebas
verifican el dato después del intento.
