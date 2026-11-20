-- Teardown del smoke de 40 rutas (FEAT-001, RNF-10 / AC-37 / T-M-11).
-- Se ejecuta en UNA transacción:
--   psql -h "$VALIDATED_DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
--        -v ON_ERROR_STOP=1 -1 -v prefix=smoke_feat001_ -v user_ids='{..}' \
--        -v book_ids='{..}' -v club_ids='{..}' -v listing_ids='{..}' -f teardown.sql
-- La contraseña llega por PGPASSWORD en el entorno, nunca por línea de comandos.
-- Filtra por los ids que registró el smoke y por el prefijo. Los valores
-- entran como variables de psql (:'var'), sin concatenar SQL.
-- Orden de dependencias: book_request_messages -> book_requests ->
-- exchange_requests -> exchange_listings -> club_posts -> club_meetings ->
-- club_members -> clubs -> books -> users.

CREATE TEMP TABLE smoke_users ON COMMIT DROP AS
  SELECT id FROM public.users
  WHERE id = ANY (:'user_ids'::int[])
     OR username LIKE replace(:'prefix', '_', '\_') || '%';

CREATE TEMP TABLE smoke_books ON COMMIT DROP AS
  SELECT id FROM public.books
  WHERE id = ANY (:'book_ids'::int[])
     OR title LIKE replace(:'prefix', '_', '\_') || '%';

CREATE TEMP TABLE smoke_clubs ON COMMIT DROP AS
  SELECT id FROM public.clubs
  WHERE id = ANY (:'club_ids'::int[])
     OR nombre LIKE replace(:'prefix', '_', '\_') || '%'
     OR creador_id IN (SELECT id FROM smoke_users);

CREATE TEMP TABLE smoke_listings ON COMMIT DROP AS
  SELECT id FROM public.exchange_listings
  WHERE id = ANY (:'listing_ids'::int[])
     OR title LIKE replace(:'prefix', '_', '\_') || '%'
     OR user_id IN (SELECT id FROM smoke_users);

DELETE FROM public.book_request_messages
 WHERE sender_id IN (SELECT id FROM smoke_users)
    OR request_id IN (SELECT id FROM public.book_requests
                       WHERE user_id IN (SELECT id FROM smoke_users)
                          OR book_id IN (SELECT id FROM smoke_books));

DELETE FROM public.book_requests
 WHERE user_id IN (SELECT id FROM smoke_users)
    OR book_id IN (SELECT id FROM smoke_books);

DELETE FROM public.exchange_requests
 WHERE requester_id IN (SELECT id FROM smoke_users)
    OR listing_id IN (SELECT id FROM smoke_listings);

DELETE FROM public.exchange_listings
 WHERE id IN (SELECT id FROM smoke_listings);

DELETE FROM public.club_posts
 WHERE autor_id IN (SELECT id FROM smoke_users)
    OR club_id IN (SELECT id FROM smoke_clubs);

DELETE FROM public.club_meetings
 WHERE club_id IN (SELECT id FROM smoke_clubs);

DELETE FROM public.club_members
 WHERE usuario_id IN (SELECT id FROM smoke_users)
    OR club_id IN (SELECT id FROM smoke_clubs);

DELETE FROM public.clubs
 WHERE id IN (SELECT id FROM smoke_clubs);

DELETE FROM public.books
 WHERE id IN (SELECT id FROM smoke_books);

DELETE FROM public.users
 WHERE id IN (SELECT id FROM smoke_users);
