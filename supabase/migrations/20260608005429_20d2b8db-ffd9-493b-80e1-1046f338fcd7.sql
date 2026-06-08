UPDATE public.canais_dispositivo c
SET ultimo_estado_persistido = c.estado_atual,
    ultimo_estado_persistido_em = COALESCE(c.ultimo_comando_em, now())
FROM public.dispositivos_iot d
WHERE c.dispositivo_id = d.id
  AND d.driver = 'ewelink'
  AND c.ultimo_comando_em IS NOT NULL
  AND c.ultimo_estado_persistido_em IS NULL;