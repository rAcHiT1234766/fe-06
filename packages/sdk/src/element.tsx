import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import spikeStyles from './element/spike.css?inline';

function ClickCounter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" className="dk-spike-button" onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}

class DashKitElement extends HTMLElement {
  #root: Root | undefined;

  connectedCallback() {
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(spikeStyles);
    shadow.adoptedStyleSheets = [sheet];

    const mountPoint = document.createElement('div');
    mountPoint.className = 'dk-root';
    shadow.replaceChildren(mountPoint);
    this.#root = createRoot(mountPoint);
    this.#root.render(<ClickCounter />);
  }

  disconnectedCallback() {
    this.#root?.unmount();
    this.#root = undefined;
  }
}

if (!customElements.get('dashkit-dashboard')) {
  customElements.define('dashkit-dashboard', DashKitElement);
}
