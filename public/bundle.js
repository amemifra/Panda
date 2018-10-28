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
			component.store.set({page: 'scrumb'});
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
				addLoc(h4, file$1, 10, 6, 213);
				addListener(li, "click", click_handler);
				li.className = "svelte-mvlw3v";
				toggleClass(li, "active", ctx.$page === 'scrumb');
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
					toggleClass(li, "active", ctx.$page === 'scrumb');
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

	/* src\pages\Scrumb.html generated by Svelte v2.14.3 */

	function data() {
	  return {
	    addScrumb: false
	  }
	}
	var methods = {
	  add() {
	    const scrumbs = this.store.get()['scrumbs'];
	    this.store.set({scrumbs: [...scrumbs, document.querySelector('#new-scrumb').value]});
	    this.set({ addScrumb: false });
	    console.log('add');
	  },
	  close() {
	    this.set({ addScrumb: false });
	  },
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
	    const inputElement = document.querySelector('#input-data');
	    const reader = event => {
	      const fr = new FileReader();
	      fr.readAsText(event.target.files[0]);
	      setTimeout(
	      () => {
	        this.store.set({scrumbs: JSON.parse(fr.result)['scrumbs']});
	        cleanListener(document.querySelector('#input-data'));
	        }
	      , 10);
	    };
	    const cleanListener = target => {
	      target.removeEventListener('change', reader);
	    };
	    inputElement.addEventListener('change', reader);
	    inputElement.click();
	  }
	};

	const file$2 = "src\\pages\\Scrumb.html";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.scrumb = list[i];
		child_ctx.each_value = list;
		child_ctx.scrumb_index = i;
		return child_ctx;
	}

	function create_main_fragment$2(component, ctx) {
		var h1, text1, div2, div0, button0, text3, button1, text5, button2, text7, input, text8, div1, text9, current;

		function click_handler(event) {
			component.set({addScrumb: true});
		}

		function click_handler_1(event) {
			component.exportData();
		}

		function click_handler_2(event) {
			component.importData();
		}

		var if_block = (ctx.addScrumb) && create_if_block(component, ctx);

		var each_value = ctx.$scrumbs;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(component, get_each_context(ctx, each_value, i));
		}

		var each_else = null;

		if (!each_value.length) {
			each_else = create_else_block(component, ctx);
			each_else.c();
		}

		return {
			c: function create() {
				h1 = createElement("h1");
				h1.textContent = "Scrumb";
				text1 = createText("\n\n");
				div2 = createElement("div");
				div0 = createElement("div");
				button0 = createElement("button");
				button0.textContent = "Aggiungi";
				text3 = createText("\n    ");
				button1 = createElement("button");
				button1.textContent = "Export";
				text5 = createText("\n    ");
				button2 = createElement("button");
				button2.textContent = "Import";
				text7 = createText("\n    ");
				input = createElement("input");
				text8 = createText("\n  ");
				div1 = createElement("div");
				if (if_block) if_block.c();
				text9 = createText("\n    ");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				addLoc(h1, file$2, 0, 0, 0);
				addListener(button0, "click", click_handler);
				button0.className = "btn btn-primary";
				addLoc(button0, file$2, 4, 4, 67);
				addListener(button1, "click", click_handler_1);
				button1.className = "btn btn-primary";
				addLoc(button1, file$2, 5, 4, 155);
				addListener(button2, "click", click_handler_2);
				button2.className = "btn btn-primary";
				addLoc(button2, file$2, 6, 4, 231);
				setAttribute(input, "type", "file");
				setStyle(input, "display", "none");
				input.id = "input-data";
				addLoc(input, file$2, 7, 4, 307);
				div0.className = "buttons svelte-1a5zfz7";
				addLoc(div0, file$2, 3, 2, 41);
				div1.className = "blackboard svelte-1a5zfz7";
				addLoc(div1, file$2, 9, 2, 377);
				div2.className = "content svelte-1a5zfz7";
				addLoc(div2, file$2, 2, 0, 17);
			},

			m: function mount(target, anchor) {
				insert(target, h1, anchor);
				insert(target, text1, anchor);
				insert(target, div2, anchor);
				append(div2, div0);
				append(div0, button0);
				append(div0, text3);
				append(div0, button1);
				append(div0, text5);
				append(div0, button2);
				append(div0, text7);
				append(div0, input);
				append(div2, text8);
				append(div2, div1);
				if (if_block) if_block.m(div1, null);
				append(div1, text9);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div1, null);
				}

				if (each_else) {
					each_else.m(div1, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (ctx.addScrumb) {
					if (!if_block) {
						if_block = create_if_block(component, ctx);
						if_block.c();
						if_block.m(div1, text9);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (changed.$scrumbs) {
					each_value = ctx.$scrumbs;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div1, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}

				if (each_value.length) {
					if (each_else) {
						each_else.d(1);
						each_else = null;
					}
				} else if (!each_else) {
					each_else = create_else_block(component, ctx);
					each_else.c();
					each_else.m(div1, null);
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(h1);
					detachNode(text1);
					detachNode(div2);
				}

				removeListener(button0, "click", click_handler);
				removeListener(button1, "click", click_handler_1);
				removeListener(button2, "click", click_handler_2);
				if (if_block) if_block.d();

				destroyEach(each_blocks, detach);

				if (each_else) each_else.d();
			}
		};
	}

	// (11:4) {#if addScrumb}
	function create_if_block(component, ctx) {
		var div, input, text0, button0, text2, button1;

		function click_handler(event) {
			component.add();
		}

		function click_handler_1(event) {
			component.close();
		}

		return {
			c: function create() {
				div = createElement("div");
				input = createElement("input");
				text0 = createText("\n      ");
				button0 = createElement("button");
				button0.textContent = "Add";
				text2 = createText("\n      ");
				button1 = createElement("button");
				button1.textContent = "Close";
				input.className = "easeIn svelte-1a5zfz7";
				setAttribute(input, "type", "text");
				input.value = "scrumb";
				input.id = "new-scrumb";
				addLoc(input, file$2, 12, 6, 451);
				addListener(button0, "click", click_handler);
				button0.className = "btn btn-primary easeIn svelte-1a5zfz7";
				addLoc(button0, file$2, 13, 6, 523);
				addListener(button1, "click", click_handler_1);
				button1.className = "btn btn-primary easeIn svelte-1a5zfz7";
				addLoc(button1, file$2, 14, 6, 598);
				div.className = "card svelte-1a5zfz7";
				addLoc(div, file$2, 11, 4, 426);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, input);
				append(div, text0);
				append(div, button0);
				append(div, text2);
				append(div, button1);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				removeListener(button0, "click", click_handler);
				removeListener(button1, "click", click_handler_1);
			}
		};
	}

	// (20:4) {:else}
	function create_else_block(component, ctx) {
		var h3;

		return {
			c: function create() {
				h3 = createElement("h3");
				h3.textContent = "No scrumb";
				setStyle(h3, "padding", "1.5rem 0 0 1.5rem");
				addLoc(h3, file$2, 20, 4, 778);
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

	// (18:4) {#each $scrumbs as scrumb}
	function create_each_block(component, ctx) {
		var div, text_value = ctx.scrumb, text;

		return {
			c: function create() {
				div = createElement("div");
				text = createText(text_value);
				div.className = "scrumb svelte-1a5zfz7";
				addLoc(div, file$2, 18, 4, 727);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, text);
			},

			p: function update(changed, ctx) {
				if ((changed.$scrumbs) && text_value !== (text_value = ctx.scrumb)) {
					setData(text, text_value);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}
			}
		};
	}

	function Scrumb(options) {
		this._debugName = '<Scrumb>';
		if (!options || (!options.target && !options.root)) throw new Error("'target' is a required option");
		init(this, options);
		this._state = assign(assign(this.store._init(["scrumbs"]), data()), options.data);
		this.store._add(this, ["scrumbs"]);
		if (!('addScrumb' in this._state)) console.warn("<Scrumb> was created without expected data property 'addScrumb'");
		if (!('$scrumbs' in this._state)) console.warn("<Scrumb> was created without expected data property '$scrumbs'");
		this._intro = !!options.intro;

		this._handlers.destroy = [removeFromStore];

		this._fragment = create_main_fragment$2(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}

		this._intro = true;
	}

	assign(Scrumb.prototype, protoDev);
	assign(Scrumb.prototype, methods);

	Scrumb.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src\pages\Notfound.html generated by Svelte v2.14.3 */

	const file$3 = "src\\pages\\Notfound.html";

	function create_main_fragment$3(component, ctx) {
		var h1, current;

		return {
			c: function create() {
				h1 = createElement("h1");
				h1.textContent = "Page dosen't exist, please back to a valid route";
				addLoc(h1, file$3, 0, 0, 0);
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

		this._fragment = create_main_fragment$3(this, this._state);

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
	    case 'scrumb':
	      return Scrumb;
	    default:
	     return Notfound;
	  }
	}

	const file$4 = "src\\App.html";

	function create_main_fragment$4(component, ctx) {
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
				addLoc(main, file$4, 1, 0, 12);
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

		this._fragment = create_main_fragment$4(this, this._state);

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
	  scrumbs: []
	});
	/*** handling */
	store.on('state', ({changed, current}) => {
	  /**** Routing event */
	  if (changed.page) location.hash = `#${current.page}`;
	});

	/** Routing */
	/*** on create */
	location.hash.indexOf('#') < 0
	? location.hash = '#scrumb'
	: store.set({
	  page: location.hash === '' || location.hash.substr(1) === '' ? 'scrumb' : location.hash.substr(1)
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
