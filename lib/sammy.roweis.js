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

Sammy.Roweis = function (app_name) {
  
  app_name = app_name || 'main';
  
  return function (app, host) {
    
    Sammy.Roweis.applications[app_name] = app;
    host = host || '';
    
    app.controllers = (function () {
      
      var restful_verbs = ['get', 'post', 'put', 'delete'];
      
      var delegate_controller_makers = (function () {
        var makers = {};
        $.each(restful_verbs, function(i, verb) {
          makers[verb] = function (controller, server_route) {
            var host_partial_path = server_route.match(/^\//) ? server_route : '/' + server_route;
            return function (context, callback) {
              $.ajax({
                url: host + host_partial_path,
                type: verb.match(/^del/) ? 'delete' : verb,
                cache: false,
                etc: {
                  controller: controller,
                  context: context
                },
                data: context.params.toHash(),
                success: function (data, textStatus, xhr) {
                  callback(context);
                }
              });
            }
          };
        });
        return makers;
      })();
      
      var controllers = {};
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
            var localData = {
              safely: "'undefined' === typeof(_) ? '' : _".lambda(),
              etc: $.extend(
                {},
                render_context.params,
                controller.store.get('etc') || {}
              )
            };
            render_context.partial(
              controller.view,
              localData, 
              render_callback
            );
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
          var assigned_to_verb = controller[verb];
          if ('string' === typeof(assigned_to_verb)) {
            // assign a delegating controller
            controller[verb] = delegate_controller_makers[verb](controller, assigned_to_verb);
            if (controller.name) {
              // do nothing
            }
            else if (assigned_to_verb.match(/^[^\/]+$/)) {
              controller.name = assigned_to_verb;
            }
            else {
              var m = assigned_to_verb.match(/^\/([^\/]+)$/);
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
        controller.view = controller.view || 'haml/' + controller.name + '.haml';
        controller.store = controller.store || new Sammy.Store({ name: controller.name });
      
        // assign the default get verb if nothing else has been bound
        if ( !( controller.get  ) 
          && !( controller.post )
          && !( controller.put  )
          && !( controller.del  )
        ) {
          controller.get = controller.get || (function () {});
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
              after = function (render_context) {
                controller.render(render_context, function (_) { app.swap(_); });
              }
            }
            if (controller.route) {
              // trigger a default render event when the route is handled
              app[verb](controller.route, function (handler_context) {
                app.trigger(event_name, after);
              });
            }
            // handle an event
            app.bind(event_name, function (e, callback) {
              var r = controller[verb](this, callback);
              if (r || undefined === r) {
                callback(this, r);
              }
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