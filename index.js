/*
 * Express - Router
 * Copyright(c) 2012 TJ Peden <tj.peden@tj-coding.com>
 * MIT Licensed
 * 
 * Credit to TJ Holowaychuk and Daniel Gasienica for
 * their work on express-resource.
 */


/**
 * Module dependencies.
 */
 
var express = require('express');
var fs = require('fs');
var path = require('path');
var lingo = require('lingo');

/**
 * Extend function.
 */

function $(destination, source) { // extend
  for(var property in source)
    if(source.hasOwnProperty(property))
      destination[property] = source[property];
  return destination;
}

/**
 * Pre-defined action ordering.
 * As in express-resource.
 */

var orderedActions = [
  'all',
  'index',
  'new',
  'create',
  'show',
  'edit',
  'update',
  'destroy'
];

/**
 * Initialize a new `Resource` with the
 * given `name` and `actions`.
 * 
 * @param {String} name
 * @param {Object} actions
 * @param {Server} app
 */

function Resource(name, actions, app) {
  this.name = actions.name || name;
  this.app = app;
  
  this.id = actions.id || this._defaultId();
  this.root = actions.root || false;
  
  this.routes = [];
  this._init(actions);
}

$(Resource.prototype, {
  
  /**
   * Configure the default actions.
   * 
   * @param {Object} actions
   */
  
  _init: function(actions) {
    var self = this;
    
    orderedActions.forEach(function(action) {
      if(!action in actions) return;
      var path = self.path(action),
          callback = actions[action],
          method;
      
      switch(action) {
        case 'all':
          self.app.all(path, callback);
          return;
        case 'index':
        case 'show':
        case 'new':
        case 'edit':
          method = 'get';
          break;
        case 'create':
          method = 'post';
          break;
        case 'update':
          method = 'put';
          break;
        case 'destroy':
          method = 'delete';
          break;
      }
      
      self.map(method, path, callback)
        ._record(action, method, path);
    });
  },
  
  /**
   * Return a generated path for the given action
   * 
   * @param {String} action
   * @return {String}
   */
  
  path: function(action) {
    var result = this.root ? '/' : '/' + this.name + '/';
    
    switch(action) {
      case 'all':
      case 'show':
      case 'edit':
      case 'update':
      case 'destroy':
        result += ':' + this.id;
      default: break;
    };
    
    switch(action) {
      case 'all':
        result += '?/:op?';
        break;
      case 'new':
      case 'edit':
        result += '/' + action;
      default: break;
    }
    
    if('all' != action) result += '.:format?';
    
    return result;
  },
  
  /**
   * Return the resource's default id string.
   * 
   * @return {String}
   */
  
  _defaultId: function() {
    return this.root ?
      'id' : lingo.en.singularize(this.name);
  },
  
  /**
   * Record the `method` and `path` a given `action`
   * is mapped to. Also preserves order.
   */
  
  _record: function(action, method, path) {
    method = method.toUpperCase();
    this.routes.push({
      action: action,
      method: method,
      path: path
    });
  },
  
  /**
   * Map http `method` and `path` to `callback`.
   * 
   * @param {String} method
   * @param {String} path
   * @param {Function} callback
   * @return {Resource} for chaining
   */
  
  map: function(method, path, callback) {
    this.app[method](path, callback);
    return this;
  },
  
  /**
   * Returns a rendering of all the routes mapped
   * for this resource.
   * 
   * @return {String}
   */
  
  toString: function() {
    return this.routes.map(function(obj) {
      return obj.method + "\t" + obj.action + "\t" + obj.path;
    }).join("\n");
  }
});

/**
 * Initialize a new `ResourceManager` with a given `dir`.
 * 
 * @param {String} dir
 */

function ResourceManager(dir) {
  this.dir = dir;
  this.controllers = {};
}

$(Router.prototype, {
  
  /**
   * Load all the controllers from `dir`
   * then call `done`
   * 
   * @param {Function} done
   */
  
  initControllers: function(done) {
    var self = this;
    
    fs.readdir(this.dir, function(error, files) {
      if(error) throw error;
      
      files.forEach(function(file) {
        var name = file.match(/^[^_]+/);
        self.controllers[name] = require(path.join(self.dir, file));
      });
      done();
    });
  },
  
  /**
   * Create new `Resources` for all of the controllers that were loaded.
   * 
   * @param {Server} app
   */
  
  createResources: function(app) {
    app.resources = {};
    
    for(var name in this.controllers) {
      if(!name in app.resources)
        app.resources[name] =
          new Resource(name, this.controllers[name], app);
    }
  }
});

/**
 * Load and define resources for all the controllers in a given `dir`.
 * 
 * @param {String} dir
 * @return {ResourceManager}
 */

express.HTTPServer.prototype.loadResources =
express.HTTPSServer.prototype.loadResources = function(dir) {
  if(!dir) dir = path.join(__dirname, '..', '..', 'controllers');
  var self = this;
  var manager = new ResourceManager(dir);
  
  manager.initControllers(function() {
    manager.createResources(self);
  });
  
  return manager;
};

/**
 * Define a resource with the given `name` and `actions`.
 * Doin' it express-resource style.
 * 
 * @param {String} name
 * @param {Object} actions
 * @return {Resource}
 */

express.HTTPServer.prototype.resource =
express.HTTPSServer.prototype.resource = function(name, actions) {
  var resource = new Resource(name, actions, this);
  (this.resources = this.resources || {})[name] = resource;
  return resource;
};
