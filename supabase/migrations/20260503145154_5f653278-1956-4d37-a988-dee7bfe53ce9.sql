
-- Add icone column to especialidades
ALTER TABLE public.especialidades ADD COLUMN IF NOT EXISTS icone TEXT DEFAULT '🩺';

-- Populate existing specialties with icons
UPDATE public.especialidades SET icone = '❤️' WHERE slug = 'cardiologia';
UPDATE public.especialidades SET icone = '🩺' WHERE slug = 'clinica-geral';
UPDATE public.especialidades SET icone = '🧴' WHERE slug = 'dermatologia';
UPDATE public.especialidades SET icone = '⚗️' WHERE slug = 'endocrinologia';
UPDATE public.especialidades SET icone = '🌷' WHERE slug = 'ginecologia';
UPDATE public.especialidades SET icone = '🦴' WHERE slug = 'ortopedia';
UPDATE public.especialidades SET icone = '🧸' WHERE slug = 'pediatria';
UPDATE public.especialidades SET icone = '🧠' WHERE slug = 'psiquiatria';
