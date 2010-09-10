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

;(function ($, F, undefined) {
  
  // HELPERS!
      
  var restful_verbs_future_tense = ['gets', 'posts', 'puts', 'deletes'];
  
  var present_tense = function (verb) {
    return verb.match(/^get/) ? 'get' : (
      verb.match(/^post/) ? 'post' : (
      verb.match(/^put/) ? 'put' : (
      verb.match(/^del/) ? 'delete' : (verb)
    )));
  };

  var isLikeAnArrayLength = function(obj) {
    var likeLength = 0;
    for (var iObj in obj) {
      if (obj.hasOwnProperty(iObj) && !(iObj.toString().search(/^-?[0-9]+$/) == 0)) {
        return false;
      }
      likeLength = likeLength + 1;
    }
    return likeLength;
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
      var parameter_value = data[parameter_name] ||
        (data.params && data.params[parameter_name]) ||
        (data.params && data.params.etc && data.params.etc[parameter_name]) ||
        (data.params && data.params.etc && data.params.etc.server_data && 
          data.params.etc.server_data[parameter_name]) ||
        (data.etc && data.etc[parameter_name]);
      transformed_path = transformed_path.replace(parameter, parameter_value);
    });
    return transformed_path;
  };
  
  // the standard action steps
  var action_steps = ['action_base', 'action_render', 'action_update_dom', 'action_redirect'];

  // filtering etc from parameters
  
  var actual_params = function (parameters) {
    var actuals = $.extend({}, parameters);
    delete actuals.etc;
    return actuals.toHash();
  };
  
  // recursive extend
  
  var meld = (function () {
    var recursor = function () {
      var args = F.select(F.I, arguments);
      if (args.length == 0) {
        return;
      }
      else if (args.length == 1) {
        return args[0];
      }
      else if (F.some("typeof(_) !== 'object'", args)) {
        return args[args.length - 1];
      }
      else return F.foldl(function (extended, obj) {
        for (var i in obj) {
          if (obj.hasOwnProperty(i)) {
            extended[i] = recursor(extended[i], obj[i]);
          }
        }
        return extended;
      }, {}, args);
    };
    return recursor;
  })();
  
  

  // THE BUSINESS AT HAND
  
  Sammy.Roweis = (function () {
  
    var roweis = function (app_name, optional_options) {
  
      app_name = app_name || 'app';
  
      app_options = meld(
        { partial_root: '', partial_suffix: '' },
        { highlight_options: {}, highlight_duration: 3000 },
        Sammy.Haml ? { partial_suffix: '.haml' } : {},
        optional_options || {}
      );
  
      return function (app, host) {
      
        roweis[app_name] = app;
        host = host || '';
      
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
          
          if (undefined === config.route) {
            // default route if it is not set to 'false'
            config.route = '#/' + config.name;
          }
          
          // and a default view
        
          if (undefined === config.partial) {
            config.partial = app_options.partial_root + '/' + config.name;
            if (!config.partial.match(/\.[^\/]+$/)) {
              config.partial = config.partial + app_options.partial_suffix;
            }
          }
          
          // Now we're ready to build the view or controller
      
          var my_after_event_name = function(event_name) {
            return config.name + '.' + event_name;
          };
        
          // the 'null' or 'no-op' action, does not change
          // the context
          var trigger_after_event = function (event_name) {
            return function (context, optional_data) {
              var data = optional_data || {};
              
              var my_event = my_after_event_name(event_name);
              //console.log('('+handler.config.name+'): triggering ' + my_event);
              app.trigger(my_event, data);
              //console.log('('+handler.config.name+'): '+my_event + ' was triggered');
              
              //console.log('('+handler.config.name+'): triggering ' + event_name);
              app.trigger(event_name, data);
              //console.log('('+handler.config.name+'): '+event_name + ' was triggered');
              
            };
          };

          var handler = {
            config: config,
            action_base: config.action_base,
            action_render: config.action_render,
            action_update_dom: config.action_update_dom,
            action_redirect: config.action_redirect
          };
        
          // The Action Lifecycle.
          
          // first, look for predefined steps
          
          $.each(action_steps, function(i, action_step) {
            if ('function' === typeof(config[action_step])) {
              handler[action_step] = config[action_step];
            }
          });
        
          // Start: action_base
          
          if (undefined === handler.action_base) {
            // check for a server path
            $.each(restful_verbs_future_tense, function (i, verb) {
              if (typeof(config[verb]) === 'string') {
                var server_route = config[verb];
                var host_partial_path = server_route.match(/^\//) ? server_route : '/' + server_route;
                handler.action_base = function (context, data) {
                  var request_object = {
                    // error: function (data, textStatus, xhr) { 
                    //   console.error('phooey'); 
                    // },
                    url: host + interpolate(host_partial_path, context),
                    type: present_tense(verb),
                    cache: false,
                    etc: {
                      handler: handler,
                      context: context
                    },
                    data: actual_params(context.params),
                    success: function (data_from_server, textStatus, xhr) {
                      var new_data = meld({ etc: {server_data: data_from_server} }, context.params.toHash())
                      trigger_after_event('after.action_base')(context, new_data);
                    }
                  };
                  $.ajax(request_object);
                };
                
              }
            });
          }
        
          if (undefined === handler.action_render) {
            if (config.partial) {
              handler.action_render = function (render_context, data) {
                // console.log('data available to rendering of ' + handler.config.name + 's action_render: ');
                // console.log(data); 
                var server_data = (data && data.etc && data.etc.server_data) || {};
                var render_callback = function (html_rendered) {
                  trigger_after_event('after.action_render') (
                    render_context, 
                    meld(data, { etc: { html_rendered: html_rendered } })
                  );
                }
                var render_datum = function (datum_callback) {
                  return function (i, datum) {
                    var localData = meld(
                      { 
                        safely: function (_) { return 'undefined' === typeof(_) ? '' : _ },
                        params: render_context.params,
                        etc: {},
                        datum: i
                      },
                      datum || {}
                    );
                    render_context.partial(
                      config.partial,
                      localData, 
                      datum_callback
                    );
                  };
                };
                var pseudoLength = isLikeAnArrayLength(server_data);
                if (pseudoLength) {
                  // create a new scope so we can use 'rendering in progress'
                  var rendering_in_progress = '';
                  var renderers = [];
                  for (var i = 0; i < pseudoLength; ++i) {
                    (function (this_index) {
                      renderers.push(function () {
                        render_datum(function (rendered) {
                          rendering_in_progress = rendering_in_progress + rendered + '\n';
                          renderers[this_index + 1]();
                        })(this_index, server_data[this_index]);
                      });
                    })(i)
                  }
                  renderers.push(function () {
                    render_callback(rendering_in_progress);
                  });
                  renderers[0]();
                }
                else render_datum(render_callback)(0, server_data);
              };
            };
          }
        
          if (undefined === handler.action_update_dom) {
            if (config.route) {
              handler.action_update_dom = function (update_context, data) {
                var html_rendered = data.etc.html_rendered;
                if (html_rendered) {
                  app.swap(html_rendered);
                  trigger_after_event('after.action_update_dom')(update_context, data);
                }
              };
            }
            else if (config.renders) {
              handler.action_update_dom = function (update_context, data) {
                var html_rendered = data.etc.html_rendered;
                if (html_rendered) {
                  app
                    .$element()
                      .find(config.renders)
                        .ergo(function (placeholder) {
                            var p_parent = placeholder
                              .parent();
                            placeholder
                              .replaceWith(html_rendered);
                            p_parent
                              .children()
                                .effect("highlight", app_options.highlight_options, app_options.highlight_duration);
                            trigger_after_event('after.action_update_dom')(update_context, data);
                        })
                        .end()
                      .end();
                }
              };
            }
          }
        
          if (undefined === handler.action_redirect && config.redirects_to) {
            handler.action_redirect = function (redirect_context, data) {
              redirect_context.redirect(interpolate(config.redirects_to, redirect_context));
              trigger_after_event('after.action_redirect')(redirect_context, data);
            }
          }
          
          // now we wire our action steps to each other with events
          var action_steps_in_use = $.map(action_steps, function (action_step) {
            if ('function' === typeof(handler[action_step])) {
              handler[action_step].owner = handler;
              return action_step;
            }
          });
          
          var first_step = action_steps_in_use.shift();
          
          // we start with the two ways the first step can be invoked from
          // the application
          (function (callback) {
            if (config.method && config.route) {
              app[config.method](config.route, function (handler_context) {
                callback(handler_context, {});
              });
            }
            if (config.renders) { 
              app.bind('after.action_update_dom', function (e, data) {
                // If the selector defined by the controller being bound matches the 
                // data, we care about this and want to hear when it's done rendering
                if(app.$element().find(config.renders).length) {
                  
                  //var invokee = handler[first_step];
                  
                  callback(this, data);
                  
                }
              });
            }
          })(handler[first_step]);
        
          (function (previous_step) {
            while (action_steps_in_use.length) {
              (function (next_step, event_name) {
                (function (callback) {
                  app.bind(event_name, function (e, data) {
                    callback(this, data);
                  });
                })(handler[next_step]);
                previous_step = next_step;
              })(action_steps_in_use.shift(), my_after_event_name('after.' + previous_step))
            }
          })(first_step);
        
        };
      
        // this is the api for calling the define function
      
        app.view = function (optional_name, optional_config) {
          define(configulator(optional_name, optional_config, { 
            method: 'get', 
            action_redirect: false 
          }));
          return app;
        };
      
        app.controller = function (optional_name, optional_config) {
          define(configulator(optional_name, optional_config, { 
            method: 'post', 
            action_render: false,
            action_update_dom: false,
            view: false 
          }));
          return app;
        };
      
      };
  
    };
        
    roweis.fully_interpolated = function(hash_path, data) {
      data = meld({}, data);
      $.each(hash_path.match(/\:[a-zA-Z_]\w*/g) || [], function(i, parameter) {
        var parameter_name = parameter.substring(1);
        var parameter_value = data[parameter_name];
        delete data[parameter_name];
        hash_path = hash_path.replace(parameter, parameter_value);
      });
      var params = [];
      $.each(data, function (parameter_name, parameter_value) { 
        if (data.hasOwnProperty(parameter_name) && parameter_value || 0 === parameter_value) {
          params.push(encodeURIComponent(parameter_name) + '=' + encodeURIComponent(parameter_value));
        }
      })
      return F.select(F.I, [
        hash_path,
        F.select(F.I, params).join('&')
      ]).join('?')
    };
    
    roweis.relocate = function(path, optional_data) {
      if (optional_data) {
        path = roweis.fully_interpolated(path, optional_data);
      }
      if (path.match(/^#/)) {
        window.location.hash = path.substring(1);
      }
      else window.location = path;
    };
  
    return roweis;

  })();

})(jQuery, Functional);