
-- create role,database for vareliste
create role vareliste password '123';     -- vareliste is user
alter role vareliste with login;          -- allow login
create database vareliste owner vareliste; -- create db
-- enter the new db
\c vareliste;
DROP TABLE IF EXISTS users cascade;
DROP TABLE IF EXISTS vare cascade;
DROP TABLE IF EXISTS kategori cascade;
-- not all users are customers
create table users (
    userid SERIAL PRIMARY KEY,
    username text unique not null,
    role text default 'user',
    password text not null
); 
-- vare
CREATE TABLE vare (
  vareid serial PRIMARY KEY,
  navn text NOT NULL,
  pris int not null,
  bilde text,
  kategori text not null
);
-- kategori
CREATE TABLE kategori (
  kategori text PRIMARY key
);

ALTER TABLE  vare  ADD FOREIGN KEY ( kategori ) REFERENCES  kategori  ( kategori );
alter table vare owner to vareliste;
alter table kategori owner to vareliste;
alter table users owner to vareliste;