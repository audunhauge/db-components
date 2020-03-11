
-- create role,database for butikk
create role butikk password '123';     -- butikk is user
alter role butikk with login;          -- allow login
create database butikk owner butikk; -- create db

-- enter the new db
\c butikk;


DROP TABLE IF EXISTS users cascade;
DROP TABLE IF EXISTS kunde cascade;
DROP TABLE IF EXISTS bestilling cascade;
DROP TABLE IF EXISTS linje cascade;
DROP TABLE IF EXISTS vare cascade;



-- not all users are customers
create table users (
    userid SERIAL PRIMARY KEY,
    username text unique not null,
    role text default 'user',
    password text not null
); 

-- customer
CREATE TABLE kunde (
  kundeid int PRIMARY KEY,
  fornavn text NOT NULL,
  etternavn text NOT NULL,
  adresse text,
  epost text,
  tlf text,
  kjonn text
);

-- tannlege
CREATE TABLE bestilling (
  bestillingid SERIAL PRIMARY KEY,
  dato date not null,
  betalt boolean default 'f',
  kundeid int not null
);

-- order
CREATE TABLE  vare  (
   vareid  SERIAL PRIMARY KEY,
   navn text not null,
   pris int not null,
   bilde text
);

-- order
CREATE TABLE  linje  (
   linjeid  SERIAL PRIMARY KEY,
   antall int,
   bestillingid int not null,
   vareid int not null
);




ALTER TABLE  bestilling  ADD FOREIGN KEY ( kundeid ) REFERENCES  kunde  ( kundeid );
ALTER TABLE  linje  ADD FOREIGN KEY ( bestillingid ) REFERENCES  bestilling  ( bestillingid );
ALTER TABLE  linje  ADD FOREIGN KEY ( vareid ) REFERENCES  vare  ( vareid );



alter table kunde owner to butikk;
alter table bestilling owner to butikk;
alter table vare owner to butikk;
alter table linje owner to butikk;
alter table users owner to butikk;