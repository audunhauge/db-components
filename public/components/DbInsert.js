// @ts-check

(function () {
  const template = document.createElement("template");
  template.innerHTML = `
        <style>
        .heading {
            text-align: center;
            font-size: 1.2em;
            color:blue;
        }
        form {
            position: relative;
            /*width: 35em;*/
            /*max-width: 85%;*/
            padding: 5px;
            border-radius: 5px;
            border: solid gray 1px;
            background-color: gainsboro;
            margin-top: 1em;
        }

        form > label {
            position: relative;
            left: 70%;
        }
        
        form  div label {
            display: grid;
            grid-template-columns: 7fr 4fr;
            margin: 5px;
            padding: 5px;
            border-radius: 5px;
            border: solid gray 1px;
            background-color: whitesmoke;
        }

        form  div#foreign label {
          grid-template-columns: 5fr 1fr 4fr;
        }

        form.invalid  {
          height: 1em;
          overflow:hidden;
        }
        
        form::after {
            color:blue;
            content: "Registrering";
            position: absolute;
            right: 20px;
            top: -20px;
        }

        span.foreign {
          color: green;
          font-size: 0.9em;
          padding-right:3px;
        }
        form.error  {
          box-shadow: inset 0 0 5px red, 0 0 0 orange;
          animation: pulse 1s alternate infinite;
        }
        @keyframes pulse {
          100% { box-shadow: inset 0 0 2px black, 0 0 6px red; }
        }
        
        #lagre {
            background-color: antiquewhite;
        }
        .error {
          box-shadow: inset 0 0 5px red, 0 0 0 orange;
          animation: pulse 1s alternate infinite;
        }
        @keyframes pulse {
          100% { box-shadow: inset 0 0 2px black, 0 0 6px red; }
        }
        </style>
        <form>
          <div class="heading"><slot name="heading"></slot></div>
          <div id="fields"></div>
          <div id="foreign">
          </div>
          <div id="alien">
            <slot></slot>
          </div>
          <label> &nbsp; <button type="button" id="save"><slot name="save">Save</slot></button></label>
        </form>
    `;

  // extend to more datatypes if needed
  const getval = e => {
    switch (e.type) {
      case "number":
        return e.value === "" ? null : Number(e.value);
      case "checkbox":
        return e.checked;
      default:
        return e.value;
    }
  };

  class DBInsert extends HTMLElement {
    constructor() {
      super();
      this.service = "/runsql"; // default service
      this.table = "";
      this.fields = "";
      this.silent = "";
      this._root = this.attachShadow({ mode: "open" });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
      // this is code for creating sql insert statement
      this._root.querySelector("#save").addEventListener("click", e => {
        // aliens will pick out any db-foreign placed into alien-slot
        const aliens = Array.from(this._root.querySelectorAll("#alien slot"))
          .map(e => e.assignedElements()[0])
          .filter(e => e !== undefined);
        const foreign = Array.from(
          this._root.querySelectorAll("#foreign select")
        );
        const inputs = Array.from(this._root.querySelectorAll("#fields input"))
          .concat(foreign)
          .concat(aliens);
        const names = inputs.map(e => e.id);
        const valueList = names.map(e => `$[${e}]`).join(",");
        const namelist = names.join(",");
        // get value of input element - handles checkboxes
        const data = inputs.reduce((s, e) => ((s[e.id] = getval(e)), s), {});
        const table = this.table;
        const sql = `insert into ${table} (${namelist}) values (${valueList})`;
        this.upsert(sql, data);
      });
    }

    /**
     * table      listen for updates on this table if set
     * fields     the fields to show in form
     * foreign    the foreign key connected to this select (local#book.bookid:title+date)
     *            local is field in this table (usually the same as bookid), select book.bookid, showing title,date from book
     * connected  listen for event emitted by this component
     * silent     dont emitt events
     */
    static get observedAttributes() {
      return ["table", "fields", "foreign", "connected", "silent", "service"];
    }

    connectedCallback() {
      console.log(this.table);
    }

    makeform(fields) {
      const divFields = this._root.querySelector("#fields");
      divFields.innerHTML = "";
      const fieldlist = fields.split(",");
      for (let i = 0; i < fieldlist.length; i++) {
        let [name, type = "text", text = ""] = fieldlist[i].split(":");
        text = (t => t.charAt(0).toUpperCase() + t.substr(1))(text || name);
        const label = document.createElement("label");
        label.innerHTML = `${text} <input type="${type}" id="${name}">`;
        divFields.appendChild(label);
      }
    }

    attributeChangedCallback(name, oldValue, newValue) {
      const divFields = this._root.querySelector("#fields");
      const divForeign = this._root.querySelector("#foreign");
      if (name === "fields") {
        this.fields = newValue;
        this.makeform(this.fields);
      }
      if (name === "table") {
        this.table = newValue;
      }
      if (name === "service") {
        this.service = newValue;
      }
      if (name === "silent") {
        this.silent = newValue;
      }
      if (name === "connected") {
        this.connected = newValue;
        // this component depends on an other specific component
        const [id, field] = this.connected.split(":");
        addEventListener(`dbFrom-${id}`, e => {
          const dbComponent = document.getElementById(id);
          if (dbComponent) {
            this.makeform(this.fields);
            // component found - get its value
            const value = dbComponent.value || "";
            if (value !== "") {
              const label = document.createElement("label");
              label.innerHTML = `${field} <input disabled type="text" id="${field}" value="${value}">`;
              divFields.appendChild(label);
              this._root.querySelector("form").classList.remove("invalid");
            } else {
              // we must redraw as empty
              this._root.querySelector("form").classList.add("invalid");
              this.idx = undefined;
              this.trigger({}, `dbFrom-${this.id}`); // cascade for those who care about us
            }
          }
        });
      }
      if (name === "foreign") {
        divForeign.innerHTML = "";
        // example value   "teachid#users.userid:firstname+lastname"
        //   local field is teachid, value given by users.userid, select shows firstname lastname
        const fieldlist = newValue.split(",");
        for (let i = 0; i < fieldlist.length; i++) {
          let [localname,xs] = fieldlist[i].split("#");
          if (xs === undefined) {
            xs = localname; localname = undefined;
          }  // localname is fieldname in insert-target
          // can be left out, will then match othertable.foreignkey
          const [table, fields] = xs.split(".");
          let [field, use] = fields.split(":");     // use is/are field(s) to show in select, username for userid
          use = (use || field).replace("+", ",");   // the extra fields are sep by '+'  userid:firstname+lastname
          localname = localname || field;
          const text = table.charAt(0).toUpperCase() + table.substr(1);
          const label = document.createElement("label");
          label.innerHTML = `${text} <span class="foreign">${field} </span> <select id="${localname}"></select>`;
          divForeign.appendChild(label);
          this.makeSelect(table, field, use, localname);
        }
      }
    }

    trigger(detail, eventname = 'dbUpdate') {
      if (this.silent !== "") return;
      detail.source = this.id;
      this.dispatchEvent(
        new CustomEvent(eventname, {
          bubbles: true,
          composed: true,
          detail
        })
      );
    }


    makeSelect(table, field, use, localname) {
      const select = this._root.querySelector(`#${localname}`);
      const fields = field === use ? field : `${field},${use}`;
      const sql = `select ${fields} from ${table} order by ${use}`;
      const data = "";
      const init = {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ sql, data }),
        headers: {
          "Content-Type": "application/json"
        }
      };
      fetch(this.service, init)
        .then(r => r.json())
        .then(data => {
          console.log(data);
          const list = data.results;
          const labels = use.split(",");
          if (list.error) {
            select.classList.add("error");
            select.title = sql + "\n" + list.error;
          }
          if (list.length) {
            const options = list
              .map(
                e =>
                  `<option value="${e[field]}">${labels
                    .map(l => e[l])
                    .join(" ")}</option>`
              )
              .join("");
              select.innerHTML = options;
          }
        }); 
    }

    upsert(sql = "", data) {
      const init = {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ sql, data }),
        headers: {
          "Content-Type": "application/json"
        }
      };
      console.log(sql, data);
      fetch(this.service, init)
      .then(r => r.json())
            .then(data => {
              const list = data.results; // check for errors
              const htmltable = this._root.querySelector("form");
              if (list.error) {
                htmltable.classList.add("error");
                htmltable.title = sql + "\n" + list.error;
                return;
              } else {
                this.trigger({ table: this.table, insert: true })
              }
            })
            .catch(e => console.log(e.message));
    }
  }

  window.customElements.define("db-insert", DBInsert);
})();
