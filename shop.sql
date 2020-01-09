-- Demo database for testing of db-components
-- originally intended for Norwegian students
-- english names would be customer,product,order,detail

-- create role,database for demo
create role shop password '123';     -- shop is user
alter role shop with login;          -- allow login
create database shop owner shop;     -- create db

-- enter the new db
\c shop;


DROP TABLE IF EXISTS users cascade;
DROP TABLE IF EXISTS kunde cascade;
DROP TABLE IF EXISTS vare cascade;
DROP TABLE IF EXISTS bestilling cascade;
DROP TABLE IF EXISTS linje cascade;


-- not all users are customers
create table users (
    userid SERIAL PRIMARY KEY,
    username text unique not null,
    role text default 'user',
    password text not null
); 

-- customer
CREATE TABLE kunde (
  kundeid SERIAL PRIMARY KEY,
  fornavn text NOT NULL,
  etternavn text NOT NULL,
  adresse text,
  epost text,
  tlf text,
  kjonn text,
  userid int unique not null
);

-- product
CREATE TABLE  vare  (
   vareid  SERIAL PRIMARY KEY,
   navn  text NOT NULL,
   pris  int default 0,
   erkategori boolean default 'f',
   kategori int
);

-- order
CREATE TABLE  bestilling  (
   bestillingid  SERIAL PRIMARY KEY,
   dato  date NOT NULL,
   kundeid  int NOT NULL
);

-- detail (line in order)
CREATE TABLE  linje  (
   linjeid  SERIAL PRIMARY KEY,
   antall  int DEFAULT 1,
   vareid  int NOT NULL,
   bestillingid  int NOT NULL
);

ALTER TABLE  bestilling  ADD FOREIGN KEY ( kundeid ) REFERENCES  kunde  ( kundeid );
ALTER TABLE  linje  ADD FOREIGN KEY ( bestillingid ) REFERENCES  bestilling  ( bestillingid );
ALTER TABLE  linje  ADD FOREIGN KEY ( vareid ) REFERENCES  vare  ( vareid );
ALTER TABLE  kunde  ADD FOREIGN KEY ( userid ) REFERENCES  users  ( userid );
ALTER TABLE  vare  ADD FOREIGN KEY ( kategori ) REFERENCES  vare  ( vareid );

alter table bestilling owner to shop;
alter table vare owner to shop;
alter table kunde owner to shop;
alter table linje owner to shop;
alter table users owner to shop;