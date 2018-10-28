var app = (function () {
	'use strict';

	function noop() {}

	function assign(tar, src) {
		for (var k in src) tar[k] = src[k];
		return tar;
	}

	function callAfter(fn, i) {
		if (i === 0) fn();
		return () => {
			if (!--i) fn();
		};
	}

	function addLoc(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		fn();
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detachNode(node) {
		node.parentNode.removeChild(node);
	}

	function destroyEach(iterations, detach) {
		for (var i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detach);
		}
	}

	function createElement(name) {
		return document.createElement(name);
	}

	function createText(data) {
		return document.createTextNode(data);
	}

	function addListener(node, event, handler) {
		node.addEventListener(event, handler, false);
	}

	function removeListener(node, event, handler) {
		node.removeEventListener(event, handler, false);
	}

	function setAttribute(node, attribute, value) {
		node.setAttribute(attribute, value);
	}

	function setData(text, data) {
		text.data = '' + data;
	}

	function setStyle(node, key, value) {
		node.style.setProperty(key, value);
	}

	function toggleClass(element, name, toggle) {
		element.classList.toggle(name, !!toggle);
	}

	function linear(t) {
		return t;
	}

	function generateRule({ a, b, delta, duration }, ease, fn) {
		const step = 16.666 / duration;
		let keyframes = '{\n';

		for (let p = 0; p <= 1; p += step) {
			const t = a + delta * ease(p);
			keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
		}

		return keyframes + `100% {${fn(b, 1 - b)}}\n}`;
	}

	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	function hash(str) {
		let hash = 5381;
		let i = str.length;

		while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
		return hash >>> 0;
	}

	function wrapTransition(component, node, fn, params, intro) {
		let obj = fn.call(component, node, params);
		let duration;
		let ease;
		let cssText;

		let initialised = false;

		return {
			t: intro ? 0 : 1,
			running: false,
			program: null,
			pending: null,

			run(b, callback) {
				if (typeof obj === 'function') {
					transitionManager.wait().then(() => {
						obj = obj();
						this._run(b, callback);
					});
				} else {
					this._run(b, callback);
				}
			},

			_run(b, callback) {
				duration = obj.duration || 300;
				ease = obj.easing || linear;

				const program = {
					start: window.performance.now() + (obj.delay || 0),
					b,
					callback: callback || noop
				};

				if (intro && !initialised) {
					if (obj.css && obj.delay) {
						cssText = node.style.cssText;
						node.style.cssText += obj.css(0, 1);
					}

					if (obj.tick) obj.tick(0, 1);
					initialised = true;
				}

				if (!b) {
					program.group = outros.current;
					outros.current.remaining += 1;
				}

				if (obj.delay) {
					this.pending = program;
				} else {
					this.start(program);
				}

				if (!this.running) {
					this.running = true;
					transitionManager.add(this);
				}
			},

			start(program) {
				component.fire(`${program.b ? 'intro' : 'outro'}.start`, { node });

				program.a = this.t;
				program.delta = program.b - program.a;
				program.duration = duration * Math.abs(program.b - program.a);
				program.end = program.start + program.duration;

				if (obj.css) {
					if (obj.delay) node.style.cssText = cssText;

					const rule = generateRule(program, ease, obj.css);
					transitionManager.addRule(rule, program.name = '__svelte_' + hash(rule));

					node.style.animation = (node.style.animation || '')
						.split(', ')
						.filter(anim => anim && (program.delta < 0 || !/__svelte/.test(anim)))
						.concat(`${program.name} ${program.duration}ms linear 1 forwards`)
						.join(', ');
				}

				this.program = program;
				this.pending = null;
			},

			update(now) {
				const program = this.program;
				if (!program) return;

				const p = now - program.start;
				this.t = program.a + program.delta * ease(p / program.duration);
				if (obj.tick) obj.tick(this.t, 1 - this.t);
			},

			done() {
				const program = this.program;
				this.t = program.b;

				if (obj.tick) obj.tick(this.t, 1 - this.t);

				component.fire(`${program.b ? 'intro' : 'outro'}.end`, { node });

				if (!program.b && !program.invalidated) {
					program.group.callbacks.push(() => {
						program.callback();
						if (obj.css) transitionManager.deleteRule(node, program.name);
					});

					if (--program.group.remaining === 0) {
						program.group.callbacks.forEach(run);
					}
				} else {
					if (obj.css) transitionManager.deleteRule(node, program.name);
				}

				this.running = !!this.pending;
			},

			abort(reset) {
				if (this.program) {
					if (reset && obj.tick) obj.tick(1, 0);
					if (obj.css) transitionManager.deleteRule(node, this.program.name);
					this.program = this.pending = null;
					this.running = false;
				}
			},

			invalidate() {
				if (this.program) {
					this.program.invalidated = true;
				}
			}
		};
	}

	let outros = {};

	function groupOutros() {
		outros.current = {
			remaining: 0,
			callbacks: []
		};
	}

	var transitionManager = {
		running: false,
		transitions: [],
		bound: null,
		stylesheet: null,
		activeRules: {},
		promise: null,

		add(transition) {
			this.transitions.push(transition);

			if (!this.running) {
				this.running = true;
				requestAnimationFrame(this.bound || (this.bound = this.next.bind(this)));
			}
		},

		addRule(rule, name) {
			if (!this.stylesheet) {
				const style = createElement('style');
				document.head.appendChild(style);
				transitionManager.stylesheet = style.sheet;
			}

			if (!this.activeRules[name]) {
				this.activeRules[name] = true;
				this.stylesheet.insertRule(`@keyframes ${name} ${rule}`, this.stylesheet.cssRules.length);
			}
		},

		next() {
			this.running = false;

			const now = window.performance.now();
			let i = this.transitions.length;

			while (i--) {
				const transition = this.transitions[i];

				if (transition.program && now >= transition.program.end) {
					transition.done();
				}

				if (transition.pending && now >= transition.pending.start) {
					transition.start(transition.pending);
				}

				if (transition.running) {
					transition.update(now);
					this.running = true;
				} else if (!transition.pending) {
					this.transitions.splice(i, 1);
				}
			}

			if (this.running) {
				requestAnimationFrame(this.bound);
			} else if (this.stylesheet) {
				let i = this.stylesheet.cssRules.length;
				while (i--) this.stylesheet.deleteRule(i);
				this.activeRules = {};
			}
		},

		deleteRule(node, name) {
			node.style.animation = node.style.animation
				.split(', ')
				.filter(anim => anim && anim.indexOf(name) === -1)
				.join(', ');
		},

		wait() {
			if (!transitionManager.promise) {
				transitionManager.promise = Promise.resolve();
				transitionManager.promise.then(() => {
					transitionManager.promise = null;
				});
			}

			return transitionManager.promise;
		}
	};

	function blankObject() {
		return Object.create(null);
	}

	function destroy(detach) {
		this.destroy = noop;
		this.fire('destroy');
		this.set = noop;

		this._fragment.d(detach !== false);
		this._fragment = null;
		this._state = {};
	}

	function destroyDev(detach) {
		destroy.call(this, detach);
		this.destroy = function() {
			console.warn('Component was already destroyed');
		};
	}

	function _differs(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function _differsImmutable(a, b) {
		return a != a ? b == b : a !== b;
	}

	function fire(eventName, data) {
		var handlers =
			eventName in this._handlers && this._handlers[eventName].slice();
		if (!handlers) return;

		for (var i = 0; i < handlers.length; i += 1) {
			var handler = handlers[i];

			if (!handler.__calling) {
				try {
					handler.__calling = true;
					handler.call(this, data);
				} finally {
					handler.__calling = false;
				}
			}
		}
	}

	function flush(component) {
		component._lock = true;
		callAll(component._beforecreate);
		callAll(component._oncreate);
		callAll(component._aftercreate);
		component._lock = false;
	}

	function get() {
		return this._state;
	}

	function init(component, options) {
		component._handlers = blankObject();
		component._slots = blankObject();
		component._bind = options._bind;
		component._staged = {};

		component.options = options;
		component.root = options.root || component;
		component.store = options.store || component.root.store;

		if (!options.root) {
			component._beforecreate = [];
			component._oncreate = [];
			component._aftercreate = [];
		}
	}

	function on(eventName, handler) {
		var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
		handlers.push(handler);

		return {
			cancel: function() {
				var index = handlers.indexOf(handler);
				if (~index) handlers.splice(index, 1);
			}
		};
	}

	function set(newState) {
		this._set(assign({}, newState));
		if (this.root._lock) return;
		flush(this.root);
	}

	function _set(newState) {
		var oldState = this._state,
			changed = {},
			dirty = false;

		newState = assign(this._staged, newState);
		this._staged = {};

		for (var key in newState) {
			if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
		}
		if (!dirty) return;

		this._state = assign(assign({}, oldState), newState);
		this._recompute(changed, this._state);
		if (this._bind) this._bind(changed, this._state);

		if (this._fragment) {
			this.fire("state", { changed: changed, current: this._state, previous: oldState });
			this._fragment.p(changed, this._state);
			this.fire("update", { changed: changed, current: this._state, previous: oldState });
		}
	}

	function _stage(newState) {
		assign(this._staged, newState);
	}

	function setDev(newState) {
		if (typeof newState !== 'object') {
			throw new Error(
				this._debugName + '.set was called without an object of data key-values to update.'
			);
		}

		this._checkReadOnly(newState);
		set.call(this, newState);
	}

	function callAll(fns) {
		while (fns && fns.length) fns.shift()();
	}

	function _mount(target, anchor) {
		this._fragment[this._fragment.i ? 'i' : 'm'](target, anchor || null);
	}

	function removeFromStore() {
		this.store._remove(this);
	}

	var protoDev = {
		destroy: destroyDev,
		get,
		fire,
		on,
		set: setDev,
		_recompute: noop,
		_set,
		_stage,
		_mount,
		_differs
	};

	/* src\icons\Logo.html generated by Svelte v2.14.3 */

	const file = "src\\icons\\Logo.html";

	function create_main_fragment(component, ctx) {
		var div9, div8, div0, text0, div1, text1, div2, text2, div4, div3, text3, div6, div5, text4, div7, current;

		return {
			c: function create() {
				div9 = createElement("div");
				div8 = createElement("div");
				div0 = createElement("div");
				text0 = createText("\n\n    \n    ");
				div1 = createElement("div");
				text1 = createText("\n\n    \n    ");
				div2 = createElement("div");
				text2 = createText("\n\n    \n    ");
				div4 = createElement("div");
				div3 = createElement("div");
				text3 = createText("\n\n    \n    ");
				div6 = createElement("div");
				div5 = createElement("div");
				text4 = createText("\n\n    \n    ");
				div7 = createElement("div");
				div0.className = "head-copy svelte-s4wrdt";
				addLoc(div0, file, 6, 4, 101);
				div1.className = "ear-left svelte-s4wrdt";
				addLoc(div1, file, 10, 4, 170);
				div2.className = "ear-right svelte-s4wrdt";
				addLoc(div2, file, 14, 4, 239);
				div3.className = "pupil svelte-s4wrdt";
				addLoc(div3, file, 20, 6, 367);
				div4.className = "eye-left svelte-s4wrdt";
				addLoc(div4, file, 18, 4, 309);
				div5.className = "pupil svelte-s4wrdt";
				addLoc(div5, file, 27, 6, 506);
				div6.className = "eye-right svelte-s4wrdt";
				addLoc(div6, file, 25, 4, 447);
				div7.className = "nose svelte-s4wrdt";
				addLoc(div7, file, 32, 4, 581);
				div8.className = "head svelte-s4wrdt";
				addLoc(div8, file, 3, 2, 45);
				div9.className = "box svelte-s4wrdt";
				addLoc(div9, file, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div9, anchor);
				append(div9, div8);
				append(div8, div0);
				append(div8, text0);
				append(div8, div1);
				append(div8, text1);
				append(div8, div2);
				append(div8, text2);
				append(div8, div4);
				append(div4, div3);
				append(div8, text3);
				append(div8, div6);
				append(div6, div5);
				append(div8, text4);
				append(div8, div7);
				current = true;
			},

			p: noop,

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div9);
				}
			}
		};
	}

	function Logo(options) {
		this._debugName = '<Logo>';
		if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
		init(this, options);
		this._state = assign({}, options.data);
		this._intro = !!options.intro;

		this._fragment = create_main_fragment(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}

		this._intro = true;
	}

	assign(Logo.prototype, protoDev);

	Logo.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\components\Sidenav.html generated by Svelte v2.14.3 */



	const file$1 = "src\\components\\Sidenav.html";

	function create_main_fragment$1(component, ctx) {
		var nav, div, text0, h2, text2, ul, li, h4, current;

		var logo = new Logo({
			root: component.root,
			store: component.store
		});

		function click_handler(event) {
			component.store.set({page: 'scrumb-dashboard'});
		}

		return {
			c: function create() {
				nav = createElement("nav");
				div = createElement("div");
				logo._fragment.c();
				text0 = createText("\n    ");
				h2 = createElement("h2");
				h2.textContent = "Panda";
				text2 = createText("\n  ");
				ul = createElement("ul");
				li = createElement("li");
				h4 = createElement("h4");
				h4.textContent = "Scrumb";
				h2.className = "title svelte-mvlw3v";
				addLoc(h2, file$1, 3, 4, 70);
				div.className = "logo-and-title svelte-mvlw3v";
				addLoc(div, file$1, 1, 2, 24);
				addLoc(h4, file$1, 10, 6, 233);
				addListener(li, "click", click_handler);
				li.className = "svelte-mvlw3v";
				toggleClass(li, "active", ctx.$page === 'scrumb-dashboard');
				addLoc(li, file$1, 9, 4, 134);
				ul.className = "svelte-mvlw3v";
				addLoc(ul, file$1, 8, 2, 125);
				nav.className = "sidenav";
				addLoc(nav, file$1, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, nav, anchor);
				append(nav, div);
				logo._mount(div, null);
				append(div, text0);
				append(div, h2);
				append(nav, text2);
				append(nav, ul);
				append(ul, li);
				append(li, h4);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.$page) {
					toggleClass(li, "active", ctx.$page === 'scrumb-dashboard');
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (logo) logo._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(nav);
				}

				logo.destroy();
				removeListener(li, "click", click_handler);
			}
		};
	}

	function Sidenav(options) {
		this._debugName = '<Sidenav>';
		if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
		init(this, options);
		this._state = assign(this.store._init(["page"]), options.data);
		this.store._add(this, ["page"]);
		if (!('$page' in this._state)) console.warn("<Sidenav> was created without expected data property '$page'");
		this._intro = !!options.intro;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$1(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(Sidenav.prototype, protoDev);

	Sidenav.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\components\Buttons.html generated by Svelte v2.14.3 */

	var methods = {
	  exportData() {
	    const c = this.store.get()['scrumbs'];
	    const s = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({scrumbs: c}));
	    const n = document.createElement('a');
	    n.setAttribute('href', s);
	    n.setAttribute('download', 'data.json');
	    document.body.appendChild(n); // required for firefox
	    n.click();
	    n.remove();
	  },
	  importData() {
	    const reader = event => {
	      const fr = new FileReader();
	      fr.readAsText(event.target.files[0]);
	      setTimeout(
	        () => {
	          this.store.set({scrumbs: JSON.parse(fr.result)['scrumbs']});
	          localStorage.setItem('scrumbs', JSON.stringify(this.store.get()['scrumbs']));
	          cleanListener(document.querySelector('#input-data'));
	          }
	        , 10
	      );
	    };

	    const cleanListener = target => {
	      target.removeEventListener('change', reader);
	    };

	    const inputElement = document.querySelector('#input-data');

	    inputElement.addEventListener('change', reader);
	    inputElement.click();
	  }
	};

	const file$2 = "src\\components\\Buttons.html";

	function create_main_fragment$2(component, ctx) {
		var button0, text1, button1, text3, button2, text5, input, current;

		function click_handler(event) {
			component.store.set({addScrumb: true});
		}

		function click_handler_1(event) {
			component.exportData();
		}

		function click_handler_2(event) {
			component.importData();
		}

		return {
			c: function create() {
				button0 = createElement("button");
				button0.textContent = "Aggiungi";
				text1 = createText("\n");
				button1 = createElement("button");
				button1.textContent = "Export";
				text3 = createText("\n");
				button2 = createElement("button");
				button2.textContent = "Import";
				text5 = createText("\n");
				input = createElement("input");
				addListener(button0, "click", click_handler);
				button0.className = "btn btn-primary";
				addLoc(button0, file$2, 0, 0, 0);
				addListener(button1, "click", click_handler_1);
				button1.className = "btn btn-primary";
				addLoc(button1, file$2, 1, 0, 85);
				addListener(button2, "click", click_handler_2);
				button2.className = "btn btn-primary";
				addLoc(button2, file$2, 2, 0, 157);
				setAttribute(input, "type", "file");
				setStyle(input, "display", "none");
				input.id = "input-data";
				addLoc(input, file$2, 3, 0, 229);
			},

			m: function mount(target, anchor) {
				insert(target, button0, anchor);
				insert(target, text1, anchor);
				insert(target, button1, anchor);
				insert(target, text3, anchor);
				insert(target, button2, anchor);
				insert(target, text5, anchor);
				insert(target, input, anchor);
				current = true;
			},

			p: noop,

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(button0);
				}

				removeListener(button0, "click", click_handler);
				if (detach) {
					detachNode(text1);
					detachNode(button1);
				}

				removeListener(button1, "click", click_handler_1);
				if (detach) {
					detachNode(text3);
					detachNode(button2);
				}

				removeListener(button2, "click", click_handler_2);
				if (detach) {
					detachNode(text5);
					detachNode(input);
				}
			}
		};
	}

	function Buttons(options) {
		this._debugName = '<Buttons>';
		if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
		init(this, options);
		this._state = assign({}, options.data);
		this._intro = !!options.intro;

		this._fragment = create_main_fragment$2(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}

		this._intro = true;
	}

	assign(Buttons.prototype, protoDev);
	assign(Buttons.prototype, methods);

	Buttons.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\components\Scrumb.html generated by Svelte v2.14.3 */

	function data() {
	  return {
	    newBlock: ''
	  }
	}
	var methods$1 = {
	  removeScrumb(scrumb) {
	    const scrumbs = this.store.get()['scrumbs'];
	    let key;
	    Object.keys(scrumbs).forEach(c => { if (scrumbs[c].find(s => s === scrumb)) key = c; });
	    scrumbs[key].splice(scrumbs[key].indexOf(scrumb), 1);
	    this.store.set({'scrumbs': scrumbs});
	  },
	  setEditable(scrumb) {
	    const scrumbs = this.store.get()['scrumbs'];
	    let key;
	    Object.keys(scrumbs).forEach(c => { if (scrumbs[c].find(s => s === scrumb)) key = c; });
	    scrumbs[key].filter(s => s === scrumb)[0].editblock = !scrumb.editblock;
	    this.store.set({'scrumbs': scrumbs});
	  },
	  addScrumbBlock(newBlock, scrumb) {
	    const scrumbs = this.store.get()['scrumbs'];
	    let key;
	    Object.keys(scrumbs).forEach(c => { if (scrumbs[c].find(s => s === scrumb)) key = c; });
	    scrumbs[key].find(s =>
	      s === this._state.scrumb
	    )['block'].push(newBlock);
	    this.store.set({'scrumbs': scrumbs});
	  }
	};

	function fade(node, {
	  delay = 0,
	  duration = 400
	}) {
	  const o = +getComputedStyle(node).opacity;

	  return {
	    delay,
	    duration,
	    css: t => `opacity: ${t * o}`
	  };
	}
	const file$3 = "src\\components\\Scrumb.html";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.block = list[i];
		child_ctx.each_value = list;
		child_ctx.block_index = i;
		return child_ctx;
	}

	function create_main_fragment$3(component, ctx) {
		var div2, div0, span0, text1, div1, text2_value = ctx.scrumb.header, text2, text3, span1, text5, text6, current;

		function click_handler(event) {
			component.removeScrumb(ctx.scrumb);
		}

		function click_handler_1(event) {
			component.setEditable(ctx.scrumb);
		}

		var if_block = (ctx.scrumb.editblock) && create_if_block_1(component, ctx);

		var each_value = ctx.scrumb.block;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(component, get_each_context(ctx, each_value, i));
		}

		function dragstart_handler(event) {
			component.store.set({draggedScrumb: ctx.scrumb});
		}

		return {
			c: function create() {
				div2 = createElement("div");
				div0 = createElement("div");
				span0 = createElement("span");
				span0.textContent = "X";
				text1 = createText("\n  ");
				div1 = createElement("div");
				text2 = createText(text2_value);
				text3 = createText("\n    ");
				span1 = createElement("span");
				span1.textContent = "✎";
				text5 = createText("\n  ");
				if (if_block) if_block.c();
				text6 = createText("\n  ");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				addListener(span0, "click", click_handler);
				span0.className = "close svelte-9fs96g";
				addLoc(span0, file$3, 2, 4, 117);
				div0.className = "remove-scrumb svelte-9fs96g";
				addLoc(div0, file$3, 1, 2, 85);
				addListener(span1, "click", click_handler_1);
				span1.className = "edit-block svelte-9fs96g";
				addLoc(span1, file$3, 6, 4, 241);
				div1.className = "scrumb-header svelte-9fs96g";
				addLoc(div1, file$3, 4, 2, 189);
				addListener(div2, "dragstart", dragstart_handler);
				div2.className = "scrumb svelte-9fs96g";
				div2.draggable = "true";
				addLoc(div2, file$3, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				append(div0, span0);
				append(div2, text1);
				append(div2, div1);
				append(div1, text2);
				append(div1, text3);
				append(div1, span1);
				append(div2, text5);
				if (if_block) if_block.i(div2, null);
				append(div2, text6);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div2, null);
				}

				current = true;
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if ((!current || changed.scrumb) && text2_value !== (text2_value = ctx.scrumb.header)) {
					setData(text2, text2_value);
				}

				if (ctx.scrumb.editblock) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block_1(component, ctx);
						if (if_block) if_block.c();
					}

					if_block.i(div2, text6);
				} else if (if_block) {
					groupOutros();
					if_block.o(function() {
						if_block.d(1);
						if_block = null;
					});
				}

				if (changed.scrumb) {
					each_value = ctx.scrumb.block;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div2, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (if_block) if_block.o(outrocallback);
				else outrocallback();

				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div2);
				}

				removeListener(span0, "click", click_handler);
				removeListener(span1, "click", click_handler_1);
				if (if_block) if_block.d();

				destroyEach(each_blocks, detach);

				removeListener(div2, "dragstart", dragstart_handler);
			}
		};
	}

	// (9:2) {#if scrumb.editblock}
	function create_if_block_1(component, ctx) {
		var div, input, input_updating = false, text, span, div_transition, current;

		function input_input_handler() {
			input_updating = true;
			component.set({ newBlock: input.value });
			input_updating = false;
		}

		function click_handler(event) {
			component.addScrumbBlock(ctx.newBlock, ctx.scrumb);
		}

		return {
			c: function create() {
				div = createElement("div");
				input = createElement("input");
				text = createText("\n    ");
				span = createElement("span");
				span.textContent = "+";
				addListener(input, "input", input_input_handler);
				setAttribute(input, "type", "text");
				input.placeholder = "New block";
				input.className = "svelte-9fs96g";
				addLoc(input, file$3, 10, 4, 381);
				addListener(span, "click", click_handler);
				span.className = "new-block svelte-9fs96g";
				addLoc(span, file$3, 11, 4, 449);
				div.className = "card svelte-9fs96g";
				addLoc(div, file$3, 9, 2, 342);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, input);

				input.value = ctx.newBlock;

				append(div, text);
				append(div, span);
				current = true;
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if (!input_updating && changed.newBlock) input.value = ctx.newBlock;
			},

			i: function intro(target, anchor) {
				if (current) return;
				if (component.root._intro) {
					if (div_transition) div_transition.invalidate();

					component.root._aftercreate.push(() => {
						if (!div_transition) div_transition = wrapTransition(component, div, fade, {}, true);
						div_transition.run(1);
					});
				}
				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (!div_transition) div_transition = wrapTransition(component, div, fade, {}, false);
				div_transition.run(0, () => {
					outrocallback();
					div_transition = null;
				});

				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				removeListener(input, "input", input_input_handler);
				removeListener(span, "click", click_handler);
				if (detach) {
					if (div_transition) div_transition.abort();
				}
			}
		};
	}

	// (20:4) {#if scrumb.editblock}
	function create_if_block(component, ctx) {
		var div;

		return {
			c: function create() {
				div = createElement("div");
				div.textContent = "🗑";
				div.className = "edit svelte-9fs96g";
				addLoc(div, file$3, 20, 4, 684);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}
			}
		};
	}

	// (15:2) {#each scrumb.block as block}
	function create_each_block(component, ctx) {
		var div1, div0, text0_value = ctx.block, text0, text1, text2;

		var if_block = (ctx.scrumb.editblock) && create_if_block(component, ctx);

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				text0 = createText(text0_value);
				text1 = createText("\n    ");
				if (if_block) if_block.c();
				text2 = createText("\n  ");
				div0.className = "block";
				addLoc(div0, file$3, 16, 4, 608);
				div1.className = "scrumb-block svelte-9fs96g";
				addLoc(div1, file$3, 15, 2, 577);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, text0);
				append(div1, text1);
				if (if_block) if_block.m(div1, null);
				append(div1, text2);
			},

			p: function update(changed, ctx) {
				if ((changed.scrumb) && text0_value !== (text0_value = ctx.block)) {
					setData(text0, text0_value);
				}

				if (ctx.scrumb.editblock) {
					if (!if_block) {
						if_block = create_if_block(component, ctx);
						if_block.c();
						if_block.m(div1, text2);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}

				if (if_block) if_block.d();
			}
		};
	}

	function Scrumb(options) {
		this._debugName = '<Scrumb>';
		if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
		init(this, options);
		this._state = assign(data(), options.data);
		if (!('scrumb' in this._state)) console.warn("<Scrumb> was created without expected data property 'scrumb'");
		if (!('newBlock' in this._state)) console.warn("<Scrumb> was created without expected data property 'newBlock'");
		this._intro = !!options.intro;

		this._fragment = create_main_fragment$3(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(Scrumb.prototype, protoDev);
	assign(Scrumb.prototype, methods$1);

	Scrumb.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\pages\ScrumbDashboard.html generated by Svelte v2.14.3 */

	function data$1() {
	  return {
	    addScrumb: false
	  }
	}
	var methods$2 = {
	  add() {
	    const scrumbs = this.store.get()['scrumbs'];
	    this.store.set({
	      scrumbs: {
	        todo: [...scrumbs.todo, {
	        header: document.querySelector('#new-scrumb').value,
	        block: [],
	        editblock: false
	        }],
	        wip: scrumbs.wip,
	        testing: scrumbs.testing,
	        done: scrumbs.done,
	        unassigned: scrumbs.unassigned
	      }, addScrumb: false
	    });
	  },
	  drag(event) {
	    event.preventDefault();
	    return true
	  },
	  todo(event) {
	    const scrumb = this.store.get()['draggedScrumb'];
	    const scrumbs = this.store.get()['scrumbs'];
	    let key;
	    Object.keys(scrumbs).forEach(c => { if (scrumbs[c].find(s => s === scrumb)) key = c; });
	    scrumbs[key].splice(scrumbs[key].indexOf(scrumb), 1);
	    scrumbs['todo'].push(scrumb);
	    this.store.set({'scrumbs': scrumbs});
	  },
	  wip(event) {
	    const scrumb = this.store.get()['draggedScrumb'];
	    const scrumbs = this.store.get()['scrumbs'];
	    let key;
	    Object.keys(scrumbs).forEach(c => { if (scrumbs[c].find(s => s === scrumb)) key = c; });
	    scrumbs[key].splice(scrumbs[key].indexOf(scrumb), 1);
	    scrumbs['wip'].push(scrumb);
	    this.store.set({'scrumbs': scrumbs});
	  },
	  testing(event) {
	    const scrumb = this.store.get()['draggedScrumb'];
	    const scrumbs = this.store.get()['scrumbs'];
	    let key;
	    Object.keys(scrumbs).forEach(c => { if (scrumbs[c].find(s => s === scrumb)) key = c; });
	    scrumbs[key].splice(scrumbs[key].indexOf(scrumb), 1);
	    scrumbs['testing'].push(scrumb);
	    this.store.set({'scrumbs': scrumbs});
	  },
	  done(event) {
	    const scrumb = this.store.get()['draggedScrumb'];
	    const scrumbs = this.store.get()['scrumbs'];
	    let key;
	    Object.keys(scrumbs).forEach(c => { if (scrumbs[c].find(s => s === scrumb)) key = c; });
	    scrumbs[key].splice(scrumbs[key].indexOf(scrumb), 1);
	    scrumbs['done'].push(scrumb);
	    this.store.set({'scrumbs': scrumbs});
	  },
	  unassigned(event) {
	    const scrumb = this.store.get()['draggedScrumb'];
	    const scrumbs = this.store.get()['scrumbs'];
	    let key;
	    Object.keys(scrumbs).forEach(c => { if (scrumbs[c].find(s => s === scrumb)) key = c; });
	    scrumbs[key].splice(scrumbs[key].indexOf(scrumb), 1);
	    scrumbs['unassigned'].push(scrumb);
	    this.store.set({'scrumbs': scrumbs});
	  }
	};

	function fade$1(node, {
	  delay = 0,
	  duration = 400
	}) {
	  const o = +getComputedStyle(node).opacity;

	  return {
	    delay,
	    duration,
	    css: t => `opacity: ${t * o}`
	  };
	}
	const file$4 = "src\\pages\\ScrumbDashboard.html";

	function get_each4_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.scrumb = list[i];
		child_ctx.each4_value = list;
		child_ctx.scrumb_index = i;
		return child_ctx;
	}

	function get_each3_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.scrumb = list[i];
		child_ctx.each3_value = list;
		child_ctx.scrumb_index_1 = i;
		return child_ctx;
	}

	function get_each2_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.scrumb = list[i];
		child_ctx.each2_value = list;
		child_ctx.scrumb_index_2 = i;
		return child_ctx;
	}

	function get_each1_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.scrumb = list[i];
		child_ctx.each1_value = list;
		child_ctx.scrumb_index_3 = i;
		return child_ctx;
	}

	function get_each0_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.scrumb = list[i];
		child_ctx.each0_value = list;
		child_ctx.scrumb_index_4 = i;
		return child_ctx;
	}

	function create_main_fragment$4(component, ctx) {
		var div6, div0, span, text0, h1, text2, current_block_type_index, if_block, text3, div1, h20, text5, text6, div2, h21, text8, text9, div3, h22, text11, text12, div4, h23, text14, text15, div5, h24, text17, current;

		var buttons = new Buttons({
			root: component.root,
			store: component.store
		});

		var if_block_creators = [
			create_if_block$1,
			create_else_block_5
		];

		var if_blocks = [];

		function select_block_type(ctx) {
			if (ctx.$addScrumb) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](component, ctx);

		var each0_value = ctx.$scrumbs.todo;

		var each0_blocks = [];

		for (var i = 0; i < each0_value.length; i += 1) {
			each0_blocks[i] = create_each_block_4(component, get_each0_context(ctx, each0_value, i));
		}

		function outroBlock(i, detach, fn) {
			if (each0_blocks[i]) {
				each0_blocks[i].o(() => {
					if (detach) {
						each0_blocks[i].d(detach);
						each0_blocks[i] = null;
					}
					if (fn) fn();
				});
			}
		}

		var each0_else = null;

		if (!each0_value.length) {
			each0_else = create_else_block_4(component, ctx);
			each0_else.c();
		}

		function dragover_handler(event) {
			component.drag(event);
		}

		function drop_handler(event) {
			component.todo(event);
		}

		var each1_value = ctx.$scrumbs.wip;

		var each1_blocks = [];

		for (var i = 0; i < each1_value.length; i += 1) {
			each1_blocks[i] = create_each_block_3(component, get_each1_context(ctx, each1_value, i));
		}

		function outroBlock_1(i, detach, fn) {
			if (each1_blocks[i]) {
				each1_blocks[i].o(() => {
					if (detach) {
						each1_blocks[i].d(detach);
						each1_blocks[i] = null;
					}
					if (fn) fn();
				});
			}
		}

		var each1_else = null;

		if (!each1_value.length) {
			each1_else = create_else_block_3(component, ctx);
			each1_else.c();
		}

		function dragover_handler_1(event) {
			component.drag(event);
		}

		function drop_handler_1(event) {
			component.wip(event);
		}

		var each2_value = ctx.$scrumbs.testing;

		var each2_blocks = [];

		for (var i = 0; i < each2_value.length; i += 1) {
			each2_blocks[i] = create_each_block_2(component, get_each2_context(ctx, each2_value, i));
		}

		function outroBlock_2(i, detach, fn) {
			if (each2_blocks[i]) {
				each2_blocks[i].o(() => {
					if (detach) {
						each2_blocks[i].d(detach);
						each2_blocks[i] = null;
					}
					if (fn) fn();
				});
			}
		}

		var each2_else = null;

		if (!each2_value.length) {
			each2_else = create_else_block_2(component, ctx);
			each2_else.c();
		}

		function dragover_handler_2(event) {
			component.drag(event);
		}

		function drop_handler_2(event) {
			component.testing(event);
		}

		var each3_value = ctx.$scrumbs.done;

		var each3_blocks = [];

		for (var i = 0; i < each3_value.length; i += 1) {
			each3_blocks[i] = create_each_block_1(component, get_each3_context(ctx, each3_value, i));
		}

		function outroBlock_3(i, detach, fn) {
			if (each3_blocks[i]) {
				each3_blocks[i].o(() => {
					if (detach) {
						each3_blocks[i].d(detach);
						each3_blocks[i] = null;
					}
					if (fn) fn();
				});
			}
		}

		var each3_else = null;

		if (!each3_value.length) {
			each3_else = create_else_block_1(component, ctx);
			each3_else.c();
		}

		function dragover_handler_3(event) {
			component.drag(event);
		}

		function drop_handler_3(event) {
			component.done(event);
		}

		var each4_value = ctx.$scrumbs.unassigned;

		var each4_blocks = [];

		for (var i = 0; i < each4_value.length; i += 1) {
			each4_blocks[i] = create_each_block$1(component, get_each4_context(ctx, each4_value, i));
		}

		function outroBlock_4(i, detach, fn) {
			if (each4_blocks[i]) {
				each4_blocks[i].o(() => {
					if (detach) {
						each4_blocks[i].d(detach);
						each4_blocks[i] = null;
					}
					if (fn) fn();
				});
			}
		}

		var each4_else = null;

		if (!each4_value.length) {
			each4_else = create_else_block(component, ctx);
			each4_else.c();
		}

		function dragover_handler_4(event) {
			component.drag(event);
		}

		function drop_handler_4(event) {
			component.unassigned(event);
		}

		return {
			c: function create() {
				div6 = createElement("div");
				div0 = createElement("div");
				span = createElement("span");
				buttons._fragment.c();
				text0 = createText("\n    ");
				h1 = createElement("h1");
				h1.textContent = "Scrumb";
				text2 = createText("\n  ");
				if_block.c();
				text3 = createText("\n  ");
				div1 = createElement("div");
				h20 = createElement("h2");
				h20.textContent = "TODO";
				text5 = createText("\n    ");

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].c();
				}

				text6 = createText("\n  ");
				div2 = createElement("div");
				h21 = createElement("h2");
				h21.textContent = "WIP";
				text8 = createText("\n\n      ");

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].c();
				}

				text9 = createText("\n  ");
				div3 = createElement("div");
				h22 = createElement("h2");
				h22.textContent = "TESTING";
				text11 = createText("\n\n      ");

				for (var i = 0; i < each2_blocks.length; i += 1) {
					each2_blocks[i].c();
				}

				text12 = createText("\n  ");
				div4 = createElement("div");
				h23 = createElement("h2");
				h23.textContent = "DONE";
				text14 = createText("\n\n      ");

				for (var i = 0; i < each3_blocks.length; i += 1) {
					each3_blocks[i].c();
				}

				text15 = createText("\n  ");
				div5 = createElement("div");
				h24 = createElement("h2");
				h24.textContent = "UNASSIGNED";
				text17 = createText("\n\n      ");

				for (var i = 0; i < each4_blocks.length; i += 1) {
					each4_blocks[i].c();
				}
				span.className = "svelte-1l27u0g";
				addLoc(span, file$4, 2, 4, 50);
				addLoc(h1, file$4, 5, 4, 91);
				div0.className = "buttons svelte-1l27u0g";
				addLoc(div0, file$4, 1, 2, 24);
				h20.className = "title svelte-1l27u0g";
				addLoc(h20, file$4, 17, 4, 515);
				addListener(div1, "dragover", dragover_handler);
				addListener(div1, "drop", drop_handler);
				div1.className = "todo svelte-1l27u0g";
				addLoc(div1, file$4, 16, 2, 444);
				h21.className = "title svelte-1l27u0g";
				addLoc(h21, file$4, 25, 6, 782);
				addListener(div2, "dragover", dragover_handler_1);
				addListener(div2, "drop", drop_handler_1);
				div2.className = "under-contruction svelte-1l27u0g";
				addLoc(div2, file$4, 24, 2, 697);
				h22.className = "title svelte-1l27u0g";
				addLoc(h22, file$4, 34, 6, 1052);
				addListener(div3, "dragover", dragover_handler_2);
				addListener(div3, "drop", drop_handler_2);
				div3.className = "testing svelte-1l27u0g";
				addLoc(div3, file$4, 33, 2, 973);
				h23.className = "title svelte-1l27u0g";
				addLoc(h23, file$4, 43, 6, 1324);
				addListener(div4, "dragover", dragover_handler_3);
				addListener(div4, "drop", drop_handler_3);
				div4.className = "done svelte-1l27u0g";
				addLoc(div4, file$4, 42, 2, 1251);
				h24.className = "title svelte-1l27u0g";
				addLoc(h24, file$4, 52, 6, 1602);
				addListener(div5, "dragover", dragover_handler_4);
				addListener(div5, "drop", drop_handler_4);
				div5.className = "unassigned svelte-1l27u0g";
				addLoc(div5, file$4, 51, 2, 1517);
				div6.className = "content svelte-1l27u0g";
				addLoc(div6, file$4, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div6, anchor);
				append(div6, div0);
				append(div0, span);
				buttons._mount(span, null);
				append(div0, text0);
				append(div0, h1);
				append(div6, text2);
				if_blocks[current_block_type_index].i(div6, null);
				append(div6, text3);
				append(div6, div1);
				append(div1, h20);
				append(div1, text5);

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].i(div1, null);
				}

				if (each0_else) {
					each0_else.m(div1, null);
				}

				append(div6, text6);
				append(div6, div2);
				append(div2, h21);
				append(div2, text8);

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].i(div2, null);
				}

				if (each1_else) {
					each1_else.m(div2, null);
				}

				append(div6, text9);
				append(div6, div3);
				append(div3, h22);
				append(div3, text11);

				for (var i = 0; i < each2_blocks.length; i += 1) {
					each2_blocks[i].i(div3, null);
				}

				if (each2_else) {
					each2_else.m(div3, null);
				}

				append(div6, text12);
				append(div6, div4);
				append(div4, h23);
				append(div4, text14);

				for (var i = 0; i < each3_blocks.length; i += 1) {
					each3_blocks[i].i(div4, null);
				}

				if (each3_else) {
					each3_else.m(div4, null);
				}

				append(div6, text15);
				append(div6, div5);
				append(div5, h24);
				append(div5, text17);

				for (var i = 0; i < each4_blocks.length; i += 1) {
					each4_blocks[i].i(div5, null);
				}

				if (each4_else) {
					each4_else.m(div5, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				var previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);
				if (current_block_type_index !== previous_block_index) {
					groupOutros();
					if_block.o(function() {
						if_blocks[previous_block_index].d(1);
						if_blocks[previous_block_index] = null;
					});

					if_block = if_blocks[current_block_type_index];
					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](component, ctx);
						if_block.c();
					}
					if_block.i(div6, text3);
				}

				if (changed.$scrumbs) {
					each0_value = ctx.$scrumbs.todo;

					for (var i = 0; i < each0_value.length; i += 1) {
						const child_ctx = get_each0_context(ctx, each0_value, i);

						if (each0_blocks[i]) {
							each0_blocks[i].p(changed, child_ctx);
						} else {
							each0_blocks[i] = create_each_block_4(component, child_ctx);
							each0_blocks[i].c();
						}
						each0_blocks[i].i(div1, null);
					}

					groupOutros();
					for (; i < each0_blocks.length; i += 1) outroBlock(i, 1);
				}

				if (each0_value.length) {
					if (each0_else) {
						each0_else.d(1);
						each0_else = null;
					}
				} else if (!each0_else) {
					each0_else = create_else_block_4(component, ctx);
					each0_else.c();
					each0_else.m(div1, null);
				}

				if (changed.$scrumbs) {
					each1_value = ctx.$scrumbs.wip;

					for (var i = 0; i < each1_value.length; i += 1) {
						const child_ctx = get_each1_context(ctx, each1_value, i);

						if (each1_blocks[i]) {
							each1_blocks[i].p(changed, child_ctx);
						} else {
							each1_blocks[i] = create_each_block_3(component, child_ctx);
							each1_blocks[i].c();
						}
						each1_blocks[i].i(div2, null);
					}

					groupOutros();
					for (; i < each1_blocks.length; i += 1) outroBlock_1(i, 1);
				}

				if (each1_value.length) {
					if (each1_else) {
						each1_else.d(1);
						each1_else = null;
					}
				} else if (!each1_else) {
					each1_else = create_else_block_3(component, ctx);
					each1_else.c();
					each1_else.m(div2, null);
				}

				if (changed.$scrumbs) {
					each2_value = ctx.$scrumbs.testing;

					for (var i = 0; i < each2_value.length; i += 1) {
						const child_ctx = get_each2_context(ctx, each2_value, i);

						if (each2_blocks[i]) {
							each2_blocks[i].p(changed, child_ctx);
						} else {
							each2_blocks[i] = create_each_block_2(component, child_ctx);
							each2_blocks[i].c();
						}
						each2_blocks[i].i(div3, null);
					}

					groupOutros();
					for (; i < each2_blocks.length; i += 1) outroBlock_2(i, 1);
				}

				if (each2_value.length) {
					if (each2_else) {
						each2_else.d(1);
						each2_else = null;
					}
				} else if (!each2_else) {
					each2_else = create_else_block_2(component, ctx);
					each2_else.c();
					each2_else.m(div3, null);
				}

				if (changed.$scrumbs) {
					each3_value = ctx.$scrumbs.done;

					for (var i = 0; i < each3_value.length; i += 1) {
						const child_ctx = get_each3_context(ctx, each3_value, i);

						if (each3_blocks[i]) {
							each3_blocks[i].p(changed, child_ctx);
						} else {
							each3_blocks[i] = create_each_block_1(component, child_ctx);
							each3_blocks[i].c();
						}
						each3_blocks[i].i(div4, null);
					}

					groupOutros();
					for (; i < each3_blocks.length; i += 1) outroBlock_3(i, 1);
				}

				if (each3_value.length) {
					if (each3_else) {
						each3_else.d(1);
						each3_else = null;
					}
				} else if (!each3_else) {
					each3_else = create_else_block_1(component, ctx);
					each3_else.c();
					each3_else.m(div4, null);
				}

				if (changed.$scrumbs) {
					each4_value = ctx.$scrumbs.unassigned;

					for (var i = 0; i < each4_value.length; i += 1) {
						const child_ctx = get_each4_context(ctx, each4_value, i);

						if (each4_blocks[i]) {
							each4_blocks[i].p(changed, child_ctx);
						} else {
							each4_blocks[i] = create_each_block$1(component, child_ctx);
							each4_blocks[i].c();
						}
						each4_blocks[i].i(div5, null);
					}

					groupOutros();
					for (; i < each4_blocks.length; i += 1) outroBlock_4(i, 1);
				}

				if (each4_value.length) {
					if (each4_else) {
						each4_else.d(1);
						each4_else = null;
					}
				} else if (!each4_else) {
					each4_else = create_else_block(component, ctx);
					each4_else.c();
					each4_else.m(div5, null);
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				outrocallback = callAfter(outrocallback, 7);

				if (buttons) buttons._fragment.o(outrocallback);

				if (if_block) if_block.o(outrocallback);
				else outrocallback();

				each0_blocks = each0_blocks.filter(Boolean);
				const countdown = callAfter(outrocallback, each0_blocks.length);
				for (let i = 0; i < each0_blocks.length; i += 1) outroBlock(i, 0, countdown);

				each1_blocks = each1_blocks.filter(Boolean);
				const countdown_1 = callAfter(outrocallback, each1_blocks.length);
				for (let i = 0; i < each1_blocks.length; i += 1) outroBlock_1(i, 0, countdown_1);

				each2_blocks = each2_blocks.filter(Boolean);
				const countdown_2 = callAfter(outrocallback, each2_blocks.length);
				for (let i = 0; i < each2_blocks.length; i += 1) outroBlock_2(i, 0, countdown_2);

				each3_blocks = each3_blocks.filter(Boolean);
				const countdown_3 = callAfter(outrocallback, each3_blocks.length);
				for (let i = 0; i < each3_blocks.length; i += 1) outroBlock_3(i, 0, countdown_3);

				each4_blocks = each4_blocks.filter(Boolean);
				const countdown_4 = callAfter(outrocallback, each4_blocks.length);
				for (let i = 0; i < each4_blocks.length; i += 1) outroBlock_4(i, 0, countdown_4);

				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div6);
				}

				buttons.destroy();
				if_blocks[current_block_type_index].d();

				destroyEach(each0_blocks, detach);

				if (each0_else) each0_else.d();

				removeListener(div1, "dragover", dragover_handler);
				removeListener(div1, "drop", drop_handler);

				destroyEach(each1_blocks, detach);

				if (each1_else) each1_else.d();

				removeListener(div2, "dragover", dragover_handler_1);
				removeListener(div2, "drop", drop_handler_1);

				destroyEach(each2_blocks, detach);

				if (each2_else) each2_else.d();

				removeListener(div3, "dragover", dragover_handler_2);
				removeListener(div3, "drop", drop_handler_2);

				destroyEach(each3_blocks, detach);

				if (each3_else) each3_else.d();

				removeListener(div4, "dragover", dragover_handler_3);
				removeListener(div4, "drop", drop_handler_3);

				destroyEach(each4_blocks, detach);

				if (each4_else) each4_else.d();

				removeListener(div5, "dragover", dragover_handler_4);
				removeListener(div5, "drop", drop_handler_4);
			}
		};
	}

	// (14:2) {:else}
	function create_else_block_5(component, ctx) {
		var div, current;

		return {
			c: function create() {
				div = createElement("div");
				div.className = "card svelte-1l27u0g";
				addLoc(div, file$4, 14, 3, 409);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				current = true;
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}
			}
		};
	}

	// (8:2) {#if $addScrumb}
	function create_if_block$1(component, ctx) {
		var div, input, text0, button0, text2, button1, div_transition, current;

		function click_handler(event) {
			component.add();
		}

		function click_handler_1(event) {
			component.store.set({ addScrumb: false });
		}

		return {
			c: function create() {
				div = createElement("div");
				input = createElement("input");
				text0 = createText("\n    ");
				button0 = createElement("button");
				button0.textContent = "Add";
				text2 = createText("\n    ");
				button1 = createElement("button");
				button1.textContent = "Close";
				setAttribute(input, "type", "text");
				input.value = "scrumb";
				input.id = "new-scrumb";
				input.className = "svelte-1l27u0g";
				addLoc(input, file$4, 9, 4, 181);
				addListener(button0, "click", click_handler);
				button0.className = "btn btn-primary";
				addLoc(button0, file$4, 10, 4, 236);
				addListener(button1, "click", click_handler_1);
				button1.className = "btn btn-primary";
				addLoc(button1, file$4, 11, 4, 302);
				div.className = "card edit svelte-1l27u0g";
				addLoc(div, file$4, 8, 2, 137);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, input);
				append(div, text0);
				append(div, button0);
				append(div, text2);
				append(div, button1);
				current = true;
			},

			i: function intro(target, anchor) {
				if (current) return;
				if (component.root._intro) {
					if (div_transition) div_transition.invalidate();

					component.root._aftercreate.push(() => {
						if (!div_transition) div_transition = wrapTransition(component, div, fade$1, {}, true);
						div_transition.run(1);
					});
				}
				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (!div_transition) div_transition = wrapTransition(component, div, fade$1, {}, false);
				div_transition.run(0, () => {
					outrocallback();
					div_transition = null;
				});

				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				removeListener(button0, "click", click_handler);
				removeListener(button1, "click", click_handler_1);
				if (detach) {
					if (div_transition) div_transition.abort();
				}
			}
		};
	}

	// (21:4) {:else}
	function create_else_block_4(component, ctx) {
		var h3;

		return {
			c: function create() {
				h3 = createElement("h3");
				h3.textContent = "No scrumb";
				setStyle(h3, "padding", "1.5rem 0 0 1.5rem");
				addLoc(h3, file$4, 21, 4, 619);
			},

			m: function mount(target, anchor) {
				insert(target, h3, anchor);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(h3);
				}
			}
		};
	}

	// (19:4) {#each $scrumbs.todo as scrumb}
	function create_each_block_4(component, ctx) {
		var current;

		var scrumb_initial_data = { scrumb: ctx.scrumb };
		var scrumb = new Scrumb({
			root: component.root,
			store: component.store,
			data: scrumb_initial_data
		});

		return {
			c: function create() {
				scrumb._fragment.c();
			},

			m: function mount(target, anchor) {
				scrumb._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var scrumb_changes = {};
				if (changed.$scrumbs) scrumb_changes.scrumb = ctx.scrumb;
				scrumb._set(scrumb_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (scrumb) scrumb._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				scrumb.destroy(detach);
			}
		};
	}

	// (30:6) {:else}
	function create_else_block_3(component, ctx) {
		var h3;

		return {
			c: function create() {
				h3 = createElement("h3");
				h3.textContent = "No scrumb";
				setStyle(h3, "padding", "1.5rem 0 0 1.5rem");
				addLoc(h3, file$4, 30, 6, 893);
			},

			m: function mount(target, anchor) {
				insert(target, h3, anchor);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(h3);
				}
			}
		};
	}

	// (28:6) {#each $scrumbs.wip as scrumb}
	function create_each_block_3(component, ctx) {
		var current;

		var scrumb_initial_data = { scrumb: ctx.scrumb };
		var scrumb = new Scrumb({
			root: component.root,
			store: component.store,
			data: scrumb_initial_data
		});

		return {
			c: function create() {
				scrumb._fragment.c();
			},

			m: function mount(target, anchor) {
				scrumb._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var scrumb_changes = {};
				if (changed.$scrumbs) scrumb_changes.scrumb = ctx.scrumb;
				scrumb._set(scrumb_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (scrumb) scrumb._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				scrumb.destroy(detach);
			}
		};
	}

	// (39:6) {:else}
	function create_else_block_2(component, ctx) {
		var h3;

		return {
			c: function create() {
				h3 = createElement("h3");
				h3.textContent = "No scrumb";
				setStyle(h3, "padding", "1.5rem 0 0 1.5rem");
				addLoc(h3, file$4, 39, 6, 1171);
			},

			m: function mount(target, anchor) {
				insert(target, h3, anchor);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(h3);
				}
			}
		};
	}

	// (37:6) {#each $scrumbs.testing as scrumb}
	function create_each_block_2(component, ctx) {
		var current;

		var scrumb_initial_data = { scrumb: ctx.scrumb };
		var scrumb = new Scrumb({
			root: component.root,
			store: component.store,
			data: scrumb_initial_data
		});

		return {
			c: function create() {
				scrumb._fragment.c();
			},

			m: function mount(target, anchor) {
				scrumb._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var scrumb_changes = {};
				if (changed.$scrumbs) scrumb_changes.scrumb = ctx.scrumb;
				scrumb._set(scrumb_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (scrumb) scrumb._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				scrumb.destroy(detach);
			}
		};
	}

	// (48:6) {:else}
	function create_else_block_1(component, ctx) {
		var h3;

		return {
			c: function create() {
				h3 = createElement("h3");
				h3.textContent = "No scrumb";
				setStyle(h3, "padding", "1.5rem 0 0 1.5rem");
				addLoc(h3, file$4, 48, 6, 1437);
			},

			m: function mount(target, anchor) {
				insert(target, h3, anchor);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(h3);
				}
			}
		};
	}

	// (46:6) {#each $scrumbs.done as scrumb}
	function create_each_block_1(component, ctx) {
		var current;

		var scrumb_initial_data = { scrumb: ctx.scrumb };
		var scrumb = new Scrumb({
			root: component.root,
			store: component.store,
			data: scrumb_initial_data
		});

		return {
			c: function create() {
				scrumb._fragment.c();
			},

			m: function mount(target, anchor) {
				scrumb._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var scrumb_changes = {};
				if (changed.$scrumbs) scrumb_changes.scrumb = ctx.scrumb;
				scrumb._set(scrumb_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (scrumb) scrumb._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				scrumb.destroy(detach);
			}
		};
	}

	// (57:6) {:else}
	function create_else_block(component, ctx) {
		var h3;

		return {
			c: function create() {
				h3 = createElement("h3");
				h3.textContent = "No scrumb";
				setStyle(h3, "padding", "1.5rem 0 0 1.5rem");
				addLoc(h3, file$4, 57, 6, 1727);
			},

			m: function mount(target, anchor) {
				insert(target, h3, anchor);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(h3);
				}
			}
		};
	}

	// (55:6) {#each $scrumbs.unassigned as scrumb}
	function create_each_block$1(component, ctx) {
		var current;

		var scrumb_initial_data = { scrumb: ctx.scrumb };
		var scrumb = new Scrumb({
			root: component.root,
			store: component.store,
			data: scrumb_initial_data
		});

		return {
			c: function create() {
				scrumb._fragment.c();
			},

			m: function mount(target, anchor) {
				scrumb._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var scrumb_changes = {};
				if (changed.$scrumbs) scrumb_changes.scrumb = ctx.scrumb;
				scrumb._set(scrumb_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (scrumb) scrumb._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				scrumb.destroy(detach);
			}
		};
	}

	function ScrumbDashboard(options) {
		this._debugName = '<ScrumbDashboard>';
		if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
		init(this, options);
		this._state = assign(assign(this.store._init(["addScrumb","scrumbs"]), data$1()), options.data);
		this.store._add(this, ["addScrumb","scrumbs"]);
		if (!('$addScrumb' in this._state)) console.warn("<ScrumbDashboard> was created without expected data property '$addScrumb'");
		if (!('$scrumbs' in this._state)) console.warn("<ScrumbDashboard> was created without expected data property '$scrumbs'");
		this._intro = !!options.intro;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$4(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(ScrumbDashboard.prototype, protoDev);
	assign(ScrumbDashboard.prototype, methods$2);

	ScrumbDashboard.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\pages\Notfound.html generated by Svelte v2.14.3 */

	const file$5 = "src\\pages\\Notfound.html";

	function create_main_fragment$5(component, ctx) {
		var h1, current;

		return {
			c: function create() {
				h1 = createElement("h1");
				h1.textContent = "Page dosen't exist, please back to a valid route";
				addLoc(h1, file$5, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, h1, anchor);
				current = true;
			},

			p: noop,

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(h1);
				}
			}
		};
	}

	function Notfound(options) {
		this._debugName = '<Notfound>';
		if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
		init(this, options);
		this._state = assign({}, options.data);
		this._intro = !!options.intro;

		this._fragment = create_main_fragment$5(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}

		this._intro = true;
	}

	assign(Notfound.prototype, protoDev);

	Notfound.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\App.html generated by Svelte v2.14.3 */

	function Router({ $page }) {
	  switch($page) {
	    case 'scrumb-dashboard':
	      return ScrumbDashboard;
	    default:
	     return Notfound;
	  }
	}

	const file$6 = "src\\App.html";

	function create_main_fragment$6(component, ctx) {
		var text, main, current;

		var sidenav = new Sidenav({
			root: component.root,
			store: component.store
		});

		var switch_value = ctx.Router;

		function switch_props(ctx) {
			return {
				root: component.root,
				store: component.store
			};
		}

		if (switch_value) {
			var switch_instance = new switch_value(switch_props(ctx));
		}

		return {
			c: function create() {
				sidenav._fragment.c();
				text = createText("\n");
				main = createElement("main");
				if (switch_instance) switch_instance._fragment.c();
				addLoc(main, file$6, 1, 0, 12);
			},

			m: function mount(target, anchor) {
				sidenav._mount(target, anchor);
				insert(target, text, anchor);
				insert(target, main, anchor);

				if (switch_instance) {
					switch_instance._mount(main, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (switch_value !== (switch_value = ctx.Router)) {
					if (switch_instance) {
						groupOutros();
						const old_component = switch_instance;
						old_component._fragment.o(() => {
							old_component.destroy();
						});
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));
						switch_instance._fragment.c();
						switch_instance._mount(main, null);
					} else {
						switch_instance = null;
					}
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				outrocallback = callAfter(outrocallback, 2);

				if (sidenav) sidenav._fragment.o(outrocallback);
				if (switch_instance) switch_instance._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				sidenav.destroy(detach);
				if (detach) {
					detachNode(text);
					detachNode(main);
				}

				if (switch_instance) switch_instance.destroy();
			}
		};
	}

	function App(options) {
		this._debugName = '<App>';
		if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
		init(this, options);
		this._state = assign(this.store._init(["page"]), options.data);
		this.store._add(this, ["page"]);
		this._recompute({ $page: 1 }, this._state);
		if (!('$page' in this._state)) console.warn("<App> was created without expected data property '$page'");
		this._intro = !!options.intro;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$6(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(App.prototype, protoDev);

	App.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('Router' in newState && !this._updatingReadonlyProperty) throw new Error("<App>: Cannot set read-only property 'Router'");
	};

	App.prototype._recompute = function _recompute(changed, state) {
		if (changed.$page) {
			if (this._differs(state.Router, (state.Router = Router(state)))) changed.Router = true;
		}
	};

	function Store(state, options) {
		this._handlers = {};
		this._dependents = [];

		this._computed = blankObject();
		this._sortedComputedProperties = [];

		this._state = assign({}, state);
		this._differs = options && options.immutable ? _differsImmutable : _differs;
	}

	assign(Store.prototype, {
		_add(component, props) {
			this._dependents.push({
				component: component,
				props: props
			});
		},

		_init(props) {
			const state = {};
			for (let i = 0; i < props.length; i += 1) {
				const prop = props[i];
				state['$' + prop] = this._state[prop];
			}
			return state;
		},

		_remove(component) {
			let i = this._dependents.length;
			while (i--) {
				if (this._dependents[i].component === component) {
					this._dependents.splice(i, 1);
					return;
				}
			}
		},

		_set(newState, changed) {
			const previous = this._state;
			this._state = assign(assign({}, previous), newState);

			for (let i = 0; i < this._sortedComputedProperties.length; i += 1) {
				this._sortedComputedProperties[i].update(this._state, changed);
			}

			this.fire('state', {
				changed,
				previous,
				current: this._state
			});

			this._dependents
				.filter(dependent => {
					const componentState = {};
					let dirty = false;

					for (let j = 0; j < dependent.props.length; j += 1) {
						const prop = dependent.props[j];
						if (prop in changed) {
							componentState['$' + prop] = this._state[prop];
							dirty = true;
						}
					}

					if (dirty) {
						dependent.component._stage(componentState);
						return true;
					}
				})
				.forEach(dependent => {
					dependent.component.set({});
				});

			this.fire('update', {
				changed,
				previous,
				current: this._state
			});
		},

		_sortComputedProperties() {
			const computed = this._computed;
			const sorted = this._sortedComputedProperties = [];
			const visited = blankObject();
			let currentKey;

			function visit(key) {
				const c = computed[key];

				if (c) {
					c.deps.forEach(dep => {
						if (dep === currentKey) {
							throw new Error(`Cyclical dependency detected between ${dep} <-> ${key}`);
						}

						visit(dep);
					});

					if (!visited[key]) {
						visited[key] = true;
						sorted.push(c);
					}
				}
			}

			for (const key in this._computed) {
				visit(currentKey = key);
			}
		},

		compute(key, deps, fn) {
			let value;

			const c = {
				deps,
				update: (state, changed, dirty) => {
					const values = deps.map(dep => {
						if (dep in changed) dirty = true;
						return state[dep];
					});

					if (dirty) {
						const newValue = fn.apply(null, values);
						if (this._differs(newValue, value)) {
							value = newValue;
							changed[key] = true;
							state[key] = value;
						}
					}
				}
			};

			this._computed[key] = c;
			this._sortComputedProperties();

			const state = assign({}, this._state);
			const changed = {};
			c.update(state, changed, true);
			this._set(state, changed);
		},

		fire,

		get,

		on,

		set(newState) {
			const oldState = this._state;
			const changed = this._changed = {};
			let dirty = false;

			for (const key in newState) {
				if (this._computed[key]) throw new Error(`'${key}' is a read-only computed property`);
				if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
			}
			if (!dirty) return;

			this._set(newState, changed);
		}
	});

	/** Service Worker */
	if (window.navigator.serviceWorker) {
	  window.navigator.serviceWorker.register('sw.js');
	}

	/** State Management */
	/*** set up */
	const store = new Store({
	  name: 'Web Application',
	  page: 'homepage',
	  addScrumb: false,
	  scrumbs: localStorage.getItem('scrumbs')
	  ? JSON.parse(localStorage.getItem('scrumbs'))
	  : {todo: [], wip: [], testing: [], done: [], unassigned: []},
	  draggedScrumb: {}
	});
	/*** handling */
	store.on('state', ({changed, current}) => {
	  /**** Routing event */
	  if (changed.page) location.hash = `#${current.page}`;
	  /**** localStorage on scrumbs */
	  if (changed.scrumbs) localStorage.setItem('scrumbs', JSON.stringify(current.scrumbs));
	});

	/** Routing */
	/*** on create */
	location.hash.indexOf('#') < 0
	? location.hash = '#scrumb-dashboard'
	: store.set({
	  page: location.hash === '' || location.hash.substr(1) === '' ? 'scrumb-dashboard' : location.hash.substr(1)
	});
	/*** location on state  */
	window.onhashchange = () => {
	  if (store.get().page !== location.hash.substr(1)) store.set({page: location.hash.substr(1)});
	};

	/** Rendering */
	const app = new App({
		target: document.body.querySelector('#nwa'),
	  store
	});

	/** Debugging */
	window.store = store;

	return app;

}());
//# sourceMappingURL=bundle.js.map
