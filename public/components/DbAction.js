// @ts-check
/**
 * @file Komponenter
 * <p>yes jadda badda du</p>
 */

(function() {
  const template = document.createElement("template");
  template.innerHTML = `
        <style>
          #buy {
            text-align: center;
            padding:5px;
            padding-top: 20px;
            width: 8rem;
            position: relative;
            left: calc(50% - 8rem / 2);
            color: white;
            background-color: green;
            width: 10rem;
            height: 2rem;
            font-size: 1.2rem;
            border-radius: 5px;
            box-shadow: 3px 3px 2px gray;
          }
          #buy:active {
            box-shadow: 0 0 0 gray;
            transform: translate(3px,3px);
          }
        </style>
        <div>
          <div id="buy">
            <slot></slot>
          </div>
        </div>
    `;

  
    /**
     * Class used by component
     * @extends HTMLElement
     */
  class DBAction extends HTMLElement {
    /**
     * Sets up default service
     */
    constructor() {
      super();
      this.service = "/runsql"; // default service
      this.sql = "";
      this.selector = "";
      this._root = this.attachShadow({ mode: "open" });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
   
    /**
     * @returns {Array} [sql,selector,service]
     */
    static get observedAttributes() {
      return [
        "sql",
        "selector",
        "service",
      ];
    }

    connectedCallback() {
      //this.redraw();
    }


    /**
     * 
     * @param {string} name name of attribute
     * @param {string} oldValue previous value (if any)
     * @param {string} newValue new value for this attribute
     */
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "table") {
        this.table = newValue;
      }
      if (name === "service") {
        this.service = newValue;
      }
      if (name === "silent") {
        this.silent = newValue;
      }
    }

    trigger(detail, eventname = "dbUpdate") {
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


    upsert(sql = "", data) {
      const init = {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ sql, data }),
        headers: {
          "Content-Type": "application/json"
        }
      };
      //console.log(sql, data);
      // @ts-ignore
      fetch(this.service, init)
        .then(() => {
          // others may want to refresh view
          this.trigger({ table: this.table });
          // this.show();
        })
        .catch(e => console.log(e.message));
    }
  }

  window.customElements.define("db-action", DBAction);
})();
