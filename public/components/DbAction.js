// @ts-check

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

  
  class DBAction extends HTMLElement {
    constructor() {
      super();
      this.service = "/runsql"; // default service
      this.sql = "";
      this.selector = "";
      this._root = this.attachShadow({ mode: "open" });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
   
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
