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

/*

general comment:

Needs a bit of a rethink. Its fundamental purpose is to write sinatra-style handlers for you.
Ok, 1. make the API match what it claims to do, and 2. lay the code out along those lines.

*/

;(function ($, undefined) {

Sammy.Roweis = function (app_name, options) {
  
  app_name = app_name || 'main';
  
  app_options = $.extend(
    { partial_root: '', partial_suffix: '' }
    Sammy.Haml ? { partial_suffix: '.haml' } : {},
    options || {}
  );
  
  return function (app, host) {
    
    Sammy.Roweis.applications[app_name] = app;
    host = host || '';
    
    app.renderer_makers = [];
    
    app.controllers = (function () {
      
      var restful_verbs = ['get', 'post', 'put', 'delete'];

      var controllers = {};
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
      
      controllers.define = function (optional_name, config) {
        
        config = config || {};
          
        if ('string' === typeof(optional_name)) {
          config.name = optional_name;
        }
        else if ('object' === typeof(optional_name)) {
          config = $.extend({}, config, optional_name);
        }
      
        // base controller properties
        // TODO: prototype this and .def
        var controller = {
          render: function (render_context, render_callback) {
            if ('undefined' === typeof(controller.view)) {
              console.error('cannot render without a view');
            }
            var render_datum = function (datum_callback) {
              return function (i, datum) {
                var localData = $.extend(
                  { 
                    safely: function (_) { return 'undefined' === typeof(_) ? '' : _ },
                    datum: i
                  },
                  render_context.params,
                  datum || {},
                  (controller.store.get('etc') ? { etc: controller.store.get('etc') } : {})
                );
                render_context.partial(
                  controller.view,
                  localData, 
                  datum_callback
                );
              };
            };
            var pseudoLength = isLikeAnArrayLength(render_context.data);
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
                    })(this_index, render_context.data[this_index]);
                  });
                })(i)
              }
              renderers.push(function () {
                render_callback(rendering_in_progress);
              });
              renderers[0]();
            }
            else {
              render_datum(render_callback)(0, render_context.data);
            }
          },
          redirect: function (redirect_context, etc) {
            controller.store.set('etc', etc || {});
            redirect_context.redirect(controller.route)
          }
        };
        
        //decipher the various wacky config options
        if ('object' == typeof(config)) {
          for (var j in config) {
            if (config.hasOwnProperty(j)) {
              controller[j] = config[j];
            }
          }
        }
        else if ('string' == typeof(config)) {
          controller.name = config;
        }
        else if ('function' == typeof(config)) {
          controller.get = config;
        }
      
        // decipher assignments to the default methods in the wacky config options
        $.each(restful_verbs, function (i, verb) {
          if ('string' === typeof(controller[verb])) {
            // assign a server controller
            var server_route = controller[verb];
            var host_partial_path = server_route.match(/^\//) ? server_route : '/' + server_route;
            
            controller[verb] = function (context, callback) {
              transformed_path = host_partial_path;
              $.each(host_partial_path.match(/\:[a-zA-Z_]\w*/g) || [], function(i, parameter) {
                transformed_path = transformed_path.replace(parameter, context.params[parameter.substring(1)])
              });
              $.ajax({
                url: host + transformed_path,
                type: verb.match(/^del/) ? 'delete' : verb,
                cache: false,
                etc: {
                  controller: controller,
                  context: context
                },
                data: context.params.toHash(),
                success: function (data, textStatus, xhr) {
                  context.data = $.extend(context.data || {}, data);
                  callback(context, data);
                }
              });
            };
            
            if (controller.name) {
              // do nothing
            }
            else if (server_route.match(/^[^\/]+$/)) {
              controller.name = server_route;
            }
            else {
              var m = server_route.match(/^\/([^\/]+)$/);
              if (m) {
                controller.name = m[1];
              }
            }
          }
        });
      
        // do we need a name?
        if (undefined === controller.name) {
          console.error('no name supplied')
        }
      
        // add some computed defaults
        if (undefined === controller.route) {
          controller.route = '#/' + controller.name
        }
        controller.view = controller.view || app_options.partial_root + '/' + controller.name;
        if (!controller.view.match(/\.[^\/]+$/)) {
          controller.view = controller.view + app_options.partial_suffix;
        }
        controller.store = controller.store || new Sammy.Store({ name: controller.name });
        
        if (controller.renders) {
          app.renderer_makers.push(function (render_target_context) {
            return function (selection) {
              return selection
                .find(controller.renders)
                  .ergo(function (element) {
                    controller.render(render_target_context, function (rendered) {
                      element
                        .html(rendered);
                    });
                  })
                  .end()
                .end();
            };
          });
        }
      
        // assign the default get verb if nothing else has been bound
        if ( !( controller.get  ) 
          && !( controller.post )
          && !( controller.put  )
          && !( controller.del  )
        ) {
          controller.get = controller.get || (function (n0thing_cantext, n0thing_callback) {
            return n0thing_callback(n0thing_cantext);
          });
        }
      
        // routes and bindings
        $.each(['get', 'post', 'put', 'del'], function (i, verb) {
          if (controller[verb]) {
            // event name
            var event_name = 'render.' + controller.name + '.' + verb;
            // render_callback: what to do with rendered html
            var after;
            if (controller.redirectsTo) {
              after = function (redirection_context) {
                controllers[controller.redirectsTo].redirect(redirection_context);
              }
            }
            else {
              after = function (render_context, data) {
                controller.render(render_context, function (primary_rendered) {
                  var renderers = $.map(app.renderer_makers, function(maker) { 
                    return maker(render_context); 
                  });
                  var one_level_unobtrusive_render = function (element, render_callback) {
                    $.each(renderers, function (i, renderer_fn) {
                      renderer_fn(element, render_callback);
                    })
                  };
                  var recursive = function (element) {
                    one_level_unobtrusive_render(element, recursive);
                    return element;
                  }
                  app.swap(recursive($(primary_rendered))); 
                });
                // unobtrusive
                
              }
            }
            if (controller.route) {
              // trigger a default render event when the route is handled
              app[verb](controller.route, function (handler_context) {
                app.trigger(event_name, $.extend({}, handler_context.params, {callback: after}));
              });
            }
            // handle an event
            app.bind(event_name, function (e, data) {
              controller[verb](this, data.callback);
            });
          }
        });
        
        // add to controllers
        controllers[controller.name] = controller;
        
        return controllers; // so we cn chain
        
      };
      controllers.def = controllers.define;
      return controllers;
    })();
    
  };

};

Sammy.Roweis.applications = {};

})(jQuery);