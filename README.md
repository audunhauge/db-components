# DB-COMPONENTS

This repository is intended for use by students with knowledge of html, css and sql.

# Setup
* install nodejs
* install postgres (or similar)
* clone the repository

## Demo version (shop)
Assuming nodejs and postgres installed and working.

* Open repository in vs-code
* Right-click on shop.sql and select "Open in Terminal"
* start psql
* write: \i shop.sql
* \q (quit)

This should create database and user

Assuming we are still in the terminal (but not in psql).

* write: npm install

after lots of files installed:
* write: node app.js shop

This should start the server.

## Make your own database and forms

* make a copy of the shop directory
* rename to **bank** (or whatever)
* rename shop.sql to bank.sql
* rename shop.json to bank.json
* edit bank.sql - change tables/database/user/password etc
* edit bank.json - reflect changes made in bank.sql
  * here you can add sql for role or username  
  see example in tannlege.json

* rename/edit html files in admin

# Examples of forms
Look in the admin directory to see how forms are made with db-components.
No javascript requiered.

Security ... run all queries as admin until the forms work as you want them to.
Then make dedicated endpoints so that non-admin users can run these queries.