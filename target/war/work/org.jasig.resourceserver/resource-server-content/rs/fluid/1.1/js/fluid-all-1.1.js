/*
 * jQuery delegate plug-in v1.0
 *
 * Copyright (c) 2007 Jörn Zaefferer
 *
 * $Id: fluid-all-1.1.js 18312 2009-07-19 15:43:27Z bourey $
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

// provides cross-browser focusin and focusout events
// IE has native support, in other browsers, use event caputuring (neither bubbles)

// provides delegate(type: String, delegate: Selector, handler: Callback) plugin for easier event delegation
// handler is only called when $(event.target).is(delegate), in the scope of the jQuery-object for event.target 

// provides triggerEvent(type: String, target: Element) to trigger delegated events
;(function($) {
	$.each({
		focus: 'focusin',
		blur: 'focusout'	
	}, function( original, fix ){
		$.event.special[fix] = {
			setup:function() {
				if ( $.browser.msie ) return false;
				this.addEventListener( original, $.event.special[fix].handler, true );
			},
			teardown:function() {
				if ( $.browser.msie ) return false;
				this.removeEventListener( original,
				$.event.special[fix].handler, true );
			},
			handler: function(e) {
				arguments[0] = $.event.fix(e);
				arguments[0].type = fix;
				return $.event.handle.apply(this, arguments);
			}
		};
	});

	$.extend($.fn, {
		delegate: function(type, delegate, handler) {
			return this.bind(type, function(event) {
				var target = $(event.target);
				if (target.is(delegate)) {
					return handler.apply(target, arguments);
				}
			});
		},
		triggerEvent: function(type, target) {
			return this.triggerHandler(type, [jQuery.event.fix({ type: type, target: target })]);
		}
	})
})(jQuery);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

// Declare dependencies.
/*global jQuery, YAHOO, opera*/

var fluid_1_1 = fluid_1_1 || {};
var fluid = fluid || fluid_1_1;

(function ($, fluid) {
    
    fluid.version = "Infusion 1.1";
    
    /**
     * Causes an error message to be logged to the console and a real runtime error to be thrown.
     * 
     * @param {String|Error} message the error message to log
     */
    fluid.fail = function (message) {
        fluid.setLogging(true);
        fluid.log(message.message? message.message : message);
        throw new Error(message);
        //message.fail(); // Intentionally cause a browser error by invoking a nonexistent function.
    };
    
    /**
     * Wraps an object in a jQuery if it isn't already one. This function is useful since
     * it ensures to wrap a null or otherwise falsy argument to itself, rather than the
     * often unhelpful jQuery default of returning the overall document node.
     * 
     * @param {Object} obj the object to wrap in a jQuery
     */
    fluid.wrap = function (obj) {
        return ((!obj || obj.jquery) ? obj : $(obj)); 
    };
    
    /**
     * If obj is a jQuery, this function will return the first DOM element within it.
     * 
     * @param {jQuery} obj the jQuery instance to unwrap into a pure DOM element
     */
    fluid.unwrap = function (obj) {
        return obj && obj.jquery && obj.length === 1 ? obj[0] : obj; // Unwrap the element if it's a jQuery.
    };
    
    /** 
     * Searches through the supplied object for the first value which matches the one supplied.
     * @param obj {Object} the Object to be searched through
     * @param value {Object} the value to be found. This will be compared against the object's
     * member using === equality.
     * @return {String} The first key whose value matches the one supplied, or <code>null</code> if no
     * such key is found.
     */
    fluid.keyForValue = function (obj, value) {
        for (var key in obj) {
            if (obj[key] === value) {
                return key;
            }
        }
        return null;
    };
    
    /**
     * This method is now deprecated and will be removed in a future release of Infusion. 
     * See fluid.keyForValue instead.
     */
    fluid.findKeyInObject = fluid.keyForValue;
    
    /** 
     * Clears an object or array of its contents. For objects, each property is deleted.
     * 
     * @param {Object|Array} target the target to be cleared
     */
    fluid.clear = function (target) {
        if (target instanceof Array) {
            target.length = 0;
        }
        else {
            for (var i in target) {
                delete target[i];
            }
        }
    };
    
    
    // Framework and instantiation functions.
    
    /**
     * Fetches a single container element and returns it as a jQuery.
     * 
     * @param {String||jQuery||element} an id string, a single-element jQuery, or a DOM element specifying a unique container
     * @return a single-element jQuery of container
     */
    fluid.container = function (containerSpec) {
        var container = containerSpec;
        if (typeof containerSpec === "string" || 
          containerSpec.nodeType && (containerSpec.nodeType === 1  || containerSpec.nodeType === 9)) {
            container = $(containerSpec);
        }
        
        // Throw an exception if we've got more or less than one element.
        if (!container || !container.jquery || container.length !== 1) {
            if (typeof(containerSpec) !== "string") {
                containerSpec = container.selector;
            }
            fluid.fail({
                name: "NotOne",
                message: "A single container element was not found for selector " + containerSpec
            });
        }
        
        return container;
    };
    
    /**
     * Retreives and stores a component's default settings centrally.
     * @param {boolean} (options) if true, manipulate a global option (for the head
     *   component) rather than instance options.
     * @param {String} componentName the name of the component
     * @param {Object} (optional) an container of key/value pairs to set
     * 
     */
    var defaultsStore = {};
    var globalDefaultsStore = {};
    fluid.defaults = function () {
        var offset = 0;
        var store = defaultsStore;
        if (typeof arguments[0] === "boolean") {
            store = globalDefaultsStore;
            offset = 1;
        }
        var componentName = arguments[offset];
        var defaultsObject = arguments[offset + 1];
        if (defaultsObject !== undefined) {
            store[componentName] = defaultsObject;   
            return defaultsObject;
        }
        
        return store[componentName];
    };
    
    /**
     * Creates a new DOM Binder instance, used to locate elements in the DOM by name.
     * 
     * @param {Object} container the root element in which to locate named elements
     * @param {Object} selectors a collection of named jQuery selectors
     */
    fluid.createDomBinder = function (container, selectors) {
        var cache = {}, that = {};
        
        function cacheKey(name, thisContainer) {
            return $.data(fluid.unwrap(thisContainer)) + "-" + name;
        }

        function record(name, thisContainer, result) {
            cache[cacheKey(name, thisContainer)] = result;
        }

        that.locate = function (name, localContainer) {
            var selector, thisContainer, togo;
            
            selector = selectors[name];
            thisContainer = localContainer? localContainer: container;
            if (!thisContainer) {
                fluid.fail("DOM binder invoked for selector " + name + " without container");
            }

            if (!selector) {
                return thisContainer;
            }

            if (typeof(selector) === "function") {
                togo = $(selector.call(null, fluid.unwrap(thisContainer)));
            } else {
                togo = $(selector, thisContainer);
            }
            if (togo.get(0) === document) {
                togo = [];
                //fluid.fail("Selector " + name + " with value " + selectors[name] +
                //            " did not find any elements with container " + fluid.dumpEl(container));
            }
            if (!togo.selector) {
                togo.selector = selector;
                togo.context = thisContainer;
            }
            togo.selectorName = name;
            record(name, thisContainer, togo);
            return togo;
        };
        that.fastLocate = function (name, localContainer) {
            var thisContainer = localContainer? localContainer: container;
            var key = cacheKey(name, thisContainer);
            var togo = cache[key];
            return togo? togo : that.locate(name, localContainer);
        };
        that.clear = function () {
            cache = {};
        };
        that.refresh = function (names, localContainer) {
            var thisContainer = localContainer? localContainer: container;
            if (typeof names === "string") {
                names = [names];
            }
            if (thisContainer.length === undefined) {
                thisContainer = [thisContainer];
            }
            for (var i = 0; i < names.length; ++ i) {
                for (var j = 0; j < thisContainer.length; ++ j) {
                    that.locate(names[i], thisContainer[j]);
                }
            }
        };
        
        return that;
    };
    
    /**
     * Attaches the user's listeners to a set of events.
     * 
     * @param {Object} events a collection of named event firers
     * @param {Object} listeners optional listeners to add
     */
    fluid.mergeListeners = function (events, listeners) {
        if (listeners) {
            for (var key in listeners) {
                var value = listeners[key];
                var keydot = key.indexOf(".");
                var namespace;
                if (keydot !== -1) {
                    namespace = key.substring(keydot + 1);
                    key = key.substring(0, keydot);
                }
                if (!events[key]) {
                    events[key] = fluid.event.getEventFirer();
                }   
                var firer = events[key];
                if (typeof(value) === "function") {
                    firer.addListener(value, namespace);
                }
                else if (value && typeof value.length === "number") {
                    for (var i = 0; i < value.length; ++ i) {
                        firer.addListener(value[i], namespace);
                    }
                }
            }
        }    
    };
    
    /**
     * Sets up a component's declared events.
     * Events are specified in the options object by name. There are three different types of events that can be
     * specified: 
     * 1. an ordinary multicast event, specified by "null. 
     * 2. a unicast event, which allows only one listener to be registered
     * 3. a preventable event
     * 
     * @param {Object} that the component
     * @param {Object} options the component's options structure, containing the declared event names and types
     */
    fluid.instantiateFirers = function (that, options) {
        that.events = {};
        if (options.events) {
            for (var event in options.events) {
                var eventType = options.events[event];
                that.events[event] = fluid.event.getEventFirer(eventType === "unicast", eventType === "preventable");
            }
        }
        fluid.mergeListeners(that.events, options.listeners);
    };
    
    /**
     * Merges the component's declared defaults, as obtained from fluid.defaults(),
     * with the user's specified overrides.
     * 
     * @param {Object} that the instance to attach the options to
     * @param {String} componentName the unique "name" of the component, which will be used
     * to fetch the default options from store. By recommendation, this should be the global
     * name of the component's creator function.
     * @param {Object} userOptions the user-specified configuration options for this component
     */
    fluid.mergeComponentOptions = function (that, componentName, userOptions) {
        var defaults = fluid.defaults(componentName); 
        that.options = fluid.merge(defaults? defaults.mergePolicy: null, {}, defaults, userOptions);    
    };
    
    
    /** Expect that an output from the DOM binder has resulted in a non-empty set of 
     * results. If none are found, this function will fail with a diagnostic message, 
     * with the supplied message prepended.
     */
    fluid.expectFilledSelector = function (result, message) {
        if (result && result.length === 0 && result.jquery) {
            fluid.fail(message + ": selector \"" + result.selector + "\" with name " + result.selectorName +
                       " returned no results in context " + fluid.dumpEl(result.context));
        }
    };
    
    /** 
     * The central initialiation method called as the first act of every Fluid
     * component. This function automatically merges user options with defaults,
     * attaches a DOM Binder to the instance, and configures events.
     * 
     * @param {String} componentName The unique "name" of the component, which will be used
     * to fetch the default options from store. By recommendation, this should be the global
     * name of the component's creator function.
     * @param {jQueryable} container A specifier for the single root "container node" in the
     * DOM which will house all the markup for this component.
     * @param {Object} userOptions The configuration options for this component.
     */
    fluid.initView = function (componentName, container, userOptions) {
        var that = {};
        fluid.expectFilledSelector(container, "Error instantiating component with name \"" + componentName); 
        fluid.mergeComponentOptions(that, componentName, userOptions);
        
        if (container) {
            that.container = fluid.container(container);
            fluid.initDomBinder(that);
        }
        fluid.instantiateFirers(that, that.options);

        return that;
    };
    
    /** A special "marker object" which is recognised as one of the arguments to 
     * fluid.initSubcomponents. This object is recognised by reference equality - 
     * where it is found, it is replaced in the actual argument position supplied
     * to the specific subcomponent instance, with the particular options block
     * for that instance attached to the overall "that" object.
     */
    fluid.COMPONENT_OPTIONS = {};
    
    /** Another special "marker object" representing that a distinguished 
     * (probably context-dependent) value should be substituted.
     */
    fluid.VALUE = {};
    
    /** Construct a dummy or "placeholder" subcomponent, that optionally provides empty
     * implementations for a set of methods.
     */
    fluid.emptySubcomponent = function (options) {
        var that = {};
        options = $.makeArray(options);
        for (var i = 0; i < options.length; ++ i) {
            that[options[i]] = function () {};
        }
        return that;
    };
    
    fluid.initSubcomponent = function (that, className, args) {
        return fluid.initSubcomponents(that, className, args)[0];
    };
    
    /** Initialise all the "subcomponents" which are configured to be attached to 
     * the supplied top-level component, which share a particular "class name".
     * @param {Component} that The top-level component for which sub-components are
     * to be instantiated. It contains specifications for these subcomponents in its
     * <code>options</code> structure.
     * @param {String} className The "class name" or "category" for the subcomponents to
     * be instantiated. A class name specifies an overall "function" for a class of 
     * subcomponents and represents a category which accept the same signature of
     * instantiation arguments.
     * @param {Array of Object} args The instantiation arguments to be passed to each 
     * constructed subcomponent. These will typically be members derived from the
     * top-level <code>that</code> or perhaps globally discovered from elsewhere. One
     * of these arguments may be <code>fluid.COMPONENT_OPTIONS</code> in which case this
     * placeholder argument will be replaced by instance-specific options configured
     * into the member of the top-level <code>options</code> structure named for the
     * <code>className</code>
     * @return {Array of Object} The instantiated subcomponents, one for each member
     * of <code>that.options[className]</code>.
     */
    
    fluid.initSubcomponents = function (that, className, args) {
        var entry = that.options[className];
        if (!entry) {
            return;
        }
        var entries = $.makeArray(entry);
        var optindex = -1;
        var togo = [];
        args = $.makeArray(args);
        for (var i = 0; i < args.length; ++ i) {
            if (args[i] === fluid.COMPONENT_OPTIONS) {
                optindex = i;
            }
        }
        for (i = 0; i < entries.length; ++ i) {
            entry = entries[i];
            if (optindex !== -1 && entry.options) {
                args[optindex] = entry.options;
            }
            if (typeof(entry) !== "function") {
                var entryType = typeof(entry) === "string"? entry : entry.type;
                var globDef = fluid.defaults(true, entryType);
                fluid.merge("reverse", that.options, globDef);
                togo[i] = entryType === "fluid.emptySubcomponent"?
                   fluid.emptySubcomponent(entry.options) : 
                   fluid.invokeGlobalFunction(entryType, args, {fluid: fluid});
            }
            else {
                togo[i] = entry.apply(null, args);
            }

            var returnedOptions = togo[i]? togo[i].returnedOptions : null;
            if (returnedOptions) {
                fluid.merge(that.options.mergePolicy, that.options, returnedOptions);
                if (returnedOptions.listeners) {
                    fluid.mergeListeners(that.events, returnedOptions.listeners);
                }
            }
        }
        return togo;
    };
    
    /**
     * Creates a new DOM Binder instance for the specified component and mixes it in.
     * 
     * @param {Object} that the component instance to attach the new DOM Binder to
     */
    fluid.initDomBinder = function (that) {
        that.dom = fluid.createDomBinder(that.container, that.options.selectors);
        that.locate = that.dom.locate;      
    };
    
    
    /** Returns true if the argument is a primitive type **/
    fluid.isPrimitive = function (value) {
        var valueType = typeof(value);
        return !value || valueType === "string" || valueType === "boolean" || valueType === "number";
    };
        
    function mergeImpl(policy, basePath, target, source) {
        var thisPolicy = policy && typeof(policy) !== "string"? policy[basePath] : policy;
        if (typeof(thisPolicy) === "function") {
            thisPolicy.apply(null, target, source);
            return target;
        }
        if (thisPolicy === "replace") {
            fluid.clear(target);
        }
      
        for (var name in source) {
            var path = (basePath? basePath + ".": "") + name;
            var thisTarget = target[name];
            var thisSource = source[name];
            var primitiveTarget = fluid.isPrimitive(thisTarget);
    
            if (thisSource !== undefined) {
                if (thisSource !== null && typeof thisSource === 'object' &&
                      !thisSource.nodeType && !thisSource.jquery && thisSource !== fluid.VALUE) {
                    if (primitiveTarget) {
                        target[name] = thisTarget = thisSource instanceof Array? [] : {};
                    }
                    mergeImpl(policy, path, thisTarget, thisSource);
                }
                else {
                    if (thisTarget === null || thisTarget === undefined || thisPolicy !== "reverse") {
                        target[name] = thisSource;
                    }
                }
            }
        }
        return target;
    }
    
    /** Merge a collection of options structures onto a target, following an optional policy.
     * This function is typically called automatically, as a result of an invocation of
     * <code>fluid.iniView</code>. The behaviour of this function is explained more fully on
     * the page http://wiki.fluidproject.org/display/fluid/Options+Merging+for+Fluid+Components .
     * @param policy {Object/String} A "policy object" specifiying the type of merge to be performed.
     * If policy is of type {String} it should take on the value "reverse" or "replace" representing
     * a static policy. If it is an
     * Object, it should contain a mapping of EL paths onto these String values, representing a
     * fine-grained policy. If it is an Object, the values may also themselves be EL paths 
     * representing that a default value is to be taken from that path.
     * @param target {Object} The options structure which is to be modified by receiving the merge results.
     * @param options1, options2, .... {Object} an arbitrary list of options structure which are to
     * be merged "on top of" the <code>target</code>. These will not be modified.    
     */
    
    fluid.merge = function (policy, target) {
        var path = "";
        
        for (var i = 2; i < arguments.length; ++i) {
            var source = arguments[i];
            if (source !== null && source !== undefined) {
                mergeImpl(policy, path, target, source);
            }
        }
        if (policy && typeof(policy) !== "string") {
            for (var key in policy) {
                var elrh = policy[key];
                if (typeof(elrh) === 'string' && elrh !== "replace") {
                    var oldValue = fluid.model.getBeanValue(target, key);
                    if (oldValue === null || oldValue === undefined) {
                        var value = fluid.model.getBeanValue(target, elrh);
                        fluid.model.setBeanValue(target, key, value);
                    }
                }
            }
        }
        return target;     
    };
    
    /** Performs a deep copy (clone) of its argument **/
    
    fluid.copy = function (tocopy) {
        if (fluid.isPrimitive(tocopy)) {
            return tocopy;
        }
        return $.extend(true, typeof(tocopy.length) === "number"? [] : {}, tocopy);
    };
    
    /**
     * Allows for the calling of a function from an EL expression "functionPath", with the arguments "args", scoped to an framework version "environment".
     * @param {Object} functionPath - An EL expression
     * @param {Object} args - An array of arguments to be applied to the function, specified in functionPath
     * @param {Object} environment - (optional) The object to scope the functionPath to  (typically the framework root for version control)
     */
    fluid.invokeGlobalFunction = function (functionPath, args, environment) {
        var func = fluid.model.getBeanValue(window, functionPath, environment);
        if (!func) {
            fluid.fail("Error invoking global function: " + functionPath + " could not be located");
        } else {
            return func.apply(null, args);
        }
    };
    
    
    // The Model Events system.
    
    fluid.event = {};
        
    var fluid_guid = 1;
    /** Construct an "event firer" object which can be used to register and deregister 
     * listeners, to which "events" can be fired. These events consist of an arbitrary
     * function signature. General documentation on the Fluid events system is at
     * http://wiki.fluidproject.org/display/fluid/The+Fluid+Event+System .
     * @param {Boolean} unicast If <code>true</code>, this is a "unicast" event which may only accept
     * a single listener.
     * @param {Boolean} preventable If <code>true</code> the return value of each handler will 
     * be checked for <code>false</code> in which case further listeners will be shortcircuited, and this
     * will be the return value of fire()
     */
    
    fluid.event.getEventFirer = function (unicast, preventable) {
        var log = fluid.log;
        var listeners = {};
        return {
            addListener: function (listener, namespace, predicate) {
                if (!listener) {
                    return;
                }
                if (unicast) {
                    namespace = "unicast";
                }
                if (!namespace) {
                    if (!listener.$$guid) {
                        listener.$$guid = fluid_guid++;
                    }
                    namespace = listener.$$guid;
                }

                listeners[namespace] = {listener: listener, predicate: predicate};
            },

            removeListener: function (listener) {
                if (typeof(listener) === 'string') {
                    delete listeners[listener];
                }
                else if (typeof(listener) === 'object' && listener.$$guid) {
                    delete listeners[listener.$$guid];
                }
            },
        
            fire: function () {
                for (var i in listeners) {
                    var lisrec = listeners[i];
                    var listener = lisrec.listener;
                    if (lisrec.predicate && !lisrec.predicate(listener, arguments)) {
                        continue;
                    }
                    try {
                        var ret = listener.apply(null, arguments);
                        if (preventable && ret === false) {
                            return false;
                        }
                    }
                    catch (e) {
                        log("FireEvent received exception " + e.message + " e " + e + " firing to listener " + i);
                        throw (e);       
                    }
                }
            }
        };
    };
    
    
    // Model functions
    
    fluid.model = {};
   
    /** Copy a source "model" onto a target **/
    fluid.model.copyModel = function (target, source) {
        fluid.clear(target);
        $.extend(true, target, source);
    };
    
    /** Parse an EL expression separated by periods (.) into its component segments.
     * @param {String} EL The EL expression to be split
     * @return {Array of String} the component path expressions.
     * TODO: This needs to be upgraded to handle (the same) escaping rules (as RSF), so that
     * path segments containing periods and backslashes etc. can be processed.
     */
    fluid.model.parseEL = function (EL) {
        return EL.toString().split('.');
    };
    
    fluid.model.composePath = function (prefix, suffix) {
        return prefix === ""? suffix : prefix + "." + suffix;
    };

    fluid.model.setBeanValue = function (root, EL, newValue) {
        var segs = fluid.model.parseEL(EL);
        for (var i = 0; i < segs.length - 1; i += 1) {
            if (!root[segs[i]]) {
                root[segs[i]] = {};
            }
            root = root[segs[i]];
        }
        root[segs[segs.length - 1]] = newValue;
    };
    
    /** Evaluates an EL expression by fetching a dot-separated list of members
     * recursively from a provided root.
     * @param root The root data structure in which the EL expression is to be evaluated
     * @param {string} EL The EL expression to be evaluated
     * @param environment An optional "environment" which, if it contains any members
     * at top level, will take priority over the root data structure.
     * @return The fetched data value.
     */
    
    fluid.model.getBeanValue = function (root, EL, environment) {
        if (EL === "" || EL === null || EL === undefined) {
            return root;
        }
        var segs = fluid.model.parseEL(EL);
        for (var i = 0; i < segs.length; ++i) {
            if (!root) {
                return root;
            }
            var segment = segs[i];
            if (environment && environment[segment]) {
                root = environment[segment];
                environment = null;
            }
            else {
                root = root[segment];
            }
        }
        return root;
    };
    
    
    // Logging
    var logging;
    /** method to allow user to enable logging (off by default) */
    fluid.setLogging = function (enabled) {
        if (typeof enabled === "boolean") {
            logging = enabled;
        } else {
            logging = false;
        }
    };

    /** Log a message to a suitable environmental console. If the standard "console" 
     * stream is available, the message will be sent there - otherwise either the
     * YAHOO logger or the Opera "postError" stream will be used. Logging must first
     * be enabled with a call fo the fluid.setLogging(true) function.
     */
    fluid.log = function (str) {
        if (logging) {
            str = new Date().toTimeString() + ":  " + str;
            if (typeof(console) !== "undefined") {
                if (console.debug) {
                    console.debug(str);
                } else {
                    console.log(str);
                }
            }
            else if (typeof(YAHOO) !== "undefined") {
                YAHOO.log(str);
            }
            else if (typeof(opera) !== "undefined") {
                opera.postError(str);
            }
        }
    };
    
    /** 
     * Dumps a DOM element into a readily recognisable form for debugging - produces a
     * "semi-selector" summarising its tag name, class and id, whichever are set.
     * 
     * @param {jQueryable} element The element to be dumped
     * @return A string representing the element.
     */
    fluid.dumpEl = function (element) {
        var togo;
        
        if (!element) {
            return "null";
        }
        if (element.nodeType === 3 || element.nodeType === 8) {
            return "[data: " + element.data + "]";
        } 
        if (element.nodeType === 9) {
            return "[document: location " + element.location + "]";
        }
        if (!element.nodeType && typeof element.length === "number") {
            togo = "[";
            for (var i = 0; i < element.length; ++ i) {
                togo += fluid.dumpEl(element[i]);
                if (i < element.length - 1) {
                    togo += ", ";
                }
            }
            return togo + "]";
        }
        element = $(element);
        togo = element.get(0).tagName;
        if (element.attr("id")) {
            togo += "#" + element.attr("id");
        }
        if (element.attr("class")) {
            togo += "." + element.attr("class");
        }
        return togo;
    };

    // DOM Utilities.
    
    /**
     * Finds the nearest ancestor of the element that passes the test
     * @param {Element} element DOM element
     * @param {Function} test A function which takes an element as a parameter and return true or false for some test
     */
    fluid.findAncestor = function (element, test) {
        element = fluid.unwrap(element);
        while (element) {
            if (test(element)) {
                return element;
            }
            element = element.parentNode;
        }
    };
    
    /**
     * Returns a jQuery object given the id of a DOM node. In the case the element
     * is not found, will return an empty list.
     */
    fluid.jById = function (id, dokkument) {
        dokkument = dokkument && dokkument.nodeType === 9? dokkument : document;
        var element = fluid.byId(id, dokkument);
        var togo = element? $(element) : [];
        togo.selector = "#" + id;
        togo.context = dokkument;
        return togo;
    };
    
    /**
     * Returns an DOM element quickly, given an id
     * 
     * @param {Object} id the id of the DOM node to find
     * @param {Document} dokkument the document in which it is to be found (if left empty, use the current document)
     * @return The DOM element with this id, or null, if none exists in the document.
     */
    fluid.byId = function (id, dokkument) {
        dokkument = dokkument && dokkument.nodeType === 9? dokkument : document;
        var el = dokkument.getElementById(id);
        if (el) {
            if (el.getAttribute("id") !== id) {
                fluid.fail("Problem in document structure - picked up element " +
                fluid.dumpEl(el) +
                " for id " +
                id +
                " without this id - most likely the element has a name which conflicts with this id");
            }
            return el;
        }
        else {
            return null;
        }
    };
    
    /**
     * Returns the id attribute from a jQuery or pure DOM element.
     * 
     * @param {jQuery||Element} element the element to return the id attribute for
     */
    fluid.getId = function (element) {
        return fluid.unwrap(element).getAttribute("id");
    };
    
    /** 
     * Allocate an id to the supplied element if it has none already, by a simple
     * scheme resulting in ids "fluid-id-nnnn" where nnnn is an increasing integer.
     */
    
    fluid.allocateSimpleId = function (element) {
        element = fluid.unwrap(element);
        if (!element.id) {
            element.id = "fluid-id-" + (fluid_guid++); 
        }
        return element.id;
    };
    
        
    // Functional programming utilities.
    
    /** Return a list of objects, transformed by one or more functions. Similar to
     * jQuery.map, only will accept an arbitrary list of transformation functions.
     * @param list {Array} The initial array of objects to be transformed.
     * @param fn1, fn2, etc. {Function} An arbitrary number of optional further arguments,
     * all of type Function, accepting the signature (object, index), where object is the
     * list member to be transformed, and index is its list index. Each function will be
     * applied in turn to each list member, which will be replaced by the return value
     * from the function.
     * @return The finally transformed list, where each member has been replaced by the
     * original member acted on by the function or functions.
     */
    fluid.transform = function (list) {
        var togo = [];
        for (var i = 0; i < list.length; ++ i) {
            var transit = list[i];
            for (var j = 0; j < arguments.length - 1; ++ j) {
                transit = arguments[j + 1](transit, i);
            }
            togo[togo.length] = transit;
        }
        return togo;
    };
    
    /** Scan through a list of objects, terminating on and returning the first member which
     * matches a predicate function.
     * @param list {Array} The list of objects to be searched.
     * @param fn {Function} A predicate function, acting on a list member. A predicate which
     * returns any value which is not <code>null</code> or <code>undefined</code> will terminate
     * the search. The function accepts (object, index).
     * @param deflt {Object} A value to be returned in the case no predicate function matches
     * a list member. The default will be the natural value of <code>undefined</code>
     * @return The first return value from the predicate function which is not <code>null</code>
     * or <code>undefined</code>
     */
    fluid.find = function (list, fn, deflt) {
        for (var i = 0; i < list.length; ++ i) {
            var transit = fn(list[i], i);
            if (transit !== null && transit !== undefined) {
                return transit;
            }
        }
        return deflt;
    };
    
    /** Scan through a list of objects, "accumulating" a value over them 
     * (may be a straightforward "sum" or some other chained computation).
     * @param list {Array} The list of objects to be accumulated over.
     * @param fn {Function} An "accumulation function" accepting the signature (object, total, index) where
     * object is the list member, total is the "running total" object (which is the return value from the previous function),
     * and index is the index number.
     * @param arg {Object} The initial value for the "running total" object.
     * @return {Object} the final running total object as returned from the final invocation of the function on the last list member.
     */
    fluid.accumulate = function (list, fn, arg) {
        for (var i = 0; i < list.length; ++ i) {
            arg = fn(list[i], arg, i);
        }
        return arg;
    };
    
    /** Can through a list of objects, removing those which match a predicate. Similar to
     * jQuery.grep, only acts on the list in-place by removal, rather than by creating
     * a new list by inclusion.
     * @param list {Array} The list of objects to be scanned over.
     * @param fn {Function} A predicate function determining whether an element should be
     * removed. This accepts the standard signature (object, index) and returns a "truthy"
     * result in order to determine that the supplied object should be removed from the list.
     * @return The list, transformed by the operation of removing the matched elements. The
     * supplied list is modified by this operation.
     */
    fluid.remove_if = function (list, fn) {
        for (var i = 0; i < list.length; ++ i) {
            if (fn(list[i], i)) {
                list.splice(i, 1);
                --i;
            }
        }
        return list;
    };
    
    /** 
     * Expand a message string with respect to a set of arguments, following a basic
     * subset of the Java MessageFormat rules. 
     * http://java.sun.com/j2se/1.4.2/docs/api/java/text/MessageFormat.html
     * 
     * The message string is expected to contain replacement specifications such
     * as {0}, {1}, {2}, etc.
     * @param messageString {String} The message key to be expanded
     * @param args {String/Array of String} An array of arguments to be substituted into the message.
     * @return The expanded message string. 
     */
    fluid.formatMessage = function (messageString, args) {
        if (!args) {
            return messageString;
        } 
        if (typeof(args) === "string") {
            args = [args];
        }
        for (var i = 0; i < args.length; ++ i) {
            messageString = messageString.replace("{" + i + "}", args[i]);
        }
        return messageString;
    };
    
    /** Converts a data structure consisting of a mapping of keys to message strings,
     * into a "messageLocator" function which maps an array of message codes, to be 
     * tried in sequence until a key is found, and an array of substitution arguments,
     * into a substituted message string.
     */
    fluid.messageLocator = function (messageBase) {
        return function (messagecodes, args) {
            if (typeof(messagecodes) === "string") {
                messagecodes = [messagecodes];
            }
            for (var i = 0; i < messagecodes.length; ++ i) {
                var code = messagecodes[i];
                var message = messageBase[code];
                if (message === undefined) {
                    continue;
                }
                return fluid.formatMessage(message, args);
            }
            return "[Message string for key " + messagecodes[0] + " not found]";
        };
    };
    
    // Other useful helpers.
    
    /**
     * Simple string template system. 
     * Takes a template string containing tokens in the form of "%value".
     * Returns a new string with the tokens replaced by the specified values.
     * Keys and values can be of any data type that can be coerced into a string. Arrays will work here as well.
     * 
     * @param {String}    template    a string (can be HTML) that contains tokens embedded into it
     * @param {object}    values        a collection of token keys and values
     */
    fluid.stringTemplate = function (template, values) {
        var newString = template;
        for (var key in values) {
            if (values.hasOwnProperty(key)) {
                var searchStr = "%" + key;
                newString = newString.replace(searchStr, values[key]);
            }
        }
        return newString;
    };
    
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

// Declare dependencies.
/*global jQuery */

var fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
    
    fluid.dom = fluid.dom || {};
    
    // Node walker function for iterateDom.
    var getNextNode = function (iterator) {
        if (iterator.node.firstChild) {
            iterator.node = iterator.node.firstChild;
            iterator.depth += 1;
            return iterator;
        }
        while (iterator.node) {
            if (iterator.node.nextSibling) {
                iterator.node = iterator.node.nextSibling;
                return iterator;
            }
            iterator.node = iterator.node.parentNode;
            iterator.depth -= 1;
        }
        return iterator;
    };
    
    /**
     * Walks the DOM, applying the specified acceptor function to each element.
     * There is a special case for the acceptor, allowing for quick deletion of elements and their children.
     * Return "delete" from your acceptor function if you want to delete the element in question.
     * Return "stop" to terminate iteration.
     * 
     * @param {Element} node the node to start walking from
     * @param {Function} acceptor the function to invoke with each DOM element
     * @param {Boolean} allnodes Use <code>true</code> to call acceptor on all nodes, 
     * rather than just element nodes (type 1)
     */
    fluid.dom.iterateDom = function (node, acceptor, allNodes) {
        var currentNode = {node: node, depth: 0};
        var prevNode = node;
        var condition;
        while (currentNode.node !== null && currentNode.depth >= 0 && currentNode.depth < fluid.dom.iterateDom.DOM_BAIL_DEPTH) {
            condition = null;
            if (currentNode.node.nodeType === 1 || allNodes) {
                condition = acceptor(currentNode.node, currentNode.depth);
            }
            if (condition) {
                if (condition === "delete") {
                    currentNode.node.parentNode.removeChild(currentNode.node);
                    currentNode.node = prevNode;
                }
                else if (condition === "stop") {
                    return currentNode.node;
                }
            }
            prevNode = currentNode.node;
            currentNode = getNextNode(currentNode);
        }
    };
    
    // Work around IE circular DOM issue. This is the default max DOM depth on IE.
    // http://msdn2.microsoft.com/en-us/library/ms761392(VS.85).aspx
    fluid.dom.iterateDom.DOM_BAIL_DEPTH = 256;
    
    /** 
     * Returns the absolute position of a supplied DOM node in pixels.
     * Implementation taken from quirksmode http://www.quirksmode.org/js/findpos.html
     */
    fluid.dom.computeAbsolutePosition = function (element) {
        var curleft = 0, curtop = 0;
        if (element.offsetParent) {
            do {
                curleft += element.offsetLeft;
                curtop += element.offsetTop;
                element = element.offsetParent;
            } while (element);
            return [curleft, curtop];
        }
    };
    
    /**
     * Checks if the sepcified container is actually the parent of containee.
     * 
     * @param {Element} container the potential parent
     * @param {Element} containee the child in question
     */
    fluid.dom.isContainer = function (container, containee) {
        for (; containee; containee = containee.parentNode) {
            if (container === containee) {
                return true;
            }
        }
        return false;
    };
    
    /**
     * Inserts newChild as the next sibling of refChild.
     * @param {Object} newChild
     * @param {Object} refChild
     */
    fluid.dom.insertAfter = function (newChild, refChild) {
        var nextSib = refChild.nextSibling;
        if (!nextSib) {
            refChild.parentNode.appendChild(newChild);
        }
        else {
            refChild.parentNode.insertBefore(newChild, nextSib);
        }
    };
    
    // The following two functions taken from http://developer.mozilla.org/En/Whitespace_in_the_DOM
    /**
     * Determine whether a node's text content is entirely whitespace.
     *
     * @param node  A node implementing the |CharacterData| interface (i.e.,
     *              a |Text|, |Comment|, or |CDATASection| node
     * @return     True if all of the text content of |nod| is whitespace,
     *             otherwise false.
     */
    fluid.dom.isWhitespaceNode = function (node) {
       // Use ECMA-262 Edition 3 String and RegExp features
        return !(/[^\t\n\r ]/.test(node.data));
    };
    
    /**
     * Determine if a node should be ignored by the iterator functions.
     *
     * @param nod  An object implementing the DOM1 |Node| interface.
     * @return     true if the node is:
     *                1) A |Text| node that is all whitespace
     *                2) A |Comment| node
     *             and otherwise false.
     */
    fluid.dom.isIgnorableNode = function (node) {
        return (node.nodeType === 8) || // A comment node
         ((node.nodeType === 3) && fluid.dom.isWhitespaceNode(node)); // a text node, all ws
    };
    
    /** Return the element text from the supplied DOM node as a single String */
    fluid.dom.getElementText = function(element) {
        var nodes = element.childNodes;
        var text = "";
        for (var i = 0; i < nodes.length; ++ i) {
          var child = nodes[i];
          if (child.nodeType == 3) {
            text = text + child.nodeValue;
            }
          }
        return text; 
    };
    
    /** 
     * Cleanse the children of a DOM node by removing all <script> tags.
     * This is necessary to prevent the possibility that these blocks are
     * reevaluated if the node were reattached to the document. 
     */
    fluid.dom.cleanseScripts = function (element) {
        var cleansed = $.data(element, fluid.dom.cleanseScripts.MARKER);
        if (!cleansed) {
            fluid.dom.iterateDom(element, function (node) {
                return node.tagName.toLowerCase() === "script"? "delete" : null;
            });
            $.data(element, fluid.dom.cleanseScripts.MARKER, true);
        }
    };  
    fluid.dom.cleanseScripts.MARKER = "fluid-scripts-cleansed";
    
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
    
    fluid.VALUE = {};
    
    fluid.BINDING_ROOT_KEY = "fluid-binding-root";
    
    /** Recursively find any data stored under a given name from a node upwards
     * in its DOM hierarchy **/
     
    fluid.findData = function(elem, name) {
        while (elem) {
            var data = $.data(elem, name);
            if (data) {return data;}
            elem = elem.parentNode;
            }
        };
  
    fluid.bindFossils = function(node, data, fossils) {
        $.data(node, fluid.BINDING_ROOT_KEY, {data: data, fossils: fossils});
        };
  
    fluid.findForm = function (node) {
      return fluid.findAncestor(node, 
          function(element) {return element.nodeName.toLowerCase() === "form";});
    };
    
    /** A generalisation of jQuery.val to correctly handle the case of acquiring and
     * setting the value of clustered radio button/checkbox sets, potentially, given
     * a node corresponding to just one element.
     */
    fluid.value = function (nodeIn, newValue) {
        var node = fluid.unwrap(nodeIn);
        var multiple = false;
        if (node.nodeType === undefined && node.length > 1) {
            node = node[0];
            multiple = true;
        }
        var jNode = $(node);
        if ("input" !== node.nodeName.toLowerCase()
           || ! /radio|checkbox/.test(node.type)) {return $(node).val(newValue);}
        var name = node.name;
        if (name === undefined) {
            fluid.fail("Cannot acquire value from node " + fluid.dumpEl(node) + " which does not have name attribute set");
        }
        var elements;
        if (multiple) {
            elements = nodeIn;
        }
        else {
            var elements = document.getElementsByName(name);
            var scope = fluid.findForm(node);
            elements = $.grep(elements, 
              function(element) {
                if (element.name !== name) {return false;}
                return !scope || fluid.dom.isContainer(scope, element);
              });
        }
        if (newValue !== undefined) {
            if (typeof(newValue) === "boolean") {
                newValue = (newValue? "true" : "false");
            }
          // jQuery gets this partially right, but when dealing with radio button array will
          // set all of their values to "newValue" rather than setting the checked property
          // of the corresponding control. 
            $.each(elements, function() {
               this.checked = (newValue instanceof Array? 
                 $.inArray(this.value, newValue) !== -1 : newValue === this.value);
            });
        }
        else { // this part jQuery will not do - extracting value from <input> array
            var checked = $.map(elements, function(element) {
                return element.checked? element.value : null;
            });
            return node.type === "radio"? checked[0] : checked;
            }
       };
    
    /** "Automatically" apply to whatever part of the data model is
     * relevant, the changed value received at the given DOM node*/
    fluid.applyChange = function(node, newValue, applier) {
        node = fluid.unwrap(node);
        if (newValue === undefined) {
            newValue = fluid.value(node);
        }
        if (node.nodeType === undefined && node.length > 0) {node = node[0];} // assume here that they share name and parent
        var root = fluid.findData(node, fluid.BINDING_ROOT_KEY);
        if (!root) {
            fluid.fail("Bound data could not be discovered in any node above " + fluid.dumpEl(node));
        }
        var name = node.name;
        var fossil = root.fossils[name];
        if (!fossil) {
            fluid.fail("No fossil discovered for name " + name + " in fossil record above " + fluid.dumpEl(node));
        }
        if (typeof(fossil.oldvalue) === "boolean") { // deal with the case of an "isolated checkbox"
            newValue = newValue[0]? true: false;
        }
        var EL = root.fossils[name].EL;
        if (applier) {
            applier.fireChangeRequest({path: EL, value: newValue, source: node.id});
        }
        else {
            fluid.model.setBeanValue(root.data, EL, newValue);
        }    
        };
   
    fluid.pathUtil = {};
   
    var getPathSegmentImpl = function(accept, path, i) {
        var segment = null; // TODO: rewrite this with regexes and replaces
        if (accept) {
            segment = "";
        }
        var escaped = false;
        var limit = path.length;
        for (; i < limit; ++i) {
            var c = path.charAt(i);
            if (!escaped) {
                if (c === '.') {
                    break;
                    }
                else if (c === '\\') {
                    escaped = true;
                    }
                else if (segment !== null) {
                    segment += c;
                }
            }
            else {
                escaped = false;
                if (segment !== null)
                    accept += c;
                }
            }
        if (segment !== null) {
            accept[0] = segment;
        }
        return i;
        };
    
    var globalAccept = []; // reentrancy risk
    
    fluid.pathUtil.getPathSegment = function(path, i) {
        getPathSegmentImpl(globalAccept, path, i);
        return globalAccept[0];
        }; 
  
    fluid.pathUtil.getHeadPath = function(path) {
        return fluid.pathUtil.getPathSegment(path, 0);
        };
  
    fluid.pathUtil.getFromHeadPath = function(path) {
        var firstdot = getPathSegmentImpl(null, path, 0);
        return firstdot === path.length ? null
            : path.substring(firstdot + 1);
        };
    
    function lastDotIndex(path) {
        // TODO: proper escaping rules
        return path.lastIndexOf(".");
        }
    
    fluid.pathUtil.getToTailPath = function(path) {
        var lastdot = lastDotIndex(path);
        return lastdot == -1 ? null : path.substring(0, lastdot);
        };

  /** Returns the very last path component of a bean path */
    fluid.pathUtil.getTailPath = function(path) {
        var lastdot = lastDotIndex(path);
        return fluid.pathUtil.getPathSegment(path, lastdot + 1);
        };
    
    var composeSegment = function(prefix, toappend) {
        for (var i = 0; i < toappend.length; ++i) {
            var c = toappend.charAt(i);
            if (c === '.' || c === '\\' || c === '}') {
                prefix += '\\';
            }
            prefix += c;
        }
        return prefix;
    };
    
    /**
     * Compose a prefix and suffix EL path, where the prefix is already escaped.
     * Prefix may be empty, but not null. The suffix will become escaped.
     */
    fluid.pathUtil.composePath = function(prefix, suffix) {
        if (prefix.length !== 0) {
            prefix += '.';
        }
        return composeSegment(prefix, suffix);
        };    
   
    fluid.pathUtil.matchPath = function(spec, path) {
        var togo = "";
        while (true) {
          if (!spec) {break;}
          if (!path) {return null;}
          var spechead = fluid.pathUtil.getHeadPath(spec);
          var pathhead = fluid.pathUtil.getHeadPath(path);
          // if we fail to match on a specific component, fail.
          if (spechead !== "*" && spechead !== pathhead) {
              return null;
          }
          togo = fluid.pathUtil.composePath(togo, pathhead);
          spec = fluid.pathUtil.getFromHeadPath(spec);
          path = fluid.pathUtil.getFromHeadPath(path);
        }
        return togo;
      };
  
  
    fluid.model.applyChangeRequest = function(model, request) {
        if (request.type === "ADD") {
            fluid.model.setBeanValue(model, request.path, request.value);
            }
        else if (request.type === "DELETE") {
            var totail = fluid.pathUtil.getToTailPath(request.path);
            var tail = fluid.pathUtil.getTailPath(request.path);
            var penult = fluid.model.getBeanValue(model, penult);
            delete penult[tail];
        }
    };
  
    fluid.makeChangeApplier = function(model) {
        var baseEvents = {
            guards: fluid.event.getEventFirer(false, true),
            modelChanged: fluid.event.getEventFirer(false, false)
        };
        var that = {
            model: model
        };
        function makePredicate(listenerMember, requestIndex) {
          return function(listener, args) {
                var changeRequest = args[requestIndex];
                return fluid.pathUtil.matchPath(listener[listenerMember], changeRequest.path);
            };
        }
        function adaptListener(that, name, listenerMember, requestIndex) {
            var predicate = makePredicate(listenerMember, requestIndex);
            that[name] = {
                addListener: function(pathSpec, listener, namespace) {
                    listener[listenerMember] = pathSpec;
                    baseEvents[name].addListener(listener, namespace, predicate);
                },
                removeListener: function(listener) {
                    baseEvents[name].removeListener(listener);
                }
            };
        }
        
        adaptListener(that, "guards", "guardedPathSpec", 1);
        adaptListener(that, "modelChanged", "triggerPathSpec", 2);
        that.fireChangeRequest = function(changeRequest) {
            if (!changeRequest.type) {
                changeRequest.type = "ADD";
            }
            var prevent = baseEvents.guards.fire(model, changeRequest);
            if (prevent === false) {
                return;
            }
            var oldModel = {};
            fluid.model.copyModel(oldModel, model);
            fluid.model.applyChangeRequest(model, changeRequest);
            baseEvents.modelChanged.fire(model, oldModel, changeRequest);
        };

        that.requestChange = function(path, value, type) {
            var changeRequest = {
                path: path,
                value: value,
                type: type
            };
            that.fireChangeRequest(changeRequest);
        };
        
        return that;
    };
    
    fluid.makeSuperApplier = function() {
        var subAppliers = [];
        var that = {};
        that.addSubApplier = function(path, subApplier) {
            subAppliers.push({path: path, subApplier: subApplier});
        };
        that.fireChangeRequest = function(request) {
            for (var i = 0; i < subAppliers.length; ++ i) {
                var path = subAppliers[i].path;
                if (request.path.indexOf(path) === 0) {
                    var subpath = request.path.substring(path.length + 1);
                    var subRequest = fluid.copy(request);
                    subRequest.path = subpath;
                    // TODO: Deal with the as yet unsupported case of an EL rvalue DAR
                    subAppliers[i].subApplier.fireChangeRequest(subRequest);
                }
            }
        };
        return that;
    };
    
    fluid.attachModel = function(baseModel, path, model) {
        var segs = fluid.model.parseEL(path);
        for (var i = 0; i < segs.length - 1; ++ i) {
            var seg = segs[i];
            var subModel = baseModel[seg];
            if (!subModel) {
                baseModel[seg] = subModel = {};
            }
            baseModel = subModel;
        }
        baseModel[segs[segs.length - 1]] = model;
    };
    
    fluid.assembleModel = function (modelSpec) {
       var model = {};
       var superApplier = fluid.makeSuperApplier();
       var togo = {model: model, applier: superApplier};
       for (path in modelSpec) {
           var rec = modelSpec[path];
           fluid.attachModel(model, path, rec.model);
           if (rec.applier) {
              superApplier.addSubApplier(path, rec.applier);
           }
       }
       return togo;
    };

})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/

var fluid_1_1 = fluid_1_1 || {};
var fluid = fluid || fluid_1_1;

(function ($, fluid) {

    // $().fluid("selectable", args)
    // $().fluid("selectable".that()
    // $().fluid("pager.pagerBar", args)
    // $().fluid("reorderer", options)

/** Create a "bridge" from code written in the Fluid standard "that-ist" style,
 *  to the standard JQuery UI plugin architecture specified at http://docs.jquery.com/UI/Guidelines .
 *  Every Fluid component corresponding to the top-level standard signature (JQueryable, options)
 *  will automatically convert idiomatically to the JQuery UI standard via this adapter. 
 *  Any return value which is a primitive or array type will become the return value
 *  of the "bridged" function - however, where this function returns a general hash
 *  (object) this is interpreted as forming part of the Fluid "return that" pattern,
 *  and the function will instead be bridged to "return this" as per JQuery standard,
 *  permitting chaining to occur. However, as a courtesy, the particular "this" returned
 *  will be augmented with a function that() which will allow the original return
 *  value to be retrieved if desired.
 *  @param {String} name The name under which the "plugin space" is to be injected into
 *  JQuery
 *  @param {Object} peer The root of the namespace corresponding to the peer object.
 */

    fluid.thatistBridge = function (name, peer) {

        var togo = function(funcname) {
            var segs = funcname.split(".");
            var move = peer;
            for (var i = 0; i < segs.length; ++i) {
                move = move[segs[i]];
            }
            var args = [this];
            if (arguments.length === 2) {
                args = args.concat($.makeArray(arguments[1]));
            }
            var ret = move.apply(null, args);
            this.that = function() {
                return ret;
            }
            var type = typeof(ret);
            return !ret || type === "string" || type === "number" || type === "boolean"
              || ret && ret.length !== undefined? ret: this;
        };
        $.fn[name] = togo;
        return togo;
    };

    fluid.thatistBridge("fluid", fluid);
    fluid.thatistBridge("fluid_1_1", fluid_1_1);

    // Private constants.
    var NAMESPACE_KEY = "fluid-keyboard-a11y";

    /**
     * Gets stored state from the jQuery instance's data map.
     */
    var getData = function(target, key) {
        var data = $(target).data(NAMESPACE_KEY);
        return data ? data[key] : undefined;
    };

    /**
     * Stores state in the jQuery instance's data map. Unlike jQuery's version,
     * accepts multiple-element jQueries.
     */
    var setData = function(target, key, value) {
        $(target).each(function() {
            var data = $.data(this, NAMESPACE_KEY) || {};
            data[key] = value;

            $.data(this, NAMESPACE_KEY, data);
        });
    };
/** Global focus manager - makes use of jQuery delegate plugin if present,
 * detecting presence of "focusin" event.
 */

    var lastFocusedElement = "disabled";
    
    if ($.event.special["focusin"]) {
        lastFocusedElement = null;
        $(document).bind("focusin", function(event){
            lastFocusedElement = event.target;
        });
    }
    
    fluid.getLastFocusedElement = function () {
        if (lastFocusedElement === "disabled") {
           fluid.fail("Focus manager not enabled - please include jquery.delegate.js or equivalent for support of 'focusin' event");
        }
        return lastFocusedElement;
    }

/*************************************************************************
 * Tabindex normalization - compensate for browser differences in naming
 * and function of "tabindex" attribute and tabbing order.
 */

    // -- Private functions --
    
    
    var normalizeTabindexName = function() {
        return $.browser.msie ? "tabIndex" : "tabindex";
    };

    var canHaveDefaultTabindex = function(elements) {
       if (elements.length <= 0) {
           return false;
       }

       return $(elements[0]).is("a, input, button, select, area, textarea, object");
    };
    
    var getValue = function(elements) {
        if (elements.length <= 0) {
            return undefined;
        }

        if (!fluid.tabindex.hasAttr(elements)) {
            return canHaveDefaultTabindex(elements) ? Number(0) : undefined;
        }

        // Get the attribute and return it as a number value.
        var value = elements.attr(normalizeTabindexName());
        return Number(value);
    };

    var setValue = function(elements, toIndex) {
        return elements.each(function(i, item) {
            $(item).attr(normalizeTabindexName(), toIndex);
        });
    };
    
    // -- Public API --
    
    /**
     * Gets the value of the tabindex attribute for the first item, or sets the tabindex value of all elements
     * if toIndex is specified.
     * 
     * @param {String|Number} toIndex
     */
    fluid.tabindex = function(target, toIndex) {
        target = $(target);
        if (toIndex !== null && toIndex !== undefined) {
            return setValue(target, toIndex);
        } else {
            return getValue(target);
        }
    };

    /**
     * Removes the tabindex attribute altogether from each element.
     */
    fluid.tabindex.remove = function(target) {
        target = $(target);
        return target.each(function(i, item) {
            $(item).removeAttr(normalizeTabindexName());
        });
    };

    /**
     * Determines if an element actually has a tabindex attribute present.
     */
    fluid.tabindex.hasAttr = function(target) {
        target = $(target);
        if (target.length <= 0) {
            return false;
        }
        var togo = target.map(
            function() {
                var attributeNode = this.getAttributeNode(normalizeTabindexName());
                return attributeNode ? attributeNode.specified : false;
            }
            );
        return togo.length === 1? togo[0] : togo;
    };

    /**
     * Determines if an element either has a tabindex attribute or is naturally tab-focussable.
     */
    fluid.tabindex.has = function(target) {
        target = $(target);
        return fluid.tabindex.hasAttr(target) || canHaveDefaultTabindex(target);
    };

    var ENABLEMENT_KEY = "enablement";

    /** Queries or sets the enabled status of a control. An activatable node
     * may be "disabled" in which case its keyboard bindings will be inoperable
     * (but still stored) until it is reenabled again.
     */
     
    fluid.enabled = function(target, state) {
        target = $(target);
        if (state === undefined) {
            return getData(target, ENABLEMENT_KEY) !== false;
        }
        else {
            $("*", target).each(function() {
                if (getData(this, ENABLEMENT_KEY) !== undefined) {
                    setData(this, ENABLEMENT_KEY, state);
                }
                else if (/select|textarea|input/i.test(this.nodeName)) {
                    $(this).attr("disabled", !state);
                }
            });
            setData(target, ENABLEMENT_KEY, state);
        }
    };
    

// Keyboard navigation
    // Public, static constants needed by the rest of the library.
    fluid.a11y = $.a11y || {};

    fluid.a11y.orientation = {
        HORIZONTAL: 0,
        VERTICAL: 1,
        BOTH: 2
    };

    var UP_DOWN_KEYMAP = {
        next: $.ui.keyCode.DOWN,
        previous: $.ui.keyCode.UP
    };

    var LEFT_RIGHT_KEYMAP = {
        next: $.ui.keyCode.RIGHT,
        previous: $.ui.keyCode.LEFT
    };

    // Private functions.
    var unwrap = function(element) {
        return element.jquery ? element[0] : element; // Unwrap the element if it's a jQuery.
    };


    var makeElementsTabFocussable = function(elements) {
        // If each element doesn't have a tabindex, or has one set to a negative value, set it to 0.
        elements.each(function(idx, item) {
            item = $(item);
            if (!item.fluid("tabindex.has") || item.fluid("tabindex") < 0) {
                item.fluid("tabindex", 0);
            }
        });
    };

    // Public API.
    /**
     * Makes all matched elements available in the tab order by setting their tabindices to "0".
     */
    fluid.tabbable = function(target) {
        target = $(target);
        makeElementsTabFocussable(target);
    };

    /*********************************************************************** 
     * Selectable functionality - geometrising a set of nodes such that they
     * can be navigated (by setting focus) using a set of directional keys
     */

    var CONTEXT_KEY = "selectionContext";
    var NO_SELECTION = -32768;

    var cleanUpWhenLeavingContainer = function(selectionContext) {
        if (selectionContext.options.onLeaveContainer) {
            selectionContext.options.onLeaveContainer(
              selectionContext.selectables[selectionContext.activeItemIndex]);
        } else if (selectionContext.options.onUnselect) {
            selectionContext.options.onUnselect(
            selectionContext.selectables[selectionContext.activeItemIndex]);
        }

        if (!selectionContext.options.rememberSelectionState) {
            selectionContext.activeItemIndex = NO_SELECTION;
        }
    };

    /**
     * Does the work of selecting an element and delegating to the client handler.
     */
    var drawSelection = function(elementToSelect, handler) {
        if (handler) {
            handler(elementToSelect);
        }
    };

    /**
     * Does does the work of unselecting an element and delegating to the client handler.
     */
    var eraseSelection = function(selectedElement, handler) {
        if (handler && selectedElement) {
            handler(selectedElement);
        }
    };

    var unselectElement = function(selectedElement, selectionContext) {
        eraseSelection(selectedElement, selectionContext.options.onUnselect);
    };

    var selectElement = function(elementToSelect, selectionContext) {
        // It's possible that we're being called programmatically, in which case we should clear any previous selection.
        unselectElement(selectionContext.selectedElement(), selectionContext);

        elementToSelect = unwrap(elementToSelect);
        var newIndex = selectionContext.selectables.index(elementToSelect);

        // Next check if the element is a known selectable. If not, do nothing.
        if (newIndex === -1) {
           return;
        }

        // Select the new element.
        selectionContext.activeItemIndex = newIndex;
        drawSelection(elementToSelect, selectionContext.options.onSelect);
    };

    var selectableFocusHandler = function(selectionContext) {
        return function(evt) {
            selectElement(evt.target, selectionContext);

            // Force focus not to bubble on some browsers.
            return evt.stopPropagation();
        };
    };

    var selectableBlurHandler = function(selectionContext) {
        return function(evt) {
            unselectElement(evt.target, selectionContext);

            // Force blur not to bubble on some browsers.
            return evt.stopPropagation();
        };
    };

    var reifyIndex = function(sc_that) {
        var elements = sc_that.selectables;
        if (sc_that.activeItemIndex >= elements.length) {
            sc_that.activeItemIndex = 0;
        }
        if (sc_that.activeItemIndex < 0 && sc_that.activeItemIndex !== NO_SELECTION) {
            sc_that.activeItemIndex = elements.length - 1;
        }
        if (sc_that.activeItemIndex >= 0) {
            $(elements[sc_that.activeItemIndex]).focus();
        }
    };

    var prepareShift = function(selectionContext) {
        unselectElement(selectionContext.selectedElement(), selectionContext);
        if (selectionContext.activeItemIndex === NO_SELECTION) {
          selectionContext.activeItemIndex = -1;
        }
    };

    var focusNextElement = function(selectionContext) {
        prepareShift(selectionContext);
        ++selectionContext.activeItemIndex;
        reifyIndex(selectionContext);
    };

    var focusPreviousElement = function(selectionContext) {
        prepareShift(selectionContext);
        --selectionContext.activeItemIndex;
        reifyIndex(selectionContext);
    };

    var arrowKeyHandler = function(selectionContext, keyMap, userHandlers) {
        return function(evt) {
            if (evt.which === keyMap.next) {
                focusNextElement(selectionContext);
                evt.preventDefault();
            } else if (evt.which === keyMap.previous) {
                focusPreviousElement(selectionContext);
                evt.preventDefault();
            }
        };
    };

    var getKeyMapForDirection = function(direction) {
        // Determine the appropriate mapping for next and previous based on the specified direction.
        var keyMap;
        if (direction === fluid.a11y.orientation.HORIZONTAL) {
            keyMap = LEFT_RIGHT_KEYMAP;
        } 
        else if (direction === fluid.a11y.orientation.VERTICAL) {
            // Assume vertical in any other case.
            keyMap = UP_DOWN_KEYMAP;
        }

        return keyMap;
    };

    var tabKeyHandler = function(selectionContext) {
        return function(evt) {
            if (evt.which !== $.ui.keyCode.TAB) {
                return;
            }
            cleanUpWhenLeavingContainer(selectionContext);

            // Catch Shift-Tab and note that focus is on its way out of the container.
            if (evt.shiftKey) {
                selectionContext.focusIsLeavingContainer = true;
            }
        };
    };

    var containerFocusHandler = function(selectionContext) {
        return function(evt) {
            var shouldOrig = selectionContext.options.autoSelectFirstItem;
            var shouldSelect = typeof(shouldOrig) === "function" ? 
                 shouldOrig() : shouldOrig;

            // Override the autoselection if we're on the way out of the container.
            if (selectionContext.focusIsLeavingContainer) {
                shouldSelect = false;
            }

            // This target check works around the fact that sometimes focus bubbles, even though it shouldn't.
            if (shouldSelect && evt.target === selectionContext.container.get(0)) {
                if (selectionContext.activeItemIndex === NO_SELECTION) {
                    selectionContext.activeItemIndex = 0;
                }
                $(selectionContext.selectables[selectionContext.activeItemIndex]).focus();
            }

           // Force focus not to bubble on some browsers.
           return evt.stopPropagation();
        };
    };

    var containerBlurHandler = function(selectionContext) {
        return function(evt) {
            selectionContext.focusIsLeavingContainer = false;

            // Force blur not to bubble on some browsers.
            return evt.stopPropagation();
        };
    };

    var makeElementsSelectable = function(container, defaults, userOptions) {

        var options = $.extend(true, {}, defaults, userOptions);

        var keyMap = getKeyMapForDirection(options.direction);

        var selectableElements = options.selectableElements? options.selectableElements :
              container.find(options.selectableSelector);
          
        // Context stores the currently active item(undefined to start) and list of selectables.
        var that = {
            container: container,
            activeItemIndex: NO_SELECTION,
            selectables: selectableElements,
            focusIsLeavingContainer: false,
            options: options
        };

        that.selectablesUpdated = function(focusedItem) {
          // Remove selectables from the tab order and add focus/blur handlers
            if (typeof(that.options.selectablesTabindex) === "number") {
                that.selectables.fluid("tabindex", that.options.selectablesTabindex);
            }
            that.selectables.unbind("focus." + NAMESPACE_KEY);
            that.selectables.unbind("blur." + NAMESPACE_KEY);
            that.selectables.bind("focus."+ NAMESPACE_KEY, selectableFocusHandler(that));
            that.selectables.bind("blur." + NAMESPACE_KEY, selectableBlurHandler(that));
            if (focusedItem) {
                selectElement(focusedItem, that);
            }
            else {
                reifyIndex(that);
            }
        };

        that.refresh = function() {
            if (!that.options.selectableSelector) {
                throw("Cannot refresh selectable context which was not initialised by a selector");
            }
            that.selectables = container.find(options.selectableSelector);
            that.selectablesUpdated();
        };
        
        that.selectedElement = function() {
            return that.activeItemIndex < 0? null : that.selectables[that.activeItemIndex];
        };
        
        // Add various handlers to the container.
        if (keyMap) {
            container.keydown(arrowKeyHandler(that, keyMap));
        }
        container.keydown(tabKeyHandler(that));
        container.focus(containerFocusHandler(that));
        container.blur(containerBlurHandler(that));
        
        that.selectablesUpdated();

        return that;
    };

    /**
     * Makes all matched elements selectable with the arrow keys.
     * Supply your own handlers object with onSelect: and onUnselect: properties for custom behaviour.
     * Options provide configurability, including direction: and autoSelectFirstItem:
     * Currently supported directions are jQuery.a11y.directions.HORIZONTAL and VERTICAL.
     */
    fluid.selectable = function(target, options) {
        target = $(target);
        var that = makeElementsSelectable(target, fluid.selectable.defaults, options);
        setData(target, CONTEXT_KEY, that);
        return that;
    };

    /**
     * Selects the specified element.
     */
    fluid.selectable.select = function(target, toSelect) {
        $(toSelect).focus();
    };

    /**
     * Selects the next matched element.
     */
    fluid.selectable.selectNext = function(target) {
        target = $(target);
        focusNextElement(getData(target, CONTEXT_KEY));
    };

    /**
     * Selects the previous matched element.
     */
    fluid.selectable.selectPrevious = function(target) {
        target = $(target);
        focusPreviousElement(getData(target, CONTEXT_KEY));
    };

    /**
     * Returns the currently selected item wrapped as a jQuery object.
     */
    fluid.selectable.currentSelection = function(target) {
        target = $(target);
        var that = getData(target, CONTEXT_KEY);
        return $(that.selectedElement());
    };

    fluid.selectable.defaults = {
        direction: fluid.a11y.orientation.VERTICAL,
        selectablesTabindex: -1,
        autoSelectFirstItem: true,
        rememberSelectionState: true,
        selectableSelector: ".selectable",
        selectableElements: null,
        onSelect: null,
        onUnselect: null,
        onLeaveContainer: null
    };

    /********************************************************************
     *  Activation functionality - declaratively associating actions with 
     * a set of keyboard bindings.
     */

    var checkForModifier = function(binding, evt) {
        // If no modifier was specified, just return true.
        if (!binding.modifier) {
            return true;
        }

        var modifierKey = binding.modifier;
        var isCtrlKeyPresent = modifierKey && evt.ctrlKey;
        var isAltKeyPresent = modifierKey && evt.altKey;
        var isShiftKeyPresent = modifierKey && evt.shiftKey;

        return isCtrlKeyPresent || isAltKeyPresent || isShiftKeyPresent;
    };

    /** Constructs a raw "keydown"-facing handler, given a binding entry. This
     *  checks whether the key event genuinely triggers the event and forwards it
     *  to any "activateHandler" registered in the binding. 
     */
    var makeActivationHandler = function(binding) {
        return function(evt) {
            var target = evt.target;
            if (!fluid.enabled(evt.target)) {
                return;
            }
// The following 'if' clause works in the real world, but there's a bug in the jQuery simulation
// that causes keyboard simulation to fail in Safari, causing our tests to fail:
//     http://ui.jquery.com/bugs/ticket/3229
// The replacement 'if' clause works around this bug.
// When this issue is resolved, we should revert to the original clause.
//            if (evt.which === binding.key && binding.activateHandler && checkForModifier(binding, evt)) {
            var code = evt.which? evt.which : evt.keyCode;
            if (code === binding.key && binding.activateHandler && checkForModifier(binding, evt)) {
                var event = $.Event("fluid-activate");
                $(evt.target).trigger(event, [binding.activateHandler]);
                if (event.isDefaultPrevented()) {
                    evt.preventDefault();
                }
            }
        };
    };

    var makeElementsActivatable = function(elements, onActivateHandler, defaultKeys, options) {
        // Create bindings for each default key.
        var bindings = [];
        $(defaultKeys).each(function(index, key) {
            bindings.push({
                modifier: null,
                key: key,
                activateHandler: onActivateHandler
            });
        });

        // Merge with any additional key bindings.
        if (options && options.additionalBindings) {
            bindings = bindings.concat(options.additionalBindings);
        }

        setData(elements, ENABLEMENT_KEY, true);

        // Add listeners for each key binding.
        for (var i = 0; i < bindings.length; ++ i) {
            var binding = bindings[i];
            elements.keydown(makeActivationHandler(binding));
        }
        elements.bind("fluid-activate", function(evt, handler) {
            handler = handler || onActivateHandler;
            return handler? handler(evt): null;
        });
    };

    /**
     * Makes all matched elements activatable with the Space and Enter keys.
     * Provide your own handler function for custom behaviour.
     * Options allow you to provide a list of additionalActivationKeys.
     */
    fluid.activatable = function(target, fn, options) {
        target = $(target);
        makeElementsActivatable(target, fn, fluid.activatable.defaults.keys, options);
    };

    /**
     * Activates the specified element.
     */
    fluid.activate = function(target) {
        $(target).trigger("fluid-activate");
    };

    // Public Defaults.
    fluid.activatable.defaults = {
        keys: [$.ui.keyCode.ENTER, $.ui.keyCode.SPACE]
    };

  
  })(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

// Declare dependencies.
/*global jQuery*/
/*global fluid_1_1*/

var fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
    
    fluid.orientation = {
        HORIZONTAL: 4,
        VERTICAL: 1
    };
    
    fluid.rectSides = {
        // agree with fluid.orientation
        4: ["left", "right"],
        1: ["top", "bottom"],
        // agree with fluid.direction
        8: "top",
        12: "bottom",
        2: "left",
        3: "right"
    };
    
    /**
     * This is the position, relative to a given drop target, that a dragged item should be dropped.
     */
    fluid.position = {
        BEFORE: -1,
        AFTER: 1,
        INSIDE: 2,
        REPLACE: 3
    };
    
    /**
     * For incrementing/decrementing a count or index, or moving in a rectilinear direction.
     */
    fluid.direction = {
        NEXT: 1,
        PREVIOUS: -1,
        UP: 8,
        DOWN: 12,
        LEFT: 2,
        RIGHT: 3
    };
    
    fluid.directionSign = function (direction) {
        return direction === fluid.direction.UP || direction === fluid.direction.LEFT? 
             fluid.direction.PREVIOUS : fluid.direction.NEXT;
    };
    
    fluid.directionAxis = function (direction) {
        return direction === fluid.direction.LEFT || direction === fluid.direction.RIGHT?
            0 : 1; 
    };
    
    fluid.directionOrientation = function (direction) {
        return fluid.directionAxis(direction)? fluid.orientation.VERTICAL : fluid.orientation.HORIZONTAL;
    };
    
    fluid.keycodeDirection = {
        up: fluid.direction.UP,
        down: fluid.direction.DOWN,
        left: fluid.direction.LEFT,
        right: fluid.direction.RIGHT
    };
    
    // moves a single node in the DOM to a new position relative to another
    fluid.moveDom = function (source, target, position) {
        source = fluid.unwrap(source);
        target = fluid.unwrap(target);
        
        var scan;
        // fluid.log("moveDom source " + fluid.dumpEl(source) + " target " + fluid.dumpEl(target) + " position " + position);     
        if (position === fluid.position.INSIDE) {
            target.appendChild(source);
        }
        else if (position === fluid.position.BEFORE) {
            for (scan = target.previousSibling; ; scan = scan.previousSibling) {
                if (!scan || !fluid.dom.isIgnorableNode(scan)) {
                    if (scan !== source) {
                        fluid.dom.cleanseScripts(source);
                        target.parentNode.insertBefore(source, target);    
                    }
                    break;
                }
            }
        }
        else if (position === fluid.position.AFTER) {
            for (scan = target.nextSibling; ; scan = scan.nextSibling) {
                if (!scan || !fluid.dom.isIgnorableNode(scan)) {
                    if (scan !== source) {
                        fluid.dom.cleanseScripts(source);
                        fluid.dom.insertAfter(source, target);
                    }
                    break;
                }
            }
        }
        else {
            fluid.fail("Unrecognised position supplied to fluid.moveDom: " + position);
        }
    };
    
    fluid.normalisePosition = function (position, samespan, targeti, sourcei) {
        // convert a REPLACE into a primitive BEFORE/AFTER
        if (position === fluid.position.REPLACE) {
            position = samespan && targeti >= sourcei? fluid.position.AFTER: fluid.position.BEFORE;
        }
        return position;
    };
    
    fluid.permuteDom = function (element, target, position, sourceelements, targetelements) {
        element = fluid.unwrap(element);
        target = fluid.unwrap(target);
        var sourcei = $.inArray(element, sourceelements);
        if (sourcei === -1) {
            fluid.fail("Error in permuteDom: source element " + fluid.dumpEl(element) 
               + " not found in source list " + fluid.dumpEl(sourceelements));
        }
        var targeti = $.inArray(target, targetelements);
        if (targeti === -1) {
            fluid.fail("Error in permuteDom: target element " + fluid.dumpEl(target) 
               + " not found in source list " + fluid.dumpEl(targetelements));
        }
        var samespan = sourceelements === targetelements;
        position = fluid.normalisePosition(position, samespan, targeti, sourcei);

        //fluid.log("permuteDom sourcei " + sourcei + " targeti " + targeti);
        // cache the old neighbourhood of the element for the final move
        var oldn = {};
        oldn[fluid.position.AFTER] = element.nextSibling;
        oldn[fluid.position.BEFORE] = element.previousSibling;
        fluid.moveDom(sourceelements[sourcei], targetelements[targeti], position);
        
        // perform the leftward-moving, AFTER shift
        var frontlimit = samespan? targeti - 1: sourceelements.length - 2;
        var i;
        if (!samespan || targeti > sourcei) {
            for (i = frontlimit; i > sourcei; -- i) {
                fluid.moveDom(sourceelements[i + 1], sourceelements[i], fluid.position.AFTER);
            }
            if (sourcei + 1 < sourceelements.length) {
                fluid.moveDom(sourceelements[sourcei + 1], oldn[fluid.position.AFTER], fluid.position.BEFORE);
            }
        }
        // perform the rightward-moving, BEFORE shift
        var backlimit = samespan? sourcei - 1: targetelements.length - 1;
        if (position === fluid.position.AFTER) { 
            // we cannot do skip processing if the element was "fused against the grain" 
            targeti++;
        }
        if (!samespan || targeti < sourcei) {
            for (i = targeti; i < backlimit; ++ i) {
                fluid.moveDom(targetelements[i], targetelements[i + 1], fluid.position.BEFORE);
            }
            if (backlimit >= 0 && backlimit < targetelements.length - 1) {
                fluid.moveDom(targetelements[backlimit], oldn[fluid.position.BEFORE], fluid.position.AFTER);
            }                
        }

    };
  
    var curCss = function (a, name) {
        return window.getComputedStyle? window.getComputedStyle(a, null).getPropertyValue(name) : 
          a.currentStyle[name];
    };
    
    var isAttached = function (node) {
        while (node && node.nodeName) {
            if (node.nodeName === "BODY") {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    };
    
    var generalHidden = function (a) {
        return "hidden" === a.type || curCss(a, "display") === "none" || curCss(a, "visibility") === "hidden" || !isAttached(a);
    };
    

    var computeGeometry = function (element, orientation, disposition) {
        var elem = {};
        elem.element = element;
        elem.orientation = orientation;
        if (disposition === fluid.position.INSIDE) {
            elem.position = disposition;
        }
        if (generalHidden(element)) {
            elem.clazz = "hidden";
        }
        var pos = fluid.dom.computeAbsolutePosition(element) || [0, 0];
        var width = element.offsetWidth;
        var height = element.offsetHeight;
        elem.rect = {left: pos[0], top: pos[1]};
        elem.rect.right = pos[0] + width;
        elem.rect.bottom = pos[1] + height;
        return elem;
    };
    
    // A "suitable large" value for the sentinel blocks at the ends of spans
    var SENTINEL_DIMENSION = 10000;

    function dumprect(rect) {
        return "Rect top: " + rect.top +
                 " left: " + rect.left + 
               " bottom: " + rect.bottom +
                " right: " + rect.right;
    }

    function dumpelem(cacheelem) {
        if (!cacheelem || !cacheelem.rect) {
            return "null";
        } else {
            return dumprect(cacheelem.rect) + " position: " +
            cacheelem.position +
            " for " +
            fluid.dumpEl(cacheelem.element);
        }
    }
    
    fluid.dropManager = function () {
        var targets = [];
        var cache = {};
        var that = {};
        
        var lastClosest;
        
        function cacheKey(element) {
            return $(element).data("");
        }
        
        function sentinelizeElement(targets, sides, cacheelem, fc, disposition, clazz) {
            var elemCopy = $.extend(true, {}, cacheelem);
            elemCopy.rect[sides[fc]] = elemCopy.rect[sides[1 - fc]] + (fc? 1: -1);
            elemCopy.rect[sides[1 - fc]] = (fc? -1 : 1) * SENTINEL_DIMENSION;
            elemCopy.position = disposition === fluid.position.INSIDE?
               disposition : (fc? fluid.position.BEFORE : fluid.position.AFTER);
            elemCopy.clazz = clazz;
            targets[targets.length] = elemCopy;
        }
        
        function splitElement(targets, sides, cacheelem, disposition, clazz1, clazz2) {
            var elem1 = $.extend(true, {}, cacheelem);
            var elem2 = $.extend(true, {}, cacheelem);
            var midpoint = (elem1.rect[sides[0]] + elem1.rect[sides[1]]) / 2;
            elem1.rect[sides[1]] = midpoint; 
            elem1.position = fluid.position.BEFORE;
            
            elem2.rect[sides[0]] = midpoint; 
            elem2.position = fluid.position.AFTER;
            
            elem1.clazz = clazz1;
            elem2.clazz = clazz2;
            targets[targets.length] = elem1;
            targets[targets.length] = elem2;
        }
       
        // Expand this configuration point if we ever go back to a full "permissions" model
        function getRelativeClass(thisElements, index, relative, thisclazz, mapper) {
            index += relative;
            if (index < 0 && thisclazz === "locked") {
                return "locked";
            }
            if (index >= thisElements.length || mapper === null) {
                return null;
            } else {
                relative = thisElements[index];
                return mapper(relative) === "locked" && thisclazz === "locked" ? "locked" : null;
            }
        }
        
        var lastGeometry;
        var displacementX, displacementY;
        
        that.updateGeometry = function (geometricInfo) {
            lastGeometry = geometricInfo;
            targets = [];
            cache = {};
            var mapper = geometricInfo.elementMapper;
            for (var i = 0; i < geometricInfo.extents.length; ++ i) {
                var thisInfo = geometricInfo.extents[i];
                var orientation = thisInfo.orientation;
                var sides = fluid.rectSides[orientation];
                
                var processElement = function (element, sentB, sentF, disposition, j) {
                    var cacheelem = computeGeometry(element, orientation, disposition);
                    cacheelem.owner = thisInfo;
                    if (cacheelem.clazz !== "hidden" && mapper) {
                        cacheelem.clazz = mapper(element);
                    }
                    cache[$.data(element)] = cacheelem;
                    var backClass = getRelativeClass(thisInfo.elements, j, fluid.position.BEFORE, cacheelem.clazz, mapper); 
                    var frontClass = getRelativeClass(thisInfo.elements, j, fluid.position.AFTER, cacheelem.clazz, mapper); 
                    if (disposition === fluid.position.INSIDE) {
                        targets[targets.length] = cacheelem;
                    }
                    else {
                        splitElement(targets, sides, cacheelem, disposition, backClass, frontClass);
                    }
                    // deal with sentinel blocks by creating near-copies of the end elements
                    if (sentB && geometricInfo.sentinelize) {
                        sentinelizeElement(targets, sides, cacheelem, 1, disposition, backClass);
                    }
                    if (sentF && geometricInfo.sentinelize) {
                        sentinelizeElement(targets, sides, cacheelem, 0, disposition, frontClass);
                    }
                    //fluid.log(dumpelem(cacheelem));
                    return cacheelem;
                };
                
                var allHidden = true;
                for (var j = 0; j < thisInfo.elements.length; ++ j) {
                    var element = thisInfo.elements[j];
                    var cacheelem = processElement(element, j === 0, j === thisInfo.elements.length - 1, 
                            fluid.position.INTERLEAVED, j);
                    if (cacheelem.clazz !== "hidden") {
                        allHidden = false;
                    }
                }
                if (allHidden && thisInfo.parentElement) {
                    processElement(thisInfo.parentElement, true, true, 
                            fluid.position.INSIDE);
                }
            }   
        };
        
        that.startDrag = function (event, handlePos, handleWidth, handleHeight) {
            var handleMidX = handlePos[0] + handleWidth / 2;
            var handleMidY = handlePos[1] + handleHeight / 2;
            var dX = handleMidX - event.pageX;
            var dY = handleMidY - event.pageY;
            that.updateGeometry(lastGeometry);
            lastClosest = null;
            displacementX = dX;
            displacementY = dY;
            $("").bind("mousemove.fluid-dropManager", that.mouseMove);
        };
        
        that.lastPosition = function () {
            return lastClosest;
        };
        
        that.endDrag = function () {
            $("").unbind("mousemove.fluid-dropManager");
        };
        
        that.mouseMove = function (evt) {
            var x = evt.pageX + displacementX;
            var y = evt.pageY + displacementY;
            //fluid.log("Mouse x " + x + " y " + y );
            
            var closestTarget = that.closestTarget(x, y, lastClosest);
            if (closestTarget && closestTarget !== fluid.dropManager.NO_CHANGE) {
                lastClosest = closestTarget;
              
                that.dropChangeFirer.fire(closestTarget);
            }
        };
        
        that.dropChangeFirer = fluid.event.getEventFirer();
        
        var blankHolder = {
            element: null
        };
        
        that.closestTarget = function (x, y, lastClosest) {
            var mindistance = Number.MAX_VALUE;
            var minelem = blankHolder;
            var minlockeddistance = Number.MAX_VALUE;
            var minlockedelem = blankHolder;
            for (var i = 0; i < targets.length; ++ i) {
                var cacheelem = targets[i];
                if (cacheelem.clazz === "hidden") {
                    continue;
                }
                var distance = fluid.geom.minPointRectangle(x, y, cacheelem.rect);
                if (cacheelem.clazz === "locked") {
                    if (distance < minlockeddistance) {
                        minlockeddistance = distance;
                        minlockedelem = cacheelem;
                    }
                } else {
                    if (distance < mindistance) {
                        mindistance = distance;
                        minelem = cacheelem;
                    }
                    if (distance === 0) {
                        break;
                    }
                }
            }
            if (!minelem) {
                return minelem;
            }
            if (minlockeddistance >= mindistance) {
                minlockedelem = blankHolder;
            }
            //fluid.log("PRE: mindistance " + mindistance + " element " + 
            //   fluid.dumpEl(minelem.element) + " minlockeddistance " + minlockeddistance
            //    + " locked elem " + dumpelem(minlockedelem));
            if (lastClosest && lastClosest.position === minelem.position &&
                fluid.unwrap(lastClosest.element) === fluid.unwrap(minelem.element) &&
                fluid.unwrap(lastClosest.lockedelem) === fluid.unwrap(minlockedelem.element)
                ) {
                return fluid.dropManager.NO_CHANGE;
            }
            //fluid.log("mindistance " + mindistance + " minlockeddistance " + minlockeddistance);
            return {
                position: minelem.position,
                element: minelem.element,
                lockedelem: minlockedelem.element
            };
        };
        
        that.projectFrom = function (element, direction, includeLocked) {
            that.updateGeometry(lastGeometry);
            var cacheelem = cache[cacheKey(element)];
            var projected = fluid.geom.projectFrom(cacheelem.rect, direction, targets, includeLocked);
            if (!projected.cacheelem) {
                return null;
            }
            var retpos = projected.cacheelem.position;
            return {element: projected.cacheelem.element, 
                     position: retpos? retpos : fluid.position.BEFORE 
                     };
        };
        
        function getRelativeElement(element, direction, elements) {
            var folded = fluid.directionSign(direction);
      
            var index = $(elements).index(element) + folded;
            if (index < 0) {
                index += elements.length;
            }
            index %= elements.length;
            return elements[index];            
        }
        
        that.logicalFrom = function (element, direction, includeLocked) {
            var orderables = that.getOwningSpan(element, fluid.position.INTERLEAVED, includeLocked);
            return {element: getRelativeElement(element, direction, orderables), 
                position: fluid.position.REPLACE};
        };
           
        that.lockedWrapFrom = function (element, direction, includeLocked) {
            var base = that.logicalFrom(element, direction, includeLocked);
            var selectables = that.getOwningSpan(element, fluid.position.INTERLEAVED, includeLocked);
            var allElements = cache[cacheKey(element)].owner.elements;
            if (includeLocked || selectables[0] === allElements[0]) {
                return base;
            }
            var directElement = getRelativeElement(element, direction, allElements);
            if (lastGeometry.elementMapper(directElement) === "locked") {
                base.element = null;
                base.clazz = "locked";  
            }
            return base;
        }; 
        
        that.getOwningSpan = function (element, position, includeLocked) {
            var owner = cache[cacheKey(element)].owner; 
            var elements = position === fluid.position.INSIDE? [owner.parentElement] : owner.elements;
            if (!includeLocked && lastGeometry.elementMapper) {
                elements = $.makeArray(elements);
                fluid.remove_if(elements, function (element) {
                    return lastGeometry.elementMapper(element) === "locked";
                });
            }
            return elements;
        };
        
        that.geometricMove = function (element, target, position) {
            var sourceElements = that.getOwningSpan(element, null, true);
            var targetElements = that.getOwningSpan(target, position, true);
            fluid.permuteDom(element, target, position, sourceElements, targetElements);
        };
        
        return that;
    };
 
    fluid.dropManager.NO_CHANGE = "no change";


    fluid.geom = fluid.geom || {};
    
    // These distance algorithms have been taken from
    // http://www.cs.mcgill.ca/~cs644/Godfried/2005/Fall/fzamal/concepts.htm
    
    /** Returns the minimum squared distance between a point and a rectangle **/
    fluid.geom.minPointRectangle = function (x, y, rectangle) {
        var dx = x < rectangle.left? (rectangle.left - x) : 
                  (x > rectangle.right? (x - rectangle.right) : 0);
        var dy = y < rectangle.top? (rectangle.top - y) : 
                  (y > rectangle.bottom? (y - rectangle.bottom) : 0);
        return dx * dx + dy * dy;
    };
    
    /** Returns the minimum squared distance between two rectangles **/
    fluid.geom.minRectRect = function (rect1, rect2) {
        var dx = rect1.right < rect2.left? rect2.left - rect1.right : 
                 rect2.right < rect1.left? rect1.left - rect2.right :0;
        var dy = rect1.bottom < rect2.top? rect2.top - rect1.bottom : 
                 rect2.bottom < rect1.top? rect1.top - rect2.bottom :0;
        return dx * dx + dy * dy;
    };
    
    var makePenCollect = function () {
        return {
            mindist: Number.MAX_VALUE,
            minrdist: Number.MAX_VALUE
        };
    };

    /** Determine the one amongst a set of rectangle targets which is the "best fit"
     * for an axial motion from a "base rectangle" (commonly arising from the case
     * of cursor key navigation).
     * @param {Rectangle} baserect The base rectangl from which the motion is to be referred
     * @param {fluid.direction} direction  The direction of motion
     * @param {Array of Rectangle holders} targets An array of objects "cache elements" 
     * for which the member <code>rect</code> is the holder of the rectangle to be tested.
     * @return The cache element which is the most appropriate for the requested motion.
     */
    fluid.geom.projectFrom = function (baserect, direction, targets, forSelection) {
        var axis = fluid.directionAxis(direction);
        var frontSide = fluid.rectSides[direction];
        var backSide = fluid.rectSides[axis * 15 + 5 - direction];
        var dirSign = fluid.directionSign(direction);
        
        var penrect = {left: (7 * baserect.left + 1 * baserect.right) / 8,
                       right: (5 * baserect.left + 3 * baserect.right) / 8,
                       top: (7 * baserect.top + 1 * baserect.bottom) / 8,
                       bottom: (5 * baserect.top + 3 * baserect.bottom) / 8};
         
        penrect[frontSide] = dirSign * SENTINEL_DIMENSION;
        penrect[backSide] = -penrect[frontSide];
        
        function accPen(collect, cacheelem, backSign) {
            var thisrect = cacheelem.rect;
            var pdist = fluid.geom.minRectRect(penrect, thisrect);
            var rdist = -dirSign * backSign * (baserect[backSign === 1 ? frontSide:backSide] 
                                             - thisrect[backSign === 1 ? backSide:frontSide]);
            // fluid.log("pdist: " + pdist + " rdist: " + rdist);
            // the oddity in the rdist comparison is intended to express "half-open"-ness of rectangles
            // (backSign === 1? 0 : 1) - this is now gone - must be possible to move to perpendicularly abutting regions
            if (pdist <= collect.mindist && rdist >= 0) {
                if (pdist === collect.mindist && rdist * backSign > collect.minrdist) {
                    return;
                }
                collect.minrdist = rdist * backSign;
                collect.mindist = pdist;
                collect.minelem = cacheelem;
            }
        }
        var collect = makePenCollect();
        var backcollect = makePenCollect();
        var lockedcollect = makePenCollect();

        for (var i = 0; i < targets.length; ++ i) {
            var elem = targets[i];
            var isPure = elem.owner && elem.element === elem.owner.parentElement;
            if (elem.clazz === "hidden" || forSelection && isPure) {
                continue;
            }
            else if (!forSelection && elem.clazz === "locked") {
                accPen(lockedcollect, elem, 1);
            }
            else {
                accPen(collect, elem, 1);
                accPen(backcollect, elem, -1);
            }
            //fluid.log("Element " + i + " " + dumpelem(elem) + " mindist " + collect.mindist);
        }
        var wrap = !collect.minelem || backcollect.mindist < collect.mindist;
        var mincollect = wrap? backcollect: collect;
        var togo = {
            wrapped: wrap,
            cacheelem: mincollect.minelem
        };
        if (lockedcollect.mindist < mincollect.mindist) {
            togo.lockedelem = lockedcollect.minelem;
        }
        return togo;
    };
})(jQuery, fluid_1_1);
/*
Copyright 2007-2009 University of Toronto
Copyright 2007-2009 University of Cambridge
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

// Declare dependencies.
/*global $, jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
    
    var defaultAvatarCreator = function (item, cssClass, dropWarning) {
        var avatar = $(item).clone();
        
        fluid.dom.iterateDom(avatar.get(0), function (node) {
            if (node.tagName.toLowerCase() === "script") {
                return "delete";
            }
            node.removeAttribute("id");
            if (node.tagName.toLowerCase() === "input") {
                node.setAttribute("disabled", "disabled");
            }
        });
        
        avatar.removeAttr("id");
        avatar.removeClass("ui-droppable");
        avatar.addClass(cssClass);
        
        if (dropWarning) {
            // Will a 'div' always be valid in this position?
            var avatarContainer = $(document.createElement("div"));
            avatarContainer.append(avatar);
            avatarContainer.append(dropWarning);
            avatar = avatarContainer;
        }
        $("body").append(avatar);
        if (!$.browser.safari) {
            // FLUID-1597: Safari appears incapable of correctly determining the dimensions of elements
            avatar.css("display", "block").width(item.offsetWidth).height(item.offsetHeight);
        }
        
        if ($.browser.opera) { // FLUID-1490. Without this detect, curCSS explodes on the avatar on Firefox.
            avatar.hide();
        }
        return avatar;
    };   
    
    function firstSelectable(that) {
        var selectables = that.dom.fastLocate("selectables");
        if (selectables.length <= 0) {
            return null;
        }
        return selectables[0];
    }
    
    function bindHandlersToContainer(container, keyDownHandler, keyUpHandler, mouseMoveHandler) {
        var actualKeyDown = keyDownHandler;
        var advancedPrevention = false;

        // FLUID-143. Disable text selection for the reorderer.
        // ondrag() and onselectstart() are Internet Explorer specific functions.
        // Override them so that drag+drop actions don't also select text in IE.
        if ($.browser.msie) {
            container[0].ondrag = function () { 
                return false; 
            }; 
            container[0].onselectstart = function () { 
                return false; 
            };
        }
        // FLUID-1598 and others: Opera will refuse to honour a "preventDefault" on a keydown.
        // http://forums.devshed.com/javascript-development-115/onkeydown-preventdefault-opera-485371.html
        if ($.browser.opera) {
            container.keypress(function (evt) {
                if (advancedPrevention) {
                    advancedPrevention = false;
                    evt.preventDefault();
                    return false;
                }
            });
            actualKeyDown = function (evt) {
                var oldret = keyDownHandler(evt);
                if (oldret === false) {
                    advancedPrevention = true;
                }
            };
        }
        container.keydown(actualKeyDown);
        container.keyup(keyUpHandler);
    }
    
    function addRolesToContainer(that) {
        var first = that.dom.fastLocate("selectables")[0];
        that.container.attr("role", that.options.containerRole.container);
        that.container.attr("aria-multiselectable", "false");
        that.container.attr("aria-readonly", "false");
        that.container.attr("aria-disabled", "false");
    }
    
    function createAvatarId(parentId) {
        // Generating the avatar's id to be containerId_avatar
        // This is safe since there is only a single avatar at a time
        return parentId + "_avatar";
    }
    
    var adaptKeysets = function (options) {
        if (options.keysets && !(options.keysets instanceof Array)) {
            options.keysets = [options.keysets];    
        }
    };
    
    /**
     * @param container - the root node of the Reorderer.
     * @param options - an object containing any of the available options:
     *                  containerRole - indicates the role, or general use, for this instance of the Reorderer
     *                  keysets - an object containing sets of keycodes to use for directional navigation. Must contain:
     *                            modifier - a function that returns a boolean, indicating whether or not the required modifier(s) are activated
     *                            up
     *                            down
     *                            right
     *                            left
     *                  styles - an object containing class names for styling the Reorderer
     *                                  defaultStyle
     *                                  selected
     *                                  dragging
     *                                  hover
     *                                  dropMarker
     *                                  mouseDrag
     *                                  avatar
     *                  avatarCreator - a function that returns a valid DOM node to be used as the dragging avatar
     */
    fluid.reorderer = function (container, options) {
        if (!container) {
            fluid.fail("Reorderer initialised with no container");
        }
        var thatReorderer = fluid.initView("fluid.reorderer", container, options);
        options = thatReorderer.options;
        
        var dropManager = fluid.dropManager();
        
        thatReorderer.layoutHandler = fluid.initSubcomponent(thatReorderer,
            "layoutHandler", [container, options, dropManager, thatReorderer.dom]);
        
        thatReorderer.activeItem = undefined;

        adaptKeysets(options);
 
        var kbDropWarning = thatReorderer.locate("dropWarning");
        var mouseDropWarning;
        if (kbDropWarning) {
            mouseDropWarning = kbDropWarning.clone();
        }

        var isMove = function (evt) {
            var keysets = options.keysets;
            for (var i = 0; i < keysets.length; i++) {
                if (keysets[i].modifier(evt)) {
                    return true;
                }
            }
            return false;
        };
        
        var isActiveItemMovable = function () {
            return $.inArray(thatReorderer.activeItem, thatReorderer.dom.fastLocate("movables")) >= 0;
        };
        
        var setDropEffects = function (value) {
            thatReorderer.dom.fastLocate("dropTargets").attr("aria-dropeffect", value);
        };
        
        var styles = options.styles;
        
        var noModifier = function (evt) {
            return (!evt.ctrlKey && !evt.altKey && !evt.shiftKey && !evt.metaKey);
        };
        
        var handleDirectionKeyDown = function (evt) {
            var item = thatReorderer.activeItem;
            if (!item) {
                return true;
            }
            var keysets = options.keysets;
            for (var i = 0; i < keysets.length; i++) {
                var keyset = keysets[i];
                var didProcessKey = false;
                var keydir = fluid.keyForValue(keyset, evt.keyCode);
                if (!keydir) {
                    continue;
                }
                var isMovement = keyset.modifier(evt);
                
                var dirnum = fluid.keycodeDirection[keydir];
                var relativeItem = thatReorderer.layoutHandler.getRelativePosition(item, dirnum, !isMovement);
                if (!relativeItem) {
                    continue;
                }
                
                if (isMovement) {
                    var prevent = thatReorderer.events.onBeginMove.fire(item);
                    if (prevent === false) {
                        return false;
                    }
                    if (kbDropWarning.length > 0) {
                        if (relativeItem.clazz === "locked") {
                            thatReorderer.events.onShowKeyboardDropWarning.fire(item, kbDropWarning);
                            kbDropWarning.show();                       
                        }
                        else {
                            kbDropWarning.hide();
                        }
                    }
                    if (relativeItem.element) {
                        thatReorderer.requestMovement(relativeItem, item);
                    }
            
                } else if (noModifier(evt)) {
                    $(relativeItem.element).focus();
                }
                return false;
            }
            return true;
        };

        thatReorderer.handleKeyDown = function (evt) {
            if (!thatReorderer.activeItem || thatReorderer.activeItem !== evt.target) {
                return true;
            }
            // If the key pressed is ctrl, and the active item is movable we want to restyle the active item.
            var jActiveItem = $(thatReorderer.activeItem);
            if (!jActiveItem.hasClass(styles.dragging) && isMove(evt)) {
               // Don't treat the active item as dragging unless it is a movable.
                if (isActiveItemMovable()) {
                    jActiveItem.removeClass(styles.selected);
                    jActiveItem.addClass(styles.dragging);
                    jActiveItem.attr("aria-grabbed", "true");
                    setDropEffects("move");
                }
                return false;
            }
            // The only other keys we listen for are the arrows.
            return handleDirectionKeyDown(evt);
        };

        thatReorderer.handleKeyUp = function (evt) {
            if (!thatReorderer.activeItem || thatReorderer.activeItem !== evt.target) {
                return true;
            }
            var jActiveItem = $(thatReorderer.activeItem);
            
            // Handle a key up event for the modifier
            if (jActiveItem.hasClass(styles.dragging) && !isMove(evt)) {
                if (kbDropWarning) {
                    kbDropWarning.hide();
                }
                jActiveItem.removeClass(styles.dragging);
                jActiveItem.addClass(styles.selected);
                jActiveItem.attr("aria-grabbed", "false");
                setDropEffects("none");
                return false;
            }
            
            return false;
        };

        var dropMarker;

        var createDropMarker = function (tagName) {
            var dropMarker = $(document.createElement(tagName));
            dropMarker.addClass(options.styles.dropMarker);
            dropMarker.hide();
            return dropMarker;
        };

        fluid.logEnabled = true;

        thatReorderer.requestMovement = function (requestedPosition, item) {
          // Temporary censoring to get around ModuleLayout inability to update relative to self.
            if (!requestedPosition || fluid.unwrap(requestedPosition.element) === fluid.unwrap(item)) {
                return;
            }
            thatReorderer.events.onMove.fire(item, requestedPosition);
            dropManager.geometricMove(item, requestedPosition.element, requestedPosition.position);
            //$(thatReorderer.activeItem).removeClass(options.styles.selected);
           
            // refocus on the active item because moving places focus on the body
            $(thatReorderer.activeItem).focus();
            
            thatReorderer.refresh();
            
            dropManager.updateGeometry(thatReorderer.layoutHandler.getGeometricInfo());

            thatReorderer.events.afterMove.fire(item, requestedPosition, thatReorderer.dom.fastLocate("movables"));
        };

        var hoverStyleHandler = function (item, state) {
            thatReorderer.dom.fastLocate("grabHandle", item)[state?"addClass":"removeClass"](styles.hover);
        };
        /**
         * Takes a $ object and adds 'movable' functionality to it
         */
        function initMovable(item) {
            var styles = options.styles;
            item.attr("aria-grabbed", "false");

            item.mouseover(
                function () {
                    thatReorderer.events.onHover.fire(item, true);
                }
            );
        
            item.mouseout(
                function () {
                    thatReorderer.events.onHover.fire(item, false);
                }
            );
            var avatar;
        
            thatReorderer.dom.fastLocate("grabHandle", item).draggable({
                refreshPositions: false,
                scroll: true,
                helper: function () {
                    var dropWarningEl;
                    if (mouseDropWarning) {
                        dropWarningEl = mouseDropWarning[0];
                    }
                    avatar = $(options.avatarCreator(item[0], styles.avatar, dropWarningEl));
                    avatar.attr("id", createAvatarId(thatReorderer.container.id));
                    return avatar;
                },
                start: function (e, ui) {
                    var prevent = thatReorderer.events.onBeginMove.fire(item);
                    if (prevent === false) {
                        return false;
                    }
                    var handle = thatReorderer.dom.fastLocate("grabHandle", item)[0];
                    var handlePos = fluid.dom.computeAbsolutePosition(handle);
                    var handleWidth = handle.offsetWidth;
                    var handleHeight = handle.offsetHeight;
                    item.focus();
                    item.removeClass(options.styles.selected);
                    item.addClass(options.styles.mouseDrag);
                    item.attr("aria-grabbed", "true");
                    setDropEffects("move");
                    dropManager.startDrag(e, handlePos, handleWidth, handleHeight);
                    avatar.show();
                },
                stop: function (e, ui) {
                    item.removeClass(options.styles.mouseDrag);
                    item.addClass(options.styles.selected);
                    $(thatReorderer.activeItem).attr("aria-grabbed", "false");
                    var markerNode = fluid.unwrap(dropMarker);
                    if (markerNode.parentNode) {
                        markerNode.parentNode.removeChild(markerNode);
                    }
                    avatar.hide();
                    ui.helper = null;
                    setDropEffects("none");
                    dropManager.endDrag();
                    
                    thatReorderer.requestMovement(dropManager.lastPosition(), item);
                    // refocus on the active item because moving places focus on the body
                    thatReorderer.activeItem.focus();
                },
                handle: thatReorderer.dom.fastLocate("grabHandle", item)
            });
        }
           
        function changeSelectedToDefault(jItem, styles) {
            jItem.removeClass(styles.selected);
            jItem.removeClass(styles.dragging);
            jItem.addClass(styles.defaultStyle);
            jItem.attr("aria-selected", "false");
        }
           
        var selectItem = function (anItem) {
            thatReorderer.events.onSelect.fire(anItem);
            var styles = options.styles;
            // Set the previous active item back to its default state.
            if (thatReorderer.activeItem && thatReorderer.activeItem !== anItem) {
                changeSelectedToDefault($(thatReorderer.activeItem), styles);
            }
            // Then select the new item.
            thatReorderer.activeItem = anItem;
            var jItem = $(anItem);
            jItem.removeClass(styles.defaultStyle);
            jItem.addClass(styles.selected);
            jItem.attr("aria-selected", "true");
        };
   
        var initSelectables = function () {
            var handleBlur = function (evt) {
                changeSelectedToDefault($(this), options.styles);
                return evt.stopPropagation();
            };
        
            var handleFocus = function (evt) {
                selectItem(this);
                return evt.stopPropagation();
            };
            
            var selectables = thatReorderer.dom.fastLocate("selectables");
            for (var i = 0; i < selectables.length; ++ i) {
                var selectable = $(selectables[i]);
                if (!$.data(selectable[0], "fluid.reorderer.selectable-initialised")) { 
                    selectable.addClass(styles.defaultStyle);
            
                    selectables.blur(handleBlur);
                    selectables.focus(handleFocus);
                    selectables.click(function (evt) {
                        var handle = fluid.unwrap(thatReorderer.dom.fastLocate("grabHandle", this));
                        if (fluid.dom.isContainer(handle, evt.target)) {
                            $(this).focus();
                        }
                    });
                    
                    selectables.attr("role", options.containerRole.item);
                    selectables.attr("aria-selected", "false");
                    selectables.attr("aria-disabled", "false");
                    $.data(selectable[0], "fluid.reorderer.selectable-initialised", true);
                }
            }
            if (!thatReorderer.selectableContext) {
                thatReorderer.selectableContext = fluid.selectable(thatReorderer.container, {
                    selectableElements: selectables,
                    selectablesTabindex: thatReorderer.options.selectablesTabindex,
                    direction: null
                });
            }
        };
    
        var dropChangeListener = function (dropTarget) {
            fluid.moveDom(dropMarker, dropTarget.element, dropTarget.position);
            dropMarker.css("display", "");
            if (mouseDropWarning) {
                if (dropTarget.lockedelem) {
                    mouseDropWarning.show();
                }
                else {
                    mouseDropWarning.hide();
                }
            }
        };
    
        var initItems = function () {
            var movables = thatReorderer.dom.fastLocate("movables");
            var dropTargets = thatReorderer.dom.fastLocate("dropTargets");
            initSelectables();
        
            // Setup movables
            for (var i = 0; i < movables.length; i++) {
                var item = movables[i];
                if (!$.data(item, "fluid.reorderer.movable-initialised")) { 
                    initMovable($(item));
                    $.data(item, "fluid.reorderer.movable-initialised", true);
                }
            }

            // In order to create valid html, the drop marker is the same type as the node being dragged.
            // This creates a confusing UI in cases such as an ordered list. 
            // drop marker functionality should be made pluggable. 
            if (movables.length > 0 && !dropMarker) {
                dropMarker = createDropMarker(movables[0].tagName);
            }
            
            dropManager.updateGeometry(thatReorderer.layoutHandler.getGeometricInfo());
            
            dropManager.dropChangeFirer.addListener(dropChangeListener, "fluid.Reorderer");
            // Setup dropTargets
            dropTargets.attr("aria-dropeffect", "none");  

        };


        // Final initialization of the Reorderer at the end of the construction process 
        if (thatReorderer.container) {
            bindHandlersToContainer(thatReorderer.container, 
                thatReorderer.handleKeyDown,
                thatReorderer.handleKeyUp);
            addRolesToContainer(thatReorderer);
            fluid.tabbable(thatReorderer.container);
            initItems();
        }

        if (options.afterMoveCallbackUrl) {
            thatReorderer.events.afterMove.addListener(function () {
                var layoutHandler = thatReorderer.layoutHandler;
                var model = layoutHandler.getModel? layoutHandler.getModel():
                     options.acquireModel(thatReorderer);
                $.post(options.afterMoveCallbackUrl, JSON.stringify(model));
            }, "postModel");
        }
        thatReorderer.events.onHover.addListener(hoverStyleHandler, "style");

        thatReorderer.refresh = function () {
            thatReorderer.dom.refresh("movables");
            thatReorderer.dom.refresh("selectables");
            thatReorderer.dom.refresh("grabHandle", thatReorderer.dom.fastLocate("movables"));
            thatReorderer.dom.refresh("stylisticOffset", thatReorderer.dom.fastLocate("movables"));
            thatReorderer.dom.refresh("dropTargets");
            thatReorderer.events.onRefresh.fire();
            initItems();
            thatReorderer.selectableContext.selectables = thatReorderer.dom.fastLocate("selectables");
            thatReorderer.selectableContext.selectablesUpdated(thatReorderer.activeItem);
        };

        thatReorderer.refresh();

        return thatReorderer;
    };
    
    /**
     * Constants for key codes in events.
     */    
    fluid.reorderer.keys = {
        TAB: 9,
        ENTER: 13,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        META: 19,
        SPACE: 32,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        i: 73,
        j: 74,
        k: 75,
        m: 77
    };
    
    /**
     * The default key sets for the Reorderer. Should be moved into the proper component defaults.
     */
    fluid.reorderer.defaultKeysets = [{
        modifier : function (evt) {
            return evt.ctrlKey;
        },
        up : fluid.reorderer.keys.UP,
        down : fluid.reorderer.keys.DOWN,
        right : fluid.reorderer.keys.RIGHT,
        left : fluid.reorderer.keys.LEFT
    },
    {
        modifier : function (evt) {
            return evt.ctrlKey;
        },
        up : fluid.reorderer.keys.i,
        down : fluid.reorderer.keys.m,
        right : fluid.reorderer.keys.k,
        left : fluid.reorderer.keys.j
    }];
    
    /**
     * These roles are used to add ARIA roles to orderable items. This list can be extended as needed,
     * but the values of the container and item roles must match ARIA-specified roles.
     */  
    fluid.reorderer.roles = {
        GRID: { container: "grid", item: "gridcell" },
        LIST: { container: "list", item: "listitem" },
        REGIONS: { container: "main", item: "article" }
    };
    
    // Simplified API for reordering lists and grids.
    var simpleInit = function (container, layoutHandler, options) {
        options = options || {};
        options.layoutHandler = layoutHandler;
        return fluid.reorderer(container, options);
    };
    
    fluid.reorderList = function (container, options) {
        return simpleInit(container, "fluid.listLayoutHandler", options);
    };
    
    fluid.reorderGrid = function (container, options) {
        return simpleInit(container, "fluid.gridLayoutHandler", options); 
    };
    
    fluid.reorderer.GEOMETRIC_STRATEGY   = "projectFrom";
    fluid.reorderer.LOGICAL_STRATEGY     = "logicalFrom";
    fluid.reorderer.WRAP_LOCKED_STRATEGY = "lockedWrapFrom";
    fluid.reorderer.NO_STRATEGY = null;
    
    fluid.reorderer.relativeInfoGetter = function (orientation, coStrategy, contraStrategy, dropManager, dom) {
        return function (item, direction, forSelection) {
            var dirorient = fluid.directionOrientation(direction);
            var strategy = dirorient === orientation? coStrategy: contraStrategy;
            return strategy !== null? dropManager[strategy](item, direction, forSelection) : null;
        };
    };
    
    fluid.defaults("fluid.reorderer", {
        styles: {
            defaultStyle: "fl-reorderer-movable-default",
            selected: "fl-reorderer-movable-selected",
            dragging: "fl-reorderer-movable-dragging",
            mouseDrag: "fl-reorderer-movable-dragging",
            hover: "fl-reorderer-movable-hover",
            dropMarker: "fl-reorderer-dropMarker",
            avatar: "fl-reorderer-avatar"
        },
        selectors: {
            dropWarning: ".flc-reorderer-dropWarning",
            movables: ".flc-reorderer-movable",
            grabHandle: "",
            stylisticOffset: ""
        },
        avatarCreator: defaultAvatarCreator,
        keysets: fluid.reorderer.defaultKeysets,
        layoutHandler: {
            type: "fluid.listLayoutHandler"
        },
        
        events: {
            onShowKeyboardDropWarning: null,
            onSelect: null,
            onBeginMove: "preventable",
            onMove: null,
            afterMove: null,
            onHover: null,
            onRefresh: null
        },
        
        mergePolicy: {
            keysets: "replace",
            "selectors.selectables": "selectors.movables",
            "selectors.dropTargets": "selectors.movables"
        }
    });


    /*******************
     * Layout Handlers *
     *******************/

    function geometricInfoGetter(orientation, sentinelize, dom) {
        return function () {
            return {
                sentinelize: sentinelize,
                extents: [{
                    orientation: orientation,
                    elements: dom.fastLocate("dropTargets")
                }],
                elementMapper: function (element) {
                    return $.inArray(element, dom.fastLocate("movables")) === -1? "locked": null;
                }
            };
        };
    }
    
    fluid.defaults(true, "fluid.listLayoutHandler", 
        {orientation:         fluid.orientation.VERTICAL,
         containerRole:       fluid.reorderer.roles.LIST,
         selectablesTabindex: -1,
         sentinelize:         true
        });
    
    // Public layout handlers.
    fluid.listLayoutHandler = function (container, options, dropManager, dom) {
        var that = {};

        that.getRelativePosition = 
          fluid.reorderer.relativeInfoGetter(options.orientation, 
                fluid.reorderer.LOGICAL_STRATEGY, null, dropManager, dom);
        
        that.getGeometricInfo = geometricInfoGetter(options.orientation, options.sentinelize, dom);
        
        return that;
    }; // End ListLayoutHandler

    fluid.defaults(true, "fluid.gridLayoutHandler", 
        {orientation:         fluid.orientation.HORIZONTAL,
         containerRole:       fluid.reorderer.roles.GRID,
         selectablesTabindex: -1,
         sentinelize:         false
         });
    /*
     * Items in the Lightbox are stored in a list, but they are visually presented as a grid that
     * changes dimensions when the window changes size. As a result, when the user presses the up or
     * down arrow key, what lies above or below depends on the current window size.
     * 
     * The GridLayoutHandler is responsible for handling changes to this virtual 'grid' of items
     * in the window, and of informing the Lightbox of which items surround a given item.
     */
    fluid.gridLayoutHandler = function (container, options, dropManager, dom) {
        var that = {};

        that.getRelativePosition = 
           fluid.reorderer.relativeInfoGetter(options.orientation, 
                 fluid.reorderer.LOGICAL_STRATEGY, fluid.reorderer.GEOMETRIC_STRATEGY, 
                 dropManager, dom);
        
        that.getGeometricInfo = geometricInfoGetter(options.orientation, options.sentinelize, dom);
        
        return that;
    }; // End of GridLayoutHandler

})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
    
    var deriveLightboxCellBase = function (namebase, index) {
        return namebase + "lightbox-cell:" + index + ":";
    };
            
    var addThumbnailActivateHandler = function (lightboxContainer) {
        var enterKeyHandler = function (evt) {
            if (evt.which === fluid.reorderer.keys.ENTER) {
                var thumbnailAnchors = $("a", evt.target);
                document.location = thumbnailAnchors.attr('href');
            }
        };
        
        $(lightboxContainer).keypress(enterKeyHandler);
    };
    
    // Custom query method seeks all tags descended from a given root with a 
    // particular tag name, whose id matches a regex.
    var seekNodesById = function (rootnode, tagname, idmatch) {
        var inputs = rootnode.getElementsByTagName(tagname);
        var togo = [];
        for (var i = 0; i < inputs.length; i += 1) {
            var input = inputs[i];
            var id = input.id;
            if (id && id.match(idmatch)) {
                togo.push(input);
            }
        }
        return togo;
    };
    
    var createItemFinder = function (parentNode, containerId) {
        // This orderable finder knows that the lightbox thumbnails are 'div' elements
        var lightboxCellNamePattern = "^" + deriveLightboxCellBase(containerId, "[0-9]+") + "$";
        
        return function () {
            return seekNodesById(parentNode, "div", lightboxCellNamePattern);
        };
    };
    
    var findForm = function (element) {
        while (element) {
            if (element.nodeName.toLowerCase() === "form") {
                return element;
            }
            element = element.parentNode;
        }
    };
    
    /**
     * Returns the default Lightbox order change callback. This callback is used by the Lightbox
     * to send any changes in image order back to the server. It is implemented by nesting
     * a form and set of hidden fields within the Lightbox container which contain the order value
     * for each image displayed in the Lightbox. The default callback submits the form's default 
     * action via AJAX.
     * 
     * @param {Element} lightboxContainer The DOM element containing the form that is POSTed back to the server upon order change 
     */
    var defaultAfterMoveCallback = function (lightboxContainer) {
        var reorderform = findForm(lightboxContainer);
        
        return function () {
            var inputs, i;
            inputs = seekNodesById(
                reorderform, 
                "input", 
                "^" + deriveLightboxCellBase(lightboxContainer.id, "[^:]*") + "reorder-index$");
            
            for (i = 0; i < inputs.length; i += 1) {
                inputs[i].value = i;
            }
        
            if (reorderform && reorderform.action) {
                $.post(reorderform.action, 
                $(reorderform).serialize(),
                function (type, data, evt) { /* No-op response */ });
            }
        };
    };

    fluid.defaults("fluid.reorderImages", {
        layoutHandler: "fluid.gridLayoutHandler",

        selectors: {
            imageTitle: ".flc-reorderer-imageTitle"
        }
    });

    // Public Lightbox API
    /**
     * Creates a new Lightbox instance from the specified parameters, providing full control over how
     * the Lightbox is configured.
     * 
     * @param {Object} container 
     * @param {Object} options 
     */
    fluid.reorderImages = function (container, options) {
        var that = fluid.initView("fluid.reorderImages", container, options);
        
        var containerEl = fluid.unwrap(that.container);

        if (!that.options.afterMoveCallback) {
            that.options.afterMoveCallback = defaultAfterMoveCallback(containerEl);
        }
        if (!that.options.selectors.movables) {
            that.options.selectors.movables = createItemFinder(containerEl, containerEl.id);
        }
        
        var reorderer = fluid.reorderer(container, that.options);
        var movables = reorderer.locate("movables");
        fluid.transform(movables, function (cell) { 
            fluid.reorderImages.addAriaRoles(that.options.selectors.imageTitle, cell);
        });
                // Remove the anchors from the taborder.
        fluid.tabindex($("a", container), -1);
        addThumbnailActivateHandler(container);
        return reorderer;
    };
   
    
    fluid.reorderImages.addAriaRoles = function (imageTitle, cell) {
        cell = $(cell);
        cell.attr("role", "img");
        var title = $(imageTitle, cell);
        if (title[0] === cell[0] || title[0] === document) {
            fluid.fail("Could not locate cell title using selector " + imageTitle + " in context " + fluid.dumpEl(cell));
        }
        var titleId = fluid.allocateSimpleId(title);
        cell.attr("aria-labelledby", titleId);
        var image = $("img", cell);
        image.attr("role", "presentation");
        image.attr("alt", "");
    };
    
    // This function now deprecated. Please use fluid.reorderImages() instead.
    fluid.lightbox = fluid.reorderImages;
    
        
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

// Declare dependencies.
/*global jQuery*/
/*global fluid, fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

fluid.moduleLayout = fluid.moduleLayout || {};

(function ($, fluid) {

    /**
     * Calculate the location of the item and the column in which it resides.
     * @return  An object with column index and item index (within that column) properties.
     *          These indices are -1 if the item does not exist in the grid.
     */
    var findColumnAndItemIndices = function (item, layout) {
        return fluid.find(layout.columns,
            function (column, colIndex) {
                var index = $.inArray(item, column.elements);
                return index === -1? null : {columnIndex: colIndex, itemIndex: index};
            }, {columnIndex: -1, itemIndex: -1});
    };
        
    var findColIndex = function (item, layout) {
        return fluid.find(layout.columns,
            function (column, colIndex) {
            	return item === column.container? colIndex : null;
            }, -1);
    };

    /**
     * Move an item within the layout object. 
     */
    fluid.moduleLayout.updateLayout = function (item, target, position, layout) {
        item = fluid.unwrap(item);
        target = fluid.unwrap(target);
        var itemIndices = findColumnAndItemIndices(item, layout);
        layout.columns[itemIndices.columnIndex].elements.splice(itemIndices.itemIndex, 1);
        var targetCol;
        if (position === fluid.position.INSIDE) {
            targetCol = layout.columns[findColIndex(target, layout)].elements;
            targetCol.splice(targetCol.length, 0, item);

        } else {
            var relativeItemIndices = findColumnAndItemIndices(target, layout);
            targetCol = layout.columns[relativeItemIndices.columnIndex].elements;
            position = fluid.normalisePosition(position, 
                  itemIndices.columnIndex === relativeItemIndices.columnIndex, 
                  relativeItemIndices.itemIndex, itemIndices.itemIndex);
            var relative = position === fluid.position.BEFORE? 0 : 1;
            targetCol.splice(relativeItemIndices.itemIndex + relative, 0, item);
        }
    };
       
    /**
     * Builds a layout object from a set of columns and modules.
     * @param {jQuery} container
     * @param {jQuery} columns
     * @param {jQuery} portlets
     */
    fluid.moduleLayout.layoutFromFlat = function (container, columns, portlets) {
        var layout = {};
        layout.container = container;
        layout.columns = fluid.transform(columns, 
            function (column) {
                return {
                    container: column,
                    elements: $.makeArray(portlets.filter(function () {
                    	  // is this a bug in filter? would have expected "this" to be 1st arg
                        return fluid.dom.isContainer(column, this);
                    }))
                };
            });
        return layout;
    };
      
    /**
     * Builds a layout object from a serialisable "layout" object consisting of id lists
     */
    fluid.moduleLayout.layoutFromIds = function (idLayout) {
        return {
            container: fluid.byId(idLayout.id),
            columns: fluid.transform(idLayout.columns, 
                function (column) {
                    return {
                        container: fluid.byId(column.id),
                        elements: fluid.transform(column.children, fluid.byId)
                    };
                })
            };
    };
      
    /**
     * Serializes the current layout into a structure of ids
     */
    fluid.moduleLayout.layoutToIds = function (idLayout) {
        return {
            id: fluid.getId(idLayout.container),
            columns: fluid.transform(idLayout.columns, 
                function (column) {
                    return {
                        id: fluid.getId(column.container),
                        children: fluid.transform(column.elements, fluid.getId)
                    };
                })
            };
    };
    
    var defaultOnShowKeyboardDropWarning = function (item, dropWarning) {
        if (dropWarning) {
            var offset = $(item).offset();
            dropWarning = $(dropWarning);
            dropWarning.css("position", "absolute");
            dropWarning.css("top", offset.top);
            dropWarning.css("left", offset.left);
        }
    };
    
    fluid.defaults(true, "fluid.moduleLayoutHandler", 
        {orientation: fluid.orientation.VERTICAL,
         containerRole: fluid.reorderer.roles.REGIONS,
         selectablesTabindex: 0,
         sentinelize:         true
         });
    
    /**
     * Module Layout Handler for reordering content modules.
     * 
     * General movement guidelines:
     * 
     * - Arrowing sideways will always go to the top (moveable) module in the column
     * - Moving sideways will always move to the top available drop target in the column
     * - Wrapping is not necessary at this first pass, but is ok
     */
    fluid.moduleLayoutHandler = function (container, options, dropManager, dom) {
        var that = {};
        
        function computeLayout() {
            var togo;
            if (options.selectors.modules) {
                togo = fluid.moduleLayout.layoutFromFlat(container, dom.locate("columns"), dom.locate("modules"));
            }
            if (!togo) {
                var idLayout = fluid.model.getBeanValue(options, "moduleLayout.layout");
                fluid.moduleLayout.layoutFromIds(idLayout);
            }
            return togo;
        }
        var layout = computeLayout();
        that.layout = layout;

        function isLocked(item) {
            var lockedModules = options.selectors.lockedModules? dom.fastLocate("lockedModules") : [];
            return $.inArray(item, lockedModules) !== -1;
        }

        that.getRelativePosition  = 
           fluid.reorderer.relativeInfoGetter(options.orientation, 
                 fluid.reorderer.WRAP_LOCKED_STRATEGY, fluid.reorderer.GEOMETRIC_STRATEGY, 
                 dropManager, dom);
                 
        that.getGeometricInfo = function () {
        	var extents = [];
            var togo = {extents: extents,
                        sentinelize: options.sentinelize};
            togo.elementMapper = function (element) {
                return isLocked(element)? "locked" : null;
            };
            for (var col = 0; col < layout.columns.length; col++) {
                var column = layout.columns[col];
                var thisEls = {
                    orientation: options.orientation,
                    elements: $.makeArray(column.elements),
                    parentElement: column.container
                };
              //  fluid.log("Geometry col " + col + " elements " + fluid.dumpEl(thisEls.elements) + " isLocked [" + 
              //       fluid.transform(thisEls.elements, togo.elementMapper).join(", ") + "]");
                extents.push(thisEls);
            }

            return togo;
        };
        
        function computeModules(all) {
            return function () {
                var modules = fluid.accumulate(layout.columns, function (column, list) {
                    return list.concat(column.elements); // note that concat will not work on a jQuery
                }, []);
                if (!all) {
                    fluid.remove_if(modules, isLocked);
                }
                return modules;
            };
        }
        
        that.returnedOptions = {
            selectors: {
                movables: computeModules(false),
                dropTargets: computeModules(false),
                selectables: computeModules(true)
            },
            listeners: {
                onMove: function (item, requestedPosition) {
                    fluid.moduleLayout.updateLayout(item, requestedPosition.element, requestedPosition.position, layout);
                },
                onRefresh: function () {
                    layout = computeLayout();
                    that.layout = layout;
                },
                "onShowKeyboardDropWarning.setPosition": defaultOnShowKeyboardDropWarning
            }
        };
        
        that.getModel = function () {
            return fluid.moduleLayout.layoutToIds(layout);
        };
              
        return that;
    };
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/
fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
 
    /**
     * Simple way to create a layout reorderer.
     * @param {selector} a selector for the layout container
     * @param {Object} a map of selectors for columns and modules within the layout
     * @param {Function} a function to be called when the order changes 
     * @param {Object} additional configuration options
     */
    fluid.reorderLayout = function (container, userOptions) {
        var assembleOptions = {
            layoutHandler: "fluid.moduleLayoutHandler",
            selectors: {
                columns: ".flc-reorderer-column",
                modules: ".flc-reorderer-module"
            }
        };
        var options = $.extend(true, assembleOptions, userOptions);
        return fluid.reorderer(container, options);
    };    
})(jQuery, fluid_1_1);
/*! SWFObject v2.1 <http://code.google.com/p/swfobject/>
	Copyright (c) 2007-2008 Geoff Stearns, Michael Williams, and Bobby van der Sluis
	This software is released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
*/

var swfobject = function() {
	
	var UNDEF = "undefined",
		OBJECT = "object",
		SHOCKWAVE_FLASH = "Shockwave Flash",
		SHOCKWAVE_FLASH_AX = "ShockwaveFlash.ShockwaveFlash",
		FLASH_MIME_TYPE = "application/x-shockwave-flash",
		EXPRESS_INSTALL_ID = "SWFObjectExprInst",
		
		win = window,
		doc = document,
		nav = navigator,
		
		domLoadFnArr = [],
		regObjArr = [],
		objIdArr = [],
		listenersArr = [],
		script,
		timer = null,
		storedAltContent = null,
		storedAltContentId = null,
		isDomLoaded = false,
		isExpressInstallActive = false;
	
	/* Centralized function for browser feature detection
		- Proprietary feature detection (conditional compiling) is used to detect Internet Explorer's features
		- User agent string detection is only used when no alternative is possible
		- Is executed directly for optimal performance
	*/	
	var ua = function() {
		var w3cdom = typeof doc.getElementById != UNDEF && typeof doc.getElementsByTagName != UNDEF && typeof doc.createElement != UNDEF,
			playerVersion = [0,0,0],
			d = null;
		if (typeof nav.plugins != UNDEF && typeof nav.plugins[SHOCKWAVE_FLASH] == OBJECT) {
			d = nav.plugins[SHOCKWAVE_FLASH].description;
			if (d && !(typeof nav.mimeTypes != UNDEF && nav.mimeTypes[FLASH_MIME_TYPE] && !nav.mimeTypes[FLASH_MIME_TYPE].enabledPlugin)) { // navigator.mimeTypes["application/x-shockwave-flash"].enabledPlugin indicates whether plug-ins are enabled or disabled in Safari 3+
				d = d.replace(/^.*\s+(\S+\s+\S+$)/, "$1");
				playerVersion[0] = parseInt(d.replace(/^(.*)\..*$/, "$1"), 10);
				playerVersion[1] = parseInt(d.replace(/^.*\.(.*)\s.*$/, "$1"), 10);
				playerVersion[2] = /r/.test(d) ? parseInt(d.replace(/^.*r(.*)$/, "$1"), 10) : 0;
			}
		}
		else if (typeof win.ActiveXObject != UNDEF) {
			var a = null, fp6Crash = false;
			try {
				a = new ActiveXObject(SHOCKWAVE_FLASH_AX + ".7");
			}
			catch(e) {
				try { 
					a = new ActiveXObject(SHOCKWAVE_FLASH_AX + ".6");
					playerVersion = [6,0,21];
					a.AllowScriptAccess = "always";	 // Introduced in fp6.0.47
				}
				catch(e) {
					if (playerVersion[0] == 6) {
						fp6Crash = true;
					}
				}
				if (!fp6Crash) {
					try {
						a = new ActiveXObject(SHOCKWAVE_FLASH_AX);
					}
					catch(e) {}
				}
			}
			if (!fp6Crash && a) { // a will return null when ActiveX is disabled
				try {
					d = a.GetVariable("$version");	// Will crash fp6.0.21/23/29
					if (d) {
						d = d.split(" ")[1].split(",");
						playerVersion = [parseInt(d[0], 10), parseInt(d[1], 10), parseInt(d[2], 10)];
					}
				}
				catch(e) {}
			}
		}
		var u = nav.userAgent.toLowerCase(),
			p = nav.platform.toLowerCase(),
			webkit = /webkit/.test(u) ? parseFloat(u.replace(/^.*webkit\/(\d+(\.\d+)?).*$/, "$1")) : false, // returns either the webkit version or false if not webkit
			ie = false,
			windows = p ? /win/.test(p) : /win/.test(u),
			mac = p ? /mac/.test(p) : /mac/.test(u);
		/*@cc_on
			ie = true;
			@if (@_win32)
				windows = true;
			@elif (@_mac)
				mac = true;
			@end
		@*/
		return { w3cdom:w3cdom, pv:playerVersion, webkit:webkit, ie:ie, win:windows, mac:mac };
	}();

	/* Cross-browser onDomLoad
		- Based on Dean Edwards' solution: http://dean.edwards.name/weblog/2006/06/again/
		- Will fire an event as soon as the DOM of a page is loaded (supported by Gecko based browsers - like Firefox -, IE, Opera9+, Safari)
	*/ 
	var onDomLoad = function() {
		if (!ua.w3cdom) {
			return;
		}
		addDomLoadEvent(main);
		if (ua.ie && ua.win) {
			try {	 // Avoid a possible Operation Aborted error
				doc.write("<scr" + "ipt id=__ie_ondomload defer=true src=//:></scr" + "ipt>"); // String is split into pieces to avoid Norton AV to add code that can cause errors 
				script = getElementById("__ie_ondomload");
				if (script) {
					addListener(script, "onreadystatechange", checkReadyState);
				}
			}
			catch(e) {}
		}
		if (ua.webkit && typeof doc.readyState != UNDEF) {
			timer = setInterval(function() { if (/loaded|complete/.test(doc.readyState)) { callDomLoadFunctions(); }}, 10);
		}
		if (typeof doc.addEventListener != UNDEF) {
			doc.addEventListener("DOMContentLoaded", callDomLoadFunctions, null);
		}
		addLoadEvent(callDomLoadFunctions);
	}();
	
	function checkReadyState() {
		if (script.readyState == "complete") {
			script.parentNode.removeChild(script);
			callDomLoadFunctions();
		}
	}
	
	function callDomLoadFunctions() {
		if (isDomLoaded) {
			return;
		}
		if (ua.ie && ua.win) { // Test if we can really add elements to the DOM; we don't want to fire it too early
			var s = createElement("span");
			try { // Avoid a possible Operation Aborted error
				var t = doc.getElementsByTagName("body")[0].appendChild(s);
				t.parentNode.removeChild(t);
			}
			catch (e) {
				return;
			}
		}
		isDomLoaded = true;
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		var dl = domLoadFnArr.length;
		for (var i = 0; i < dl; i++) {
			domLoadFnArr[i]();
		}
	}
	
	function addDomLoadEvent(fn) {
		if (isDomLoaded) {
			fn();
		}
		else { 
			domLoadFnArr[domLoadFnArr.length] = fn; // Array.push() is only available in IE5.5+
		}
	}
	
	/* Cross-browser onload
		- Based on James Edwards' solution: http://brothercake.com/site/resources/scripts/onload/
		- Will fire an event as soon as a web page including all of its assets are loaded 
	 */
	function addLoadEvent(fn) {
		if (typeof win.addEventListener != UNDEF) {
			win.addEventListener("load", fn, false);
		}
		else if (typeof doc.addEventListener != UNDEF) {
			doc.addEventListener("load", fn, false);
		}
		else if (typeof win.attachEvent != UNDEF) {
			addListener(win, "onload", fn);
		}
		else if (typeof win.onload == "function") {
			var fnOld = win.onload;
			win.onload = function() {
				fnOld();
				fn();
			};
		}
		else {
			win.onload = fn;
		}
	}
	
	/* Main function
		- Will preferably execute onDomLoad, otherwise onload (as a fallback)
	*/
	function main() { // Static publishing only
		var rl = regObjArr.length;
		for (var i = 0; i < rl; i++) { // For each registered object element
			var id = regObjArr[i].id;
			if (ua.pv[0] > 0) {
				var obj = getElementById(id);
				if (obj) {
					regObjArr[i].width = obj.getAttribute("width") ? obj.getAttribute("width") : "0";
					regObjArr[i].height = obj.getAttribute("height") ? obj.getAttribute("height") : "0";
					if (hasPlayerVersion(regObjArr[i].swfVersion)) { // Flash plug-in version >= Flash content version: Houston, we have a match!
						if (ua.webkit && ua.webkit < 312) { // Older webkit engines ignore the object element's nested param elements
							fixParams(obj);
						}
						setVisibility(id, true);
					}
					else if (regObjArr[i].expressInstall && !isExpressInstallActive && hasPlayerVersion("6.0.65") && (ua.win || ua.mac)) { // Show the Adobe Express Install dialog if set by the web page author and if supported (fp6.0.65+ on Win/Mac OS only)
						showExpressInstall(regObjArr[i]);
					}
					else { // Flash plug-in and Flash content version mismatch: display alternative content instead of Flash content
						displayAltContent(obj);
					}
				}
			}
			else {	// If no fp is installed, we let the object element do its job (show alternative content)
				setVisibility(id, true);
			}
		}
	}
	
	/* Fix nested param elements, which are ignored by older webkit engines
		- This includes Safari up to and including version 1.2.2 on Mac OS 10.3
		- Fall back to the proprietary embed element
	*/
	function fixParams(obj) {
		var nestedObj = obj.getElementsByTagName(OBJECT)[0];
		if (nestedObj) {
			var e = createElement("embed"), a = nestedObj.attributes;
			if (a) {
				var al = a.length;
				for (var i = 0; i < al; i++) {
					if (a[i].nodeName == "DATA") {
						e.setAttribute("src", a[i].nodeValue);
					}
					else {
						e.setAttribute(a[i].nodeName, a[i].nodeValue);
					}
				}
			}
			var c = nestedObj.childNodes;
			if (c) {
				var cl = c.length;
				for (var j = 0; j < cl; j++) {
					if (c[j].nodeType == 1 && c[j].nodeName == "PARAM") {
						e.setAttribute(c[j].getAttribute("name"), c[j].getAttribute("value"));
					}
				}
			}
			obj.parentNode.replaceChild(e, obj);
		}
	}
	
	/* Show the Adobe Express Install dialog
		- Reference: http://www.adobe.com/cfusion/knowledgebase/index.cfm?id=6a253b75
	*/
	function showExpressInstall(regObj) {
		isExpressInstallActive = true;
		var obj = getElementById(regObj.id);
		if (obj) {
			if (regObj.altContentId) {
				var ac = getElementById(regObj.altContentId);
				if (ac) {
					storedAltContent = ac;
					storedAltContentId = regObj.altContentId;
				}
			}
			else {
				storedAltContent = abstractAltContent(obj);
			}
			if (!(/%$/.test(regObj.width)) && parseInt(regObj.width, 10) < 310) {
				regObj.width = "310";
			}
			if (!(/%$/.test(regObj.height)) && parseInt(regObj.height, 10) < 137) {
				regObj.height = "137";
			}
			doc.title = doc.title.slice(0, 47) + " - Flash Player Installation";
			var pt = ua.ie && ua.win ? "ActiveX" : "PlugIn",
				dt = doc.title,
				fv = "MMredirectURL=" + win.location + "&MMplayerType=" + pt + "&MMdoctitle=" + dt,
				replaceId = regObj.id;
			// For IE when a SWF is loading (AND: not available in cache) wait for the onload event to fire to remove the original object element
			// In IE you cannot properly cancel a loading SWF file without breaking browser load references, also obj.onreadystatechange doesn't work
			if (ua.ie && ua.win && obj.readyState != 4) {
				var newObj = createElement("div");
				replaceId += "SWFObjectNew";
				newObj.setAttribute("id", replaceId);
				obj.parentNode.insertBefore(newObj, obj); // Insert placeholder div that will be replaced by the object element that loads expressinstall.swf
				obj.style.display = "none";
				var fn = function() {
					obj.parentNode.removeChild(obj);
				};
				addListener(win, "onload", fn);
			}
			createSWF({ data:regObj.expressInstall, id:EXPRESS_INSTALL_ID, width:regObj.width, height:regObj.height }, { flashvars:fv }, replaceId);
		}
	}
	
	/* Functions to abstract and display alternative content
	*/
	function displayAltContent(obj) {
		if (ua.ie && ua.win && obj.readyState != 4) {
			// For IE when a SWF is loading (AND: not available in cache) wait for the onload event to fire to remove the original object element
			// In IE you cannot properly cancel a loading SWF file without breaking browser load references, also obj.onreadystatechange doesn't work
			var el = createElement("div");
			obj.parentNode.insertBefore(el, obj); // Insert placeholder div that will be replaced by the alternative content
			el.parentNode.replaceChild(abstractAltContent(obj), el);
			obj.style.display = "none";
			var fn = function() {
				obj.parentNode.removeChild(obj);
			};
			addListener(win, "onload", fn);
		}
		else {
			obj.parentNode.replaceChild(abstractAltContent(obj), obj);
		}
	} 

	function abstractAltContent(obj) {
		var ac = createElement("div");
		if (ua.win && ua.ie) {
			ac.innerHTML = obj.innerHTML;
		}
		else {
			var nestedObj = obj.getElementsByTagName(OBJECT)[0];
			if (nestedObj) {
				var c = nestedObj.childNodes;
				if (c) {
					var cl = c.length;
					for (var i = 0; i < cl; i++) {
						if (!(c[i].nodeType == 1 && c[i].nodeName == "PARAM") && !(c[i].nodeType == 8)) {
							ac.appendChild(c[i].cloneNode(true));
						}
					}
				}
			}
		}
		return ac;
	}
	
	/* Cross-browser dynamic SWF creation
	*/
	function createSWF(attObj, parObj, id) {
		var r, el = getElementById(id);
		if (el) {
			if (typeof attObj.id == UNDEF) { // if no 'id' is defined for the object element, it will inherit the 'id' from the alternative content
				attObj.id = id;
			}
			if (ua.ie && ua.win) { // IE, the object element and W3C DOM methods do not combine: fall back to outerHTML
				var att = "";
				for (var i in attObj) {
					if (attObj[i] != Object.prototype[i]) { // Filter out prototype additions from other potential libraries, like Object.prototype.toJSONString = function() {}
						if (i.toLowerCase() == "data") {
							parObj.movie = attObj[i];
						}
						else if (i.toLowerCase() == "styleclass") { // 'class' is an ECMA4 reserved keyword
							att += ' class="' + attObj[i] + '"';
						}
						else if (i.toLowerCase() != "classid") {
							att += ' ' + i + '="' + attObj[i] + '"';
						}
					}
				}
				var par = "";
				for (var j in parObj) {
					if (parObj[j] != Object.prototype[j]) { // Filter out prototype additions from other potential libraries
						par += '<param name="' + j + '" value="' + parObj[j] + '" />';
					}
				}
				el.outerHTML = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"' + att + '>' + par + '</object>';
				objIdArr[objIdArr.length] = attObj.id; // Stored to fix object 'leaks' on unload (dynamic publishing only)
				r = getElementById(attObj.id);	
			}
			else if (ua.webkit && ua.webkit < 312) { // Older webkit engines ignore the object element's nested param elements: fall back to the proprietary embed element
				var e = createElement("embed");
				e.setAttribute("type", FLASH_MIME_TYPE);
				for (var k in attObj) {
					if (attObj[k] != Object.prototype[k]) { // Filter out prototype additions from other potential libraries
						if (k.toLowerCase() == "data") {
							e.setAttribute("src", attObj[k]);
						}
						else if (k.toLowerCase() == "styleclass") { // 'class' is an ECMA4 reserved keyword
							e.setAttribute("class", attObj[k]);
						}
						else if (k.toLowerCase() != "classid") { // Filter out IE specific attribute
							e.setAttribute(k, attObj[k]);
						}
					}
				}
				for (var l in parObj) {
					if (parObj[l] != Object.prototype[l]) { // Filter out prototype additions from other potential libraries
						if (l.toLowerCase() != "movie") { // Filter out IE specific param element
							e.setAttribute(l, parObj[l]);
						}
					}
				}
				el.parentNode.replaceChild(e, el);
				r = e;
			}
			else { // Well-behaving browsers
				var o = createElement(OBJECT);
				o.setAttribute("type", FLASH_MIME_TYPE);
				for (var m in attObj) {
					if (attObj[m] != Object.prototype[m]) { // Filter out prototype additions from other potential libraries
						if (m.toLowerCase() == "styleclass") { // 'class' is an ECMA4 reserved keyword
							o.setAttribute("class", attObj[m]);
						}
						else if (m.toLowerCase() != "classid") { // Filter out IE specific attribute
							o.setAttribute(m, attObj[m]);
						}
					}
				}
				for (var n in parObj) {
					if (parObj[n] != Object.prototype[n] && n.toLowerCase() != "movie") { // Filter out prototype additions from other potential libraries and IE specific param element
						createObjParam(o, n, parObj[n]);
					}
				}
				el.parentNode.replaceChild(o, el);
				r = o;
			}
		}
		return r;
	}
	
	function createObjParam(el, pName, pValue) {
		var p = createElement("param");
		p.setAttribute("name", pName);	
		p.setAttribute("value", pValue);
		el.appendChild(p);
	}
	
	/* Cross-browser SWF removal
		- Especially needed to safely and completely remove a SWF in Internet Explorer
	*/
	function removeSWF(id) {
		var obj = getElementById(id);
		if (obj && (obj.nodeName == "OBJECT" || obj.nodeName == "EMBED")) {
			if (ua.ie && ua.win) {
				if (obj.readyState == 4) {
					removeObjectInIE(id);
				}
				else {
					win.attachEvent("onload", function() {
						removeObjectInIE(id);
					});
				}
			}
			else {
				obj.parentNode.removeChild(obj);
			}
		}
	}
	
	function removeObjectInIE(id) {
		var obj = getElementById(id);
		if (obj) {
			for (var i in obj) {
				if (typeof obj[i] == "function") {
					obj[i] = null;
				}
			}
			obj.parentNode.removeChild(obj);
		}
	}
	
	/* Functions to optimize JavaScript compression
	*/
	function getElementById(id) {
		var el = null;
		try {
			el = doc.getElementById(id);
		}
		catch (e) {}
		return el;
	}
	
	function createElement(el) {
		return doc.createElement(el);
	}
	
	/* Updated attachEvent function for Internet Explorer
		- Stores attachEvent information in an Array, so on unload the detachEvent functions can be called to avoid memory leaks
	*/	
	function addListener(target, eventType, fn) {
		target.attachEvent(eventType, fn);
		listenersArr[listenersArr.length] = [target, eventType, fn];
	}
	
	/* Flash Player and SWF content version matching
	*/
	function hasPlayerVersion(rv) {
		var pv = ua.pv, v = rv.split(".");
		v[0] = parseInt(v[0], 10);
		v[1] = parseInt(v[1], 10) || 0; // supports short notation, e.g. "9" instead of "9.0.0"
		v[2] = parseInt(v[2], 10) || 0;
		return (pv[0] > v[0] || (pv[0] == v[0] && pv[1] > v[1]) || (pv[0] == v[0] && pv[1] == v[1] && pv[2] >= v[2])) ? true : false;
	}
	
	/* Cross-browser dynamic CSS creation
		- Based on Bobby van der Sluis' solution: http://www.bobbyvandersluis.com/articles/dynamicCSS.php
	*/	
	function createCSS(sel, decl) {
		if (ua.ie && ua.mac) {
			return;
		}
		var h = doc.getElementsByTagName("head")[0], s = createElement("style");
		s.setAttribute("type", "text/css");
		s.setAttribute("media", "screen");
		if (!(ua.ie && ua.win) && typeof doc.createTextNode != UNDEF) {
			s.appendChild(doc.createTextNode(sel + " {" + decl + "}"));
		}
		h.appendChild(s);
		if (ua.ie && ua.win && typeof doc.styleSheets != UNDEF && doc.styleSheets.length > 0) {
			var ls = doc.styleSheets[doc.styleSheets.length - 1];
			if (typeof ls.addRule == OBJECT) {
				ls.addRule(sel, decl);
			}
		}
	}
	
	function setVisibility(id, isVisible) {
		var v = isVisible ? "visible" : "hidden";
		if (isDomLoaded && getElementById(id)) {
			getElementById(id).style.visibility = v;
		}
		else {
			createCSS("#" + id, "visibility:" + v);
		}
	}

	/* Filter to avoid XSS attacks 
	*/
	function urlEncodeIfNecessary(s) {
		var regex = /[\\\"<>\.;]/;
		var hasBadChars = regex.exec(s) != null;
		return hasBadChars ? encodeURIComponent(s) : s;
	}
	
	/* Release memory to avoid memory leaks caused by closures, fix hanging audio/video threads and force open sockets/NetConnections to disconnect (Internet Explorer only)
	*/
	var cleanup = function() {
		if (ua.ie && ua.win) {
			window.attachEvent("onunload", function() {
				// remove listeners to avoid memory leaks
				var ll = listenersArr.length;
				for (var i = 0; i < ll; i++) {
					listenersArr[i][0].detachEvent(listenersArr[i][1], listenersArr[i][2]);
				}
				// cleanup dynamically embedded objects to fix audio/video threads and force open sockets and NetConnections to disconnect
				var il = objIdArr.length;
				for (var j = 0; j < il; j++) {
					removeSWF(objIdArr[j]);
				}
				// cleanup library's main closures to avoid memory leaks
				for (var k in ua) {
					ua[k] = null;
				}
				ua = null;
				for (var l in swfobject) {
					swfobject[l] = null;
				}
				swfobject = null;
			});
		}
	}();
	
	
	return {
		/* Public API
			- Reference: http://code.google.com/p/swfobject/wiki/SWFObject_2_0_documentation
		*/ 
		registerObject: function(objectIdStr, swfVersionStr, xiSwfUrlStr) {
			if (!ua.w3cdom || !objectIdStr || !swfVersionStr) {
				return;
			}
			var regObj = {};
			regObj.id = objectIdStr;
			regObj.swfVersion = swfVersionStr;
			regObj.expressInstall = xiSwfUrlStr ? xiSwfUrlStr : false;
			regObjArr[regObjArr.length] = regObj;
			setVisibility(objectIdStr, false);
		},
		
		getObjectById: function(objectIdStr) {
			var r = null;
			if (ua.w3cdom) {
				var o = getElementById(objectIdStr);
				if (o) {
					var n = o.getElementsByTagName(OBJECT)[0];
					if (!n || (n && typeof o.SetVariable != UNDEF)) {
							r = o;
					}
					else if (typeof n.SetVariable != UNDEF) {
						r = n;
					}
				}
			}
			return r;
		},
		
		embedSWF: function(swfUrlStr, replaceElemIdStr, widthStr, heightStr, swfVersionStr, xiSwfUrlStr, flashvarsObj, parObj, attObj) {
			if (!ua.w3cdom || !swfUrlStr || !replaceElemIdStr || !widthStr || !heightStr || !swfVersionStr) {
				return;
			}
			widthStr += ""; // Auto-convert to string
			heightStr += "";
			if (hasPlayerVersion(swfVersionStr)) {
				setVisibility(replaceElemIdStr, false);
				var att = {};
				if (attObj && typeof attObj === OBJECT) {
					for (var i in attObj) {
						if (attObj[i] != Object.prototype[i]) { // Filter out prototype additions from other potential libraries
							att[i] = attObj[i];
						}
					}
				}
				att.data = swfUrlStr;
				att.width = widthStr;
				att.height = heightStr;
				var par = {}; 
				if (parObj && typeof parObj === OBJECT) {
					for (var j in parObj) {
						if (parObj[j] != Object.prototype[j]) { // Filter out prototype additions from other potential libraries
							par[j] = parObj[j];
						}
					}
				}
				if (flashvarsObj && typeof flashvarsObj === OBJECT) {
					for (var k in flashvarsObj) {
						if (flashvarsObj[k] != Object.prototype[k]) { // Filter out prototype additions from other potential libraries
							if (typeof par.flashvars != UNDEF) {
								par.flashvars += "&" + k + "=" + flashvarsObj[k];
							}
							else {
								par.flashvars = k + "=" + flashvarsObj[k];
							}
						}
					}
				}
				addDomLoadEvent(function() {
					createSWF(att, par, replaceElemIdStr);
					if (att.id == replaceElemIdStr) {
						setVisibility(replaceElemIdStr, true);
					}
				});
			}
			else if (xiSwfUrlStr && !isExpressInstallActive && hasPlayerVersion("6.0.65") && (ua.win || ua.mac)) {
				isExpressInstallActive = true; // deferred execution
				setVisibility(replaceElemIdStr, false);
				addDomLoadEvent(function() {
					var regObj = {};
					regObj.id = regObj.altContentId = replaceElemIdStr;
					regObj.width = widthStr;
					regObj.height = heightStr;
					regObj.expressInstall = xiSwfUrlStr;
					showExpressInstall(regObj);
				});
			}
		},
		
		getFlashPlayerVersion: function() {
			return { major:ua.pv[0], minor:ua.pv[1], release:ua.pv[2] };
		},
		
		hasFlashPlayerVersion: hasPlayerVersion,
		
		createSWF: function(attObj, parObj, replaceElemIdStr) {
			if (ua.w3cdom) {
				return createSWF(attObj, parObj, replaceElemIdStr);
			}
			else {
				return undefined;
			}
		},
		
		removeSWF: function(objElemIdStr) {
			if (ua.w3cdom) {
				removeSWF(objElemIdStr);
			}
		},
		
		createCSS: function(sel, decl) {
			if (ua.w3cdom) {
				createCSS(sel, decl);
			}
		},
		
		addDomLoadEvent: addDomLoadEvent,
		
		addLoadEvent: addLoadEvent,
		
		getQueryParamValue: function(param) {
			var q = doc.location.search || doc.location.hash;
			if (param == null) {
				return urlEncodeIfNecessary(q);
			}
			if (q) {
				var pairs = q.substring(1).split("&");
				for (var i = 0; i < pairs.length; i++) {
					if (pairs[i].substring(0, pairs[i].indexOf("=")) == param) {
						return urlEncodeIfNecessary(pairs[i].substring((pairs[i].indexOf("=") + 1)));
					}
				}
			}
			return "";
		},
		
		// For internal usage only
		expressInstallCallback: function() {
			if (isExpressInstallActive && storedAltContent) {
				var obj = getElementById(EXPRESS_INSTALL_ID);
				if (obj) {
					obj.parentNode.replaceChild(storedAltContent, obj);
					if (storedAltContentId) {
						setVisibility(storedAltContentId, true);
						if (ua.ie && ua.win) {
							storedAltContent.style.display = "block";
						}
					}
					storedAltContent = null;
					storedAltContentId = null;
					isExpressInstallActive = false;
				}
			} 
		}
	};
}();
/**
 * SWFUpload: http://www.swfupload.org, http://swfupload.googlecode.com
 *
 * mmSWFUpload 1.0: Flash upload dialog - http://profandesign.se/swfupload/,  http://www.vinterwebb.se/
 *
 * SWFUpload is (c) 2006-2007 Lars Huring, Olov Nilz�n and Mammon Media and is released under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * SWFUpload 2 is (c) 2007-2008 Jake Roberts and is released under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 *
 */


/* ******************* */
/* Constructor & Init  */
/* ******************* */
var SWFUpload;

if (SWFUpload == undefined) {
	SWFUpload = function (settings) {
		this.initSWFUpload(settings);
	};
}

SWFUpload.prototype.initSWFUpload = function (settings) {
	try {
		this.customSettings = {};	// A container where developers can place their own settings associated with this instance.
		this.settings = settings;
		this.eventQueue = [];
		this.movieName = "SWFUpload_" + SWFUpload.movieCount++;
		this.movieElement = null;


		// Setup global control tracking
		SWFUpload.instances[this.movieName] = this;

		// Load the settings.  Load the Flash movie.
		this.initSettings();
		this.loadFlash();
		this.displayDebugInfo();
	} catch (ex) {
		delete SWFUpload.instances[this.movieName];
		throw ex;
	}
};

/* *************** */
/* Static Members  */
/* *************** */
SWFUpload.instances = {};
SWFUpload.movieCount = 0;
SWFUpload.version = "2.2.0 2009-03-25";
SWFUpload.QUEUE_ERROR = {
	QUEUE_LIMIT_EXCEEDED	  		: -100,
	FILE_EXCEEDS_SIZE_LIMIT  		: -110,
	ZERO_BYTE_FILE			  		: -120,
	INVALID_FILETYPE		  		: -130
};
SWFUpload.UPLOAD_ERROR = {
	HTTP_ERROR				  		: -200,
	MISSING_UPLOAD_URL	      		: -210,
	IO_ERROR				  		: -220,
	SECURITY_ERROR			  		: -230,
	UPLOAD_LIMIT_EXCEEDED	  		: -240,
	UPLOAD_FAILED			  		: -250,
	SPECIFIED_FILE_ID_NOT_FOUND		: -260,
	FILE_VALIDATION_FAILED	  		: -270,
	FILE_CANCELLED			  		: -280,
	UPLOAD_STOPPED					: -290
};
SWFUpload.FILE_STATUS = {
	QUEUED		 : -1,
	IN_PROGRESS	 : -2,
	ERROR		 : -3,
	COMPLETE	 : -4,
	CANCELLED	 : -5
};
SWFUpload.BUTTON_ACTION = {
	SELECT_FILE  : -100,
	SELECT_FILES : -110,
	START_UPLOAD : -120
};
SWFUpload.CURSOR = {
	ARROW : -1,
	HAND : -2
};
SWFUpload.WINDOW_MODE = {
	WINDOW : "window",
	TRANSPARENT : "transparent",
	OPAQUE : "opaque"
};

// Private: takes a URL, determines if it is relative and converts to an absolute URL
// using the current site. Only processes the URL if it can, otherwise returns the URL untouched
SWFUpload.completeURL = function(url) {
	if (typeof(url) !== "string" || url.match(/^https?:\/\//i) || url.match(/^\//)) {
		return url;
	}
	
	var currentURL = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ":" + window.location.port : "");
	
	var indexSlash = window.location.pathname.lastIndexOf("/");
	if (indexSlash <= 0) {
		path = "/";
	} else {
		path = window.location.pathname.substr(0, indexSlash) + "/";
	}
	
	return /*currentURL +*/ path + url;
	
};


/* ******************** */
/* Instance Members  */
/* ******************** */

// Private: initSettings ensures that all the
// settings are set, getting a default value if one was not assigned.
SWFUpload.prototype.initSettings = function () {
	this.ensureDefault = function (settingName, defaultValue) {
		this.settings[settingName] = (this.settings[settingName] == undefined) ? defaultValue : this.settings[settingName];
	};
	
	// Upload backend settings
	this.ensureDefault("upload_url", "");
	this.ensureDefault("preserve_relative_urls", false);
	this.ensureDefault("file_post_name", "Filedata");
	this.ensureDefault("post_params", {});
	this.ensureDefault("use_query_string", false);
	this.ensureDefault("requeue_on_error", false);
	this.ensureDefault("http_success", []);
	this.ensureDefault("assume_success_timeout", 0);
	
	// File Settings
	this.ensureDefault("file_types", "*.*");
	this.ensureDefault("file_types_description", "All Files");
	this.ensureDefault("file_size_limit", 0);	// Default zero means "unlimited"
	this.ensureDefault("file_upload_limit", 0);
	this.ensureDefault("file_queue_limit", 0);

	// Flash Settings
	this.ensureDefault("flash_url", "swfupload.swf");
	this.ensureDefault("prevent_swf_caching", true);
	
	// Button Settings
	this.ensureDefault("button_image_url", "");
	this.ensureDefault("button_width", 1);
	this.ensureDefault("button_height", 1);
	this.ensureDefault("button_text", "");
	this.ensureDefault("button_text_style", "color: #000000; font-size: 16pt;");
	this.ensureDefault("button_text_top_padding", 0);
	this.ensureDefault("button_text_left_padding", 0);
	this.ensureDefault("button_action", SWFUpload.BUTTON_ACTION.SELECT_FILES);
	this.ensureDefault("button_disabled", false);
	this.ensureDefault("button_placeholder_id", "");
	this.ensureDefault("button_placeholder", null);
	this.ensureDefault("button_cursor", SWFUpload.CURSOR.ARROW);
	this.ensureDefault("button_window_mode", SWFUpload.WINDOW_MODE.WINDOW);
	
	// Debug Settings
	this.ensureDefault("debug", false);
	this.settings.debug_enabled = this.settings.debug;	// Here to maintain v2 API
	
	// Event Handlers
	this.settings.return_upload_start_handler = this.returnUploadStart;
	this.ensureDefault("swfupload_loaded_handler", null);
	this.ensureDefault("file_dialog_start_handler", null);
	this.ensureDefault("file_queued_handler", null);
	this.ensureDefault("file_queue_error_handler", null);
	this.ensureDefault("file_dialog_complete_handler", null);
	
	this.ensureDefault("upload_start_handler", null);
	this.ensureDefault("upload_progress_handler", null);
	this.ensureDefault("upload_error_handler", null);
	this.ensureDefault("upload_success_handler", null);
	this.ensureDefault("upload_complete_handler", null);
	
	this.ensureDefault("debug_handler", this.debugMessage);

	this.ensureDefault("custom_settings", {});

	// Other settings
	this.customSettings = this.settings.custom_settings;
	
	// Update the flash url if needed
	if (!!this.settings.prevent_swf_caching) {
		this.settings.flash_url = this.settings.flash_url + (this.settings.flash_url.indexOf("?") < 0 ? "?" : "&") + "preventswfcaching=" + new Date().getTime();
	}
	
	if (!this.settings.preserve_relative_urls) {
		//this.settings.flash_url = SWFUpload.completeURL(this.settings.flash_url);	// Don't need to do this one since flash doesn't look at it
		this.settings.upload_url = SWFUpload.completeURL(this.settings.upload_url);
		this.settings.button_image_url = SWFUpload.completeURL(this.settings.button_image_url);
	}
	
	delete this.ensureDefault;
};

// Private: loadFlash replaces the button_placeholder element with the flash movie.
SWFUpload.prototype.loadFlash = function () {
	var targetElement, tempParent;

	// Make sure an element with the ID we are going to use doesn't already exist
	if (document.getElementById(this.movieName) !== null) {
		throw "ID " + this.movieName + " is already in use. The Flash Object could not be added";
	}

	// Get the element where we will be placing the flash movie
	targetElement = document.getElementById(this.settings.button_placeholder_id) || this.settings.button_placeholder;

	if (targetElement == undefined) {
		throw "Could not find the placeholder element: " + this.settings.button_placeholder_id;
	}

	// Append the container and load the flash
	tempParent = document.createElement("div");
	tempParent.innerHTML = this.getFlashHTML();	// Using innerHTML is non-standard but the only sensible way to dynamically add Flash in IE (and maybe other browsers)
	targetElement.parentNode.replaceChild(tempParent.firstChild, targetElement);

	// Fix IE Flash/Form bug
	if (window[this.movieName] == undefined) {
		window[this.movieName] = this.getMovieElement();
	}
	
};

// Private: getFlashHTML generates the object tag needed to embed the flash in to the document
SWFUpload.prototype.getFlashHTML = function () {
	// Flash Satay object syntax: http://www.alistapart.com/articles/flashsatay
	return ['<object id="', this.movieName, '" type="application/x-shockwave-flash" data="', this.settings.flash_url, '" width="', this.settings.button_width, '" height="', this.settings.button_height, '" class="swfupload">',
				'<param name="wmode" value="', this.settings.button_window_mode, '" />',
				'<param name="movie" value="', this.settings.flash_url, '" />',
				'<param name="quality" value="high" />',
				'<param name="menu" value="false" />',
				'<param name="allowScriptAccess" value="always" />',
				'<param name="flashvars" value="' + this.getFlashVars() + '" />',
				'</object>'].join("");
};

// Private: getFlashVars builds the parameter string that will be passed
// to flash in the flashvars param.
SWFUpload.prototype.getFlashVars = function () {
	// Build a string from the post param object
	var paramString = this.buildParamString();
	var httpSuccessString = this.settings.http_success.join(",");
	
	// Build the parameter string
	return ["movieName=", encodeURIComponent(this.movieName),
			"&amp;uploadURL=", encodeURIComponent(this.settings.upload_url),
			"&amp;useQueryString=", encodeURIComponent(this.settings.use_query_string),
			"&amp;requeueOnError=", encodeURIComponent(this.settings.requeue_on_error),
			"&amp;httpSuccess=", encodeURIComponent(httpSuccessString),
			"&amp;assumeSuccessTimeout=", encodeURIComponent(this.settings.assume_success_timeout),
			"&amp;params=", encodeURIComponent(paramString),
			"&amp;filePostName=", encodeURIComponent(this.settings.file_post_name),
			"&amp;fileTypes=", encodeURIComponent(this.settings.file_types),
			"&amp;fileTypesDescription=", encodeURIComponent(this.settings.file_types_description),
			"&amp;fileSizeLimit=", encodeURIComponent(this.settings.file_size_limit),
			"&amp;fileUploadLimit=", encodeURIComponent(this.settings.file_upload_limit),
			"&amp;fileQueueLimit=", encodeURIComponent(this.settings.file_queue_limit),
			"&amp;debugEnabled=", encodeURIComponent(this.settings.debug_enabled),
			"&amp;buttonImageURL=", encodeURIComponent(this.settings.button_image_url),
			"&amp;buttonWidth=", encodeURIComponent(this.settings.button_width),
			"&amp;buttonHeight=", encodeURIComponent(this.settings.button_height),
			"&amp;buttonText=", encodeURIComponent(this.settings.button_text),
			"&amp;buttonTextTopPadding=", encodeURIComponent(this.settings.button_text_top_padding),
			"&amp;buttonTextLeftPadding=", encodeURIComponent(this.settings.button_text_left_padding),
			"&amp;buttonTextStyle=", encodeURIComponent(this.settings.button_text_style),
			"&amp;buttonAction=", encodeURIComponent(this.settings.button_action),
			"&amp;buttonDisabled=", encodeURIComponent(this.settings.button_disabled),
			"&amp;buttonCursor=", encodeURIComponent(this.settings.button_cursor)
		].join("");
};

// Public: getMovieElement retrieves the DOM reference to the Flash element added by SWFUpload
// The element is cached after the first lookup
SWFUpload.prototype.getMovieElement = function () {
	if (this.movieElement == undefined) {
		this.movieElement = document.getElementById(this.movieName);
	}

	if (this.movieElement === null) {
		throw "Could not find Flash element";
	}
	
	return this.movieElement;
};

// Private: buildParamString takes the name/value pairs in the post_params setting object
// and joins them up in to a string formatted "name=value&amp;name=value"
SWFUpload.prototype.buildParamString = function () {
	var postParams = this.settings.post_params; 
	var paramStringPairs = [];

	if (typeof(postParams) === "object") {
		for (var name in postParams) {
			if (postParams.hasOwnProperty(name)) {
				paramStringPairs.push(encodeURIComponent(name.toString()) + "=" + encodeURIComponent(postParams[name].toString()));
			}
		}
	}

	return paramStringPairs.join("&amp;");
};

// Public: Used to remove a SWFUpload instance from the page. This method strives to remove
// all references to the SWF, and other objects so memory is properly freed.
// Returns true if everything was destroyed. Returns a false if a failure occurs leaving SWFUpload in an inconsistant state.
// Credits: Major improvements provided by steffen
SWFUpload.prototype.destroy = function () {
	try {
		// Make sure Flash is done before we try to remove it
		this.cancelUpload(null, false);
		

		// Remove the SWFUpload DOM nodes
		var movieElement = null;
		movieElement = this.getMovieElement();
		
		if (movieElement && typeof(movieElement.CallFunction) === "unknown") { // We only want to do this in IE
			// Loop through all the movie's properties and remove all function references (DOM/JS IE 6/7 memory leak workaround)
			for (var i in movieElement) {
				try {
					if (typeof(movieElement[i]) === "function") {
						movieElement[i] = null;
					}
				} catch (ex1) {}
			}

			// Remove the Movie Element from the page
			try {
				movieElement.parentNode.removeChild(movieElement);
			} catch (ex) {}
		}
		
		// Remove IE form fix reference
		window[this.movieName] = null;

		// Destroy other references
		SWFUpload.instances[this.movieName] = null;
		delete SWFUpload.instances[this.movieName];

		this.movieElement = null;
		this.settings = null;
		this.customSettings = null;
		this.eventQueue = null;
		this.movieName = null;
		
		
		return true;
	} catch (ex2) {
		return false;
	}
};


// Public: displayDebugInfo prints out settings and configuration
// information about this SWFUpload instance.
// This function (and any references to it) can be deleted when placing
// SWFUpload in production.
SWFUpload.prototype.displayDebugInfo = function () {
	this.debug(
		[
			"---SWFUpload Instance Info---\n",
			"Version: ", SWFUpload.version, "\n",
			"Movie Name: ", this.movieName, "\n",
			"Settings:\n",
			"\t", "upload_url:               ", this.settings.upload_url, "\n",
			"\t", "flash_url:                ", this.settings.flash_url, "\n",
			"\t", "use_query_string:         ", this.settings.use_query_string.toString(), "\n",
			"\t", "requeue_on_error:         ", this.settings.requeue_on_error.toString(), "\n",
			"\t", "http_success:             ", this.settings.http_success.join(", "), "\n",
			"\t", "assume_success_timeout:   ", this.settings.assume_success_timeout, "\n",
			"\t", "file_post_name:           ", this.settings.file_post_name, "\n",
			"\t", "post_params:              ", this.settings.post_params.toString(), "\n",
			"\t", "file_types:               ", this.settings.file_types, "\n",
			"\t", "file_types_description:   ", this.settings.file_types_description, "\n",
			"\t", "file_size_limit:          ", this.settings.file_size_limit, "\n",
			"\t", "file_upload_limit:        ", this.settings.file_upload_limit, "\n",
			"\t", "file_queue_limit:         ", this.settings.file_queue_limit, "\n",
			"\t", "debug:                    ", this.settings.debug.toString(), "\n",

			"\t", "prevent_swf_caching:      ", this.settings.prevent_swf_caching.toString(), "\n",

			"\t", "button_placeholder_id:    ", this.settings.button_placeholder_id.toString(), "\n",
			"\t", "button_placeholder:       ", (this.settings.button_placeholder ? "Set" : "Not Set"), "\n",
			"\t", "button_image_url:         ", this.settings.button_image_url.toString(), "\n",
			"\t", "button_width:             ", this.settings.button_width.toString(), "\n",
			"\t", "button_height:            ", this.settings.button_height.toString(), "\n",
			"\t", "button_text:              ", this.settings.button_text.toString(), "\n",
			"\t", "button_text_style:        ", this.settings.button_text_style.toString(), "\n",
			"\t", "button_text_top_padding:  ", this.settings.button_text_top_padding.toString(), "\n",
			"\t", "button_text_left_padding: ", this.settings.button_text_left_padding.toString(), "\n",
			"\t", "button_action:            ", this.settings.button_action.toString(), "\n",
			"\t", "button_disabled:          ", this.settings.button_disabled.toString(), "\n",

			"\t", "custom_settings:          ", this.settings.custom_settings.toString(), "\n",
			"Event Handlers:\n",
			"\t", "swfupload_loaded_handler assigned:  ", (typeof this.settings.swfupload_loaded_handler === "function").toString(), "\n",
			"\t", "file_dialog_start_handler assigned: ", (typeof this.settings.file_dialog_start_handler === "function").toString(), "\n",
			"\t", "file_queued_handler assigned:       ", (typeof this.settings.file_queued_handler === "function").toString(), "\n",
			"\t", "file_queue_error_handler assigned:  ", (typeof this.settings.file_queue_error_handler === "function").toString(), "\n",
			"\t", "upload_start_handler assigned:      ", (typeof this.settings.upload_start_handler === "function").toString(), "\n",
			"\t", "upload_progress_handler assigned:   ", (typeof this.settings.upload_progress_handler === "function").toString(), "\n",
			"\t", "upload_error_handler assigned:      ", (typeof this.settings.upload_error_handler === "function").toString(), "\n",
			"\t", "upload_success_handler assigned:    ", (typeof this.settings.upload_success_handler === "function").toString(), "\n",
			"\t", "upload_complete_handler assigned:   ", (typeof this.settings.upload_complete_handler === "function").toString(), "\n",
			"\t", "debug_handler assigned:             ", (typeof this.settings.debug_handler === "function").toString(), "\n"
		].join("")
	);
};

/* Note: addSetting and getSetting are no longer used by SWFUpload but are included
	the maintain v2 API compatibility
*/
// Public: (Deprecated) addSetting adds a setting value. If the value given is undefined or null then the default_value is used.
SWFUpload.prototype.addSetting = function (name, value, default_value) {
    if (value == undefined) {
        return (this.settings[name] = default_value);
    } else {
        return (this.settings[name] = value);
	}
};

// Public: (Deprecated) getSetting gets a setting. Returns an empty string if the setting was not found.
SWFUpload.prototype.getSetting = function (name) {
    if (this.settings[name] != undefined) {
        return this.settings[name];
	}

    return "";
};



// Private: callFlash handles function calls made to the Flash element.
// Calls are made with a setTimeout for some functions to work around
// bugs in the ExternalInterface library.
SWFUpload.prototype.callFlash = function (functionName, argumentArray) {
	argumentArray = argumentArray || [];
	
	var movieElement = this.getMovieElement();
	var returnValue, returnString;

	// Flash's method if calling ExternalInterface methods (code adapted from MooTools).
	try {
		returnString = movieElement.CallFunction('<invoke name="' + functionName + '" returntype="javascript">' + __flash__argumentsToXML(argumentArray, 0) + '</invoke>');
		returnValue = eval(returnString);
	} catch (ex) {
		throw "Call to " + functionName + " failed";
	}
	
	// Unescape file post param values
	if (returnValue != undefined && typeof returnValue.post === "object") {
		returnValue = this.unescapeFilePostParams(returnValue);
	}

	return returnValue;
};

/* *****************************
	-- Flash control methods --
	Your UI should use these
	to operate SWFUpload
   ***************************** */

// WARNING: this function does not work in Flash Player 10
// Public: selectFile causes a File Selection Dialog window to appear.  This
// dialog only allows 1 file to be selected.
SWFUpload.prototype.selectFile = function () {
	this.callFlash("SelectFile");
};

// WARNING: this function does not work in Flash Player 10
// Public: selectFiles causes a File Selection Dialog window to appear/ This
// dialog allows the user to select any number of files
// Flash Bug Warning: Flash limits the number of selectable files based on the combined length of the file names.
// If the selection name length is too long the dialog will fail in an unpredictable manner.  There is no work-around
// for this bug.
SWFUpload.prototype.selectFiles = function () {
	this.callFlash("SelectFiles");
};


// Public: startUpload starts uploading the first file in the queue unless
// the optional parameter 'fileID' specifies the ID 
SWFUpload.prototype.startUpload = function (fileID) {
	this.callFlash("StartUpload", [fileID]);
};

// Public: cancelUpload cancels any queued file.  The fileID parameter may be the file ID or index.
// If you do not specify a fileID the current uploading file or first file in the queue is cancelled.
// If you do not want the uploadError event to trigger you can specify false for the triggerErrorEvent parameter.
SWFUpload.prototype.cancelUpload = function (fileID, triggerErrorEvent) {
	if (triggerErrorEvent !== false) {
		triggerErrorEvent = true;
	}
	this.callFlash("CancelUpload", [fileID, triggerErrorEvent]);
};

// Public: stopUpload stops the current upload and requeues the file at the beginning of the queue.
// If nothing is currently uploading then nothing happens.
SWFUpload.prototype.stopUpload = function () {
	this.callFlash("StopUpload");
};

/* ************************
 * Settings methods
 *   These methods change the SWFUpload settings.
 *   SWFUpload settings should not be changed directly on the settings object
 *   since many of the settings need to be passed to Flash in order to take
 *   effect.
 * *********************** */

// Public: getStats gets the file statistics object.
SWFUpload.prototype.getStats = function () {
	return this.callFlash("GetStats");
};

// Public: setStats changes the SWFUpload statistics.  You shouldn't need to 
// change the statistics but you can.  Changing the statistics does not
// affect SWFUpload accept for the successful_uploads count which is used
// by the upload_limit setting to determine how many files the user may upload.
SWFUpload.prototype.setStats = function (statsObject) {
	this.callFlash("SetStats", [statsObject]);
};

// Public: getFile retrieves a File object by ID or Index.  If the file is
// not found then 'null' is returned.
SWFUpload.prototype.getFile = function (fileID) {
	if (typeof(fileID) === "number") {
		return this.callFlash("GetFileByIndex", [fileID]);
	} else {
		return this.callFlash("GetFile", [fileID]);
	}
};

// Public: addFileParam sets a name/value pair that will be posted with the
// file specified by the Files ID.  If the name already exists then the
// exiting value will be overwritten.
SWFUpload.prototype.addFileParam = function (fileID, name, value) {
	return this.callFlash("AddFileParam", [fileID, name, value]);
};

// Public: removeFileParam removes a previously set (by addFileParam) name/value
// pair from the specified file.
SWFUpload.prototype.removeFileParam = function (fileID, name) {
	this.callFlash("RemoveFileParam", [fileID, name]);
};

// Public: setUploadUrl changes the upload_url setting.
SWFUpload.prototype.setUploadURL = function (url) {
	this.settings.upload_url = url.toString();
	this.callFlash("SetUploadURL", [url]);
};

// Public: setPostParams changes the post_params setting
SWFUpload.prototype.setPostParams = function (paramsObject) {
	this.settings.post_params = paramsObject;
	this.callFlash("SetPostParams", [paramsObject]);
};

// Public: addPostParam adds post name/value pair.  Each name can have only one value.
SWFUpload.prototype.addPostParam = function (name, value) {
	this.settings.post_params[name] = value;
	this.callFlash("SetPostParams", [this.settings.post_params]);
};

// Public: removePostParam deletes post name/value pair.
SWFUpload.prototype.removePostParam = function (name) {
	delete this.settings.post_params[name];
	this.callFlash("SetPostParams", [this.settings.post_params]);
};

// Public: setFileTypes changes the file_types setting and the file_types_description setting
SWFUpload.prototype.setFileTypes = function (types, description) {
	this.settings.file_types = types;
	this.settings.file_types_description = description;
	this.callFlash("SetFileTypes", [types, description]);
};

// Public: setFileSizeLimit changes the file_size_limit setting
SWFUpload.prototype.setFileSizeLimit = function (fileSizeLimit) {
	this.settings.file_size_limit = fileSizeLimit;
	this.callFlash("SetFileSizeLimit", [fileSizeLimit]);
};

// Public: setFileUploadLimit changes the file_upload_limit setting
SWFUpload.prototype.setFileUploadLimit = function (fileUploadLimit) {
	this.settings.file_upload_limit = fileUploadLimit;
	this.callFlash("SetFileUploadLimit", [fileUploadLimit]);
};

// Public: setFileQueueLimit changes the file_queue_limit setting
SWFUpload.prototype.setFileQueueLimit = function (fileQueueLimit) {
	this.settings.file_queue_limit = fileQueueLimit;
	this.callFlash("SetFileQueueLimit", [fileQueueLimit]);
};

// Public: setFilePostName changes the file_post_name setting
SWFUpload.prototype.setFilePostName = function (filePostName) {
	this.settings.file_post_name = filePostName;
	this.callFlash("SetFilePostName", [filePostName]);
};

// Public: setUseQueryString changes the use_query_string setting
SWFUpload.prototype.setUseQueryString = function (useQueryString) {
	this.settings.use_query_string = useQueryString;
	this.callFlash("SetUseQueryString", [useQueryString]);
};

// Public: setRequeueOnError changes the requeue_on_error setting
SWFUpload.prototype.setRequeueOnError = function (requeueOnError) {
	this.settings.requeue_on_error = requeueOnError;
	this.callFlash("SetRequeueOnError", [requeueOnError]);
};

// Public: setHTTPSuccess changes the http_success setting
SWFUpload.prototype.setHTTPSuccess = function (http_status_codes) {
	if (typeof http_status_codes === "string") {
		http_status_codes = http_status_codes.replace(" ", "").split(",");
	}
	
	this.settings.http_success = http_status_codes;
	this.callFlash("SetHTTPSuccess", [http_status_codes]);
};

// Public: setHTTPSuccess changes the http_success setting
SWFUpload.prototype.setAssumeSuccessTimeout = function (timeout_seconds) {
	this.settings.assume_success_timeout = timeout_seconds;
	this.callFlash("SetAssumeSuccessTimeout", [timeout_seconds]);
};

// Public: setDebugEnabled changes the debug_enabled setting
SWFUpload.prototype.setDebugEnabled = function (debugEnabled) {
	this.settings.debug_enabled = debugEnabled;
	this.callFlash("SetDebugEnabled", [debugEnabled]);
};

// Public: setButtonImageURL loads a button image sprite
SWFUpload.prototype.setButtonImageURL = function (buttonImageURL) {
	if (buttonImageURL == undefined) {
		buttonImageURL = "";
	}
	
	this.settings.button_image_url = buttonImageURL;
	this.callFlash("SetButtonImageURL", [buttonImageURL]);
};

// Public: setButtonDimensions resizes the Flash Movie and button
SWFUpload.prototype.setButtonDimensions = function (width, height) {
	this.settings.button_width = width;
	this.settings.button_height = height;
	
	var movie = this.getMovieElement();
	if (movie != undefined) {
		movie.style.width = width + "px";
		movie.style.height = height + "px";
	}
	
	this.callFlash("SetButtonDimensions", [width, height]);
};
// Public: setButtonText Changes the text overlaid on the button
SWFUpload.prototype.setButtonText = function (html) {
	this.settings.button_text = html;
	this.callFlash("SetButtonText", [html]);
};
// Public: setButtonTextPadding changes the top and left padding of the text overlay
SWFUpload.prototype.setButtonTextPadding = function (left, top) {
	this.settings.button_text_top_padding = top;
	this.settings.button_text_left_padding = left;
	this.callFlash("SetButtonTextPadding", [left, top]);
};

// Public: setButtonTextStyle changes the CSS used to style the HTML/Text overlaid on the button
SWFUpload.prototype.setButtonTextStyle = function (css) {
	this.settings.button_text_style = css;
	this.callFlash("SetButtonTextStyle", [css]);
};
// Public: setButtonDisabled disables/enables the button
SWFUpload.prototype.setButtonDisabled = function (isDisabled) {
	this.settings.button_disabled = isDisabled;
	this.callFlash("SetButtonDisabled", [isDisabled]);
};
// Public: setButtonAction sets the action that occurs when the button is clicked
SWFUpload.prototype.setButtonAction = function (buttonAction) {
	this.settings.button_action = buttonAction;
	this.callFlash("SetButtonAction", [buttonAction]);
};

// Public: setButtonCursor changes the mouse cursor displayed when hovering over the button
SWFUpload.prototype.setButtonCursor = function (cursor) {
	this.settings.button_cursor = cursor;
	this.callFlash("SetButtonCursor", [cursor]);
};

/* *******************************
	Flash Event Interfaces
	These functions are used by Flash to trigger the various
	events.
	
	All these functions a Private.
	
	Because the ExternalInterface library is buggy the event calls
	are added to a queue and the queue then executed by a setTimeout.
	This ensures that events are executed in a determinate order and that
	the ExternalInterface bugs are avoided.
******************************* */

SWFUpload.prototype.queueEvent = function (handlerName, argumentArray) {
	// Warning: Don't call this.debug inside here or you'll create an infinite loop
	
	if (argumentArray == undefined) {
		argumentArray = [];
	} else if (!(argumentArray instanceof Array)) {
		argumentArray = [argumentArray];
	}
	
	var self = this;
	if (typeof this.settings[handlerName] === "function") {
		// Queue the event
		this.eventQueue.push(function () {
			this.settings[handlerName].apply(this, argumentArray);
		});
		
		// Execute the next queued event
		setTimeout(function () {
			self.executeNextEvent();
		}, 0);
		
	} else if (this.settings[handlerName] !== null) {
		throw "Event handler " + handlerName + " is unknown or is not a function";
	}
};

// Private: Causes the next event in the queue to be executed.  Since events are queued using a setTimeout
// we must queue them in order to garentee that they are executed in order.
SWFUpload.prototype.executeNextEvent = function () {
	// Warning: Don't call this.debug inside here or you'll create an infinite loop

	var  f = this.eventQueue ? this.eventQueue.shift() : null;
	if (typeof(f) === "function") {
		f.apply(this);
	}
};

// Private: unescapeFileParams is part of a workaround for a flash bug where objects passed through ExternalInterface cannot have
// properties that contain characters that are not valid for JavaScript identifiers. To work around this
// the Flash Component escapes the parameter names and we must unescape again before passing them along.
SWFUpload.prototype.unescapeFilePostParams = function (file) {
	var reg = /[$]([0-9a-f]{4})/i;
	var unescapedPost = {};
	var uk;

	if (file != undefined) {
		for (var k in file.post) {
			if (file.post.hasOwnProperty(k)) {
				uk = k;
				var match;
				while ((match = reg.exec(uk)) !== null) {
					uk = uk.replace(match[0], String.fromCharCode(parseInt("0x" + match[1], 16)));
				}
				unescapedPost[uk] = file.post[k];
			}
		}

		file.post = unescapedPost;
	}

	return file;
};

// Private: Called by Flash to see if JS can call in to Flash (test if External Interface is working)
SWFUpload.prototype.testExternalInterface = function () {
	try {
		return this.callFlash("TestExternalInterface");
	} catch (ex) {
		return false;
	}
};

// Private: This event is called by Flash when it has finished loading. Don't modify this.
// Use the swfupload_loaded_handler event setting to execute custom code when SWFUpload has loaded.
SWFUpload.prototype.flashReady = function () {
	// Check that the movie element is loaded correctly with its ExternalInterface methods defined
	var movieElement = this.getMovieElement();

	if (!movieElement) {
		this.debug("Flash called back ready but the flash movie can't be found.");
		return;
	}

	this.cleanUp(movieElement);
	
	this.queueEvent("swfupload_loaded_handler");
};

// Private: removes Flash added fuctions to the DOM node to prevent memory leaks in IE.
// This function is called by Flash each time the ExternalInterface functions are created.
SWFUpload.prototype.cleanUp = function (movieElement) {
	// Pro-actively unhook all the Flash functions
	try {
		if (this.movieElement && typeof(movieElement.CallFunction) === "unknown") { // We only want to do this in IE
			this.debug("Removing Flash functions hooks (this should only run in IE and should prevent memory leaks)");
			for (var key in movieElement) {
				try {
					if (typeof(movieElement[key]) === "function") {
						movieElement[key] = null;
					}
				} catch (ex) {
				}
			}
		}
	} catch (ex1) {
	
	}

	// Fix Flashes own cleanup code so if the SWFMovie was removed from the page
	// it doesn't display errors.
	window["__flash__removeCallback"] = function (instance, name) {
		try {
			if (instance) {
				instance[name] = null;
			}
		} catch (flashEx) {
		
		}
	};

};


/* This is a chance to do something before the browse window opens */
SWFUpload.prototype.fileDialogStart = function () {
	this.queueEvent("file_dialog_start_handler");
};


/* Called when a file is successfully added to the queue. */
SWFUpload.prototype.fileQueued = function (file) {
	file = this.unescapeFilePostParams(file);
	this.queueEvent("file_queued_handler", file);
};


/* Handle errors that occur when an attempt to queue a file fails. */
SWFUpload.prototype.fileQueueError = function (file, errorCode, message) {
	file = this.unescapeFilePostParams(file);
	this.queueEvent("file_queue_error_handler", [file, errorCode, message]);
};

/* Called after the file dialog has closed and the selected files have been queued.
	You could call startUpload here if you want the queued files to begin uploading immediately. */
SWFUpload.prototype.fileDialogComplete = function (numFilesSelected, numFilesQueued, numFilesInQueue) {
	this.queueEvent("file_dialog_complete_handler", [numFilesSelected, numFilesQueued, numFilesInQueue]);
};

SWFUpload.prototype.uploadStart = function (file) {
	file = this.unescapeFilePostParams(file);
	this.queueEvent("return_upload_start_handler", file);
};

SWFUpload.prototype.returnUploadStart = function (file) {
	var returnValue;
	if (typeof this.settings.upload_start_handler === "function") {
		file = this.unescapeFilePostParams(file);
		returnValue = this.settings.upload_start_handler.call(this, file);
	} else if (this.settings.upload_start_handler != undefined) {
		throw "upload_start_handler must be a function";
	}

	// Convert undefined to true so if nothing is returned from the upload_start_handler it is
	// interpretted as 'true'.
	if (returnValue === undefined) {
		returnValue = true;
	}
	
	returnValue = !!returnValue;
	
	this.callFlash("ReturnUploadStart", [returnValue]);
};



SWFUpload.prototype.uploadProgress = function (file, bytesComplete, bytesTotal) {
	file = this.unescapeFilePostParams(file);
	this.queueEvent("upload_progress_handler", [file, bytesComplete, bytesTotal]);
};

SWFUpload.prototype.uploadError = function (file, errorCode, message) {
	file = this.unescapeFilePostParams(file);
	this.queueEvent("upload_error_handler", [file, errorCode, message]);
};

SWFUpload.prototype.uploadSuccess = function (file, serverData, responseReceived) {
	file = this.unescapeFilePostParams(file);
	this.queueEvent("upload_success_handler", [file, serverData, responseReceived]);
};

SWFUpload.prototype.uploadComplete = function (file) {
	file = this.unescapeFilePostParams(file);
	this.queueEvent("upload_complete_handler", file);
};

/* Called by SWFUpload JavaScript and Flash functions when debug is enabled. By default it writes messages to the
   internal debug console.  You can override this event and have messages written where you want. */
SWFUpload.prototype.debug = function (message) {
	this.queueEvent("debug_handler", message);
};


/* **********************************
	Debug Console
	The debug console is a self contained, in page location
	for debug message to be sent.  The Debug Console adds
	itself to the body if necessary.

	The console is automatically scrolled as messages appear.
	
	If you are using your own debug handler or when you deploy to production and
	have debug disabled you can remove these functions to reduce the file size
	and complexity.
********************************** */
   
// Private: debugMessage is the default debug_handler.  If you want to print debug messages
// call the debug() function.  When overriding the function your own function should
// check to see if the debug setting is true before outputting debug information.
SWFUpload.prototype.debugMessage = function (message) {
	if (this.settings.debug) {
		var exceptionMessage, exceptionValues = [];

		// Check for an exception object and print it nicely
		if (typeof message === "object" && typeof message.name === "string" && typeof message.message === "string") {
			for (var key in message) {
				if (message.hasOwnProperty(key)) {
					exceptionValues.push(key + ": " + message[key]);
				}
			}
			exceptionMessage = exceptionValues.join("\n") || "";
			exceptionValues = exceptionMessage.split("\n");
			exceptionMessage = "EXCEPTION: " + exceptionValues.join("\nEXCEPTION: ");
			SWFUpload.Console.writeLine(exceptionMessage);
		} else {
			SWFUpload.Console.writeLine(message);
		}
	}
};

SWFUpload.Console = {};
SWFUpload.Console.writeLine = function (message) {
	var console, documentForm;

	try {
		console = document.getElementById("SWFUpload_Console");

		if (!console) {
			documentForm = document.createElement("form");
			document.getElementsByTagName("body")[0].appendChild(documentForm);

			console = document.createElement("textarea");
			console.id = "SWFUpload_Console";
			console.style.fontFamily = "monospace";
			console.setAttribute("wrap", "off");
			console.wrap = "off";
			console.style.overflow = "auto";
			console.style.width = "700px";
			console.style.height = "350px";
			console.style.margin = "5px";
			documentForm.appendChild(console);
		}

		console.value += message + "\n";

		console.scrollTop = console.scrollHeight - console.clientHeight;
	} catch (ex) {
		alert("Exception: " + ex.name + " Message: " + ex.message);
	}
};
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
    
    var animateDisplay = function (elm, animation, defaultAnimation) {
        animation = (animation) ? animation : defaultAnimation;
        elm.animate(animation.params, animation.duration, animation.callback);
    };
    
    var animateProgress = function (elm, width, speed) {
        // de-queue any left over animations
        elm.queue("fx", []); 
        
        elm.animate({ 
            width: width,
            queue: false
        }, 
        speed);
    };
    
    var showProgress = function (that, animation) {
        if (animation === false) {
            that.displayElement.show();
        } else {
            animateDisplay(that.displayElement, animation, that.options.showAnimation);
        }
    };
    
    var hideProgress = function (that, delay, animation) {
        
        delay = (delay === null || isNaN(delay)) ? that.options.delay : delay;
        
        if (delay) {
            // use a setTimeout to delay the hide for n millies, note use of recursion
            var timeOut = setTimeout(function () {
                hideProgress(that, 0, animation);
            }, delay);
        } else {
            if (animation === false) {
                that.displayElement.hide();
            } else {
                animateDisplay(that.displayElement, animation, that.options.hideAnimation);
            }
        }   
    };
    
    var updateWidth = function (that, newWidth, dontAnimate) {
        dontAnimate  = dontAnimate || false;
        var currWidth = that.indicator.width();
        var direction = that.options.animate;
        if ((newWidth > currWidth) && (direction === "both" || direction === "forward") && !dontAnimate) {
            animateProgress(that.indicator, newWidth, that.options.speed);
        } else if ((newWidth < currWidth) && (direction === "both" || direction === "backward") && !dontAnimate) {
            animateProgress(that.indicator, newWidth, that.options.speed);
        } else {
            that.indicator.width(newWidth);
        }
    };
         
    var percentToPixels = function (that, percent) {
        // progress does not support percents over 100, also all numbers are rounded to integers
        return Math.round((Math.min(percent, 100) * that.progressBar.width()) / 100);
    };
    
    var refreshRelativeWidth = function (that)  {
        var pixels = Math.max(percentToPixels(that, parseFloat(that.storedPercent)), that.options.minWidth);
        updateWidth(that, pixels, true);
    };
        
    var initARIA = function (ariaElement) {
        ariaElement.attr("role", "progressbar");
        ariaElement.attr("aria-valuemin", "0");
        ariaElement.attr("aria-valuemax", "100");
        ariaElement.attr("aria-live", "assertive");
        ariaElement.attr("aria-busy", "false");
        ariaElement.attr("aria-valuenow", "0");
        ariaElement.attr("aria-valuetext", "");
    };
    
    var updateARIA = function (that, percent) {
        var busy = percent < 100 && percent > 0;
        that.ariaElement.attr("aria-busy", busy);
        that.ariaElement.attr("aria-valuenow", percent);    
        if (busy) {
            var busyString = fluid.stringTemplate(that.options.ariaBusyText, {percentComplete : percent});                  
            that.ariaElement.attr("aria-valuetext", busyString);
        } else if (percent === 100) {
            that.ariaElement.attr("aria-valuetext", that.options.ariaDoneText);
        }
    };
        
    var updateText = function (label, value) {
        label.html(value);
    };
    
    var repositionIndicator = function (that) {
        that.indicator.css("top", that.progressBar.position().top)
            .css("left", 0)
            .height(that.progressBar.height());
        refreshRelativeWidth(that);
    };
        
    var updateProgress = function (that, percent, labelText, animationForShow) {
        
        // show progress before updating, jQuery will handle the case if the object is already displayed
        showProgress(that, animationForShow);
            
        // do not update if the value of percent is falsey
        if (percent !== null) {
            that.storedPercent = percent;
        
            var pixels = Math.max(percentToPixels(that, parseFloat(percent)), that.options.minWidth);   
            updateWidth(that, pixels);
        }
        
        if (labelText !== null) {
            updateText(that.label, labelText);
        }
        
        // update ARIA
        if (that.ariaElement) {
            updateARIA(that, percent);
        }
    };
        
    var setupProgress = function (that) {
        that.displayElement = that.locate("displayElement");

        // hide file progress in case it is showing
        if (that.options.initiallyHidden) {
            that.displayElement.hide();
        }

        that.progressBar = that.locate("progressBar");
        that.label = that.locate("label");
        that.indicator = that.locate("indicator");
        that.ariaElement = that.locate("ariaElement");
        
        that.indicator.width(that.options.minWidth);

        that.storedPercent = 0;
                
        // initialize ARIA
        if (that.ariaElement) {
            initARIA(that.ariaElement);
        }

    };
           
    /**
    * Instantiates a new Progress component.
    * 
    * @param {jQuery|Selector|Element} container the DOM element in which the Uploader lives
    * @param {Object} options configuration options for the component.
    */
    fluid.progress = function (container, options) {
        var that = fluid.initView("fluid.progress", container, options);
        setupProgress(that);
        
        /**
         * Shows the progress bar if is currently hidden.
         * 
         * @param {Object} animation a custom animation used when showing the progress bar
         */
        that.show = function (animation) {
            showProgress(that, animation);
        };
        
        /**
         * Hides the progress bar if it is visible.
         * 
         * @param {Number} delay the amount of time to wait before hiding
         * @param {Object} animation a custom animation used when hiding the progress bar
         */
        that.hide = function (delay, animation) {
            hideProgress(that, delay, animation);
        };
        
        /**
         * Updates the state of the progress bar.
         * This will automatically show the progress bar if it is currently hidden.
         * Percentage is specified as a decimal value, but will be automatically converted if needed.
         * 
         * 
         * @param {Number|String} percentage the current percentage, specified as a "float-ish" value 
         * @param {String} labelValue the value to set for the label; this can be an HTML string
         * @param {Object} animationForShow the animation to use when showing the progress bar if it is hidden
         */
        that.update = function (percentage, labelValue, animationForShow) {
            updateProgress(that, percentage, labelValue, animationForShow);
        };
        
        that.refreshView = function () {
            repositionIndicator(that);
        };
                        
        return that;  
    };
      
    fluid.defaults("fluid.progress", {  
        selectors: {
            displayElement: ".flc-progress", // required, the element that gets displayed when progress is displayed, could be the indicator or bar or some larger outer wrapper as in an overlay effect
            progressBar: ".flc-progress-bar", //required
            indicator: ".flc-progress-indicator", //required
            label: ".flc-progress-label", //optional
            ariaElement: ".flc-progress-bar" // usually required, except in cases where there are more than one progressor for the same data such as a total and a sub-total
        },
        
        // progress display and hide animations, use the jQuery animation primatives, set to false to use no animation
        // animations must be symetrical (if you hide with width, you'd better show with width) or you get odd effects
        // see jQuery docs about animations to customize
        showAnimation: {
            params: {
                opacity: "show"
            }, 
            duration: "slow", 
            callback: null
        }, // equivalent of $().fadeIn("slow")
        
        hideAnimation: {
            params: {
                opacity: "hide"
            }, 
            duration: "slow", 
            callback: null
        }, // equivalent of $().fadeOut("slow")

        minWidth: 5, // 0 length indicators can look broken if there is a long pause between updates
        delay: 0, // the amount to delay the fade out of the progress
        speed: 200, // default speed for animations, pretty fast
        animate: "forward", // suppport "forward", "backward", and "both", any other value is no animation either way
        initiallyHidden: true, // supports progress indicators which may always be present
        updatePosition: false,
        
        ariaBusyText: "Progress is %percentComplete percent complete",
        ariaDoneText: "Progress is complete."
    });
    
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

/***********************
 * Demo Upload Manager *
 ***********************/

(function ($, fluid) {
    
    var updateProgress = function (file, events, demoState, isUploading) {
        if (!isUploading) {
            return;
        }
        
        var chunk = Math.min(demoState.chunkSize, file.size);
        demoState.bytesUploaded = Math.min(demoState.bytesUploaded + chunk, file.size);
        events.onFileProgress.fire(file, demoState.bytesUploaded, file.size);
    };
    
        
    var fireAfterFileComplete = function (that, file) {
        // this is a horrible hack that needs to be addressed.
        if (that.swfUploadSettings) {
            that.swfUploadSettings.upload_complete_handler(file); 
        } else {
            that.events.afterFileComplete.fire(file);
        }
    };
    
    var finishAndContinueOrCleanup = function (that, file) {
        that.queueManager.finishFile(file);
        if (that.queueManager.shouldUploadNextFile()) {
            startUploading(that);
        } else {
            that.queueManager.complete();
        }
    };
    
    var finishUploading = function (that) {
        if (!that.queue.isUploading) {
            return;
        }
        
        var file = that.demoState.currentFile;
        file.filestatus = fluid.uploader.fileStatusConstants.COMPLETE;
        that.events.onFileSuccess.fire(file);
        that.demoState.fileIdx++;
        finishAndContinueOrCleanup(that, file);
    };
    
    var simulateUpload = function (that) {
        if (!that.queue.isUploading) {
            return;
        }
        
        var file = that.demoState.currentFile;
        if (that.demoState.bytesUploaded < file.size) {
            that.invokeAfterRandomDelay(function () {
                updateProgress(file, that.events, that.demoState, that.queue.isUploading);
                simulateUpload(that);
            });
        } else {
            finishUploading(that);
        } 
    };
    
    var startUploading = function (that) {
        // Reset our upload stats for each new file.
        that.demoState.currentFile = that.queue.files[that.demoState.fileIdx];
        that.demoState.chunksForCurrentFile = Math.ceil(that.demoState.currentFile / that.demoState.chunkSize);
        that.demoState.bytesUploaded = 0;
        that.queue.isUploading = true;
        
        that.events.onFileStart.fire(that.demoState.currentFile);
        that.demoState.currentFile.filestatus = fluid.uploader.fileStatusConstants.IN_PROGRESS;
        simulateUpload(that);
    };

    var stopDemo = function (that) {
        var file = that.demoState.currentFile;
        file.filestatus = fluid.uploader.fileStatusConstants.CANCELLED;
        that.queue.shouldStop = true;
        
        // In SWFUpload's world, pausing is a combinination of an UPLOAD_STOPPED error and a complete.
        that.events.onFileError.fire(file, 
                                     fluid.uploader.errorConstants.UPLOAD_STOPPED, 
                                     "The demo upload was paused by the user.");
        finishAndContinueOrCleanup(that, file);
        that.events.onUploadStop.fire();
    };
    
    var setupDemoUploadManager = function (that) {
        if (that.options.simulateDelay === undefined || that.options.simulateDelay === null) {
            that.options.simulateDelay = true;
        }
          
        // Initialize state for our upload simulation.
        that.demoState = {
            fileIdx: 0,
            chunkSize: 200000
        };
        
        return that;
    };
       
    /**
     * The Demo Upload Manager wraps a standard upload manager and simulates the upload process.
     * 
     * @param {UploadManager} uploadManager the upload manager to wrap
     */
    fluid.demoUploadManager = function (uploadManager) {
        var that = uploadManager;
        
        that.start = function () {
            that.queueManager.start();
            startUploading(that);   
        };
        
        /**
         * Cancels a simulated upload.
         * This method overrides the default behaviour in SWFUploadManager.
         */
        that.stop = function () {
            stopDemo(that);
        };
        
        /**
         * Invokes a function after a random delay by using setTimeout.
         * If the simulateDelay option is false, the function is invoked immediately.
         * 
         * @param {Object} fn the function to invoke
         */
        that.invokeAfterRandomDelay = function (fn) {
            var delay;
            
            if (that.options.simulateDelay) {
                delay = Math.floor(Math.random() * 1000 + 100);
                setTimeout(fn, delay);
            } else {
                fn();
            }
        };
        
        setupDemoUploadManager(that);
        return that;
    };
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global SWFUpload*/
/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
    
    var filterFiles = function (files, filterFn) {
        var filteredFiles = [];
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (filterFn(file) === true) {
                filteredFiles.push(file);
            }
        }
        
        return filteredFiles;
    };
    
    var getUploadedFiles = function (that) {
        return filterFiles(that.files, function (file) {
            return (file.filestatus === fluid.uploader.fileStatusConstants.COMPLETE);
        });
    };
    
    var getReadyFiles = function (that) {
        return filterFiles(that.files, function (file) {
            return (file.filestatus === fluid.uploader.fileStatusConstants.QUEUED || file.filestatus === fluid.uploader.fileStatusConstants.CANCELLED);
        });
    };
    
    var getErroredFiles = function (that) {
        return filterFiles(that.files, function (file) {
            return (file.filestatus === fluid.uploader.fileStatusConstants.ERROR);
        });
    };

    var removeFile = function (that, file) {
        // Remove the file from the collection and tell the world about it.
        var idx = $.inArray(file, that.files);
        that.files.splice(idx, 1);
    };
    
    var clearCurrentBatch = function (that) {
        that.currentBatch = {
            fileIdx: -1,
            files: [],
            totalBytes: 0,
            numFilesCompleted: 0,
            numFilesErrored: 0,
            bytesUploadedForFile: 0,
            previousBytesUploadedForFile: 0,
            totalBytesUploaded: 0
        };
    };
    
    var updateCurrentBatch = function (that) {
        var readyFiles = that.getReadyFiles();
        that.currentBatch.files = readyFiles;
        that.currentBatch.totalBytes = fluid.fileQueue.sizeOfFiles(readyFiles);
    };
    
    var setupCurrentBatch = function (that) {
        clearCurrentBatch(that);
        updateCurrentBatch(that);
    };
     
    fluid.fileQueue = function () {
        var that = {};
        that.files = [];
        that.isUploading = false;
        
        that.addFile = function (file) {
            that.files.push(file);    
        };
        
        that.removeFile = function (file) {
            removeFile(that, file);
        };
        
        that.totalBytes = function () {
            return fluid.fileQueue.sizeOfFiles(that.files);
        };
        
        that.getReadyFiles = function () {
            return getReadyFiles(that);
        };
        
        that.getErroredFiles = function () {
            return getErroredFiles(that);
        };
        
        that.sizeOfReadyFiles = function () {
            return fluid.fileQueue.sizeOfFiles(that.getReadyFiles());
        };
        
        that.getUploadedFiles = function () {
            return getUploadedFiles(that);
        };

        that.sizeOfUploadedFiles = function () {
            return fluid.fileQueue.sizeOfFiles(that.getUploadedFiles());
        };

        that.setupCurrentBatch = function () {
            setupCurrentBatch(that);
        };
        
        that.clearCurrentBatch = function () {
            clearCurrentBatch(that);
        };
        
        that.updateCurrentBatch = function () {
            updateCurrentBatch(that);
        };
                
        return that;
    };
    
    fluid.fileQueue.sizeOfFiles = function (files) {
        var totalBytes = 0;
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            totalBytes += file.size;
        }        
        return totalBytes;
    };
    
    fluid.fileQueue.manager = function (queue, events) {
        var that = {};
        that.queue = queue;
        that.events = events;
        
        that.start = function () {
            that.queue.setupCurrentBatch();
            that.queue.isUploading = true;
            that.queue.shouldStop = false;
            that.events.onUploadStart.fire(that.queue.currentBatch.files); 
        };
        
        that.startFile = function () {
            that.queue.currentBatch.fileIdx++;
            that.queue.currentBatch.bytesUploadedForFile = 0;
            that.queue.currentBatch.previousBytesUploadedForFile = 0; 
        };
                
        that.finishFile = function (file) {
            var batch = that.queue.currentBatch;
            batch.numFilesCompleted++;
            that.events.afterFileComplete.fire(file); 
        };
        
        that.shouldUploadNextFile = function () {
            return !that.queue.shouldStop && that.queue.isUploading && that.queue.currentBatch.numFilesCompleted < that.queue.currentBatch.files.length;
        };
        
        that.complete = function () {
            that.events.afterUploadComplete.fire(that.queue.currentBatch.files);
            that.queue.clearCurrentBatch();
        };
        
        return that;
    };
          
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
    
    var refreshView = function (that) {
        var maxHeight = that.options.maxHeight;
        var isOverMaxHeight = (that.scrollingElm.children().eq(0).height() > maxHeight);
        var setHeight = (isOverMaxHeight) ? maxHeight : "";
        that.scrollingElm.height(setHeight);
    };
    
    var scrollBottom = function (that) {
        that.scrollingElm[0].scrollTop = that.scrollingElm[0].scrollHeight;
    };
    
    var scrollTo = function (that, element) {
        if (!element || element.length < 1) {
            return;
        }
        
        var padTop = 0;
        var padBottom = 0;
        
        var elmPosTop = element[0].offsetTop;
        var elmHeight = element.height();
        var containerScrollTop = that.scrollingElm[0].scrollTop;
        var containerHeight = that.scrollingElm.height();
        
        if (that.options.padScroll) {
            // if the combined height of the elements is greater than the 
            // viewport then then scrollTo element would not be in view
            var prevElmHeight = element.prev().height();
            padTop = (prevElmHeight + elmHeight <= containerHeight) ? prevElmHeight : 0;
            var nextElmHeight = element.next().height();
            padBottom =  (nextElmHeight + elmHeight <= containerHeight) ? nextElmHeight : 0;
        }
        
        // if the top of the row is ABOVE the view port move the row into position
        if ((elmPosTop - padTop) < containerScrollTop) {
            that.scrollingElm[0].scrollTop = elmPosTop - padTop;
        }
        
        // if the bottom of the row is BELOW the viewport then scroll it into position
        if (((elmPosTop + elmHeight) + padBottom) > (containerScrollTop + containerHeight)) {
            elmHeight = (elmHeight < containerHeight) ? elmHeight : containerHeight;
            that.scrollingElm[0].scrollTop = (elmPosTop - containerHeight + elmHeight + padBottom);
        }
    };
    
    var setupScroller = function (that) {
        that.scrollingElm = that.container.parents(that.options.selectors.wrapper);
        
        // We should render our own sensible default if the scrolling element is missing.
        if (!that.scrollingElm.length) {
            fluid.fail({
                name: "Missing Scroller",
                message: "The scroller wrapper element was not found."
            });
        }
        
        // set the height of the scroller unless this is IE6
        if (!$.browser.msie || $.browser.version > 6) {
            that.scrollingElm.css("max-height", that.options.maxHeight);
        }
    };
    
    /**
     * Creates a new Scroller component.
     * 
     * @param {Object} container the element containing the collection of things to make scrollable 
     * @param {Object} options configuration options for the component
     */
    fluid.scroller = function (container, options) {
        var that = fluid.initView("fluid.scroller", container, options);
        setupScroller(that);

        /**
         * Scrolls the specified element into view
         * 
         * @param {jQuery} element the element to scroll into view
         */
        that.scrollTo = function (element) {
            scrollTo(that, element);
        };
        
        /**
         * Scrolls to the bottom of the view.
         */
        that.scrollBottom = function () {
            scrollBottom(that);
        };
        
        /**
         * Refreshes the scroller's appearance based on any changes to the document.
         */
        that.refreshView = function () {
            if ($.browser.msie && $.browser.version < 7) {
                refreshView(that);
            }
        };
        
        that.refreshView();
        return that;
    };
    
    fluid.defaults("fluid.scroller", {  
        selectors: {
            wrapper: ".flc-scroller"
        },
        
        maxHeight: 180,
        
        padScroll: true
    });
    
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global SWFUpload*/
/*global swfobject*/
/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {

    /*****************************
     * SWFUpload Setup Decorator *
     *****************************/
    
    var unbindSelectFiles = function () {
        // There's a bug in SWFUpload 2.2.0b3 that causes the entire browser to crash 
        // if selectFile() or selectFiles() is invoked. Remove them so no one will accidently crash their browser.
        var emptyFunction = function () {};
        SWFUpload.prototype.selectFile = emptyFunction;
        SWFUpload.prototype.selectFiles = emptyFunction;
    };
    
    var prepareUpstreamOptions = function (that, uploader) {
        that.returnedOptions = {
            uploadManager: {
                type: uploader.options.uploadManager.type || uploader.options.uploadManager
            }
        };
    };
    
    var createAfterReadyHandler = function (that, uploader) {
        return function () {
            var flashMovie = $("#" + uploader.uploadManager.swfUploader.movieName, uploader.container);
            var browseButton = uploader.locate("browseButton");
            
            // Do our best to make the Flash movie as accessible as possib
            fluid.tabindex(flashMovie, 0);
            flashMovie.attr("role", "button");
            flashMovie.attr("alt", "Browse files button");
            
            if (that.isTransparent) {
                // Style the Flash movie so that it floats trasparently over the button.
                flashMovie.addClass(that.options.styles.browseButtonOverlay);
                flashMovie.css("top", browseButton.position().top);
                flashMovie.css("left", browseButton.position().left);
            }
        };
    };
    
    var createFlash9MovieContainer = function () {
        // Create a hidden container and a placeholder element for SWFUpload to replace.
        var container = $("<div class='fl-uploader-flash9-container'></div>");
        var placeholder = $("<span></span>");
        var placeholderId = fluid.allocateSimpleId(placeholder);
        container.append(placeholder);
        $("body").append(container);
        return placeholderId;
    };
    
    var setupForFlash9 = function (that, uploader) {
        that.returnedOptions.uploadManager.options = {
            flashURL: that.options.flash9URL || undefined,
            flashButtonPeerId: createFlash9MovieContainer()
        };
    };
    
    var createEmptyPlaceholder = function () {
        var placeholder = $("<span></span>");
        fluid.allocateSimpleId(placeholder);
        
        return placeholder;
    };
    
    var createButtonPlaceholder = function (browseButton) {
        var placeholder = $("<span></span>");
        var placeholderId = fluid.allocateSimpleId(placeholder);
        browseButton.before(placeholder);
        unbindSelectFiles();
        
        return placeholderId;
    };
    
    var setupForFlash10 = function (that, uploader) {
        // If we're working in Flash 10 or later, we need to attach the Flash movie to the browse button.
        var browseButton = uploader.locate("browseButton");
        fluid.tabindex(browseButton, -1);

        that.isTransparent = that.options.flashButtonAlwaysVisible ? false : 
                                                                     (!$.browser.msie || that.options.transparentEvenInIE);
        
        // If the button is transparent, we'll need an extra placeholder element which will be replaced by the movie.
        // If the Flash movie is visible, we can just replace the button itself.
        var peerId = that.isTransparent ? createButtonPlaceholder(browseButton) : fluid.allocateSimpleId(browseButton);
        
        that.returnedOptions.uploadManager.options = {
            flashURL: that.options.flash10URL || undefined,
            flashButtonImageURL: that.isTransparent ? undefined : that.options.flashButtonImageURL, 
            flashButtonPeerId: peerId,
            flashButtonHeight: that.isTransparent ? browseButton.outerHeight(): that.options.flashButtonHeight,
            flashButtonWidth: that.isTransparent ? browseButton.outerWidth(): that.options.flashButtonWidth,
            flashButtonWindowMode: that.isTransparent ? SWFUpload.WINDOW_MODE.TRANSPARENT : SWFUpload.WINDOW_MODE.OPAQUE,
            flashButtonCursorEffect: SWFUpload.CURSOR.HAND,
            listeners: {
                afterReady: createAfterReadyHandler(that, uploader),
                onUploadStart: function () {
                    uploader.uploadManager.swfUploader.setButtonDisabled(true);
                },
                afterUploadComplete: function () {
                    uploader.uploadManager.swfUploader.setButtonDisabled(false);
                }
            }   
        };
    };
    
    /**
     * SWFUploadSetupDecorator is a decorator designed to setup the DOM correctly for SWFUpload and configure
     * the Uploader component according to the version of Flash and browser currently running.
     * 
     * @param {Uploader} uploader the Uploader component to decorate
     * @param {options} options configuration options for the decorator
     */
    fluid.swfUploadSetupDecorator = function (uploader, options) {
        var that = {};
        fluid.mergeComponentOptions(that, "fluid.swfUploadSetupDecorator", options);
               
        that.flashVersion = swfobject.getFlashPlayerVersion().major;
        prepareUpstreamOptions(that, uploader);  
        if (that.flashVersion === 9) {
            setupForFlash9(that, uploader);
        } else {
            setupForFlash10(that, uploader);
        }
        
        return that;
    };
    
    fluid.defaults("fluid.swfUploadSetupDecorator", {
        // The flash9URL and flash10URLs are now deprecated in favour of the flashURL option in upload manager.
        flashButtonAlwaysVisible: true,
        transparentEvenInIE: false,
        
        // Used only when the Flash movie is visible.
        flashButtonImageURL: "../images/browse.png",
        flashButtonHeight: 22,
        flashButtonWidth: 106,
        
        styles: {
            browseButtonOverlay: "fl-uploader-browse-overlay"
        }
    });
    
    
    /***********************
     * SWF Upload Manager *
     ***********************/
    
    // Maps SWFUpload's setting names to our component's setting names.
    var swfUploadOptionsMap = {
        uploadURL: "upload_url",
        flashURL: "flash_url",
        postParams: "post_params",
        fileSizeLimit: "file_size_limit",
        fileTypes: "file_types",
        fileTypesDescription: "file_types_description",
        fileUploadLimit: "file_upload_limit",
        fileQueueLimit: "file_queue_limit",
        flashButtonPeerId: "button_placeholder_id",
        flashButtonImageURL: "button_image_url",
        flashButtonHeight: "button_height",
        flashButtonWidth: "button_width",
        flashButtonWindowMode: "button_window_mode",
        flashButtonCursorEffect: "button_cursor",
        debug: "debug"
    };
    
    // Maps SWFUpload's callback names to our component's callback names.
    var swfUploadEventMap = {
        afterReady: "swfupload_loaded_handler",
        onFileDialog: "file_dialog_start_handler",
        afterFileQueued: "file_queued_handler",
        onQueueError: "file_queue_error_handler",
        afterFileDialog: "file_dialog_complete_handler",
        onFileStart: "upload_start_handler",
        onFileProgress: "upload_progress_handler",
        onFileError: "upload_error_handler",
        onFileSuccess: "upload_success_handler"
    };
    
    var mapNames = function (nameMap, source, target) {
        var result = target || {};
        for (var key in source) {
            var mappedKey = nameMap[key];
            if (mappedKey) {
                result[mappedKey] = source[key];
            }
        }
        
        return result;
    };
    
    // For each event type, hand the fire function to SWFUpload so it can fire the event at the right time for us.
    var mapEvents = function (that, nameMap, target) {
        var result = target || {};
        for (var eventType in that.events) {
            var fireFn = that.events[eventType].fire;
            var mappedName = nameMap[eventType];
            if (mappedName) {
                result[mappedName] = fireFn;
            }   
        }
        
        result.upload_complete_handler = function (file) {
            that.queueManager.finishFile(file);
            if (that.queueManager.shouldUploadNextFile()) {
                that.swfUploader.startUpload();
            } else {
                if (that.queueManager.queue.shouldStop) {
                    that.swfUploader.stopUpload();
                }
                that.queueManager.complete();
            }
        };

        return result;
    };
    
    // Invokes the OS browse files dialog, allowing either single or multiple select based on the options.
    var browse = function (that) {
        if (that.queue.isUploading) {
            return;
        }
                   
        if (that.options.fileQueueLimit === 1) {
            that.swfUploader.selectFile();
        } else {
            that.swfUploader.selectFiles();
        }  
    };
    
    /* FLUID-822: while stopping the upload cycle while a file is in mid-upload should be possible
     * in practice, it sets up a state where when the upload cycle is restarted SWFUpload will get stuck
     * therefor we only stop the upload after a file has completed but before the next file begins. 
     */
    
    var stopUpload = function (that) {
        that.queue.shouldStop = true;
        that.events.onUploadStop.fire();
    };
        
    var bindEvents = function (that) {
        var fileStatusUpdater = function (file) {
            fluid.find(that.queue.files, function (potentialMatch) {
                if (potentialMatch.id === file.id) {
                    potentialMatch.filestatus = file.filestatus;
                    return true;
                }
            });
        };

        // Add a listener that will keep our file queue model in sync with SWFUpload.
        that.events.afterFileQueued.addListener(function (file) {
            that.queue.addFile(file); 
        });

        that.events.onFileStart.addListener(function (file) {
            that.queueManager.startFile();
            fileStatusUpdater(file);
        });
        
        that.events.onFileProgress.addListener(function (file, currentBytes, totalBytes) {
            var currentBatch = that.queue.currentBatch;
            var byteIncrement = currentBytes - currentBatch.previousBytesUploadedForFile;
            currentBatch.totalBytesUploaded += byteIncrement;
            currentBatch.bytesUploadedForFile += byteIncrement;
            currentBatch.previousBytesUploadedForFile = currentBytes;
            fileStatusUpdater(file);
        });
        
        that.events.onFileError.addListener(function (file, error) {
            if (error === fluid.uploader.errorConstants.UPLOAD_STOPPED) {
                that.queue.isUploading = false;
            } else if (that.queue.isUploading) {
                that.queue.currentBatch.totalBytesUploaded += file.size;
                that.queue.currentBatch.numFilesErrored++;
            }
            fileStatusUpdater(file);
        });
        
        that.events.onFileSuccess.addListener(function (file) {
            if (that.queue.currentBatch.bytesUploadedForFile === 0) {
                that.queue.currentBatch.totalBytesUploaded += file.size;
            }
            fileStatusUpdater(file);
        });
        
        that.events.afterUploadComplete.addListener(function () {
            that.queue.isUploading = false; 
        });
    };
    
    var removeFile = function (that, file) {
        that.queue.removeFile(file);
        that.swfUploader.cancelUpload(file.id);
        that.events.afterFileRemoved.fire(file);
    };
    
    // Instantiates a new SWFUploader instance and attaches it the upload manager.
    var setupSwfUploadManager = function (that, events) {
        that.events = events;
        that.queue = fluid.fileQueue();
        that.queueManager = fluid.fileQueue.manager(that.queue, that.events);
        
        // Map the event and settings names to SWFUpload's expectations.
        that.swfUploadSettings = mapNames(swfUploadOptionsMap, that.options);
        mapEvents(that, swfUploadEventMap, that.swfUploadSettings);
        
        // Setup the instance.
        that.swfUploader = new SWFUpload(that.swfUploadSettings);
        
        bindEvents(that);
    };
    
    /**
     * Server Upload Manager is responsible for coordinating with the Flash-based SWFUploader library,
     * providing a simple way to start, pause, and cancel the uploading process. It requires a working
     * server to respond to the upload POST requests.
     * 
     * @param {Object} eventBindings an object containing upload lifecycle callbacks
     * @param {Object} options configuration options for the upload manager
     */
    fluid.swfUploadManager = function (events, options) {
        var that = {};
        
        // This needs to be refactored!
        fluid.mergeComponentOptions(that, "fluid.swfUploadManager", options);
        fluid.mergeListeners(events, that.options.listeners);
   
        /**
         * Opens the native OS browse file dialog.
         */
        that.browseForFiles = function () {
            browse(that);
        };
        
        /**
         * Removes the specified file from the upload queue.
         * 
         * @param {File} file the file to remove
         */
        that.removeFile = function (file) {
            removeFile(that, file);
        };
        
        /**
         * Starts uploading all queued files to the server.
         */
        that.start = function () {
            that.queueManager.start();
            that.swfUploader.startUpload();
        };
        
        /**
         * Cancels an in-progress upload.
         */
        that.stop = function () {
            stopUpload(that);
        };
        
        setupSwfUploadManager(that, events);
        return that;
    };
    
    fluid.defaults("fluid.swfUploadManager", {
        uploadURL: "",
        flashURL: "../../../lib/swfupload/flash/swfupload.swf",
        flashButtonPeerId: "",
        postParams: {},
        fileSizeLimit: "20480",
        fileTypes: "*",
        fileTypesDescription: null,
        fileUploadLimit: 0,
        fileQueueLimit: 0,
        debug: false
    });
    
})(jQuery, fluid_1_1);
/*
Copyright 2007-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley
Copyright 2007-2009 University of Cambridge

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global SWFUpload*/
/*global swfobject*/
/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};


/*******************
 * File Queue View *
 *******************/

(function ($, fluid) {
    
    // Real data binding would be nice to replace these two pairs.
    var rowForFile = function (that, file) {
        return that.locate("fileQueue").find("#" + file.id);
    };
    
    var errorRowForFile = function (that, file) {
        return $("#" + file.id + "_error", that.container);
    };
    
    var fileForRow = function (that, row) {
        var files = that.uploadManager.queue.files;
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (file.id.toString() === row.attr("id")) {
                return file;
            }
        }
        return null;
    };
    
    var progressorForFile = function (that, file) {
        var progressId = file.id + "_progress";
        return that.fileProgressors[progressId];
    };
    
    var startFileProgress = function (that, file) {
        var fileRowElm = rowForFile(that, file);
        that.scroller.scrollTo(fileRowElm);
         
        // update the progressor and make sure that it's in position
        var fileProgressor = progressorForFile(that, file);
        fileProgressor.refreshView();
        fileProgressor.show();
    };
        
    var updateFileProgress = function (that, file, fileBytesComplete, fileTotalBytes) {
        var filePercent = fluid.uploader.derivePercent(fileBytesComplete, fileTotalBytes);
        var filePercentStr = filePercent + "%";    
        progressorForFile(that, file).update(filePercent, filePercentStr);
    };
    
    var hideFileProgress = function (that, file) {
        var fileRowElm = rowForFile(that, file);
        progressorForFile(that, file).hide();
        if (file.filestatus === fluid.uploader.fileStatusConstants.COMPLETE) {
            that.locate("fileIconBtn", fileRowElm).removeClass(that.options.styles.dim);
        } 
    };
    
    var removeFileProgress = function (that, file) {
        var fileProgressor = progressorForFile(that, file);
        if (!fileProgressor) {
            return;
        }
        var rowProgressor = fileProgressor.displayElement;
        rowProgressor.remove();
    };
 
    var animateRowRemoval = function (that, row) {
        row.fadeOut("fast", function () {
            row.remove();  
            that.refreshView();
        });
    };
    
    var removeFileErrorRow = function (that, file) {
        if (file.filestatus === fluid.uploader.fileStatusConstants.ERROR) {
            animateRowRemoval(that, errorRowForFile(that, file));
        }
    };
   
    var removeFileAndRow = function (that, file, row) {
        // Clean up the stuff associated with a file row.
        removeFileProgress(that, file);
        removeFileErrorRow(that, file);
        
        // Remove the file itself.
        that.uploadManager.removeFile(file);
        animateRowRemoval(that, row);
    };
    
    var removeFileForRow = function (that, row) {
        var file = fileForRow(that, row);
        if (!file || file.filestatus === fluid.uploader.fileStatusConstants.COMPLETE) {
            return;
        }
        removeFileAndRow(that, file, row);
    };
    
    var removeRowForFile = function (that, file) {
        var row = rowForFile(that, file);
        removeFileAndRow(that, file, row);
    };
    
    var bindHover = function (row, styles) {
        var over = function () {
            if (row.hasClass(styles.ready) && !row.hasClass(styles.uploading)) {
                row.addClass(styles.hover);
            }
        };
        
        var out = function () {
            if (row.hasClass(styles.ready) && !row.hasClass(styles.uploading)) {
                row.removeClass(styles.hover);
            }   
        };
        row.hover(over, out);
    };
    
    var bindDeleteKey = function (that, row) {
        var deleteHandler = function () {
            removeFileForRow(that, row);
        };
       
        fluid.activatable(row, null, {
            additionalBindings: [{
                key: $.ui.keyCode.DELETE, 
                activateHandler: deleteHandler
            }]
        });
    };
    
    var bindRowHandlers = function (that, row) {
        if ($.browser.msie && $.browser.version < 7) {
            bindHover(row, that.options.styles);
        }
        
        that.locate("fileIconBtn", row).click(function () {
            removeFileForRow(that, row);
        });
        
        bindDeleteKey(that, row);
    };
    
    var renderRowFromTemplate = function (that, file) {
        var row = that.rowTemplate.clone();
        that.locate("fileName", row).text(file.name);
        that.locate("fileSize", row).text(fluid.uploader.formatFileSize(file.size));
        that.locate("fileIconBtn", row).addClass(that.options.styles.remove);
        row.attr("id", file.id);
        row.addClass(that.options.styles.ready);
        bindRowHandlers(that, row);
        
        return row;    
    };
    
    var createProgressorFromTemplate = function (that, row) {
        // create a new progress bar for the row and position it
        var rowProgressor = that.rowProgressorTemplate.clone();
        var rowId = row.attr("id");
        var progressId = rowId + "_progress";
        rowProgressor.attr("id", progressId);
        rowProgressor.css("top", row.position().top);
        rowProgressor.height(row.height()).width(5);
        that.container.after(rowProgressor);
       
        that.fileProgressors[progressId] = fluid.progress(that.uploadContainer, {
            selectors: {
                progressBar: "#" + rowId,
                displayElement: "#" + progressId,
                label: "#" + progressId + " .fl-uploader-file-progress-text",
                indicator: "#" + progressId
            }
        });
    };
    
    var addFile = function (that, file) {
        var row = renderRowFromTemplate(that, file);
        /* FLUID-2720 - do not hide the row under IE8 */
        if (!($.browser.msie && ($.browser.version >= 8))) {
            row.hide();
        }
        that.container.append(row);
        row.fadeIn("slow");
        that.scroller.scrollBottom();
        createProgressorFromTemplate(that, row);

        that.refreshView();
    };
    
    var prepareForUpload = function (that) {
        var rowButtons = that.locate("fileIconBtn", that.locate("fileRows"));
        rowButtons.attr("disabled", "disabled");
        rowButtons.addClass(that.options.styles.dim);    
    };

    var refreshAfterUpload = function (that) {
        var rowButtons = that.locate("fileIconBtn", that.locate("fileRows"));
        rowButtons.removeAttr("disabled");
        rowButtons.removeClass(that.options.styles.dim);    
    };
        
    var changeRowState = function (that, row, newState) {
        row.removeClass(that.options.styles.ready).removeClass(that.options.styles.error).addClass(newState);
    };
    
    var markRowAsComplete = function (that, file) {
        // update styles and keyboard bindings for the file row
        var row = rowForFile(that, file);
        changeRowState(that, row, that.options.styles.uploaded);
        row.attr("title", that.options.strings.status.success);
        fluid.enabled(row, false);
        
        // update the click event and the styling for the file delete button
        var removeRowBtn = that.locate("fileIconBtn", row);
        removeRowBtn.unbind("click");
        removeRowBtn.removeClass(that.options.styles.remove);
		removeRowBtn.attr("title", that.options.strings.status.success); 
    };
    
    var renderErrorInfoRowFromTemplate = function (that, fileRow, error) {
        // Render the row by cloning the template and binding its id to the file.
        var errorRow = that.errorInfoRowTemplate.clone();
        errorRow.attr("id", fileRow.attr("id") + "_error");
        
        // Look up the error message and render it.
        var errorType = fluid.keyForValue(fluid.uploader.errorConstants, error);
        var errorMsg = that.options.strings.errors[errorType];
        that.locate("errorText", errorRow).text(errorMsg);
        fileRow.after(errorRow);
        that.scroller.scrollTo(errorRow);
    };
    
    var showErrorForFile = function (that, file, error) {
        hideFileProgress(that, file);
        if (file.filestatus === fluid.uploader.fileStatusConstants.ERROR) {
            var fileRowElm = rowForFile(that, file);
            changeRowState(that, fileRowElm, that.options.styles.error);
            renderErrorInfoRowFromTemplate(that, fileRowElm, error);
        }
    };
    
    var bindModelEvents = function (that) {
        that.returnedOptions = {
            listeners: {
                afterFileQueued: that.addFile,
                onUploadStart: that.prepareForUpload,
                onFileStart: that.showFileProgress,
                onFileProgress: that.updateFileProgress,
                onFileSuccess: that.markFileComplete,
                onFileError: that.showErrorForFile,
                afterFileComplete: that.hideFileProgress,
                afterUploadComplete: that.refreshAfterUpload
            }
        };
    };
    
    var addKeyboardNavigation = function (that) {
        fluid.tabbable(that.container);
        that.selectableContext = fluid.selectable(that.container, {
            selectableSelector: that.options.selectors.fileRows,
            onSelect: function (itemToSelect) {
                $(itemToSelect).addClass(that.options.styles.selected);
            },
            onUnselect: function (selectedItem) {
                $(selectedItem).removeClass(that.options.styles.selected);
            }
        });
    };
    
    var prepareTemplateElements = function (that) {
        // Grab our template elements out of the DOM.  
        that.rowTemplate = that.locate("rowTemplate").remove();
        /* FLUID-2720 - do not hide the row under IE8 */
        if ($.browser.msie && ($.browser.version >= 8)) {
            that.rowTemplate.removeClass(that.options.styles.hiddenTemplate);
        }
        that.errorInfoRowTemplate = that.locate("errorInfoRowTemplate").remove();
        that.errorInfoRowTemplate.removeClass(that.options.styles.hiddenTemplate);
        that.rowProgressorTemplate = that.locate("rowProgressorTemplate", that.uploadContainer).remove();
    };
    
    var setupFileQueue = function (that, uploadManager) {
        that.uploadManager = uploadManager;
        that.scroller = fluid.scroller(that.container);
        prepareTemplateElements(that);         
        addKeyboardNavigation(that); 
        bindModelEvents(that);
    };
    
    /**
     * Creates a new File Queue view.
     * 
     * @param {jQuery|selector} container the file queue's container DOM element
     * @param {UploadManager} uploadManager an upload manager model instance
     * @param {Object} options configuration options for the view
     */
    fluid.fileQueueView = function (container, parentContainer, uploadManager, options) {
        var that = fluid.initView("fluid.fileQueueView", container, options);
        that.uploadContainer = parentContainer;
        that.fileProgressors = {};
        
        that.addFile = function (file) {
            addFile(that, file);
        };
        
        that.removeFile = function (file) {
            removeRowForFile(that, file);
        };
        
        that.prepareForUpload = function () {
            prepareForUpload(that);
        };
        
        that.refreshAfterUpload = function () {
            refreshAfterUpload(that);
        };

        that.showFileProgress = function (file) {
            startFileProgress(that, file);
        };
        
        that.updateFileProgress = function (file, fileBytesComplete, fileTotalBytes) {
            updateFileProgress(that, file, fileBytesComplete, fileTotalBytes); 
        };
        
        that.markFileComplete = function (file) {
            progressorForFile(that, file).update(100, "100%");
            markRowAsComplete(that, file);
        };
        
        that.showErrorForFile = function (file, error) {
            showErrorForFile(that, file, error);
        };
        
        that.hideFileProgress = function (file) {
            hideFileProgress(that, file);
        };
        
        that.refreshView = function () {
            that.scroller.refreshView();
            that.selectableContext.refresh();
        };
        
        setupFileQueue(that, uploadManager);     
        return that;
    };
    
    fluid.defaults("fluid.fileQueueView", {
        selectors: {
            fileRows: ".flc-uploader-file",
            fileName: ".flc-uploader-file-name",
            fileSize: ".flc-uploader-file-size",
            fileIconBtn: ".flc-uploader-file-action",      
            errorText: ".flc-uploader-file-error",
            
            rowTemplate: ".flc-uploader-file-tmplt",
            errorInfoRowTemplate: ".flc-uploader-file-error-tmplt",
            rowProgressorTemplate: ".flc-uploader-file-progressor-tmplt"
        },
        
        styles: {
            hover: "fl-uploader-file-hover",
            selected: "fl-uploader-file-focus",
            ready: "fl-uploader-file-state-ready",
            uploading: "fl-uploader-file-state-uploading",
            uploaded: "fl-uploader-file-state-uploaded",
            error: "fl-uploader-file-state-error",
            remove: "fl-uploader-file-action-remove",
            dim: "fl-uploader-dim",
            hiddenTemplate: "fl-uploader-hidden-templates"
        },
        
        strings: {
            progress: {
                toUploadLabel: "To upload: %fileCount %fileLabel (%totalBytes)", 
                singleFile: "file",
                pluralFiles: "files"
            },
            status: {
                success: "File Uploaded",
                error: "File Upload Error"
            }, 
            errors: {
                HTTP_ERROR: "File upload error: a network error occured or the file was rejected (reason unknown).",
                IO_ERROR: "File upload error: a network error occured.",
                UPLOAD_LIMIT_EXCEEDED: "File upload error: you have uploaded as many files as you are allowed during this session",
                UPLOAD_FAILED: "File upload error: the upload failed for an unknown reason.",
                QUEUE_LIMIT_EXCEEDED: "You have as many files in the queue as can be added at one time. Removing files from the queue may allow you to add different files.",
                FILE_EXCEEDS_SIZE_LIMIT: "One or more of the files that you attempted to add to the queue exceeded the limit of %fileSizeLimit.",
                ZERO_BYTE_FILE: "One or more of the files that you attempted to add contained no data.",
                INVALID_FILETYPE: "One or more files were not added to the queue because they were of the wrong type."
            }
        }
    });
   
})(jQuery, fluid_1_1);


/************
 * Uploader *
 ************/

(function ($, fluid) {
    
    var fileOrFiles = function (that, numFiles) {
        return (numFiles === 1) ? that.options.strings.progress.singleFile : 
                                  that.options.strings.progress.pluralFiles;
    };
    
    var enableElement = function (that, elm) {
        elm.removeAttr("disabled");
        elm.removeClass(that.options.styles.dim);
    };
    
    var disableElement = function (that, elm) {
        elm.attr("disabled", "disabled");
        elm.addClass(that.options.styles.dim);
    };
    
    var showElement = function (that, elm) {
        elm.removeClass(that.options.styles.hidden);
    };
     
    var hideElement = function (that, elm) {
        elm.addClass(that.options.styles.hidden);
    };
    
    var setTotalProgressStyle = function (that, didError) {
        didError = didError || false;
        var indicator = that.totalProgress.indicator;
        indicator.toggleClass(that.options.styles.totalProgress, !didError);
        indicator.toggleClass(that.options.styles.totalProgressError, didError);
    };
    
    var setStateEmpty = function (that) {
        disableElement(that, that.locate("uploadButton"));
        
        // If the queue is totally empty, treat it specially.
        if (that.uploadManager.queue.files.length === 0) { 
            that.locate("browseButton").text(that.options.strings.buttons.browse);
            showElement(that, that.locate("instructions"));
        }
    };
    
    var setStateDone = function (that) {
        disableElement(that, that.locate("uploadButton"));
        enableElement(that, that.locate("browseButton"));
        hideElement(that, that.locate("pauseButton"));
        showElement(that, that.locate("uploadButton"));
    };

    var setStateLoaded = function (that) {
        that.locate("browseButton").text(that.options.strings.buttons.addMore);
        hideElement(that, that.locate("pauseButton"));
        showElement(that, that.locate("uploadButton"));
        enableElement(that, that.locate("uploadButton"));
        enableElement(that, that.locate("browseButton"));
        hideElement(that, that.locate("instructions"));
        that.totalProgress.hide();
    };
    
    var setStateUploading = function (that) {
        that.totalProgress.hide(false, false);
        setTotalProgressStyle(that);
        hideElement(that, that.locate("uploadButton"));
        disableElement(that, that.locate("browseButton"));
        enableElement(that, that.locate("pauseButton"));
        showElement(that, that.locate("pauseButton"));
        that.locate(that.options.focusWithEvent.afterUploadStart).focus();
    };    
    
    var renderUploadTotalMessage = function (that) {
        // Render template for the total file status message.
        var numReadyFiles = that.uploadManager.queue.getReadyFiles().length;
        var bytesReadyFiles = that.uploadManager.queue.sizeOfReadyFiles();
        var fileLabelStr = fileOrFiles(that, numReadyFiles);
                                                   
        var totalStateStr = fluid.stringTemplate(that.options.strings.progress.toUploadLabel, {
            fileCount: numReadyFiles, 
            fileLabel: fileLabelStr, 
            totalBytes: fluid.uploader.formatFileSize(bytesReadyFiles)
        });
        that.locate("totalFileStatusText").html(totalStateStr);
    };
        
    var updateTotalProgress = function (that) {
        var batch = that.uploadManager.queue.currentBatch;
        var totalPercent = fluid.uploader.derivePercent(batch.totalBytesUploaded, batch.totalBytes);
        var numFilesInBatch = batch.files.length;
        var fileLabelStr = fileOrFiles(that, numFilesInBatch);
        
        var totalProgressStr = fluid.stringTemplate(that.options.strings.progress.totalProgressLabel, {
            curFileN: batch.fileIdx + 1, 
            totalFilesN: numFilesInBatch, 
            fileLabel: fileLabelStr,
            currBytes: fluid.uploader.formatFileSize(batch.totalBytesUploaded), 
            totalBytes: fluid.uploader.formatFileSize(batch.totalBytes)
        });  
        that.totalProgress.update(totalPercent, totalProgressStr);
    };
    
    var updateTotalAtCompletion = function (that) {
        var numErroredFiles = that.uploadManager.queue.getErroredFiles().length;
        var numTotalFiles = that.uploadManager.queue.files.length;
        var fileLabelStr = fileOrFiles(that, numTotalFiles);
        
        var errorStr = "";
        
        // if there are errors then change the total progress bar
        // and set up the errorStr so that we can use it in the totalProgressStr
        if (numErroredFiles > 0) {
            var errorLabelString = (numErroredFiles === 1) ? that.options.strings.progress.singleError : 
                                                             that.options.strings.progress.pluralErrors;
            setTotalProgressStyle(that, true);
            errorStr = fluid.stringTemplate(that.options.strings.progress.numberOfErrors, {
                errorsN: numErroredFiles,
                errorLabel: errorLabelString
            });
        }
        
        var totalProgressStr = fluid.stringTemplate(that.options.strings.progress.completedLabel, {
            curFileN: that.uploadManager.queue.getUploadedFiles().length, 
            totalFilesN: numTotalFiles,
            errorString: errorStr,
            fileLabel: fileLabelStr,
            totalCurrBytes: fluid.uploader.formatFileSize(that.uploadManager.queue.sizeOfUploadedFiles())
        });
        
        that.totalProgress.update(100, totalProgressStr);
    };
   
    var bindDOMEvents = function (that) {
        that.locate("browseButton").click(function (evnt) {        
            that.uploadManager.browseForFiles();
            evnt.preventDefault();
        });
        
        that.locate("uploadButton").click(function () {
            that.uploadManager.start();
        });

        that.locate("pauseButton").click(function () {
            that.uploadManager.stop();
        });
    };

    var updateStateAfterFileDialog = function (that) {
        if (that.uploadManager.queue.getReadyFiles().length > 0) {
            setStateLoaded(that);
            renderUploadTotalMessage(that);
            that.locate(that.options.focusWithEvent.afterFileDialog).focus();  
        }
    };
    
    var updateStateAfterFileRemoval = function (that) {
        if (that.uploadManager.queue.getReadyFiles().length === 0) {
            setStateEmpty(that);
        }
        renderUploadTotalMessage(that);
    };
    
    var updateStateAfterPause = function (that) {
        // do nothing, moved to afterUploadComplete
    };
    
    var updateStateAfterCompletion = function (that) {
        var userPaused = that.uploadManager.queue.shouldStop;
        if (that.uploadManager.queue.getReadyFiles().length === 0) {
            setStateDone(that);
        } else {
            setStateLoaded(that);
        }
        updateTotalAtCompletion(that);
    };
    
    var bindModelEvents = function (that) {
        that.events.afterFileDialog.addListener(function () {
            updateStateAfterFileDialog(that);
        });
        
        that.events.afterFileRemoved.addListener(function () {
            updateStateAfterFileRemoval(that);
        });
        
        that.events.onUploadStart.addListener(function () {
            setStateUploading(that);
        });
        
        that.events.onUploadStop.addListener(function () {
            that.locate(that.options.focusWithEvent.afterUploadStop).focus();
        });
        
        that.events.onFileProgress.addListener(function () {
            updateTotalProgress(that); 
        });
        
        that.events.onFileSuccess.addListener(function () {
            updateTotalProgress(that); 
        });
        
        that.events.onFileError.addListener(function (file, error, message) {
            if (error === fluid.uploader.errorConstants.UPLOAD_STOPPED) {
                updateStateAfterPause(that);
            }
        });

        that.events.afterUploadComplete.addListener(function () {
            updateStateAfterCompletion(that);
        });
    };
   
    var initUploadManager = function (that) {
        var manager = fluid.initSubcomponent(that, 
                                             "uploadManager", 
                                             [that.events, fluid.COMPONENT_OPTIONS]);
        return that.options.demo ? fluid.demoUploadManager(manager) : manager;
    };
    
    var setupUploader = function (that) {
        // Instantiate the upload manager, file queue view, and total file progress bar,
        // passing them smaller chunks of the overall options for the uploader.
        that.decorators = fluid.initSubcomponents(that, "decorators", [that, fluid.COMPONENT_OPTIONS]);
        that.uploadManager = initUploadManager(that);
        that.fileQueueView = fluid.initSubcomponent(that, 
                                                    "fileQueueView", 
                                                    [that.locate("fileQueue"),
                                                    that.container, 
                                                    that.uploadManager,
                                                    fluid.COMPONENT_OPTIONS]); 
        that.totalProgress = fluid.initSubcomponent(that,
                                                    "totalProgressBar",
                                                    [that.container, fluid.COMPONENT_OPTIONS]);
        
        // Upload button should not be enabled until there are files to upload
        disableElement(that, that.locate("uploadButton"));
        bindDOMEvents(that);
        bindModelEvents(that);
    };
    
    /**
     * Instantiates a new Uploader component.
     * 
     * @param {Object} container the DOM element in which the Uploader lives
     * @param {Object} options configuration options for the component.
     */
    fluid.uploader = function (container, options) {
        var that = fluid.initView("fluid.uploader", container, options);
        
        setupUploader(that);
        return that;  
    };
    
    /**
     * Instantiates a new Uploader component in the progressive enhancement style.
     * This mode requires another DOM element to be present, the element that is to be enhanced.
     * This method checks to see if the correct version of Flash is present, and will only
     * create the Uploader component if so.
     * 
     * @param {Object} container the DOM element in which the Uploader component lives
     * @param {Object} enhanceable the DOM element to show if the system requirements aren't met
     * @param {Object} options configuration options for the component
     */
    fluid.progressiveEnhanceableUploader = function (container, enhanceable, options) {
        enhanceable = fluid.container(enhanceable);
        container = fluid.container(container);
              
        if (swfobject.getFlashPlayerVersion().major < 9) {
            // Degrade gracefully.
            enhanceable.show();
        } else {
            // Instantiate the component.
            container.show();
            return fluid.uploader(container, options);
        }
    };
    
    /**
     * Pretty prints a file's size, converting from bytes to kilobytes or megabytes.
     * 
     * @param {Number} bytes the files size, specified as in number bytes.
     */
    fluid.uploader.formatFileSize = function (bytes) {
        if (typeof bytes === "number") {
            if (bytes === 0) {
                return "0.0 KB";
            } else if (bytes > 0) {
                if (bytes < 1048576) {
                    return (Math.ceil(bytes / 1024 * 10) / 10).toFixed(1) + " KB";
                }
                else {
                    return (Math.ceil(bytes / 1048576 * 10) / 10).toFixed(1) + " MB";
                }
            }
        }
        return "";
    };
    
    fluid.uploader.derivePercent = function (num, total) {
        return Math.round((num * 100) / total);
    };

    fluid.defaults("fluid.uploader", {
        demo: false,
        
        decorators: [{
            type: "fluid.swfUploadSetupDecorator"
        }, {
            type: "fluid.manuallyDegrade",
            options: {
                selectors: {
                    enhanceable: ".fl-uploader.fl-progEnhance-basic"
                }
            }
        }],
        
        uploadManager: {
            type: "fluid.swfUploadManager"
        },
        
        fileQueueView: {
            type: "fluid.fileQueueView"
        },
        
        totalProgressBar: {
            type: "fluid.progress",
            options: {
                selectors: {
                    progressBar: ".flc-uploader-queue-footer",
                    displayElement: ".flc-uploader-total-progress", 
                    label: ".flc-uploader-total-progress-text",
                    indicator: ".flc-uploader-total-progress",
                    ariaElement: ".flc-uploader-total-progress"
                }
            }
        },
        
        selectors: {
            fileQueue: ".flc-uploader-queue",
            browseButton: ".flc-uploader-button-browse",
            uploadButton: ".flc-uploader-button-upload",
            pauseButton: ".flc-uploader-button-pause",
            totalFileStatusText: ".flc-uploader-total-progress-text",
            instructions: ".flc-uploader-browse-instructions"
        },
 
        // Event listeners must already be implemented to use these options.
        // At the moment, the following events are supported: 
        //   afterFileDialog, afterUploadStart, and afterUploadStop.
        focusWithEvent: {
            afterFileDialog: "uploadButton",
            afterUploadStart: "pauseButton",
            afterUploadStop: "uploadButton"
        },
        
        styles: {
            disabled: "fl-uploader-disabled",
            hidden: "fl-uploader-hidden",
            dim: "fl-uploader-dim",
            totalProgress: "fl-uploader-total-progress-okay",
            totalProgressError: "fl-uploader-total-progress-errored"
        },
        
        events: {
            afterReady: null,
            onFileDialog: null,
            afterFileQueued: null,
            afterFileRemoved: null,
            onQueueError: null,
            afterFileDialog: null,
            onUploadStart: null,
            onUploadStop: null,
            onFileStart: null,
            onFileProgress: null,
            onFileError: null,
            onFileSuccess: null,
            afterFileComplete: null,
            afterUploadComplete: null
        },

        strings: {
            progress: {
                toUploadLabel: "To upload: %fileCount %fileLabel (%totalBytes)", 
                totalProgressLabel: "Uploading: %curFileN of %totalFilesN %fileLabel (%currBytes of %totalBytes)", 
                completedLabel: "Uploaded: %curFileN of %totalFilesN %fileLabel (%totalCurrBytes)%errorString",
                numberOfErrors: ", %errorsN %errorLabel",
                singleFile: "file",
                pluralFiles: "files",
                singleError: "error",
                pluralErrors: "errors"
            },
            buttons: {
                browse: "Browse Files",
                addMore: "Add More",
                stopUpload: "Stop Upload",
                cancelRemaning: "Cancel remaining Uploads",
                resumeUpload: "Resume Upload"
            }
        }
    });
    
    
    fluid.uploader.errorConstants = {
        HTTP_ERROR: -200,
        MISSING_UPLOAD_URL: -210,
        IO_ERROR: -220,
        SECURITY_ERROR: -230,
        UPLOAD_LIMIT_EXCEEDED: -240,
        UPLOAD_FAILED: -250,
        SPECIFIED_FILE_ID_NOT_FOUND: -260,
        FILE_VALIDATION_FAILED: -270,
        FILE_CANCELLED: -280,
        UPLOAD_STOPPED: -290
    };
    
    fluid.uploader.fileStatusConstants = {
        QUEUED: -1,
        IN_PROGRESS: -2,
        ERROR: -3,
        COMPLETE: -4,
        CANCELLED: -5
    };
    
    /*******************
     * ManuallyDegrade *
     *******************/
    
    var renderLink = function (renderLocation, text, classes, appendBeside) {
        var link = $("<a href='#'>" + text + "</a>");
        link.addClass(classes);
        
        if (renderLocation === "before") {
            appendBeside.before(link);
        } else {
            appendBeside.after(link);
        }
        
        return link;
    };

    var toggleVisibility = function (toShow, toHide) {
        // For FLUID-2789: hide() doesn't work in Opera, so this check
        // uses a style to hide if the browser is Opera
        if (window.opera) { 
            toShow.show().removeClass("hideUploaderForOpera");
            toHide.show().addClass("hideUploaderForOpera");
        } else {
            toShow.show();
            toHide.hide();
        }
    };
    
    var defaultControlRenderer = function (that) {
        var degradeLink = renderLink(that.options.defaultRenderLocation,
                   that.options.strings.degradeLinkText,
                   that.options.styles.degradeLinkClass,
                   that.enhancedContainer);
        degradeLink.addClass("flc-manuallyDegrade-degrade");
        
        var enhanceLink = renderLink(that.options.defaultRenderLocation,
                   that.options.strings.enhanceLinkText,
                   that.options.styles.enhanceLinkClass,
                   that.degradedContainer);
        enhanceLink.addClass("flc-manuallyDegrade-enhance");
    };
    
    var fetchControls = function (that) {
        that.degradeControl = that.locate("degradeControl");
        that.enhanceControl = that.locate("enhanceControl");
    };
    
    var setupManuallyDegrade = function (that) {
        // If we don't have anything to degrade to, stop right here.
        if (!that.degradedContainer.length) {
            return;
        }
        
        // Render the controls if they're not already there.
        fetchControls(that);
        if (!that.degradeControl.length && !that.enhanceControl.length) {
            that.options.controlRenderer(that);
            fetchControls(that);
        }
        
        // Bind click handlers to them.
        that.degradeControl.click(that.degrade);
        that.enhanceControl.click(that.enhance);
        
        // Hide the enhance link to start.
        that.enhanceControl.hide();
    };
    
    var determineContainer = function (options) {
        var defaults = fluid.defaults("fluid.manuallyDegrade");
        return (options && options.container) ? options.container : defaults.container;
    };
    
    fluid.manuallyDegrade = function (component, options) {
        var container = determineContainer(options);

        var that = fluid.initView("fluid.manuallyDegrade", container, options);
        var isDegraded = false;
        that.enhancedContainer = component.container;
        that.degradedContainer = that.locate("enhanceable");
  
        
        that.degrade = function () {
            toggleVisibility(that.enhanceControl, that.degradeControl);
            toggleVisibility(that.degradedContainer, that.enhancedContainer);
	        isDegraded = true;
        };
         
	    that.enhance = function () {
            toggleVisibility(that.degradeControl, that.enhanceControl);
            toggleVisibility(that.enhancedContainer, that.degradedContainer);
	        isDegraded = false;
	    };
         
        that.isDegraded = function () {
	        return isDegraded;
	    };
         
        setupManuallyDegrade(that);
        return that;
    };
     
    fluid.defaults("fluid.manuallyDegrade", {
        container: "body",
        
        controlRenderer: defaultControlRenderer,
        
        defaultRenderLocation: "before",
        strings: {
            degradeLinkText: "Switch to the standard single-file Uploader",
            enhanceLinkText: "Switch to the Flash-based multi-file Uploader"
	    },
        selectors: {
            enhanceable: ".fl-ProgEnhance-basic",
            degradeControl: ".flc-manuallyDegrade-degrade",
            enhanceControl: ".flc-manuallyDegrade-enhance"
        },
        
        styles: {
            degradeLinkClass: "fl-uploader-manually-degrade",
            enhanceLinkClass: "fl-uploader-manually-enhance"
        }
	});

})(jQuery, fluid_1_1);
// =========================================================================
//
// tinyxmlsax.js - an XML SAX parser in JavaScript compressed for downloading
//
// version 3.1
//
// =========================================================================
//
// Copyright (C) 2000 - 2002, 2003 Michael Houghton (mike@idle.org), Raymond Irving and David Joham (djoham@yahoo.com)
//
// This library is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 2.1 of the License, or (at your option) any later version.

// This library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.

// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
//
// Visit the XML for <SCRIPT> home page at http://xmljs.sourceforge.net
//

/*
The zlib/libpng License

Copyright (c) 2000 - 2002, 2003 Michael Houghton (mike@idle.org), Raymond Irving and David Joham (djoham@yahoo.com)

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

    1. The origin of this software must not be misrepresented; you must not
    claim that you wrote the original software. If you use this software
    in a product, an acknowledgment in the product documentation would be
    appreciated but is not required.

    2. Altered source versions must be plainly marked as such, and must not be
    misrepresented as being the original software.

    3. This notice may not be removed or altered from any source
    distribution.
 */

var whitespace = "\n\r\t ";
// List of closed HTML tags, taken from JQuery 1.2.3
var closedTags = {
    abbr: true, br: true, col: true, img: true, input: true,
    link: true, meta: true, param: true, hr: true, area: true, embed:true
    };


XMLP = function(strXML) { 

    this.m_xml = strXML; 
    this.m_iP = 0;
    this.m_iState = XMLP._STATE_PROLOG; 
    this.m_stack = [];
    this.m_attributes = {};
    this.m_emitSynthetic = false; // state used for emitting synthetic tags used to correct broken markup (IE)
    };
        
XMLP._NONE = 0;
XMLP._ELM_B = 1;
XMLP._ELM_E = 2;
XMLP._ELM_EMP = 3; 
XMLP._ATT = 4;
XMLP._TEXT = 5;
XMLP._ENTITY = 6; 
XMLP._PI = 7;
XMLP._CDATA = 8;
XMLP._COMMENT = 9; 
XMLP._DTD = 10;
XMLP._ERROR = 11;
 
XMLP._CONT_XML = 0; 
XMLP._CONT_ALT = 1; 
XMLP._ATT_NAME = 0; 
XMLP._ATT_VAL = 1;

XMLP._STATE_PROLOG = 1;
XMLP._STATE_DOCUMENT = 2; 
XMLP._STATE_MISC = 3;

XMLP._errs = [];
XMLP._errs[XMLP.ERR_CLOSE_PI = 0 ] = "PI: missing closing sequence"; 
XMLP._errs[XMLP.ERR_CLOSE_DTD = 1 ] = "DTD: missing closing sequence"; 
XMLP._errs[XMLP.ERR_CLOSE_COMMENT = 2 ] = "Comment: missing closing sequence"; 
XMLP._errs[XMLP.ERR_CLOSE_CDATA = 3 ] = "CDATA: missing closing sequence"; 
XMLP._errs[XMLP.ERR_CLOSE_ELM = 4 ] = "Element: missing closing sequence"; 
XMLP._errs[XMLP.ERR_CLOSE_ENTITY = 5 ] = "Entity: missing closing sequence"; 
XMLP._errs[XMLP.ERR_PI_TARGET = 6 ] = "PI: target is required"; 
XMLP._errs[XMLP.ERR_ELM_EMPTY = 7 ] = "Element: cannot be both empty and closing"; 
XMLP._errs[XMLP.ERR_ELM_NAME = 8 ] = "Element: name must immediatly follow \"<\""; 
XMLP._errs[XMLP.ERR_ELM_LT_NAME = 9 ] = "Element: \"<\" not allowed in element names"; 
XMLP._errs[XMLP.ERR_ATT_VALUES = 10] = "Attribute: values are required and must be in quotes"; 
XMLP._errs[XMLP.ERR_ATT_LT_NAME = 11] = "Element: \"<\" not allowed in attribute names"; 
XMLP._errs[XMLP.ERR_ATT_LT_VALUE = 12] = "Attribute: \"<\" not allowed in attribute values"; 
XMLP._errs[XMLP.ERR_ATT_DUP = 13] = "Attribute: duplicate attributes not allowed"; 
XMLP._errs[XMLP.ERR_ENTITY_UNKNOWN = 14] = "Entity: unknown entity"; 
XMLP._errs[XMLP.ERR_INFINITELOOP = 15] = "Infinite loop"; 
XMLP._errs[XMLP.ERR_DOC_STRUCTURE = 16] = "Document: only comments, processing instructions, or whitespace allowed outside of document element"; 
XMLP._errs[XMLP.ERR_ELM_NESTING = 17] = "Element: must be nested correctly"; 

XMLP.prototype._checkStructure = function(iEvent) {
    var stack = this.m_stack; 
    if (XMLP._STATE_PROLOG == this.m_iState) {
        // disabled original check for text node in prologue
        this.m_iState = XMLP._STATE_DOCUMENT;
        }

    if (XMLP._STATE_DOCUMENT === this.m_iState) {
        if ((XMLP._ELM_B == iEvent) || (XMLP._ELM_EMP == iEvent)) { 
            this.m_stack[stack.length] = this.getName();
            }
        if ((XMLP._ELM_E == iEvent) || (XMLP._ELM_EMP == iEvent)) {
            if (stack.length === 0) {
                //return this._setErr(XMLP.ERR_DOC_STRUCTURE);
                return XMLP._NONE;
                }
            var strTop = stack[stack.length - 1];
            this.m_stack.length--;
            if (strTop === null || strTop !== this.getName()) { 
                return this._setErr(XMLP.ERR_ELM_NESTING);
                }
            }

        // disabled original check for text node in epilogue - "MISC" state is disused
    }
return iEvent;
};
    
    
XMLP.prototype.getColumnNumber = function() { 
    return SAXStrings.getColumnNumber(this.m_xml, this.m_iP);
    };
    
XMLP.prototype.getContent = function() { 
    return (this.m_cSrc == XMLP._CONT_XML) ? this.m_xml : this.m_cAlt;
    };
    
XMLP.prototype.getContentBegin = function() { return this.m_cB;};
XMLP.prototype.getContentEnd = function() { return this.m_cE;};

XMLP.prototype.getLineNumber = function() { 
    return SAXStrings.getLineNumber(this.m_xml, this.m_iP);
    };
    
XMLP.prototype.getName = function() { 
    return this.m_name;
    };
    
XMLP.prototype.next = function() { 
    return this._checkStructure(this._parse());
    };
    
XMLP.prototype._parse = function() {
    var iP = this.m_iP;
    var xml = this.m_xml; 
    if (iP === xml.length) { return XMLP._NONE;}
    var c = xml.charAt(iP);
    if (c === '<') {
        var c2 = xml.charAt(iP + 1);
        if (c2 === '?') {
            return this._parsePI (iP + 2);
            }
        else if (c2 === '!') {
            if (iP === xml.indexOf("<!DOCTYPE", iP)) { 
                return this._parseDTD (iP + 9);
                }
            else if (iP === xml.indexOf("<!--", iP)) { 
                return this._parseComment(iP + 4);
                }
            else if (iP === xml.indexOf("<![CDATA[", iP)) { 
                return this._parseCDATA (iP + 9);
                }
            }
        else {
            return this._parseElement(iP + 1);
            }
        }
    else {
        return this._parseText (iP);
        }
    };
    
var nameRegex = /([^\s>]+)/g;
var attrStartRegex = /\s*([\w:]+)/gm;
var attrValRegex = /\"([^\"]*)\"\s*/gm; // "normal" XHTML attribute values
var attrValIERegex = /([^\>\s]+)\s*/gm; // "stupid" unquoted IE attribute values (sometimes)
var closeRegex = /\s*<\//g;

XMLP.prototype._parseElement = function(iB) { 
    var iE, iDE, iRet; 
    var iType, strN, iLast; 
    iDE = iE = this.m_xml.indexOf(">", iB); 
    if (iE == -1) { 
        return this._setErr(XMLP.ERR_CLOSE_ELM);
        }
    if (this.m_xml.charAt(iB) == "/") { 
        iType = XMLP._ELM_E; 
        iB++;
        } 
    else { 
        iType = XMLP._ELM_B;
        }
    if (this.m_xml.charAt(iE - 1) == "/") { 
        if (iType == XMLP._ELM_E) { 
            return this._setErr(XMLP.ERR_ELM_EMPTY);
            }
        iType = XMLP._ELM_EMP; iDE--;
        }

    nameRegex.lastIndex = iB;
    var nameMatch = nameRegex.exec(this.m_xml);
    if (!nameMatch) {
        return this._setErr(XMLP.ERR_ELM_NAME);
        }
    strN = nameMatch[1].toLowerCase();
    // This branch is specially necessary for broken markup in IE. If we see an li
    // tag apparently directly nested in another, first emit a synthetic close tag
    // for the earlier one without advancing the pointer, and set a flag to ensure
    // doing this just once.
    if ("li" === strN && iType !== XMLP._ELM_E && this.m_stack.length > 0 && 
        this.m_stack[this.m_stack.length - 1] === "li" && !this.m_emitSynthetic) {
        this.m_name = "li";
        this.m_emitSynthetic = true;
        return XMLP._ELM_E;
    }
    // We have acquired the tag name, now set about parsing any attribute list
    this.m_attributes = {};
    this.m_cAlt = ""; 

    if (nameRegex.lastIndex < iDE) {
        this.m_iP = nameRegex.lastIndex;
        while (this.m_iP < iDE) {
            attrStartRegex.lastIndex = this.m_iP;
            var attrMatch = attrStartRegex.exec(this.m_xml);
            if (!attrMatch) {
                return this._setErr(XMLP.ERR_ATT_VALUES);
                }
            var attrname = attrMatch[1].toLowerCase();
            var attrval;
            if (this.m_xml.charCodeAt(attrStartRegex.lastIndex) === 61) { // = 
                var valRegex = this.m_xml.charCodeAt(attrStartRegex.lastIndex + 1) === 34? attrValRegex : attrValIERegex; // "
                valRegex.lastIndex = attrStartRegex.lastIndex + 1;
                attrMatch = valRegex.exec(this.m_xml);
                if (!attrMatch) {
                    return this._setErr(XMLP.ERR_ATT_VALUES);
                    }
                attrval = attrMatch[1];
                }
            else { // accommodate insanity on unvalued IE attributes
                attrval = attrname;
                valRegex = attrStartRegex;
                }
            if (!this.m_attributes[attrname]) {
                this.m_attributes[attrname] = attrval;
                }
            else { 
                return this._setErr(XMLP.ERR_ATT_DUP);
            }
            this.m_iP = valRegex.lastIndex;
                
            }
        }
    if (strN.indexOf("<") != -1) { 
        return this._setErr(XMLP.ERR_ELM_LT_NAME);
        }

    this.m_name = strN; 
    this.m_iP = iE + 1;
    // Check for corrupted "closed tags" from innerHTML
    if (closedTags[strN]) {
        closeRegex.lastIndex = iE + 1;
        var closeMatch = closeRegex.exec;
        if (closeMatch) {
            var matchclose = this.m_xml.indexOf(strN, closeMatch.lastIndex);
            if (matchclose === closeMatch.lastIndex) {
                return iType; // bail out, a valid close tag is separated only by whitespace
            }
            else {
                return XMLP._ELM_EMP;
            }
        }
    }
    this.m_emitSynthetic = false;
    return iType;
    };
    
XMLP.prototype._parseCDATA = function(iB) { 
    var iE = this.m_xml.indexOf("]]>", iB); 
    if (iE == -1) { return this._setErr(XMLP.ERR_CLOSE_CDATA);}
    this._setContent(XMLP._CONT_XML, iB, iE); 
    this.m_iP = iE + 3; 
    return XMLP._CDATA;
    };
    
XMLP.prototype._parseComment = function(iB) { 
    var iE = this.m_xml.indexOf("-" + "->", iB); 
    if (iE == -1) { 
        return this._setErr(XMLP.ERR_CLOSE_COMMENT);
        }
    this._setContent(XMLP._CONT_XML, iB - 4, iE + 3); 
    this.m_iP = iE + 3; 
    return XMLP._COMMENT;
    };
    
XMLP.prototype._parseDTD = function(iB) { 
    var iE, strClose, iInt, iLast; 
    iE = this.m_xml.indexOf(">", iB); 
    if (iE == -1) { 
        return this._setErr(XMLP.ERR_CLOSE_DTD);
        }
    iInt = this.m_xml.indexOf("[", iB); 
    strClose = ((iInt != -1) && (iInt < iE)) ? "]>" : ">"; 
    while (true) { 
        if (iE == iLast) { 
            return this._setErr(XMLP.ERR_INFINITELOOP);
            }
        iLast = iE; 
        iE = this.m_xml.indexOf(strClose, iB); 
        if(iE == -1) { 
            return this._setErr(XMLP.ERR_CLOSE_DTD);
            }
        if (this.m_xml.substring(iE - 1, iE + 2) != "]]>") { break;}
        }
    this.m_iP = iE + strClose.length; 
    return XMLP._DTD;
    };
    
XMLP.prototype._parsePI = function(iB) { 
    var iE, iTB, iTE, iCB, iCE; 
    iE = this.m_xml.indexOf("?>", iB); 
    if (iE == -1) { return this._setErr(XMLP.ERR_CLOSE_PI);}
    iTB = SAXStrings.indexOfNonWhitespace(this.m_xml, iB, iE); 
    if (iTB == -1) { return this._setErr(XMLP.ERR_PI_TARGET);}
    iTE = SAXStrings.indexOfWhitespace(this.m_xml, iTB, iE); 
    if (iTE == -1) { iTE = iE;}
    iCB = SAXStrings.indexOfNonWhitespace(this.m_xml, iTE, iE); 
    if (iCB == -1) { iCB = iE;}
    iCE = SAXStrings.lastIndexOfNonWhitespace(this.m_xml, iCB, iE); 
    if (iCE == -1) { iCE = iE - 1;}
    this.m_name = this.m_xml.substring(iTB, iTE); 
    this._setContent(XMLP._CONT_XML, iCB, iCE + 1); 
    this.m_iP = iE + 2; 
    return XMLP._PI;
    };
    
XMLP.prototype._parseText = function(iB) { 
    var iE = this.m_xml.indexOf("<", iB);
    if (iE == -1) { iE = this.m_xml.length;}
    this._setContent(XMLP._CONT_XML, iB, iE); 
    this.m_iP = iE; 
    return XMLP._TEXT;
    };
    
XMLP.prototype._setContent = function(iSrc) { 
    var args = arguments; 
    if (XMLP._CONT_XML == iSrc) { 
        this.m_cAlt = null; 
        this.m_cB = args[1]; 
        this.m_cE = args[2];
        } 
    else { 
        this.m_cAlt = args[1]; 
        this.m_cB = 0; 
        this.m_cE = args[1].length;
        }
        
    this.m_cSrc = iSrc;
    };
    
XMLP.prototype._setErr = 
    function(iErr) { 
    var strErr = XMLP._errs[iErr]; 
    this.m_cAlt = strErr; 
    this.m_cB = 0; 
    this.m_cE = strErr.length; 
    this.m_cSrc = XMLP._CONT_ALT; 
    return XMLP._ERROR;
    };
    


SAXStrings = {};

SAXStrings.WHITESPACE = " \t\n\r"; 
SAXStrings.QUOTES = "\"'"; 
SAXStrings.getColumnNumber = function (strD, iP) { 
    if (!strD) { return -1;}
    iP = iP || strD.length; 
    var arrD = strD.substring(0, iP).split("\n"); 
    arrD.length--; 
    var iLinePos = arrD.join("\n").length; 
    return iP - iLinePos;
    };
    
SAXStrings.getLineNumber = function (strD, iP) { 
    if (!strD) { return -1;}
    iP = iP || strD.length; 
    return strD.substring(0, iP).split("\n").length;
    };
    
SAXStrings.indexOfNonWhitespace = function (strD, iB, iE) {
    if (!strD) return -1;
    iB = iB || 0; 
    iE = iE || strD.length; 
    
    for (var i = iB; i < iE; ++ i) { 
        var c = strD.charAt(i);
        if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') return i;
        }
    return -1;
    };
    
    
SAXStrings.indexOfWhitespace = function (strD, iB, iE) { 
    if (!strD) { return -1;}
        iB = iB || 0; 
        iE = iE || strD.length; 
        for (var i = iB; i < iE; i++) { 
            if (SAXStrings.WHITESPACE.indexOf(strD.charAt(i)) != -1) { return i;}
        }
    return -1;
    };
    
    
SAXStrings.lastIndexOfNonWhitespace = function (strD, iB, iE) { 
        if (!strD) { return -1;}
        iB = iB || 0; iE = iE || strD.length; 
        for (var i = iE - 1; i >= iB; i--) { 
        if (SAXStrings.WHITESPACE.indexOf(strD.charAt(i)) == -1) { 
            return i;
            }
        }
    return -1;
    };
    
SAXStrings.replace = function(strD, iB, iE, strF, strR) { 
    if (!strD) { return "";}
    iB = iB || 0; 
    iE = iE || strD.length; 
    return strD.substring(iB, iE).split(strF).join(strR);
    };

function __unescapeString(str) {
    return str.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"").replace(/&apos;/g, "'");
    }
    
function __escapeString(str) { var escAmpRegEx = /&/g; var escLtRegEx = /</g; var escGtRegEx = />/g; var quotRegEx = /"/g;
    var aposRegEx = /'/g;

    str = str.replace(escAmpRegEx, "&amp;");
    str = str.replace(escLtRegEx, "&lt;");
    str = str.replace(escGtRegEx, "&gt;");
    str = str.replace(quotRegEx, "&quot;");
    str = str.replace(aposRegEx, "&apos;");

    return str;
    }

/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
  
   // Since Javascript is not multi-threaded, these working variables may be shared 
   // during a template parse
  var t;
  var parser;
  var tagstack;
  var lumpindex = 0;
  var nestingdepth = 0;
  var justended = false;
  
  var defstart = -1;
  var defend = -1;   
  
  var baseURL;
  
  var debugMode = false;
  
  var cutpoints = []; // list of selector, tree, id
  
  var cutstatus = [];
  
  function init(baseURLin, debugModeIn, cutpointsIn) {
    t.rootlump = fluid.XMLLump(0, -1);
    tagstack = [t.rootlump];
    lumpindex = 0;
    nestingdepth = 0;
    justended = false;
    defstart = -1;
    defend = -1;
    baseURL = baseURLin;
    debugMode = debugModeIn;
    cutpoints = cutpointsIn;
    if (cutpoints) {
      for (var i = 0; i < cutpoints.length; ++ i) {
        cutstatus[i] = [];
        cutpoints[i].tree = fluid.parseSelector(cutpoints[i].selector);
        }
      }
    }
  
  function findTopContainer() {
    for (var i = tagstack.length - 1; i >= 0; --i ) {
      var lump = tagstack[i];
      if (lump.rsfID !== undefined) {
        return lump;
      }
    }
    return t.rootlump;
  }
  
  function newLump() {
      var togo = fluid.XMLLump(lumpindex, nestingdepth);
      if (debugMode) {
          togo.line = parser.getLineNumber();
          togo.column = parser.getColumnNumber();
      }
      //togo.parent = t;
      t.lumps[lumpindex] = togo;
      ++lumpindex;
      return togo;
  }
  
  function addLump(mmap, ID, lump) {
      var list = mmap[ID];
          if (!list) {
              list = [];
              mmap[ID] = list;
          }
          list[list.length] = lump;
      }
    
  function checkContribute(ID, lump) {
      if (ID.indexOf("scr=contribute-") !== -1) {
          var scr = ID.substring("scr=contribute-".length);
          addLump(t.collectmap, scr, lump);
          }
      }
  
  /* parseUri 1.2; MIT License
   By Steven Levithan <http://stevenlevithan.com> 
   http://blog.stevenlevithan.com/archives/parseuri
   */
   var parseUri = function (source) {
      var o = parseUri.options,
         value = o.parser[o.strictMode ? "strict" : "loose"].exec(source);
      
      for (var i = 0, uri = {}; i < 14; i++) {
         uri[o.key[i]] = value[i] || "";
      }
      
      uri[o.q.name] = {};
      uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
         if ($1) {
             uri[o.q.name][$1] = $2;
         }
      });
      
      return uri;
   };
   
   parseUri.options = {
       strictMode: false,
       key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
       q: {
           name: "queryKey",
           parser: /(?:^|&)([^&=]*)=?([^&]*)/g
       },
       parser: {
           strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
           loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
       }
   };
  
  function rewriteUrl(url) {
      var po = parseUri(url);
      if (po.protocol || url.charAt(0) === '/') {
          return url;
      }
      else {
          return baseURL + url;
      }
  }
  
  fluid.debugLump = function(lump) {
     var togo = lump.text;
     togo += " at ";
     togo += "lump line " + lump.line + " column " + lump.column +" index " + lump.lumpindex;
     togo += parent.href === null? "" : " in file " + parent.href;
     return togo;
  };
  
  function debugLump(lump) {
  // TODO expand this to agree with the Firebug "self-selector" idiom
    return "<" + lump.tagname + ">";
    }
  
  function hasCssClass(clazz, totest) {
    if (!totest) {
        return false;
    }
    // algorithm from JQuery
    return (" " + totest + " ").indexOf(" " + clazz + " ") !== -1;
    }
  
  function matchNode(term, headlump) {
    if (term.predList) {
      for (var i = 0; i < term.predList.length; ++ i) {
        var pred = term.predList[i];
        if (pred.id && headlump.attributemap.id !== pred.id) {return false;}
        if (pred.clazz && !hasCssClass(pred.clazz, headlump.attributemap["class"])) {return false;}
        if (pred.tag && headlump.tagname !== pred.tag) {return false;}
        }
      return true;
      }
    }
  
  function tagStartCut(headlump) {
    var togo = undefined;
    if (cutpoints) {
      for (var i = 0; i < cutpoints.length; ++ i) {
        var cut = cutpoints[i];
        var cutstat = cutstatus[i];
        var nextterm = cutstat.length; // the next term for this node
        if (nextterm < cut.tree.length) {
          var term = cut.tree[nextterm];
          if (nextterm > 0) {
            if (cut.tree[nextterm - 1].child && 
              cutstat[nextterm - 1] !== headlump.nestingdepth - 1) {
              continue; // it is a failure to match if not at correct nesting depth 
              }
            }
          var isMatch = matchNode(term, headlump);
          if (isMatch) {
            cutstat[cutstat.length] = headlump.nestingdepth;
            if (cutstat.length === cut.tree.length) {
              if (togo !== undefined) {
                fluid.fail("Cutpoint specification error - node " +
                  debugLump(headlump) +
                  " has already matched with rsf:id of " + togo);
                }
              if (cut.id === undefined || cut.id === null) {
                  fluid.fail("Error in cutpoints list - entry at position " + i + " does not have an id set");
              }
              togo = cut.id;
              }
            }
          }
        }
      }
    return togo;
    }
    
  function tagEndCut() {
    if (cutpoints) {
      for (var i = 0; i < cutpoints.length; ++ i) {
        var cutstat = cutstatus[i];
        if (cutstat.length > 0 && cutstat[cutstat.length - 1] === nestingdepth) {
          cutstat.length--;
          }
        }
      }
    }
  
  function processTagStart(isempty, text) {
    ++nestingdepth;
    if (justended) {
      justended = false;
      var backlump = newLump();
      backlump.nestingdepth--;
    }
    if (t.firstdocumentindex === -1) {
      t.firstdocumentindex = lumpindex;
    }
    var headlump = newLump();
    var stacktop = tagstack[tagstack.length - 1];
    headlump.uplump = stacktop;
    var tagname = parser.getName();
    headlump.tagname = tagname;
    // NB - attribute names and values are now NOT DECODED!!
    var attrs = headlump.attributemap = parser.m_attributes;
    var ID = attrs[fluid.ID_ATTRIBUTE];
    if (ID === undefined) {
      ID = tagStartCut(headlump);
      }
    for (var attrname in attrs) {
      var attrval = attrs[attrname];
      if (/href|src|codebase|action/.test(attrname)) {
        attrval = rewriteUrl(attrval);
        attrs[attrname] = attrval;
        }
        // port of TPI effect of IDRelationRewriter
      else if (ID === undefined && /for|headers/.test(attrname)) {
        ID = attrs[fluid.ID_ATTRIBUTE] = "scr=null";
        }
      }

    if (ID) {
      // TODO: ensure this logic is correct on RSF Server
      if (ID.charCodeAt(0) === 126) { // "~"
        ID = ID.substring(1);
        headlump.elide = true;
      }
      checkContribute(ID, headlump);
      headlump.rsfID = ID;
      var downreg = findTopContainer();
      if (!downreg.downmap) {
        downreg.downmap = {};
        }
      addLump(downreg.downmap, ID, headlump);
      addLump(t.globalmap, ID, headlump);
      var colpos = ID.indexOf(":");
      if (colpos !== -1) {
      var prefix = ID.substring(0, colpos);
      if (!stacktop.finallump) {
        stacktop.finallump = {};
        }
      stacktop.finallump[prefix] = headlump;
      }
    }
    
    // TODO: accelerate this by grabbing original template text (requires parser
    // adjustment) as well as dealing with empty tags
    headlump.text = "<" + tagname + fluid.dumpAttributes(attrs) + ">";
    tagstack[tagstack.length] = headlump;
    if (isempty) {
      processTagEnd();
    }
  }
  
  function processTagEnd() {
    tagEndCut();
    var endlump = newLump();
    --nestingdepth;
    endlump.text = "</" + parser.getName() + ">";
    var oldtop = tagstack[tagstack.length - 1];
    oldtop.close_tag = t.lumps[lumpindex - 1];
    tagstack.length --;
    justended = true;
  }
  
  function processDefaultTag() {
    if (defstart !== -1) {
      if (t.firstdocumentindex === -1) {
        t.firstdocumentindex = lumpindex;
        }
      var text = parser.getContent().substr(defstart, defend - defstart);
      justended = false;
      var newlump = newLump();
      newlump.text = text; 
      defstart = -1;
    }
  }
  // Public definitions begin here
  
  fluid.ID_ATTRIBUTE = "rsf:id";
  
  fluid.getPrefix = function(id) {
   var colpos = id.indexOf(':');
   return colpos === -1? id : id.substring(0, colpos);
   };
  
  fluid.SplitID = function(id) {
    var that = {};
    var colpos = id.indexOf(':');
    if (colpos === -1) {
      that.prefix = id;
      }
    else {
      that.prefix = id.substring(0, colpos);
      that.suffix = id.substring(colpos + 1);
     }
     return that;
  };
  fluid.XMLLump = function (lumpindex, nestingdepth) {
    return {
      //rsfID: "",
      //text: "",
      //downmap: {},
      //attributemap: {},
      //finallump: {},
      nestingdepth: nestingdepth,
      lumpindex: lumpindex,
      parent: t
    };
  };
  
  fluid.XMLViewTemplate = function() {
    return {
      globalmap: {},
      collectmap: {},
      lumps: [],
      firstdocumentindex: -1
    };
  };
  
  /** Accepts a hash of structures with free keys, where each entry has either
   * href or nodeId set - on completion, callback will be called with the populated
   * structure with fetched resource text in the field "resourceText" for each
   * entry.
   */
  fluid.fetchResources = function(resourceSpecs, callback) {
    var resourceCallback = function (thisSpec) {
      return {
        success: function(response) {
          thisSpec.resourceText = response;
          thisSpec.resourceKey = thisSpec.href;
          thisSpec.queued = false; 
          fluid.fetchResources(resourceSpecs, callback);
          },
        error: function(response, textStatus, errorThrown) {
          thisSpec.fetchError = {
            status: response.status,
            textStatus: textStatus,
            errorThrown: errorThrown
          }
        }
          
        };
      };
    
    var complete = true;
    for (var key in resourceSpecs) {
      var resourceSpec = resourceSpecs[key];
      if (resourceSpec.href && !resourceSpec.resourceText) {
         if (!resourceSpec.queued) {
           var thisCallback = resourceCallback(resourceSpec);
           $.ajax({url: resourceSpec.href, success: thisCallback.success, error: thisCallback.error});
           resourceSpec.queued = true;
         }
         complete = false;             
        }
      else if (resourceSpec.nodeId && !resourceSpec.resourceText) {
        var node = document.getElementById(resourceSpec.nodeId);
        // upgrade this to somehow detect whether node is "armoured" somehow
        // with comment or CDATA wrapping
        resourceSpec.resourceText = fluid.dom.getElementText(node);
        resourceSpec.resourceKey = resourceSpec.nodeId;
      }
    }
    if (complete) {
      if ($.browser.mozilla) {
      // Defer this callback to avoid debugging problems on Firefox
      setTimeout(function() {
              callback(resourceSpecs);
          }, 1);
      }
      else {
          callback(resourceSpecs)
      }
    }
  };
  
    // TODO: find faster encoder
  fluid.XMLEncode = function (text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); 
    };
  
  fluid.dumpAttributes = function(attrcopy) {
    var togo = "";
    for (var attrname in attrcopy) {
      var attrvalue = attrcopy[attrname];
      if (attrvalue !== null && attrvalue !== undefined) {
          togo += " " + attrname + "=\"" + attrvalue + "\"";
          }
      }
    return togo;
    };
  
  fluid.aggregateMMap = function (target, source) {
    for (var key in source) {
      var targhas = target[key];
      if (!targhas) {
        target[key] = [];
      }
      target[key] = target[key].concat(source[key]);
    }
  };
  
  var unUnicode = /(\\u[\dabcdef]{4}|\\x[\dabcdef]{2})/g;
  
  fluid.unescapeProperties = function (string) {
    string = string.replace(unUnicode, function(match) {
      var code = match.substring(2);
      var parsed = parseInt(code, 16);
      return String.fromCharCode(parsed);
      }
    );
    var pos = 0;
    while (true) {
        var backpos = string.indexOf("\\", pos);
        if (backpos === -1) {
            break;
        }
        if (backpos === string.length - 1) {
          return [string.substring(0, string.length - 1), true];
        }
        var replace = string.charAt(backpos + 1);
        if (replace === "n") replace = "\n";
        if (replace === "r") replace = "\r";
        if (replace === "t") replace = "\t";
        string = string.substring(0, backpos) + replace + string.substring(backpos + 2);
        pos = backpos + 1;
    }
    return [string, false];
  };
  
  var breakPos = /[^\\][\s:=]/;
  fluid.parseJavaProperties = function(text) {
    // File format described at http://java.sun.com/javase/6/docs/api/java/util/Properties.html#load(java.io.Reader)
    var togo = {};
    text = text.replace(/\r\n/g, "\n");
    text = text.replace(/\r/g, "\n");
    lines = text.split("\n");
    var contin, key, valueComp, valueRaw, valueEsc;
    for (var i = 0; i < lines.length; ++ i) {
      var line = $.trim(lines[i]);
      if (!line || line.charAt(0) === "#" || line.charAt(0) === '!') {
          continue;
      }
      if (!contin) {
        valueComp = "";
        var breakpos = line.search(breakPos);
        if (breakpos === -1) {
          key = line;
          valueRaw = "";
          }
        else {
          key = $.trim(line.substring(0, breakpos + 1)); // +1 since first char is escape exclusion
          valueRaw = $.trim(line.substring(breakpos + 2));
          if (valueRaw.charAt(0) === ":" || valueRaw.charAt(0) === "=") {
            valueRaw = $.trim(valueRaw.substring(1));
          }
        }
      
        key = fluid.unescapeProperties(key)[0];
        valueEsc = fluid.unescapeProperties(valueRaw);
      }
      else {
        valueEsc = fluid.unescapeProperties(line);
      }

      contin = valueEsc[1];
      if (!valueEsc[1]) { // this line was not a continuation line - store the value
        togo[key] = valueComp + valueEsc[0];
      }
      else {
        valueComp += valueEsc[0];
      }
    }
    return togo;
  };
  
  /** Returns a "template structure", with globalmap in the root, and a list
   * of entries {href, template, cutpoints} for each parsed template.
   */
  fluid.parseTemplates = function(resourceSpec, templateList, opts) {
    var togo = [];
    togo.globalmap = {};
    for (var i = 0; i < templateList.length; ++ i) {
      var resource = resourceSpec[templateList[i]];
      var lastslash = resource.href.lastIndexOf("/");
      var baseURL = lastslash === -1? "" : resource.href.substring(0, lastslash + 1);
        
        var template = fluid.parseTemplate(resource.resourceText, baseURL, 
          opts.scanStart && i === 0, resource.cutpoints, opts);
        if (i === 0) {
          fluid.aggregateMMap(togo.globalmap, template.globalmap);
        }
        template.href = resource.href;
        template.baseURL = baseURL;
        template.resourceKey = resource.resourceKey;

        togo[i] = template;
        fluid.aggregateMMap(togo.globalmap, template.rootlump.downmap);
      }
      return togo;
    };
  
  fluid.parseTemplate = function(template, baseURL, scanStart, cutpoints_in, opts) {
    t = fluid.XMLViewTemplate();
    opts = opts || {};
    
    init(baseURL, opts.debugMode, cutpoints_in);

    var idpos = template.indexOf(fluid.ID_ATTRIBUTE);
    if (scanStart) {
      var brackpos = template.indexOf('>', idpos);
      parser = new XMLP(template.substring(brackpos + 1));
    }
    else {
      parser = new XMLP(template); 
      }

    parseloop: while(true) {
      var iEvent = parser.next();
//        if (iEvent === XMLP._NONE) break parseloop;
//        continue;
     
      switch(iEvent) {
        case XMLP._ELM_B:
          processDefaultTag();
          //var text = parser.getContent().substr(parser.getContentBegin(), parser.getContentEnd() - parser.getContentBegin());
          processTagStart(false, "");
          break;
        case XMLP._ELM_E:
          processDefaultTag();
          processTagEnd();
          break;
        case XMLP._ELM_EMP:
          processDefaultTag();
          //var text = parser.getContent().substr(parser.getContentBegin(), parser.getContentEnd() - parser.getContentBegin());    
          processTagStart(true, "");
          break;
        case XMLP._PI:
        case XMLP._DTD:
          defstart = -1;
          continue; // not interested in reproducing these
        case XMLP._TEXT:
        case XMLP._ENTITY:
        case XMLP._CDATA:
        case XMLP._COMMENT:
          if (defstart === -1) {
            defstart = parser.m_cB;
            }
          defend = parser.m_cE;
          break;
        case XMLP._ERROR:
          fluid.setLogging(true);
          var message = "Error parsing template: " + parser.m_cAlt + 
          " at line " + parser.getLineNumber(); 
          fluid.log(message);
          fluid.log("Just read: " + parser.m_xml.substring(parser.m_iP - 30, parser.m_iP));
          fluid.log("Still to read: " + parser.m_xml.substring(parser.m_iP, parser.m_iP + 30));
          fluid.fail(message);
          break parseloop;
        case XMLP._NONE:
          break parseloop;
        }
      }
    return t;
//       alert("document complete: " + chars.length + " chars");
  
    };
    
  // ******* SELECTOR ENGINE *********  
    
  // selector regexps copied from JQuery
  var chars = "(?:[\\w\u0128-\uFFFF*_-]|\\\\.)";
  var quickChild = new RegExp("^>\\s*(" + chars + "+)");
  var quickID = new RegExp("^(" + chars + "+)(#)(" + chars + "+)");
  var selSeg = new RegExp("^\s*([#.]?)(" + chars + "*)");

  var quickClass = new RegExp("([#.]?)(" + chars + "+)", "g");
  var childSeg = new RegExp("\\s*(>)?\\s*", "g");
  var whiteSpace = new RegExp("^\\w*$");

  fluid.parseSelector = function(selstring) {
    var togo = [];
    selstring = $.trim(selstring);
    //ws-(ss*)[ws/>]
    quickClass.lastIndex = 0;
    var lastIndex = 0;
    while (true) {
      var atNode = []; // a list of predicates at a particular node
      while (true) {
        var segMatch = quickClass.exec(selstring);
        if (!segMatch || segMatch.index !== lastIndex) {
          break;
          }
        var thisNode = {};
        var text = segMatch[2];
        if (segMatch[1] === "") {
          thisNode.tag = text;
        }
        else if (segMatch[1] === "#"){
          thisNode.id = text;
          }
        else if (segMatch[1] === ".") {
          thisNode.clazz = text;
          }
        atNode[atNode.length] = thisNode;
        lastIndex = quickClass.lastIndex;
        }
      childSeg.lastIndex = lastIndex;
      var fullAtNode = {predList: atNode};
      var childMatch = childSeg.exec(selstring);
      if (!childMatch || childMatch.index !== lastIndex) {
        var remainder = selstring.substring(lastIndex);
        fluid.fail("Error in selector string - can not match child selector expression at " + remainder);
        }
      if (childMatch[1] === ">") {
        fullAtNode.child = true;
        }
      togo[togo.length] = fullAtNode;
      // >= test here to compensate for IE bug http://blog.stevenlevithan.com/archives/exec-bugs
      if (childSeg.lastIndex >= selstring.length) {
        break;
        }
      lastIndex = childSeg.lastIndex;
      quickClass.lastIndex = childSeg.lastIndex; 
      }
    return togo;
    };
    
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
  
  function debugPosition(component) {
     return "as child of " + (component.parent.fullID? "component with full ID " + component.parent.fullID : "root");
  }
  
  function computeFullID(component) {
    var togo = "";
    var move = component;
    if (component.children === undefined) { // not a container
      // unusual case on the client-side, since a repetitive leaf may have localID blasted onto it.
      togo = component.ID + (component.localID !== undefined? component.localID : "");
      move = component.parent;
      }
    while (move.parent) {
      var parent = move.parent;
      if (move.fullID !== undefined) {
        togo = move.fullID + togo;
        return togo;
        }
      if (move.noID === undefined) {
        var ID = move.ID;
        if (ID === undefined) {
          fluid.fail("Error in component tree - component found with no ID " +
              debugPosition(parent) + ": please check structure");
        }
        var colpos = ID.indexOf(":");        
        var prefix = colpos === -1? ID : ID.substring(0, colpos);
        togo = prefix + ":" + (move.localID === undefined ? "" : move.localID) + ":" + togo;
      }
      move = parent;
    }
    return togo;
  }
  
  function isBoundPrimitive(value) {
      return fluid.isPrimitive(value) || value instanceof Array 
             && (value.length === 0 || typeof(value[0]) === "string");
  }
  
  function processChild(value, key) {
      if (isBoundPrimitive(value)) {
          return {componentType: "UIBound", value: value, ID: key};
          }
      else {
          var unzip = unzipComponent(value);
          if (unzip.ID) {
              return {ID: key, componentType: "UIContainer", children: [unzip]};
          }
          else {
              unzip.ID = key;
              return unzip;
          } 
      }    
  }
  
  function fixChildren(children) {
      if (!(children instanceof Array)) {
          var togo = [];
          for (var key in children) {
              var value = children[key];
              if (value instanceof Array) {
                  for (var i = 0; i < value.length; ++ i) {
                      var processed = processChild(value[i], key);
          //            if (processed.componentType === "UIContainer" &&
          //              processed.localID === undefined) {
          //              processed.localID = i;
          //            }
                      togo[togo.length] = processed;
                      }
                }
                else {
                    togo[togo.length] = processChild(value, key);
                } 
            }
            return togo;
        }
        else {return children;}
    }
  
  function fixupValue(uibound, model) {
      if (uibound.value === undefined && uibound.valuebinding !== undefined) {
          if (!model) {
              fluid.fail("Cannot perform value fixup for valuebinding " 
                + uibound.valuebinding + " since no model was supplied to rendering");
          }
          uibound.value = fluid.model.getBeanValue(model, uibound.valuebinding);
      }
  }
  
  function upgradeBound(holder, property, model) {
      if (holder[property] !== undefined) {
          if (isBoundPrimitive(holder[property])) {
              holder[property] = {value: holder[property]};
          }
      }
      else {
          holder[property] = {value: null};
      }
      fixupValue(holder[property], model);
  }
  
  var duckMap = {children: "UIContainer", 
        value: "UIBound", valuebinding: "UIBound", messagekey: "UIMessage", 
        markup: "UIVerbatim", selection: "UISelect", target: "UILink",
        choiceindex: "UISelectChoice", functionname: "UIInitBlock"};
  
  function unzipComponent(component, model) {
      if (component) {
          for (var key in duckMap) {
              if (component[key] !== undefined) {
                  component.componentType = duckMap[key];
                  break;
              }
          }
          if (component.componentType === undefined && component.ID !== undefined) {
              component.componentType = "UIBound";
          }
      }
      if (!component || component.componentType === undefined) {
          var decorators = component.decorators;
          if (decorators) {delete component.decorators;}
          component = {componentType: "UIContainer", children: component};
          component.decorators = decorators;
      }
      var cType = component.componentType;
      if (cType === "UIContainer") {
          component.children = fixChildren(component.children);
      }
      else if (cType === "UISelect") {
          upgradeBound(component, "selection", model);
          upgradeBound(component, "optionlist", model);
          upgradeBound(component, "optionnames", model);
      }
      else if (cType === "UILink") {
          upgradeBound(component, "target", model);
          upgradeBound(component, "linktext", model);
      }
      
      return component;
  }
  
  // When a component
  function assignSubmittingName(component, defaultname) {
      if (component.submittingname === undefined && component.willinput !== false) {
          component.submittingname = defaultname? defaultname: component.fullID;
      }
      return component.submittingname;
  }
  
  function fixupTree(tree, model) {
    if (tree.componentType === undefined) {
      tree = unzipComponent(tree, model);
      }
    if (tree.componentType !== "UIContainer" && !tree.parent) {
      tree = {children: [tree]};
    }
    
    if (tree.children) {
       tree.childmap = {};
      for (var i = 0; i < tree.children.length; ++ i) {
        var child = tree.children[i];
        if (child.componentType === undefined) {
          child = unzipComponent(child, model);
          tree.children[i] = child;
          }
        child.parent = tree;
        if (child.ID === undefined) {
           fluid.fail("Error in component tree: component found with no ID " + debugPosition(child));
        }
        tree.childmap[child.ID] = child;
        var colpos = child.ID.indexOf(":"); 
        if (colpos === -1) {
        //  tree.childmap[child.ID] = child; // moved out of branch to allow
        // "relative id expressions" to be easily parsed
        }
        else {
          var prefix = child.ID.substring(0, colpos);
          var childlist = tree.childmap[prefix]; 
          if (!childlist) {
            childlist = [];
            tree.childmap[prefix] = childlist;
          }
          if (child.localID === undefined && childlist.length !== 0) {
              child.localID = childlist.length;
          }
          childlist[childlist.length] = child;
        }
        child.fullID = computeFullID(child);

        var componentType = child.componentType;
        if (componentType == "UISelect") {
          child.selection.fullID = child.fullID + "-selection";
        }
        else if (componentType == "UIInitBlock") {
          var call = child.functionname + '(';
          for (var j = 0; j < child.arguments.length; ++ j) {
            if (child.arguments[j] instanceof fluid.ComponentReference) {
              // TODO: support more forms of id reference
              child.arguments[j] = child.parent.fullID + child.arguments[j].reference;
            }
            call += '"' + child.arguments[j] + '"'; 
            if (j < child.arguments.length - 1) {
              call += ", ";
            }
          }
          child.markup = call + ")\n";
          child.componentType = "UIVerbatim";
          }
        else if (componentType == "UIBound") {
            fixupValue(child, model);
            }
        fixupTree(child, model);
        }
      }
    return tree;
    }
  // private renderer state variables, stored in this outer closure location to reduce argument
  // parsing. Renderer is non-reentrant.
  var globalmap = {};
  var branchmap = {};
  var rewritemap = {}; // map of rewritekey (for original id in template) to full ID 
  var seenset = {};
  var collected = {};
  var out = "";
  var debugMode = false;
  var directFossils = {}; // map of submittingname to {EL, submittingname, oldvalue}
  var renderOptions = {};
  var decoratorQueue = [];
  
  var renderedbindings = {}; // map of fullID to true for UISelects which have already had bindings written
  
  function getRewriteKey(template, parent, id) {
      return template.resourceKey + parent.fullID + id;
  }
  // returns: lump
  function resolveInScope(searchID, defprefix, scope, child) {
      var deflump;
      var scopelook = scope? scope[searchID] : null;
      if (scopelook) {
          for (var i = 0; i < scopelook.length; ++ i) {
              var scopelump = scopelook[i];
              if (!deflump && scopelump.rsfID == defprefix) {
                  deflump = scopelump;
              }
              if (scopelump.rsfID == searchID) {
                  return scopelump;
              }
          }
      }
      return deflump;
  }
  // returns: lump
  function resolveCall(sourcescope, child) {
      var searchID = child.jointID? child.jointID : child.ID;
      var split = fluid.SplitID(searchID);
      var defprefix = split.prefix + ':';
      var match = resolveInScope(searchID, defprefix, sourcescope.downmap, child);
      if (match) {return match;}
      if (child.children) {
          match = resolveInScope(searchID, defprefix, globalmap, child);
          if (match) {return match;}
      }
      return null;
  }
  
  function noteCollected(template) {
      if (!seenset[template.href]) {
          fluid.aggregateMMap(collected, template.collectmap);
          seenset[template.href] = true;
      }
  }
  
  function resolveRecurse(basecontainer, parentlump) {
    for (var i = 0; i < basecontainer.children.length; ++ i) {
      var branch = basecontainer.children[i];
      if (branch.children) { // it is a branch
        var resolved = resolveCall(parentlump, branch);
        if (resolved) {
          branchmap[branch.fullID] = resolved;
          var id = resolved.attributemap.id;
          if (id !== undefined) {
            rewritemap[getRewriteKey(parentlump.parent, basecontainer, id)] = branch.fullID;
          }
          // on server-side this is done separately
          noteCollected(resolved.parent);
          resolveRecurse(branch, resolved);
        }
      }
    }
    // collect any rewritten ids for the purpose of later rewriting
    if (parentlump.downmap) {
      for (var id in parentlump.downmap) {
        //if (id.indexOf(":") === -1) {
          var lumps = parentlump.downmap[id];
          for (var i = 0; i < lumps.length; ++ i) {
            var lump = lumps[i];
            var lumpid = lump.attributemap.id;
            if (lumpid !== undefined && lump.rsfID !== undefined) {
              var resolved = fetchComponent(basecontainer, lump.rsfID);
              if (resolved !== null) {
                var resolveID = resolved.fullID;
                if (resolved.componentType === "UISelect") {
                  resolveID = resolveID + "-selection";
                }
                rewritemap[getRewriteKey(parentlump.parent, basecontainer,
                    lumpid)] = resolveID;
              }
            }
          }
      //  }
      } 
    }
      
  }
  
  function resolveBranches(globalmapp, basecontainer, parentlump) {
      branchmap = {};
      rewritemap = {};
      seenset = {};
      collected = {};
      globalmap = globalmapp;
      branchmap[basecontainer.fullID] = parentlump;
      resolveRecurse(basecontainer, parentlump);
  }
  
  function dumpBranchHead(branch, targetlump) {
      if (targetlump.elide) {
          return;
      }
      var attrcopy = {};
      $.extend(true, attrcopy, targetlump.attributemap);
      adjustForID(attrcopy, branch);
      outDecorators(branch, attrcopy);
      out += "<" + targetlump.tagname + " ";
      out += fluid.dumpAttributes(attrcopy);
      out += ">";
  }
  
  function dumpTillLump(lumps, start, limit) {
      for (; start < limit; ++ start) {
          var text = lumps[start].text;
          if (text) { // guard against "undefined" lumps from "justended"
              out += lumps[start].text;
          }
      }
  }

  function dumpScan(lumps, renderindex, basedepth, closeparent, insideleaf) {
    var start = renderindex;
    while (true) {
      if (renderindex === lumps.length) {
        break;
      }
      var lump = lumps[renderindex];
      if (lump.nestingdepth < basedepth) {
        break;
      }
      if (lump.rsfID !== undefined) {
        if (!insideleaf) {break;}
        if (insideleaf && lump.nestingdepth > basedepth + (closeparent?0:1) ) {
          fluid.log("Error in component tree - leaf component found to contain further components - at " +
              lump.toString());
        }
        else {break;}
      }
      // target.print(lump.text);
      ++renderindex;
    }
    // ASSUMPTIONS: close tags are ONE LUMP
    if (!closeparent && (renderindex == lumps.length || !lumps[renderindex].rsfID)) {
      --renderindex;
    }
    
    dumpTillLump(lumps, start, renderindex);
    //target.write(buffer, start, limit - start);
    return renderindex;
  }
  // In RSF Client, this is a "flyweight" "global" object that is reused for every tag, 
  // to avoid generating garbage. In RSF Server, it is an argument to the following rendering
  // methods of type "TagRenderContext".
  
  var trc = {};
  
  /*** TRC METHODS ***/
  
  function openTag() {
      if (!trc.iselide) {
          out += "<" + trc.uselump.tagname;
      }
  }
  
  function closeTag() {
      if (!trc.iselide) {
          out += "</" + trc.uselump.tagname + ">";
      }
  }

  function renderUnchanged() {
      // TODO needs work since we don't keep attributes in text
      dumpTillLump(trc.uselump.parent.lumps, trc.uselump.lumpindex + 1,
          trc.close.lumpindex + (trc.iselide ? 0 : 1));
  }
  
  function replaceAttributes() {
      if (!trc.iselide) {
          out += fluid.dumpAttributes(trc.attrcopy);
      }
      dumpTemplateBody();
  }

  function replaceAttributesOpen() {
      if (trc.iselide) {
          replaceAttributes();
      }
      else {
          out += fluid.dumpAttributes(trc.attrcopy);
          // TODO: the parser does not ever produce empty tags
          out += // trc.endopen.lumpindex === trc.close.lumpindex ? "/>" :
                ">";
    
          trc.nextpos = trc.endopen.lumpindex;
      }
  }

  function dumpTemplateBody() {
      if (trc.endopen.lumpindex === trc.close.lumpindex) {
          if (!trc.iselide) {
              out += "/>";
          }
      }
      else {
          if (!trc.iselide) {
              out += ">";
          }
      dumpTillLump(trc.uselump.parent.lumps, trc.endopen.lumpindex,
          trc.close.lumpindex + (trc.iselide ? 0 : 1));
      }
  }

  function rewriteLeaf(value) {
      if (isValue(value)) {
          replaceBody(value);
      }
      else {
          replaceAttributes();
      }
  }

  function rewriteLeafOpen(value) {
      if (trc.iselide) {
          rewriteLeaf(trc.value);
      }
      else {
          if (isValue(value)) { 
              replaceBody(value);
          }
          else {
              replaceAttributesOpen();
          }
      }
  }
  
  function replaceBody(value) {
      out += fluid.dumpAttributes(trc.attrcopy);
      if (!trc.iselide) {
          out += ">";
      }
      out += fluid.XMLEncode(value.toString());
      closeTag();
  }
  
  /*** END TRC METHODS**/
  
  function isValue(value) {
      return value !== null && value !== undefined && !isPlaceholder(value);
  }
  
  function isPlaceholder(value) {
      // TODO: equivalent of server-side "placeholder" system
      return false;
  }
  
  function rewriteURL(template, URL) {
      // TODO: rebasing of "relative URLs" discovered/issued from subcomponent templates
      return URL;
  }
  
  function dumpHiddenField(/** UIParameter **/ todump) {
      out += "<input type=\"hidden\" ";
      var isvirtual = todump.virtual;
      var outattrs = {};
      outattrs[isvirtual? "id" : "name"] = todump.name;
      outattrs.value = todump.value;
      out += fluid.dumpAttributes(outattrs);
      out += " />\n";
  }
  
  function applyAutoBind(torender, finalID) {
      var tagname = trc.uselump.tagname;
      var applier = renderOptions.applier;
      function applyFunc() {
          fluid.applyChange(fluid.byId(finalID), undefined, applier);
          }
      if (renderOptions.autoBind && /input|select|textarea/.test(tagname) 
            && !renderedbindings[finalID]) {
          var decorators = [{jQuery: ["change", applyFunc]}];
          // Work around bug 193: http://webbugtrack.blogspot.com/2007/11/bug-193-onchange-does-not-fire-properly.html
          if ($.browser.msie && tagname === "input" 
              && /radio|checkbox/.test(trc.attrcopy.type)) {
             decorators.push({jQuery: ["click", applyFunc]});
          }
          outDecoratorsImpl(torender, decorators, trc.attrcopy, finalID);
      }    
  }
  
  function dumpBoundFields(/** UIBound**/ torender, parent) {
      if (torender) {
          var holder = parent? parent : torender;
          if (directFossils && holder.submittingname && holder.valuebinding) {
            // TODO: this will store multiple times for each member of a UISelect
              directFossils[holder.submittingname] = {
                name: holder.submittingname,
                EL: holder.valuebinding,
                oldvalue: holder.value};
            // But this has to happen multiple times
              applyAutoBind(torender, torender.fullID);
          }
          if (torender.fossilizedbinding) {
              dumpHiddenField(torender.fossilizedbinding);
          }
          if (torender.fossilizedshaper) {
              dumpHiddenField(torender.fossilizedshaper);
          }
      }
  }
  
  function dumpSelectionBindings(uiselect) {
      if (!renderedbindings[uiselect.selection.fullID]) {
          renderedbindings[uiselect.selection.fullID] = true; // set this true early so that selection does not autobind twice
          dumpBoundFields(uiselect.selection);
          dumpBoundFields(uiselect.optionlist);
          dumpBoundFields(uiselect.optionnames);
      }
  }
  
  fluid.NULL_STRING = "\u25a9null\u25a9";
  
  var LINK_ATTRIBUTES = {
      a: "href", link: "href", img: "src", frame: "src", script: "src", style: "src", input: "src", embed: "src",
      form: "action",
      applet: "codebase", object: "codebase"
  };

  
  function isSelectedValue(torender, value) {
      var selection = torender.selection;
      return selection.value && typeof(selection.value) !== "string" && typeof(selection.value.length) === "number" ? 
            $.inArray(value, selection.value, value) !== -1 :
               selection.value === value;
  }
  
  function getRelativeComponent(component, relativeID) {
      component = component.parent;
      if (relativeID.indexOf("..::") === 0) {
          relativeID = relativeID.substring(4);
          component = component.parent;
      }
      return component.childmap[relativeID];
  }
  
  function explodeDecorators(decorators) {
      var togo = [];
      if (decorators.type) {
          togo[0] = decorators;
      }
      else {
          for (var key in decorators) {
              if (key === "$") {key = "jQuery";}
              var value = decorators[key];
              var decorator = {
                type: key
              };
              if (key === "jQuery") {
                  decorator.func = value[0];
                  decorator.args = value.slice(1);
              }
              else if (key === "addClass" || key === "removeClass") {
                  decorator.classes = value;
              }
              else if (key === "attrs") {
                  decorator.attributes = value;
              }
              else if (key === "identify") {
                  decorator.key = value;
              }
              togo[togo.length] = decorator;
          }
      }
      return togo;
  }
  
  function outDecoratorsImpl(torender, decorators, attrcopy, finalID) {
    renderOptions.idMap = renderOptions.idMap || {};
      for (var i = 0; i < decorators.length; ++ i) {
          var decorator = decorators[i];
          var type = decorator.type;
          if (!type) {
              var explodedDecorators = explodeDecorators(decorator);
              outDecoratorsImpl(torender, explodedDecorators, attrcopy, finalID);
              continue;
          }
          if (type === "$") {type = decorator.type = "jQuery";}
          if (type === "jQuery" || type === "event" || type === "fluid") {
              var id = adjustForID(attrcopy, torender, true, finalID);
              decorator.id = id;
              decoratorQueue[decoratorQueue.length] = decorator;
          }
          // honour these remaining types immediately
          else if (type === "attrs") {
              $.extend(true, attrcopy, decorator.attributes);
          }
          else if (type === "addClass" || type === "removeClass") {
              var fakeNode = {
                nodeType: 1,
                className: attrcopy["class"] || ""
              };
              $(fakeNode)[type](decorator.classes);
              attrcopy["class"] = fakeNode.className;
          }
          else if (type === "identify") {
              var id = adjustForID(attrcopy, torender, true, finalID);
              renderOptions.idMap[decorator.key] = id;
          }
      }
  }
  
  function outDecorators(torender, attrcopy) {
      if (!torender.decorators) {return;}
      if (torender.decorators.length === undefined) {
          torender.decorators = explodeDecorators(torender.decorators);
      }
      outDecoratorsImpl(torender, torender.decorators, attrcopy);
  }
    
    
  function renderComponent(torender) {
    var attrcopy = trc.attrcopy;
    var lumps = trc.uselump.parent.lumps;
    var lumpindex = trc.uselump.lumpindex;
    
    var componentType = torender.componentType;
    var tagname = trc.uselump.tagname;
    
    outDecorators(torender, attrcopy);
    
    if (componentType === "UIMessage") {
        // degrade UIMessage to UIBound by resolving the message
        componentType = "UIBound";
        if (!renderOptions.messageLocator) {
           torender.value = "[No messageLocator is configured in options - please consult documentation on options.messageSource]";
        }
        else {
           torender.value = renderOptions.messageLocator(torender.messagekey, torender.args);
        }
    }
    
    function makeFail(torender, end) {
        fluid.fail("Error in component tree - UISelectChoice with id " + torender.fullID + end);
    } 
    
    if (componentType === "UIBound" || componentType === "UISelectChoice") {
        var parent;
        if (torender.choiceindex !== undefined) {
            if (torender.parentFullID) {
                parent = getAbsoluteComponent(view, torender.parentFullID);
                if (!parent) {
                    makeFail(torender, " has parentFullID of " + torender.parentFullID + " which cannot be resolved");
                }
            }
            else if (torender.parentRelativeID !== undefined){
                parent = getRelativeComponent(torender, torender.parentRelativeID);
                if (!parent) {
                    makeFail(torender, " has parentRelativeID of " + torender.parentRelativeID + " which cannot be resolved");
                }
            }
            else {
                makeFail(torender, " does not have either parentFullID or parentRelativeID set");
            }
            assignSubmittingName(parent.selection);
            dumpSelectionBindings(parent);
        }

        var submittingname = parent? parent.selection.submittingname : torender.submittingname;
        if (tagname === "input" || tagname === "textarea") {
            if (!parent) {
                submittingname = assignSubmittingName(torender);
            }
            if (submittingname !== undefined) {
                attrcopy.name = submittingname;
                }
            }
        // this needs to happen early on the client, since it may cause the allocation of the
        // id in the case of a "deferred decorator". However, for server-side bindings, this 
        // will be an inappropriate time, unless we shift the timing of emitting the opening tag.
        dumpBoundFields(torender, parent? parent.selection : null);
  
        if (typeof(torender.value) === 'boolean' || attrcopy.type === "radio" 
               || attrcopy.type === "checkbox") {
            var underlyingValue;
            var directValue = torender.value;
            
            if (torender.choiceindex !== undefined) {
                if (!parent.optionlist.value) {
                    fluid.fail("Error in component tree - selection control with full ID " + parent.fullID + " has no values");
                }
                underlyingValue = parent.optionlist.value[torender.choiceindex];
                directValue = isSelectedValue(parent, underlyingValue);
            }
            if (isValue(directValue)) {
                if (directValue) {
                    attrcopy.checked = "checked";
                    }
                else {
                    delete attrcopy.checked;
                    }
                }
            attrcopy.value = underlyingValue? underlyingValue: "true";
            rewriteLeaf(null);
        }
        else if (torender.value instanceof Array) {
            // Cannot be rendered directly, must be fake
            renderUnchanged();
        }
        else { // String value
          var value = parent? 
              parent[tagname === "textarea" || tagname === "input" ? "optionlist" : "optionnames"].value[torender.choiceindex] : 
                torender.value;
          if (tagname === "textarea") {
            if (isPlaceholder(value) && torender.willinput) {
              // FORCE a blank value for input components if nothing from
              // model, if input was intended.
              value = "";
            }
            rewriteLeaf(value);
          }
          else if (tagname === "input") {
            if (torender.willinput || isValue(value)) {
              attrcopy.value = value;
              }
            rewriteLeaf(null);
            }
          else {
            delete attrcopy.name;
            rewriteLeafOpen(value);
            }
          }
        }
    else if (componentType === "UISelect") {
      // need to do this first to see whether we need to write out an ID or not
      applyAutoBind(torender, torender.selection.fullID);
      //if (attrcopy.id) {
        // TODO: This is an irregularity, should probably remove for 0.8
        //attrcopy.id = torender.selection.fullID;
        //}
      var ishtmlselect = tagname === "select";
      var ismultiple = false;

      if (torender.selection.value instanceof Array) {
        ismultiple = true;
        if (ishtmlselect) {
          attrcopy.multiple = "multiple";
          }
        }
      // since in HTML this name may end up in a global namespace, we make sure to take account
      // of any uniquifying done by adjustForID upstream of applyAutoBind
      assignSubmittingName(torender.selection, attrcopy.id);
      if (ishtmlselect) {
        // The HTML submitted value from a <select> actually corresponds
        // with the selection member, not the top-level component.
        if (torender.selection.willinput !== false) {
          attrcopy.name = torender.selection.submittingname;
        }
      }
      out += fluid.dumpAttributes(attrcopy);
      if (ishtmlselect) {
        out += ">";
        var values = torender.optionlist.value;
        var names = torender.optionnames === null || torender.optionnames === undefined || !torender.optionnames.value ? values: torender.optionnames.value;
        if (!names || !names.length) {
            fluid.fail("Error in component tree - UISelect component with fullID " 
                + torender.fullID + " does not have optionnames set");
        }
        for (var i = 0; i < names.length; ++i) {
          out += "<option value=\"";
          var value = values[i];
          if (value === null) {
            value = fluid.NULL_STRING;
          }
          out += fluid.XMLEncode(value);
          if (isSelectedValue(torender, value)) {
            out += "\" selected=\"selected";
            }
          out += "\">";
          out += fluid.XMLEncode(names[i]);
          out += "</option>\n";
        }
        closeTag();
      }
      else {
        dumpTemplateBody();
      }
      dumpSelectionBindings(torender);
    }
    else if (componentType === "UILink") {
      var attrname = LINK_ATTRIBUTES[tagname];
      if (attrname) {
        var target= torender.target.value;
        if (!isValue(target)) {
          target = attrcopy[attname];
          }
        else {
          target = rewriteURL(trc.uselump.parent, target);
          }
        attrcopy[attrname] = target;
      }
      var value = torender.linktext.value;
      if (!isValue(value)) {
        replaceAttributesOpen();
      }
      else {
        rewriteLeaf(value);
      }
    }
    
    else if (torender.markup !== undefined) { // detect UIVerbatim
      var rendered = torender.markup;
      if (rendered === null) {
        // TODO, doesn't quite work due to attr folding cf Java code
          out += fluid.dumpAttributes(attrcopy);
          out +=">";
          renderUnchanged(); 
      }
      else {
        if (!trc.iselide) {
          out += fluid.dumpAttributes(attrcopy);
          out += ">";
        }
        out += rendered;
        closeTag();
        }    
      }
      else {
        
      }
    }
  
  function adjustForID(attrcopy, component, late, forceID) {
      if (!late) {
          delete attrcopy["rsf:id"];
      }
      if (forceID !== undefined) {
          attrcopy.id = forceID;
      }
      else {
          if (attrcopy.id || late) {
              attrcopy.id = component.fullID;
          }
      }
      var count = 1;
      var baseid = attrcopy.id;
      while (renderOptions.document.getElementById(attrcopy.id)) {
          attrcopy.id = baseid + "-" + (count++); 
      }
      return attrcopy.id;
  }
  
  function rewriteIDRelation(context) {
      var attrname;
      var attrval = trc.attrcopy["for"];
      if (attrval !== undefined) {
           attrname = "for";
      }
      else {
          attrval = trc.attrcopy.headers;
          if (attrval !== undefined) {
              attrname = "headers";
          }
      }
      if (!attrname) {return;}
      var tagname = trc.uselump.tagname;
      if (attrname === "for" && tagname !== "label") {return;}
      if (attrname === "headers" && tagname !== "td" && tagname !== "th") {return;}
      var rewritten = rewritemap[getRewriteKey(trc.uselump.parent, context, attrval)];
      if (rewritten !== undefined) {
          trc.attrcopy[attrname] = rewritten;
      }
  }
  
  function renderComment(message) {
      out += ("<!-- " + fluid.XMLEncode(message) + "-->");
  }
  
  function renderDebugMessage(message) {
      out += "<span style=\"background-color:#FF466B;color:white;padding:1px;\">";
      out += message;
      out += "</span><br/>";
  }
  
  function reportPath(/*UIComponent*/ branch) {
      var path = branch.fullID;
      return !path ? "component tree root" : "full path " + path;
  }
  
  function renderComponentSystem(context, torendero, lump) {
    var lumpindex = lump.lumpindex;
    var lumps = lump.parent.lumps;
    var nextpos = -1;
    var outerendopen = lumps[lumpindex + 1];
    var outerclose = lump.close_tag;

    nextpos = outerclose.lumpindex + 1;

    var payloadlist = lump.downmap? lump.downmap["payload-component"] : null;
    var payload = payloadlist? payloadlist[0] : null;
    
    var iselide = lump.rsfID.charCodeAt(0) === 126; // "~"
    
    var endopen = outerendopen;
    var close = outerclose;
    var uselump = lump;
    var attrcopy = {};
    $.extend(true, attrcopy, (payload === null? lump : payload).attributemap);
    
    trc.attrcopy = attrcopy;
    trc.uselump = uselump;
    trc.endopen = endopen;
    trc.close = close;
    trc.nextpos = nextpos;
    trc.iselide = iselide;
    
    rewriteIDRelation(context);
    
    if (torendero === null) {
        if (lump.rsfID.indexOf("scr=") === (iselide? 1 : 0)) {
            var scrname = lump.rsfID.substring(4 + (iselide? 1 : 0));
            if (scrname === "ignore") {
                nextpos = trc.close.lumpindex + 1;
            }
            else {
               openTag();
               replaceAttributesOpen();
               nextpos = trc.endopen.lumpindex;
            }
        }
    }
    else {
      // else there IS a component and we are going to render it. First make
      // sure we render any preamble.

      if (payload) {
        trc.endopen = lumps[payload.lumpindex + 1];
        trc.close = payload.close_tag;
        trc.uselump = payload;
        dumpTillLump(lumps, lumpindex, payload.lumpindex);
        lumpindex = payload.lumpindex;
      }

      adjustForID(attrcopy, torendero);
      //decoratormanager.decorate(torendero.decorators, uselump.getTag(), attrcopy);

      
      // ALWAYS dump the tag name, this can never be rewritten. (probably?!)
      openTag();

      renderComponent(torendero);
      // if there is a payload, dump the postamble.
      if (payload !== null) {
        // the default case is initialised to tag close
        if (trc.nextpos === nextpos) {
          dumpTillLump(lumps, trc.close.lumpindex + 1, outerclose.lumpindex + 1);
        }
      }
      nextpos = trc.nextpos;
      }
  return nextpos;
  }
  
  function renderContainer(child, targetlump) {
      var t2 = targetlump.parent;
      var firstchild = t2.lumps[targetlump.lumpindex + 1];
      if (child.children !== undefined) {
          dumpBranchHead(child, targetlump);
      }
      else {
          renderComponentSystem(child.parent, child, targetlump);
      }
      renderRecurse(child, targetlump, firstchild);
  }
  
  function fetchComponent(basecontainer, id, lump) {
      if (id.indexOf("msg=") === 0) {
          var key = id.substring(4);
          return {componentType: "UIMessage", messagekey: key};
      }
      while (basecontainer) {
          var togo = basecontainer.childmap[id];
          if (togo) {
              return togo;
          }
          basecontainer = basecontainer.parent;
      }
      return null;
  }

  function fetchComponents(basecontainer, id) {
      var togo;
      while (basecontainer) {
          togo = basecontainer.childmap[id];
          if (togo) {
              break;
          }
          basecontainer = basecontainer.parent;
      }
      return togo;
  }

  function findChild(sourcescope, child) {
      var split = fluid.SplitID(child.ID);
      var headlumps = sourcescope.downmap[child.ID];
      if (headlumps === null) {
          headlumps = sourcescope.downmap[split.prefix + ":"];
      }
      return headlumps === null ? null : headlumps[0];
  }
  
  function renderRecurse(basecontainer, parentlump, baselump) {
    var renderindex = baselump.lumpindex;
    var basedepth = parentlump.nestingdepth;
    var t1 = parentlump.parent;
    if (debugMode) {
        var rendered = {};
    }
    while (true) {
      renderindex = dumpScan(t1.lumps, renderindex, basedepth, !parentlump.elide, false);
      if (renderindex === t1.lumps.length) { 
        break;
      }
      var lump = t1.lumps[renderindex];      
      var id = lump.rsfID;
      // new stopping rule - we may have been inside an elided tag
      if (lump.nestingdepth < basedepth || id === undefined) {
        break;
      } 

      if (id.charCodeAt(0) === 126) { // "~"
        id = id.substring(1);
      }
      
      //var ismessagefor = id.indexOf("message-for:") === 0;
      
      if (id.indexOf(':') !== -1) {
        var prefix = fluid.getPrefix(id);
        var children = fetchComponents(basecontainer, prefix);
        
        var finallump = lump.uplump.finallump[prefix];
        var closefinal = finallump.close_tag;
        
        if (children) {
          for (var i = 0; i < children.length; ++ i) {
            var child = children[i];
            if (child.children) { // it is a branch 
              var targetlump = branchmap[child.fullID];
              if (targetlump) {
                  if (debugMode) {
                      renderComment("Branching for " + child.fullID + " from "
                          + fluid.debugLump(lump) + " to " + fluid.debugLump(targetlump));
                  }
                  
                  renderContainer(child, targetlump);
                  
                  if (debugMode) {
                      renderComment("Branch returned for " + child.fullID
                          + fluid.debugLump(lump) + " to " + fluid.debugLump(targetlump));
                }
              }
              else if (debugMode){
                    renderDebugMessage(
                      "No matching template branch found for branch container with full ID "
                          + child.fullID
                          + " rendering from parent template branch "
                          + fluid.debugLump(baselump));
              }
            }
            else { // repetitive leaf
              var targetlump = findChild(parentlump, child);
              if (!targetlump) {
                  if (debugMode) {
                      renderDebugMessage(
                        "Repetitive leaf with full ID " + child.fullID
                        + " could not be rendered from parent template branch "
                        + fluid.debugLump(baselump));
                  }
                continue;
              }
              var renderend = renderComponentSystem(basecontainer, child, targetlump);
              var wasopentag = renderend < t1.lumps.lengtn && t1.lumps[renderend].nestingdepth >= targetlump.nestingdepth;
              var newbase = child.children? child : basecontainer;
              if (wasopentag) {
                renderRecurse(newbase, targetlump, t1.lumps[renderend]);
                renderend = targetlump.close_tag.lumpindex + 1;
              }
              if (i !== children.length - 1) {
                // TODO - fix this bug in RSF Server!
                if (renderend < closefinal.lumpindex) {
                  dumpScan(t1.lumps, renderend, targetlump.nestingdepth - 1, false, false);
                }
              }
              else {
                dumpScan(t1.lumps, renderend, targetlump.nestingdepth, true, false);
              }
            }
          } // end for each repetitive child
        }
        else {
            if (debugMode) {
                renderDebugMessage("No branch container with prefix "
                    + prefix + ": found in container "
                    + reportPath(basecontainer)
                    + " rendering at template position " + fluid.debugLump(baselump)
                    + ", skipping");
            }
        }
        
        renderindex = closefinal.lumpindex + 1;
        if (debugMode) {
            renderComment("Stack returned from branch for ID " + id + " to "
              + fluid.debugLump(baselump) + ": skipping from " + fluid.debugLump(lump)
              + " to " + fluid.debugLump(closefinal));
          }
      }
      else {
        var component;
        if (id) {
            if (debugMode) {
                rendered[id] = true;
            }
          component = fetchComponent(basecontainer, id, lump);
        }
        if (component && component.children !== undefined) {
          renderContainer(component);
          renderindex = lump.close_tag.lumpindex + 1;
        }
        else {
          renderindex = renderComponentSystem(basecontainer, component, lump);
        }
      }
      if (renderindex === t1.lumps.length) {
        break;
      }
    }
    if (debugMode) {
      var children = basecontainer.children;
      for (var key = 0; key < children.length; ++key) {
        var child = children[key];
        if (!(child.ID.indexOf(':') !== -1) && !rendered[child.ID]) {
            renderDebugMessage("Leaf child component "
              + child.componentType + " with full ID "
              + child.fullID + " could not be found within template "
              + fluid.debugLump(baselump));
        }
      }
    }  
    
  }
  
  function renderCollect(collump) {
      dumpTillLump(collump.parent.lumps, collump.lumpindex, collump.close_tag.lumpindex + 1);
  }
  
  // Let us pray
  function renderCollects() {
      for (var key in collected) {
          var collist = collected[key];
          for (var i = 0; i < collist.length; ++ i) {
              renderCollect(collist[i]);
          }
      }
  }
  
  function processDecoratorQueue() {
      for (var i = 0; i < decoratorQueue.length; ++ i) {
          var decorator = decoratorQueue[i];
          var node = fluid.byId(decorator.id);
          if (!node) {
            fluid.fail("Error during rendering - component with id " + decorator.id 
             + " which has a queued decorator was not found in the output markup");
          }
          if (decorator.type === "jQuery") {
              var jnode = $(node);
              jnode[decorator.func].apply(jnode, $.makeArray(decorator.args));
          }
          else if (decorator.type === "fluid") {
              var args = decorator.args;
              if (!args) {
                  if (!decorator.container) {
                      decorator.container = node;
                  }
                  args = [decorator.container, decorator.options];
              }
              var that = fluid.invokeGlobalFunction(decorator.func, args, fluid);
              decorator.that = that;
          }
          else if (decorator.type === "event") {
            node[decorator.event] = decorator.handler; 
          }
      }
  }

  fluid.ComponentReference = function(reference) {
      this.reference = reference;
  };
  
  // Explodes a raw "hash" into a list of UIOutput/UIBound entries
  fluid.explode = function(hash, basepath) {
      var togo = [];
      for (var key in hash) {
          var binding = basepath === undefined? key : basepath + "." + key;
          togo[togo.length] = {ID: key, value: hash[key], valuebinding: binding};
      }
      return togo;
    };
    
    
   /**
    * A common utility function to make a simple view of rows, where each row has a selection control and a label
    * @param {Object} optionlist An array of the values of the options in the select
    * @param {Object} opts An object with this structure: {
            selectID: "",         
            rowID: "",            
            inputID: "",
            labelID: ""
        }
    */ 
   fluid.explodeSelectionToInputs = function(optionlist, opts) {
         return fluid.transform(optionlist, function(option, index) {
              return {
                ID: opts.rowID, 
                children: [
                     {ID: opts.inputID, parentRelativeID: "..::" + opts.selectID, choiceindex: index},
                     {ID: opts.labelID, parentRelativeID: "..::" + opts.selectID, choiceindex: index}]
               };
           });
    };
  
  fluid.resolveMessageSource = function (messageSource) {
      if (messageSource.type === "data") {
          if (messageSource.url === undefined) {
              return fluid.messageLocator(messageSource.messages);
          }
          else {
            // TODO: fetch via AJAX, and convert format if necessary
          }
      }
  };
   
  fluid.makeBranches = function() {
      var firstBranch;
      var thisBranch;
      for (var i = 0; i < arguments.length; ++ i) {
          var thisarg = arguments[i];
          var nextBranch;
          if (typeof(thisarg) === "string") {
              nextBranch = {ID: thisarg}; 
              }
          else if (thisarg instanceof Array) {
              nextBranch = {ID: thisarg[0], jointID: thisarg[1]};
              }
          else {
              $.extend(true, thisBranch, thisarg);
              nextBranch = thisBranch;
              } 
          if (thisBranch && nextBranch !== thisBranch) {
              if (!thisBranch.children) {
                  thisBranch.children = [];
              }
              thisBranch.children[thisBranch.children.length] = nextBranch;
          }
          thisBranch = nextBranch;
          if (!firstBranch) {
             firstBranch = nextBranch;
          }
      }
    
    return firstBranch;
  };
    
  fluid.renderTemplates = function(templates, tree, options, fossilsIn) {
      options = options || {};
      tree = tree || {};
      debugMode = options.debugMode;
      if (!options.messageLocator && options.messageSource) {
          options.messageLocator = fluid.resolveMessageSource(options.messageSource);
      }
      options.document = options.document || document;
      directFossils = fossilsIn;
      decoratorQueue = [];
  
      tree = fixupTree(tree, options.model);
      var template = templates[0];
      resolveBranches(templates.globalmap, tree, template.rootlump);
      out = "";
      renderedbindings = {};
      renderOptions = options;
      renderCollects();
      renderRecurse(tree, template.rootlump, template.lumps[template.firstdocumentindex]);
      return out;
      };

  /** A driver to render and bind an already parsed set of templates onto
   * a node. See documentation for fluid.selfRender.
   * @param templates A parsed template set, as returned from fluid.selfRender or 
   * fluid.parseTemplates.
   */

  fluid.reRender = function(templates, node, tree, options) {
      options = options || {};
            // Empty the node first, to head off any potential id collisions when rendering
      node = fluid.unwrap(node);
      var lastFocusedElement = fluid.getLastFocusedElement? fluid.getLastFocusedElement() : null;
      var lastId;
      if (lastFocusedElement && fluid.dom.isContainer(node, lastFocusedElement)) {
          lastId = lastFocusedElement.id;
      }
      if ($.browser.msie) {
          $(node).empty(); //- this operation is very slow.
      }
      else {
          node.innerHTML = "";
      }
      var fossils = {};
      var rendered = fluid.renderTemplates(templates, tree, options, fossils);
      if (options.renderRaw) {
          rendered = fluid.XMLEncode(rendered);
          rendered = rendered.replace(/\n/g, "<br/>");
          }
      if (options.model) {
          fluid.bindFossils(node, options.model, fossils);
          }
      if ($.browser.msie) {
        $(node).html(rendered);
      }
      else {
        node.innerHTML = rendered;
      }
      processDecoratorQueue();
      if (lastId) {
          var element = fluid.byId(lastId);
          if (element) {
              $(element).focus();
          }      
      }
        
      return templates;
  };

  function findNodeValue(rootNode) {
      var node = fluid.dom.iterateDom(rootNode, function(node) {
        // NB, in Firefox at least, comment and cdata nodes cannot be distinguished!
          return node.nodeType === 8 || node.nodeType === 4? "stop" : null;
          }, true);
      var value = node.nodeValue;
      if (value.indexOf("[CDATA[") === 0) {
          return value.substring(6, value.length - 2);
      }
      else {
          return value;
      }
  }

  fluid.extractTemplate = function(node, armouring) {
      if (!armouring) {
          return node.innerHTML;
      }
      else {
        return findNodeValue(node);
      }
  };
  /** A simple driver for single node self-templating. Treats the markup for a
   * node as a template, parses it into a template structure, renders it using
   * the supplied component tree and options, then replaces the markup in the 
   * node with the rendered markup, and finally performs any required data
   * binding. The parsed template is returned for use with a further call to
   * reRender.
   * @param node The node both holding the template, and whose markup is to be
   * replaced with the rendered result.
   * @param tree The component tree to be rendered.
   * @param options An options structure to configure the rendering and binding process.
   * @return A templates structure, suitable for a further call to fluid.reRender or
   * fluid.renderTemplates.
   */  
  fluid.selfRender = function(node, tree, options) {
      options = options || {};
      node = fluid.unwrap(node);
      var resourceSpec = {base: {resourceText: fluid.extractTemplate(node, options.armouring), 
                          href: ".", resourceKey: ".", cutpoints: options.cutpoints}
                          };
      var templates = fluid.parseTemplates(resourceSpec, ["base"], options);
      return fluid.reRender(templates, node, tree, options);
    };

})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {

    /*
     *  TODO: 
     *  - get and implement a design for the table of contents 
     *  - make the toc template pluggable
     *  - make sure getting headings using something other then a selector works
     *  - move interesting parts of the template to the defaults ie. link
     */ 
    

    /**
     * Inserts an anchor into the page in front of the element.
     * @param {Object} el
     */    
    var insertAnchor = function (el) {
        var a = $("<a name='" + el.text() + "' />", el[0].ownerDocument);
        el.before(a);
    };
    
    /**
     * Creates a generic tree node
     */
    var createNode = function (id) {
        var node = {
            ID: id,
            children: []
        };
        return node;
    };

    /**
     * Creates the renderer tree that matches the table of contents template
     * @param {jQuery Object} headings - the headings to be put into the table of contents
     */
    var createTree = function (headings, levels) {
        
        // Builds the tree recursively 
        var generateTree = function (nodes, items, level) {
            if (items.length === 0) {
                return;
            }
            
            var item = items[0];
            
            if (level === item.level) {
                nodes[nodes.length - 1].push(item.leaf);
                items.shift();
                return generateTree(nodes, items, level);
            }
            
            if (level < item.level) {
                var prefix = level > -1 ? "level" + (level + 1) + ":" : "";
                var postfix = level === -1 ? "s:" : "s";
                var name = prefix + "level" + (level + 2) + postfix;
                var myNode = createNode(name);
                nodes[nodes.length - 1].push(myNode);
                nodes.push(myNode.children);
                return generateTree(nodes, items, level + 1);
            }
            
            if (level > item.level) {
                nodes.pop();
                return generateTree(nodes, items, level - 1);
            }
        };

        var tree = {
            children: []
        };
        
        // Leaf nodes for the renderer tree from the headings
        var items = fluid.transform(headings, function (heading) {
                var level = $.inArray(heading.tagName, levels);
                var text = $(heading).text();
                return {
                    level: level,
                    leaf: {
                        ID: "level" + (level + 1) + ":item",
                        children: [{
                            ID: "link",
                            linktext: text,
                            target: "#" + text
                        }]
                    }
                };
            });

        generateTree([tree.children], items, -1);
        
        return tree;
    };
    
    var buildTOC = function (container, headings, levels, templateURL, afterRender) {
        // Insert anchors into the page that the table of contents will link to
        headings.each(function (i, el) {
            insertAnchor($(el));
        });
        
        // Data structure needed by fetchResources
        var resources = {
            toc: {
                href: templateURL
            }
        };
        
        // Get the template, create the tree and render the table of contents
        fluid.fetchResources(resources, function () {
            var templates = fluid.parseTemplates(resources, ["toc"], {});
            var node = $("<div></div>", container[0].ownerDocument);
            fluid.reRender(templates, node, createTree(headings, levels), {});
            container.prepend(node);
            afterRender.fire(node);
        });
    };

    fluid.tableOfContents = function (container, options) {
        var that = fluid.initView("fluid.tableOfContents", container, options);

        // TODO: need better name for tocNode. and node, while you're at it. 
        //       also, should the DOM be exposed in this way? Is there a better way to handle this?
        that.events.afterRender.addListener(function (node) {
            that.tocNode = $(node);
        });

        buildTOC(that.container, that.locate("headings"), that.options.levels, that.options.templateUrl, that.events.afterRender);

        // TODO: is it weird to have hide and show on a component? 
        that.hide = function () {
            if (that.tocNode) {
                that.tocNode.hide();
            }
        };
        
        that.show = function () {
            if (that.tocNode) {
                that.tocNode.show();
            }
        };

        return that;
    };
    
    fluid.defaults("fluid.tableOfContents", {  
        selectors: {
            headings: ":header"
        },
        events: {
            afterRender: null
        },
        templateUrl: "../html/TableOfContents.html",
        levels: ["H1", "H2", "H3", "H4", "H5", "H6"]
    });

})(jQuery, fluid_1_1);
/*
 * jQuery Tooltip plugin 1.2
 *
 * http://bassistance.de/jquery-plugins/jquery-plugin-tooltip/
 * http://docs.jquery.com/Plugins/Tooltip
 *
 * Copyright (c) 2006 - 2008 Jörn Zaefferer
 *
 * $Id: fluid-all-1.1.js 18312 2009-07-19 15:43:27Z bourey $
 * 
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */
 
;(function($) {
	
		// the tooltip element
	var helper = {},
		// the current tooltipped element
		current,
		// the title of the current element, used for restoring
		title,
		// timeout id for delayed tooltips
		tID,
		// IE 5.5 or 6
		IE = $.browser.msie && /MSIE\s(5\.5|6\.)/.test(navigator.userAgent),
		// flag for mouse tracking
		track = false;
	
	$.tooltip = {
		blocked: false,
		defaults: {
			delay: 200,
			showURL: true,
			extraClass: "",
			top: 15,
			left: 15,
			id: "tooltip"
		},
		block: function() {
			$.tooltip.blocked = !$.tooltip.blocked;
		}
	};
	
	$.fn.extend({
		tooltip: function(settings) {
			settings = $.extend({}, $.tooltip.defaults, settings);
			createHelper(settings);
			return this.each(function() {
					$.data(this, "tooltip-settings", settings);
					// copy tooltip into its own expando and remove the title
					this.tooltipText = this.title;
					$(this).removeAttr("title");
					// also remove alt attribute to prevent default tooltip in IE
					this.alt = "";
				})
				.hover(save, hide)
				.click(hide);
		},
		fixPNG: IE ? function() {
			return this.each(function () {
				var image = $(this).css('backgroundImage');
				if (image.match(/^url\(["']?(.*\.png)["']?\)$/i)) {
					image = RegExp.$1;
					$(this).css({
						'backgroundImage': 'none',
						'filter': "progid:DXImageTransform.Microsoft.AlphaImageLoader(enabled=true, sizingMethod=crop, src='" + image + "')"
					}).each(function () {
						var position = $(this).css('position');
						if (position != 'absolute' && position != 'relative')
							$(this).css('position', 'relative');
					});
				}
			});
		} : function() { return this; },
		unfixPNG: IE ? function() {
			return this.each(function () {
				$(this).css({'filter': '', backgroundImage: ''});
			});
		} : function() { return this; },
		hideWhenEmpty: function() {
			return this.each(function() {
				$(this)[ $(this).html() ? "show" : "hide" ]();
			});
		},
		url: function() {
			return this.attr('href') || this.attr('src');
		}
	});
	
	function createHelper(settings) {
		// there can be only one tooltip helper
		if( helper.parent )
			return;
		// create the helper, h3 for title, div for url
		helper.parent = $('<div id="' + settings.id + '"><h3></h3><div class="body"></div><div class="url"></div></div>')
			// add to document
			.appendTo(document.body)
			// hide it at first
			.hide();
			
		// apply bgiframe if available
		if ( $.fn.bgiframe )
			helper.parent.bgiframe();
		
		// save references to title and url elements
		helper.title = $('h3', helper.parent);
		helper.body = $('div.body', helper.parent);
		helper.url = $('div.url', helper.parent);
	}
	
	function settings(element) {
		return $.data(element, "tooltip-settings");
	}
	
	// main event handler to start showing tooltips
	function handle(event) {
		// show helper, either with timeout or on instant
		if( settings(this).delay )
			tID = setTimeout(show, settings(this).delay);
		else
			show();
		
		// if selected, update the helper position when the mouse moves
		track = !!settings(this).track;
		$(document.body).bind('mousemove', update);
			
		// update at least once
		update(event);
	}
	
	// save elements title before the tooltip is displayed
	function save() {
		// if this is the current source, or it has no title (occurs with click event), stop
		if ( $.tooltip.blocked || this == current || (!this.tooltipText && !settings(this).bodyHandler) )
			return;

		// save current
		current = this;
		title = this.tooltipText;
		
		if ( settings(this).bodyHandler ) {
			helper.title.hide();
			var bodyContent = settings(this).bodyHandler.call(this);
			if (bodyContent.nodeType || bodyContent.jquery) {
				helper.body.empty().append(bodyContent)
			} else {
				helper.body.html( bodyContent );
			}
			helper.body.show();
		} else if ( settings(this).showBody ) {
			var parts = title.split(settings(this).showBody);
			helper.title.html(parts.shift()).show();
			helper.body.empty();
			for(var i = 0, part; part = parts[i]; i++) {
				if(i > 0)
					helper.body.append("<br/>");
				helper.body.append(part);
			}
			helper.body.hideWhenEmpty();
		} else {
			helper.title.html(title).show();
			helper.body.hide();
		}
		
		// if element has href or src, add and show it, otherwise hide it
		if( settings(this).showURL && $(this).url() )
			helper.url.html( $(this).url().replace('http://', '') ).show();
		else 
			helper.url.hide();
		
		// add an optional class for this tip
		helper.parent.addClass(settings(this).extraClass);

		// fix PNG background for IE
		if (settings(this).fixPNG )
			helper.parent.fixPNG();
			
		handle.apply(this, arguments);
	}
	
	// delete timeout and show helper
	function show() {
		tID = null;
		helper.parent.show();
		update();
	}
	
	/**
	 * callback for mousemove
	 * updates the helper position
	 * removes itself when no current element
	 */
	function update(event)	{
		if($.tooltip.blocked)
			return;
		
		// stop updating when tracking is disabled and the tooltip is visible
		if ( !track && helper.parent.is(":visible")) {
			$(document.body).unbind('mousemove', update)
		}
		
    // if no current element is available, remove this listener
    // AMB temp proximate fix for FLUID-2323
    if( current == null || !settings(current) ) {
      //$(document.body).unbind('mousemove', update);
      return; 
    }
		
		// remove position helper classes
		helper.parent.removeClass("viewport-right").removeClass("viewport-bottom");
		
		var left = helper.parent[0].offsetLeft;
		var top = helper.parent[0].offsetTop;
		if(event) {
			// position the helper 15 pixel to bottom right, starting from mouse position
			left = event.pageX + settings(current).left;
			top = event.pageY + settings(current).top;
			helper.parent.css({
				left: left + 'px',
				top: top + 'px'
			});
		}
		
		var v = viewport(),
			h = helper.parent[0];
		// check horizontal position
		if(v.x + v.cx < h.offsetLeft + h.offsetWidth) {
			left -= h.offsetWidth + 20 + settings(current).left;
			helper.parent.css({left: left + 'px'}).addClass("viewport-right");
		}
		// check vertical position
		if(v.y + v.cy < h.offsetTop + h.offsetHeight) {
			top -= h.offsetHeight + 20 + settings(current).top;
			helper.parent.css({top: top + 'px'}).addClass("viewport-bottom");
		}
	}
	
	function viewport() {
		return {
			x: $(window).scrollLeft(),
			y: $(window).scrollTop(),
			cx: $(window).width(),
			cy: $(window).height()
		};
	}
	
	// hide helper and restore added classes and the title
	function hide(event) {
		if($.tooltip.blocked)
			return;
		// clear timeout if possible
		if(tID)
			clearTimeout(tID);
		// no more current element
		current = null;
		
		helper.parent.hide().removeClass( settings(this).extraClass );
		
		if( settings(this).fixPNG )
			helper.parent.unfixPNG();
	}
	
	$.fn.Tooltip = $.fn.tooltip;
	
})(jQuery);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
    
  // The three states of the undo component
    var STATE_INITIAL = "state_initial", 
        STATE_CHANGED = "state_changed",
        STATE_REVERTED = "state_reverted";
  
    function defaultRenderer(that, targetContainer) {
        var markup = "<span class='flc-undo'>" + 
          "<span class='flc-undo-undoContainer'>[<a href='#' class='flc-undo-undoControl'>undo</a>]</span>" + 
          "<span class='flc-undo-redoContainer'>[<a href='#' class='flc-undo-redoControl'>redo</a>]</span>" + 
        "</span>";
        var markupNode = $(markup);
        targetContainer.append(markupNode);
        return markupNode;
    }
  
    function refreshView(that) {
        if (that.state === STATE_INITIAL) {
            that.locate("undoContainer").hide();
            that.locate("redoContainer").hide();
        }
        else if (that.state === STATE_CHANGED) {
            that.locate("undoContainer").show();
            that.locate("redoContainer").hide();
        }
        else if (that.state === STATE_REVERTED) {
            that.locate("undoContainer").hide();
            that.locate("redoContainer").show();          
        }
    }
   
    
    var bindHandlers = function (that) { 
        that.locate("undoControl").click( 
            function () {
                if (that.state !== STATE_REVERTED) {
                    fluid.model.copyModel(that.extremalModel, that.component.model);
                    that.component.updateModel(that.initialModel, that);
                    that.state = STATE_REVERTED;
                    refreshView(that);
                    that.locate("redoControl").focus();
                }
				return false;
            }
        );
        that.locate("redoControl").click( 
            function () {
                if (that.state !== STATE_CHANGED) {
                    that.component.updateModel(that.extremalModel, that);
                    that.state = STATE_CHANGED;
                    refreshView(that);
                    that.locate("undoControl").focus();
                }
				return false;
            }
        );
        return {
            modelChanged: function (newModel, oldModel, source) {
                if (source !== that) {
                    that.state = STATE_CHANGED;
                
                    fluid.model.copyModel(that.initialModel, oldModel);
                
                    refreshView(that);
                }
            }
        };
    };
    
    /**
     * Decorates a target component with the function of "undoability"
     * 
     * @param {Object} component a "model-bearing" standard Fluid component to receive the "undo" functionality
     * @param {Object} options a collection of options settings
     */
    fluid.undoDecorator = function (component, userOptions) {
        var that = fluid.initView("undo", null, userOptions);
        that.container = that.options.renderer(that, component.container);
        fluid.initDomBinder(that);
        fluid.tabindex(that.locate("undoControl"), 0);
        fluid.tabindex(that.locate("redoControl"), 0);
        
        that.component = component;
        that.initialModel = {};
        that.extremalModel = {};
        fluid.model.copyModel(that.initialModel, component.model);
        fluid.model.copyModel(that.extremalModel, component.model);
        
        that.state = STATE_INITIAL;
        refreshView(that);
        var listeners = bindHandlers(that);
        
        that.returnedOptions = {
            listeners: listeners
        };
        return that;
    };
  
    fluid.defaults("undo", {  
        selectors: {
            undoContainer: ".flc-undo-undoContainer",
            undoControl: ".flc-undo-undoControl",
            redoContainer: ".flc-undo-redoContainer",
            redoControl: ".flc-undo-redoControl"
        },
                    
        renderer: defaultRenderer
    });
        
})(jQuery, fluid_1_1);
/*
    json2.js
    2007-11-06

    Public Domain

    No warranty expressed or implied. Use at your own risk.

    See http://www.JSON.org/js.html

    This file creates a global JSON object containing two methods:

        JSON.stringify(value, whitelist)
            value       any JavaScript value, usually an object or array.

            whitelist   an optional that determines how object values are
                        stringified.

            This method produces a JSON text from a JavaScript value.
            There are three possible ways to stringify an object, depending
            on the optional whitelist parameter.

            If an object has a toJSON method, then the toJSON() method will be
            called. The value returned from the toJSON method will be
            stringified.

            Otherwise, if the optional whitelist parameter is an array, then
            the elements of the array will be used to select members of the
            object for stringification.

            Otherwise, if there is no whitelist parameter, then all of the
            members of the object will be stringified.

            Values that do not have JSON representaions, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped, in arrays will be replaced with null. JSON.stringify()
            returns undefined. Dates will be stringified as quoted ISO dates.

            Example:

            var text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'

        JSON.parse(text, filter)
            This method parses a JSON text to produce an object or
            array. It can throw a SyntaxError exception.

            The optional filter parameter is a function that can filter and
            transform the results. It receives each of the keys and values, and
            its return value is used instead of the original value. If it
            returns what it received, then structure is not modified. If it
            returns undefined then the member is deleted.

            Example:

            // Parse the text. If a key contains the string 'date' then
            // convert the value to a date.

            myData = JSON.parse(text, function (key, value) {
                return key.indexOf('date') >= 0 ? new Date(value) : value;
            });

    This is a reference implementation. You are free to copy, modify, or
    redistribute.

    Use your own copy. It is extremely unwise to load third party
    code into your pages.
*/

/*jslint evil: true */
/*extern JSON */

if (!this.JSON) {

    JSON = function () {

        function f(n) {    // Format integers to have at least two digits.
            return n < 10 ? '0' + n : n;
        }

        Date.prototype.toJSON = function () {

// Eventually, this method will be based on the date.toISOString method.

            return this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z';
        };


        var m = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        };

        function stringify(value, whitelist) {
            var a,          // The array holding the partial texts.
                i,          // The loop counter.
                k,          // The member key.
                l,          // Length.
                r = /["\\\x00-\x1f\x7f-\x9f]/g,
                v;          // The member value.

            switch (typeof value) {
            case 'string':

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe sequences.

                return r.test(value) ?
                    '"' + value.replace(r, function (a) {
                        var c = m[a];
                        if (c) {
                            return c;
                        }
                        c = a.charCodeAt();
                        return '\\u00' + Math.floor(c / 16).toString(16) +
                                                   (c % 16).toString(16);
                    }) + '"' :
                    '"' + value + '"';

            case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

                return isFinite(value) ? String(value) : 'null';

            case 'boolean':
            case 'null':
                return String(value);

            case 'object':

// Due to a specification blunder in ECMAScript,
// typeof null is 'object', so watch out for that case.

                if (!value) {
                    return 'null';
                }

// If the object has a toJSON method, call it, and stringify the result.

                if (typeof value.toJSON === 'function') {
                    return stringify(value.toJSON());
                }
                a = [];
                if (typeof value.length === 'number' &&
                        !(value.propertyIsEnumerable('length'))) {

// The object is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                    l = value.length;
                    for (i = 0; i < l; i += 1) {
                        a.push(stringify(value[i], whitelist) || 'null');
                    }

// Join all of the elements together and wrap them in brackets.

                    return '[' + a.join(',') + ']';
                }
                if (whitelist) {

// If a whitelist (array of keys) is provided, use it to select the components
// of the object.

                    l = whitelist.length;
                    for (i = 0; i < l; i += 1) {
                        k = whitelist[i];
                        if (typeof k === 'string') {
                            v = stringify(value[k], whitelist);
                            if (v) {
                                a.push(stringify(k) + ':' + v);
                            }
                        }
                    }
                } else {

// Otherwise, iterate through all of the keys in the object.

                    for (k in value) {
                        if (typeof k === 'string') {
                            v = stringify(value[k], whitelist);
                            if (v) {
                                a.push(stringify(k) + ':' + v);
                            }
                        }
                    }
                }

// Join all of the member texts together and wrap them in braces.

                return '{' + a.join(',') + '}';
            }
        }

        return {
            stringify: stringify,
            parse: function (text, filter) {
                var j;

                function walk(k, v) {
                    var i, n;
                    if (v && typeof v === 'object') {
                        for (i in v) {
                            if (Object.prototype.hasOwnProperty.apply(v, [i])) {
                                n = walk(i, v[i]);
                                if (n !== undefined) {
                                    v[i] = n;
                                }
                            }
                        }
                    }
                    return filter(k, v);
                }


// Parsing happens in three stages. In the first stage, we run the text against
// regular expressions that look for non-JSON patterns. We are especially
// concerned with '()' and 'new' because they can cause invocation, and '='
// because it can cause mutation. But just to be safe, we want to reject all
// unexpected forms.

// We split the first stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace all backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

                if (/^[\],:{}\s]*$/.test(text.replace(/\\./g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(:?[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the second stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                    j = eval('(' + text + ')');

// In the optional third stage, we recursively walk the new structure, passing
// each name/value pair to a filter function for possible transformation.

                    return typeof filter === 'function' ? walk('', j) : j;
                }

// If the text is not JSON parseable, then a SyntaxError is thrown.

                throw new SyntaxError('parseJSON');
            }
        };
    }();
}
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1, fluid*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {

    /****************
     * UI Enhancer  *
     ****************/

    /**
     * Searches within the container for things that match the selector and then replaces the classes 
     * that are matched by the regular expression with the new value. 
     * 
     * @param {Object} container
     * @param {Object} selector
     * @param {Object} regExp
     * @param {Object} newVal
     */
    var replaceClass = function (container, selector, regExp, newVal) {
        newVal = newVal || "";
        $(selector, container).andSelf().each(function (i) {
            var attr = ($.browser.msie === false) ? 'class' : 'className'; // TODO: does this need to happen inside the loop?
            if (this.getAttribute(attr)) {
                // The regular expression was required for speed
                this.setAttribute(attr, this.getAttribute(attr).replace(regExp, newVal));
            }
        });
        
    };
    
    /**
     * Adds the class related to the setting to the element
     * @param {jQuery} element
     * @param {String} settingName
     * @param {String} value
     * @param {Object} classnameMap
     */
    var addClassForSetting = function (element, settingName, value, classnameMap) {
        var settingValues = classnameMap[settingName] || {}; 
        var className = settingValues[value];
        if (className) {
            element.addClass(className);
        }
    };

    /**
     * Returns true if the value is true or the string "true", false otherwise
     * @param {Object} val
     */
    var isTrue = function (val) {
        return val && (val === true || val === "true");
    };
    
    /**
     * Shows the table of contents when tocSetting is "On". Hides the table of contents otherwise.
     * @param {Object} that
     * @param {Object} tocSetting
     */
    var setToc = function (that, tocSetting) {
        if (isTrue(tocSetting)) {
            if (that.tableOfContents) {
                that.tableOfContents.show();
            } else {
                that.tableOfContents = fluid.initSubcomponent(that, "tableOfContents", 
                        [that.container, fluid.COMPONENT_OPTIONS]);
            }
        } else {
            if (that.tableOfContents) {
                that.tableOfContents.hide();
            }
        }        
    };
    
    /**
     * Sets the line spacing on the container.  
     * @param {Object} container
     * @param {Object} spacing
     */
    var setLineSpacing = function (container, spacing) {
        spacing = spacing && spacing > 0 ? spacing : 1; 
        container.css("line-height", spacing + "em");
    };

    /**
     * Sets the font size on the container. Removes all fss classes that decrease font size. 
     * @param {Object} container
     * @param {Object} size
     */
    var setMinSize = function (container, size) {
        // TODO: fss font size class prefix is hardcoded here
		if (size && size > 0) {
            container.css("font-size", size + "pt");
            replaceClass(container, "[class*=fl-font-size-]", /\bfl-font-size-[0-9]{1,2}\s+/g, 'fl-font-size-100');
        } else {
            container.css("font-size", ""); // empty is same effect as not being set
        }
    };

    /**
     * Styles the container based on the settings passed in
     * 
     * @param {Object} container
     * @param {Object} settings
     * @param {Object} classnameMap
     */
    var addStyles = function (container, settings, classnameMap) {
        addClassForSetting(container, "textFont", settings.textFont, classnameMap);
        addClassForSetting(container, "textSpacing", settings.textSpacing, classnameMap);
        addClassForSetting(container, "theme", settings.theme, classnameMap);
        addClassForSetting(container, "layout", settings.layout, classnameMap);
    };
    
    /**
     * Adds or removes the classname to/from the elements based upon the setting.
     * @param {Object} elements
     * @param {Object} setting
     * @param {Object} classname
     */
    var styleElements = function (elements, setting, classname) {
        if (setting) {
            elements.addClass(classname);
        } else {
            elements.removeClass(classname);
        }        
    };
    
    /**
     * Style links in the container according to the settings
     * @param {Object} container
     * @param {Object} settings
     * @param {Object} classnameMap
     */
    var styleLinks = function (container, settings, classnameMap) {
        var links = $("a", container);
        // TODO: collect up the classnames and add or remove them all at once. 
        styleElements(links, settings.linksUnderline, classnameMap.linksUnderline);
        styleElements(links, settings.linksBold, classnameMap.linksBold);
        styleElements(links, settings.linksLarger, classnameMap.linksLarger);
    };

    /**
     * Style inputs in the container according to the settings
     * @param {Object} container
     * @param {Object} settings
     * @param {Object} classnameMap
     */
    var styleInputs = function (container, settings, classnameMap) {
        styleElements($("input", container), settings.inputsLarger, classnameMap.inputsLarger);
    };
     
    /**
     * Initialize the model first looking at options.savedSettings, then in the settingsStore and finally in the options.defaultSiteSettings
     * @param {Object} that
     */
    var initModel = function (that) {
        // First check for settings in the options
        if (that.options.savedSettings) {
            that.model = that.options.savedSettings;
            return;
        }
  
        // Use the settingsStore or the defaultSiteSettings if there are no settings
        that.model = that.settingsStore.fetch() || fluid.copy(that.defaultSiteSettings);        
    };

    /**
     * Clears FSS classes from within the container that may clash with the current settings.
     * These are the classes from the classnameMap for settings where we work on the container rather
     * then on individual elements.
     * @param {Object} that
     * @return {String} the classnames that were removed separated by spaces
     */
    var clearClashingClasses = function (container, classnameMap) {
        var settingsWhichMayClash = ["textFont", "textSpacing", "theme", "layout"];  // + no background images
        var classesToRemove =  "fl-noBackgroundImages";
        var selector = ".fl-noBackgroundImages";
        
        for (var i = 0; i < settingsWhichMayClash.length; i++) {
            var settingValues = classnameMap[settingsWhichMayClash[i]];
            for (var val in settingValues) {
                var classname = settingValues[val];
                if (classname) {
                    classesToRemove = classesToRemove + " " + classname;
                    selector = selector + ",." + classname;
                }
            }
        }
        
        $(selector, container).removeClass(classesToRemove);
        return classesToRemove;
    };
    
    var setupUIEnhancer = function (that) {
        that.settingsStore = fluid.initSubcomponent(that, "settingsStore", [fluid.COMPONENT_OPTIONS]); 
        initModel(that);
        that.refreshView();        
    };
      
    /**
     * Component that works in conjunction with FSS to transform the interface based on settings. 
     * @param {Object} doc
     * @param {Object} options
     */
    fluid.uiEnhancer = function (doc, options) {
        doc = doc || document;
        var that = fluid.initView("fluid.uiEnhancer", doc, options);
        $(doc).data("uiEnhancer", that);
        that.container = $("body", doc);
        that.defaultSiteSettings = that.options.defaultSiteSettings;
        
        var clashingClassnames;
        
        /**
         * Transforms the interface based on the settings in that.model
         */
        that.refreshView = function () {
            that.container.removeClass(clashingClassnames);
            addStyles(that.container, that.model, that.options.classnameMap);
            styleElements(that.container, !isTrue(that.model.backgroundImages), that.options.classnameMap.noBackgroundImages);
            setMinSize(that.container, that.model.textSize);
            setLineSpacing(that.container, that.model.lineSpacing);
            setToc(that, that.model.toc);
            styleLinks(that.container, that.model, that.options.classnameMap);
            styleInputs(that.container, that.model, that.options.classnameMap);
        };
        
        /**
         * Stores the new settings, refreshes the view to reflect the new settings and fires modelChanged.
         * @param {Object} newModel
         * @param {Object} source
         */
        that.updateModel = function (newModel, source) {
            that.events.modelChanged.fire(newModel, that.model, source);
            fluid.clear(that.model);
            fluid.model.copyModel(that.model, newModel);
            that.settingsStore.save(that.model);
            that.refreshView();
        };

        clashingClassnames = clearClashingClasses(that.container, that.options.classnameMap);
        setupUIEnhancer(that);
        return that;
    };

    fluid.defaults("fluid.uiEnhancer", {
        tableOfContents: {
            type: "fluid.tableOfContents",
            options: {
                templateUrl: "../../tableOfContents/html/TableOfContents.html"
            }
        },
        
        settingsStore: {
            type: "fluid.uiEnhancer.cookieStore"
        },
        
        events: {
            modelChanged: null
        },
        
        classnameMap: {
            "textFont": {
                "serif": "fl-font-serif",
                "sansSerif": "fl-font-sans",
                "arial": "fl-font-arial",
                "verdana": "fl-font-verdana",
                "monospace": "fl-font-monospace",
                "courier": "fl-font-courier",
                "times": "fl-font-times"
            },
            "textSpacing": {
                "default": "",
                "wide0": "fl-font-spacing-0",
                "wide1": "fl-font-spacing-1",
                "wide2": "fl-font-spacing-2",
                "wide3": "fl-font-spacing-3",
                "wide4": "fl-font-spacing-4",
                "wide5": "fl-font-spacing-5",
                "wide6": "fl-font-spacing-6"
            },
            "theme": {
                "mist": "fl-theme-mist",
                "rust": "fl-theme-rust",
                "highContrast": "fl-theme-hc",
                "highContrastInverted": "fl-theme-hci",
                "lowContrast": "fl-theme-slate",
                "mediumContrast": "fl-theme-coal",
                "default": ""
            },
            "layout": {
                "simple": "fl-layout-linear",
                "default": ""
            },
            "noBackgroundImages": "fl-noBackgroundImages",
            "linksUnderline": "fl-text-underline", 
            "linksBold": "fl-text-bold", 
            "linksLarger": "fl-text-larger", 
            "inputsLarger": "fl-text-larger"
        },
        defaultSiteSettings: {
            textFont: "",                 // key from classname map
            textSpacing: "",              // key from classname map
            theme: "default",             // key from classname map
            layout: "default",            // key from classname map
            textSize: "",                 // in points
            lineSpacing: "",              // in ems
            backgroundImages: true,       // boolean
            toc: false,                   // boolean
            linksUnderline: false,        // boolean
            linksBold: false,             // boolean
            linksLarger: false,           // boolean
            inputsLarger: false           // boolean
        }
    });
    
    /****************
     * Cookie Store *
     ****************/
     
    /**
     * SettingsStore Subcomponent that uses a cookie for persistence.
     * @param {Object} options
     */
    fluid.uiEnhancer.cookieStore = function (options) {
        var that = {};
        fluid.mergeComponentOptions(that, "fluid.uiEnhancer.cookieStore", options);
        
        /**
         * Retrieve and return the value of the cookie
         */
        that.fetch = function () {
            var cookie = document.cookie;
            var cookiePrefix = that.options.cookieName + "=";
            var retObj, startIndex, endIndex;
            
            if (cookie.length > 0) {
                startIndex = cookie.indexOf(cookiePrefix);
                if (startIndex > -1) { 
                    startIndex = startIndex + cookiePrefix.length; 
                    endIndex = cookie.indexOf(";", startIndex);
                    if (endIndex < startIndex) {
                        endIndex = cookie.length;
                    }
                    retObj = JSON.parse(decodeURIComponent(cookie.substring(startIndex, endIndex)));
                } 
            }
            
            return retObj;
        };

        /**
         * Saves the settings into a cookie
         * @param {Object} settings
         */
        that.save = function (settings) {
            document.cookie = that.options.cookieName + "=" +  encodeURIComponent(JSON.stringify(settings));
        };
    
        return that;
    };
    
    fluid.defaults("fluid.uiEnhancer.cookieStore", {
        cookieName: "fluid-ui-settings"
    });

    /**************
     * Temp Store *
     **************/

    /**
     * SettingsStore Subcomponent that doesn't do persistence.
     * @param {Object} options
     */
    fluid.uiEnhancer.tempStore = function (options) {
        var that = {};
        that.model = null;
         
        that.fetch = function () {
            return that.model;
        };

        that.save = function (settings) {
            that.model = settings;
        };
    
        return that;
    };

})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};


/******************
 * Textfield Slider *
 ******************/

(function ($, fluid) {
    
    // This will be removed once the jQuery UI slider has built in ARIA 
    var initSliderAria = function (thumb, opts) {
        var ariaDefaults = {role: 'slider',
         "aria-valuenow": opts.value,
         "aria-valuemin": opts.min, 
         "aria-valuemax": opts.max    
        };
        thumb.attr(ariaDefaults);        
    };
    
    var initTextfieldSlider = function (that) {
        var textfield = that.locate("textfield");
        textfield.val(that.model);

        var sliderOptions = that.options.sliderOptions;
        sliderOptions.value = that.model;
        sliderOptions.min = that.options.min;
        sliderOptions.max = that.options.max;
        var slider = that.locate("slider").slider(sliderOptions);

        initSliderAria(that.locate("thumb"), sliderOptions);    

        textfield.change(function () {
            if (that.isValid(this.value)) {
                if (!that.isInRange(this.value)) {
                    this.value = (this.value < that.min) ? that.min : that.max;
                }
                slider.slider("value", this.value);
                that.updateModel(this.value, this);
            }
            else {
                // handle invalid entry
                this.value = that.model;
            }
        });
        
        textfield.keypress(function (evt) {
            if (evt.keyCode !== $.ui.keyCode.ENTER) {
                return true;
            } 
            else {
                $(evt.target).change();
                $(fluid.findForm(evt.target)).submit();
                return false;
            }
        });

        slider.bind("slide", function (e, ui) {
            textfield.val(ui.value);
            that.updateModel(ui.value, slider);
        });
    };
    
    /**
     * A component that relates a textfield and a jQuery UI slider
     * @param {Object} container
     * @param {Object} options
     */
    fluid.textfieldSlider = function (container, options) {
        var that = fluid.initView("fluid.textfieldSlider", container, options);
        that.model = that.options.value || that.locate("textfield").val();
        that.min = that.options.min;
        that.max = that.options.max;
        
        initTextfieldSlider(that);
        
        /**
         * Tests if a value is within the min and max of the textfield slider
         * @param {Object} value
         */
        that.isInRange = function (value) {
            return (value >= that.min && value <= that.max);
        };

        /**
         * Tests if a value is a valid number.
         * @param {Object} value
         */
        that.isValid = function (value) {
            return !(isNaN(parseInt(value, 10)) || isNaN(value));
        };
        
        /**
         * Updates the model if it is in range. Fires model changed
         * @param {Object} model
         * @param {Object} source
         */
        that.updateModel = function (model, source) {
            if (that.isInRange(model)) {
                that.events.modelChanged.fire(model, that.model, source);
                that.model = model;
                that.locate("thumb").attr("aria-valuenow", that.model);                
            }
        };
        
        return that;
    };

    fluid.defaults("fluid.textfieldSlider", {
        selectors: {
            textfield: ".flc-textfieldSlider-field",
            slider: ".flc-textfieldSlider-slider", 
            thumb: ".ui-slider-handle"
        },
        events: {
            modelChanged: null
        },
        sliderOptions: {
            orientation: "horizontal"
        }, 
        min: 0,
        max: 100,
        value: null       
    });
    
})(jQuery, fluid_1_1);


/**************
 * UI Options *
 **************/

(function ($, fluid) {

//    TODO
//    - make the preview a subcomponent
//    - move the general renderer tree generation functions to the renderer
//    - add the min font size textfieldSlider to the renderer tree
//    - pull the strings out of the template and put them into the component?
//    - should the accordian be part of the component by default?

    var createSelectNode = function (id, selection, list, names) {
        return {
            ID: id,
            selection: {
                valuebinding: selection
            },
            optionlist: {
                valuebinding: list
            },
            optionnames: {
                valuebinding: names
            }
        };
    };
        
    var createSimpleBindingNode = function (id, binding) {
        return {
            ID: id,
            valuebinding: binding
        };
    };
    
    var generateTree = function (that, rendererModel) {
        var children = [];
        children.push(createSelectNode("text-font", "selections.textFont", "labelMap.textFont.values", "labelMap.textFont.names"));
        children.push(createSelectNode("text-spacing", "selections.textSpacing", "labelMap.textSpacing.values", "labelMap.textSpacing.names"));
        children.push(createSelectNode("theme", "selections.theme", "labelMap.theme.values", "labelMap.theme.names"));

        var bgiExplodeOpts = {
            selectID: "background-images",
            rowID: "background-images-row:",
            inputID: "background-images-choice",
            labelID: "background-images-label"
        };        
        children.push(createSelectNode("background-images", "selections.backgroundImages", "labelMap.backgroundImages.values", "labelMap.backgroundImages.names"));
        children = children.concat(fluid.explodeSelectionToInputs(that.options.controlValues.backgroundImages, bgiExplodeOpts));
        
        var layoutExplodeOpts = {
            selectID: "layout",
            rowID: "layout-row:",
            inputID: "layout-choice",
            labelID: "layout-label"
        };        
        children.push(createSelectNode("layout", "selections.layout", "labelMap.layout.values", "labelMap.layout.names"));
        children = children.concat(fluid.explodeSelectionToInputs(that.options.controlValues.layout, layoutExplodeOpts));

        var tocExplodeOpts = {
            selectID: "toc",
            rowID: "toc-row:",
            inputID: "toc-choice",
            labelID: "toc-label"
        };        
        children.push(createSelectNode("toc", "selections.toc", "labelMap.toc.values", "labelMap.toc.names"));
        children = children.concat(fluid.explodeSelectionToInputs(that.options.controlValues.layout, tocExplodeOpts));

        children.push(createSimpleBindingNode("links-underline", "selections.linksUnderline"));
        children.push(createSimpleBindingNode("links-bold", "selections.linksBold"));
        children.push(createSimpleBindingNode("links-larger", "selections.linksLarger"));
        children.push(createSimpleBindingNode("inputs-larger", "selections.inputsLarger"));
        
        return {
            children: children
        };
    };
    
    var bindHandlers = function (that) {
        var saveButton = that.locate("save");
        saveButton.click(that.save);
        that.locate("reset").click(that.reset);
        that.locate("cancel").click(that.cancel);
        var form = fluid.findForm(saveButton);
        $(form).submit(function () {
            that.save();
        });
    };
    
    var initPreview = function (that) {
        var previewFrame = that.locate("previewFrame");
        var previewEnhancer;
        
        that.events.modelChanged.addListener(function (model) {
            /**
             * Setimeout is temp fix for http://issues.fluidproject.org/browse/FLUID-2248
             */
            setTimeout(function () {
                if (previewEnhancer) {
                    previewEnhancer.updateModel(model);
                }
            }, 0);
        });

        previewFrame.load(function () {
            var previewFrameContents = previewFrame.contents();
            var options = {
                savedSettings: that.model,
                tableOfContents: that.uiEnhancer.options.tableOfContents,
                settingsStore: {
                    type: "fluid.uiEnhancer.tempStore"
                }
            };
            previewEnhancer = fluid.uiEnhancer(previewFrameContents, options);
        });        
        
    };
        
    var createLabelMap = function (options) {
        var labelMap = {};
        
        for (var item in options.controlValues) {
            labelMap[item] = {
                names: options.strings[item],
                values: options.controlValues[item]
            };
        }
        
        return labelMap;
    };

    var createRenderOptions = function (that) {
        // Turn the boolean select values into strings so they can be properly bound and rendered
        that.model.toc = String(that.model.toc);
        that.model.backgroundImages = String(that.model.backgroundImages);
        
        var aggregateModel = fluid.assembleModel({
            selections: {
                model: that.model,
                applier: that.applier
            },
            labelMap: {model: createLabelMap(that.options)}
        });
        
        return {
            model: aggregateModel.model,
            applier: aggregateModel.applier,
            autoBind: true
        };
    };
    
    var initSliders = function (that) {
        var createOptions = function (settingName) {
            return {
                listeners: {
                    modelChanged: function (value) {
                        that.applier.requestChange(settingName, value);
                    }
                },
                value: that.model[settingName]
            };    
        };
        
        var options = createOptions("textSize");
        fluid.merge(null, options, that.options.textMinSize.options);
        fluid.initSubcomponents(that, "textMinSize", [that.options.selectors.textMinSizeCtrl, options]);

        options = createOptions("lineSpacing");
        fluid.merge(null, options, that.options.lineSpacing.options);
        fluid.initSubcomponents(that, "lineSpacing", [that.options.selectors.lineSpacingCtrl, options]);
        
    };
        
    var mergeSiteDefaults = function (options, siteDefaults) {
        for (var settingName in options.controlValues) {
            var setting = String(siteDefaults[settingName]);
            var settingValues = options.controlValues[settingName];
            
            if (setting) {
                var index = $.inArray(setting, settingValues);
                if (index === -1) {
                    var defaultIndex = $.inArray("default", settingValues);
                    if (defaultIndex === -1) {
                        settingValues.push(setting);
                    } else {
                        settingValues[defaultIndex] = setting;
                    }
                }
            }
        }
    };
    
    var setupUIOptions = function (that) {
        that.applier.modelChanged.addListener("*",
            function (newModel, oldModel, changeRequest) {
                that.events.modelChanged.fire(newModel, oldModel, changeRequest.source);
            }
        );
            
        mergeSiteDefaults(that.options, that.uiEnhancer.defaultSiteSettings);
        
        // TODO: This stuff should already be in the renderer tree
        that.events.afterRender.addListener(function () {
            initSliders(that);
            bindHandlers(that);
            initPreview(that);
        });
        
        var rendererOptions = createRenderOptions(that);
        var template = fluid.selfRender(that.container, generateTree(that, rendererOptions.model), rendererOptions);
     
        that.events.afterRender.fire();
            
        return template;
    };
    
    /**
     * A component that works in conjunction with the UI Enhancer component and the Fluid Skinning System (FSS) 
     * to allow users to set personal user interface preferences. The UI Options component provides a user 
     * interface for setting and saving personal preferences, and the UI Enhancer component carries out the 
     * work of applying those preferences to the user interface.
     * 
     * @param {Object} container
     * @param {Object} options
     */
    fluid.uiOptions = function (container, options) {
        var that = fluid.initView("fluid.uiOptions", container, options);
        that.uiEnhancer = $(document).data("uiEnhancer");
        that.model = fluid.copy(that.uiEnhancer.model);
        that.applier = fluid.makeChangeApplier(that.model);

        // TODO: we shouldn't need the savedModel and should use the uiEnhancer.model instead
        var savedModel = that.uiEnhancer.model;
        var template;
 
        /**
         * Saves the current model and fires onSave
         */ 
        that.save = function () {
            that.events.onSave.fire(that.model);
            savedModel = fluid.copy(that.model); 
            that.uiEnhancer.updateModel(savedModel);
        };

        /**
         * Resets the selections to the integrator's defaults and fires onReset
         */
        that.reset = function () {
            that.events.onReset.fire();
            that.updateModel(fluid.copy(that.uiEnhancer.defaultSiteSettings), that);
            that.refreshView();
        };
        
        /**
         * Resets the selections to the last saved selections and fires onCancel
         */
        that.cancel = function () {
            that.events.onCancel.fire();
            that.updateModel(fluid.copy(savedModel), that);
            that.refreshView();            
        };
        
        /**
         * Rerenders the UI and fires afterRender
         */
        that.refreshView = function () {
            var rendererOptions = createRenderOptions(that);
            fluid.reRender(template, that.container, generateTree(that, rendererOptions.model), rendererOptions);
            that.events.afterRender.fire();
        };
        
        /**
         * Updates the model and fires modelChanged
         * 
         * @param {Object} newModel
         * @param {Object} source
         */
        that.updateModel = function (newModel, source) {
            that.events.modelChanged.fire(newModel, that.model, source);
            fluid.clear(that.model);
            fluid.model.copyModel(that.model, newModel);
        };
        
        template = setupUIOptions(that);

        return that;   
    };

    fluid.defaults("fluid.uiOptions", {
        textMinSize: {
            type: "fluid.textfieldSlider",
            options: {
                min: 6,
                max: 30
            }
        },
        lineSpacing: {
            type: "fluid.textfieldSlider",
            options: {
                min: 1,
                max: 10
            }
        },
        selectors: {
            controls: ".flc-uiOptions-control",
            textMinSizeCtrl: ".flc-uiOptions-min-text-size",
            lineSpacingCtrl: ".flc-uiOptions-line-spacing",
            cancel: ".flc-uiOptions-cancel",
            reset: ".flc-uiOptions-reset",
            save: ".flc-uiOptions-save",
            previewFrame : ".flc-uiOptions-preview-frame"
        },
        events: {
            modelChanged: null,
            onSave: null,
            onCancel: null,
            onReset: null,
            afterRender: null
        },
        strings: {
            textFont: ["Serif", "Sans-Serif", "Arial", "Verdana", "Courier", "Times"],
            textSpacing: ["Regular", "Wide", "Wider", "Widest"],
            theme: ["Low Contrast", "Medium Contrast", "Medium Contrast Grey Scale", "High Contrast", "High Contrast Inverted"],
            backgroundImages: ["Yes", "No"],
            layout: ["Yes", "No"],
            toc: ["Yes", "No"]
        },
        controlValues: { 
            textFont: ["serif", "sansSerif", "arial", "verdana", "courier", "times"],
            textSpacing: ["default", "wide1", "wide2", "wide3"],
            theme: ["lowContrast", "default", "mediumContrast", "highContrast", "highContrastInverted"],
            backgroundImages: ["true", "false"],
            layout: ["simple", "default"],
            toc: ["true", "false"]
        }
    });

})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {

    /******************
     * Pager Bar View *
     ******************/

    
    function updateStyles(pageListThat, newModel, oldModel) {
        if (!pageListThat.pageLinks) {
            return;
        }
        if (oldModel.pageIndex !== undefined) {
            var oldLink = pageListThat.pageLinks.eq(oldModel.pageIndex);
            oldLink.removeClass(pageListThat.options.styles.currentPage);
        }
        var pageLink = pageListThat.pageLinks.eq(newModel.pageIndex);
        pageLink.addClass(pageListThat.options.styles.currentPage); 


    }
    
    function bindLinkClick(link, events, eventArg) {
        link.unbind("click.fluid.pager");
        link.bind("click.fluid.pager", function () {events.initiatePageChange.fire(eventArg); });
    }
    
    // 10 -> 1, 11 -> 2
    function computePageCount(model) {
        model.pageCount = Math.max(1, Math.floor((model.totalRange - 1) / model.pageSize) + 1);
    }
    
    function computePageLimit(model) {
        return Math.min(model.totalRange, (model.pageIndex + 1) * model.pageSize);
    }

    fluid.pager = function () {
        return fluid.pagerImpl.apply(null, arguments);
    };
    
    fluid.pager.directPageList = function (container, events, options) {
        var that = fluid.initView("fluid.pager.directPageList", container, options);
        that.pageLinks = that.locate("pageLinks");
        for (var i = 0; i < that.pageLinks.length; ++ i) {
            var pageLink = that.pageLinks.eq(i);
            bindLinkClick(pageLink, events, {pageIndex: i});
        }
        events.onModelChange.addListener(
            function (newModel, oldModel) {
                updateStyles(that, newModel, oldModel);
            }
        );
        that.defaultModel = {
            pageIndex: undefined,
            pageSize: 1,
            totalRange: that.pageLinks.length
        };
        return that;
    };
    
    /** Returns an array of size count, filled with increasing integers, 
     *  starting at 0 or at the index specified by first. 
     */
    
    fluid.iota = function (count, first) {
        first = first || 0;
        var togo = [];
        for (var i = 0; i < count; ++ i) {
            togo[togo.length] = first++;
        }
        return togo;
    };
    
    fluid.pager.everyPageStrategy = fluid.iota;
    
    fluid.pager.gappedPageStrategy = function (locality, midLocality) {
        if (!locality) {
            locality = 3;
        }
        if (!midLocality) {
            midLocality = locality;
        }
        return function (count, first, mid) {
            var togo = [];
            var j = 0;
            var lastSkip = false;
            for (var i = 0; i < count; ++ i) {
                if (i < locality || (count - i - 1) < locality || (i >= mid - midLocality && i <= mid + midLocality)) {
                    togo[j++] = i;
                    lastSkip = false;
                }
                else if (!lastSkip) {
                    togo[j++] = -1;
                    lastSkip = true;
                }
            }
            return togo;
        };
    };
    
    fluid.pager.renderedPageList = function (container, events, pagerBarOptions, options, strings) {
        options = $.extend(true, pagerBarOptions, options);
        var that = fluid.initView("fluid.pager.renderedPageList", container, options);
        options = that.options; // pick up any defaults
        var renderOptions = {
            cutpoints: [ {
                id: "page-link:link",
                selector: pagerBarOptions.selectors.pageLinks
            },
            {
                id: "page-link:skip",
                selector: pagerBarOptions.selectors.pageLinkSkip
            },
            {
                id: "page-link:disabled",
                selector: pagerBarOptions.selectors.pageLinkDisabled
            }]
        };
        
        if (options.linkBody) {
            renderOptions.cutpoints[renderOptions.cutpoints.length] = {
                id: "payload-component",
                selector: options.linkBody
            };
        }        
        function pageToComponent(current) {
            return function (page) {
                return page === -1? {
                    ID: "page-link:skip"
                } : 
                {
                    ID: page === current? "page-link:link": "page-link:link",
                    localID: page + 1,
                    value: page + 1,
                    pageIndex: page,
                    decorators: [
                        {type: "jQuery",
                             func: "click", 
                             args: function () {events.initiatePageChange.fire({pageIndex: page}); }
                         },
                        {type: page === current? "addClass" : "",
                             classes: that.options.styles.currentPage}
                         ]
                };
            };
        }
        var root = that.locate("root");
        fluid.expectFilledSelector(root, "Error finding root template for fluid.pager.renderedPageList");
        
        var template = fluid.selfRender(root, {}, renderOptions);
        events.onModelChange.addListener(
            function (newModel, oldModel) {
                var pages = that.options.pageStrategy(newModel.pageCount, 0, newModel.pageIndex);
                var pageTree = fluid.transform(pages, pageToComponent(newModel.pageIndex));
                pageTree[pageTree.length - 1].value = pageTree[pageTree.length - 1].value + strings.last;
                events.onRenderPageLinks.fire(pageTree, newModel);
                fluid.reRender(template, root, pageTree, renderOptions);
                updateStyles(that, newModel, oldModel);
            }
        );
        return that;
    };
    
    fluid.defaults("fluid.pager.renderedPageList",
        {
            selectors: {
                root: ".flc-pager-links"
            },
            linkBody: "a",
            pageStrategy: fluid.pager.everyPageStrategy
        }
    );
    
    var updatePreviousNext = function (that, options, newModel) {
        if (newModel.pageIndex === 0) {
            that.previous.addClass(options.styles.disabled);
        } else {
            that.previous.removeClass(options.styles.disabled);
        }
        
        if (newModel.pageIndex === newModel.pageCount - 1) {
            that.next.addClass(options.styles.disabled);
        } else {
            that.next.removeClass(options.styles.disabled);
        }
    };
    
    fluid.pager.previousNext = function (container, events, options) {
        var that = fluid.initView("fluid.pager.previousNext", container, options);
        that.previous = that.locate("previous");
        bindLinkClick(that.previous, events, {relativePage: -1});
        that.next = that.locate("next");
        bindLinkClick(that.next, events, {relativePage: +1});
        events.onModelChange.addListener(
            function (newModel, oldModel, overallThat) {
                updatePreviousNext(that, options, newModel);
            }
        );
        return that;
    };

    fluid.pager.pagerBar = function (events, container, options, strings) {
        var that = fluid.initView("fluid.pager.pagerBar", container, options);
        that.pageList = fluid.initSubcomponent(that, "pageList", 
           [container, events, that.options, fluid.COMPONENT_OPTIONS, strings]);
        that.previousNext = fluid.initSubcomponent(that, "previousNext", 
           [container, events, that.options, fluid.COMPONENT_OPTIONS, strings]);
        
        return that;
    };

    
    fluid.defaults("fluid.pager.pagerBar", {
            
        previousNext: {
            type: "fluid.pager.previousNext"
        },
        
        pageList: {
            type: "fluid.pager.directPageList"
        },
        
        selectors: {
            pageLinks: ".flc-pager-pageLink",
            pageLinkSkip: ".flc-pager-pageLink-skip",
            pageLinkDisabled: ".flc-pager-pageLink-disabled",
            previous: ".flc-pager-previous",
            next: ".flc-pager-next"
        },
        
        styles: {
            currentPage: "fl-pager-currentPage",
            disabled: "fl-pager-disabled"
        }
    });

    function getColumnDefs(that) {
        return that.options.columnDefs;
    }

    fluid.pager.findColumnDef = function (columnDefs, key) {
        var columnDef = $.grep(columnDefs, function (def) {
            return def.key === key;
        })[0];
        return columnDef;
    };
    
    function getRoots(target, overallThat, index) {
        var cellRoot = (overallThat.options.dataOffset? overallThat.options.dataOffset + ".": "");
        target.shortRoot = index;
        target.longRoot = cellRoot + target.shortRoot;
    }
    
    function expandPath(EL, shortRoot, longRoot) {
        if (EL.charAt(0) === "*") {
            return longRoot + EL.substring(1); 
        }
        else {
            return EL.replace("*", shortRoot);
        }
    }
    
    fluid.pager.fetchValue = function (that, dataModel, index, valuebinding, roots) {
        getRoots(roots, that, index);

        var path = expandPath(valuebinding, roots.shortRoot, roots.longRoot);
        return fluid.model.getBeanValue(dataModel, path);
    };
    
    fluid.pager.basicSorter = function (overallThat, model) {        
        var dataModel = overallThat.options.dataModel;
        var roots = {};
        var columnDefs = getColumnDefs(overallThat);
        var columnDef = fluid.pager.findColumnDef(columnDefs, model.sortKey);
        var sortrecs = [];
        for (var i = 0; i < model.totalRange; ++ i) {
            sortrecs[i] = {
                index: i,
                value: fluid.pager.fetchValue(overallThat, dataModel, i, columnDef.valuebinding, roots)
            };
        }
        var columnType = typeof sortrecs[0].value;
        function sortfunc(arec, brec) {
            var a = arec.value;
            var b = brec.value;
            return a === b? 0 : (a > b? model.sortDir : -model.sortDir); 
        }
        sortrecs.sort(sortfunc);
        return fluid.transform(sortrecs, function (row) {return row.index; });
    };

    
    fluid.pager.directModelFilter = function (model, pagerModel, perm) {
        var togo = [];
        var limit = computePageLimit(pagerModel);
        for (var i = pagerModel.pageIndex * pagerModel.pageSize; i < limit; ++ i) {
            var index = perm? perm[i]: i;
            togo[togo.length] = {index: index, row: model[index]};
        }
        return togo;
    };
    
    function expandVariables(value, opts) {
        var togo = "";
        var index = 0;
        while (true) {
            var nextindex = value.indexOf("${", index);
            if (nextindex === -1) {
                togo += value.substring(index);
                break;
            }
            else {
                togo += value.substring(index, nextindex);
                var endi = value.indexOf("}", nextindex + 2);
                var EL = value.substring(nextindex + 2, endi);
                if (EL === "VALUE") {
                    EL = opts.EL;
                }
                else {
                    EL = expandPath(EL, opts.shortRoot, opts.longRoot);
                }

                var val = fluid.model.getBeanValue(opts.dataModel, EL);
                togo += val;
                index = endi + 1;
            }
        }
        return togo;
    }
   
    function expandPaths(target, tree, opts) {
        for (var i in tree) {
            var val = tree[i];
            if (val === fluid.VALUE) {
                if (i === "valuebinding") {
                    target[i] = opts.EL;
                }
                else {
                    target[i] = {"valuebinding" : opts.EL};
                }
            }
            else if (i === "valuebinding") {
                target[i] = expandPath(tree[i], opts);
            }
            else if (typeof(val) === 'object') {
                target[i] = val.length !== undefined? [] : {};
                expandPaths(target[i], val, opts);
            }
            else if (typeof(val) === 'string') {
                target[i] = expandVariables(val, opts);
            }
            else {target[i] = tree[i]; }
        }
        return target;
    }
   
   // sets opts.EL, returns ID
    function iDforColumn(columnDef, opts) {
        var options = opts.options;
        var EL = columnDef.valuebinding;
        var key = columnDef.key;
        if (!EL) {
            fluid.fail("Error in definition for column with key " + key + ": valuebinding is not set");
        }
        opts.EL = expandPath(EL, opts.shortRoot, opts.longRoot);
        if (!key) {
            var segs = fluid.model.parseEL(EL);
            key = segs[segs.length - 1];
        }
        var ID = (options.keyPrefix? options.keyPrefix : "") + key;
        return ID;
    }
   
    function expandColumnDefs(filteredRow, opts) {
        var tree = fluid.transform(opts.columnDefs, function (columnDef) {
            var ID = iDforColumn(columnDef, opts);
            var togo;
            if (!columnDef.components) {
                return {
                    ID: ID,
                    valuebinding: opts.EL
                };
            }
            else if (typeof columnDef.components === 'function') {
                togo = columnDef.components(filteredRow.row, filteredRow.index);
            }
            else {
                togo = columnDef.components;
            }
            togo = expandPaths({}, togo, opts);
            togo.ID = ID;
            return togo;
        });
        return tree;
    }
   
    function fetchModel(overallThat) {
        return fluid.model.getBeanValue(overallThat.options.dataModel, 
            overallThat.options.dataOffset);
    }
   
    
    function bigHeaderForKey(key, opts) {
        var id = opts.options.renderOptions.idMap["header:" + key];
        var smallHeader = fluid.jById(id);
        if (smallHeader.length === 0) {return null; }
        var headerSortStylisticOffset = opts.overallOptions.selectors.headerSortStylisticOffset;
        var bigHeader = fluid.findAncestor(smallHeader, function (element) {
            return $(element).is(headerSortStylisticOffset); });
        return bigHeader;
    }
   
    function setSortHeaderClass(styles, element, sort) {
        element = $(element);
        element.removeClass(styles.ascendingHeader);
        element.removeClass(styles.descendingHeader);
        if (sort !== 0) {
            element.addClass(sort === 1? styles.ascendingHeader : styles.descendingHeader);
        }
    }
    
    function isCurrentColumnSortable(columnDefs, model) {
        var columnDef = model.sortKey? fluid.pager.findColumnDef(columnDefs, model.sortKey) : null;
        return columnDef ? columnDef.sortable : false;
    };
    
    function setModelSortHeaderClass(newModel, opts) {
        var styles = opts.overallOptions.styles;
        var sort = isCurrentColumnSortable(opts.columnDefs, newModel) ? newModel.sortDir : 0;
        setSortHeaderClass(styles, bigHeaderForKey(newModel.sortKey, opts), sort);
    }
   
    function fireModelChange(that, newModel, forceUpdate) {
        computePageCount(newModel);
        if (newModel.pageIndex >= newModel.pageCount) {
            newModel.pageIndex = newModel.pageCount - 1;
        }
        if (forceUpdate || newModel.pageIndex !== that.model.pageIndex || newModel.pageSize !== that.model.pageSize || newModel.sortKey !== that.model.sortKey ||
                newModel.sortDir !== that.model.sortDir) {
            var sorted = isCurrentColumnSortable(getColumnDefs(that), newModel) ? 
                that.options.sorter(that, newModel) : null;
            that.permutation = sorted;
            that.events.onModelChange.fire(newModel, that.model, that);
            fluid.model.copyModel(that.model, newModel);
        }            
    }
 
    function generateColumnClick(overallThat, columnDef, opts) {
        return function () {
            if (columnDef.sortable === true) {
                var model = overallThat.model;
                var newModel = fluid.copy(model);
                var styles = overallThat.options.styles;
                var oldKey = model.sortKey;
                if (columnDef.key !== model.sortKey) {
                    newModel.sortKey = columnDef.key;
                    newModel.sortDir = 1;
                    var oldBig = bigHeaderForKey(oldKey, opts);
                    if (oldBig) {
                        setSortHeaderClass(styles, oldBig, 0);
                    }
                }
                else if (newModel.sortKey === columnDef.key) {
                    newModel.sortDir = -1 * newModel.sortDir;
                }
                else {return false; }
                newModel.pageIndex = 0;
                fireModelChange(overallThat, newModel, true);
                setModelSortHeaderClass(newModel, opts);                
            }
            return false;
        };
    }
   
    function fetchHeaderDecorators(decorators, columnDef) {
        return decorators[columnDef.sortable? "sortableHeader" : "unsortableHeader"];
    }
   
    function generateHeader(overallThat, newModel, columnDefs, opts) {
        return {
            children:  
                fluid.transform(columnDefs, function (columnDef) {
                return {
                    ID: iDforColumn(columnDef, opts),
                    value: columnDef.label,
                    decorators: [
                        {"jQuery": ["click", generateColumnClick(overallThat, columnDef, opts)]},
                        {identify: "header:" + columnDef.key}].concat(fetchHeaderDecorators(opts.overallOptions.decorators, columnDef))
                };
            }
       )};
    }
   
    /** A body renderer implementation which uses the Fluid renderer to render a table section **/
   
    fluid.pager.selfRender = function (overallThat, inOptions) {
        var that = fluid.initView("fluid.pager.selfRender", overallThat.container, inOptions);
        var options = that.options;
        options.renderOptions.idMap = options.renderOptions.idMap || {};
        var idMap = options.renderOptions.idMap;
        var root = that.locate("root");
        var template = fluid.selfRender(root, {}, options.renderOptions);
        root.addClass(options.styles.root);
        var columnDefs = getColumnDefs(overallThat);
        var expOpts = {options: options, columnDefs: columnDefs, overallOptions: overallThat.options, dataModel: overallThat.options.dataModel, idMap: idMap};
        var directModel = fetchModel(overallThat);

        return {
            returnedOptions: {
                listeners: {
                    onModelChange: function (newModel, oldModel) {
                        var filtered = overallThat.options.modelFilter(directModel, newModel, overallThat.permutation);
                        var tree = fluid.transform(filtered, 
                            function (filteredRow) {
                                var roots = getRoots(expOpts, overallThat, filteredRow.index);
                                if (columnDefs === "explode") {
                                    return fluid.explode(filteredRow.row, root);
                                }
                                else if (columnDefs.length) {
                                    return expandColumnDefs(filteredRow, expOpts);
                                }
                            }
                            );
                        var fullTree = {};
                        fullTree[options.row] = tree;
                        if (typeof(columnDefs) === "object") {
                            fullTree[options.header] = generateHeader(overallThat, newModel, columnDefs, expOpts);
                        }
                        options.renderOptions = options.renderOptions || {};
                        options.renderOptions.model = expOpts.dataModel;
                        fluid.reRender(template, root, fullTree, options.renderOptions);
                        setModelSortHeaderClass(newModel, expOpts); // TODO, should this not be actually renderable?
                    }
                }
            }
        };
    };

    fluid.defaults("fluid.pager.selfRender", {
        selectors: {
            root: ".flc-pager-body-template"
        },
		
		styles: {
			root: "fl-pager"
        },
		
        keyStrategy: "id",
        keyPrefix: "",
        row: "row:",
        header: "header:",
        // Options passed upstream to the renderer
        renderOptions: {}
    });


    fluid.pager.summary = function (dom, options) {
        var node = dom.locate("summary");
        return {
            returnedOptions: {
                listeners: {
                    onModelChange: function (newModel, oldModel) {
                        var text = fluid.stringTemplate(options.message, {
                            first: newModel.pageIndex * newModel.pageSize + 1,
                            last: computePageLimit(newModel),
                            total: newModel.totalRange
                        });
                        if (node.length > 0) {
                            node.text(text);
                        }
                    }
                }
            }
        };
    };
    
    fluid.pager.directPageSize = function (that) {
        var node = that.locate("pageSize");
        if (node.length > 0) {
            that.events.onModelChange.addListener(
                function (newModel, oldModel) {
                    if (node.val() !== newModel.pageSize) {
                        node.val(newModel.pageSize);
                    }
                }
            );
            node.change(function () {
                that.events.initiatePageSizeChange.fire(node.val());
            });
        }
        return that;
    };


    fluid.pager.rangeAnnotator = function (that, options) {
        var roots = {};
        that.events.onRenderPageLinks.addListener(function (tree, newModel) {
            var column = that.options.annotateColumnRange;
            var dataModel = that.options.dataModel;
            // TODO: reaching into another component's options like this is a bit unfortunate
            var columnDefs = getColumnDefs(that);

            if (!column || !dataModel || !columnDefs) {
                return;
            }
            var columnDef = fluid.pager.findColumnDef(columnDefs, column);
            
            function fetchValue(index) {
                index = that.permutation? that.permutation[index] : index;
                return fluid.pager.fetchValue(that, dataModel, index, columnDef.valuebinding, roots);
            }
            var tModel = {};
            fluid.model.copyModel(tModel, newModel);
            
            fluid.transform(tree, function (cell) {
                if (cell.ID === "page-link:link") {
                    var page = cell.pageIndex;
                    var start = page * tModel.pageSize;
                    tModel.pageIndex = page;
                    var limit = computePageLimit(tModel);
                    var iValue = fetchValue(start);
                    var lValue = fetchValue(limit - 1);
                    
                    var text = "<b>" + iValue + "</b><br/>&mdash;<br/><b>" + lValue + "</b>";
                    
                    var decorator = {
                        type: "jQuery",
                        func: "tooltip",
                        args: {
                            delay: that.options.tooltipDelay,
                            extraClass: that.options.styles.tooltip,
                            bodyHandler: function () { 
                                return text; 
                            },
                            showURL: false,
                            id: that.options.tooltipId
                        }
                    };
                    cell.decorators.push(decorator);
                }
            });
        });
    };

    /*******************
     * Pager Component *
     *******************/
    
    fluid.pagerImpl = function (container, options) {
        var that = fluid.initView("fluid.pager", container, options);
        
        var pageIndexConformer = function (model, changeRequest) {
            if (changeRequest.value < 0) {
                changeRequest.value = 0;
            }
        };
        
        that.events.initiatePageChange.addListener(
            function (arg) {
                var newModel = fluid.copy(that.model);
                if (arg.relativePage !== undefined) {
                    newModel.pageIndex = that.model.pageIndex + arg.relativePage;
                }
                else {
                    newModel.pageIndex = arg.pageIndex;
                }
                if (newModel.pageIndex === undefined || newModel.pageIndex < 0) {
                    newModel.pageIndex = 0;
                }
                fireModelChange(that, newModel, arg.forceUpdate);
            }
        );
        
        that.events.initiatePageSizeChange.addListener(
            function (arg) {
                var newModel = fluid.copy(that.model);
                newModel.pageSize = arg;
                fireModelChange(that, newModel);     
            }
            );

        // Setup the top and bottom pager bars.
        var pagerBarElement = that.locate("pagerBar");
        if (pagerBarElement.length > 0) {
            that.pagerBar = fluid.initSubcomponent(that, "pagerBar", 
            [that.events, pagerBarElement, fluid.COMPONENT_OPTIONS, that.options.strings]);
        }
        
        var pagerBarSecondaryElement = that.locate("pagerBarSecondary");
        if (pagerBarSecondaryElement.length > 0) {
            that.pagerBarSecondary = fluid.initSubcomponent(that, "pagerBar",
               [that.events, pagerBarSecondaryElement, fluid.COMPONENT_OPTIONS, that.options.strings]);
        }
 
        that.bodyRenderer = fluid.initSubcomponent(that, "bodyRenderer", [that, fluid.COMPONENT_OPTIONS]);
        
        that.summary = fluid.initSubcomponent(that, "summary", [that.dom, fluid.COMPONENT_OPTIONS]);
        
        that.pageSize = fluid.initSubcomponent(that, "pageSize", [that]);
        
        that.rangeAnnotator = fluid.initSubcomponent(that, "rangeAnnotator", [that, fluid.COMPONENT_OPTIONS]);
 
        that.model = fluid.copy(that.options.model);
        
        var dataModel = fetchModel(that);
        if (dataModel) {
            that.model.totalRange = dataModel.length;
        }
        if (that.model.totalRange === undefined) {
            if (!that.pagerBar) {
                fluid.fail("Error in Pager configuration - cannot determine total range, " +
                " since not configured in model.totalRange and no PagerBar is configured");
            }
            that.model = that.pagerBar.pageList.defaultModel;
        }
        that.applier = fluid.makeChangeApplier(that.model);

        that.events.initiatePageChange.fire({pageIndex: that.model.pageIndex? that.model.pageIndex: 0, 
           forceUpdate: true});

        return that;
    };
    
    fluid.defaults("fluid.pager", {
        pagerBar: {type: "fluid.pager.pagerBar", 
            options: null},
        
        summary: {type: "fluid.pager.summary", options: {
            message: "%first-%last of %total items"
        }},
        
        pageSize: {
            type: "fluid.pager.directPageSize"
        },
        
        modelFilter: fluid.pager.directModelFilter,
        
        sorter: fluid.pager.basicSorter,
        
        bodyRenderer: {
            type: "fluid.emptySubcomponent"
        },
        
        model: {
            pageIndex: undefined,
            pageSize: 10,
            totalRange: undefined
        },
        
        dataModel: undefined,
        // Offset of the tree's "main" data from the overall dataModel root
        dataOffset: "",
        
        // strategy for generating a tree row, either "explode" or an array of columnDef objects
        columnDefs: "explode",
        
        annotateColumnRange: undefined,
        
        tooltipDelay: 300,
        
        tooltipId: "tooltip",
        
        rangeAnnotator: {
            type: "fluid.pager.rangeAnnotator"
        },
        
        selectors: {
            pagerBar: ".flc-pager-top",
            pagerBarSecondary: ".flc-pager-bottom",
            summary: ".flc-pager-summary",
            pageSize: ".flc-pager-page-size",
            headerSortStylisticOffset: ".flc-pager-sort-header"
        },
        
        styles: {
            tooltip: "fl-pager-tooltip",
            ascendingHeader: "fl-pager-asc",
            descendingHeader: "fl-pager-desc"
        },
        
        decorators: {
            sortableHeader: [],
            unsortableHeader: []
        },
        
        strings: {
            last: " (last)"
        },
        
        events: {
            initiatePageChange: null,
            initiatePageSizeChange: null,
            onModelChange: null,
            onRenderPageLinks: null
        }
    });
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {
    
    function sendKey(control, event, virtualCode, charCode) {
        var kE = document.createEvent("KeyEvents");
        kE.initKeyEvent(event, 1, 1, null, 0, 0, 0, 0, virtualCode, charCode);
        control.dispatchEvent(kE);
    }
    
    /** Set the caret position to the end of a text field's value, also taking care
     * to scroll the field so that this position is visible.
     * @param {DOM node} control The control to be scrolled (input, or possibly textarea)
     * @param value The current value of the control
     */
    fluid.setCaretToEnd = function (control, value) {
        var pos = value? value.length : 0;

        try {
            control.focus();
        // see http://www.quirksmode.org/dom/range_intro.html - in Opera, must detect setSelectionRange first, 
        // since its support for Microsoft TextRange is buggy
            if (control.setSelectionRange) {

                control.setSelectionRange(pos, pos);
                if ($.browser.mozilla && pos > 0) {
                  // ludicrous fix for Firefox failure to scroll to selection position, inspired by
                  // http://bytes.com/forum/thread496726.html
                    sendKey(control, "keypress", 92, 92); // type in a junk character
                    sendKey(control, "keydown", 8, 0); // delete key must be dispatched exactly like this
                    sendKey(control, "keypress", 8, 0);
                }
            }

            else if (control.createTextRange) {
                var range = control.createTextRange();
                range.move("character", pos);
                range.select();
            }
        }
        catch (e) {} 
    };
    
    fluid.deadMansBlur = function (control, exclusions, handler) {
        var blurPending = false;
        $(control).blur(function () {
            blurPending = true;
            setTimeout(function () {
                if (blurPending) {
                    handler(control);
                }
            }, 150);
        });
        var canceller = function () {blurPending = false; };
        exclusions.focus(canceller);
        exclusions.click(canceller);
    };
    
    var renderEditContainer = function (that, really) {
        // If an edit container is found in the markup, use it. Otherwise generate one based on the view text.
        that.editContainer = that.locate("editContainer");
        that.editField = that.locate("edit");
        if (that.editContainer.length !== 1) {
            if (that.editField.length === 1) {
                // if all the same we found a unique edit field, use it as both container and field (FLUID-844) 
                that.editContainer = that.editField;
            }
            else if (that.editContainer.length > 1) {
                fluid.fail("InlineEdit did not find a unique container for selector " + that.options.selectors.editContainer +
                   ": " + fluid.dumpEl(that.editContainer));
            }
        }
        if (that.editContainer.length === 1 && !that.editField) {
            that.editField = that.locate("edit", that.editContainer);
        }
        if (!really) {return; } // do not invoke the renderer, unless this is the "final" effective time
        var editElms = that.options.editModeRenderer(that);
        if (editElms) {
            that.editContainer = editElms.container;
            that.editField = editElms.field;
        }
        
        if (that.editField.length === 0) {
            fluid.fail("InlineEdit improperly initialised - editField could not be located (selector " + that.options.selectors.edit + ")");
        }
    };
    
    var switchToViewMode = function (that) {    
        that.editContainer.hide();
        that.viewEl.show();
    };
    
    var cancel = function (that) {
        if (that.isEditing()) {
            // Roll the edit field back to its old value and close it up.
            that.editView.value(that.model.value);
            switchToViewMode(that);
        }
    };
    
    var finish = function (that) {
        var newValue = that.editView.value();
        var oldValue = that.model.value;

        var viewNode = that.viewEl[0];
        var editNode = that.editField[0];
        var ret = that.events.onFinishEdit.fire(newValue, oldValue, editNode, viewNode);
        if (ret === false) {
            return;
        }
        
        that.updateModelValue(newValue);
        that.events.afterFinishEdit.fire(newValue, oldValue, editNode, viewNode);
        
        switchToViewMode(that);
    };
    
    var bindEditFinish = function (that) {
        if (that.options.submitOnEnter === undefined) {
            that.options.submitOnEnter = "textarea" !== fluid.unwrap(that.editField).nodeName.toLowerCase();
        }
        function keyCode(evt) {
            // Fix for handling arrow key presses. See FLUID-760.
            return evt.keyCode ? evt.keyCode : (evt.which ? evt.which : 0);          
        }
        var escHandler = function (evt) {
            var code = keyCode(evt);
            if (code === $.ui.keyCode.ESCAPE) {
                cancel(that);
                return false;
            }
        };
        var finishHandler = function (evt) {
            var code = keyCode(evt);
            if (code !== $.ui.keyCode.ENTER) {
                return true;
            }
            
            finish(that);
            that.viewEl.focus();  // Moved here from inside "finish" to fix FLUID-857
            return false;
        };
        if (that.options.submitOnEnter) {
            that.editContainer.keypress(finishHandler);
        }
        that.editContainer.keydown(escHandler);
    };
    
    var bindBlurHandler = function (that) {
        if (that.options.blurHandlerBinder) {
            that.options.blurHandlerBinder(that);
        }
        else {
            var blurHandler = function (evt) {
                finish(that);
                return false;
            };
            that.editField.blur(blurHandler);
        }
    };
    
    var initializeEditView = function (that, initial) {
        if (!that.editInitialized) { 
            renderEditContainer(that, !that.options.lazyEditView || !initial);
            if (!that.options.lazyEditView || !initial) {
                that.editView = fluid.initSubcomponent(that, "editView", that.editField);
                
                $.extend(true, that.editView, fluid.initSubcomponent(that, "editAccessor", that.editField));
        
                bindEditFinish(that);
                bindBlurHandler(that);
                that.editView.refreshView(that);
                
                that.editInitialized = true;
            }
        }
    };
    
    var edit = function (that) {
        initializeEditView(that, false);
      
        var viewEl = that.viewEl;
        var displayText = that.displayView.value();
        that.updateModelValue(displayText === that.options.defaultViewText? "" : displayText);
        if (that.options.applyEditPadding) {
            that.editField.width(Math.max(viewEl.width() + that.options.paddings.edit, that.options.paddings.minimumEdit));
        }

        viewEl.removeClass(that.options.styles.invitation);
        viewEl.removeClass(that.options.styles.focus);
        viewEl.hide();
        that.editContainer.show();
        if (that.tooltipEnabled()) {
            $("#" + that.options.tooltipId).hide();
        }

        // Work around for FLUID-726
        // Without 'setTimeout' the finish handler gets called with the event and the edit field is inactivated.       
        setTimeout(function () {
            that.editField.focus();
            fluid.setCaretToEnd(that.editField[0], that.editView.value());
            if (that.options.selectOnEdit) {
                that.editField[0].select();
            }
        }, 0);
        that.events.afterBeginEdit.fire();
    };

    var clearEmptyViewStyles = function (textEl, defaultViewStyle, originalViewPadding) {
        textEl.removeClass(defaultViewStyle);
        textEl.css('padding-right', originalViewPadding);
    };
    
    var showDefaultViewText = function (that) {
        that.displayView.value(that.options.defaultViewText);
        that.viewEl.css('padding-right', that.existingPadding);
        that.viewEl.addClass(that.options.styles.defaultViewStyle);
    };

    var showNothing = function (that) {
        that.displayView.value("");
        
        // workaround for FLUID-938:
        // IE can not style an empty inline element, so force element to be display: inline-block
        if ($.browser.msie) {
            if (that.viewEl.css('display') === 'inline') {
                that.viewEl.css('display', "inline-block");
            }
        }
    };

    var showEditedText = function (that) {
        that.displayView.value(that.model.value);
        clearEmptyViewStyles(that.viewEl, that.options.styles.defaultViewStyle, that.existingPadding);
    };
    
    var refreshView = function (that, source) {
        that.displayView.refreshView(that, source);
        if (that.editView) {
            that.editView.refreshView(that, source);
        }
    };
    
    var initModel = function (that, value) {
        that.model.value = value;
        that.refreshView();
    };
    
    var updateModelValue = function (that, newValue, source) {
        if (that.model.value !== newValue) {
            var oldModel = $.extend(true, {}, that.model);
            that.model.value = newValue;
            that.events.modelChanged.fire(that.model, oldModel, source);
            that.refreshView(source);
        }
    };
        
    var bindHoverHandlers = function (viewEl, invitationStyle) {
        var over = function (evt) {
            viewEl.addClass(invitationStyle);
        };     
        var out = function (evt) {
            viewEl.removeClass(invitationStyle);
        };

        viewEl.hover(over, out);
    };
    
    var makeEditHandler = function (that) {
        return function () {
            var prevent = that.events.onBeginEdit.fire();
            if (prevent === false) {
                return false;
            }
            edit(that);
            
            return true;
        }; 
    };
    
    function makeEditTriggerGuard(that) {
        var viewEl = fluid.unwrap(that.viewEl);
        return function (event) {
                  // FLUID-2017 - avoid triggering edit mode when operating standard HTML controls. Ultimately this
                  // might need to be extensible, in more complex authouring scenarios.
            var outer = fluid.findAncestor(event.target, function (elem) {
                if (/input|select|textarea|button|a/i.test(elem.nodeName) || elem === viewEl) {return true; }
             });
            if (outer === viewEl) {
                that.edit();
                return false;
            }
        };
    }
    
    var bindMouseHandlers = function (that) {
        bindHoverHandlers(that.viewEl, that.options.styles.invitation);
        that.viewEl.click(makeEditTriggerGuard(that));
    };
    
    var bindHighlightHandler = function (viewEl, focusStyle, invitationStyle) {
        var focusOn = function () {
            viewEl.addClass(focusStyle);
            viewEl.addClass(invitationStyle); 
        };
        var focusOff = function () {
            viewEl.removeClass(focusStyle);
            viewEl.removeClass(invitationStyle);
        };
        viewEl.focus(focusOn);
        viewEl.blur(focusOff);
    };
    
    var bindKeyboardHandlers = function (that) {
        fluid.tabbable(that.viewEl);
        var guard = makeEditTriggerGuard(that);
        fluid.activatable(that.viewEl, 
            function (event) {
                return guard(event);
            });
    };
    
    var aria = function (viewEl, editContainer) {
        viewEl.attr("role", "button");
    };
    
    var defaultEditModeRenderer = function (that) {
        if (that.editContainer.length > 0 && that.editField.length > 0) {
            return {
                container: that.editContainer,
                field: that.editField
            };
        }
        // Template strings.
        var editModeTemplate = "<span><input type='text' class='flc-inlineEdit-edit fl-inlineEdit-edit'/></span>";

        // Create the edit container and pull out the textfield.
        var editContainer = $(editModeTemplate);
        var editField = $("input", editContainer);
        
        var componentContainerId = that.container.attr("id");
        // Give the container and textfield a reasonable set of ids if necessary.
        if (componentContainerId) {
            var editContainerId = componentContainerId + "-edit-container";
            var editFieldId = componentContainerId + "-edit";   
            editContainer.attr("id", editContainerId);
            editField.attr("id", editFieldId);
        }
        
        // Inject it into the DOM.
        that.viewEl.after(editContainer);
        
        // Package up the container and field for the component.
        return {
            container: editContainer,
            field: editField
        };
    };
    
    var makeIsEditing = function (that) {
        var isEditing = false;
        that.events.onBeginEdit.addListener(function () {isEditing = true; });
        that.events.afterFinishEdit.addListener(function () {isEditing = false; });
        return function () {return isEditing; };
    };
    
    var setupInlineEdit = function (componentContainer, that) {
        var padding = that.viewEl.css("padding-right");
        that.existingPadding = padding? parseFloat(padding) : 0;
        initModel(that, that.displayView.value());
        
        // Add event handlers.
        bindMouseHandlers(that);
        bindKeyboardHandlers(that);
        
        bindHighlightHandler(that.viewEl, that.options.styles.focus, that.options.styles.invitation);
        
        // Add ARIA support.
        aria(that.viewEl);
                
        // Hide the edit container to start
        if (that.editContainer) {
            that.editContainer.hide();
        }
        
        // Initialize the tooltip once the document is ready.
        // For more details, see http://issues.fluidproject.org/browse/FLUID-1030
        var initTooltip = function () {
            // Add tooltip handler if required and available
            if (that.tooltipEnabled()) {
                that.viewEl.tooltip({
                    delay: that.options.tooltipDelay,
                    extraClass: that.options.styles.tooltip,
                    bodyHandler: function () { 
                        return that.options.tooltipText; 
                    },
                    id: that.options.tooltipId
                });
            }
        };
        $(initTooltip);
        
        // Setup any registered decorators for the component.
        that.decorators = fluid.initSubcomponents(that, "componentDecorators", 
            [that, fluid.COMPONENT_OPTIONS]);
    };
    
    /**
     * Creates a whole list of inline editors.
     */
    var setupInlineEdits = function (editables, options) {
        var editors = [];
        editables.each(function (idx, editable) {
            editors.push(fluid.inlineEdit($(editable), options));
        });
        
        return editors;
    };
    
    /**
     * Instantiates a new Inline Edit component
     * 
     * @param {Object} componentContainer a selector, jquery, or a dom element representing the component's container
     * @param {Object} options a collection of options settings
     */
    fluid.inlineEdit = function (componentContainer, userOptions) {   
        var that = fluid.initView("inlineEdit", componentContainer, userOptions);
       
        that.viewEl = that.locate("text");
        that.displayView = fluid.initSubcomponent(that, "displayView", that.viewEl);
        $.extend(true, that.displayView, fluid.initSubcomponent(that, "displayAccessor", that.viewEl));
        
        /**
         * The current value of the inline editable text. The "model" in MVC terms.
         */
        that.model = {value: ""};
       
        /**
         * Switches to edit mode.
         */
        that.edit = makeEditHandler(that);
        
        /**
         * Determines if the component is currently in edit mode.
         * 
         * @return true if edit mode shown, false if view mode is shown
         */
        that.isEditing = makeIsEditing(that);
        
        /**
         * Finishes editing, switching back to view mode.
         */
        that.finish = function () {
            finish(that);
        };

        /**
         * Cancels the in-progress edit and switches back to view mode.
         */
        that.cancel = function () {
            cancel(that);
        };

        /**
         * Determines if the tooltip feature is enabled.
         * 
         * @return true if the tooltip feature is turned on, false if not
         */
        that.tooltipEnabled = function () {
            return that.options.useTooltip && $.fn.tooltip;
        };
        
        /**
         * Updates the state of the inline editor in the DOM, based on changes that may have
         * happened to the model.
         * 
         * @param {Object} source
         */
        that.refreshView = function (source) {
            refreshView(that, source);
        };
        
        /**
         * Pushes external changes to the model into the inline editor, refreshing its
         * rendering in the DOM. The modelChanged event will fire.
         * 
         * @param {String} newValue The bare value of the model, that is, the string being edited
         * @param {Object} source An optional "source" (perhaps a DOM element) which triggered this event
         */
        that.updateModelValue = function (newValue, source) {
            updateModelValue(that, newValue, source);
        };
        
        /**
         * Pushes external changes to the model into the inline editor, refreshing its
         * rendering in the DOM. The modelChanged event will fire.
         * 
         * @param {Object} newValue The full value of the new model, that is, a model object which contains the editable value as the element named "value"
         * @param {Object} source An optional "source" (perhaps a DOM element) which triggered this event
         */
        that.updateModel = function (newModel, source) {
            updateModelValue(that, newModel.value, source);
        };

        initializeEditView(that, true);
        setupInlineEdit(componentContainer, that);
        return that;
    };
    
    
    fluid.inlineEdit.standardAccessor = function (element) {
        var nodeName = element.nodeName.toLowerCase();
        var func = "input" === nodeName || "textarea" === nodeName? "val" : "text";
        return {
            value: function (newValue) {
                return $(element)[func](newValue);
            }
        };
    };
    
    fluid.inlineEdit.richTextViewAccessor = function (element) {
        return {
            value: function (newValue) {
                return $(element).html(newValue);
            }
        };
    };
    
    fluid.inlineEdit.standardDisplayView = function (viewEl) {
        var that = {
            refreshView: function (componentThat, source) {
                if (componentThat.model.value) {
                    showEditedText(componentThat);
                } else if (componentThat.options.defaultViewText) {
                    showDefaultViewText(componentThat);
                } else {
                    showNothing(componentThat);
                }
                // If necessary, pad the view element enough that it will be evident to the user.
                if (($.trim(componentThat.viewEl.text()).length === 0) &&
                    (componentThat.existingPadding < componentThat.options.paddings.minimumView)) {
                    componentThat.viewEl.css('padding-right', componentThat.options.paddings.minimumView);
                }
            }
        };
        return that;
    };
    
    fluid.inlineEdit.standardEditView = function (editField) {
        var that = {
            refreshView: function (componentThat, source) {
                if (componentThat.editField && componentThat.editField.index(source) === -1) {
                    componentThat.editView.value(componentThat.model.value);
                }
            }
        };
        $.extend(true, that, fluid.inlineEdit.standardAccessor(editField));
        return that;
    };
    
    /**
     * Instantiates a list of InlineEdit components.
     * 
     * @param {Object} componentContainer the element containing the inline editors
     * @param {Object} options configuration options for the components
     */
    fluid.inlineEdits = function (componentContainer, options) {
        options = options || {};
        var selectors = $.extend({}, fluid.defaults("inlineEdits").selectors, options.selectors);
        
        // Bind to the DOM.
        var container = fluid.container(componentContainer);
        var editables = $(selectors.editables, container);
        
        return setupInlineEdits(editables, options);
    };
    
    fluid.defaults("inlineEdit", {  
        selectors: {
            text: ".flc-inlineEdit-text",
            editContainer: ".flc-inlineEdit-editContainer",
            edit: ".flc-inlineEdit-edit"
        },
        
        styles: {
            text: "fl-inlineEdit-text",
            edit: "fl-inlineEdit-edit",
            invitation: "fl-inlineEdit-invitation",
            defaultViewStyle: "fl-inlineEdit-invitation-text",
            tooltip: "fl-inlineEdit-tooltip",
            focus: "fl-inlineEdit-focus"
        },
        
        events: {
            modelChanged: null,
            onBeginEdit: "preventable",
            afterBeginEdit: null,
            onFinishEdit: "preventable",
            afterFinishEdit: null,
            afterInitEdit: null
        },
        
        paddings: {
            edit: 10,
            minimumEdit: 80,
            minimumView: 60
        },
        
        applyEditPadding: true,
        
        blurHandlerBinder: null,
        // set this to true or false to cause unconditional submission, otherwise it will
        // be inferred from the edit element tag type.
        submitOnEnter: undefined,
        
        displayAccessor: {
            type: "fluid.inlineEdit.standardAccessor"
        },
        
        displayView: {
            type: "fluid.inlineEdit.standardDisplayView"
        },
        
        editAccessor: {
            type: "fluid.inlineEdit.standardAccessor"
        },
        
        editView: {
            type: "fluid.inlineEdit.standardEditView"
        },
        
        editModeRenderer: defaultEditModeRenderer,
        
        lazyEditView: false,
        
        defaultViewText: "Click here to edit",
        
        tooltipText: "Click item to edit",
        
        tooltipId: "tooltip",
        
        useTooltip: false,
        
        tooltipDelay: 1000,
        
        selectOnEdit: false
    });
    
    
    fluid.defaults("inlineEdits", {
        selectors: {
            editables: ".flc-inlineEditable"
        }
    });
    
})(jQuery, fluid_1_1);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/
// A super-simple jQuery TinyMCE plugin that actually works.
// Written by Colin Clark

/*global jQuery, tinyMCE*/

(function ($) {
    if (typeof(tinyMCE) !== "undefined") {
        // Invoke this immediately to prime TinyMCE.
        tinyMCE.init({
            mode: "none",
            theme: "simple"
        });
    }
    
    $.fn.tinymce = function () {
        this.each(function () {
            // Need code to generate an id for the tinymce control if one doesn't exist.            
            tinyMCE.execCommand("mceAddControl", false, this.id);
        });
        
        return this;
    };
})(jQuery);
/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid_1_1*/
/*global tinyMCE*/
/*global FCKeditor*/
/*global FCKeditorAPI*/
/*global fluid*/ //this global function will refer to whichever version of Fluid Infusion was first loaded

fluid_1_1 = fluid_1_1 || {};

(function ($, fluid) {

    var configureInlineEdit = function (configurationName, container, options) {
        var assembleOptions = $.extend({}, fluid.defaults(configurationName), options);
        return fluid.inlineEdit(container, assembleOptions);
    };

    // Configuration for integrating tinyMCE
    
    /**
     * Instantiate a rich-text InlineEdit component that uses an instance of TinyMCE.
     * 
     * @param {Object} componentContainer the element containing the inline editors
     * @param {Object} options configuration options for the components
     */
    fluid.inlineEdit.tinyMCE = function (container, options) {
        return configureInlineEdit("fluid.inlineEdit.tinyMCE", container, options);
    };
        
    fluid.inlineEdit.tinyMCE.viewAccessor = function (editField) {
        return {
            value: function (newValue) {
                var editor = tinyMCE.get(editField.id);
                if (!editor) {
                    return "";
                }
                if (newValue) {
                    // without this, there is an intermittent race condition if the editor has been created on this event.
                    $(editField).val(newValue); 
                    editor.setContent(newValue, {format : 'raw'});
                }
                else {
                    return editor.getContent();
                }
            }
        };
    };
   
    fluid.inlineEdit.tinyMCE.blurHandlerBinder = function (that) {
        function focusEditor(editor) {
            setTimeout(function () {
                tinyMCE.execCommand('mceFocus', false, that.editField[0].id);
                if ($.browser.mozilla && $.browser.version.substring(0, 3) === "1.8") {
                    // Have not yet found any way to make this work on FF2.x - best to do nothing,
                    // for FLUID-2206
                    //var body = editor.getBody();
                    //fluid.setCaretToEnd(body.firstChild, "");
                    return;
                }
                editor.selection.select(editor.getBody(), 1);
                editor.selection.collapse(0);
            }, 10);
        }
        
        that.events.afterInitEdit.addListener(function (editor) {
            focusEditor(editor);
            var editorBody = editor.getBody();

            // NB - this section has no effect - on most browsers no focus events
            // are delivered to the actual body
            fluid.deadMansBlur(that.editField, $(editorBody), function () {
                that.cancel();
            });
        });
            
        that.events.afterBeginEdit.addListener(function () {
            var editor = tinyMCE.get(that.editField[0].id);
            if (editor) {
                focusEditor(editor);
            } 
        });
    };
   
   
    fluid.inlineEdit.tinyMCE.editModeRenderer = function (that) {
        var defaultOptions = {
            mode: "exact", 
            theme: "simple"
        };
        var options = $.extend(true, defaultOptions, that.options.tinyMCE);
        options.elements = fluid.allocateSimpleId(that.editField);
        var oldinit = options.init_instance_callback;
        
        options.init_instance_callback = function (instance) {
            that.events.afterInitEdit.fire(instance);
            if (oldinit) {
                oldinit();
            }
        };
        
        tinyMCE.init(options);
    };
    
      
    fluid.defaults("fluid.inlineEdit.tinyMCE", {
        useTooltip: true,
        selectors: {
            edit: "textarea" 
        },
        
        styles: {
            invitation: null // Override because it causes problems with flickering. Help?
        },
        displayAccessor: {
            type: "fluid.inlineEdit.richTextViewAccessor"
        },
        editAccessor: {
            type: "fluid.inlineEdit.tinyMCE.viewAccessor"
        },
        lazyEditView: true,
        blurHandlerBinder: fluid.inlineEdit.tinyMCE.blurHandlerBinder,
        editModeRenderer: fluid.inlineEdit.tinyMCE.editModeRenderer
    });
    
    
    
    // Configuration for integrating FCKEditor
    
    /**
     * Instantiate a rich-text InlineEdit component that uses an instance of FCKeditor.
     * 
     * @param {Object} componentContainer the element containing the inline editors
     * @param {Object} options configuration options for the components
     */
    fluid.inlineEdit.FCKEditor = function (container, options) {
        return configureInlineEdit("fluid.inlineEdit.FCKEditor", container, options);
    };
    
    fluid.inlineEdit.FCKEditor.complete = fluid.event.getEventFirer();
    
    fluid.inlineEdit.FCKEditor.complete.addListener(function (editor) {
        var editField = editor.LinkedField;
        var that = $.data(editField, "fluid.inlineEdit.FCKEditor"); 
        that.events.afterInitEdit.fire(editor);
    });
    
    fluid.inlineEdit.FCKEditor.blurHandlerBinder = function (that) {
	    function focusEditor(editor) {
            editor.Focus(); 
        }
        
        that.events.afterInitEdit.addListener(
            function (editor) {
                focusEditor(editor);
                var editorBody = editor.EditingArea.TargetElement;

                // NB - this section has no effect - on most browsers no focus events
                // are delivered to the actual body
                //fluid.deadMansBlur(that.editField,
                //         $(editorBody),
                //           function () {
                //               that.cancel();
                //            });
            }
        );
        that.events.afterBeginEdit.addListener(function () {
            var editor = fluid.inlineEdit.FCKEditor.byId(that.editField[0].id);
            if (editor) {
                focusEditor(editor);
            } 
        });

    };

    fluid.inlineEdit.FCKEditor.byId = function (id) {
        var editor = typeof(FCKeditorAPI) === "undefined"? null: FCKeditorAPI.GetInstance(id);
        return editor;  
    };
    
    fluid.inlineEdit.FCKEditor.editModeRenderer = function (that) {
        var id = fluid.allocateSimpleId(that.editField);
        $.data(fluid.unwrap(that.editField), "fluid.inlineEdit.FCKEditor", that);
        var oFCKeditor = new FCKeditor(id);
        // The Config object and the FCKEditor object itself expose different configuration sets,
        // which possess a member "BasePath" with different meanings. Solve FLUID-2452, FLUID-2438
        // by auto-inferring the inner path for Config (method from http://drupal.org/node/344230 )
        var opcopy = fluid.copy(that.options.FCKEditor);
        opcopy.BasePath = opcopy.BasePath + "editor/";
        $.extend(true, oFCKeditor.Config, opcopy);
        // somehow, some properties like Width and Height are set on the object itself

        $.extend(true, oFCKeditor, that.options.FCKEditor);
        oFCKeditor.Config.fluidInstance = that;
        oFCKeditor.ReplaceTextarea();
    };
    
    fluid.inlineEdit.FCKEditor.viewAccessor = function (editField) {
        return {
            value: function (newValue) {
                var editor = fluid.inlineEdit.FCKEditor.byId(editField.id); 
                if (!editor) {
                	if (newValue) {
                        $(editField).val(newValue);
                	}
                	return "";
                }
                if (newValue) {
                    editor.SetHTML(newValue);
                }
                else {
                    return editor.GetHTML();
                }
            }
        };
    };
    
    
    fluid.defaults("fluid.inlineEdit.FCKEditor", {
        selectors: {
            edit: "textarea" 
        },
        
        styles: {
            invitation: null // Override because it causes problems with flickering. Help?
        },
      
        displayAccessor: {
            type: "fluid.inlineEdit.richTextViewAccessor"
        },
        editAccessor: {
            type: "fluid.inlineEdit.FCKEditor.viewAccessor"
        },
        lazyEditView: true,
        blurHandlerBinder: fluid.inlineEdit.FCKEditor.blurHandlerBinder,
        editModeRenderer: fluid.inlineEdit.FCKEditor.editModeRenderer,
        FCKEditor: {
            BasePath: "fckeditor/"    
        }
    });
    
    
    // Configuration for integrating a drop-down editor
    
    /**
     * Instantiate a drop-down InlineEdit component
     * 
     * @param {Object} container
     * @param {Object} options
     */
    fluid.inlineEdit.dropdown = function (container, options) {
        return configureInlineEdit("fluid.inlineEdit.dropdown", container, options);
    };

    fluid.inlineEdit.dropdown.editModeRenderer = function (that) {
        var id = fluid.allocateSimpleId(that.editField);
        that.editField.selectbox({
            finishHandler: function () {
                that.finish();
            }
        });
        return {
            container: that.editContainer,
            field: $("input.selectbox", that.editContainer) 
        };
    };
   
    fluid.inlineEdit.dropdown.blurHandlerBinder = function (that) {
        fluid.deadMansBlur(that.editField,
                           $("div.selectbox-wrapper li", that.editContainer),
                           function () {
                               that.cancel();
                           });
    };


    
    fluid.defaults("fluid.inlineEdit.dropdown", {
        applyEditPadding: false,
        blurHandlerBinder: fluid.inlineEdit.dropdown.blurHandlerBinder,
        editModeRenderer: fluid.inlineEdit.dropdown.editModeRenderer
    });
    
    
})(jQuery, fluid_1_1);


// This must be written outside any scope as a result of the FCKEditor event model.
// Do not overwrite this function, if you wish to add your own listener to FCK completion,
// register it with the standard fluid event firer at fluid.inlineEdit.FCKEditor.complete
function FCKeditor_OnComplete(editorInstance) {
    fluid.inlineEdit.FCKEditor.complete.fire(editorInstance);
}
