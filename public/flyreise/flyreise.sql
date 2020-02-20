
-- create role,database for flyreise
create role flyreise password '123';     -- flyreise is user
alter role flyreise with login;          -- allow login
create database flyreise owner flyreise; -- create db

-- enter the new db
\c flyreise;


DROP TABLE IF EXISTS users cascade;
DROP TABLE IF EXISTS passasjer cascade;
DROP TABLE IF EXISTS bilett cascade;
DROP TABLE IF EXISTS reiser cascade;



-- not all users are customers
create table users (
    userid SERIAL PRIMARY KEY,
    username text unique not null,
    role text default 'user',
    password text not null
); 

-- customer
CREATE TABLE passasjer (
  passasjerid int PRIMARY KEY,
  fornavn text NOT NULL,
  etternavn text NOT NULL,
  adresse text,
  epost text,
  tlf text,
  kjonn text
);

-- tannlege
CREATE TABLE bilett (
  bilettid int PRIMARY KEY,
  pris int NOT NULL,
  rad text NOT NULL,
  sete text NOT NULL,
  passasjerid int not null,
  reiserid int not null
);

-- order
CREATE TABLE  reiser  (
   reiserid  SERIAL PRIMARY KEY,
   dato  date NOT NULL,
   fra text not null,
   til text not null,
   avgang time,
   ankomst time
);


ALTER TABLE  bilett  ADD FOREIGN KEY ( passasjerid ) REFERENCES  passasjer  ( passasjerid );
ALTER TABLE  bilett  ADD FOREIGN KEY ( reiserid ) REFERENCES  reiser  ( reiserid );
ALTER TABLE  passasjer  ADD FOREIGN KEY ( passasjerid ) REFERENCES  users  ( userid );



alter table reiser owner to flyreise;
alter table bilett owner to flyreise;
alter table passasjer owner to flyreise;
alter table users owner to flyreise;