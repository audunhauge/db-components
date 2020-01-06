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
  let base = `<style> .error { box-shadow: inset 0 0 5px red; animation: blink 1s alternate infinite;}
              @keyframes blink { 100% { box-shadow:inset 0 0 0 red; } }
             </style> #import#  <div id="main"><slot></slot></div>`;

  class DBList extends HTMLElement {
    constructor() {
      super();
      this.loaded = false;
      this.sql = "";
      this.service = "/runsql"; // default service
      this._root = this.attachShadow({ mode: "open" });
      // shadowRoot.append moved to callback - so that any cssimport can be added
    }

    static get observedAttributes() {
      return ["sql", "service", "cssimport"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "service") {
        this.service = newValue;
      }
      if (name === "cssimport") {
        this.import = `<style>@import "${newValue}";</style>`;
        template.innerHTML = base.replace("#import#", this.import);
        if (this.loaded) {
          let htmltable = this._root.querySelector("#main");
          htmltable.innerHTML = "cssimport must be before sql"
        } else {
          this.shadowRoot.appendChild(template.content.cloneNode(true));
          this.loaded = true;
        }
      }
      if (name === "sql") {
        if (!this.loaded) {
          // the css was not ready - must be placed before sql
          template.innerHTML = base.replace("#import#", "");
          this.shadowRoot.appendChild(template.content.cloneNode(true));
          this.loaded = true;
        }
        let sql = (this.sql = newValue);
        let init = {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ sql }),
          headers: {
            "Content-Type": "application/json"
          }
        };
        fetch(this.service, init)
          .then(r => r.json())
          .then(data => {
            let list = data.results;
            let htmltable = this._root.querySelector("#main");
            if (list.error) {
              htmltable.classList.add("error");
              htmltable.title = sql + "\n" + list.error;
            } else {
              htmltable.classList.remove("error");
              let items = Array.from(this._root.querySelectorAll("#main slot"));
              if (items && items.length) {
                let elements = items[0].assignedElements();
                let template;
                if (elements.length !== 1) {
                  // one and only one accepted
                  htmltable.innerHTML = elements.length
                    ? "Only one top level element allowed"
                    : "Missing template element";
                  return;
                }
                template = elements[0];
                if (template && list.length) {
                  list.forEach(e => {
                    let copy = template.cloneNode(true);
                    let replaced = document
                      .createRange()
                      .createContextualFragment(fill(copy, e));
                    copy.innerHTML = "";
                    copy.append(replaced);
                    htmltable.append(copy);
                  });
                  template.style.display = "none"; // hide template
                }
              }
            }
          });
      }
    }
  }

  /**
   * Fills in a template "xxx ${key}" with value from values
   * @param {Object} node clone of template
   * @param {Object} values to fill into template
   */
  function fill(node, values) {
    let replaced = node.innerHTML;
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
