// @ts-check
const fs = require("fs");

let project = "";
let siteinf = {};
if (process.argv[2]) {
  project = process.argv[2];
} else {
  console.log("Velg et prosjekt - skriv:  node app.js mappe");
  const files = fs.readdirSync("public");
  const items = files.filter(e => e !== "components" && e !== "users");
  console.log("Tilgjengelige Mapper: ", items.join());
  process.exit(1);
  // throw new Error("prosjektmappe må oppgis");
}
try {
  const conf = fs.readFileSync(`public/${project}/${project}.json`, {
    encoding: "utf-8"
  });
  siteinf = JSON.parse(conf);
} catch (err) {
  console.log(`Fant ikke filen ${project}.json i mappa ${project}`);
  console.log(`Denne filen må finnes, skal inneholde
  {
     "CONNECTSTRING" : "postgres://bruker:passord@localhost/database",
     "PORT" : 3000,
     "PROJECT" : "${project}"
  }
  `);
  console.log(err.message);
  process.exit(1);
}

const CONNECTSTRING = siteinf.CONNECTSTRING;
const PORT = siteinf.PORT;
const express = require("express");
const pgp = require("pg-promise")();
const db = pgp(CONNECTSTRING);
const app = express();
const bodyParser = require("body-parser");

const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const Strategy = require("passport-local").Strategy;
const Ensure = require("connect-ensure-login");
const crypto = require("crypto");

// userlist will always contain admin - see lagBrukerliste()
const userlist = {};
const _username2id = {};

const newusers = {}; // need confirming

const _usersById = id => {
  return userlist[id] || { username: "none", password: "" };
};

async function lagBrukerliste() {
  const sql = `select * from users`;
  await db
    .any(sql)
    .then(data => {
      if (data && data.length) {
        data.forEach(({ userid, username, role, password }) => {
          userlist[userid] = { id: userid, username, role, password };
          _username2id[username] = userid;
        });
      }
    })
    .catch(error => {
      console.log("ERROR:", sql, ":", error.message); // print error;
    });
  // ensure admin user always exists
  if (!_username2id["admin"]) {
    const sql = `insert into users (username,role,password)
     values ('admin','admin','${umd5("1230")}') returning userid`;
    const { userid } = await db.one(sql);
    userlist[userid] = {
      id: userid,
      username: "admin",
      role: "admin",
      password: umd5("1230")
    };
    _username2id["admin"] = userid;
  }
}

function findByUsername(rbody, username, cb) {
  process.nextTick(function() {
    if (_username2id[username]) {
      const userid = _username2id[username];
      const user = _usersById(userid);
      return cb(null, user);
    }
    return cb(null, null);
  });
}
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

passport.use(
  new Strategy({ passReqToCallback: true }, function(
    req,
    username,
    password,
    cb
  ) {
    findByUsername(req.body, username, function(err, user, key = "") {
      if (err) {
        return cb(err);
      }
      if (!user) {
        return cb(null, false);
      }
      if (user.password != umd5(password)) {
        return cb(null, false);
      }
      return cb(null, user);
    });
  })
);

passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  findById(id, function(err, user) {
    if (err) {
      return cb(err);
    }
    cb(null, user);
  });
});

function findById(id, cb) {
  process.nextTick(function() {
    if (_usersById(id)) {
      cb(null, _usersById(id));
    } else {
      cb(new Error("User " + id + " does not exist"));
    }
  });
}

function umd5(pwd) {
  return crypto
    .createHash("md5")
    .update(pwd)
    .digest("hex");
}

app.use(
  session({
    secret: "butistillloveyoudarling",
    resave: false,
    saveUninitialized: false,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Define routes.
app.get("/login", function(req, res) {
  res.redirect("/users/login.html");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successReturnToOrRedirect: "/index.html",
    failureRedirect: "/users/login.html"
  })
);

app.post("/makeuser", function(req, res) {
  if (req.isAuthenticated()) {
    const user = req.user;
    const userinfo = userlist[user.id] || {};
    if (userinfo.role === "admin") {
      const newuser = req.body;
      if (newuser.username && newuser.role && newuser.password) {
        makeNewUser(newuser, false);
      }
    }
  }
  res.redirect("/admin/users.html");
});

app.post("/signup", function(req, res) {
  const user = req.body;
  if (user.username && user.password) {
    // valid user
    if (_username2id[user.username]) {
      res.redirect("/users/signup.html?message=taken");
    } else {
      // create new user
      let token; // ensure unused token
      do {
        token = ("" + Math.random()).substr(2, 6);
      } while (newusers[token]);
      const clean = {};
      Object.entries(user).forEach(
        ([k, v]) => (clean[k] = v.replace(/[`'";]/g, ""))
      );
      newusers[token] = clean;
      res.redirect(`/users/verify.html?token=${token}`);
      // Simulated token sent by email to users adress.
      // Appended as param on redirect
      // It would be a bother to test with real mail
    }
  } else {
    res.redirect("/users/signup.html?message=missing");
  }
});

/**
 * Inserts a new user
 * @param {Object} user {username,password,role}
 * @param {boolean} kunde set false if only user
 */
async function makeNewUser(user, kunde = true) {
  let failed = false;
  const role = user.role || siteinf.DEFAULT_ROLE || "user";
  const sql = `insert into users (username,role,password)
  values ('${user.username}','${role}','${umd5(
    user.password
  )}') returning userid`;
  const { userid } = await db.one(sql).catch(error => {
    console.log(error.message);
    failed = true;
  });
  if (failed) return;
  userlist[userid] = {
    id: userid,
    role: user.role,
    username: user.username,
    password: umd5(user.password)
  };
  _username2id[user.username] = userid;
  if (kunde && siteinf.SELFREG) {
    // insert new user as kunde
    const self = siteinf.SELFREG;
    const values = self.fields
      .split(",")
      .map(e => user[e])
      .map(e => e.replace(/['";`]/g, ""))
      .map(e => (Number.isInteger(Number(e)) ? Number(e) : `'${e}'`))
      .join();
    const sql = `insert into ${self.table} (${self.key},${self.fields})
           values (${userid},${values}) `;
    await db.any(sql).catch(error => {
      console.log(error.message);
    });
  }
}

app.post("/verify", function(req, res) {
  let { token } = req.body;
  if (newusers[token]) {
    // verified new user
    makeNewUser(newusers[token]);
    delete newusers[token];
    res.redirect("/users/login.html");
  } else {
    res.redirect("/users/signup.html");
  }
});

/* runsql can only be used by auth users */
app.post("/runsql", function(req, res) {
  const user = req.user;
  const data = req.body;
  if (req.isAuthenticated()) {
    // check if user has role admin
    const userinfo = userlist[user.id] || {};
    if (userinfo.role === "admin") {
      runsql(res, data);
    } else {
      safesql(user, res, data); // slightly safer
    }
  } else {
    // much restricted
    saferSQL(res, data, { tables: siteinf.OPEN_TABLES || "" });
  }
});

// delivers userinfo about logged in user
app.post("/userinfo", function(req, res) {
  const user = req.user;
  const data = req.body;
  if (req.isAuthenticated()) {
    const sql = data.sql + ` from kunde where userid=${user.id}`;
    getuinf(sql, res);
  } else {
    res.send({ error: "player unknown b." });
  }
});

async function getuinf(sql, res) {
  const list = await db.any(sql);
  const userinfo = list.length ? list[0] : {};
  res.send(userinfo);
}

async function saferSQL(res, obj, options) {
  const predefined = siteinf.LEVEL3 || []; // add accepted sql in projectname.json
  const tables = options.tables.split(",");
  const allowed = predefined.concat(tables.map(e => `select * from ${e}`));
  let results = { error: "Illegal sql" };
  const sql = obj.sql;
  const data = obj.data;
  if (allowed.includes(sql)) {
    await db
      .any(sql, data)
      .then(data => {
        results = data;
      })
      .catch(error => {
        console.log("ERROR:", sql, ":", error.message); // print error;
        results = { error };
      });
  }
  res.send({ results });
}

app.get(`/components/:file`, function(req, res) {
  const { file } = req.params;
  res.sendFile(__dirname + `/public/components/${file}`);
});

app.get(`/media/`, function(req, res) {
  // expected request for media/{file} but no filename
  // happens if we expect a name for a pic- but non given
  res.sendFile(__dirname + `/public/${project}/media/missing.png`);
});

app.get(`/media/:file`, function(req, res) {
  const { file } = req.params;
  const path = __dirname + `/public/${project}/media/${file}`;
  try {
    if (fs.existsSync(path)) {
      //file exists
      res.sendFile(__dirname + `/public/${project}/media/${file}`);
    } else {
      res.sendFile(__dirname + `/public/${project}/media/missing.png`);
    }
  } catch(err) {
    console.error(err)
    res.sendFile(__dirname + `/public/${project}/media/error.png`);
  }
  
});

app.get(`/users/:file`, function(req, res) {
  const { file } = req.params;
  res.sendFile(__dirname + `/public/users/${file}`);
});

app.get(`/admin/:file`, Ensure.ensureLoggedIn(), function(req, res) {
  const { file } = req.params;
  res.sendFile(__dirname + `/public/${project}/admin/${file}`);
});

app.get("/myself", function(req, res) {
  const user = req.user;
  if (user) {
    const { username } = req.user;
    res.send({ username });
  } else {
    res.send({ username: "" });
  }
});

app.get("/htmlfiler/:admin", function(req, res) {
  let path = `public/${project}`;
  if (req.user) {
    const { username } = req.user;
    const { admin } = req.params;
    if (username && admin === "admin") {
      path = `public/${project}/admin`;
    }
  }
  fs.readdir(path, function(err, files) {
    //console.log(err);
    const items = files.filter(e => e.endsWith(".html") && e !== "index.html");
    res.send({ items });
  });
});

app.use(express.static(`public/${project}`));

app.listen(PORT, function() {
  console.log(`Connect to http://localhost:${PORT}`);
  lagBrukerliste();
});

async function safesql(user, res, obj) {
  let results;
  const opentables = siteinf.OPEN_TABLES || "";
  const sql = obj.sql.replace(/\s+/g,' ');
  const lowsql = "" + sql.toLowerCase().replace(/in \((\d+,?)+\)/,'in ()');
  const data = obj.data;
  let unsafe = false;
  let found = false; // true if rule matches for user
  let customerid = "";
  const predefined = siteinf.LEVEL3 || []; // add accepted sql in projectname.json
  const tables = opentables.split(",");
  const allowed = predefined.concat(tables.map(e => `select * from ${e}`));
  if (user && user.id) {
    customerid = user.id;
    //const userinfo = userlist[user.id];
    const level2 = siteinf.LEVEL2 || {};
    const level1 = siteinf.LEVEL1 || {};
    const forUser = level1[user.username] || [];
    const forRole = level2[user.role] || [];
    if (
      forUser.includes(lowsql) ||
      forRole.includes(lowsql) ||
      allowed.includes(lowsql)
    ) {
      found = true;
    }
  }
  // no sql may include words from badlist
  const badlist = "; -- /* */ case union alter having drop ascii char pg_sleep grant owner".split(" ");
  unsafe = unsafe || badlist.some(e => lowsql.includes(e));
  // unsafe = badlist.reduce((s,v) => s || lowsql.includes(v), unsafe);
  const actualSQL = sql.replace("#user#", customerid);
  if (unsafe || !found) {
    results = { error: `This sql not allowed for ${user.username}` };
    console.log("SQL:",sql," DENIED for ",user.username);
    res.send({ results });
  } else
    await db
      .any(actualSQL, data)
      .then(data => {
        results = data;
        res.send({ results });
      })
      .catch(error => {
        console.log("ERROR:", sql, ":", error.message); // print error;
        results = { error: error.message };
        res.send({ results });
      });
}

// allow admin to do anything
async function runsql(res, obj) {
  let results;
  const sql = obj.sql;
  const data = obj.data;
  await db
    .any(sql, data)
    .then(data => {
      results = data;
    })
    .catch(error => {
      console.log("ERROR:", sql, ":", error.message); // print error;
      results = { error: error.message };
    });
  res.send({ results });
}

/**
 * Eksempel på hvordan en kan lage sikre endepunkter som
 * er kobla til en gitt db-component som skal kjøre en spesifikk
 * spørring. Under testing er komponenten kobla til /runsql.
 * Når vi ser at ting fungerer, kan vi lage et dedikert endepunkt
 * som kjører denne spørringen på en sikker måte.
 * MERK: her kjøres ikke en brukergenerert spørring, men en
 * spørring definert av utvikler. Det eneste som varierer er
 * id på bestilling og id på bruker.
 * Brukerid hentes fra session info, spørringen sjekker at
 * brukeren er eier av denne bestillingen.
 * Så lenge som server + passord/innlogging
 * er sikkert, vil også spørringen være sikker.
 */

/* hent en gitt bestilling for en kunde 
   kan ikke hente andre kunders bestillinger
*/
app.post("/brukerbestilling", function(req, res) {
  const user = req.user;
  const userinfo = userlist[user.id] || {};
  const data = req.body.data;
  if (data && req.isAuthenticated() && userinfo.kundeid) {
    const bid = Number(data.bestillingid);
    const kundeid = Number(userinfo.kundeid);
    if (Number.isInteger(bid) && Number.isInteger(kundeid)) {
      const sql = `select v.*,l.*,b.dato from vare v join
      linje l on (v.vareid = l.vareid)
      join bestilling b on (l.bestillingid = b.bestillingid)
      where b.bestillingid = ${bid}
            and b.kundeid = ${kundeid}
    `;
      runsql(res, { sql, data });
      return;
    }
  }
  res.send({ error: "illegal" });
});
