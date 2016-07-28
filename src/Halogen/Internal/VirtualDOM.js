/* global exports, require */
"use strict";

// module Halogen.Internal.VirtualDOM

var vcreateElement = require("virtual-dom/create-element");
var vdiff = require("virtual-dom/diff");
var vpatch = require("virtual-dom/patch");
var VText = require("virtual-dom/vnode/vtext");
var VirtualNode = require("virtual-dom/vnode/vnode");
var SoftSetHook = require("virtual-dom/virtual-hyperscript/hooks/soft-set-hook");
var attributeHook = require('virtual-dom/virtual-hyperscript/hooks/attribute-hook');

// jshint maxparams: 2
exports.prop = function (keys, value) {
  return function(result) {
    var target = result, child;
    for (var i=0; i<keys.length-1; ++i) {
      child = target[keys[i]] || {};
      target[keys[i]] = child;
      target = child;
    }
    target[keys[keys.length-1]] = value;
  };
};

// jshint maxparams: 2
exports.attr = function (key, value) {
  return function(result) {
    var attrs = result.attributes || {};
    attrs[key] = value;
    result.attributes = attrs;
  };
};

// jshint maxparams: 3
exports.attrNS = function (ns, key, value) {
  return function(result) {
    result[key] = attributeHook(ns, value);
  };
};

function HandlerHook (key, f) {
  this.key = key;
  this.callback = function (e) {
    f(e)();
  };
}

HandlerHook.prototype = {
  hook: function (node) {
    node.addEventListener(this.key, this.callback);
  },
  unhook: function (node) {
    node.removeEventListener(this.key, this.callback);
  }
};

// jshint maxparams: 2
exports.handlerProp = function (key, f) {
  const hook = new HandlerHook(key, f);
  return function(result) {
    result["halogen-hook-" + key] = hook;
  };
};

exports.refPropImpl = function (nothing) {
  return function (just) {

    var ifHookFn = function (init) {
      // jshint maxparams: 3
      return function (node, prop, diff) {
        // jshint validthis: true
        if (typeof diff === "undefined") {
          this.f(init ? just(node) : nothing)();
        }
      };
    };

    // jshint maxparams: 1
    function RefHook (f) {
      this.f = f;
    }

    RefHook.prototype = {
      hook: ifHookFn(true),
      unhook: ifHookFn(false)
    };

    return function (f) {
      const hook = new RefHook(f); 
      return function(result) {
        result["halogen-ref"] = hook;
      };
    };
  };
};

// jshint maxparams: 3
function HalogenWidget (tree, eq, render) {
  this.tree = tree;
  this.eq = eq;
  this.render = render;
  this.vdom = null;
  this.el = null;
}

HalogenWidget.prototype = {
  type: "Widget",
  init: function () {
    this.vdom = this.render(this.tree);
    this.el = vcreateElement(this.vdom);
    return this.el;
  },
  update: function (prev, node) {
    if (!prev.tree || !this.eq(prev.tree.slot)(this.tree.slot)) {
      return this.init();
    }
    if (this.tree.thunk) {
      this.vdom = prev.vdom;
      this.el = prev.el;
    } else {
      this.vdom = this.render(this.tree);
      this.el = vpatch(node, vdiff(prev.vdom, this.vdom));
    }
  }
};

exports.widget = function (tree) {
  return function (eq) {
    return function (render) {
      return new HalogenWidget(tree, eq, render);
    };
  };
};

exports.concatProps = function () {
  // jshint maxparams: 2
  // var hOP = Object.prototype.hasOwnProperty;
  // var copy = function (props, result) {
  //   for (var key in props) {
  //     if (hOP.call(props, key)) {
  //       if (key === "attributes") {
  //         var attrs = props[key];
  //         var resultAttrs = result[key] || (result[key] = {});
  //         for (var attr in attrs) {
  //           if (hOP.call(attrs, attr)) {
  //             resultAttrs[attr] = attrs[attr];
  //           }
  //         }
  //       } else {
  //         result[key] = props[key];
  //       }
  //     }
  //   }
  //   return result;
  // };
  return function (p1, p2) {
    return function(result) {
      p1(result);
      p2(result);
    }
  };
}();

exports.emptyProps = function (result) {};

exports.createElement = function (vtree) {
  return vcreateElement(vtree);
};

exports.diff = function (vtree1) {
  return function (vtree2) {
    return vdiff(vtree1, vtree2);
  };
};

exports.patch = function (p) {
  return function (node) {
    return function () {
      return vpatch(node, p);
    };
  };
};

exports.vtext = function (s) {
  return new VText(s);
};

exports.vnode = function (namespace) {
  return function (name) {
    return function (key) {
      return function (props) {
        return function (children) {
          var propsObj = {};
          props(propsObj);
          if (name === "input" && propsObj.value !== undefined) {
            propsObj.value = new SoftSetHook(propsObj.value);
          }
          return new VirtualNode(name, propsObj, children, key, namespace);
        };
      };
    };
  };
};
