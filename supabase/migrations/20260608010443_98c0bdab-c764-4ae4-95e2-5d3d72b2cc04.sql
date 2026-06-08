
REVOKE SELECT (senha_encrypted) ON public.cameras_dvr FROM authenticated;
REVOKE SELECT (auth_token, sensor_wifi_token) ON public.dispositivos_iot FROM authenticated;
GRANT ALL ON public.cameras_dvr TO service_role;
GRANT ALL ON public.dispositivos_iot TO service_role;
