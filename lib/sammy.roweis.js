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

;(function ($) {

Sammy.Roweis = function (app_name) {
  
  app_name = app_name || 'main';
  
  return function (app, host) {
    
    Sammy.Roweis.applications[app_name] = app;
    host = host || '';
  
    app.controllers = (function () {
      var arr = [];
      arr.def = function () {
        $.each(arguments, function (i, element) { arr.push(element); });
      };
      return arr;
    })();
  
    this.bind('run', function (element, data) {
    
      var restful_verbs = ['get', 'post', 'put', 'delete'];
    
      var delegate_controller_makers = (function () {
        var makers = {};
        $.each(restful_verbs, function(i, verb) {
          makers[verb] = function (controller, server_route) {
            var host_partial_path = server_route.match(/^\//) ? server_route : '/' + server_route;
            var success_maker;
            var targets; 
            if ('undefined' === typeof(controller.view)
                || 'string' === typeof(controller.view)) {
              targets = [controller.view]
            }
            else if ('object' === typeof(controller.view)) {
              targets = controller.view;
            }
            var success_makers = $.map(targets, function (target) {
              if ('string' === typeof(target)) {
                if (target.match(/^[A-Za-z_][A-Za-z_0-9]*$/)) {
                  // event-based redirect
                  if (app.controllers[target]) {
                    // target exists
                    return function (context) {
                      return function (data, textStatus, xhr) {
                        app.trigger(target, $.extend({}, context.params, data));
                      }
                    };
                  }
                  else {
                    console.log("No controller found for '"+target+"'");
                  }
                }
                else {
                  var m = target.match(/^#\/([A-Za-z_][A-Za-z_0-9]*)$/);
                  if (m) {
                    // http redirect
                    var target_controller = app.controllers[m[1]];
                    if (target_controller) {
                      console.info('named redirect');
                      // redirect by name
                      return function (context) {
                        return function (data, textStatus, xhr) {
                          target_controller.redirect(context, $.extend({}, context.params, data));
                        }
                      }
                    }
                    else {
                      // assume this is a raw redirect
                      console.info('raw redirect');
                      return function (context) {
                        return function (data, textStatus, xhr) {
                          context.redirect(target);
                        }
                      }
                    }
                  }
                  else {
                    // string lambdas
                    console.error('string lambda? "' + target + '"');
                  }
                }
              }
              else if ('undefined' === typeof(target)) {
                return function (context) {
                  return function (data, textStatus, xhr) {
                    controller.render(context, $.extend({}, context.params, data));
                  }
                };
              }
              else {
                console.log(target);
                console.error('string lambdas and functions not implemented yet');
              }
            });
            var success_maker = function(context) {
              var successes = $.map(success_makers, function (mkr) {
                return mkr(context);
              }); 
              return function (data, textStatus, xhr) {
                $.each(successes, function (i, success_fn) {
                  success_fn(data, textStatus, xhr);
                });
              }
            };
            var view = app.controllers[controller.view];
            return function (context) {
              $.ajax({
                url: host + host_partial_path,
                type: verb.match(/^del/) ? 'delete' : verb,
                cache: false,
                etc: {
                  controller: controller,
                  context: context
                },
                data: context.params.toHash(),
                success: success_maker(context)
              });
            }
          };
        });
        return makers;
      })();
    
      for (var i_controller in app.controllers) {
        if (app.controllers.hasOwnProperty(i_controller) && i_controller != 'def') {
          (function () {
          
            // base controller properties
            var controller = {
              render: function (context, etc_etc) {
                var localData = {
                  safely: "'undefined' === typeof(_) ? '' : _".lambda(),
                  etc: $.extend(
                    {},
                    context.params.toHash(),
                    controller.store.get('etc') || {},
                    etc_etc || {}
                  )
                };
                context.partial(
                  controller.view,
                  localData, 
                  function(rendered) { context.swap(rendered); }
                );
              },
              redirect: function (context, etc) {
                controller.store.set('etc', etc || {});
                context.redirect(controller.route)
              }
            };
          
            //decipher the various wacky config options
            var config = app.controllers[i_controller];
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
                controller[verb] = delegate_controller_makers[verb](controller, assigned_to_verb)
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
            controller.name = controller.name || i_controller;
          
            // add some computed defaults
            controller.route = controller.route || '#/' + controller.name,
            controller.view = controller.view || 'haml/' + controller.name + '.haml';
            controller.store = controller.store || new Sammy.Store({ name: controller.name });
          
            // assign the default get verb if nothing else has been bound
            if ( !( controller.get  ) 
              && !( controller.post )
              && !( controller.put  )
              && !( controller.del  )
            ) {
              controller.get = controller.get || controller.render;
            }
          
            // routes
            if (controller.get)
              app.get(controller.route, controller.get);
            if (controller.post)
              app.post(controller.route, controller.post);
            if (controller.put)
              app.put(controller.route, controller.put);
            if (controller.del)
              app.del(controller.route, controller.del);
            
            // add to controllers
            app.controllers[controller.name] = controller;
          
          })();
    
        }
      }
    });
  };

};

Sammy.Roweis.applications = {};

})(jQuery);