var express = require('express');
var fs = require('fs');
var path = require('path');
var lingo = require('lingo');

function $(destination, source) { // extend
  for(var property in source)
    if(source.hasOwnProperty(property))
      destination[property] = source[property];
  return destination;
}

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

function Resource(name, actions, app) {
  this.name = actions.name || name;
  this.app = app;
  
  this.id = actions.id || this._defaultId();
  this.root = actions.root || false;
  
  this.routes = [];
  this._init(actions);
}

$(Resource.prototype, {
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
      
      self.map(method, action, path, callback);
    });
  },
  path: function(action) {
    var result = this.root ? '' : '/' + this.name;
    
    switch(action) {
      case 'all':
      case 'show':
      case 'edit':
      case 'update':
      case 'destroy':
        result += '/:' + this.id;
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
  _defaultId: function() {
    return this.root ?
      'id' : lingo.en.singularize(this.name);
  },
  map: function(method, action, path, callback) {
    this.app[method](path, callback);
    method = method.toUpperCase();
    this.routes.push({method: method, path: path, action: action});
  },
  toString: function() {
    return this.routes.map(function(obj) {
      return obj.method + "\t" + obj.action + "\t" + obj.path;
    }).join("\n");
  }
});

function Router(dir) {
  this.dir = dir;
  this.controllers = {};
}

$(Router.prototype, {
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
  createRoutes: function(app) {
    app.resources = {};
    for(var name in this.controllers) {
      app.resources[name] =
        new Resource(name, this.controllers[name], app);
    }
  }
});

express.HTTPServer.prototype.loadResources =
express.HTTPSServer.prototype.loadResources = function(dir) {
  if(!dir) dir = path.join(__dirname, '..', '..', 'controllers');
  var self = this;
  var router = new Router(dir);
  
  router.initControllers(function() {
    router.createRoutes(self);;
  });
  
  return router;
};

express.HTTPServer.prototype.resource =
express.HTTPSServer.prototype.resource = function(name, actions) {
  var resource = new Resource(name, actions, this);
  (this.resources = this.resources || {})[name] = resource;
  return resource;
};
