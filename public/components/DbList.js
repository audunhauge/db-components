// @ts-check

/* This component runs a sql-query and fills a template with returned values.
   The template can be any (but not table,td,tr,th) element and
   can contain subelements. Any ${xxx} will be replaced with values
   returned from the query. If the query returns multiple rows - then
   the template will be repeated.
   The component can be placed inside <ol> <ul> and then a <li> template
   behaves as you would expect. <tr> template inside a <table> works notte.
*/

(function() {
  const template = document.createElement("template");
  const base = `<style> .error { box-shadow: inset 0 0 5px red; animation: blink 1s alternate infinite;}
              @keyframes blink { 100% { box-shadow:inset 0 0 0 red; } }
              .empty { display:none; }
             </style> 
             #import#  
             <div id="main"><slot></slot></div>`;

  class DBList extends HTMLElement {
    constructor() {
      super();
      this.loaded = false;
      this.sql = "";
      this.import = "";
      this.connected = "";
      this.update = "";
      this.service = "/runsql"; // default service
      this._root = this.attachShadow({ mode: "open" });
      // shadowRoot.append moved to callback
      // - so that any cssimport can be added to base before append
      addEventListener("dbUpdate", e => {
        const divMain = this._root.querySelector("#main");
        if (!divMain) return; // not ready
        const source = e.detail.source;
        const table = e.detail.table;
        let done = false;
        if (source && this.connected !== "") {
          // otherwise do an update
          const [id, field] = this.connected.split(":");
          if (id === source) {
            done = true;
            const dbComponent = document.getElementById(id);
            if (dbComponent) {
              // component found - get its value
              const value = dbComponent.value || "";
              if (value !== "") {
                // check that sql does not have where clause and value is int
                let sql = this.sql;
                const intvalue = Math.trunc(Number(value));
                if (sql.includes("where") || !Number.isInteger(intvalue))
                  return; // do nothing
                sql += ` where ${field} = ${intvalue}`; // value is integer
                this.refsql = sql; // reuse if refreshed by update
                redraw(sql, divMain, this.service);
              } else {
                // we must redraw as empty
                divMain.classList.add("empty");
                this.selectedRow = undefined;
                this.trigger({}); // cascade
              }
            }
          }
        }
        // check if we need a simple refresh
        if (!done && this.update && this.update === table)
          redraw(this.refsql || this.sql, divMain, this.service);
      });
    }

    static get observedAttributes() {
      return ["sql", "service", "cssimport", "connected", "update"];
    }

    trigger(detail) {
      detail.source = this.id;
      this.dispatchEvent(
        new CustomEvent("dbUpdate", {
          bubbles: true,
          composed: true,
          detail
        })
      );
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "service") {
        this.service = newValue;
      }
      if (name === "cssimport") {
        this.import = `<style>@import "${newValue}";</style>`;
        template.innerHTML = base.replace("#import#", this.import);
        if (this.loaded) {
          const divMain = this._root.querySelector("#main");
          divMain.classList.add("error");
          divMain.innerHTML = "cssimport must be before sql";
        } else {
          this.shadowRoot.appendChild(template.content.cloneNode(true));
          this.loaded = true;
        }
      }
      if (name === "connected") {
        this.connected = newValue;
      }
      if (name === "update") {
        this.update = newValue;
      }
      if (name === "sql") {
        if (!this.loaded) {
          // no css or it was not ready - must be placed before sql
          template.innerHTML = base.replace("#import#", "");
          this.shadowRoot.appendChild(template.content.cloneNode(true));
          this.loaded = true;
        }
        const divMain = this._root.querySelector("#main");
        const sql = (this.sql = newValue);
        redraw(sql, divMain, this.service);
      }
    }
  }

  function redraw(sql, divMain, service) {
    divMain.classList.remove("empty", "error");
    const init = {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ sql }),
      headers: {
        "Content-Type": "application/json"
      }
    };
    fetch(service, init)
      .then(r => r.json())
      .then(data => feedResultsToTemplate(data, divMain));
  }

  /**
   * Picks out usertemplate from slot and replicates it for all rows in
   * returned query result. Values are interpolated into ${fieldname} in template
   * @param {Array} data is array returned from query [ {field:value, ...}, ..]
   */
  function feedResultsToTemplate(data, divMain) {
    const list = data.results;
    if (list.error) {
      divMain.classList.add("error");
      divMain.title = sql + "\n" + list.error;
    } else {
      const items = Array.from(divMain.querySelectorAll("slot"));
      if (items && items.length) {
        const elements = items[0].assignedElements();
        if (elements.length !== 1) {
          // one and only one accepted
          divMain.classList.add("error");
          divMain.innerHTML = elements.length
            ? "Only one top level element allowed"
            : "Missing template element";
          return;
        }
        const userTemplate = elements[0];
        if (userTemplate && list.length) {
          userTemplate.style.display = ""; // remove none
          divMain
            .querySelectorAll(".__block")
            .forEach(e => e.parentNode.removeChild(e));
          list.forEach(e => {
            const copy = userTemplate.cloneNode(true);
            const replaced = document
              .createRange()
              .createContextualFragment(fill(copy, e));
            copy.innerHTML = "";
            copy.classList.add("__block");
            copy.append(replaced);
            divMain.append(copy);
          });
          userTemplate.style.display = "none"; // hide template
        }
      }
    }
  }

  /**
   * Fills in a template "xxx ${key}" with value from values
   * @param {Object} node clone of template
   * @param {Object} values to fill into template
   */
  function fill(node, values) {
    const replaced = node.innerHTML;
    return replaced.replace(/\$\{(.+?)\}/g, (_, v) => {
      if (values[v]) {
        return values[v];
      } else {
        return `#${v}`;
      }
    });
  }

  window.customElements.define("db-list", DBList);
})();
