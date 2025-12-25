-- Migration 1: Add 'criador' to app_role enum and criador_id column
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'criador';

-- Add criador_id column to lotes table
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS criador_id uuid REFERENCES auth.users(id);