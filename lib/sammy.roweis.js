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
  
// HELPERS
      
var restful_verbs = ['get', 'post', 'put', 'delete'];

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

var configulator  = function (optional_name, optional_config, defaults) {
        
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
    transformed_path = transformed_path.replace(parameter, data[parameter.substring(1)])
  });
  return transformed_path;
};


// THE BUSINESS AT HAND
  
Sammy.Roweis = (function () {
  
  var roweis = function (app_name, optional_options) {
  
    app_name = app_name || 'app';
  
    app_options = $.extend(
      { partial_root: '', partial_suffix: '' },
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
        
        var config.name = config.name ||
          (typeof(config.gets) === 'string' ? config.gets : null) ||
          (typeof(config.posts) === 'string' ? config.posts : null) ||
          (typeof(config.puts) === 'string' ? config.puts : null) ||
          (typeof(config.deletes) === 'string' ? config.deletes : null);
          
        // and now some messy stuff for configuring a default route oif
        // there is no name and it is not false
        
        if (undefined === config.route) {
          config.route = '#/' + config.name
        }
        
        // Now we're ready to build the view or controller
      
        
        var my_after_event_name = function(event_name) {
          return config.name + '.' + event_name;
        };
        
        // the 'null' or 'no-op' action, does not change
        // the context
        var trigger_after_event = function (event_name) {
          return function (context, optional_data) {
            var data = $.extend(
              { view: violler, controller: violler },
              optional_data || {}
            );
            app.trigger(my_after_event_name(event_name), data);
            app.trigger(event_name, data);
          };
        };

        var violler = {
          name: config.name,
          action_ajax: trigger_after_event('after.action_ajax'),
          action_render: trigger_after_event('after.action_render'),
          action_update_dom: trigger_after_event('after.action_update_dom'),
          action_redirect: trigger_after_event('after.action_redirect')
        };
        
        // The Action Lifecycle. We are not defining triggers to start it off
        
        // Start: action_ajax
        
        // check for a server path
        $.each(restful_verbs, function (i, verb) {
          if (typeof(config[verb]) === 'string') {
            var server_route = config[verb];
            var host_partial_path = server_route.match(/^\//) ? server_route : '/' + server_route;
            var type = verb.match(/^get/) ? 'get' : (
              verb.match(/^post/) ? 'post' : (
              verb.match(/^put/) ? 'put' : (
              verb.match(/^del/) ? 'delete' : (verb)
            )));
            violler.action_ajax = function (context) {
              $.ajax({
                url: host + interpolate(host_partial_path, context.params),
                type: type,
                cache: false
                data: context.params.toHash(),
                success: function (data, textStatus, xhr) {
                  context.data = $.extend({}, context.data || {}, data);
                  trigger_after_event('after.action_ajax', data);
                }
              });
            };
            return false;
          }
        });
        
        // Next: Action_render
        if (config.view) {
          violler.action_render = ? (function (render_context) {
            var render_callback = function (html_rendered) {
              render_context.html_rendered = html_rendered;
              trigger_after_event('after.action_render', { html_rendered: html_rendered });
            }
            var render_datum = function (datum_callback) {
              return function (i, datum) {
                var localData = $.extend(
                  { 
                    safely: function (_) { return 'undefined' === typeof(_) ? '' : _ },
                    datum: i
                  },
                  render_context.params,
                  datum || {}
                );
                render_context.partial(
                  config.view,
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
            else render_datum(render_callback)(0, render_context.data);
          });
        };
        
        if (config.route) {
          violler.action_update_dom = function (update_context) {
            var html_rendered = update_context.html_rendered;
            if (html_rendered) {
              app.swap(html_rendered);
            }
          };
          trigger_after_event('after.action_update_dom');
        }
        else if (config.renders) {
          violler.action_update_dom = function (update_context) {
            var html_rendered = update_context.html_rendered;
            if (html_rendered) {
              app
                .$element()
                  .find(config.renders)
                    .ergo(function (placeholder) {
                        placeholder
                          .html(html_rendered);
                    })
                    .end()
                  .end();
            }
            trigger_after_event('after.action_update_dom');
          };
        }
        
        violler.action_redirect = function (redirect_context) {
          if (config.route) {
            redirect_context.redirect(interpolate(config.route, redirect_context.params));
          }
          trigger_after_event('after.action_redirect');
        }
        
        // now we wire our action steps to each other with events
        
        // first, handling routes
        
        if (config.method && config.route) {
          // trigger the (possibly n00p) ajax
          app[config.method](config.route, function (handler_context) {
            violler.action_ajax(handler_context);
          });
        }
        
        // next, triggering on a selector
        
        if (config.renders) {
          app.bind('after.action_update_dom', function (e, data) {
            violler.action_ajax(this);
          });
        }
        
        // render follows ajax
        app.bind(my_after_event_name('after.action_ajax'), function (e, data) {
          violler.action_render(this);
        });
        
        // update dom folows render
        app.bind(my_after_event_name('after.action_render'), function (e, data) {
          violler.action_update_dom(this);
        });
        
        // redirect follows update_dom
        app.bind(my_after_event_name('after.action_update_dom'), function (e, data) {
          violler.action_redirect(this);
        });
        
      };
      
      // thsi is the api for calling the define function
      
      app.view = function (optional_name, optional_config) {
        define(configulator(optional_name, optional_config, { method: 'get', action_redirect: null }));
        return app;
      };
      
      app.controller = function (optional_name, optional_config) {
        define(configulator(optional_name, optional_config, { method: 'post', action_render: null }));
        return app;
      };
      
    };
  
  };
  
  return roweis;

})();

})(jQuery);