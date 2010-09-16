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
        { name: app_name, children: [] },
        optional_options || {}
      );
  
      return function (app, host) {
      
        roweis[app_name] = app;
        app.roweis = app_options,
        app.roweis.host = host || '';
        
        app.roweis.children = [];
        
        // children receive events from parents
        if (undefined !== app_options.parent) {
          app.parent = app_options.parent;
          app.parent.roweis.children.push(app);
        }
        
        var root_element_selector = app_options.updates || app.element_selector || 'body';
        
        // $$element is the element to update the DOM
        app.$$element = function () {
          return $(root_element_selector);
        }
        
        app.handlers = [];
      
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
          
          // and a default partial
        
          if (undefined === config.partial) {
            config.partial = config.name;
          }
          if (config.partial && app_options.partial_suffix && !config.partial.match(/\.[^\/]+$/)) {
            config.partial = config.partial + app_options.partial_suffix;
          }
          if (config.partial && app_options.partial_root) {
            config.partial = [app_options.partial_root, config.partial].join('/');
          }
          
          // and a default DOM selector to update
          
          if (undefined === config.updates) {
            config.updates = config.renders || root_element_selector;
          }
          
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
        
          // the 'null' or 'no-op' action, does not change
          // the context
          var trigger_after_event = function (event_name) {
            var apps_to_trigger = $.merge([], [app], app.roweis.children);
            var event_names = [
              after_event_name(event_name),
              my_after_event_name(event_name)
            ];
            return function (context, optional_data) {
              var data = optional_data || {};
              $.each(apps_to_trigger, function (i, app_to_trigger) {
                $.each(event_names, function (i, name) {
                  console.log(config.name + ' is triggering ' + name + ' in ' + app.roweis.name);
                  app_to_trigger.trigger(name, data);
                });
              });
            };
          };

          var handler = {
            app: app,
            config: config,
            action_base: config.action_base,
            action_render: config.action_render,
            action_update_dom: config.action_update_dom,
            action_redirect: config.action_redirect
          };
          
          if ('string' === typeof(config.name) && !app.handlers[config.name]) {
            app.handlers[config.name] = handler;
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
          
          if (undefined === handler.action_base) {
            // check for a server path
            $.each(restful_verbs_future_tense, function (i, verb) {
              if (typeof(config[verb]) === 'string') {
                var server_route = config[verb];
                var host_partial_path = server_route.match(/^\//) ? server_route : '/' + server_route;
                handler.action_base = function (context, data) {
                  var request_object = {
                    // error: function (data, textStatus, xhr) { 
                    //   console.log(handler.config.name); 
                    // },
                    url: app.roweis.host + interpolate(host_partial_path, context),
                    type: present_tense(verb),
                    cache: false,
                    etc: {
                      handler: handler,
                      context: context
                    },
                    data: actual_params(context.params),
                    success: function (data_from_server, textStatus, xhr) {
                      var new_data = meld({ etc: {server_data: data_from_server} }, context.params.toHash())
                      trigger_after_event('action_base')(context, new_data);
                    }
                  };
                  $.ajax(request_object);
                };
              }
            });
          }
          
          //
          // ACTION_RENDER
          //
          
          var meld_html_with_data_and_trigger_after_event = function(render_context, data) {
            return function (html_rendered) {
              trigger_after_event('action_render') (
                render_context, 
                meld(data, { etc: { html_rendered: html_rendered } })
              );
            };
          };
          
          var render_one_or_many_datums_to_html = function(render_context, data, datum_renderer) {
            var render_callback = meld_html_with_data_and_trigger_after_event(render_context, data);
            var server_data = (data && data.etc && data.etc.server_data) || render_context.params.toHash();
            var pseudoLength = isLikeAnArrayLength(server_data);
            if (pseudoLength) {
              // create a new scope so we can use 'rendering in progress'
              var rendering_in_progress = '';
              var renderers = [];
              for (var i = 0; i < pseudoLength; ++i) {
                (function (this_index) {
                  renderers.push(function () {
                    datum_renderer(function (rendered) {
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
            else datum_renderer(render_callback)(0, server_data);
          };
        
          if (undefined === handler.action_render) {
            if (config.partial) {
              handler.action_render = function (render_context, data) {
                render_one_or_many_datums_to_html(render_context, data, function (datum_callback) {
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
                });
              };
            };
          }
          else if ('function' === typeof(handler.action_render)) {
            var unwrapped_handler = handler.action_render;
            if (0 === unwrapped_handler.length) {
              handler.action_render = function (render_context, data) {
                var html = unwrapped_handler();
                meld_html_with_data_and_trigger_after_event(render_context, data)(html);
              };
            }
            else if (1 === unwrapped_handler.length) {
              handler.action_render = function (render_context, data) {
                render_one_or_many_datums_to_html(render_context, data, function (data_callback) {
                  return function (i, datum) {
                    data_callback(unwrapped_handler(datum));
                  };
                });
              };
            }
          }
          
          //
          // ACTION_UPDATE_DOM
          //
        
          if (undefined === handler.action_update_dom) {
            var actions = [];
            if (config.updates) {
              actions.push(function (html_rendered) {
                $(config.updates)
                  .html(html_rendered);
                return true;
              })
            }
            if (config.appends_to) {
              actions.push(function (html_rendered) {
                $(html_rendered)
                  .appendTo(config.appends_to);
                return true;
              })
            }
            if (config.renders) {
              actions.push(function (html_rendered) {
                var return_value = false;
                app
                  .$$element()
                    .find(config.renders)
                      .ergo(function (placeholder) {
                        return_value = true;
                        var p_parent = placeholder
                          .parent();
                        placeholder
                          .replaceWith(html_rendered);
                        // p_parent
                        //   .roweis.children()
                        //     .when('.effect')
                        //       .ergo(function (new_elements) {
                        //         new_elements
                        //           .effect("highlight", app_options.highlight_options, app_options.highlight_duration)
                        //       })
                        //       ;
                      })
                      .end()
                    .end();
                return return_value;
              })
            }
            if (actions.length) {
              handler.action_update_dom = function (update_context, data) {
                var html_rendered = data && data.etc && data.etc.html_rendered;
                if (html_rendered) {
                  var dom_is_dirty = false;
                  $.each(actions, function (i, action_fn) {
                    dom_is_dirty = action_fn(html_rendered) || dom_is_dirty;
                  })
                  if (dom_is_dirty) {
                    trigger_after_event('action_update_dom')(update_context, data);
                  }
                }
              };
            }
          }
        
          if (undefined === handler.action_redirect && config.redirects_to) {
            handler.action_redirect = function (redirect_context, data) {
              redirect_context.redirect(interpolate(config.redirects_to, redirect_context));
              trigger_after_event('action_redirect')(redirect_context, data);
            }
          }
          
          //
          // EVENTS
          //
          
          // the list of events for this handler
          var action_steps_in_use = $.map(action_steps, function (action_step) {
            if ('function' === typeof(handler[action_step])) {
              handler[action_step].owner = handler;
              return action_step;
            }
          });
          var first_step = action_steps_in_use.shift();
          
          (function (handler_first_step_fn) {
            
            //
            // triggering a handler through a route
            //
            if (config.method && config.route) {
              app[config.method](config.route, function (handler_context) {
                handler_first_step_fn(handler_context, {});
              });
            }
            
            //
            // triggering a handler unobtrusively
            //
            if (config.renders) { 
              app.$element().data('__debug_observed', true);
              console.log(config.name + " is listening to action_update_dom in " + app.roweis.name);
              var updater_fn = function (e, data) {
                // If the selector defined by the controller being bound matches the 
                // data, we care about this and want to hear when it's done rendering
                if (app.$$element().find(config.renders).length) {
                  handler_first_step_fn(this, data);
                }
              };
              app
                .bind(after_event_name('action_update_dom'), updater_fn)
                // .bind('run', function() {console.log('running from render')})
                .bind('run', updater_fn);
            }
            
          })(handler[first_step]);
          
          // wriring each handler's next step to its previous step
        
          (function (previous_step) {
            while (action_steps_in_use.length) {
              (function (next_step, event_name) {
                (function (handler_next_step_fn) {
                  console.log('binding ' + config.name+ '\'s ' + event_name + ' step to its ' + previous_step + ' step');
                  app.bind(event_name, function (e, data) {
                    handler_next_step_fn(this, data);
                  });
                })(handler[next_step]);
                previous_step = next_step;
              })(action_steps_in_use.shift(), my_after_event_name(previous_step))
            }
          })(first_step);
        
        };
      
        // this is the api for calling the define function
      
        app.view = function (optional_name, optional_config) {
          define(configulator(optional_name, optional_config, { 
            method: 'get',
            appends_to: false,
            action_redirect: false 
          }));
          return app;
        };
      
        app.controller = function (optional_name, optional_config) {
          define(configulator(optional_name, optional_config, { 
            method: 'post', 
            updates: false,
            appends_to: false,
            partial: false
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
        if ('etc' != parameter_name && data.hasOwnProperty(parameter_name) && (parameter_value || 0 === parameter_value)) {
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