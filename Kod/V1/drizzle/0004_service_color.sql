-- Boja kartice u kalendaru sada prati USLUGU, ne radnika.
-- services.color isti oblik kao staff.color (#94a3b8 = fallback/"Bilo ko").
alter table services add column if not exists color text not null default '#94a3b8';

-- Postojeće usluge dobijaju boje ciklično iz palete (ista 8 boja kao radnici),
-- redom po imenu unutar svakog salona, da nijedan salon ne ostane sav siv.
with paleta (idx, boja) as (
  values
    (0, '#f59e0b'),
    (1, '#3b82f6'),
    (2, '#10b981'),
    (3, '#f43f5e'),
    (4, '#8b5cf6'),
    (5, '#06b6d4'),
    (6, '#f97316'),
    (7, '#84cc16')
),
numbered as (
  select id, (row_number() over (partition by salon_id order by name) - 1) % 8 as idx
  from services
)
update services
set color = paleta.boja
from numbered
join paleta on paleta.idx = numbered.idx
where services.id = numbered.id;
