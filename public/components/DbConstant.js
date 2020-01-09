// @ts-check

/* this component delivers a constant value
 * that can be depended on by other components
 * it will also trigger a dbUpdate to let others reload based on this value
 */

(function() {
  const template = document.createElement("template");
  template.innerHTML = `
          <style>
          label {
              display: grid;
              grid-template-columns: 7fr 4fr;
              margin: 5px;
              padding: 5px;
              border-radius: 5px;
              border: solid gray 1px;
              background-color: whitesmoke;
          }
          label > span {
            white-space:nowrap;
            padding-right: 6px;
          }
          </style>
          <label id="myself"><span></span><input disabled type="text" value=""></label>
      `;

  class DBConstant extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: "open" });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    /**
     * field    the field that is returned as value, default is "userid"
     * label    text shown on component
     */
    static get observedAttributes() {
      return ["field", "label", "value"];
    }

    connectedCallback() {
      // give some time for components to load
      setTimeout(() => this.trigger({}), 200);
    }

    get value() {
      let myself = this._root.querySelector("#myself > input");
      return myself.value;
    }


    attributeChangedCallback(name, oldValue, newValue) {
      let lbl = this._root.querySelector("#myself > span");
      let input = this._root.querySelector("#myself > input");
      if (name === "label") {
        this.label = newValue;
        lbl.innerHTML = newValue.charAt(0).toUpperCase() + newValue.substr(1);
      }
      if (name === "value") {
        input.value = newValue;
      }
      if (name === "field") {
        this.field = newValue;
        input.id = newValue;
      }
    }

    trigger(detail) {
      detail.source = this.id;
      detail.field = this.field;
      this.dispatchEvent(
        new CustomEvent("dbUpdate", {
          bubbles: true,
          composed: true,
          detail
        })
      );
    }

  }

  window.customElements.define("db-constant", DBConstant);
})();
