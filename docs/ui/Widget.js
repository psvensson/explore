/* widget.js – universal Widget base with declarative events
   ---------------------------------------------------------*/
(function (global) {
  'use strict';

  /* ─────────────────────────────────────────────────────────── */
  const WIDGET_INSTANCES = Object.create(null);   // uid  → instance
  const WIDGET_CLASSES = Object.create(null);   // name → class
  const EVENT_TYPES = ['click', 'change', 'submit'];

  /* helper: register handlebars helper only if missing */
  const ensureHelper = (name, fn) => {
    /* generic helpers: register only if missing */
    if (name !== 'widget') {
      if (!Handlebars.helpers[name]) Handlebars.registerHelper(name, fn);
      return;
    }

    /* SPECIAL case ― “widget” helper:
       we always (re-)register it with logic that renders immediately
       when the class is already known, otherwise emits a placeholder     */

    Handlebars.unregisterHelper && Handlebars.unregisterHelper('widget');
    Handlebars.registerHelper('widget', function (wName /* …args */) {
      const opts = arguments[arguments.length - 1];
      const pos = Array.prototype.slice.call(arguments, 1, -1);
      const hash = opts.hash;
      const inner = opts.fn ? opts.fn(this) : '';

      /* class already loaded → render right now */
      const Klass = WIDGET_CLASSES[wName];
      if (Klass) {
        const inst = new Klass(undefined, undefined, hash);
        const ctx = Object.assign(Object.create(this), hash, {
          args: pos, inner, parent: this
        });
        return new Handlebars.SafeString(inst.render(ctx));
      }

      /* class not yet loaded → fallback placeholder */
      return new Handlebars.SafeString(
        `<span data-widget-plh="${wName}"
             data-params='${JSON.stringify({ pos, hash, inner }).replace(/'/g, '&#39;')}'>
       </span>`
      );
    });
  };

  /* ─────────────────────────  Widget  ───────────────────────── */
  class Widget {
    static registry = Object.create(null);
    static styledOnce = new Set();
    static _uidCounter = 0;

    /* ------------ constructor ------------ */
    constructor({ name, template, style = '' } = {}) {
      if (!name || !template)
        throw new Error('Widget needs "name" & "template"');

      this.name = name;
      this.uid = `${name}-${Widget._uidCounter++}`;
      this.el = null;                       /* DOM once mounted */
      this.state = Object.create(null);
      this._readyFired = false;

      WIDGET_INSTANCES[this.uid] = this;

      /* compile template once */
      const compiled = typeof template === 'function'
        ? template
        : Handlebars.compile(template);

      /* render(ctx) auto-injects data-widget-id */
      this.render = ctx => {
        const html = compiled({ uid: this.uid, ...(ctx || {}) });
        return html.includes(`data-widget-id="${this.uid}"`)
          ? html
          : html.replace(/^(\s*<\w+)/,
            `$1 data-widget-id="${this.uid}"`);
      };

      /* one-time CSS per widget class */
      if (style && !Widget.styledOnce.has(name)) {
        Widget.styledOnce.add(name);
        const tag = document.createElement('style');
        tag.textContent = style;
        tag.dataset.widget = name;
        document.head.appendChild(tag);
      }

      /* handlebars helpers */
      ensureHelper('on', (ev, fn) => new Handlebars.SafeString(`data-${ev}="${fn}"`));
      ensureHelper('widget', (n, ...a) => Widget._hbsWidgetHelper(n, a));

      /* attempt auto-wire if element already present (placeholder upgrade) */
      queueMicrotask(() => this._tryAutoWire());
    }

    /* ------------ placeholder helper ------------ */
    static _hbsWidgetHelper(name, args) {
      const opts = args.pop();                         // Handlebars meta arg
      const pos = args;
      const hash = opts.hash;
      const inner = opts.fn ? opts.fn(this) : '';

      /* output <span data-widget-plh="name" …> */
      return new Handlebars.SafeString(
        `<span data-widget-plh="${name}"
               data-params='${JSON.stringify({ pos, hash, inner }).replace(/'/g, '&#39;')}'>
         </span>`
      );
    }

    /* ------------ mounting/rendering ------------ */
    toElement(ctx) {
      const t = document.createElement('template');
      t.innerHTML = this.render(ctx).trim();
      return t.content.firstElementChild;
    }

    mount(target = document.body, ctx = {}) {
      if (typeof target === 'string') target = document.querySelector(target);
      this.el = this.toElement(ctx);
      (target || document.body).appendChild(this.el);
      this._wire();
      this._afterRender();
      return this.el;
    }

    update(next = {}) {
      Object.assign(this.state, next);
      this._ensureEl();
      if (!this.el) return;

      const fresh = this.toElement(this.state);
      this.el.replaceWith(fresh);
      this.el = fresh;
      this._wire();
      this._afterRender();
    }

    /* ------------ one-time ready() ------------ */
    _afterRender() {
      if (this._readyFired) return;
      this._readyFired = true;
      if (typeof this.ready === 'function')
        queueMicrotask(() => this.ready());
    }

    /* ---------- event delegation (single-fire) ---------- */
    _wire() {
      if (!this.el) return;

      // local listeners; 'submit' is once per render
      this.el.removeEventListener('submit', this);
      this.el.addEventListener('submit', this, { once: true });

      // we still want local click/change for things like checkboxes
      ['click', 'change'].forEach(t => {
        this.el.removeEventListener(t, this);
        this.el.addEventListener(t, this);
      });
    }

    handleEvent(e) {
      const trg = e.target.closest(`[data-${e.type}]`);
      if (!trg || !this.el.contains(trg)) return;

      // stop here so no other widget / global listener handles it twice
      e.stopPropagation();

      const fn = this[trg.dataset[e.type]];
      if (typeof fn === 'function') fn.call(this, e, trg);
    }

    /* ------------ utilities ------------ */
    _ensureEl() {
      if (!this.el || !document.contains(this.el))
        this.el = document.querySelector(`[data-widget-id="${this.uid}"]`);
    }

    _tryAutoWire() {
      this._ensureEl();
      if (this.el) {
        this._wire();
        this._afterRender();
      }
    }
    /* ------------ static: register class & upgrade placeholders ------------ */
    static define(name, Klass) {
      WIDGET_CLASSES[name] = Klass;

      document.querySelectorAll(`[data-widget-plh="${name}"]`)
        .forEach(ph => Widget._upgradePlaceholder(ph, Klass));
    }

    static _upgradePlaceholder(ph, Klass) {
      if (ph.__upgraded) return;
      const p = JSON.parse(ph.dataset.params || '{}');
      const ctx = Object.assign(Object.create(ph.parentNode), p.hash, {
        args: p.pos,
        inner: p.inner,
        parent: ph.parentNode
      });
      const inst   = new Klass(undefined, undefined, p.hash || {});
      const html = inst.render(ctx);
      const tmp = document.createElement('template');
      tmp.innerHTML = html.trim();
      const el = tmp.content.firstElementChild;
      ph.replaceWith(el);
      inst.el = el;
      inst._wire();
      inst._afterRender();
      ph.__upgraded = true;
    }
  }

  /* global event delegator (one per page) */
  if (!global.__widgetDelegatorInstalled) {
    global.__widgetDelegatorInstalled = true;

    EVENT_TYPES.forEach(type => {
      document.addEventListener(type, evt => {
        const attr = `data-${type}`;
        const target = evt.target.closest(`[${attr}]`);
        if (!target) return;

        const root = target.closest('[data-widget-id]');
        if (!root) return;

        const inst = WIDGET_INSTANCES[root.dataset.widgetId || root.getAttribute('data-widget-id')];
        if (!inst) return;

        const fn = inst[target.getAttribute(attr)];
        if (typeof fn === 'function') fn.call(inst, evt, target);
      });
    });
  }

  global.Widget = Widget;
})(window);
