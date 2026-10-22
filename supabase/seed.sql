-- Partar: upphafsgögn. Algengar tegundir og gerðir á íslenskum bílamarkaði.

with data(make, models) as (values
  ('Toyota',        array['Yaris','Corolla','Auris','Avensis','Prius','C-HR','RAV4','Land Cruiser 90','Land Cruiser 120','Land Cruiser 150','Land Cruiser 200','Hilux','Highlander','Aygo','Proace']),
  ('Hyundai',       array['i10','i20','i30','Elantra','Tucson','Santa Fe','Kona','Ioniq','Getz','Accent']),
  ('Kia',           array['Picanto','Rio','Ceed','Sportage','Sorento','Niro','e-Niro','EV6','Optima']),
  ('Volkswagen',    array['Polo','Golf','Passat','Tiguan','Touran','Touareg','Caddy','Transporter','Up!','ID.3','ID.4','Amarok']),
  ('Škoda',         array['Fabia','Octavia','Superb','Rapid','Yeti','Kodiaq','Karoq','Enyaq']),
  ('Subaru',        array['Impreza','Legacy','Outback','Forester','XV']),
  ('Suzuki',        array['Swift','Jimny','Vitara','Grand Vitara','SX4','S-Cross','Ignis','Baleno']),
  ('Mitsubishi',    array['Colt','Lancer','Outlander','ASX','Pajero','Pajero Sport','L200','Space Star','Eclipse Cross']),
  ('Nissan',        array['Micra','Note','Qashqai','X-Trail','Juke','Leaf','Navara','Patrol','Pathfinder','Almera']),
  ('Honda',         array['Jazz','Civic','Accord','CR-V','HR-V']),
  ('Mazda',         array['2','3','6','CX-3','CX-5','CX-30','BT-50']),
  ('Ford',          array['Fiesta','Focus','Mondeo','Kuga','EcoSport','Transit','Transit Custom','Ranger','F-150','Explorer']),
  ('Opel',          array['Corsa','Astra','Insignia','Zafira','Meriva','Mokka','Vivaro']),
  ('Renault',       array['Clio','Megane','Captur','Kadjar','Zoe','Kangoo','Trafic','Master']),
  ('Dacia',         array['Sandero','Logan','Duster','Jogger']),
  ('Peugeot',       array['107','206','207','208','307','308','2008','3008','5008','Partner','Expert']),
  ('Citroën',       array['C1','C3','C4','C5','Berlingo','Jumpy','Jumper']),
  ('Volvo',         array['V40','V50','V60','V70','S60','S80','XC40','XC60','XC70','XC90']),
  ('BMW',           array['1-lína','3-lína','5-lína','X1','X3','X5','i3']),
  ('Mercedes-Benz', array['A-Class','B-Class','C-Class','E-Class','GLA','GLC','ML/GLE','Sprinter','Vito']),
  ('Audi',          array['A1','A3','A4','A6','Q3','Q5','Q7','e-tron']),
  ('Land Rover',    array['Defender','Discovery','Discovery Sport','Freelander','Range Rover','Range Rover Sport','Range Rover Evoque']),
  ('Jeep',          array['Wrangler','Grand Cherokee','Cherokee','Compass','Renegade']),
  ('Chevrolet',     array['Spark','Aveo','Cruze','Captiva','Silverado','Tahoe']),
  ('Dodge',         array['Ram 1500','Ram 2500','Ram 3500','Durango']),
  ('Isuzu',         array['D-Max','Trooper']),
  ('SsangYong',     array['Rexton','Korando','Musso','Tivoli']),
  ('Tesla',         array['Model 3','Model Y','Model S','Model X']),
  ('MG',            array['ZS','MG4','MG5','HS']),
  ('Polestar',      array['Polestar 2']),
  ('Lexus',         array['IS','RX','NX','CT'])
),
ins_makes as (
  insert into public.makes (name, slug)
  select make, lower(regexp_replace(translate(make, 'ŠšëÖöÁáÉéÍíÓóÚúÝýÞþÆæÐð', 'SseOoAaEeIiOoUuYyTtAaDd'), '[^A-Za-z0-9]+', '-', 'g'))
  from data
  returning id, name
)
insert into public.models (make_id, name)
select m.id, unnest(d.models)
from ins_makes m join data d on d.make = m.name;

-- Flokkar (yfirflokkar fyrst, svo undirflokkar)
insert into public.categories (name, slug, sort) values
  ('Vél og drifrás',        'vel',          1),
  ('Gírkassi og drif',      'girkassi',     2),
  ('Fjöðrun og stýri',      'fjodrun',      3),
  ('Bremsur',               'bremsur',      4),
  ('Yfirbygging',           'yfirbygging',  5),
  ('Ljós',                  'ljos',         6),
  ('Rafkerfi',              'rafkerfi',     7),
  ('Innrétting',            'innretting',   8),
  ('Felgur og dekk',        'felgur-dekk',  9),
  ('Púst',                  'pust',        10),
  ('Kæli- og miðstöðvarkerfi', 'kaeling',  11),
  ('Aukahlutir',            'aukahlutir',  12),
  ('Annað',                 'annad',       99);

insert into public.categories (parent_id, name, slug, sort)
select p.id, c.name, c.slug, c.sort
from (values
  ('vel',         'Vél í heilu lagi',        'vel-heil',        1),
  ('vel',         'Túrbína',                 'turbina',         2),
  ('vel',         'Tímareim / keðja',        'timareim',        3),
  ('girkassi',    'Gírkassi',                'girkassi-heill',  1),
  ('girkassi',    'Kúpling',                 'kupling',         2),
  ('girkassi',    'Drifskaft / öxlar',       'oxlar',           3),
  ('fjodrun',     'Demparar og gormar',      'demparar',        1),
  ('fjodrun',     'Spyrnur og fóðringar',    'spyrnur',         2),
  ('bremsur',     'Diskar og klossar',       'diskar-klossar',  1),
  ('yfirbygging', 'Hurðir',                  'hurdir',          1),
  ('yfirbygging', 'Stuðarar',                'studarar',        2),
  ('yfirbygging', 'Hlífar og bretti',        'bretti',          3),
  ('yfirbygging', 'Speglar',                 'speglar',         4),
  ('yfirbygging', 'Rúður',                   'rudur',           5),
  ('ljos',        'Framljós',                'framljos',        1),
  ('ljos',        'Afturljós',               'afturljos',       2),
  ('rafkerfi',    'Startari og alternator',  'startari',        1),
  ('rafkerfi',    'Rafgeymar',               'rafgeymar',       2),
  ('rafkerfi',    'Tölvur og skynjarar',     'tolvur',          3),
  ('innretting',  'Sæti',                    'saeti',           1),
  ('innretting',  'Mælaborð',                'maelabord',       2),
  ('felgur-dekk', 'Felgur',                  'felgur',          1),
  ('felgur-dekk', 'Vetrardekk',              'vetrardekk',      2),
  ('felgur-dekk', 'Sumardekk',               'sumardekk',       3),
  ('felgur-dekk', 'Heilsársdekk',            'heilsarsdekk',    4)
) as c(parent_slug, name, slug, sort)
join public.categories p on p.slug = c.parent_slug;
