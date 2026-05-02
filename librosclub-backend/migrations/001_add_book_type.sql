-- Agrega columna type a la tabla books
-- 'venta'       = libro disponible para comprar/adquirir
-- 'intercambio' = libro disponible para intercambiar

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'venta'
    CHECK (type IN ('venta', 'intercambio'));
