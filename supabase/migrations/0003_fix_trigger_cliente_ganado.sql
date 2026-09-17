-- Corrige el trigger que marca al cliente cuando se gana una oportunidad.
-- Antes ponía estado = 'activo' (valor que ya no existe); ahora usa 'cliente'.
-- Correr en el SQL Editor de Supabase (una sola vez).

CREATE OR REPLACE FUNCTION public.fn_cliente_activo_en_ganado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.estado_pipeline = 'ganado' THEN
    UPDATE clientes
    SET estado = 'cliente'
    WHERE id = NEW.cliente_id;
  END IF;
  RETURN NEW;
END;
$function$
