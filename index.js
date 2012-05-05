(function() {
  var express = require('express');
  var fs = require('fs');
  var lingo = require('lingo');
  
  function $(destination, source) { // extend
    for(var property in source)
      if(source.hasOwnProperty(property))
        destination[property] = source[property];
    return destination;
  }
  
  function Resource(name, actions, app) {
    this.name = name;
    this.app = app;
    
    this.id = actions.id ?
      actions.id : this._defaultId();
    this.root = actions.root;
    
    this.routes = [];
    this._init(actions);
  }
  
  $(Resource.prototype, {
    _init: function(actions) {
      for(var action in actions) {
        var path = this._path(action),
            callback = actions[action];
        switch(action) {
          case 'all': 
            this.app.all(path, callback);
            break;
          case 'index':
            this.routes.push({method: 'GET', action: action, path: path});
            this.app.get(path, callback);
            break;
          case 'show':
            this.routes.push({method: 'GET', action: action, path: path});
            this.app.get(path, callback);
            break;
          case 'new':
            this.routes.push({method: 'GET', action: action, path: path});
            this.app.get(path, callback);
            break;
          case 'create':
            this.routes.push({method: 'POST', action: action, path: path});
            this.app.post(path, callback);
            break;
          case 'edit':
            this.routes.push({method: 'GET', action: action, path: path});
            this.app.get(path, callback);
            break;
          case 'update':
            this.routes.push({method: 'PUT', action: action, path: path});
            this.app.put(path, callback);
            break;
          case 'destroy':
            this.routes.push({method: 'DELETE', action: action, path: path});
            this.app.del(path, callback);
            break;
          default: break;
        }
      }
    },
    _path: function(action) {
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
        lingo.en.singularize(this.name) : 'id';
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
    this.resources = {};
  }
  
  $(Router.prototype, {
    initControllers: function(done) {
      var self = this;
      fs.readdir(this.dir, function(error, files) {
        if(error) throw error;
        files.forEach(function(file) {
          var name = file.match(/^[^_]+/);
          self.controllers[name] = require(self.dir + file);
        });
        done();
      });
    },
    createRoutes: function(app) {
      for(var name in this.controllers) {
        this.resources[name] = new Resource(name, this.controllers[name], app);
      }
    },
    toString: function() {
      var result = '';
      for(var name in this.resources) {
        result += name + ":\n";
        result += this.resources[name];
        result += "\n";
      }
      return result;
    }
  });
  
  express.HTTPServer.prototype.loadResources =
  express.HTTPSServer.prototype.loadResources = function(dir) {
    if(!dir) dir = './controllers/';
    var self = this;
    var router = new Router(dir);
    
    router.initControllers(function() {
      router.createRoutes(self);
      self.resources = router.resources; // convenience
    });
    
    return router;
  };
  
  express.HTTPServer.prototype.resource =
  express.HTTPSServer.prototype.resource = function(name, actions) {
    var resource = new Resource(name, actions, this);
    (this.resources = this.resources || {})[name] = resource;
    return resource;
  };
})();
