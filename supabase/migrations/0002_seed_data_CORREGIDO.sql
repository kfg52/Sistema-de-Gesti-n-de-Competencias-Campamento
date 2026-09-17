-- =====================================================
-- Campamento de Varones IDP — Migración 0002
-- Seed: 31 iglesias, 6 competencias, datos ficticios de prueba
-- =====================================================

-- -----------------------------------------------------
-- 1) IGLESIAS (las 31 obligatorias del documento maestro)
-- -----------------------------------------------------
insert into public.churches (name) values
  ('IDP Azua'),
  ('IDP Bahoruco'),
  ('IDP Barahona'),
  ('IDP Dajabón'),
  ('IDP Duarte'),
  ('IDP Elías Piña'),
  ('IDP El Seibo'),
  ('IDP Espaillat'),
  ('IDP Hato Mayor'),
  ('IDP Hermanas Mirabal'),
  ('IDP Independencia'),
  ('IDP La Altagracia'),
  ('IDP La Romana'),
  ('IDP La Vega'),
  ('IDP María Trinidad Sánchez'),
  ('IDP Monseñor Nouel'),
  ('IDP Monte Cristi'),
  ('IDP Monte Plata'),
  ('IDP Pedernales'),
  ('IDP Peravia'),
  ('IDP Puerto Plata'),
  ('IDP Samaná'),
  ('IDP San Cristóbal'),
  ('IDP San José de Ocoa'),
  ('IDP San Juan'),
  ('IDP San Pedro de Macorís'),
  ('IDP Sánchez Ramírez'),
  ('IDP Santiago'),
  ('IDP Santiago Rodríguez'),
  ('IDP Santo Domingo'),
  ('IDP Valverde')
on conflict (name) do nothing;

-- -----------------------------------------------------
-- 2) COMPETENCIAS (configuración inicial)
-- -----------------------------------------------------
insert into public.competitions
  (name, description, tipo, jugadores_por_equipo, permite_equipos, activa, estado)
values
  ('Basketball', 'Torneo de baloncesto 5 vs 5.', 'TEAM', 5, true, true, 'ACTIVE'),
  ('Baseball', 'Torneo de béisbol 9 vs 9.', 'TEAM', 9, true, true, 'ACTIVE'),
  ('Dominó', 'Torneo de dominó por mesas (parejas).', 'TEAM', 2, true, true, 'ACTIVE'),
  ('Natación', '50m libre, eliminatoria directa individual.', 'INDIVIDUAL', 1, false, true, 'ACTIVE'),
  ('Carrera campo traviesa', 'Ruta de 3K por sendero, individual.', 'INDIVIDUAL', 1, false, true, 'ACTIVE'),
  ('Ajedrez', 'Sistema suizo, 5 rondas, individual.', 'INDIVIDUAL', 1, false, true, 'ACTIVE')
on conflict (name) do nothing;

-- -----------------------------------------------------
-- 3) PUNTOS DE CLASIFICACIÓN (valores iniciales, editables)
-- -----------------------------------------------------
insert into public.ranking_points (first_place, second_place, third_place, participation, victory)
values (10, 6, 4, 2, 3);

-- -----------------------------------------------------
-- 4) PARTICIPANTES (ficticios)
-- 38 atletas ficticios repartidos en varias iglesias.
-- -----------------------------------------------------
with ins_participants as (
  insert into public.participants (first_name, last_name, church_id)
  select v.first_name, v.last_name, c.id
  from (
    values
      ('Juan',        'Pérez',       'IDP La Romana'),
      ('Carlos',      'Martínez',    'IDP La Romana'),
      ('Pedro',       'Gómez',       'IDP La Romana'),
      ('Miguel',      'Santos',      'IDP La Romana'),
      ('David',       'Rodríguez',   'IDP La Romana'),
      ('Mateo',       'Morales',     'IDP Santiago'),
      ('Lucas',       'Silva',       'IDP Santiago'),
      ('Andrés',      'Navarro',     'IDP Santiago'),
      ('Felipe',      'Castro',      'IDP Santiago'),
      ('Samuel',      'Ortega',      'IDP Santiago'),
      ('Gabriel',     'Rojas',       'IDP Santo Domingo'),
      ('Esteban',     'Lima',        'IDP Santo Domingo'),
      ('Isaac',       'Peña',        'IDP Santo Domingo'),
      ('Daniel',      'Vargas',      'IDP Santo Domingo'),
      ('Jonathan',    'Cruz',        'IDP Santo Domingo'),
      ('Emanuel',     'Díaz',        'IDP San Cristóbal'),
      ('Marcos',      'Herrera',     'IDP San Cristóbal'),
      ('Joel',        'Benítez',     'IDP San Cristóbal'),
      ('Benjamín',    'Ramos',       'IDP San Cristóbal'),
      ('Alejandro',   'Núñez',       'IDP Duarte'),
      ('Ricardo',     'Guzmán',      'IDP Espaillat'),
      ('Fernando',    'Jiménez',     'IDP La Vega'),
      ('Óscar',       'Peralta',     'IDP Puerto Plata'),
      ('Tomás',       'Acosta',      'IDP Azua'),
      ('Raúl',        'Campos',      'IDP La Romana'),
      ('Sergio',      'Delgado',     'IDP La Romana'),
      ('Víctor',      'Valdez',      'IDP Santiago'),
      ('Héctor',      'Maldonado',   'IDP Santiago'),
      ('Wilfredo',    'Peña',        'IDP Santo Domingo'),
      ('Rafael',      'Taveras',     'IDP Santo Domingo'),
      ('José',        'Batista',     'IDP San Cristóbal'),
      ('Manuel',      'Fermín',      'IDP San Cristóbal'),
      ('Ángel',       'Rosario',     'IDP Duarte'),
      ('Nelson',      'Moreta',      'IDP Espaillat'),
      ('Yonathan',    'Almonte',     'IDP La Vega'),
      ('Elías',       'Sosa',        'IDP Puerto Plata'),
      ('Franklin',    'de la Cruz',  'IDP Azua'),
      ('Ramón',       'Antigua',     'IDP Santiago Rodríguez')
  ) as v(first_name, last_name, church_name)
  join public.churches c on c.name = v.church_name
  returning id, first_name, last_name
)
select * from ins_participants;

-- -----------------------------------------------------
-- 5) INSCRIPCIONES (Basketball: todos los integrantes de los equipos)
-- Se inscriben todos los participantes que aparecen en los 8 equipos.
insert into public.registrations (participant_id, competition_id)
select p.id, c.id
from public.participants p
join public.competitions c on c.name = 'Basketball'
where p.first_name || ' ' || p.last_name in (
  'Juan Pérez', 'Carlos Martínez', 'Pedro Gómez', 'Miguel Santos', 'David Rodríguez',
  'Mateo Morales', 'Lucas Silva', 'Andrés Navarro', 'Felipe Castro',
  'Samuel Ortega', 'Gabriel Rojas', 'Esteban Lima', 'Isaac Peña', 'Daniel Vargas',
  'Jonathan Cruz', 'Emanuel Díaz', 'Marcos Herrera', 'Joel Benítez', 'Benjamín Ramos',
  'Raúl Campos', 'Sergio Delgado', 'Víctor Valdez', 'Héctor Maldonado', 'Wilfredo Peña',
  'Rafael Taveras', 'José Batista', 'Manuel Fermín', 'Alejandro Núñez',
  'Ricardo Guzmán', 'Fernando Jiménez', 'Óscar Peralta', 'Tomás Acosta',
  'Ángel Rosario', 'Nelson Moreta', 'Yonathan Almonte', 'Elías Sosa',
  'Franklin de la Cruz'
)
on conflict (participant_id, competition_id) do nothing;

-- -----------------------------------------------------
-- 6) EQUIPOS Basketball (8 equipos) + INTEGRANTES
-- -----------------------------------------------------
-- Los Titanes (FULL 5/5)
insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Los Titanes', 5, 'FULL' from public.competitions c where c.name = 'Basketball';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in (
  'Juan Pérez', 'Carlos Martínez', 'Pedro Gómez', 'Miguel Santos', 'David Rodríguez'
)
where c.name = 'Basketball' and t.name = 'Los Titanes';

-- Los Guerreros (OPEN 4/5 – busca 1 jugador)
insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Los Guerreros', 5, 'OPEN' from public.competitions c where c.name = 'Basketball';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in (
  'Mateo Morales', 'Lucas Silva', 'Andrés Navarro', 'Felipe Castro'
)
where c.name = 'Basketball' and t.name = 'Los Guerreros';

-- Los Halcones (FULL 5/5)
insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Los Halcones', 5, 'FULL' from public.competitions c where c.name = 'Basketball';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in (
  'Samuel Ortega', 'Gabriel Rojas', 'Esteban Lima', 'Isaac Peña', 'Daniel Vargas'
)
where c.name = 'Basketball' and t.name = 'Los Halcones';

-- Los Leones (FULL 5/5)
insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Los Leones', 5, 'FULL' from public.competitions c where c.name = 'Basketball';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in (
  'Jonathan Cruz', 'Emanuel Díaz', 'Marcos Herrera', 'Joel Benítez', 'Benjamín Ramos'
)
where c.name = 'Basketball' and t.name = 'Los Leones';

-- Patriotas (FULL 5/5)
insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Patriotas', 5, 'FULL' from public.competitions c where c.name = 'Basketball';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in (
  'Raúl Campos', 'Sergio Delgado', 'Víctor Valdez', 'Héctor Maldonado', 'Wilfredo Peña'
)
where c.name = 'Basketball' and t.name = 'Patriotas';

-- Relámpagos (OPEN 4/5)
insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Relámpagos', 5, 'OPEN' from public.competitions c where c.name = 'Basketball';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in (
  'Rafael Taveras', 'José Batista', 'Manuel Fermín', 'Alejandro Núñez'
)
where c.name = 'Basketball' and t.name = 'Relámpagos';

-- Águilas IDP (OPEN 4/5)
insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Águilas IDP', 5, 'OPEN' from public.competitions c where c.name = 'Basketball';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in (
  'Ricardo Guzmán', 'Fernando Jiménez', 'Óscar Peralta', 'Tomás Acosta'
)
where c.name = 'Basketball' and t.name = 'Águilas IDP';

-- Conquistadores (FULL 5/5)
insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Conquistadores', 5, 'FULL' from public.competitions c where c.name = 'Basketball';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in (
  'Ángel Rosario', 'Nelson Moreta', 'Yonathan Almonte', 'Elías Sosa', 'Franklin de la Cruz'
)
where c.name = 'Basketball' and t.name = 'Conquistadores';

-- -----------------------------------------------------
-- 7) DOMINÓ: parejas + campeón
-- -----------------------------------------------------
insert into public.registrations (participant_id, competition_id)
select p.id, c.id
from public.participants p
join public.competitions c on c.name = 'Dominó'
where p.first_name || ' ' || p.last_name in (
  'Juan Pérez', 'Carlos Martínez', 'Mateo Morales', 'Samuel Ortega',
  'Gabriel Rojas', 'Esteban Lima', 'Pedro Gómez', 'Miguel Santos',
  'David Rodríguez', 'Lucas Silva', 'Daniel Vargas', 'Isaac Peña'
);

insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Dupla Este', 2, 'CHAMPION' from public.competitions c where c.name = 'Dominó';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in ('Juan Pérez', 'Carlos Martínez')
where c.name = 'Dominó' and t.name = 'Dupla Este';

insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Dupla Norte', 2, 'FINALIST' from public.competitions c where c.name = 'Dominó';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in ('Mateo Morales', 'Samuel Ortega')
where c.name = 'Dominó' and t.name = 'Dupla Norte';

insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Dupla Capital', 2, 'ELIMINATED' from public.competitions c where c.name = 'Dominó';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in ('Gabriel Rojas', 'Esteban Lima')
where c.name = 'Dominó' and t.name = 'Dupla Capital';

insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Dupla Costa', 2, 'ELIMINATED' from public.competitions c where c.name = 'Dominó';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in ('Pedro Gómez', 'Miguel Santos')
where c.name = 'Dominó' and t.name = 'Dupla Costa';

insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Dupla Sur', 2, 'ELIMINATED' from public.competitions c where c.name = 'Dominó';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in ('David Rodríguez', 'Lucas Silva')
where c.name = 'Dominó' and t.name = 'Dupla Sur';

insert into public.teams (competition_id, name, max_players, status)
select c.id, 'Dupla Oeste', 2, 'ELIMINATED' from public.competitions c where c.name = 'Dominó';

insert into public.team_members (team_id, participant_id)
select t.id, p.id
from public.teams t
join public.competitions c on c.id = t.competition_id
join public.participants p on p.first_name || ' ' || p.last_name in ('Daniel Vargas', 'Isaac Peña')
where c.name = 'Dominó' and t.name = 'Dupla Oeste';

-- -----------------------------------------------------
-- 8) DEPORTES INDIVIDUALES: inscripciones simples
-- -----------------------------------------------------
-- Natación
insert into public.registrations (participant_id, competition_id)
select p.id, c.id
from public.participants p
join public.competitions c on c.name = 'Natación'
where p.first_name || ' ' || p.last_name in (
  'Raúl Campos', 'Víctor Valdez', 'Alejandro Núñez', 'Ricardo Guzmán',
  'Fernando Jiménez', 'Óscar Peralta', 'Tomás Acosta', 'Elías Sosa'
);

-- Carrera campo traviesa
insert into public.registrations (participant_id, competition_id)
select p.id, c.id
from public.participants p
join public.competitions c on c.name = 'Carrera campo traviesa'
where p.first_name || ' ' || p.last_name in (
  'Juan Pérez', 'Mateo Morales', 'Samuel Ortega', 'Jonathan Cruz',
  'Ángel Rosario', 'Nelson Moreta', 'Yonathan Almonte', 'Franklin de la Cruz', 'Ramón Antigua'
);

-- Ajedrez
insert into public.registrations (participant_id, competition_id)
select p.id, c.id
from public.participants p
join public.competitions c on c.name = 'Ajedrez'
where p.first_name || ' ' || p.last_name in (
  'Juan Pérez', 'Mateo Morales', 'Gabriel Rojas', 'Daniel Vargas',
  'Marcos Herrera', 'José Batista', 'Ángel Rosario', 'Elías Sosa', 'Ramón Antigua', 'Carlos Martínez'
);

-- -----------------------------------------------------
-- 9) BASKETBALL: rondas y enfrentamientos
-- -----------------------------------------------------
insert into public.rounds (competition_id, name, round_number, status)
select c.id, 'Cuartos de Final', 1, 'COMPLETED' from public.competitions c where c.name = 'Basketball';

insert into public.rounds (competition_id, name, round_number, status)
select c.id, 'Semifinal', 2, 'ACTIVE' from public.competitions c where c.name = 'Basketball';

insert into public.rounds (competition_id, name, round_number, status)
select c.id, 'Gran Final', 3, 'PENDING' from public.competitions c where c.name = 'Basketball';

-- Cuartos de final (completados)
insert into public.matches (competition_id, round_id, team_a_id, team_b_id, score_a, score_b, winner_team_id, status, completed_at)
select c.id, r.id, ta.id, tb.id, 52, 45, ta.id, 'COMPLETED', now()
from public.competitions c
join public.rounds r on r.competition_id = c.id and r.name = 'Cuartos de Final'
join public.teams ta on ta.competition_id = c.id and ta.name = 'Los Titanes'
join public.teams tb on tb.competition_id = c.id and tb.name = 'Los Guerreros'
where c.name = 'Basketball';

insert into public.matches (competition_id, round_id, team_a_id, team_b_id, score_a, score_b, winner_team_id, status, completed_at)
select c.id, r.id, ta.id, tb.id, 38, 41, tb.id, 'COMPLETED', now()
from public.competitions c
join public.rounds r on r.competition_id = c.id and r.name = 'Cuartos de Final'
join public.teams ta on ta.competition_id = c.id and ta.name = 'Los Leones'
join public.teams tb on tb.competition_id = c.id and tb.name = 'Los Halcones'
where c.name = 'Basketball';

insert into public.matches (competition_id, round_id, team_a_id, team_b_id, score_a, score_b, winner_team_id, status, completed_at)
select c.id, r.id, ta.id, tb.id, 60, 58, ta.id, 'COMPLETED', now()
from public.competitions c
join public.rounds r on r.competition_id = c.id and r.name = 'Cuartos de Final'
join public.teams ta on ta.competition_id = c.id and ta.name = 'Patriotas'
join public.teams tb on tb.competition_id = c.id and tb.name = 'Relámpagos'
where c.name = 'Basketball';

insert into public.matches (competition_id, round_id, team_a_id, team_b_id, score_a, score_b, winner_team_id, status, completed_at)
select c.id, r.id, ta.id, tb.id, 34, 48, tb.id, 'COMPLETED', now()
from public.competitions c
join public.rounds r on r.competition_id = c.id and r.name = 'Cuartos de Final'
join public.teams ta on ta.competition_id = c.id and ta.name = 'Águilas IDP'
join public.teams tb on tb.competition_id = c.id and tb.name = 'Conquistadores'
where c.name = 'Basketball';

-- Semifinal(es) + Final programada
insert into public.matches (competition_id, round_id, team_a_id, team_b_id, status)
select c.id, r.id, ta.id, tb.id, 'SCHEDULED'
from public.competitions c
join public.rounds r on r.competition_id = c.id and r.name = 'Semifinal'
join public.teams ta on ta.competition_id = c.id and ta.name = 'Los Titanes'
join public.teams tb on tb.competition_id = c.id and tb.name = 'Los Halcones'
where c.name = 'Basketball';

insert into public.matches (competition_id, round_id, team_a_id, team_b_id, status)
select c.id, r.id, ta.id, tb.id, 'SCHEDULED'
from public.competitions c
join public.rounds r on r.competition_id = c.id and r.name = 'Semifinal'
join public.teams ta on ta.competition_id = c.id and ta.name = 'Patriotas'
join public.teams tb on tb.competition_id = c.id and tb.name = 'Conquistadores'
where c.name = 'Basketball';

insert into public.matches (competition_id, round_id, status)
select c.id, r.id, 'SCHEDULED'
from public.competitions c
join public.rounds r on r.competition_id = c.id and r.name = 'Gran Final'
where c.name = 'Basketball';

-- -----------------------------------------------------
-- 10) DOMINÓ: final completada (campeón: Dupla Este)
-- -----------------------------------------------------
insert into public.rounds (competition_id, name, round_number, status)
select c.id, 'Final', 1, 'COMPLETED' from public.competitions c where c.name = 'Dominó';

insert into public.matches (competition_id, round_id, team_a_id, team_b_id, score_a, score_b, winner_team_id, status, completed_at)
select c.id, r.id, ta.id, tb.id, 100, 85, ta.id, 'COMPLETED', now()
from public.competitions c
join public.rounds r on r.competition_id = c.id and r.name = 'Final'
join public.teams ta on ta.competition_id = c.id and ta.name = 'Dupla Este'
join public.teams tb on tb.competition_id = c.id and tb.name = 'Dupla Norte'
where c.name = 'Dominó';