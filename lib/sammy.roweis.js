/*

The MIT License

Copyright (c) 2010 Reginald Braithwaite and Unspace Interactive

http://reginald.braythwayt.com
http://unspace.ca

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

;(function ($, undefined) {
  
  // HELPERS!
      
  var restful_verbs_future_tense = ['gets', 'posts', 'puts', 'deletes'];
  
  var present_tense = function (verb) {
    return verb.match(/^get/) ? 'get' : (
      verb.match(/^post/) ? 'post' : (
      verb.match(/^put/) ? 'put' : (
      verb.match(/^del/) ? 'delete' : (verb)
    )));
  };


  var configulator = function (optional_name, optional_config, defaults) {
        
      // normalize:
      // .define('foo')                           -> { name: 'foo' }
      // .define('foo', { partial: 'bar' })       -> { name: 'foo', partial: 'bar' }
      // .define({ name: 'foo', partial: 'bar' }) -> { name: 'foo', partial: 'bar' }
    
      optional_config = optional_config || {};
      
      if ('string' === typeof(optional_name)) {
        return $.extend({}, defaults, optional_config, { name: optional_name });
      }
      else if ('number' === typeof(optional_name)) {
        return $.extend({}, defaults, optional_config, { code: optional_name, name: optional_name.toString() });
      }
      else if ('object' === typeof(optional_name)) {
        return $.extend({}, defaults, optional_name);
      }
      else return $.extend({}, defaults, optional_config);
  };

  // interpolate variables into a path
  var interpolate = function (path, data) {
    var transformed_path = path;
    $.each(path.match(/\:[a-zA-Z_]\w*/g) || [], function(i, parameter) {
      var parameter_name = parameter.substring(1);
      var parameter_value = data[parameter_name] || (data.params && data.params[parameter_name])|| (data.server_data && data.server_data[parameter_name]);;
      transformed_path = transformed_path.replace(parameter, parameter_value);
    });
    return transformed_path;
  };
  
  var interpolate_with_inferred_function = function(fn_or_path, context, optional_data) {
    var fn;
    if ('string' === typeof(fn_or_path)) {
      fn = fn_or_path.match(/^(#|\/)/) ? (function () { return fn_or_path; }): fn_or_path.toFunction();
    }
    else if ('function' === typeof(fn_or_path)) {
      fn = fn_or_path;
    }
    var path = fn(context, optional_data);
    return interpolate(path, context); 
  };
  
  // can support as many data arguments as needed
  var fully_interpolated = function () {
    var hash_path = fully_interpolated.arguments[0];
    var data = {};
    for (var i = 1; i < fully_interpolated.arguments.length; ++i) {
      $.extend(true, data, arguments[i]);
    }
    $.each(hash_path.match(/\:[a-zA-Z_]\w*/g) || [], function(i, parameter) {
      var parameter_name = parameter.substring(1);
      var parameter_value = data[parameter_name];
      delete data[parameter_name];
      hash_path = hash_path.replace(parameter, parameter_value);
    });
    var params = [];
    $.each(data, function (parameter_name, parameter_value) { 
      if ('etc' != parameter_name && data.hasOwnProperty(parameter_name) && (parameter_value || 0 === parameter_value)) {
        params.push(encodeURIComponent(parameter_name) + '=' + encodeURIComponent(parameter_value));
      }
    })
    return _.compact([
      hash_path,
      _.compact(params).join('&')
    ]).join('?')
  };
  
  var callbackable = function(handler) {
    if (3 === handler.length) {
      return handler;
    }
    else if (2 === handler.length) {
      return function (context, data, callback) {
        var new_data = handler(context, data);
        return callback(context, new_data || data);
      };
    }
  };
  
  // this feels like a combinator!!!
  // it could be more elegant ifd we use 'apply with callback; above, but
  // 
  var compose_with_callback = function(x, y) {
    return function (context, data, callback) {
      callbackable(x)(context, data, function (context2, data2) {
        callbackable(y)(context2, data2, callback);
      })
    };
  };
  
  // the standard action steps
  var action_steps = [
    'action_base',
    'action_map',
    'action_render',
    'action_redirect'
  ];

  // filtering etc from parameters
  
  var actual_params = function (parameters) {
    var actuals = $.extend({}, parameters);
    delete actuals.etc;
    return actuals.toHash();
  };
  
  // recursive extend
  
  var meld = (function () {
    var recursor = function () {
      var args = _.compact(arguments);
      if (args.length == 0) {
        return;
      }
      else if (args.length == 1) {
        return args[0];
      }
      else if (_.every(args, "typeof(_) === 'array'".lambda())) {
        return _.foldl(args, "x.concat(y)".lambda(), []);
      }
      else if (_.some(args, "typeof(_) !== 'object'".lambda())) {
        return args[args.length - 1];
      }
      else return _.foldl(args,
        function (extended, obj) {
          for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
              extended[i] = recursor(extended[i], obj[i]);
            }
          }
          return extended;
        }, 
        {}
      );
    };
    return recursor;
  })();
  
  

  // THE BUSINESS AT HAND
  
  Sammy.Roweis = (function () {
  
    var roweis = function (app_name, optional_options) {
  
      app_name = app_name || 'app';
  
      app_options = meld(
        { 
          partial_suffix: (Sammy.Haml ? '.haml' : ''),
          highlight_options: {},
          highlight_duration: 3000,
          name: app_name,
          children: [],
          error_handlers: {}
        },
        optional_options || {}
      );
  
      return function (app, host) {
      
        roweis[app_name] = app;
        app.roweis = $.extend({
          host: host || '',
          handlers: [],
          config_stack: []
        }, app_options);
        
        // children receive events from parents
        if (undefined !== app.roweis.parent) {
          app.roweis.parent.roweis.children.push(app);
        }
        
        var root_element_selector = app.roweis.updates || app.element_selector || 'body';
        
        // $$element is the element to update the DOM
        app.$$element = function () {
          return $(root_element_selector);
        }
      
        var define = function (config) {
        
          // first we deal with the crazy default
          // convention over configuration cases.
          //
          // name first
        
          config.name = config.name ||
            (typeof(config.gets) === 'string' ? config.gets : null) ||
            (typeof(config.posts) === 'string' ? config.posts : null) ||
            (typeof(config.puts) === 'string' ? config.puts : null) ||
            (typeof(config.deletes) === 'string' ? config.deletes : null);
          
          if (undefined === config.route && config.name) {
            // default route if it is not set to 'false'
            config.route = config.name;
          }
          
          // home paths
          
          for (var prop in config) {
            var val = config[prop];
            if (config.hasOwnProperty(prop) && val && !prop.match(/_home_path$/) && config[prop+'_home_path']) {
              if ('string' === typeof(val)) {
                config[prop] = [config[prop+'_home_path'], val].join('/');
              }
              else if ('object' === typeof(val)) {
                for (var inner_prop in val) {
                  if (val.hasOwnProperty(inner_prop) && 'string' === typeof(val[inner_prop])) {
                    val[inner_prop] = [config[prop+'_home_path'], val[inner_prop]].join('/');
                  }
                }
              }
            }
          }
          
          // and a default partial
        
          if (undefined === config.partial) {
            config.partial = config.name;
          }
          if (config.partial && app.roweis.partial_suffix && !config.partial.match(/\.[^\/]+$/)) {
            config.partial = config.partial + app.roweis.partial_suffix;
          }
          if (config.partial && app.roweis.partial_root) {
            config.partial = [app.roweis.partial_root, config.partial].join('/');
          }
          
          // and a default DOM selector to update
          
          if (undefined === config.updates) {
            config.updates = config.renders || root_element_selector;
          }
          
          if ('string' === typeof(config.route) && !config.route.match(/^#\//)) {
            config.route = '#/' + config.route;
          }
          
          // if (config.route) {
          //   Sammy.log("route: "+config.route+', name: '+config.name+", partial: "+config.partial);
          // }
          
          // Now we're ready to build the handler out
          
          //
          // EVENT HELPERS
          //
          
          var after_event_name = function(event_name) {
            return 'after_'+ event_name;
          };
      
          var my_after_event_name = function(event_name) {
            return [after_event_name(event_name), config.name].join('_');
          };

          var handler = {
            app: app,
            config: config,
            error_handlers: {}
          };
          
          $.each(action_steps, function (i, step) {
            $.each(['before_'+step, step, 'after_'+step], function (j, full_step) {
              if ('function' === typeof(config[full_step])) {
                handler[full_step] = config[full_step];
              }
            })
          });
          
          if ('string' === typeof(config.name) && !app.roweis.handlers[config.name]) {
            app.roweis.handlers[config.name] = handler;
          }
        
          //
          // The Action Lifecycle.
          //
          
          // first, look for predefined steps
          
          $.each(action_steps, function(i, action_step) {
            if ('function' === typeof(config[action_step])) {
              handler[action_step] = config[action_step];
            }
          });
        
          //
          // ACTION_BASE
          //
          
          // extract ajax error handlers
          for (var code in config) {
            if (config.hasOwnProperty(code) && !isNaN(code)) {
              handler.error_handlers[code] = config[code];
            }
          }
          
          if (undefined === handler.action_base) {
            // check for a server path
            $.each(restful_verbs_future_tense, function (i, verb) {
              var fetch_data_fn = function (path, destination, context, data, callback) {
                var server_route = interpolate_with_inferred_function(path, context);
                var host_partial_path = server_route.match(/^\//) ? server_route : '/' + server_route;
                var full_url = app.roweis.host + host_partial_path;
                var ap = actual_params(context.params);
                Sammy.log(config.name + ' is ajaxing ' + full_url + ' with:', ap);
                var request_object = {
                  error: function(xhr, textStatus, errorThrown) {
                    Sammy.log('Error from '+full_url+":", xhr);
                    var propagate = true;
                    var code = xhr.status;
                    var responseObj;
                    try {
                      responseObj = (xhr.responseText ? JSON.parse(xhr.responseText) : {});
                    }
                    catch (error) {
                      responseObj = (xhr.responseText ? { responseText: xhr.responseText }: {});
                    }
                    var error_params = {
                      params: ap,
                      code: code,
                      handler: handler,
                      context: context,
                      data: data,
                      xhr: xhr,
                      response: responseObj,
                      textStatus: textStatus,
                      errorThrown: errorThrown,
                      stopPropagation: function () { propagate = false; },
                    };
                    if (handler.error_handlers[code]) {
                      handler.error_handlers[code](error_params);
                    }
                    if (propagate) {
                      app.trigger(code, error_params);
                    }
                  },
                  url: full_url,
                  type: present_tense(verb),
                  cache: false,
                  etc: {
                    handler: handler,
                    context: context
                  },
                  data: ap,
                  success: function (data_from_server, textStatus, xhr) {
                    data = data || {};
                    data.params = context.params.toHash();
                    data[destination] = data_from_server;
                    callback(context, data);
                  }
                };
                $.ajax(request_object);
              };
              if (typeof(config[verb]) === 'string') {
                handler.action_base = function (context, data, callback) {
                  fetch_data_fn(config[verb], 'server_data', context, data, callback);
                };
              }
              else if (typeof(config[verb]) === 'object') {
                handler.action_base = function (context, data, callback) {
                  callback(context, data);
                };
                for (var i in config[verb]) {
                  if (config[verb].hasOwnProperty(i)) {
                    (function (destination, old_action) {
                      handler.action_base = function (context, data, callback) {
                        fetch_data_fn(config[verb][destination], destination, context, data, function (context, data) {
                          old_action(context, data, callback); // is this rcurry?
                        });
                      }
                    })(i, handler.action_base);
                  }
                }
              }
            });
          }
          
          //
          // ACTION_MAP
          //
          
          if (undefined === handler.action_map && config.map) {
            var config_map_fn;
            if (_.isFunction(config.map)) {
              config_map_fn = config.map;
            }
            else if (_.isFunction(config.map.toFunction)) {
              config_map_fn = config.map.toFunction();
            }
            else if ('undefined' !== typeof(Cartography)) {
              config_map_fn = Cartography.compile(config.map);
            }
            if (config_map_fn) {
              handler.action_map = function (context, data, callback) {
                return callback(context, config_map_fn(data));
              }
            }
          }
          
          //
          // ACTION_RENDER
          //
        
          if (undefined === handler.action_render && config.partial) {
            handler.action_render = function (context, data, callback) {
             // Sammy.log(config.name + ' starting to render');
              var local_data = meld(data, {
                safely: function (_) { return 'undefined' === typeof(_) ? '' : _ },
                params: context.params
              });
              // Sammy.log(config.name + ' is rendering ' + config.partial + ' with:\n', local_data);
              var render_context = context.render(config.partial, local_data);
              var dom_is_dirty = false;
              if (config.updates && !config.renders && !config.appends_to) {
                render_context
                  .replace(config.updates);
                dom_is_dirty = true;
              }
              if (config.appends_to) {
                var append_fn = ('function' === typeof(config.appends_to)) ? config.appends_to : (function () { return config.appends_to; })
                var selector = append_fn(context, data); 
                render_context
                  .then(function (content) {
                    $(selector)
                      .append(content);
                  });
                dom_is_dirty = true;
              }
              if (config.renders && $(config.renders).exists()) {
                render_context
                  .then(function (content) {
                    $(config.renders)
                      .replaceWith(content);
                  });
                dom_is_dirty = true;
              }
              if (dom_is_dirty) {
                // this may be a bug some day, not sure, what if something is looking
                // for the after updateto signal the route has finished?
                // Sammy.log(handler.config.name + ' is queuing up an action_render event');
                render_context
                  .then(function (content) {
                    var apps_to_trigger = $.merge([], [app], app.roweis.children);
                    var name = after_event_name('action_render');
                    $.each(apps_to_trigger, function(i, app_to_trigger) {
                      // here we're setting up a possible re-entry. 
                      // Because of the way context parameters work, we need to extract them
                      app_to_trigger.trigger(name, data.params);
                    });
                  })
              }
              render_context
                .then(function (content) {
                  callback(context, data);
                })
            };
          };
          
          //
          // ACTION_REDIRECT
          //
        
          if (undefined === handler.action_redirect && config.redirects_to) {
            handler.action_redirect = function (redirect_context, data, callback) {
              var path = interpolate_with_inferred_function(config.redirects_to, redirect_context, data);
              app.setLocation(path);
              callback(redirect_context, data);
            }
          }
          
          // aspect the steps
          
          var aspected_action_steps = $.map(action_steps, function (action_step) {
            if ('function' === typeof(handler[action_step])) {
              if ('function' === typeof(handler['before_' + action_step])) {
                handler[action_step] = compose_with_callback(handler['before_' + action_step], handler[action_step]);
              }
              if ('function' === typeof(handler['after_' + action_step])) {
                handler[action_step] = compose_with_callback(handler[action_step], handler['after_' + action_step]);
              }
              handler[action_step].owner = handler;
              return action_step;
            }
          });
          
          // 
          // OPTIONAL VIEWS
          //
          
          if (window.Backbone && handler.config.view) {
            
            var clazz = Backbone.View; // default
            var model;
            
            if (_.isFunction(handler.config.view.clazz)) {
              clazz = handler.config.view.clazz;
            }
            else if (handler.config.view.clazz) {
              clazz = Backbone.View.extend(handler.config.view.clazz); // define extensions on the fly
            }
            if (handler.config.view.model) {
              model = handler.config.view.model;
            }
          
            var view_init = function (context, data) {
              var hash = {};
              if (_.isFunction(model) && 1 === model.length) {
                hash.model = model(data);
              }
              else if (_.isFunction(model) && 2 === model.length) {
                hash.model = model(context, data);
              }
              else if (model && _.isFunction(model.toFunction)) {
                var fn = model.toFunction();
                if (1 === fn.length) {
                  hash.model = fn(data);
                }
                else if (2 === fn.length) {
                  hash.model = fn(context, data);
                }
              }
              if (config.renders) {
                hash.el = jQuery(config.renders);
              }
              return hash;
            };
          
            if (undefined === handler.action_render && clazz.prototype.render !== Backbone.View.prototype.render) {
              handler.action_render = function (context, data) {
                var ad_hoc_view = new clazz(view_init(context, data));
                ad_hoc_view.render();
              };
              aspected_action_steps.push('action_render'); // TODO: Make this elegant
            }
            else if (handler.action_render && clazz.prototype.render === Backbone.View.prototype.render) {
              var old_render_fn = handler.action_render;
              handler.action_render = function (context, data) {
                var ad_hoc_view = new (clazz.extend({
                  render: function () {
                    old_render_fn(context, data, function () {
                      ad_hoc_view.handleEvents();
                    });
                    return this;
                  }
                }))(view_init(context, data));
                ad_hoc_view.render();
              };
            }
            
          }
          
          //
          // EVENTS
          //
          
          // First we generate all the events for action steps in this handler
          
          //
          // TRIGGERING THE HANDLER EXTERNALLY
          //
          
          // These are really the 'public' or 'external' stimuli
          // to fire the handler off
          
          (function (action_steps_in_use) {
            
            var handler_all_steps_fn = _.foldr(action_steps_in_use,
              (function (callback, step) {
                var callbackized_step_fn = callbackable(handler[step]);
                return function (context, data) {
                  callbackized_step_fn(context, data, callback);
                };
              }), 
              (function (context, data) {})
            );
            
            //
            // triggering a handler through a route
            //
            
            if (config.method && config.route) {
              app[config.method](config.route, function (handler_context) {
                handler_all_steps_fn(handler_context, {});
              });
            }
            
            //
            // triggering a handler unobtrusively
            //
            
            if (config.renders) {
              var updater_fn = function (e, data) {
                // If the selector defined by the controller being bound matches the 
                // data, we care about this and want to hear when it's done rendering
                
                if ($(config.renders).filter(':not(.__XES__)').length) {
                  // Sammy.log(config.name + ' has been triggered and has discovered an element');
                  app.$$element().find(config.renders)
                    .addClass('__XES__');
                  handler_all_steps_fn(this, data);
                }
              };
              app
                .bind('after_action_render', updater_fn)
                .bind('run', updater_fn);
            }
            
            //
            // triggering a handler through an AJAX error status
            //
            
            if (handler.config.code && !isNaN(handler.config.code) && handler.config.route) {
              app.bind(handler.config.code, function (event, error_data) {
                app.setInterpolatedLocation(handler.config.route, error_data.data);
              })
            }
            
          })(_.compact(aspected_action_steps));
          
          return handler;
        
        };
        
        //
        // this is the api for setting defaults
        //
        
        app.begin = function(config) {
          app.roweis.config_stack.push(config);
          return app;
        };
        
        app.end = function() {
          if (app.roweis.config_stack.length > 0) {
            app.roweis.config_stack.pop();
            return app;
          }
          else {
            Sammy.log('error, "end" unmatched with "use."');
          }
        };
        
        app.scope = function(config, fn) {
          return app
            .begin(config)
            .K(fn)
            .end()
            ;
        };
        
        var defaults = function(config) {
          var h = _.foldl(app.roweis.config_stack, function (acc,hash) { return jQuery.extend(acc,hash); }, config);
          // special case for properties with paths
          for (var prop in h) {
            if (h.hasOwnProperty(prop) && prop.match(/_path$/)) {
              var paths = _.compact(_.pluck(app.roweis.config_stack, prop));
              h[prop] = paths.join('/');
            }
          }
          return h;
        };
      
        //
        // this is the api for calling the define function
        //
      
        app.view = function (optional_name, optional_config) {
          define(configulator(optional_name, optional_config, defaults({ 
            method: 'get',
            appends_to: false,
            action_redirect: false 
          })));
          return app;
        };
      
        app.controller = function (optional_name, optional_config) {
          define(configulator(optional_name, optional_config, defaults({ 
            method: 'post', 
            updates: false,
            appends_to: false,
            view: false,
            partial: false
          })));
          return app;
        };
      
        //
        // Binding an arbitrary function to an error instead of a handler.
        // This may get deprecated at some point.
        //
      
        app.error = function(code, handler_fn) {
          this.bind(code, function (event, data) {
            handler_fn(data);
          })
          return this;
        };

        app.setInterpolatedLocation = function(path, optional_data) {
          if (optional_data) {
            path = roweis.fully_interpolated(path, optional_data);
          }
          if (path.match(/^#/)) {
            app.setLocation(path);
          }
          else window.location = path;
        };
      
      };
  
    };
        
    roweis.fully_interpolated = fully_interpolated;
  
    return roweis;

  })();

})(jQuery);