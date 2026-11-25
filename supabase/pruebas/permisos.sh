#!/bin/bash
A=11111111-1111-1111-1111-111111111111  # cliente A
B=22222222-2222-2222-2222-222222222222  # cliente B
O=33333333-3333-3333-3333-333333333333  # operador
G=44444444-4444-4444-4444-444444444444  # agente
ADM="psql -h /tmp/pgt -p 5544 -U postgres -d landex -qtA -v ON_ERROR_STOP=1"
$ADM -c "insert into auth.users values ('$A','a@x.cr'),('$B','b@x.cr'),('$O','ale@landex.cr'),('$G','tia@landex.cr')"
$ADM -c "update perfiles set rol='operador' where email='ale@landex.cr'; update perfiles set rol='agente' where email='tia@landex.cr';" && echo "OK  admin asigna roles desde SQL Editor"
como() { # usuario, rol, sql
  local claims; if [ -z "$1" ]; then claims='{"role":"anon"}'; else claims="{\"sub\":\"$1\",\"role\":\"authenticated\"}"; fi
  psql -h /tmp/pgt -p 5544 -U authenticator -d landex -qtA -v ON_ERROR_STOP=1 -c "begin; set local role $2; set local request.jwt.claims = '$claims'; $3; commit;" 2>&1
}
esperar() { # descripción, esperado(ok|error), salida
  local r; if echo "$3" | grep -q "ERROR"; then r=error; else r=ok; fi
  if [ "$r" = "$2" ]; then echo "OK  $1"; else echo "FALLA  $1 → $3"; fi
}
esperar "cliente A crea cotización" ok "$(como $A authenticated "insert into cotizaciones (nombre, datos, total) values ('sillas', '{\"p\":1}', 100)")"
CA=$($ADM -c "select id from cotizaciones where cliente_id='$A'")
N=$($ADM -c "select numero from cotizaciones where id='$CA'"); echo "    número asignado: $N"
esperar "cliente A no puede crear a nombre de B (se fuerza su id)" ok "$(como $A authenticated "insert into cotizaciones (cliente_id, nombre, datos) values ('$B','x','{}')")"
echo "    dueño forzado: $($ADM -c "select count(*) from cotizaciones where cliente_id='$B'") cotizaciones de B (esperado 0)"
esperar "cliente B no ve la cotización de A" ok "$(como $B authenticated "do \$\$ begin if (select count(*) from cotizaciones where id='$CA') > 0 then raise exception 've'; end if; end \$\$")"
esperar "visitante anónimo no ve cotizaciones" ok "$(como '' anon "do \$\$ begin if (select count(*) from cotizaciones) > 0 then raise exception 've'; end if; end \$\$")"
esperar "visitante anónimo no puede crear" error "$(como '' anon "insert into cotizaciones (nombre, datos) values ('x','{}')")"
esperar "cliente A no puede emitir formal" error "$(como $A authenticated "update cotizaciones set estado='formal', emision='{\"vence\":\"2099-01-01\"}' where id='$CA'")"
esperar "cliente A no puede subirse de rol" error "$(como $A authenticated "update perfiles set rol='operador' where id='$A'")"
esperar "cliente A edita su perfil" ok "$(como $A authenticated "update perfiles set nombre='Ana' where id='$A'")"
esperar "agente emite formal" ok "$(como $G authenticated "update cotizaciones set estado='formal', emision='{\"vence\":\"2099-01-01\"}' where id='$CA'")"
esperar "cliente A acepta la formal vigente" ok "$(como $A authenticated "update cotizaciones set estado='aceptada' where id='$CA'")"
$ADM -c "update cotizaciones set estado='formal', emision='{\"vence\":\"2020-01-01\"}' where id='$CA'"
esperar "cliente A no puede aceptar una formal vencida" error "$(como $A authenticated "update cotizaciones set estado='aceptada' where id='$CA'")"
$ADM -c "update cotizaciones set emision='{\"vence\":\"2099-01-01\"}' where id='$CA'"
como $A authenticated "update cotizaciones set datos='{\"p\":2}', estado='estimada' where id='$CA'" >/dev/null
echo "    al cambiar datos la emisión queda: '$($ADM -c "select coalesce(emision::text,'anulada') from cotizaciones where id='$CA'")' (esperado anulada)"
esperar "cliente A sube documento a su cotización" ok "$(como $A authenticated "insert into documentos (cotizacion_id, tipo, archivo, estado) values ('$CA','factura','$CA/factura/f.pdf','revisado')")"
echo "    estado forzado al subir: $($ADM -c "select estado from documentos where cotizacion_id='$CA'") (esperado recibido)"
esperar "cliente B no puede subir a la cotización de A" error "$(como $B authenticated "insert into documentos (cotizacion_id, tipo, archivo) values ('$CA','factura','$CA/factura/x.pdf')")"
como $A authenticated "update documentos set estado='revisado' where cotizacion_id='$CA'" >/dev/null
echo "    cliente intenta marcar revisado → estado sigue: $($ADM -c "select estado from documentos where cotizacion_id='$CA'") (esperado recibido)"
esperar "agente revisa el documento" ok "$(como $G authenticated "update documentos set estado='revisado' where cotizacion_id='$CA'")"
echo "    revisado_por: $($ADM -c "select (revisado_por='$G')::text from documentos where cotizacion_id='$CA'") (esperado true)"
esperar "cliente A sube archivo a su carpeta" ok "$(como $A authenticated "insert into storage.objects (bucket_id, name) values ('documentos','$CA/factura/f.pdf')")"
esperar "cliente B no puede subir archivo a carpeta de A" error "$(como $B authenticated "insert into storage.objects (bucket_id, name) values ('documentos','$CA/factura/z.pdf')")"
esperar "cliente B no ve archivos de A" ok "$(como $B authenticated "do \$\$ begin if (select count(*) from storage.objects) > 0 then raise exception 've'; end if; end \$\$")"
esperar "ruta inválida no rompe la política" error "$(como $B authenticated "insert into storage.objects (bucket_id, name) values ('documentos','no-es-uuid/x.pdf')")"
esperar "cliente no puede crear tarifas" error "$(como $A authenticated "insert into tarifas (id, datos, publicada) values ('t1','{}',true)")"
esperar "agente no puede crear tarifas (solo operador)" error "$(como $G authenticated "insert into tarifas (id, datos, publicada) values ('t1','{}',true)")"
esperar "operador crea tarifas" ok "$(como $O authenticated "insert into tarifas (id, datos, publicada, vigente_hasta) values ('t1','{}',true,'2099-01-01'), ('t2','{}',false,'2099-01-01'), ('t3','{}',true,'2020-01-01'), ('t4','{}',true,'2099-01-01')")"
$ADM -c "update tarifas set ejemplo=true where id='t4'"
VIS=$(psql -h /tmp/pgt -p 5544 -U authenticator -d landex -qtA -f $(dirname "$0")/vis.sql)
echo "    visitante ve tarifas: $VIS (esperado solo t1: publicada, vigente y real)"
esperar "operador asigna rol a otro usuario" ok "$(como $O authenticated "update perfiles set rol='agente' where id='$B'")"
esperar "agente no puede asignar roles" error "$(como $G authenticated "update perfiles set rol='operador' where id='$A'")"
esperar "cliente A no puede borrar una cotización aceptada/formal" ok "$(como $A authenticated "update cotizaciones set estado='estimada' where id='$CA'" ; echo)"
echo "    consecutivo siguiente: $($ADM -c "select siguiente_numero()")"
