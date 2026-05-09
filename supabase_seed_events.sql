-- WARSAW FC — seed historycznych ustawek S03E03-S03E12

insert into events (code, title, event_date, season, status)
values
('[ S03E03 ]', 'WARSAW FC MATCHDAY', '2026-03-04', 'S03', 'completed'),
('[ S03E04 ]', 'WARSAW FC MATCHDAY', '2026-03-11', 'S03', 'completed'),
('[ S03E05 ]', 'WARSAW FC MATCHDAY', '2026-03-18', 'S03', 'completed'),
('[ S03E06 ]', 'WARSAW FC MATCHDAY', '2026-03-25', 'S03', 'completed'),
('[ S03E07 ]', 'WARSAW FC MATCHDAY', '2026-04-01', 'S03', 'completed'),
('[ S03E08 ]', 'WARSAW FC MATCHDAY', '2026-04-08', 'S03', 'completed'),
('[ S03E09 ]', 'WARSAW FC MATCHDAY', '2026-04-15', 'S03', 'completed'),
('[ S03E10 ]', 'WARSAW FC MATCHDAY', '2026-04-22', 'S03', 'completed'),
('[ S03E11 ]', 'WARSAW FC MATCHDAY', '2026-04-29', 'S03', 'completed'),
('[ S03E12 ]', 'WARSAW FC MATCHDAY', '2026-05-06', 'S03', 'completed')
on conflict (code) do update
set title = excluded.title,
    event_date = excluded.event_date,
    season = excluded.season,
    status = excluded.status;
