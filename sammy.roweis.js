/*

Roweis, lightweight controllers and views for the Sammy JS framework.

http://github.com/raganwald/Roweis
http://github.com/quirkey/sammy

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
  
Sammy.Roweis = function (app) {
  
  this.helpers({
    controllers: function () { return Sammy.Roweis.controllers; }
  });
  
  this.bind('run', function (element, data) {
    
    var restful_verbs = ['get', 'post', 'put', 'delete'];
    
    var delegate_controller_makers = (function () {
      var makers = {};
      $.each(restful_verbs, function(i, verb) {
        makers[verb] = function (controller, server_route) {
          var host_path = server_route.match(/^\//) ? server_route : '/' + server_route;
          var view = Sammy.Roweis.controllers[controller.view];
          return function (context) {
            var success_fn = view ? function (data, textStatus, xhr) {
                view.redirect(context, $.extend({}, context.params, data));
              } : function (data, textStatus, xhr) {
                controller.render(context, $.extend({}, context.params, data));
              };
            $.ajax({
              url: host_path,
              type: verb.match(/^del/) ? 'delete' : verb,
              cache: false,
              etc: {
                controller: controller,
                context: context
              },
              data: context.params.toHash(),
              success: success_fn
            });
          }
        };
      });
      return makers;
    })();
    
    for (var i_controller in Sammy.Roweis.controllers) {
      if (Sammy.Roweis.controllers.hasOwnProperty(i_controller) && i_controller != 'def') {
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
              context.redirect(controller.path)
            }
          };
          
          //decipher the various wacky config options
          var config = Sammy.Roweis.controllers[i_controller];
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
          controller.path = controller.path || '#/' + controller.name,
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
            app.get(controller.path, controller.get);
          if (controller.post)
            app.post(controller.path, controller.post);
          if (controller.put)
            app.put(controller.path, controller.put);
          if (controller.del)
            app.del(controller.path, controller.del);
            
          // add to controllers
          Sammy.Roweis.controllers[controller.name] = controller;
          
        })();
    
      }
    }
  });
};

Sammy.Roweis.controllers = [];
Sammy.Roweis.controllers.def = function() {
  $.each(arguments, function (i, element) { Sammy.Roweis.controllers.push(element); });
};
  
})(jQuery);