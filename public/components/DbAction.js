// @ts-check
/**
 * @file Komponenter
 * <p>
 *   This component picks up selected elements from a db-list.
 *   Assumes each element can be adressed by "input:selectd ~ div"
 * </p>
 */

(function () {
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
            transition:40ms;
          }
          #buy:active {
            box-shadow: 0 0 0 gray;
            transform: translate(3px,3px);
          }
          #form {
            display:none;
          }
        </style>
        <div>
          <div id="buy">
            <slot name="button"></slot>
          </div>
          <div id="form">
            <slot name="form"></slot>
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
      this.target = "";
      this.selector = "";
      this._root = this.attachShadow({ mode: "open" });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
      const divBuy = this._root.querySelector("#buy");
      const divForm = this._root.querySelector("#form");
      divBuy.addEventListener("click", e => {
        if (this.target) {
          const dbcompTarget = document.getElementById(this.target);
          if (dbcompTarget) {
            // valid target - see if we have selected anything
            const items = dbcompTarget._root.querySelectorAll(this.selector);
            if (items.length > 0) {
              divForm.style.display = "block";
              divBuy.style.display = "none";
              dbcompTarget.style.display = "none";
            }
          }
        }
      });
    }

    /**
     * @returns {Array} [sql,selector,service]
     */
    static get observedAttributes() {
      return [
        "sql",
        "selector",
        "target",
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
      if (name === "sql") {
        this.sql = newValue;
      }
      if (name === "target") {
        this.target = newValue;
      }
      if (name === "service") {
        this.service = newValue;
      }
      if (name === "selector") {
        this.selector = newValue;
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
