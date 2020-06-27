
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var header = {
    	about: "關於我們",
    	"case": "案例",
    	team: "陣容",
    	charges: "計費方式",
    	contractOut: "開始發包"
    };
    var about = {
    	title: "關於我們",
    	first: "我們了解你對中高階網頁開發的需求，害怕當你發包出去的案子得不到一個高維護性的 code 回來，錢又花出去了，與其交給不確定的廠商，不如交給我們。",
    	second: "別擔心，我們專做網頁開發，專業且細心，從設計到前端、後端API、資料庫到部署都能承接，不但能滿足你畫面上的需要，也能夠給你一個好做後續維護的 code。"
    };
    var tw = {
    	header: header,
    	about: about,
    	"case": {
    	title: "我們的案例"
    }
    };

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var formatMessageParse = createCommonjsModule(function (module, exports) {

    /*::
    export type AST = Element[]
    export type Element = string | Placeholder
    export type Placeholder = Plural | Styled | Typed | Simple
    export type Plural = [ string, 'plural' | 'selectordinal', number, SubMessages ]
    export type Styled = [ string, string, string | SubMessages ]
    export type Typed = [ string, string ]
    export type Simple = [ string ]
    export type SubMessages = { [string]: AST }
    export type Token = [ TokenType, string ]
    export type TokenType = 'text' | 'space' | 'id' | 'type' | 'style' | 'offset' | 'number' | 'selector' | 'syntax'
    type Context = {|
      pattern: string,
      index: number,
      tagsType: ?string,
      tokens: ?Token[]
    |}
    */

    var ARG_OPN = '{';
    var ARG_CLS = '}';
    var ARG_SEP = ',';
    var NUM_ARG = '#';
    var TAG_OPN = '<';
    var TAG_CLS = '>';
    var TAG_END = '</';
    var TAG_SELF_CLS = '/>';
    var ESC = '\'';
    var OFFSET = 'offset:';
    var simpleTypes = [
      'number',
      'date',
      'time',
      'ordinal',
      'duration',
      'spellout'
    ];
    var submTypes = [
      'plural',
      'select',
      'selectordinal'
    ];

    /**
     * parse
     *
     * Turns this:
     *  `You have { numBananas, plural,
     *       =0 {no bananas}
     *      one {a banana}
     *    other {# bananas}
     *  } for sale`
     *
     * into this:
     *  [ "You have ", [ "numBananas", "plural", 0, {
     *       "=0": [ "no bananas" ],
     *      "one": [ "a banana" ],
     *    "other": [ [ '#' ], " bananas" ]
     *  } ], " for sale." ]
     *
     * tokens:
     *  [
     *    [ "text", "You have " ],
     *    [ "syntax", "{" ],
     *    [ "space", " " ],
     *    [ "id", "numBananas" ],
     *    [ "syntax", ", " ],
     *    [ "space", " " ],
     *    [ "type", "plural" ],
     *    [ "syntax", "," ],
     *    [ "space", "\n     " ],
     *    [ "selector", "=0" ],
     *    [ "space", " " ],
     *    [ "syntax", "{" ],
     *    [ "text", "no bananas" ],
     *    [ "syntax", "}" ],
     *    [ "space", "\n    " ],
     *    [ "selector", "one" ],
     *    [ "space", " " ],
     *    [ "syntax", "{" ],
     *    [ "text", "a banana" ],
     *    [ "syntax", "}" ],
     *    [ "space", "\n  " ],
     *    [ "selector", "other" ],
     *    [ "space", " " ],
     *    [ "syntax", "{" ],
     *    [ "syntax", "#" ],
     *    [ "text", " bananas" ],
     *    [ "syntax", "}" ],
     *    [ "space", "\n" ],
     *    [ "syntax", "}" ],
     *    [ "text", " for sale." ]
     *  ]
     **/
    exports = module.exports = function parse (
      pattern/*: string */,
      options/*:: ?: { tagsType?: string, tokens?: Token[] } */
    )/*: AST */ {
      return parseAST({
        pattern: String(pattern),
        index: 0,
        tagsType: (options && options.tagsType) || null,
        tokens: (options && options.tokens) || null
      }, '')
    };

    function parseAST (current/*: Context */, parentType/*: string */)/*: AST */ {
      var pattern = current.pattern;
      var length = pattern.length;
      var elements/*: AST */ = [];
      var start = current.index;
      var text = parseText(current, parentType);
      if (text) elements.push(text);
      if (text && current.tokens) current.tokens.push([ 'text', pattern.slice(start, current.index) ]);
      while (current.index < length) {
        if (pattern[current.index] === ARG_CLS) {
          if (!parentType) throw expected(current)
          break
        }
        if (parentType && current.tagsType && pattern.slice(current.index, current.index + TAG_END.length) === TAG_END) break
        elements.push(parsePlaceholder(current));
        start = current.index;
        text = parseText(current, parentType);
        if (text) elements.push(text);
        if (text && current.tokens) current.tokens.push([ 'text', pattern.slice(start, current.index) ]);
      }
      return elements
    }

    function parseText (current/*: Context */, parentType/*: string */)/*: string */ {
      var pattern = current.pattern;
      var length = pattern.length;
      var isHashSpecial = (parentType === 'plural' || parentType === 'selectordinal');
      var isAngleSpecial = !!current.tagsType;
      var isArgStyle = (parentType === '{style}');
      var text = '';
      while (current.index < length) {
        var char = pattern[current.index];
        if (
          char === ARG_OPN || char === ARG_CLS ||
          (isHashSpecial && char === NUM_ARG) ||
          (isAngleSpecial && char === TAG_OPN) ||
          (isArgStyle && isWhitespace(char.charCodeAt(0)))
        ) {
          break
        } else if (char === ESC) {
          char = pattern[++current.index];
          if (char === ESC) { // double is always 1 '
            text += char;
            ++current.index;
          } else if (
            // only when necessary
            char === ARG_OPN || char === ARG_CLS ||
            (isHashSpecial && char === NUM_ARG) ||
            (isAngleSpecial && char === TAG_OPN) ||
            isArgStyle
          ) {
            text += char;
            while (++current.index < length) {
              char = pattern[current.index];
              if (char === ESC && pattern[current.index + 1] === ESC) { // double is always 1 '
                text += ESC;
                ++current.index;
              } else if (char === ESC) { // end of quoted
                ++current.index;
                break
              } else {
                text += char;
              }
            }
          } else { // lone ' is just a '
            text += ESC;
            // already incremented
          }
        } else {
          text += char;
          ++current.index;
        }
      }
      return text
    }

    function isWhitespace (code/*: number */)/*: boolean */ {
      return (
        (code >= 0x09 && code <= 0x0D) ||
        code === 0x20 || code === 0x85 || code === 0xA0 || code === 0x180E ||
        (code >= 0x2000 && code <= 0x200D) ||
        code === 0x2028 || code === 0x2029 || code === 0x202F || code === 0x205F ||
        code === 0x2060 || code === 0x3000 || code === 0xFEFF
      )
    }

    function skipWhitespace (current/*: Context */)/*: void */ {
      var pattern = current.pattern;
      var length = pattern.length;
      var start = current.index;
      while (current.index < length && isWhitespace(pattern.charCodeAt(current.index))) {
        ++current.index;
      }
      if (start < current.index && current.tokens) {
        current.tokens.push([ 'space', current.pattern.slice(start, current.index) ]);
      }
    }

    function parsePlaceholder (current/*: Context */)/*: Placeholder */ {
      var pattern = current.pattern;
      if (pattern[current.index] === NUM_ARG) {
        if (current.tokens) current.tokens.push([ 'syntax', NUM_ARG ]);
        ++current.index; // move passed #
        return [ NUM_ARG ]
      }

      var tag = parseTag(current);
      if (tag) return tag

      /* istanbul ignore if should be unreachable if parseAST and parseText are right */
      if (pattern[current.index] !== ARG_OPN) throw expected(current, ARG_OPN)
      if (current.tokens) current.tokens.push([ 'syntax', ARG_OPN ]);
      ++current.index; // move passed {
      skipWhitespace(current);

      var id = parseId(current);
      if (!id) throw expected(current, 'placeholder id')
      if (current.tokens) current.tokens.push([ 'id', id ]);
      skipWhitespace(current);

      var char = pattern[current.index];
      if (char === ARG_CLS) { // end placeholder
        if (current.tokens) current.tokens.push([ 'syntax', ARG_CLS ]);
        ++current.index; // move passed }
        return [ id ]
      }

      if (char !== ARG_SEP) throw expected(current, ARG_SEP + ' or ' + ARG_CLS)
      if (current.tokens) current.tokens.push([ 'syntax', ARG_SEP ]);
      ++current.index; // move passed ,
      skipWhitespace(current);

      var type = parseId(current);
      if (!type) throw expected(current, 'placeholder type')
      if (current.tokens) current.tokens.push([ 'type', type ]);
      skipWhitespace(current);
      char = pattern[current.index];
      if (char === ARG_CLS) { // end placeholder
        if (current.tokens) current.tokens.push([ 'syntax', ARG_CLS ]);
        if (type === 'plural' || type === 'selectordinal' || type === 'select') {
          throw expected(current, type + ' sub-messages')
        }
        ++current.index; // move passed }
        return [ id, type ]
      }

      if (char !== ARG_SEP) throw expected(current, ARG_SEP + ' or ' + ARG_CLS)
      if (current.tokens) current.tokens.push([ 'syntax', ARG_SEP ]);
      ++current.index; // move passed ,
      skipWhitespace(current);

      var arg;
      if (type === 'plural' || type === 'selectordinal') {
        var offset = parsePluralOffset(current);
        skipWhitespace(current);
        arg = [ id, type, offset, parseSubMessages(current, type) ];
      } else if (type === 'select') {
        arg = [ id, type, parseSubMessages(current, type) ];
      } else if (simpleTypes.indexOf(type) >= 0) {
        arg = [ id, type, parseSimpleFormat(current) ];
      } else { // custom placeholder type
        var index = current.index;
        var format/*: string | SubMessages */ = parseSimpleFormat(current);
        skipWhitespace(current);
        if (pattern[current.index] === ARG_OPN) {
          current.index = index; // rewind, since should have been submessages
          format = parseSubMessages(current, type);
        }
        arg = [ id, type, format ];
      }

      skipWhitespace(current);
      if (pattern[current.index] !== ARG_CLS) throw expected(current, ARG_CLS)
      if (current.tokens) current.tokens.push([ 'syntax', ARG_CLS ]);
      ++current.index; // move passed }
      return arg
    }

    function parseTag (current/*: Context */)/*: ?Placeholder */ {
      var tagsType = current.tagsType;
      if (!tagsType || current.pattern[current.index] !== TAG_OPN) return

      if (current.pattern.slice(current.index, current.index + TAG_END.length) === TAG_END) {
        throw expected(current, null, 'closing tag without matching opening tag')
      }
      if (current.tokens) current.tokens.push([ 'syntax', TAG_OPN ]);
      ++current.index; // move passed <

      var id = parseId(current, true);
      if (!id) throw expected(current, 'placeholder id')
      if (current.tokens) current.tokens.push([ 'id', id ]);
      skipWhitespace(current);

      if (current.pattern.slice(current.index, current.index + TAG_SELF_CLS.length) === TAG_SELF_CLS) {
        if (current.tokens) current.tokens.push([ 'syntax', TAG_SELF_CLS ]);
        current.index += TAG_SELF_CLS.length;
        return [ id, tagsType ]
      }
      if (current.pattern[current.index] !== TAG_CLS) throw expected(current, TAG_CLS)
      if (current.tokens) current.tokens.push([ 'syntax', TAG_CLS ]);
      ++current.index; // move passed >

      var children = parseAST(current, tagsType);

      var end = current.index;
      if (current.pattern.slice(current.index, current.index + TAG_END.length) !== TAG_END) throw expected(current, TAG_END + id + TAG_CLS)
      if (current.tokens) current.tokens.push([ 'syntax', TAG_END ]);
      current.index += TAG_END.length;
      var closeId = parseId(current, true);
      if (closeId && current.tokens) current.tokens.push([ 'id', closeId ]);
      if (id !== closeId) {
        current.index = end; // rewind for better error message
        throw expected(current, TAG_END + id + TAG_CLS, TAG_END + closeId + TAG_CLS)
      }
      skipWhitespace(current);
      if (current.pattern[current.index] !== TAG_CLS) throw expected(current, TAG_CLS)
      if (current.tokens) current.tokens.push([ 'syntax', TAG_CLS ]);
      ++current.index; // move passed >

      return [ id, tagsType, { children: children } ]
    }

    function parseId (current/*: Context */, isTag/*:: ?: boolean */)/*: string */ {
      var pattern = current.pattern;
      var length = pattern.length;
      var id = '';
      while (current.index < length) {
        var char = pattern[current.index];
        if (
          char === ARG_OPN || char === ARG_CLS || char === ARG_SEP ||
          char === NUM_ARG || char === ESC || isWhitespace(char.charCodeAt(0)) ||
          (isTag && (char === TAG_OPN || char === TAG_CLS || char === '/'))
        ) break
        id += char;
        ++current.index;
      }
      return id
    }

    function parseSimpleFormat (current/*: Context */)/*: string */ {
      var start = current.index;
      var style = parseText(current, '{style}');
      if (!style) throw expected(current, 'placeholder style name')
      if (current.tokens) current.tokens.push([ 'style', current.pattern.slice(start, current.index) ]);
      return style
    }

    function parsePluralOffset (current/*: Context */)/*: number */ {
      var pattern = current.pattern;
      var length = pattern.length;
      var offset = 0;
      if (pattern.slice(current.index, current.index + OFFSET.length) === OFFSET) {
        if (current.tokens) current.tokens.push([ 'offset', 'offset' ], [ 'syntax', ':' ]);
        current.index += OFFSET.length; // move passed offset:
        skipWhitespace(current);
        var start = current.index;
        while (current.index < length && isDigit(pattern.charCodeAt(current.index))) {
          ++current.index;
        }
        if (start === current.index) throw expected(current, 'offset number')
        if (current.tokens) current.tokens.push([ 'number', pattern.slice(start, current.index) ]);
        offset = +pattern.slice(start, current.index);
      }
      return offset
    }

    function isDigit (code/*: number */)/*: boolean */ {
      return (code >= 0x30 && code <= 0x39)
    }

    function parseSubMessages (current/*: Context */, parentType/*: string */)/*: SubMessages */ {
      var pattern = current.pattern;
      var length = pattern.length;
      var options/*: SubMessages */ = {};
      while (current.index < length && pattern[current.index] !== ARG_CLS) {
        var selector = parseId(current);
        if (!selector) throw expected(current, 'sub-message selector')
        if (current.tokens) current.tokens.push([ 'selector', selector ]);
        skipWhitespace(current);
        options[selector] = parseSubMessage(current, parentType);
        skipWhitespace(current);
      }
      if (!options.other && submTypes.indexOf(parentType) >= 0) {
        throw expected(current, null, null, '"other" sub-message must be specified in ' + parentType)
      }
      return options
    }

    function parseSubMessage (current/*: Context */, parentType/*: string */)/*: AST */ {
      if (current.pattern[current.index] !== ARG_OPN) throw expected(current, ARG_OPN + ' to start sub-message')
      if (current.tokens) current.tokens.push([ 'syntax', ARG_OPN ]);
      ++current.index; // move passed {
      var message = parseAST(current, parentType);
      if (current.pattern[current.index] !== ARG_CLS) throw expected(current, ARG_CLS + ' to end sub-message')
      if (current.tokens) current.tokens.push([ 'syntax', ARG_CLS ]);
      ++current.index; // move passed }
      return message
    }

    function expected (current/*: Context */, expected/*:: ?: ?string */, found/*:: ?: ?string */, message/*:: ?: string */) {
      var pattern = current.pattern;
      var lines = pattern.slice(0, current.index).split(/\r?\n/);
      var offset = current.index;
      var line = lines.length;
      var column = lines.slice(-1)[0].length;
      found = found || (
        (current.index >= pattern.length) ? 'end of message pattern'
          : (parseId(current) || pattern[current.index])
      );
      if (!message) message = errorMessage(expected, found);
      message += ' in ' + pattern.replace(/\r?\n/g, '\n');
      return new SyntaxError(message, expected, found, offset, line, column)
    }

    function errorMessage (expected/*: ?string */, found/* string */) {
      if (!expected) return 'Unexpected ' + found + ' found'
      return 'Expected ' + expected + ' but found ' + found
    }

    /**
     * SyntaxError
     *  Holds information about bad syntax found in a message pattern
     **/
    function SyntaxError (message/*: string */, expected/*: ?string */, found/*: ?string */, offset/*: number */, line/*: number */, column/*: number */) {
      Error.call(this, message);
      this.name = 'SyntaxError';
      this.message = message;
      this.expected = expected;
      this.found = found;
      this.offset = offset;
      this.line = line;
      this.column = column;
    }
    SyntaxError.prototype = Object.create(Error.prototype);
    exports.SyntaxError = SyntaxError;
    });
    var formatMessageParse_1 = formatMessageParse.SyntaxError;

    // @flow
    var LONG = 'long';
    var SHORT = 'short';
    var NARROW = 'narrow';
    var NUMERIC = 'numeric';
    var TWODIGIT = '2-digit';

    /**
     * formatting information
     **/
    var formatMessageFormats = {
      number: {
        decimal: {
          style: 'decimal'
        },
        integer: {
          style: 'decimal',
          maximumFractionDigits: 0
        },
        currency: {
          style: 'currency',
          currency: 'USD'
        },
        percent: {
          style: 'percent'
        },
        default: {
          style: 'decimal'
        }
      },
      date: {
        short: {
          month: NUMERIC,
          day: NUMERIC,
          year: TWODIGIT
        },
        medium: {
          month: SHORT,
          day: NUMERIC,
          year: NUMERIC
        },
        long: {
          month: LONG,
          day: NUMERIC,
          year: NUMERIC
        },
        full: {
          month: LONG,
          day: NUMERIC,
          year: NUMERIC,
          weekday: LONG
        },
        default: {
          month: SHORT,
          day: NUMERIC,
          year: NUMERIC
        }
      },
      time: {
        short: {
          hour: NUMERIC,
          minute: NUMERIC
        },
        medium: {
          hour: NUMERIC,
          minute: NUMERIC,
          second: NUMERIC
        },
        long: {
          hour: NUMERIC,
          minute: NUMERIC,
          second: NUMERIC,
          timeZoneName: SHORT
        },
        full: {
          hour: NUMERIC,
          minute: NUMERIC,
          second: NUMERIC,
          timeZoneName: SHORT
        },
        default: {
          hour: NUMERIC,
          minute: NUMERIC,
          second: NUMERIC
        }
      },
      duration: {
        default: {
          hours: {
            minimumIntegerDigits: 1,
            maximumFractionDigits: 0
          },
          minutes: {
            minimumIntegerDigits: 2,
            maximumFractionDigits: 0
          },
          seconds: {
            minimumIntegerDigits: 2,
            maximumFractionDigits: 3
          }
        }
      },
      parseNumberPattern: function (pattern/*: ?string */) {
        if (!pattern) return
        var options = {};
        var currency = pattern.match(/\b[A-Z]{3}\b/i);
        var syms = pattern.replace(/[^¤]/g, '').length;
        if (!syms && currency) syms = 1;
        if (syms) {
          options.style = 'currency';
          options.currencyDisplay = syms === 1 ? 'symbol' : syms === 2 ? 'code' : 'name';
          options.currency = currency ? currency[0].toUpperCase() : 'USD';
        } else if (pattern.indexOf('%') >= 0) {
          options.style = 'percent';
        }
        if (!/[@#0]/.test(pattern)) return options.style ? options : undefined
        options.useGrouping = pattern.indexOf(',') >= 0;
        if (/E\+?[@#0]+/i.test(pattern) || pattern.indexOf('@') >= 0) {
          var size = pattern.replace(/E\+?[@#0]+|[^@#0]/gi, '');
          options.minimumSignificantDigits = Math.min(Math.max(size.replace(/[^@0]/g, '').length, 1), 21);
          options.maximumSignificantDigits = Math.min(Math.max(size.length, 1), 21);
        } else {
          var parts = pattern.replace(/[^#0.]/g, '').split('.');
          var integer = parts[0];
          var n = integer.length - 1;
          while (integer[n] === '0') --n;
          options.minimumIntegerDigits = Math.min(Math.max(integer.length - 1 - n, 1), 21);
          var fraction = parts[1] || '';
          n = 0;
          while (fraction[n] === '0') ++n;
          options.minimumFractionDigits = Math.min(Math.max(n, 0), 20);
          while (fraction[n] === '#') ++n;
          options.maximumFractionDigits = Math.min(Math.max(n, 0), 20);
        }
        return options
      },
      parseDatePattern: function (pattern/*: ?string */) {
        if (!pattern) return
        var options = {};
        for (var i = 0; i < pattern.length;) {
          var current = pattern[i];
          var n = 1;
          while (pattern[++i] === current) ++n;
          switch (current) {
            case 'G':
              options.era = n === 5 ? NARROW : n === 4 ? LONG : SHORT;
              break
            case 'y':
            case 'Y':
              options.year = n === 2 ? TWODIGIT : NUMERIC;
              break
            case 'M':
            case 'L':
              n = Math.min(Math.max(n - 1, 0), 4);
              options.month = [ NUMERIC, TWODIGIT, SHORT, LONG, NARROW ][n];
              break
            case 'E':
            case 'e':
            case 'c':
              options.weekday = n === 5 ? NARROW : n === 4 ? LONG : SHORT;
              break
            case 'd':
            case 'D':
              options.day = n === 2 ? TWODIGIT : NUMERIC;
              break
            case 'h':
            case 'K':
              options.hour12 = true;
              options.hour = n === 2 ? TWODIGIT : NUMERIC;
              break
            case 'H':
            case 'k':
              options.hour12 = false;
              options.hour = n === 2 ? TWODIGIT : NUMERIC;
              break
            case 'm':
              options.minute = n === 2 ? TWODIGIT : NUMERIC;
              break
            case 's':
            case 'S':
              options.second = n === 2 ? TWODIGIT : NUMERIC;
              break
            case 'z':
            case 'Z':
            case 'v':
            case 'V':
              options.timeZoneName = n === 1 ? SHORT : LONG;
              break
          }
        }
        return Object.keys(options).length ? options : undefined
      }
    };

    // @flow
    // "lookup" algorithm http://tools.ietf.org/html/rfc4647#section-3.4
    // assumes normalized language tags, and matches in a case sensitive manner
    var lookupClosestLocale = function lookupClosestLocale (locale/*: string | string[] | void */, available/*: { [string]: any } */)/*: ?string */ {
      if (typeof locale === 'string' && available[locale]) return locale
      var locales = [].concat(locale || []);
      for (var l = 0, ll = locales.length; l < ll; ++l) {
        var current = locales[l].split('-');
        while (current.length) {
          var candidate = current.join('-');
          if (available[candidate]) return candidate
          current.pop();
        }
      }
    };

    // @flow

    /*:: export type Rule = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' */
    var zero = 'zero', one = 'one', two = 'two', few = 'few', many = 'many', other = 'other';
    var f = [
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return 0 <= n && n <= 1 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var n = +s;
        return i === 0 || n === 1 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 0 ? zero
          : n === 1 ? one
          : n === 2 ? two
          : 3 <= n % 100 && n % 100 <= 10 ? few
          : 11 <= n % 100 && n % 100 <= 99 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        return i === 1 && v === 0 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n % 10 === 1 && n % 100 !== 11 ? one
          : (2 <= n % 10 && n % 10 <= 4) && (n % 100 < 12 || 14 < n % 100) ? few
          : n % 10 === 0 || (5 <= n % 10 && n % 10 <= 9) || (11 <= n % 100 && n % 100 <= 14) ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n % 10 === 1 && (n % 100 !== 11 && n % 100 !== 71 && n % 100 !== 91) ? one
          : n % 10 === 2 && (n % 100 !== 12 && n % 100 !== 72 && n % 100 !== 92) ? two
          : ((3 <= n % 10 && n % 10 <= 4) || n % 10 === 9) && ((n % 100 < 10 || 19 < n % 100) && (n % 100 < 70 || 79 < n % 100) && (n % 100 < 90 || 99 < n % 100)) ? few
          : n !== 0 && n % 1000000 === 0 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        var f = +(s + '.').split('.')[1];
        return v === 0 && i % 10 === 1 && i % 100 !== 11 || f % 10 === 1 && f % 100 !== 11 ? one
          : v === 0 && (2 <= i % 10 && i % 10 <= 4) && (i % 100 < 12 || 14 < i % 100) || (2 <= f % 10 && f % 10 <= 4) && (f % 100 < 12 || 14 < f % 100) ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        return i === 1 && v === 0 ? one
          : (2 <= i && i <= 4) && v === 0 ? few
          : v !== 0 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 0 ? zero
          : n === 1 ? one
          : n === 2 ? two
          : n === 3 ? few
          : n === 6 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var t = +('' + s).replace(/^[^.]*.?|0+$/g, '');
        var n = +s;
        return n === 1 || t !== 0 && (i === 0 || i === 1) ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        var f = +(s + '.').split('.')[1];
        return v === 0 && i % 100 === 1 || f % 100 === 1 ? one
          : v === 0 && i % 100 === 2 || f % 100 === 2 ? two
          : v === 0 && (3 <= i % 100 && i % 100 <= 4) || (3 <= f % 100 && f % 100 <= 4) ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        return i === 0 || i === 1 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        var f = +(s + '.').split('.')[1];
        return v === 0 && (i === 1 || i === 2 || i === 3) || v === 0 && (i % 10 !== 4 && i % 10 !== 6 && i % 10 !== 9) || v !== 0 && (f % 10 !== 4 && f % 10 !== 6 && f % 10 !== 9) ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 ? one
          : n === 2 ? two
          : 3 <= n && n <= 6 ? few
          : 7 <= n && n <= 10 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 || n === 11 ? one
          : n === 2 || n === 12 ? two
          : ((3 <= n && n <= 10) || (13 <= n && n <= 19)) ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        return v === 0 && i % 10 === 1 ? one
          : v === 0 && i % 10 === 2 ? two
          : v === 0 && (i % 100 === 0 || i % 100 === 20 || i % 100 === 40 || i % 100 === 60 || i % 100 === 80) ? few
          : v !== 0 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        var n = +s;
        return i === 1 && v === 0 ? one
          : i === 2 && v === 0 ? two
          : v === 0 && (n < 0 || 10 < n) && n % 10 === 0 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var t = +('' + s).replace(/^[^.]*.?|0+$/g, '');
        return t === 0 && i % 10 === 1 && i % 100 !== 11 || t !== 0 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 ? one
          : n === 2 ? two
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 0 ? zero
          : n === 1 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var n = +s;
        return n === 0 ? zero
          : (i === 0 || i === 1) && n !== 0 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var f = +(s + '.').split('.')[1];
        var n = +s;
        return n % 10 === 1 && (n % 100 < 11 || 19 < n % 100) ? one
          : (2 <= n % 10 && n % 10 <= 9) && (n % 100 < 11 || 19 < n % 100) ? few
          : f !== 0 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var v = (s + '.').split('.')[1].length;
        var f = +(s + '.').split('.')[1];
        var n = +s;
        return n % 10 === 0 || (11 <= n % 100 && n % 100 <= 19) || v === 2 && (11 <= f % 100 && f % 100 <= 19) ? zero
          : n % 10 === 1 && n % 100 !== 11 || v === 2 && f % 10 === 1 && f % 100 !== 11 || v !== 2 && f % 10 === 1 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        var f = +(s + '.').split('.')[1];
        return v === 0 && i % 10 === 1 && i % 100 !== 11 || f % 10 === 1 && f % 100 !== 11 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        var n = +s;
        return i === 1 && v === 0 ? one
          : v !== 0 || n === 0 || n !== 1 && (1 <= n % 100 && n % 100 <= 19) ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 ? one
          : n === 0 || (2 <= n % 100 && n % 100 <= 10) ? few
          : 11 <= n % 100 && n % 100 <= 19 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        return i === 1 && v === 0 ? one
          : v === 0 && (2 <= i % 10 && i % 10 <= 4) && (i % 100 < 12 || 14 < i % 100) ? few
          : v === 0 && i !== 1 && (0 <= i % 10 && i % 10 <= 1) || v === 0 && (5 <= i % 10 && i % 10 <= 9) || v === 0 && (12 <= i % 100 && i % 100 <= 14) ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        return 0 <= i && i <= 1 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        return v === 0 && i % 10 === 1 && i % 100 !== 11 ? one
          : v === 0 && (2 <= i % 10 && i % 10 <= 4) && (i % 100 < 12 || 14 < i % 100) ? few
          : v === 0 && i % 10 === 0 || v === 0 && (5 <= i % 10 && i % 10 <= 9) || v === 0 && (11 <= i % 100 && i % 100 <= 14) ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var n = +s;
        return i === 0 || n === 1 ? one
          : 2 <= n && n <= 10 ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var f = +(s + '.').split('.')[1];
        var n = +s;
        return (n === 0 || n === 1) || i === 0 && f === 1 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        var v = (s + '.').split('.')[1].length;
        return v === 0 && i % 100 === 1 ? one
          : v === 0 && i % 100 === 2 ? two
          : v === 0 && (3 <= i % 100 && i % 100 <= 4) || v !== 0 ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return (0 <= n && n <= 1) || (11 <= n && n <= 99) ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 || n === 5 || n === 7 || n === 8 || n === 9 || n === 10 ? one
          : n === 2 || n === 3 ? two
          : n === 4 ? few
          : n === 6 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        return (i % 10 === 1 || i % 10 === 2 || i % 10 === 5 || i % 10 === 7 || i % 10 === 8) || (i % 100 === 20 || i % 100 === 50 || i % 100 === 70 || i % 100 === 80) ? one
          : (i % 10 === 3 || i % 10 === 4) || (i % 1000 === 100 || i % 1000 === 200 || i % 1000 === 300 || i % 1000 === 400 || i % 1000 === 500 || i % 1000 === 600 || i % 1000 === 700 || i % 1000 === 800 || i % 1000 === 900) ? few
          : i === 0 || i % 10 === 6 || (i % 100 === 40 || i % 100 === 60 || i % 100 === 90) ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return (n % 10 === 2 || n % 10 === 3) && (n % 100 !== 12 && n % 100 !== 13) ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 || n === 3 ? one
          : n === 2 ? two
          : n === 4 ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 0 || n === 7 || n === 8 || n === 9 ? zero
          : n === 1 ? one
          : n === 2 ? two
          : n === 3 || n === 4 ? few
          : n === 5 || n === 6 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n % 10 === 1 && n % 100 !== 11 ? one
          : n % 10 === 2 && n % 100 !== 12 ? two
          : n % 10 === 3 && n % 100 !== 13 ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 || n === 11 ? one
          : n === 2 || n === 12 ? two
          : n === 3 || n === 13 ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 ? one
          : n === 2 || n === 3 ? two
          : n === 4 ? few
          : n === 6 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 || n === 5 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 11 || n === 8 || n === 80 || n === 800 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        return i === 1 ? one
          : i === 0 || ((2 <= i % 100 && i % 100 <= 20) || i % 100 === 40 || i % 100 === 60 || i % 100 === 80) ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n % 10 === 6 || n % 10 === 9 || n % 10 === 0 && n !== 0 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var i = Math.floor(Math.abs(+s));
        return i % 10 === 1 && i % 100 !== 11 ? one
          : i % 10 === 2 && i % 100 !== 12 ? two
          : (i % 10 === 7 || i % 10 === 8) && (i % 100 !== 17 && i % 100 !== 18) ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 ? one
          : n === 2 || n === 3 ? two
          : n === 4 ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return 1 <= n && n <= 4 ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return (n === 1 || n === 5 || (7 <= n && n <= 9)) ? one
          : n === 2 || n === 3 ? two
          : n === 4 ? few
          : n === 6 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n === 1 ? one
          : n % 10 === 4 && n % 100 !== 14 ? many
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return (n % 10 === 1 || n % 10 === 2) && (n % 100 !== 11 && n % 100 !== 12) ? one
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return (n % 10 === 6 || n % 10 === 9) || n === 10 ? few
          : other
      },
      function (s/*: string | number */)/*: Rule */ {
        var n = +s;
        return n % 10 === 3 && n % 100 !== 13 ? few
          : other
      }
    ];

    var plurals = {
      af: { cardinal: f[0] },
      ak: { cardinal: f[1] },
      am: { cardinal: f[2] },
      ar: { cardinal: f[3] },
      ars: { cardinal: f[3] },
      as: { cardinal: f[2], ordinal: f[34] },
      asa: { cardinal: f[0] },
      ast: { cardinal: f[4] },
      az: { cardinal: f[0], ordinal: f[35] },
      be: { cardinal: f[5], ordinal: f[36] },
      bem: { cardinal: f[0] },
      bez: { cardinal: f[0] },
      bg: { cardinal: f[0] },
      bh: { cardinal: f[1] },
      bn: { cardinal: f[2], ordinal: f[34] },
      br: { cardinal: f[6] },
      brx: { cardinal: f[0] },
      bs: { cardinal: f[7] },
      ca: { cardinal: f[4], ordinal: f[37] },
      ce: { cardinal: f[0] },
      cgg: { cardinal: f[0] },
      chr: { cardinal: f[0] },
      ckb: { cardinal: f[0] },
      cs: { cardinal: f[8] },
      cy: { cardinal: f[9], ordinal: f[38] },
      da: { cardinal: f[10] },
      de: { cardinal: f[4] },
      dsb: { cardinal: f[11] },
      dv: { cardinal: f[0] },
      ee: { cardinal: f[0] },
      el: { cardinal: f[0] },
      en: { cardinal: f[4], ordinal: f[39] },
      eo: { cardinal: f[0] },
      es: { cardinal: f[0] },
      et: { cardinal: f[4] },
      eu: { cardinal: f[0] },
      fa: { cardinal: f[2] },
      ff: { cardinal: f[12] },
      fi: { cardinal: f[4] },
      fil: { cardinal: f[13], ordinal: f[0] },
      fo: { cardinal: f[0] },
      fr: { cardinal: f[12], ordinal: f[0] },
      fur: { cardinal: f[0] },
      fy: { cardinal: f[4] },
      ga: { cardinal: f[14], ordinal: f[0] },
      gd: { cardinal: f[15], ordinal: f[40] },
      gl: { cardinal: f[4] },
      gsw: { cardinal: f[0] },
      gu: { cardinal: f[2], ordinal: f[41] },
      guw: { cardinal: f[1] },
      gv: { cardinal: f[16] },
      ha: { cardinal: f[0] },
      haw: { cardinal: f[0] },
      he: { cardinal: f[17] },
      hi: { cardinal: f[2], ordinal: f[41] },
      hr: { cardinal: f[7] },
      hsb: { cardinal: f[11] },
      hu: { cardinal: f[0], ordinal: f[42] },
      hy: { cardinal: f[12], ordinal: f[0] },
      ia: { cardinal: f[4] },
      io: { cardinal: f[4] },
      is: { cardinal: f[18] },
      it: { cardinal: f[4], ordinal: f[43] },
      iu: { cardinal: f[19] },
      iw: { cardinal: f[17] },
      jgo: { cardinal: f[0] },
      ji: { cardinal: f[4] },
      jmc: { cardinal: f[0] },
      ka: { cardinal: f[0], ordinal: f[44] },
      kab: { cardinal: f[12] },
      kaj: { cardinal: f[0] },
      kcg: { cardinal: f[0] },
      kk: { cardinal: f[0], ordinal: f[45] },
      kkj: { cardinal: f[0] },
      kl: { cardinal: f[0] },
      kn: { cardinal: f[2] },
      ks: { cardinal: f[0] },
      ksb: { cardinal: f[0] },
      ksh: { cardinal: f[20] },
      ku: { cardinal: f[0] },
      kw: { cardinal: f[19] },
      ky: { cardinal: f[0] },
      lag: { cardinal: f[21] },
      lb: { cardinal: f[0] },
      lg: { cardinal: f[0] },
      ln: { cardinal: f[1] },
      lt: { cardinal: f[22] },
      lv: { cardinal: f[23] },
      mas: { cardinal: f[0] },
      mg: { cardinal: f[1] },
      mgo: { cardinal: f[0] },
      mk: { cardinal: f[24], ordinal: f[46] },
      ml: { cardinal: f[0] },
      mn: { cardinal: f[0] },
      mo: { cardinal: f[25], ordinal: f[0] },
      mr: { cardinal: f[2], ordinal: f[47] },
      mt: { cardinal: f[26] },
      nah: { cardinal: f[0] },
      naq: { cardinal: f[19] },
      nb: { cardinal: f[0] },
      nd: { cardinal: f[0] },
      ne: { cardinal: f[0], ordinal: f[48] },
      nl: { cardinal: f[4] },
      nn: { cardinal: f[0] },
      nnh: { cardinal: f[0] },
      no: { cardinal: f[0] },
      nr: { cardinal: f[0] },
      nso: { cardinal: f[1] },
      ny: { cardinal: f[0] },
      nyn: { cardinal: f[0] },
      om: { cardinal: f[0] },
      or: { cardinal: f[0], ordinal: f[49] },
      os: { cardinal: f[0] },
      pa: { cardinal: f[1] },
      pap: { cardinal: f[0] },
      pl: { cardinal: f[27] },
      prg: { cardinal: f[23] },
      ps: { cardinal: f[0] },
      pt: { cardinal: f[28] },
      'pt-PT': { cardinal: f[4] },
      rm: { cardinal: f[0] },
      ro: { cardinal: f[25], ordinal: f[0] },
      rof: { cardinal: f[0] },
      ru: { cardinal: f[29] },
      rwk: { cardinal: f[0] },
      saq: { cardinal: f[0] },
      sc: { cardinal: f[4], ordinal: f[43] },
      scn: { cardinal: f[4], ordinal: f[43] },
      sd: { cardinal: f[0] },
      sdh: { cardinal: f[0] },
      se: { cardinal: f[19] },
      seh: { cardinal: f[0] },
      sh: { cardinal: f[7] },
      shi: { cardinal: f[30] },
      si: { cardinal: f[31] },
      sk: { cardinal: f[8] },
      sl: { cardinal: f[32] },
      sma: { cardinal: f[19] },
      smi: { cardinal: f[19] },
      smj: { cardinal: f[19] },
      smn: { cardinal: f[19] },
      sms: { cardinal: f[19] },
      sn: { cardinal: f[0] },
      so: { cardinal: f[0] },
      sq: { cardinal: f[0], ordinal: f[50] },
      sr: { cardinal: f[7] },
      ss: { cardinal: f[0] },
      ssy: { cardinal: f[0] },
      st: { cardinal: f[0] },
      sv: { cardinal: f[4], ordinal: f[51] },
      sw: { cardinal: f[4] },
      syr: { cardinal: f[0] },
      ta: { cardinal: f[0] },
      te: { cardinal: f[0] },
      teo: { cardinal: f[0] },
      ti: { cardinal: f[1] },
      tig: { cardinal: f[0] },
      tk: { cardinal: f[0], ordinal: f[52] },
      tl: { cardinal: f[13], ordinal: f[0] },
      tn: { cardinal: f[0] },
      tr: { cardinal: f[0] },
      ts: { cardinal: f[0] },
      tzm: { cardinal: f[33] },
      ug: { cardinal: f[0] },
      uk: { cardinal: f[29], ordinal: f[53] },
      ur: { cardinal: f[4] },
      uz: { cardinal: f[0] },
      ve: { cardinal: f[0] },
      vo: { cardinal: f[0] },
      vun: { cardinal: f[0] },
      wa: { cardinal: f[1] },
      wae: { cardinal: f[0] },
      xh: { cardinal: f[0] },
      xog: { cardinal: f[0] },
      yi: { cardinal: f[4] },
      zu: { cardinal: f[2] },
      lo: { ordinal: f[0] },
      ms: { ordinal: f[0] },
      vi: { ordinal: f[0] }
    };

    var formatMessageInterpret = createCommonjsModule(function (module, exports) {




    /*::
    import type {
      AST,
      SubMessages
    } from '../format-message-parse'
    type Locale = string
    type Locales = Locale | Locale[]
    type Placeholder = any[] // https://github.com/facebook/flow/issues/4050
    export type Type = (Placeholder, Locales) => (any, ?Object) => any
    export type Types = { [string]: Type }
    */

    exports = module.exports = function interpret (
      ast/*: AST */,
      locale/*:: ?: Locales */,
      types/*:: ?: Types */
    )/*: (args?: Object) => string */ {
      return interpretAST(ast, null, locale || 'en', types || {}, true)
    };

    exports.toParts = function toParts (
      ast/*: AST */,
      locale/*:: ?: Locales */,
      types/*:: ?: Types */
    )/*: (args?: Object) => any[] */ {
      return interpretAST(ast, null, locale || 'en', types || {}, false)
    };

    function interpretAST (
      elements/*: any[] */,
      parent/*: ?Placeholder */,
      locale/*: Locales */,
      types/*: Types */,
      join/*: boolean */
    )/*: Function */ {
      var parts = elements.map(function (element) {
        return interpretElement(element, parent, locale, types, join)
      });

      if (!join) {
        return function format (args) {
          return parts.reduce(function (parts, part) {
            return parts.concat(part(args))
          }, [])
        }
      }

      if (parts.length === 1) return parts[0]
      return function format (args) {
        var message = '';
        for (var e = 0; e < parts.length; ++e) {
          message += parts[e](args);
        }
        return message
      }
    }

    function interpretElement (
      element/*: Placeholder */,
      parent/*: ?Placeholder */,
      locale/*: Locales */,
      types/*: Types */,
      join/*: boolean */
    )/*: Function */ {
      if (typeof element === 'string') {
        var value/*: string */ = element;
        return function format () { return value }
      }

      var id = element[0];
      var type = element[1];

      if (parent && element[0] === '#') {
        id = parent[0];
        var offset = parent[2];
        var formatter = (types.number || defaults.number)([ id, 'number' ], locale);
        return function format (args) {
          return formatter(getArg(id, args) - offset, args)
        }
      }

      // pre-process children
      var children;
      if (type === 'plural' || type === 'selectordinal') {
        children = {};
        Object.keys(element[3]).forEach(function (key) {
          children[key] = interpretAST(element[3][key], element, locale, types, join);
        });
        element = [ element[0], element[1], element[2], children ];
      } else if (element[2] && typeof element[2] === 'object') {
        children = {};
        Object.keys(element[2]).forEach(function (key) {
          children[key] = interpretAST(element[2][key], element, locale, types, join);
        });
        element = [ element[0], element[1], children ];
      }

      var getFrmt = type && (types[type] || defaults[type]);
      if (getFrmt) {
        var frmt = getFrmt(element, locale);
        return function format (args) {
          return frmt(getArg(id, args), args)
        }
      }

      return join
        ? function format (args) { return String(getArg(id, args)) }
        : function format (args) { return getArg(id, args) }
    }

    function getArg (id/*: string */, args/*: ?Object */)/*: any */ {
      if (args && (id in args)) return args[id]
      var parts = id.split('.');
      var a = args;
      for (var i = 0, ii = parts.length; a && i < ii; ++i) {
        a = a[parts[i]];
      }
      return a
    }

    function interpretNumber (element/*: Placeholder */, locales/*: Locales */) {
      var style = element[2];
      var options = formatMessageFormats.number[style] || formatMessageFormats.parseNumberPattern(style) || formatMessageFormats.number.default;
      return new Intl.NumberFormat(locales, options).format
    }

    function interpretDuration (element/*: Placeholder */, locales/*: Locales */) {
      var style = element[2];
      var options = formatMessageFormats.duration[style] || formatMessageFormats.duration.default;
      var fs = new Intl.NumberFormat(locales, options.seconds).format;
      var fm = new Intl.NumberFormat(locales, options.minutes).format;
      var fh = new Intl.NumberFormat(locales, options.hours).format;
      var sep = /^fi$|^fi-|^da/.test(String(locales)) ? '.' : ':';

      return function (s, args) {
        s = +s;
        if (!isFinite(s)) return fs(s)
        var h = ~~(s / 60 / 60); // ~~ acts much like Math.trunc
        var m = ~~(s / 60 % 60);
        var dur = (h ? (fh(Math.abs(h)) + sep) : '') +
          fm(Math.abs(m)) + sep + fs(Math.abs(s % 60));
        return s < 0 ? fh(-1).replace(fh(1), dur) : dur
      }
    }

    function interpretDateTime (element/*: Placeholder */, locales/*: Locales */) {
      var type = element[1];
      var style = element[2];
      var options = formatMessageFormats[type][style] || formatMessageFormats.parseDatePattern(style) || formatMessageFormats[type].default;
      return new Intl.DateTimeFormat(locales, options).format
    }

    function interpretPlural (element/*: Placeholder */, locales/*: Locales */) {
      var type = element[1];
      var pluralType = type === 'selectordinal' ? 'ordinal' : 'cardinal';
      var offset = element[2];
      var children = element[3];
      var pluralRules;
      if (Intl.PluralRules && Intl.PluralRules.supportedLocalesOf(locales).length > 0) {
        pluralRules = new Intl.PluralRules(locales, { type: pluralType });
      } else {
        var locale = lookupClosestLocale(locales, plurals);
        var select = (locale && plurals[locale][pluralType]) || returnOther;
        pluralRules = { select: select };
      }

      return function (value, args) {
        var clause =
          children['=' + +value] ||
          children[pluralRules.select(value - offset)] ||
          children.other;
        return clause(args)
      }
    }

    function returnOther (/*:: n:number */) { return 'other' }

    function interpretSelect (element/*: Placeholder */, locales/*: Locales */) {
      var children = element[2];
      return function (value, args) {
        var clause = children[value] || children.other;
        return clause(args)
      }
    }

    var defaults/*: Types */ = {
      number: interpretNumber,
      ordinal: interpretNumber, // TODO: support rbnf
      spellout: interpretNumber, // TODO: support rbnf
      duration: interpretDuration,
      date: interpretDateTime,
      time: interpretDateTime,
      plural: interpretPlural,
      selectordinal: interpretPlural,
      select: interpretSelect
    };
    exports.types = defaults;
    });
    var formatMessageInterpret_1 = formatMessageInterpret.toParts;
    var formatMessageInterpret_2 = formatMessageInterpret.types;

    var formatMessage = createCommonjsModule(function (module, exports) {






    /*::
    import type { Types } from 'format-message-interpret'
    type Locale = string
    type Locales = Locale | Locale[]
    type Message = string | {|
      id?: string,
      default: string,
      description?: string
    |}
    type Translations = { [string]: ?{ [string]: string | Translation } }
    type Translation = {
      message: string,
      format?: (args?: Object) => string,
      toParts?: (args?: Object) => any[],
    }
    type Replacement = ?string | (string, string, locales?: Locales) => ?string
    type GenerateId = (string) => string
    type MissingTranslation = 'ignore' | 'warning' | 'error'
    type FormatObject = { [string]: * }
    type Options = {
      locale?: Locales,
      translations?: ?Translations,
      generateId?: GenerateId,
      missingReplacement?: Replacement,
      missingTranslation?: MissingTranslation,
      formats?: {
        number?: FormatObject,
        date?: FormatObject,
        time?: FormatObject
      },
      types?: Types
    }
    type Setup = {|
      locale: Locales,
      translations: Translations,
      generateId: GenerateId,
      missingReplacement: Replacement,
      missingTranslation: MissingTranslation,
      formats: {
        number: FormatObject,
        date: FormatObject,
        time: FormatObject
      },
      types: Types
    |}
    type FormatMessage = {
      (msg: Message, args?: Object, locales?: Locales): string,
      rich (msg: Message, args?: Object, locales?: Locales): any[],
      setup (opt?: Options): Setup,
      number (value: number, style?: string, locales?: Locales): string,
      date (value: number | Date, style?: string, locales?: Locales): string,
      time (value: number | Date, style?: string, locales?: Locales): string,
      select (value: any, options: Object): any,
      custom (placeholder: any[], locales: Locales, value: any, args: Object): any,
      plural (value: number, offset: any, options: any, locale: any): any,
      selectordinal (value: number, offset: any, options: any, locale: any): any,
      namespace (): FormatMessage
    }
    */

    function assign/*:: <T: Object> */ (target/*: T */, source/*: Object */) {
      Object.keys(source).forEach(function (key) { target[key] = source[key]; });
      return target
    }

    function namespace ()/*: FormatMessage */ {
      var formats = assign({}, formatMessageFormats);
      var currentLocales/*: Locales */ = 'en';
      var translations/*: Translations */ = {};
      var generateId/*: GenerateId */ = function (pattern) { return pattern };
      var missingReplacement/*: Replacement */ = null;
      var missingTranslation/*: MissingTranslation */ = 'warning';
      var types/*: Types */ = {};

      function formatMessage (msg/*: Message */, args/*:: ?: Object */, locales/*:: ?: Locales */) {
        var pattern = typeof msg === 'string' ? msg : msg.default;
        var id = (typeof msg === 'object' && msg.id) || generateId(pattern);
        var translated = translate(pattern, id, locales || currentLocales);
        var format = translated.format || (
          translated.format = formatMessageInterpret(formatMessageParse(translated.message), locales || currentLocales, types)
        );
        return format(args)
      }

      formatMessage.rich = function rich (msg/*: Message */, args/*:: ?: Object */, locales/*:: ?: Locales */) {
        var pattern = typeof msg === 'string' ? msg : msg.default;
        var id = (typeof msg === 'object' && msg.id) || generateId(pattern);
        var translated = translate(pattern, id, locales || currentLocales);
        var format = translated.toParts || (
          translated.toParts = formatMessageInterpret.toParts(formatMessageParse(translated.message, { tagsType: tagsType }), locales || currentLocales, types)
        );
        return format(args)
      };

      var tagsType = '<>';
      function richType (node/*: any[] */, locales/*: Locales */) {
        var style = node[2];
        return function (fn, args) {
          var props = typeof style === 'object' ? mapObject(style, args) : style;
          return typeof fn === 'function' ? fn(props) : fn
        }
      }
      types[tagsType] = richType;

      function mapObject (object/* { [string]: (args?: Object) => any } */, args/*: ?Object */) {
        return Object.keys(object).reduce(function (mapped, key) {
          mapped[key] = object[key](args);
          return mapped
        }, {})
      }

      function translate (pattern/*: string */, id/*: string */, locales/*: Locales */)/*: Translation */ {
        var locale = lookupClosestLocale(locales, translations) || 'en';
        var messages = translations[locale] || (translations[locale] = {});
        var translated = messages[id];
        if (typeof translated === 'string') {
          translated = messages[id] = { message: translated };
        }
        if (!translated) {
          var message = 'Translation for "' + id + '" in "' + locale + '" is missing';
          if (missingTranslation === 'warning') {
            /* istanbul ignore else */
            if (typeof console !== 'undefined') console.warn(message);
          } else if (missingTranslation !== 'ignore') { // 'error'
            throw new Error(message)
          }
          var replacement = typeof missingReplacement === 'function'
            ? missingReplacement(pattern, id, locale) || pattern
            : missingReplacement || pattern;
          translated = messages[id] = { message: replacement };
        }
        return translated
      }

      formatMessage.setup = function setup (opt/*:: ?: Options */) {
        opt = opt || {};
        if (opt.locale) currentLocales = opt.locale;
        if ('translations' in opt) translations = opt.translations || {};
        if (opt.generateId) generateId = opt.generateId;
        if ('missingReplacement' in opt) missingReplacement = opt.missingReplacement;
        if (opt.missingTranslation) missingTranslation = opt.missingTranslation;
        if (opt.formats) {
          if (opt.formats.number) assign(formats.number, opt.formats.number);
          if (opt.formats.date) assign(formats.date, opt.formats.date);
          if (opt.formats.time) assign(formats.time, opt.formats.time);
        }
        if (opt.types) {
          types = opt.types;
          types[tagsType] = richType;
        }
        return {
          locale: currentLocales,
          translations: translations,
          generateId: generateId,
          missingReplacement: missingReplacement,
          missingTranslation: missingTranslation,
          formats: formats,
          types: types
        }
      };

      formatMessage.number = function (value/*: number */, style/*:: ?: string */, locales/*:: ?: Locales */) {
        var options = (style && formats.number[style]) ||
          formats.parseNumberPattern(style) ||
          formats.number.default;
        return new Intl.NumberFormat(locales || currentLocales, options).format(value)
      };

      formatMessage.date = function (value/*:: ?: number | Date */, style/*:: ?: string */, locales/*:: ?: Locales */) {
        var options = (style && formats.date[style]) ||
          formats.parseDatePattern(style) ||
          formats.date.default;
        return new Intl.DateTimeFormat(locales || currentLocales, options).format(value)
      };

      formatMessage.time = function (value/*:: ?: number | Date */, style/*:: ?: string */, locales/*:: ?: Locales */) {
        var options = (style && formats.time[style]) ||
          formats.parseDatePattern(style) ||
          formats.time.default;
        return new Intl.DateTimeFormat(locales || currentLocales, options).format(value)
      };

      formatMessage.select = function (value/*: any */, options/*: Object */) {
        return options[value] || options.other
      };

      formatMessage.custom = function (placeholder/*: any[] */, locales/*: Locales */, value/*: any */, args/*: Object */) {
        if (!(placeholder[1] in types)) return value
        return types[placeholder[1]](placeholder, locales)(value, args)
      };

      formatMessage.plural = plural.bind(null, 'cardinal');
      formatMessage.selectordinal = plural.bind(null, 'ordinal');
      function plural (
        pluralType/*: 'cardinal' | 'ordinal' */,
        value/*: number */,
        offset/*: any */,
        options/*: any */,
        locale/*: any */
      ) {
        if (typeof offset === 'object' && typeof options !== 'object') { // offset is optional
          locale = options;
          options = offset;
          offset = 0;
        }
        var closest = lookupClosestLocale(locale || currentLocales, plurals);
        var plural = (closest && plurals[closest][pluralType]) || returnOther;
        return options['=' + +value] || options[plural(value - offset)] || options.other
      }
      function returnOther (/*:: n:number */) { return 'other' }

      formatMessage.namespace = namespace;

      return formatMessage
    }

    module.exports = exports = namespace();
    });

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    var buildKey = function (base, curr) { return base ? base + "." + curr : curr; };
    var flatObject = function (object) {
        var result = {};
        var iterate = function (item, currentKey) {
            Object.keys(item).forEach(function (key) {
                var value = item[key];
                if (typeof value === 'object')
                    iterate(value, buildKey(currentKey, key));
                else
                    result[buildKey(currentKey, key)] = value;
            });
        };
        iterate(object, '');
        return result;
    };

    var flatTranslation = function (translations) { return Object.keys(translations).reduce(function (acc, key) {
        var _a;
        return (__assign(__assign({}, acc), (_a = {}, _a[key] = flatObject(translations[key]), _a)));
    }, {}); };
    var merge = function (obj1, obj2) {
        if (obj1 === void 0) { obj1 = {}; }
        return Object.keys(obj2).reduce(function (acc, key) {
            if (obj2[key] !== null && typeof obj2[key] === 'object') {
                acc[key] = merge(acc[key], obj2[key]);
            }
            else {
                acc[key] = obj2[key];
            }
            return acc;
        }, obj1);
    };
    function createMergeableStore(defaultValue) {
        var _a = writable(defaultValue), subscribe = _a.subscribe, set = _a.set, update = _a.update;
        var updateMerging = function (newTranslations) { return update(function ($translations) {
            return merge($translations, newTranslations);
        }); };
        return {
            set: set,
            subscribe: subscribe,
            update: updateMerging,
        };
    }
    var defaultOptions = {
        missingTranslation: 'ignore',
    };
    var options = createMergeableStore(defaultOptions);
    var translations = createMergeableStore({});
    var locales = derived(translations, function ($translations) { return Object.keys($translations); });
    var createLocale = function () {
        var _a = writable(''), subscribe = _a.subscribe, set = _a.set, update = _a.update;
        var setLocale = function (newLocale) {
            if (newLocale !== '' && !get_store_value(translations)[newLocale]) {
                console.error("[svelte-intl] Couldn't find the \"" + newLocale + "\" locale.");
                return false;
            }
            set(newLocale);
            return true;
        };
        return {
            subscribe: subscribe,
            update: update,
            set: setLocale,
        };
    };
    var locale = createLocale();
    var translate = derived([locale, translations, options], function (stores) {
        var $locale = stores[0], $translations = stores[1], $options = stores[2];
        formatMessage.setup(__assign(__assign({}, $options), { locale: $locale, translations: flatTranslation($translations) }));
        return formatMessage;
    });
    var _ = translate;

    var getBrowserLocale = function (defaultLocale) {
        if (defaultLocale === void 0) { defaultLocale = 'en'; }
        var _a, _b, _c;
        var targets = ((_a = window) === null || _a === void 0 ? void 0 : _a.navigator.languages) || // user language preferences list
            [
                ((_b = window) === null || _b === void 0 ? void 0 : _b.navigator).userLanguage || // IE 10-
                 ((_c = window) === null || _c === void 0 ? void 0 : _c.navigator.language) || // browser ui language
                    defaultLocale,
            ];
        var currentLocales = get_store_value(locales);
        var _loop_1 = function (i) {
            if (currentLocales.includes(targets[i]))
                return { value: targets[i] }; // exact match
            var bestMatch = currentLocales.find(function (locale) { return targets[i].startsWith(locale); });
            if (bestMatch)
                return { value: bestMatch }; // en-US -> en
        };
        for (var i = 0; i < targets.length; i = i + 1) {
            var state_1 = _loop_1(i);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        var currentLocale = get_store_value(locale);
        return currentLocale || currentLocales[0]; // default to current or just first
    };

    /* src/i18n.svelte generated by Svelte v3.20.1 */

    function create_fragment(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    translations.update({ tw });
    locale.set(getBrowserLocale("tw"));

    function instance($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<I18n> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("I18n", $$slots, []);

    	$$self.$capture_state = () => ({
    		locale,
    		translations,
    		getBrowserLocale,
    		tw
    	});

    	return [];
    }

    class I18n extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I18n",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/components/Header/Hamburger/Hamburger.svelte generated by Svelte v3.20.1 */

    const { console: console_1 } = globals;
    const file = "src/components/Header/Hamburger/Hamburger.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1d424th-style";
    	style.textContent = "div.svelte-1d424th{-ms-flex-item-align:center;align-self:center;cursor:pointer}span.svelte-1d424th{width:30px;height:3px;background:white;display:block;margin-bottom:4px}span.svelte-1d424th:last-of-type{margin-bottom:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGFtYnVyZ2VyLnN2ZWx0ZSIsInNvdXJjZXMiOlsiSGFtYnVyZ2VyLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IG9uOmNsaWNrPXtoYW5kbGVDbGlja30+XG4gIDxzcGFuPjwvc3Bhbj5cbiAgPHNwYW4+PC9zcGFuPlxuICA8c3Bhbj48L3NwYW4+XG48L2Rpdj5cbjxzY3JpcHQ+XG5jb25zdCBoYW5kbGVDbGljayA9IGUgPT4ge1xuICBjb25zb2xlLmxvZygnb2JqZWN0Jylcbn1cbjwvc2NyaXB0PlxuPHN0eWxlIGxhbmc9XCJzY3NzXCI+ZGl2IHtcbiAgLW1zLWZsZXgtaXRlbS1hbGlnbjogY2VudGVyO1xuICAgICAgYWxpZ24tc2VsZjogY2VudGVyO1xuICBjdXJzb3I6IHBvaW50ZXI7XG4gIC8qIHBhZGRpbmc6IDZweDsgKi8gfVxuXG5zcGFuIHtcbiAgd2lkdGg6IDMwcHg7XG4gIGhlaWdodDogM3B4O1xuICBiYWNrZ3JvdW5kOiB3aGl0ZTtcbiAgZGlzcGxheTogYmxvY2s7XG4gIG1hcmdpbi1ib3R0b206IDRweDsgfVxuICBzcGFuOmxhc3Qtb2YtdHlwZSB7XG4gICAgbWFyZ2luLWJvdHRvbTogMDsgfVxuLyojIHNvdXJjZU1hcHBpbmdVUkw9c3JjL2NvbXBvbmVudHMvSGVhZGVyL0hhbWJ1cmdlci9IYW1idXJnZXIuc3ZlbHRlLm1hcCAqLzwvc3R5bGU+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVVtQixHQUFHLGVBQUMsQ0FBQyxBQUN0QixtQkFBbUIsQ0FBRSxNQUFNLENBQ3ZCLFVBQVUsQ0FBRSxNQUFNLENBQ3RCLE1BQU0sQ0FBRSxPQUFPLEFBQ0ssQ0FBQyxBQUV2QixJQUFJLGVBQUMsQ0FBQyxBQUNKLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLEdBQUcsQ0FDWCxVQUFVLENBQUUsS0FBSyxDQUNqQixPQUFPLENBQUUsS0FBSyxDQUNkLGFBQWEsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUNyQixtQkFBSSxhQUFhLEFBQUMsQ0FBQyxBQUNqQixhQUFhLENBQUUsQ0FBQyxBQUFFLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let div;
    	let span0;
    	let t0;
    	let span1;
    	let t1;
    	let span2;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			t0 = space();
    			span1 = element("span");
    			t1 = space();
    			span2 = element("span");
    			attr_dev(span0, "class", "svelte-1d424th");
    			add_location(span0, file, 1, 2, 31);
    			attr_dev(span1, "class", "svelte-1d424th");
    			add_location(span1, file, 2, 2, 47);
    			attr_dev(span2, "class", "svelte-1d424th");
    			add_location(span2, file, 3, 2, 63);
    			attr_dev(div, "class", "svelte-1d424th");
    			add_location(div, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t0);
    			append_dev(div, span1);
    			append_dev(div, t1);
    			append_dev(div, span2);
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", /*handleClick*/ ctx[0], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const handleClick = e => {
    		console.log("object");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Hamburger> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Hamburger", $$slots, []);
    	$$self.$capture_state = () => ({ handleClick });
    	return [handleClick];
    }

    class Hamburger extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1d424th-style")) add_css();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hamburger",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/components/Header/Header.svelte generated by Svelte v3.20.1 */
    const file$1 = "src/components/Header/Header.svelte";

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-2l4tuq-style";
    	style.textContent = "header.svelte-2l4tuq.svelte-2l4tuq{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:end;-ms-flex-align:end;align-items:flex-end}header.svelte-2l4tuq img.svelte-2l4tuq{width:100px;-ms-interpolation-mode:nearest-neighbor;image-rendering:-webkit-optimize-contrast;image-rendering:-moz-crisp-edges;image-rendering:-o-pixelated;image-rendering:pixelated}h1.svelte-2l4tuq.svelte-2l4tuq{font-size:2rem;margin:0;text-align:center;display:inline}nav.svelte-2l4tuq.svelte-2l4tuq{display:inline-block}ul.svelte-2l4tuq.svelte-2l4tuq{list-style:none;padding:0;margin:0}li.svelte-2l4tuq.svelte-2l4tuq{display:inline-block;padding:0 15px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGVhZGVyLnN2ZWx0ZSIsInNvdXJjZXMiOlsiSGVhZGVyLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuICBpbXBvcnQgeyBfIH0gZnJvbSAnc3ZlbHRlLWludGwnXG4gIGltcG9ydCBIYW1idXJnZXIgZnJvbSAnLi9IYW1idXJnZXInO1xuICBjb25zdCBsb2dvU3JjID0gJ2ltYWdlL2xvZ28ucG5nJ1xuPC9zY3JpcHQ+XG48aGVhZGVyIGNsYXNzPVwiY29udGFpbmVyXCI+XG4gIDxoMT48aW1nIHNyYz17bG9nb1NyY30gYWx0PVwiXCIgY2xhc3M9XCJuZXMtYXZhdGFyXCIvPjwvaDE+XG4gIDxuYXYgPlxuICAgIDx1bD5cbiAgICAgIDxsaT57JF8oJ2hlYWRlci5hYm91dCcpfTwvbGk+XG4gICAgICA8bGk+eyRfKCdoZWFkZXIuY2FzZScpfTwvbGk+XG4gICAgICA8bGk+eyRfKCdoZWFkZXIuY2hhcmdlcycpfTwvbGk+XG4gICAgICA8bGk+eyRfKCdoZWFkZXIuY29udHJhY3RPdXQnKX08L2xpPlxuICAgIDwvdWw+XG4gIDwvbmF2PlxuICA8IS0tIDxIYW1idXJnZXIgLz4gLS0+XG48L2hlYWRlcj5cbjxzdHlsZSBsYW5nPVwic2Nzc1wiPmhlYWRlciB7XG4gIGRpc3BsYXk6IC13ZWJraXQtYm94O1xuICBkaXNwbGF5OiAtbXMtZmxleGJveDtcbiAgZGlzcGxheTogZmxleDtcbiAgLXdlYmtpdC1ib3gtcGFjazoganVzdGlmeTtcbiAgICAgIC1tcy1mbGV4LXBhY2s6IGp1c3RpZnk7XG4gICAgICAgICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuICAtd2Via2l0LWJveC1hbGlnbjogZW5kO1xuICAgICAgLW1zLWZsZXgtYWxpZ246IGVuZDtcbiAgICAgICAgICBhbGlnbi1pdGVtczogZmxleC1lbmQ7IH1cbiAgaGVhZGVyIGltZyB7XG4gICAgd2lkdGg6IDEwMHB4O1xuICAgIC1tcy1pbnRlcnBvbGF0aW9uLW1vZGU6IG5lYXJlc3QtbmVpZ2hib3I7XG4gICAgICAgIGltYWdlLXJlbmRlcmluZzogLXdlYmtpdC1vcHRpbWl6ZS1jb250cmFzdDtcbiAgICAgICAgaW1hZ2UtcmVuZGVyaW5nOiAtbW96LWNyaXNwLWVkZ2VzO1xuICAgICAgICBpbWFnZS1yZW5kZXJpbmc6IC1vLXBpeGVsYXRlZDtcbiAgICAgICAgaW1hZ2UtcmVuZGVyaW5nOiBwaXhlbGF0ZWQ7IH1cblxuaDEge1xuICBmb250LXNpemU6IDJyZW07XG4gIG1hcmdpbjogMDtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xuICBkaXNwbGF5OiBpbmxpbmU7IH1cblxubmF2IHtcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrOyB9XG5cbnVsIHtcbiAgbGlzdC1zdHlsZTogbm9uZTtcbiAgcGFkZGluZzogMDtcbiAgbWFyZ2luOiAwOyB9XG5cbmxpIHtcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xuICBwYWRkaW5nOiAwIDE1cHg7IH1cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXNyYy9jb21wb25lbnRzL0hlYWRlci9IZWFkZXIuc3ZlbHRlLm1hcCAqLzwvc3R5bGU+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWlCbUIsTUFBTSw0QkFBQyxDQUFDLEFBQ3pCLE9BQU8sQ0FBRSxXQUFXLENBQ3BCLE9BQU8sQ0FBRSxXQUFXLENBQ3BCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsZ0JBQWdCLENBQUUsT0FBTyxDQUNyQixhQUFhLENBQUUsT0FBTyxDQUNsQixlQUFlLENBQUUsYUFBYSxDQUN0QyxpQkFBaUIsQ0FBRSxHQUFHLENBQ2xCLGNBQWMsQ0FBRSxHQUFHLENBQ2YsV0FBVyxDQUFFLFFBQVEsQUFBRSxDQUFDLEFBQ2hDLG9CQUFNLENBQUMsR0FBRyxjQUFDLENBQUMsQUFDVixLQUFLLENBQUUsS0FBSyxDQUNaLHNCQUFzQixDQUFFLGdCQUFnQixDQUNwQyxlQUFlLENBQUUseUJBQXlCLENBQzFDLGVBQWUsQ0FBRSxnQkFBZ0IsQ0FDakMsZUFBZSxDQUFFLFlBQVksQ0FDN0IsZUFBZSxDQUFFLFNBQVMsQUFBRSxDQUFDLEFBRXJDLEVBQUUsNEJBQUMsQ0FBQyxBQUNGLFNBQVMsQ0FBRSxJQUFJLENBQ2YsTUFBTSxDQUFFLENBQUMsQ0FDVCxVQUFVLENBQUUsTUFBTSxDQUNsQixPQUFPLENBQUUsTUFBTSxBQUFFLENBQUMsQUFFcEIsR0FBRyw0QkFBQyxDQUFDLEFBQ0gsT0FBTyxDQUFFLFlBQVksQUFBRSxDQUFDLEFBRTFCLEVBQUUsNEJBQUMsQ0FBQyxBQUNGLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLE9BQU8sQ0FBRSxDQUFDLENBQ1YsTUFBTSxDQUFFLENBQUMsQUFBRSxDQUFDLEFBRWQsRUFBRSw0QkFBQyxDQUFDLEFBQ0YsT0FBTyxDQUFFLFlBQVksQ0FDckIsT0FBTyxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function create_fragment$2(ctx) {
    	let header;
    	let h1;
    	let img;
    	let img_src_value;
    	let t0;
    	let nav;
    	let ul;
    	let li0;
    	let t1_value = /*$_*/ ctx[0]("header.about") + "";
    	let t1;
    	let t2;
    	let li1;
    	let t3_value = /*$_*/ ctx[0]("header.case") + "";
    	let t3;
    	let t4;
    	let li2;
    	let t5_value = /*$_*/ ctx[0]("header.charges") + "";
    	let t5;
    	let t6;
    	let li3;
    	let t7_value = /*$_*/ ctx[0]("header.contractOut") + "";
    	let t7;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			img = element("img");
    			t0 = space();
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			t1 = text(t1_value);
    			t2 = space();
    			li1 = element("li");
    			t3 = text(t3_value);
    			t4 = space();
    			li2 = element("li");
    			t5 = text(t5_value);
    			t6 = space();
    			li3 = element("li");
    			t7 = text(t7_value);
    			if (img.src !== (img_src_value = logoSrc)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "nes-avatar svelte-2l4tuq");
    			add_location(img, file$1, 6, 6, 160);
    			attr_dev(h1, "class", "svelte-2l4tuq");
    			add_location(h1, file$1, 6, 2, 156);
    			attr_dev(li0, "class", "svelte-2l4tuq");
    			add_location(li0, file$1, 9, 6, 236);
    			attr_dev(li1, "class", "svelte-2l4tuq");
    			add_location(li1, file$1, 10, 6, 272);
    			attr_dev(li2, "class", "svelte-2l4tuq");
    			add_location(li2, file$1, 11, 6, 307);
    			attr_dev(li3, "class", "svelte-2l4tuq");
    			add_location(li3, file$1, 12, 6, 345);
    			attr_dev(ul, "class", "svelte-2l4tuq");
    			add_location(ul, file$1, 8, 4, 225);
    			attr_dev(nav, "class", "svelte-2l4tuq");
    			add_location(nav, file$1, 7, 2, 214);
    			attr_dev(header, "class", "container svelte-2l4tuq");
    			add_location(header, file$1, 5, 0, 127);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    			append_dev(h1, img);
    			append_dev(header, t0);
    			append_dev(header, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, t1);
    			append_dev(ul, t2);
    			append_dev(ul, li1);
    			append_dev(li1, t3);
    			append_dev(ul, t4);
    			append_dev(ul, li2);
    			append_dev(li2, t5);
    			append_dev(ul, t6);
    			append_dev(ul, li3);
    			append_dev(li3, t7);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$_*/ 1 && t1_value !== (t1_value = /*$_*/ ctx[0]("header.about") + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$_*/ 1 && t3_value !== (t3_value = /*$_*/ ctx[0]("header.case") + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*$_*/ 1 && t5_value !== (t5_value = /*$_*/ ctx[0]("header.charges") + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*$_*/ 1 && t7_value !== (t7_value = /*$_*/ ctx[0]("header.contractOut") + "")) set_data_dev(t7, t7_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const logoSrc = "image/logo.png";

    function instance$2($$self, $$props, $$invalidate) {
    	let $_;
    	validate_store(_, "_");
    	component_subscribe($$self, _, $$value => $$invalidate(0, $_ = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Header", $$slots, []);
    	$$self.$capture_state = () => ({ _, Hamburger, logoSrc, $_ });
    	return [$_];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-2l4tuq-style")) add_css$1();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/About/About.svelte generated by Svelte v3.20.1 */
    const file$2 = "src/components/About/About.svelte";

    function create_fragment$3(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t0_value = /*$_*/ ctx[2]("about.title") + "";
    	let t0;
    	let t1;
    	let p0;
    	let t2;
    	let t3;
    	let p1;
    	let t4;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			p0 = element("p");
    			t2 = text(/*firstContent*/ ctx[0]);
    			t3 = space();
    			p1 = element("p");
    			t4 = text(/*secondContent*/ ctx[1]);
    			attr_dev(h2, "class", "title");
    			add_location(h2, file$2, 18, 4, 589);
    			add_location(p0, file$2, 19, 4, 636);
    			add_location(p1, file$2, 20, 4, 662);
    			attr_dev(div0, "class", "nes-container with-title");
    			add_location(div0, file$2, 17, 2, 546);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file$2, 16, 0, 520);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t0);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(p0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, p1);
    			append_dev(p1, t4);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$_*/ 4 && t0_value !== (t0_value = /*$_*/ ctx[2]("about.title") + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*firstContent*/ 1) set_data_dev(t2, /*firstContent*/ ctx[0]);
    			if (dirty & /*secondContent*/ 2) set_data_dev(t4, /*secondContent*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $_;
    	validate_store(_, "_");
    	component_subscribe($$self, _, $$value => $$invalidate(2, $_ = $$value));
    	let firstContent = "";
    	let secondContent = "";
    	const content = [$_("about.first"), $_("about.second")];

    	const typeWriter = () => {
    		if (firstContent.length < content[0].length) {
    			$$invalidate(0, firstContent = content[0].substr(0, firstContent.length + 1));
    			setTimeout(typeWriter, 50);
    		} else if (secondContent.length < content[1].length) {
    			$$invalidate(1, secondContent = content[1].substr(0, secondContent.length + 1));
    			setTimeout(typeWriter, 50);
    		}
    	};

    	typeWriter();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("About", $$slots, []);

    	$$self.$capture_state = () => ({
    		_,
    		firstContent,
    		secondContent,
    		content,
    		typeWriter,
    		$_
    	});

    	$$self.$inject_state = $$props => {
    		if ("firstContent" in $$props) $$invalidate(0, firstContent = $$props.firstContent);
    		if ("secondContent" in $$props) $$invalidate(1, secondContent = $$props.secondContent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [firstContent, secondContent, $_];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/components/Modal/Modal.svelte generated by Svelte v3.20.1 */

    const { Object: Object_1 } = globals;
    const file$3 = "src/components/Modal/Modal.svelte";

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-1j3nkw2-style";
    	style.textContent = ".svelte-1j3nkw2{-webkit-box-sizing:border-box;box-sizing:border-box}.bg.svelte-1j3nkw2{position:fixed;z-index:1000;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;width:100vw;height:100vh;background:rgba(0, 0, 0, 0.66)}.window-wrap.svelte-1j3nkw2{position:relative;margin:2rem;max-height:100%}.window.svelte-1j3nkw2{position:relative;width:40rem;max-width:100%;max-height:100%;margin:2rem auto;color:black;border-radius:0.5rem;background:white}.content.svelte-1j3nkw2{position:relative;padding:1rem;max-height:calc(100vh - 4rem);overflow:auto}.close.svelte-1j3nkw2{display:block;-webkit-box-sizing:border-box;box-sizing:border-box;position:absolute;z-index:1000;top:1rem;right:1rem;margin:0;padding:0;width:1.5rem;height:1.5rem;border:0;color:black;border-radius:1.5rem;background:white;-webkit-box-shadow:0 0 0 1px black;box-shadow:0 0 0 1px black;-webkit-transition:background 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),\n              -webkit-transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);transition:background 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),\n              -webkit-transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);transition:transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),\n              background 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);transition:transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),\n              background 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),\n              -webkit-transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);-webkit-appearance:none}.close.svelte-1j3nkw2:before,.close.svelte-1j3nkw2:after{content:'';display:block;-webkit-box-sizing:border-box;box-sizing:border-box;position:absolute;top:50%;width:1rem;height:1px;background:black;-webkit-transform-origin:center;transform-origin:center;-webkit-transition:height 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),\n              background 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);transition:height 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),\n              background 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)}.close.svelte-1j3nkw2:before{-webkit-transform:translate(0, -50%) rotate(45deg);transform:translate(0, -50%) rotate(45deg);left:0.25rem}.close.svelte-1j3nkw2:after{-webkit-transform:translate(0, -50%) rotate(-45deg);transform:translate(0, -50%) rotate(-45deg);left:0.25rem}.close.svelte-1j3nkw2:hover{background:black}.close.svelte-1j3nkw2:hover:before,.close.svelte-1j3nkw2:hover:after{height:2px;background:white}.close.svelte-1j3nkw2:focus{border-color:#3399ff;-webkit-box-shadow:0 0 0 2px #3399ff;box-shadow:0 0 0 2px #3399ff}.close.svelte-1j3nkw2:active{-webkit-transform:scale(0.9);transform:scale(0.9)}.close.svelte-1j3nkw2:hover,.close.svelte-1j3nkw2:focus,.close.svelte-1j3nkw2:active{outline:none}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kYWwuc3ZlbHRlIiwic291cmNlcyI6WyJNb2RhbC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiXG48c2NyaXB0PlxuXHQvLyBWZXJzaW9uIDAuNC4xXG4gIGltcG9ydCB7IHNldENvbnRleHQgYXMgYmFzZVNldENvbnRleHQgfSBmcm9tICdzdmVsdGUnO1xuICBpbXBvcnQgeyBmYWRlIH0gZnJvbSAnc3ZlbHRlL3RyYW5zaXRpb24nO1xuXG4gIGV4cG9ydCBsZXQga2V5ID0gJ3NpbXBsZS1tb2RhbCc7XG4gIGV4cG9ydCBsZXQgY2xvc2VCdXR0b24gPSB0cnVlO1xuICBleHBvcnQgbGV0IGNsb3NlT25Fc2MgPSB0cnVlO1xuICBleHBvcnQgbGV0IGNsb3NlT25PdXRlckNsaWNrID0gdHJ1ZTtcbiAgZXhwb3J0IGxldCBzdHlsZUJnID0geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgZXhwb3J0IGxldCBzdHlsZVdpbmRvdyA9IHt9O1xuICBleHBvcnQgbGV0IHN0eWxlQ29udGVudCA9IHt9O1xuICBleHBvcnQgbGV0IHNldENvbnRleHQgPSBiYXNlU2V0Q29udGV4dDtcbiAgZXhwb3J0IGxldCB0cmFuc2l0aW9uQmcgPSBmYWRlO1xuICBleHBvcnQgbGV0IHRyYW5zaXRpb25CZ1Byb3BzID0geyBkdXJhdGlvbjogMjUwIH07XG4gIGV4cG9ydCBsZXQgdHJhbnNpdGlvbldpbmRvdyA9IHRyYW5zaXRpb25CZztcbiAgZXhwb3J0IGxldCB0cmFuc2l0aW9uV2luZG93UHJvcHMgPSB0cmFuc2l0aW9uQmdQcm9wcztcblxuICBjb25zdCBkZWZhdWx0U3RhdGUgPSB7XG4gICAgY2xvc2VCdXR0b24sXG4gICAgY2xvc2VPbkVzYyxcbiAgICBjbG9zZU9uT3V0ZXJDbGljayxcbiAgICBzdHlsZUJnLFxuICAgIHN0eWxlV2luZG93LFxuICAgIHN0eWxlQ29udGVudCxcbiAgICB0cmFuc2l0aW9uQmcsXG4gICAgdHJhbnNpdGlvbkJnUHJvcHMsXG4gICAgdHJhbnNpdGlvbldpbmRvdyxcbiAgICB0cmFuc2l0aW9uV2luZG93UHJvcHMsXG4gIH07XG4gIGxldCBzdGF0ZSA9IHsgLi4uZGVmYXVsdFN0YXRlIH07XG5cbiAgbGV0IENvbXBvbmVudCA9IG51bGw7XG4gIGxldCBwcm9wcyA9IG51bGw7XG5cbiAgbGV0IGJhY2tncm91bmQ7XG4gIGxldCB3cmFwO1xuXG4gIGNvbnN0IGNhbWVsQ2FzZVRvRGFzaCA9IHN0ciA9PiBzdHJcbiAgICAucmVwbGFjZSgvKFthLXpBLVpdKSg/PVtBLVpdKS9nLCAnJDEtJykudG9Mb3dlckNhc2UoKTtcblxuICBjb25zdCB0b0Nzc1N0cmluZyA9IChwcm9wcykgPT4gT2JqZWN0LmtleXMocHJvcHMpXG4gICAgLnJlZHVjZSgoc3RyLCBrZXkpID0+IGAke3N0cn07ICR7Y2FtZWxDYXNlVG9EYXNoKGtleSl9OiAke3Byb3BzW2tleV19YCwgJycpO1xuXG4gICQ6IGNzc0JnID0gdG9Dc3NTdHJpbmcoc3RhdGUuc3R5bGVCZyk7XG4gICQ6IGNzc1dpbmRvdyA9IHRvQ3NzU3RyaW5nKHN0YXRlLnN0eWxlV2luZG93KTtcbiAgJDogY3NzQ29udGVudCA9IHRvQ3NzU3RyaW5nKHN0YXRlLnN0eWxlQ29udGVudCk7XG4gICQ6IGN1cnJlbnRUcmFuc2l0aW9uQmcgPSBzdGF0ZS50cmFuc2l0aW9uQmc7XG4gICQ6IGN1cnJlbnRUcmFuc2l0aW9uV2luZG93ID0gc3RhdGUudHJhbnNpdGlvbldpbmRvdztcblxuICBjb25zdCB0b1ZvaWQgPSAoKSA9PiB7fTtcbiAgbGV0IG9uT3BlbiA9IHRvVm9pZDtcbiAgbGV0IG9uQ2xvc2UgPSB0b1ZvaWQ7XG4gIGxldCBvbk9wZW5lZCA9IHRvVm9pZDtcbiAgbGV0IG9uQ2xvc2VkID0gdG9Wb2lkO1xuXG4gIGNvbnN0IG9wZW4gPSAoXG4gICAgTmV3Q29tcG9uZW50LFxuICAgIG5ld1Byb3BzID0ge30sXG4gICAgb3B0aW9ucyA9IHt9LFxuICAgIGNhbGxiYWNrID0ge31cbiAgKSA9PiB7XG4gICAgQ29tcG9uZW50ID0gTmV3Q29tcG9uZW50O1xuICAgIHByb3BzID0gbmV3UHJvcHM7XG4gICAgc3RhdGUgPSB7IC4uLmRlZmF1bHRTdGF0ZSwgLi4ub3B0aW9ucyB9O1xuICAgIG9uT3BlbiA9IGNhbGxiYWNrLm9uT3BlbiB8fCB0b1ZvaWQ7XG4gICAgb25DbG9zZSA9IGNhbGxiYWNrLm9uQ2xvc2UgfHwgdG9Wb2lkO1xuICAgIG9uT3BlbmVkID0gY2FsbGJhY2sub25PcGVuZWQgfHwgdG9Wb2lkO1xuICAgIG9uQ2xvc2VkID0gY2FsbGJhY2sub25DbG9zZWQgfHwgdG9Wb2lkO1xuICB9O1xuXG4gIGNvbnN0IGNsb3NlID0gKGNhbGxiYWNrID0ge30pID0+IHtcbiAgICBvbkNsb3NlID0gY2FsbGJhY2sub25DbG9zZSB8fCBvbkNsb3NlO1xuICAgIG9uQ2xvc2VkID0gY2FsbGJhY2sub25DbG9zZWQgfHwgb25DbG9zZWQ7XG4gICAgQ29tcG9uZW50ID0gbnVsbDtcbiAgICBwcm9wcyA9IG51bGw7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlS2V5dXAgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoc3RhdGUuY2xvc2VPbkVzYyAmJiBDb21wb25lbnQgJiYgZXZlbnQua2V5ID09PSAnRXNjYXBlJykge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGNsb3NlKCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGhhbmRsZU91dGVyQ2xpY2sgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoXG4gICAgICBzdGF0ZS5jbG9zZU9uT3V0ZXJDbGljayAmJiAoXG4gICAgICAgIGV2ZW50LnRhcmdldCA9PT0gYmFja2dyb3VuZCB8fCBldmVudC50YXJnZXQgPT09IHdyYXBcbiAgICAgIClcbiAgICApIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBjbG9zZSgpO1xuICAgIH1cbiAgfTtcblxuICBzZXRDb250ZXh0KGtleSwgeyBvcGVuLCBjbG9zZSB9KTtcbjwvc2NyaXB0PlxuXG48c3R5bGU+XG4qIHtcbiAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG59XG5cbi5iZyB7XG4gIHBvc2l0aW9uOiBmaXhlZDtcbiAgei1pbmRleDogMTAwMDtcbiAgZGlzcGxheTogLXdlYmtpdC1ib3g7XG4gIGRpc3BsYXk6IC1tcy1mbGV4Ym94O1xuICBkaXNwbGF5OiBmbGV4O1xuICAtd2Via2l0LWJveC1vcmllbnQ6IHZlcnRpY2FsO1xuICAtd2Via2l0LWJveC1kaXJlY3Rpb246IG5vcm1hbDtcbiAgICAgIC1tcy1mbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgICAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIC13ZWJraXQtYm94LXBhY2s6IGNlbnRlcjtcbiAgICAgIC1tcy1mbGV4LXBhY2s6IGNlbnRlcjtcbiAgICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgd2lkdGg6IDEwMHZ3O1xuICBoZWlnaHQ6IDEwMHZoO1xuICBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuNjYpO1xufVxuXG4ud2luZG93LXdyYXAge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIG1hcmdpbjogMnJlbTtcbiAgbWF4LWhlaWdodDogMTAwJTtcbn1cblxuLndpbmRvdyB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgd2lkdGg6IDQwcmVtO1xuICBtYXgtd2lkdGg6IDEwMCU7XG4gIG1heC1oZWlnaHQ6IDEwMCU7XG4gIG1hcmdpbjogMnJlbSBhdXRvO1xuICBjb2xvcjogYmxhY2s7XG4gIGJvcmRlci1yYWRpdXM6IDAuNXJlbTtcbiAgYmFja2dyb3VuZDogd2hpdGU7XG59XG5cbi5jb250ZW50IHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBwYWRkaW5nOiAxcmVtO1xuICBtYXgtaGVpZ2h0OiBjYWxjKDEwMHZoIC0gNHJlbSk7XG4gIG92ZXJmbG93OiBhdXRvO1xufVxuXG4uY2xvc2Uge1xuICBkaXNwbGF5OiBibG9jaztcbiAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgei1pbmRleDogMTAwMDtcbiAgdG9wOiAxcmVtO1xuICByaWdodDogMXJlbTtcbiAgbWFyZ2luOiAwO1xuICBwYWRkaW5nOiAwO1xuICB3aWR0aDogMS41cmVtO1xuICBoZWlnaHQ6IDEuNXJlbTtcbiAgYm9yZGVyOiAwO1xuICBjb2xvcjogYmxhY2s7XG4gIGJvcmRlci1yYWRpdXM6IDEuNXJlbTtcbiAgYmFja2dyb3VuZDogd2hpdGU7XG4gIC13ZWJraXQtYm94LXNoYWRvdzogMCAwIDAgMXB4IGJsYWNrO1xuICAgICAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCBibGFjaztcbiAgLXdlYmtpdC10cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIDAuMnMgY3ViaWMtYmV6aWVyKDAuMjUsIDAuMSwgMC4yNSwgMSksXG4gICAgICAgICAgICAgIC13ZWJraXQtdHJhbnNmb3JtIDAuMnMgY3ViaWMtYmV6aWVyKDAuMjUsIDAuMSwgMC4yNSwgMSk7XG4gIHRyYW5zaXRpb246IGJhY2tncm91bmQgMC4ycyBjdWJpYy1iZXppZXIoMC4yNSwgMC4xLCAwLjI1LCAxKSxcbiAgICAgICAgICAgICAgLXdlYmtpdC10cmFuc2Zvcm0gMC4ycyBjdWJpYy1iZXppZXIoMC4yNSwgMC4xLCAwLjI1LCAxKTtcbiAgdHJhbnNpdGlvbjogdHJhbnNmb3JtIDAuMnMgY3ViaWMtYmV6aWVyKDAuMjUsIDAuMSwgMC4yNSwgMSksXG4gICAgICAgICAgICAgIGJhY2tncm91bmQgMC4ycyBjdWJpYy1iZXppZXIoMC4yNSwgMC4xLCAwLjI1LCAxKTtcbiAgdHJhbnNpdGlvbjogdHJhbnNmb3JtIDAuMnMgY3ViaWMtYmV6aWVyKDAuMjUsIDAuMSwgMC4yNSwgMSksXG4gICAgICAgICAgICAgIGJhY2tncm91bmQgMC4ycyBjdWJpYy1iZXppZXIoMC4yNSwgMC4xLCAwLjI1LCAxKSxcbiAgICAgICAgICAgICAgLXdlYmtpdC10cmFuc2Zvcm0gMC4ycyBjdWJpYy1iZXppZXIoMC4yNSwgMC4xLCAwLjI1LCAxKTtcbiAgLXdlYmtpdC1hcHBlYXJhbmNlOiBub25lO1xufVxuXG4uY2xvc2U6YmVmb3JlLCAuY2xvc2U6YWZ0ZXIge1xuICBjb250ZW50OiAnJztcbiAgZGlzcGxheTogYmxvY2s7XG4gIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHRvcDogNTAlO1xuICB3aWR0aDogMXJlbTtcbiAgaGVpZ2h0OiAxcHg7XG4gIGJhY2tncm91bmQ6IGJsYWNrO1xuICAtd2Via2l0LXRyYW5zZm9ybS1vcmlnaW46IGNlbnRlcjtcbiAgICAgICAgICB0cmFuc2Zvcm0tb3JpZ2luOiBjZW50ZXI7XG4gIC13ZWJraXQtdHJhbnNpdGlvbjogaGVpZ2h0IDAuMnMgY3ViaWMtYmV6aWVyKDAuMjUsIDAuMSwgMC4yNSwgMSksXG4gICAgICAgICAgICAgIGJhY2tncm91bmQgMC4ycyBjdWJpYy1iZXppZXIoMC4yNSwgMC4xLCAwLjI1LCAxKTtcbiAgdHJhbnNpdGlvbjogaGVpZ2h0IDAuMnMgY3ViaWMtYmV6aWVyKDAuMjUsIDAuMSwgMC4yNSwgMSksXG4gICAgICAgICAgICAgIGJhY2tncm91bmQgMC4ycyBjdWJpYy1iZXppZXIoMC4yNSwgMC4xLCAwLjI1LCAxKTtcbn1cblxuLmNsb3NlOmJlZm9yZSB7XG4gIC13ZWJraXQtdHJhbnNmb3JtOiB0cmFuc2xhdGUoMCwgLTUwJSkgcm90YXRlKDQ1ZGVnKTtcbiAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoMCwgLTUwJSkgcm90YXRlKDQ1ZGVnKTtcbiAgbGVmdDogMC4yNXJlbTtcbn1cblxuLmNsb3NlOmFmdGVyIHtcbiAgLXdlYmtpdC10cmFuc2Zvcm06IHRyYW5zbGF0ZSgwLCAtNTAlKSByb3RhdGUoLTQ1ZGVnKTtcbiAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoMCwgLTUwJSkgcm90YXRlKC00NWRlZyk7XG4gIGxlZnQ6IDAuMjVyZW07XG59XG5cbi5jbG9zZTpob3ZlciB7XG4gIGJhY2tncm91bmQ6IGJsYWNrO1xufVxuXG4uY2xvc2U6aG92ZXI6YmVmb3JlLCAuY2xvc2U6aG92ZXI6YWZ0ZXIge1xuICBoZWlnaHQ6IDJweDtcbiAgYmFja2dyb3VuZDogd2hpdGU7XG59XG5cbi5jbG9zZTpmb2N1cyB7XG4gIGJvcmRlci1jb2xvcjogIzMzOTlmZjtcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiAwIDAgMCAycHggIzMzOTlmZjtcbiAgICAgICAgICBib3gtc2hhZG93OiAwIDAgMCAycHggIzMzOTlmZjtcbn1cblxuLmNsb3NlOmFjdGl2ZSB7XG4gIC13ZWJraXQtdHJhbnNmb3JtOiBzY2FsZSgwLjkpO1xuICAgICAgICAgIHRyYW5zZm9ybTogc2NhbGUoMC45KTtcbn1cblxuLmNsb3NlOmhvdmVyLCAuY2xvc2U6Zm9jdXMsIC5jbG9zZTphY3RpdmUge1xuICBvdXRsaW5lOiBub25lO1xufVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW5OeVl5OWpiMjF3YjI1bGJuUnpMMDF2WkdGc0wwMXZaR0ZzTG5OMlpXeDBaU0pkTENKdVlXMWxjeUk2VzEwc0ltMWhjSEJwYm1keklqb2lPMEZCUTBFN1JVRkRSU3c0UWtGQmMwSTdWVUZCZEVJc2MwSkJRWE5DTzBGQlEzaENPenRCUVVWQk8wVkJRMFVzWlVGQlpUdEZRVU5tTEdGQlFXRTdSVUZEWWl4dlFrRkJZVHRGUVVGaUxHOUNRVUZoTzBWQlFXSXNZVUZCWVR0RlFVTmlMRFJDUVVGelFqdEZRVUYwUWl3MlFrRkJjMEk3VFVGQmRFSXNNRUpCUVhOQ08xVkJRWFJDTEhOQ1FVRnpRanRGUVVOMFFpeDNRa0ZCZFVJN1RVRkJka0lzY1VKQlFYVkNPMVZCUVhaQ0xIVkNRVUYxUWp0RlFVTjJRaXhaUVVGWk8wVkJRMW9zWVVGQllUdEZRVU5pTEN0Q1FVRXJRanRCUVVOcVF6czdRVUZGUVR0RlFVTkZMR3RDUVVGclFqdEZRVU5zUWl4WlFVRlpPMFZCUTFvc1owSkJRV2RDTzBGQlEyeENPenRCUVVWQk8wVkJRMFVzYTBKQlFXdENPMFZCUTJ4Q0xGbEJRVms3UlVGRFdpeGxRVUZsTzBWQlEyWXNaMEpCUVdkQ08wVkJRMmhDTEdsQ1FVRnBRanRGUVVOcVFpeFpRVUZaTzBWQlExb3NjVUpCUVhGQ08wVkJRM0pDTEdsQ1FVRnBRanRCUVVOdVFqczdRVUZGUVR0RlFVTkZMR3RDUVVGclFqdEZRVU5zUWl4aFFVRmhPMFZCUTJJc09FSkJRVGhDTzBWQlF6bENMR05CUVdNN1FVRkRhRUk3TzBGQlJVRTdSVUZEUlN4alFVRmpPMFZCUTJRc09FSkJRWE5DTzFWQlFYUkNMSE5DUVVGelFqdEZRVU4wUWl4clFrRkJhMEk3UlVGRGJFSXNZVUZCWVR0RlFVTmlMRk5CUVZNN1JVRkRWQ3hYUVVGWE8wVkJRMWdzVTBGQlV6dEZRVU5VTEZWQlFWVTdSVUZEVml4aFFVRmhPMFZCUTJJc1kwRkJZenRGUVVOa0xGTkJRVk03UlVGRFZDeFpRVUZaTzBWQlExb3NjVUpCUVhGQ08wVkJRM0pDTEdsQ1FVRnBRanRGUVVOcVFpeHRRMEZCTWtJN1ZVRkJNMElzTWtKQlFUSkNPMFZCUXpOQ08zRkZRVU0wUkR0RlFVUTFSRHR4UlVGRE5FUTdSVUZFTlVRN09FUkJRelJFTzBWQlJEVkVPenR4UlVGRE5FUTdSVUZETlVRc2QwSkJRWGRDTzBGQlF6RkNPenRCUVVWQk8wVkJRMFVzVjBGQlZ6dEZRVU5ZTEdOQlFXTTdSVUZEWkN3NFFrRkJjMEk3VlVGQmRFSXNjMEpCUVhOQ08wVkJRM1JDTEd0Q1FVRnJRanRGUVVOc1FpeFJRVUZSTzBWQlExSXNWMEZCVnp0RlFVTllMRmRCUVZjN1JVRkRXQ3hwUWtGQmFVSTdSVUZEYWtJc1owTkJRWGRDTzFWQlFYaENMSGRDUVVGM1FqdEZRVU40UWpzNFJFRkRORVE3UlVGRU5VUTdPRVJCUXpSRU8wRkJRemxFT3p0QlFVVkJPMFZCUTBVc2JVUkJRVzFFTzBWQlJXNUVMREpEUVVFeVF6dEZRVU16UXl4aFFVRmhPMEZCUTJZN08wRkJSVUU3UlVGRFJTeHZSRUZCYjBRN1JVRkZjRVFzTkVOQlFUUkRPMFZCUXpWRExHRkJRV0U3UVVGRFpqczdRVUZGUVR0RlFVTkZMR2xDUVVGcFFqdEJRVU51UWpzN1FVRkZRVHRGUVVORkxGZEJRVmM3UlVGRFdDeHBRa0ZCYVVJN1FVRkRia0k3TzBGQlJVRTdSVUZEUlN4eFFrRkJjVUk3UlVGRGNrSXNjVU5CUVRaQ08xVkJRVGRDTERaQ1FVRTJRanRCUVVNdlFqczdRVUZGUVR0RlFVTkZMRFpDUVVGeFFqdFZRVUZ5UWl4eFFrRkJjVUk3UVVGRGRrSTdPMEZCUlVFN1JVRkRSU3hoUVVGaE8wRkJRMllpTENKbWFXeGxJam9pYzNKakwyTnZiWEJ2Ym1WdWRITXZUVzlrWVd3dlRXOWtZV3d1YzNabGJIUmxJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpWEc0cUlIdGNiaUFnWW05NExYTnBlbWx1WnpvZ1ltOXlaR1Z5TFdKdmVEdGNibjFjYmx4dUxtSm5JSHRjYmlBZ2NHOXphWFJwYjI0NklHWnBlR1ZrTzF4dUlDQjZMV2x1WkdWNE9pQXhNREF3TzF4dUlDQmthWE53YkdGNU9pQm1iR1Y0TzF4dUlDQm1iR1Y0TFdScGNtVmpkR2x2YmpvZ1kyOXNkVzF1TzF4dUlDQnFkWE4wYVdaNUxXTnZiblJsYm5RNklHTmxiblJsY2p0Y2JpQWdkMmxrZEdnNklERXdNSFozTzF4dUlDQm9aV2xuYUhRNklERXdNSFpvTzF4dUlDQmlZV05yWjNKdmRXNWtPaUJ5WjJKaEtEQXNJREFzSURBc0lEQXVOallwTzF4dWZWeHVYRzR1ZDJsdVpHOTNMWGR5WVhBZ2UxeHVJQ0J3YjNOcGRHbHZiam9nY21Wc1lYUnBkbVU3WEc0Z0lHMWhjbWRwYmpvZ01uSmxiVHRjYmlBZ2JXRjRMV2hsYVdkb2REb2dNVEF3SlR0Y2JuMWNibHh1TG5kcGJtUnZkeUI3WEc0Z0lIQnZjMmwwYVc5dU9pQnlaV3hoZEdsMlpUdGNiaUFnZDJsa2RHZzZJRFF3Y21WdE8xeHVJQ0J0WVhndGQybGtkR2c2SURFd01DVTdYRzRnSUcxaGVDMW9aV2xuYUhRNklERXdNQ1U3WEc0Z0lHMWhjbWRwYmpvZ01uSmxiU0JoZFhSdk8xeHVJQ0JqYjJ4dmNqb2dZbXhoWTJzN1hHNGdJR0p2Y21SbGNpMXlZV1JwZFhNNklEQXVOWEpsYlR0Y2JpQWdZbUZqYTJkeWIzVnVaRG9nZDJocGRHVTdYRzU5WEc1Y2JpNWpiMjUwWlc1MElIdGNiaUFnY0c5emFYUnBiMjQ2SUhKbGJHRjBhWFpsTzF4dUlDQndZV1JrYVc1bk9pQXhjbVZ0TzF4dUlDQnRZWGd0YUdWcFoyaDBPaUJqWVd4aktERXdNSFpvSUMwZ05ISmxiU2s3WEc0Z0lHOTJaWEptYkc5M09pQmhkWFJ2TzF4dWZWeHVYRzR1WTJ4dmMyVWdlMXh1SUNCa2FYTndiR0Y1T2lCaWJHOWphenRjYmlBZ1ltOTRMWE5wZW1sdVp6b2dZbTl5WkdWeUxXSnZlRHRjYmlBZ2NHOXphWFJwYjI0NklHRmljMjlzZFhSbE8xeHVJQ0I2TFdsdVpHVjRPaUF4TURBd08xeHVJQ0IwYjNBNklERnlaVzA3WEc0Z0lISnBaMmgwT2lBeGNtVnRPMXh1SUNCdFlYSm5hVzQ2SURBN1hHNGdJSEJoWkdScGJtYzZJREE3WEc0Z0lIZHBaSFJvT2lBeExqVnlaVzA3WEc0Z0lHaGxhV2RvZERvZ01TNDFjbVZ0TzF4dUlDQmliM0prWlhJNklEQTdYRzRnSUdOdmJHOXlPaUJpYkdGamF6dGNiaUFnWW05eVpHVnlMWEpoWkdsMWN6b2dNUzQxY21WdE8xeHVJQ0JpWVdOclozSnZkVzVrT2lCM2FHbDBaVHRjYmlBZ1ltOTRMWE5vWVdSdmR6b2dNQ0F3SURBZ01YQjRJR0pzWVdOck8xeHVJQ0IwY21GdWMybDBhVzl1T2lCMGNtRnVjMlp2Y20wZ01DNHljeUJqZFdKcFl5MWlaWHBwWlhJb01DNHlOU3dnTUM0eExDQXdMakkxTENBeEtTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1ltRmphMmR5YjNWdVpDQXdMakp6SUdOMVltbGpMV0psZW1sbGNpZ3dMakkxTENBd0xqRXNJREF1TWpVc0lERXBPMXh1SUNBdGQyVmlhMmwwTFdGd2NHVmhjbUZ1WTJVNklHNXZibVU3WEc1OVhHNWNiaTVqYkc5elpUcGlaV1p2Y21Vc0lDNWpiRzl6WlRwaFpuUmxjaUI3WEc0Z0lHTnZiblJsYm5RNklDY25PMXh1SUNCa2FYTndiR0Y1T2lCaWJHOWphenRjYmlBZ1ltOTRMWE5wZW1sdVp6b2dZbTl5WkdWeUxXSnZlRHRjYmlBZ2NHOXphWFJwYjI0NklHRmljMjlzZFhSbE8xeHVJQ0IwYjNBNklEVXdKVHRjYmlBZ2QybGtkR2c2SURGeVpXMDdYRzRnSUdobGFXZG9kRG9nTVhCNE8xeHVJQ0JpWVdOclozSnZkVzVrT2lCaWJHRmphenRjYmlBZ2RISmhibk5tYjNKdExXOXlhV2RwYmpvZ1kyVnVkR1Z5TzF4dUlDQjBjbUZ1YzJsMGFXOXVPaUJvWldsbmFIUWdNQzR5Y3lCamRXSnBZeTFpWlhwcFpYSW9NQzR5TlN3Z01DNHhMQ0F3TGpJMUxDQXhLU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZbUZqYTJkeWIzVnVaQ0F3TGpKeklHTjFZbWxqTFdKbGVtbGxjaWd3TGpJMUxDQXdMakVzSURBdU1qVXNJREVwTzF4dWZWeHVYRzR1WTJ4dmMyVTZZbVZtYjNKbElIdGNiaUFnTFhkbFltdHBkQzEwY21GdWMyWnZjbTA2SUhSeVlXNXpiR0YwWlNnd0xDQXROVEFsS1NCeWIzUmhkR1VvTkRWa1pXY3BPMXh1SUNBdGJXOTZMWFJ5WVc1elptOXliVG9nZEhKaGJuTnNZWFJsS0RBc0lDMDFNQ1VwSUhKdmRHRjBaU2cwTldSbFp5azdYRzRnSUhSeVlXNXpabTl5YlRvZ2RISmhibk5zWVhSbEtEQXNJQzAxTUNVcElISnZkR0YwWlNnME5XUmxaeWs3WEc0Z0lHeGxablE2SURBdU1qVnlaVzA3WEc1OVhHNWNiaTVqYkc5elpUcGhablJsY2lCN1hHNGdJQzEzWldKcmFYUXRkSEpoYm5ObWIzSnRPaUIwY21GdWMyeGhkR1VvTUN3Z0xUVXdKU2tnY205MFlYUmxLQzAwTldSbFp5azdYRzRnSUMxdGIzb3RkSEpoYm5ObWIzSnRPaUIwY21GdWMyeGhkR1VvTUN3Z0xUVXdKU2tnY205MFlYUmxLQzAwTldSbFp5azdYRzRnSUhSeVlXNXpabTl5YlRvZ2RISmhibk5zWVhSbEtEQXNJQzAxTUNVcElISnZkR0YwWlNndE5EVmtaV2NwTzF4dUlDQnNaV1owT2lBd0xqSTFjbVZ0TzF4dWZWeHVYRzR1WTJ4dmMyVTZhRzkyWlhJZ2UxeHVJQ0JpWVdOclozSnZkVzVrT2lCaWJHRmphenRjYm4xY2JseHVMbU5zYjNObE9taHZkbVZ5T21KbFptOXlaU3dnTG1Oc2IzTmxPbWh2ZG1WeU9tRm1kR1Z5SUh0Y2JpQWdhR1ZwWjJoME9pQXljSGc3WEc0Z0lHSmhZMnRuY205MWJtUTZJSGRvYVhSbE8xeHVmVnh1WEc0dVkyeHZjMlU2Wm05amRYTWdlMXh1SUNCaWIzSmtaWEl0WTI5c2IzSTZJQ016TXprNVptWTdYRzRnSUdKdmVDMXphR0ZrYjNjNklEQWdNQ0F3SURKd2VDQWpNek01T1dabU8xeHVmVnh1WEc0dVkyeHZjMlU2WVdOMGFYWmxJSHRjYmlBZ2RISmhibk5tYjNKdE9pQnpZMkZzWlNnd0xqa3BPMXh1ZlZ4dVhHNHVZMnh2YzJVNmFHOTJaWElzSUM1amJHOXpaVHBtYjJOMWN5d2dMbU5zYjNObE9tRmpkR2wyWlNCN1hHNGdJRzkxZEd4cGJtVTZJRzV2Ym1VN1hHNTlYRzRpWFgwPSAqLzwvc3R5bGU+XG5cbjxzdmVsdGU6d2luZG93IG9uOmtleXVwPXtoYW5kbGVLZXl1cH0vPlxuXG57I2lmIENvbXBvbmVudH1cbiAgPGRpdlxuICAgIGNsYXNzPVwiYmdcIlxuICAgIG9uOmNsaWNrPXtoYW5kbGVPdXRlckNsaWNrfVxuICAgIGJpbmQ6dGhpcz17YmFja2dyb3VuZH1cbiAgICB0cmFuc2l0aW9uOmN1cnJlbnRUcmFuc2l0aW9uQmc9e3N0YXRlLnRyYW5zaXRpb25CZ1Byb3BzfVxuICAgIHN0eWxlPXtjc3NCZ31cbiAgPlxuICAgIDxkaXYgY2xhc3M9XCJ3aW5kb3ctd3JhcFwiIGJpbmQ6dGhpcz17d3JhcH0+XG4gICAgICA8ZGl2XG4gICAgICAgIGNsYXNzPVwid2luZG93XCJcbiAgICAgICAgdHJhbnNpdGlvbjpjdXJyZW50VHJhbnNpdGlvbldpbmRvdz17c3RhdGUudHJhbnNpdGlvbldpbmRvd1Byb3BzfVxuICAgICAgICBvbjppbnRyb3N0YXJ0PXtvbk9wZW59XG4gICAgICAgIG9uOm91dHJvc3RhcnQ9e29uQ2xvc2V9XG4gICAgICAgIG9uOmludHJvZW5kPXtvbk9wZW5lZH1cbiAgICAgICAgb246b3V0cm9lbmQ9e29uQ2xvc2VkfVxuICAgICAgICBzdHlsZT17Y3NzV2luZG93fVxuICAgICAgPlxuICAgICAgICB7I2lmIHN0YXRlLmNsb3NlQnV0dG9ufVxuICAgICAgICAgIDxidXR0b24gb246Y2xpY2s9e2Nsb3NlfSBjbGFzcz1cImNsb3NlXCI+PC9idXR0b24+XG4gICAgICAgIHsvaWZ9XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCIgc3R5bGU9e2Nzc0NvbnRlbnR9PlxuICAgICAgICAgIDxzdmVsdGU6Y29tcG9uZW50IHRoaXM9e0NvbXBvbmVudH0gey4uLnByb3BzfSAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cbnsvaWZ9XG48c2xvdD48L3Nsb3Q+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBcUdBLGVBQUUsQ0FBQyxBQUNELGtCQUFrQixDQUFFLFVBQVUsQ0FDdEIsVUFBVSxDQUFFLFVBQVUsQUFDaEMsQ0FBQyxBQUVELEdBQUcsZUFBQyxDQUFDLEFBQ0gsUUFBUSxDQUFFLEtBQUssQ0FDZixPQUFPLENBQUUsSUFBSSxDQUNiLE9BQU8sQ0FBRSxXQUFXLENBQ3BCLE9BQU8sQ0FBRSxXQUFXLENBQ3BCLE9BQU8sQ0FBRSxJQUFJLENBQ2Isa0JBQWtCLENBQUUsUUFBUSxDQUM1QixxQkFBcUIsQ0FBRSxNQUFNLENBQ3pCLGtCQUFrQixDQUFFLE1BQU0sQ0FDdEIsY0FBYyxDQUFFLE1BQU0sQ0FDOUIsZ0JBQWdCLENBQUUsTUFBTSxDQUNwQixhQUFhLENBQUUsTUFBTSxDQUNqQixlQUFlLENBQUUsTUFBTSxDQUMvQixLQUFLLENBQUUsS0FBSyxDQUNaLE1BQU0sQ0FBRSxLQUFLLENBQ2IsVUFBVSxDQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEFBQ2pDLENBQUMsQUFFRCxZQUFZLGVBQUMsQ0FBQyxBQUNaLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE1BQU0sQ0FBRSxJQUFJLENBQ1osVUFBVSxDQUFFLElBQUksQUFDbEIsQ0FBQyxBQUVELE9BQU8sZUFBQyxDQUFDLEFBQ1AsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsS0FBSyxDQUFFLEtBQUssQ0FDWixTQUFTLENBQUUsSUFBSSxDQUNmLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLE1BQU0sQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUNqQixLQUFLLENBQUUsS0FBSyxDQUNaLGFBQWEsQ0FBRSxNQUFNLENBQ3JCLFVBQVUsQ0FBRSxLQUFLLEFBQ25CLENBQUMsQUFFRCxRQUFRLGVBQUMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsVUFBVSxDQUFFLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDOUIsUUFBUSxDQUFFLElBQUksQUFDaEIsQ0FBQyxBQUVELE1BQU0sZUFBQyxDQUFDLEFBQ04sT0FBTyxDQUFFLEtBQUssQ0FDZCxrQkFBa0IsQ0FBRSxVQUFVLENBQ3RCLFVBQVUsQ0FBRSxVQUFVLENBQzlCLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsR0FBRyxDQUFFLElBQUksQ0FDVCxLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxDQUFDLENBQ1QsT0FBTyxDQUFFLENBQUMsQ0FDVixLQUFLLENBQUUsTUFBTSxDQUNiLE1BQU0sQ0FBRSxNQUFNLENBQ2QsTUFBTSxDQUFFLENBQUMsQ0FDVCxLQUFLLENBQUUsS0FBSyxDQUNaLGFBQWEsQ0FBRSxNQUFNLENBQ3JCLFVBQVUsQ0FBRSxLQUFLLENBQ2pCLGtCQUFrQixDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQzNCLFVBQVUsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUNuQyxrQkFBa0IsQ0FBRSxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Y0FDekQsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ25FLFVBQVUsQ0FBRSxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Y0FDakQsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ25FLFVBQVUsQ0FBRSxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Y0FDaEQsVUFBVSxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUM1RCxVQUFVLENBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2NBQ2hELFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztjQUNqRCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDbkUsa0JBQWtCLENBQUUsSUFBSSxBQUMxQixDQUFDLEFBRUQscUJBQU0sT0FBTyxDQUFFLHFCQUFNLE1BQU0sQUFBQyxDQUFDLEFBQzNCLE9BQU8sQ0FBRSxFQUFFLENBQ1gsT0FBTyxDQUFFLEtBQUssQ0FDZCxrQkFBa0IsQ0FBRSxVQUFVLENBQ3RCLFVBQVUsQ0FBRSxVQUFVLENBQzlCLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEdBQUcsQ0FBRSxHQUFHLENBQ1IsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsR0FBRyxDQUNYLFVBQVUsQ0FBRSxLQUFLLENBQ2pCLHdCQUF3QixDQUFFLE1BQU0sQ0FDeEIsZ0JBQWdCLENBQUUsTUFBTSxDQUNoQyxrQkFBa0IsQ0FBRSxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Y0FDckQsVUFBVSxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUM1RCxVQUFVLENBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2NBQzdDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFDOUQsQ0FBQyxBQUVELHFCQUFNLE9BQU8sQUFBQyxDQUFDLEFBQ2IsaUJBQWlCLENBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUNuRCxTQUFTLENBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUMzQyxJQUFJLENBQUUsT0FBTyxBQUNmLENBQUMsQUFFRCxxQkFBTSxNQUFNLEFBQUMsQ0FBQyxBQUNaLGlCQUFpQixDQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FDcEQsU0FBUyxDQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FDNUMsSUFBSSxDQUFFLE9BQU8sQUFDZixDQUFDLEFBRUQscUJBQU0sTUFBTSxBQUFDLENBQUMsQUFDWixVQUFVLENBQUUsS0FBSyxBQUNuQixDQUFDLEFBRUQscUJBQU0sTUFBTSxPQUFPLENBQUUscUJBQU0sTUFBTSxNQUFNLEFBQUMsQ0FBQyxBQUN2QyxNQUFNLENBQUUsR0FBRyxDQUNYLFVBQVUsQ0FBRSxLQUFLLEFBQ25CLENBQUMsQUFFRCxxQkFBTSxNQUFNLEFBQUMsQ0FBQyxBQUNaLFlBQVksQ0FBRSxPQUFPLENBQ3JCLGtCQUFrQixDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQzdCLFVBQVUsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxBQUN2QyxDQUFDLEFBRUQscUJBQU0sT0FBTyxBQUFDLENBQUMsQUFDYixpQkFBaUIsQ0FBRSxNQUFNLEdBQUcsQ0FBQyxDQUNyQixTQUFTLENBQUUsTUFBTSxHQUFHLENBQUMsQUFDL0IsQ0FBQyxBQUVELHFCQUFNLE1BQU0sQ0FBRSxxQkFBTSxNQUFNLENBQUUscUJBQU0sT0FBTyxBQUFDLENBQUMsQUFDekMsT0FBTyxDQUFFLElBQUksQUFDZixDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    // (237:0) {#if Component}
    function create_if_block(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let t;
    	let div0;
    	let div1_transition;
    	let div3_transition;
    	let current;
    	let dispose;
    	let if_block = /*state*/ ctx[0].closeButton && create_if_block_1(ctx);
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*Component*/ ctx[1];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			div0 = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(div0, "class", "content svelte-1j3nkw2");
    			attr_dev(div0, "style", /*cssContent*/ ctx[11]);
    			add_location(div0, file$3, 257, 8, 10850);
    			attr_dev(div1, "class", "window svelte-1j3nkw2");
    			attr_dev(div1, "style", /*cssWindow*/ ctx[10]);
    			add_location(div1, file$3, 245, 6, 10477);
    			attr_dev(div2, "class", "window-wrap svelte-1j3nkw2");
    			add_location(div2, file$3, 244, 4, 10428);
    			attr_dev(div3, "class", "bg svelte-1j3nkw2");
    			attr_dev(div3, "style", /*cssBg*/ ctx[9]);
    			add_location(div3, file$3, 237, 2, 10262);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t);
    			append_dev(div1, div0);

    			if (switch_instance) {
    				mount_component(switch_instance, div0, null);
    			}

    			/*div2_binding*/ ctx[36](div2);
    			/*div3_binding*/ ctx[37](div3);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(
    					div1,
    					"introstart",
    					function () {
    						if (is_function(/*onOpen*/ ctx[5])) /*onOpen*/ ctx[5].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(
    					div1,
    					"outrostart",
    					function () {
    						if (is_function(/*onClose*/ ctx[6])) /*onClose*/ ctx[6].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(
    					div1,
    					"introend",
    					function () {
    						if (is_function(/*onOpened*/ ctx[7])) /*onOpened*/ ctx[7].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(
    					div1,
    					"outroend",
    					function () {
    						if (is_function(/*onClosed*/ ctx[8])) /*onClosed*/ ctx[8].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(div3, "click", /*handleOuterClick*/ ctx[16], false, false, false)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*state*/ ctx[0].closeButton) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div1, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			const switch_instance_changes = (dirty[0] & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*Component*/ ctx[1])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div0, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}

    			if (!current || dirty[0] & /*cssContent*/ 2048) {
    				attr_dev(div0, "style", /*cssContent*/ ctx[11]);
    			}

    			if (!current || dirty[0] & /*cssWindow*/ 1024) {
    				attr_dev(div1, "style", /*cssWindow*/ ctx[10]);
    			}

    			if (!current || dirty[0] & /*cssBg*/ 512) {
    				attr_dev(div3, "style", /*cssBg*/ ctx[9]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, /*currentTransitionWindow*/ ctx[13], /*state*/ ctx[0].transitionWindowProps, true);
    				div1_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, /*currentTransitionBg*/ ctx[12], /*state*/ ctx[0].transitionBgProps, true);
    				div3_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, /*currentTransitionWindow*/ ctx[13], /*state*/ ctx[0].transitionWindowProps, false);
    			div1_transition.run(0);
    			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, /*currentTransitionBg*/ ctx[12], /*state*/ ctx[0].transitionBgProps, false);
    			div3_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block) if_block.d();
    			if (switch_instance) destroy_component(switch_instance);
    			if (detaching && div1_transition) div1_transition.end();
    			/*div2_binding*/ ctx[36](null);
    			/*div3_binding*/ ctx[37](null);
    			if (detaching && div3_transition) div3_transition.end();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(237:0) {#if Component}",
    		ctx
    	});

    	return block;
    }

    // (255:8) {#if state.closeButton}
    function create_if_block_1(ctx) {
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			attr_dev(button, "class", "close svelte-1j3nkw2");
    			add_location(button, file$3, 255, 10, 10779);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*close*/ ctx[14], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(255:8) {#if state.closeButton}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let t;
    	let current;
    	let dispose;
    	let if_block = /*Component*/ ctx[1] && create_if_block(ctx);
    	const default_slot_template = /*$$slots*/ ctx[35].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[34], null);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(window, "keyup", /*handleKeyup*/ ctx[15], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (/*Component*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty[1] & /*$$scope*/ 8) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[34], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[34], dirty, null));
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { key = "simple-modal" } = $$props;
    	let { closeButton = true } = $$props;
    	let { closeOnEsc = true } = $$props;
    	let { closeOnOuterClick = true } = $$props;
    	let { styleBg = { top: 0, left: 0 } } = $$props;
    	let { styleWindow = {} } = $$props;
    	let { styleContent = {} } = $$props;
    	let { setContext: setContext$1 = setContext } = $$props;
    	let { transitionBg = fade } = $$props;
    	let { transitionBgProps = { duration: 250 } } = $$props;
    	let { transitionWindow = transitionBg } = $$props;
    	let { transitionWindowProps = transitionBgProps } = $$props;

    	const defaultState = {
    		closeButton,
    		closeOnEsc,
    		closeOnOuterClick,
    		styleBg,
    		styleWindow,
    		styleContent,
    		transitionBg,
    		transitionBgProps,
    		transitionWindow,
    		transitionWindowProps
    	};

    	let state = { ...defaultState };
    	let Component = null;
    	let props = null;
    	let background;
    	let wrap;
    	const camelCaseToDash = str => str.replace(/([a-zA-Z])(?=[A-Z])/g, "$1-").toLowerCase();
    	const toCssString = props => Object.keys(props).reduce((str, key) => `${str}; ${camelCaseToDash(key)}: ${props[key]}`, "");

    	const toVoid = () => {
    		
    	};

    	let onOpen = toVoid;
    	let onClose = toVoid;
    	let onOpened = toVoid;
    	let onClosed = toVoid;

    	const open = (NewComponent, newProps = {}, options = {}, callback = {}) => {
    		$$invalidate(1, Component = NewComponent);
    		$$invalidate(2, props = newProps);
    		$$invalidate(0, state = { ...defaultState, ...options });
    		$$invalidate(5, onOpen = callback.onOpen || toVoid);
    		$$invalidate(6, onClose = callback.onClose || toVoid);
    		$$invalidate(7, onOpened = callback.onOpened || toVoid);
    		$$invalidate(8, onClosed = callback.onClosed || toVoid);
    	};

    	const close = (callback = {}) => {
    		$$invalidate(6, onClose = callback.onClose || onClose);
    		$$invalidate(8, onClosed = callback.onClosed || onClosed);
    		$$invalidate(1, Component = null);
    		$$invalidate(2, props = null);
    	};

    	const handleKeyup = event => {
    		if (state.closeOnEsc && Component && event.key === "Escape") {
    			event.preventDefault();
    			close();
    		}
    	};

    	const handleOuterClick = event => {
    		if (state.closeOnOuterClick && (event.target === background || event.target === wrap)) {
    			event.preventDefault();
    			close();
    		}
    	};

    	setContext$1(key, { open, close });

    	const writable_props = [
    		"key",
    		"closeButton",
    		"closeOnEsc",
    		"closeOnOuterClick",
    		"styleBg",
    		"styleWindow",
    		"styleContent",
    		"setContext",
    		"transitionBg",
    		"transitionBgProps",
    		"transitionWindow",
    		"transitionWindowProps"
    	];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Modal", $$slots, ['default']);

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, wrap = $$value);
    		});
    	}

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, background = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(17, key = $$props.key);
    		if ("closeButton" in $$props) $$invalidate(18, closeButton = $$props.closeButton);
    		if ("closeOnEsc" in $$props) $$invalidate(19, closeOnEsc = $$props.closeOnEsc);
    		if ("closeOnOuterClick" in $$props) $$invalidate(20, closeOnOuterClick = $$props.closeOnOuterClick);
    		if ("styleBg" in $$props) $$invalidate(21, styleBg = $$props.styleBg);
    		if ("styleWindow" in $$props) $$invalidate(22, styleWindow = $$props.styleWindow);
    		if ("styleContent" in $$props) $$invalidate(23, styleContent = $$props.styleContent);
    		if ("setContext" in $$props) $$invalidate(24, setContext$1 = $$props.setContext);
    		if ("transitionBg" in $$props) $$invalidate(25, transitionBg = $$props.transitionBg);
    		if ("transitionBgProps" in $$props) $$invalidate(26, transitionBgProps = $$props.transitionBgProps);
    		if ("transitionWindow" in $$props) $$invalidate(27, transitionWindow = $$props.transitionWindow);
    		if ("transitionWindowProps" in $$props) $$invalidate(28, transitionWindowProps = $$props.transitionWindowProps);
    		if ("$$scope" in $$props) $$invalidate(34, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		baseSetContext: setContext,
    		fade,
    		key,
    		closeButton,
    		closeOnEsc,
    		closeOnOuterClick,
    		styleBg,
    		styleWindow,
    		styleContent,
    		setContext: setContext$1,
    		transitionBg,
    		transitionBgProps,
    		transitionWindow,
    		transitionWindowProps,
    		defaultState,
    		state,
    		Component,
    		props,
    		background,
    		wrap,
    		camelCaseToDash,
    		toCssString,
    		toVoid,
    		onOpen,
    		onClose,
    		onOpened,
    		onClosed,
    		open,
    		close,
    		handleKeyup,
    		handleOuterClick,
    		cssBg,
    		cssWindow,
    		cssContent,
    		currentTransitionBg,
    		currentTransitionWindow
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(17, key = $$props.key);
    		if ("closeButton" in $$props) $$invalidate(18, closeButton = $$props.closeButton);
    		if ("closeOnEsc" in $$props) $$invalidate(19, closeOnEsc = $$props.closeOnEsc);
    		if ("closeOnOuterClick" in $$props) $$invalidate(20, closeOnOuterClick = $$props.closeOnOuterClick);
    		if ("styleBg" in $$props) $$invalidate(21, styleBg = $$props.styleBg);
    		if ("styleWindow" in $$props) $$invalidate(22, styleWindow = $$props.styleWindow);
    		if ("styleContent" in $$props) $$invalidate(23, styleContent = $$props.styleContent);
    		if ("setContext" in $$props) $$invalidate(24, setContext$1 = $$props.setContext);
    		if ("transitionBg" in $$props) $$invalidate(25, transitionBg = $$props.transitionBg);
    		if ("transitionBgProps" in $$props) $$invalidate(26, transitionBgProps = $$props.transitionBgProps);
    		if ("transitionWindow" in $$props) $$invalidate(27, transitionWindow = $$props.transitionWindow);
    		if ("transitionWindowProps" in $$props) $$invalidate(28, transitionWindowProps = $$props.transitionWindowProps);
    		if ("state" in $$props) $$invalidate(0, state = $$props.state);
    		if ("Component" in $$props) $$invalidate(1, Component = $$props.Component);
    		if ("props" in $$props) $$invalidate(2, props = $$props.props);
    		if ("background" in $$props) $$invalidate(3, background = $$props.background);
    		if ("wrap" in $$props) $$invalidate(4, wrap = $$props.wrap);
    		if ("onOpen" in $$props) $$invalidate(5, onOpen = $$props.onOpen);
    		if ("onClose" in $$props) $$invalidate(6, onClose = $$props.onClose);
    		if ("onOpened" in $$props) $$invalidate(7, onOpened = $$props.onOpened);
    		if ("onClosed" in $$props) $$invalidate(8, onClosed = $$props.onClosed);
    		if ("cssBg" in $$props) $$invalidate(9, cssBg = $$props.cssBg);
    		if ("cssWindow" in $$props) $$invalidate(10, cssWindow = $$props.cssWindow);
    		if ("cssContent" in $$props) $$invalidate(11, cssContent = $$props.cssContent);
    		if ("currentTransitionBg" in $$props) $$invalidate(12, currentTransitionBg = $$props.currentTransitionBg);
    		if ("currentTransitionWindow" in $$props) $$invalidate(13, currentTransitionWindow = $$props.currentTransitionWindow);
    	};

    	let cssBg;
    	let cssWindow;
    	let cssContent;
    	let currentTransitionBg;
    	let currentTransitionWindow;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			 $$invalidate(9, cssBg = toCssString(state.styleBg));
    		}

    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			 $$invalidate(10, cssWindow = toCssString(state.styleWindow));
    		}

    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			 $$invalidate(11, cssContent = toCssString(state.styleContent));
    		}

    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			 $$invalidate(12, currentTransitionBg = state.transitionBg);
    		}

    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			 $$invalidate(13, currentTransitionWindow = state.transitionWindow);
    		}
    	};

    	return [
    		state,
    		Component,
    		props,
    		background,
    		wrap,
    		onOpen,
    		onClose,
    		onOpened,
    		onClosed,
    		cssBg,
    		cssWindow,
    		cssContent,
    		currentTransitionBg,
    		currentTransitionWindow,
    		close,
    		handleKeyup,
    		handleOuterClick,
    		key,
    		closeButton,
    		closeOnEsc,
    		closeOnOuterClick,
    		styleBg,
    		styleWindow,
    		styleContent,
    		setContext$1,
    		transitionBg,
    		transitionBgProps,
    		transitionWindow,
    		transitionWindowProps,
    		defaultState,
    		camelCaseToDash,
    		toCssString,
    		toVoid,
    		open,
    		$$scope,
    		$$slots,
    		div2_binding,
    		div3_binding
    	];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1j3nkw2-style")) add_css$2();

    		init(
    			this,
    			options,
    			instance$4,
    			create_fragment$4,
    			safe_not_equal,
    			{
    				key: 17,
    				closeButton: 18,
    				closeOnEsc: 19,
    				closeOnOuterClick: 20,
    				styleBg: 21,
    				styleWindow: 22,
    				styleContent: 23,
    				setContext: 24,
    				transitionBg: 25,
    				transitionBgProps: 26,
    				transitionWindow: 27,
    				transitionWindowProps: 28
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get key() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get closeButton() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set closeButton(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get closeOnEsc() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set closeOnEsc(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get closeOnOuterClick() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set closeOnOuterClick(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styleBg() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleBg(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styleWindow() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleWindow(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styleContent() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleContent(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setContext() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set setContext(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get transitionBg() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transitionBg(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get transitionBgProps() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transitionBgProps(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get transitionWindow() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transitionWindow(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get transitionWindowProps() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transitionWindowProps(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Case/Case.svelte generated by Svelte v3.20.1 */
    const file$4 = "src/components/Case/Case.svelte";

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-iphryc-style";
    	style.textContent = ".card-container.svelte-iphryc.svelte-iphryc{margin-top:2rem}.row.svelte-iphryc.svelte-iphryc{display:-webkit-box;display:-ms-flexbox;display:flex}.col.svelte-iphryc.svelte-iphryc{width:25%}.card.svelte-iphryc>.nes-container.svelte-iphryc{padding:1.5rem 0  0 0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FzZS5zdmVsdGUiLCJzb3VyY2VzIjpbIkNhc2Uuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IF8gfSBmcm9tICdzdmVsdGUtaW50bCc7XG4gIGltcG9ydCBNb2RhbCBmcm9tICcuLi9Nb2RhbCc7IFxuPC9zY3JpcHQ+XG48TW9kYWw+XG48ZGl2IGNsYXNzPVwiY29udGFpbmVyXCI+XG4gIDxkaXYgY2xhc3M9XCJuZXMtY29udGFpbmVyIHdpdGgtdGl0bGVcIj5cbiAgICA8aDIgY2xhc3M9XCJ0aXRsZVwiPnskXygnY2FzZS50aXRsZScpfTwvaDI+XG4gICAgPGRpdiBjbGFzcz1cImNhcmQtY29udGFpbmVyXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwicm93XCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjb2wgY2FyZFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJuZXMtY29udGFpbmVyIHdpdGgtdGl0bGUgaXMtY2VudGVyZWRcIj5cbiAgICAgICAgICAgIDxwIGNsYXNzPVwidGl0bGUgc21hbGxcIj7nkJvlhYM8L3A+XG4gICAgICAgICAgICA8aW1nIHNyYz1cImltYWdlL2Nhc2UvY2h1bXl1YW4vY2h1bXl1YW4uanBnXCIgYWx0PVwi55Cb5YWDXCI+XG4gICAgICAgICAgPC9kaXY+IFxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cbjwvZGl2PlxuPC9Nb2RhbD5cbjxzdHlsZSBsYW5nPVwic2Nzc1wiPi5jYXJkLWNvbnRhaW5lciB7XG4gIG1hcmdpbi10b3A6IDJyZW07IH1cblxuLnJvdyB7XG4gIGRpc3BsYXk6IC13ZWJraXQtYm94O1xuICBkaXNwbGF5OiAtbXMtZmxleGJveDtcbiAgZGlzcGxheTogZmxleDsgfVxuXG4uY29sIHtcbiAgd2lkdGg6IDI1JTsgfVxuXG4uY2FyZCA+IC5uZXMtY29udGFpbmVyIHtcbiAgcGFkZGluZzogMS41cmVtIDAgIDAgMDsgfVxuLyojIHNvdXJjZU1hcHBpbmdVUkw9c3JjL2NvbXBvbmVudHMvQ2FzZS9DYXNlLnN2ZWx0ZS5tYXAgKi88L3N0eWxlPiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFxQm1CLGVBQWUsNEJBQUMsQ0FBQyxBQUNsQyxVQUFVLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFckIsSUFBSSw0QkFBQyxDQUFDLEFBQ0osT0FBTyxDQUFFLFdBQVcsQ0FDcEIsT0FBTyxDQUFFLFdBQVcsQ0FDcEIsT0FBTyxDQUFFLElBQUksQUFBRSxDQUFDLEFBRWxCLElBQUksNEJBQUMsQ0FBQyxBQUNKLEtBQUssQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUVmLG1CQUFLLENBQUcsY0FBYyxjQUFDLENBQUMsQUFDdEIsT0FBTyxDQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQUFBRSxDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    // (5:0) <Modal>
    function create_default_slot(ctx) {
    	let div5;
    	let div4;
    	let h2;
    	let t0_value = /*$_*/ ctx[0]("case.title") + "";
    	let t0;
    	let t1;
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let p;
    	let t3;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "琛元";
    			t3 = space();
    			img = element("img");
    			attr_dev(h2, "class", "title");
    			add_location(h2, file$4, 7, 4, 164);
    			attr_dev(p, "class", "title small");
    			add_location(p, file$4, 12, 12, 367);
    			if (img.src !== (img_src_value = "image/case/chumyuan/chumyuan.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "琛元");
    			add_location(img, file$4, 13, 12, 409);
    			attr_dev(div0, "class", "nes-container with-title is-centered svelte-iphryc");
    			add_location(div0, file$4, 11, 10, 304);
    			attr_dev(div1, "class", "col card svelte-iphryc");
    			add_location(div1, file$4, 10, 8, 271);
    			attr_dev(div2, "class", "row svelte-iphryc");
    			add_location(div2, file$4, 9, 6, 245);
    			attr_dev(div3, "class", "card-container svelte-iphryc");
    			add_location(div3, file$4, 8, 4, 210);
    			attr_dev(div4, "class", "nes-container with-title");
    			add_location(div4, file$4, 6, 2, 121);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file$4, 5, 0, 95);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, h2);
    			append_dev(h2, t0);
    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(div0, t3);
    			append_dev(div0, img);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$_*/ 1 && t0_value !== (t0_value = /*$_*/ ctx[0]("case.title") + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(5:0) <Modal>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let current;

    	const modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, $_*/ 3) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $_;
    	validate_store(_, "_");
    	component_subscribe($$self, _, $$value => $$invalidate(0, $_ = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Case> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Case", $$slots, []);
    	$$self.$capture_state = () => ({ _, Modal, $_ });
    	return [$_];
    }

    class Case extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-iphryc-style")) add_css$3();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Case",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.20.1 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-1qmh4lq-style";
    	style.textContent = "@font-face{font-family:jackeyfont;src:url(\"font/PixelMplus12-Regular.ttf\")}html,body,pre,code,kbd,samp{font-family:\"Press Start 2P\",jackeyfont;letter-spacing:3px}img{width:100%}.container{padding:15px 6%}.nes-container.with-title > .title{margin-top:-3.5rem;font-size:2rem}.nes-container.with-title > .title.small{font-size:1rem;margin-top:-2.5rem}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuaW1wb3J0IEkxOG4gZnJvbSAnLi9pMThuLnN2ZWx0ZSc7XG5pbXBvcnQgeyBIZWFkZXIsIEFib3V0LENhc2UgfSBmcm9tICcuL2NvbXBvbmVudHMnO1xuPC9zY3JpcHQ+XG48STE4bi8+XG48SGVhZGVyIC8+XG48QWJvdXQgLz5cbjxDYXNlIC8+XG48c3R5bGUgbGFuZz1cInNjc3NcIj5AZm9udC1mYWNlIHtcbiAgZm9udC1mYW1pbHk6IGphY2tleWZvbnQ7XG4gIHNyYzogdXJsKFwiZm9udC9QaXhlbE1wbHVzMTItUmVndWxhci50dGZcIik7IH1cblxuOmdsb2JhbChodG1sKSwgOmdsb2JhbChib2R5KSwgOmdsb2JhbChwcmUpLCA6Z2xvYmFsKGNvZGUpLCA6Z2xvYmFsKGtiZCksIDpnbG9iYWwoc2FtcCkge1xuICBmb250LWZhbWlseTogXCJQcmVzcyBTdGFydCAyUFwiLGphY2tleWZvbnQ7XG4gIGxldHRlci1zcGFjaW5nOiAzcHg7IH1cblxuOmdsb2JhbChpbWcpIHtcbiAgd2lkdGg6IDEwMCU7IH1cblxuOmdsb2JhbCguY29udGFpbmVyKSB7XG4gIHBhZGRpbmc6IDE1cHggNiU7IH1cblxuOmdsb2JhbCgubmVzLWNvbnRhaW5lci53aXRoLXRpdGxlID4gLnRpdGxlKSB7XG4gIG1hcmdpbi10b3A6IC0zLjVyZW07XG4gIGZvbnQtc2l6ZTogMnJlbTsgfVxuICA6Z2xvYmFsKC5uZXMtY29udGFpbmVyLndpdGgtdGl0bGUgPiAudGl0bGUpLnNtYWxsIHtcbiAgICBmb250LXNpemU6IDFyZW07XG4gICAgbWFyZ2luLXRvcDogLTIuNXJlbTsgfVxuLyojIHNvdXJjZU1hcHBpbmdVUkw9c3JjL0FwcC5zdmVsdGUubWFwICovPC9zdHlsZT4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBUW1CLFVBQVUsQUFBQyxDQUFDLEFBQzdCLFdBQVcsQ0FBRSxVQUFVLENBQ3ZCLEdBQUcsQ0FBRSxJQUFJLCtCQUErQixDQUFDLEFBQUUsQ0FBQyxBQUV0QyxJQUFJLEFBQUMsQ0FBVSxJQUFJLEFBQUMsQ0FBVSxHQUFHLEFBQUMsQ0FBVSxJQUFJLEFBQUMsQ0FBVSxHQUFHLEFBQUMsQ0FBVSxJQUFJLEFBQUUsQ0FBQyxBQUN0RixXQUFXLENBQUUsZ0JBQWdCLENBQUMsVUFBVSxDQUN4QyxjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFaEIsR0FBRyxBQUFFLENBQUMsQUFDWixLQUFLLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFUixVQUFVLEFBQUUsQ0FBQyxBQUNuQixPQUFPLENBQUUsSUFBSSxDQUFDLEVBQUUsQUFBRSxDQUFDLEFBRWIsa0NBQWtDLEFBQUUsQ0FBQyxBQUMzQyxVQUFVLENBQUUsT0FBTyxDQUNuQixTQUFTLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDVixrQ0FBa0MsQUFBQyxNQUFNLEFBQUMsQ0FBQyxBQUNqRCxTQUFTLENBQUUsSUFBSSxDQUNmLFVBQVUsQ0FBRSxPQUFPLEFBQUUsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function create_fragment$6(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let current;
    	const i18n = new I18n({ $$inline: true });
    	const header = new Header({ $$inline: true });
    	const about = new About({ $$inline: true });
    	const case_1 = new Case({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(i18n.$$.fragment);
    			t0 = space();
    			create_component(header.$$.fragment);
    			t1 = space();
    			create_component(about.$$.fragment);
    			t2 = space();
    			create_component(case_1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(i18n, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(header, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(about, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(case_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(i18n.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(about.$$.fragment, local);
    			transition_in(case_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(i18n.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(about.$$.fragment, local);
    			transition_out(case_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(i18n, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(about, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(case_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ I18n, Header, About, Case });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1qmh4lq-style")) add_css$4();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
