// @ts-check
const fs = require("fs");

let project = "";
let siteinf = {};
if (process.argv[2]) {
  project = process.argv[2];
} else {
  console.log("Velg et prosjekt - skriv:  node app.js mappe")
  let files = fs.readdirSync("public");
  let items = files.filter(e => e !== "components" && e !== "users");
  console.log("Tilgjengelige Mapper: ", items.join());
  process.exit(1);
  // throw new Error("prosjektmappe må oppgis");
}
try {
  let conf = fs.readFileSync(`public/${project}/${project}.json`, { encoding: "utf-8" });
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
  let sql = `select u.*,k.kundeid from users u left join kunde k
            on (u.userid = k.userid)`;
  await db
    .any(sql)
    .then(data => {
      if (data && data.length) {
        data.forEach(({ userid, username, role, password, kundeid }) => {
          userlist[userid] = { id: userid, username, role, password, kundeid };
          _username2id[username] = userid;
        });
      }
    })
    .catch(error => {
      console.log("ERROR:", sql, ":", error.message); // print error;
    });
  // ensure admin user always exists
  if (!_username2id["admin"]) {
    let sql = `insert into users (username,role,password)
     values ('admin','admin','${umd5("1230")}') returning userid`;
    let { userid } = await db.one(sql);
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
  process.nextTick(function () {
    if (_username2id[username]) {
      let userid = _username2id[username];
      let user = _usersById(userid);
      return cb(null, user);
    }
    return cb(null, null);
  });
}
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

passport.use(
  new Strategy({ passReqToCallback: true }, function (
    req,
    username,
    password,
    cb
  ) {
    findByUsername(req.body, username, function (err, user, key = "") {
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

passport.serializeUser(function (user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function (id, cb) {
  findById(id, function (err, user) {
    if (err) {
      return cb(err);
    }
    cb(null, user);
  });
});

function findById(id, cb) {
  process.nextTick(function () {
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
app.get("/login", function (req, res) {
  res.redirect("/users/login.html");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successReturnToOrRedirect: "/index.html",
    failureRedirect: "/users/login.html"
  })
);

app.post("/makeuser", function (req, res) {
  if (req.isAuthenticated()) {
    let user = req.user;
    let userinfo = userlist[user.id] || {};
    if (userinfo.role === "admin") {
      let newuser = req.body;
      if (
        newuser.username &&
        newuser.role &&
        newuser.password
      ) {
        makeNewUser(newuser, false);
      }
    }
  }
  res.redirect('/admin/users.html');
});

app.post("/signup", function (req, res) {
  let user = req.body;
  if (
    user.username &&
    user.fornavn &&
    user.etternavn &&
    user.etternavn &&
    user.epost &&
    user.adresse &&
    user.password
  ) {
    // valid user
    if (_username2id[user.username]) {
      res.redirect("/users/signup.html?message=taken");
    } else {
      // create new user
      let token; // ensure unused token
      do {
        token = ("" + Math.random()).substr(2, 6);
      } while (newusers[token]);
      newusers[token] = user;
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
  const sql = `insert into users (username,role,password)
  values ('${user.username}','user','${umd5(user.password)}') returning userid`;
  const { userid } = await db.one(sql).catch(error => {
    console.log(error.message);
    failed = true;
  })
  if (failed) return;
  userlist[userid] = {
    id: userid,
    username: user.username,
    password: umd5(user.password)
  };
  _username2id[user.username] = userid;
  if (kunde) {
    // insert new user as kunde
    const sql = `insert into kunde (userid,fornavn,etternavn,adresse,epost)
           values (${userid},'${user.fornavn}',
           '${user.etternavn}','${user.adresse}','${user.epost}') returning kundeid`;
    const { kundeid } = await db.one(sql).catch(error => {
      console.log(error.message);
      failed = true;
    })
    if (failed) return;
    userlist[userid].kundeid = kundeid;
  }
}

app.post("/verify", function (req, res) {
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
app.post("/runsql", function (req, res) {
  let user = req.user;
  let data = req.body;
  if (req.isAuthenticated()) {
    // check if user has role admin
    let userinfo = userlist[user.id] || {};
    if (userinfo.role === "admin") {
      runsql(res, data);
    } else {
      safesql(user, res, data);  // slightly safer
    }
  } else {
    // much restricted
    saferSQL(res, data, { tables: "vare" });
  }
});

// delivers userinfo about logged in user
app.post("/userinfo", function (req, res) {
  let user = req.user;
  let data = req.body;
  if (req.isAuthenticated()) {
    let sql = data.sql + ` from kunde where userid=${user.id}`;
    getuinf(sql, res);
  } else {
    res.send({ error: "player unknown b." });
  }
});

async function getuinf(sql, res) {
  let userinfo = await db.one(sql);
  res.send(userinfo);
}

async function saferSQL(res, obj, options) {
  const predefined = [];  // add accepted sql here
  let results = { error: "Illegal sql" };
  let tables = options.tables.split(",");
  let sql = obj.sql.replace("inner ", "");
  // inner join => join
  let data = obj.data;
  let allowed = predefined.concat(tables.map(e => `select * from ${e}`));
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

app.get(`/components/:file`, function (req, res) {
  let { file } = req.params;
  res.sendFile(__dirname + `/public/components/${file}`);
});

app.get(`/users/:file`, function (req, res) {
  let { file } = req.params;
  res.sendFile(__dirname + `/public/users/${file}`);
});


app.get(`/admin/:file`, Ensure.ensureLoggedIn(), function (req, res) {
  let { file } = req.params;
  res.sendFile(__dirname + `/public/${project}/admin/${file}`);
});

app.get("/myself", function (req, res) {
  let user = req.user;
  if (user) {
    let { username } = req.user;
    res.send({ username });
  } else {
    res.send({ username: "" });
  }
});

app.get("/htmlfiler/:admin", function (req, res) {
  let path = `public/${project}`;
  if (req.user) {
    let { username } = req.user;
    let { admin } = req.params;
    if (username && admin === "admin") {
      path = `public/${project}/admin`;
    }
  }
  fs.readdir(path, function (err, files) {
    //console.log(err);
    let items = files.filter(e => e.endsWith(".html") && e !== "index.html");
    res.send({ items });
  });
});

app.use(express.static(`public/${project}`));

app.listen(3000, function () {
  console.log(`Connect to http://localhost:${PORT}`);
  lagBrukerliste();
});

async function safesql(user, res, obj) {
  let results;
  let sql = obj.sql;
  let lowsql = "" + sql.toLowerCase();
  let data = obj.data;
  let unsafe = false;
  let personal = false;

  // fake security - should have dedicated endpoints for queries
  // but this allows testing with a semblance of sequrity.
  // Studs can see that some sql will be disallowed
  if (user && user.id) {
    let userinfo = userlist[user.id];
    if (userinfo.kundeid) {
      let good = [

      ];
      // the last two delete test are insufficient
      // the inserts do not test for valid id of customer
      if (good.includes(lowsql) || good.includes(lowsql.substr(0, 34))) {
        personal = true;
      }
    }
  }
  unsafe = unsafe || !lowsql.startsWith("select");
  unsafe = unsafe || lowsql.substr(6).includes("select");
  // only allow one select - disables subselect
  unsafe = unsafe || lowsql.includes("delete");
  unsafe = unsafe || lowsql.includes(";");
  unsafe = unsafe || lowsql.includes("insert");
  unsafe = unsafe || lowsql.includes("update");
  unsafe = unsafe || lowsql.includes("union");
  unsafe = unsafe || lowsql.includes("alter");
  unsafe = unsafe || lowsql.includes("drop");
  if (unsafe && !personal) {
    results = {};
  } else
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

// allow admin to do anything
async function runsql(res, obj) {
  let results;
  let sql = obj.sql;
  let data = obj.data;
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
app.post("/brukerbestilling", function (req, res) {
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
  res.send({ error: "illegal" })
});