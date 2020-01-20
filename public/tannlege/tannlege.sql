
-- create role,database for tannlege
create role tannlege password '123';     -- tannlege is user
alter role tannlege with login;          -- allow login
create database tannlege owner tannlege; -- create db

-- enter the new db
\c tannlege;


DROP TABLE IF EXISTS users cascade;
DROP TABLE IF EXISTS kunde cascade;
DROP TABLE IF EXISTS tannlege cascade;
DROP TABLE IF EXISTS behandling cascade;



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
CREATE TABLE tannlege (
  tannlegeid int PRIMARY KEY,
  fornavn text NOT NULL,
  etternavn text NOT NULL,
  adresse text,
  epost text,
  tlf text,
  kjonn text
);

-- order
CREATE TABLE  behandling  (
   behandlingid  SERIAL PRIMARY KEY,
   dato  date NOT NULL,
   pris int,
   betalt boolean default 'f',
   kundeid  int NOT NULL,
   tannlegeid int not null
);


ALTER TABLE  behandling  ADD FOREIGN KEY ( kundeid ) REFERENCES  kunde  ( kundeid );
ALTER TABLE  behandling  ADD FOREIGN KEY ( tannlegeid ) REFERENCES  tannlege  ( tannlegeid );
ALTER TABLE  kunde  ADD FOREIGN KEY ( kundeid ) REFERENCES  users  ( userid );
ALTER TABLE  tannlege  ADD FOREIGN KEY ( tannlegeid ) REFERENCES  users  ( userid );


alter table behandling owner to tannlege;
alter table tannlege owner to tannlege;
alter table kunde owner to tannlege;
alter table users owner to tannlege;