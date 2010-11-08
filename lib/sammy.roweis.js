;(function ($, undefined) {

  // What is Roweis?
  // ---
  //
  // **Roweis** is a [Sammy](http://code.quirkey.com/sammy/index.html) plugin for building 
  // [Single Page Interface](http://itsnat.sourceforge.net/php/spim/spi_manifesto_en.php)
  // applications in a highly declarative manner using convention over configuration.
  // 
  // Roweis is not a framework: Roweis does not provide an "abstraction" that happens to be implemented
  // using Sammy. Instead, Roweis provides helper methods that build
  // Sammy [route](http://code.quirkey.com/sammy/docs/routes.html) and
  // [event](http://code.quirkey.com/sammy/docs/events.html) handlers for you.
  //
  // The simplest case is a function that handles accessing a particular hash location.
  // In Sammy, you would write a function to handle the root hash like this:
  //
  //     this.get('#/', function(context) {
  //       ...
  //     });
  //
  // Roweis takes a configuration hash and does two things with it:
  //
  // 1. Roweis builds a handler function, and
  // 2. Roweis binds the handler function to the hash location.
  //
  // In Roweis, you would declare a handler for the root hash location like this:
  //
  //     app.display({
  //       route: '',
  //       ...
  //     });
  //
  // The comments below will explain what else would be declared and why. The main thing is that Roweis
  // does most of its work with a hash of configuration options rather than a function, and it makes the function
  // for you, so that it ends up calling `.get('#/', ...)` on your behalf.
  // 
  // Roweis is a mildly opinionated library: Roweis is designed to help you build and maintain a certain type 
  // of client-side application. That does not mean that other types of applications are undesirable, just
  // that this is what Roweis does. The two reasons that Roweis is a library and not a framewok are:
  // 
  // 1. Roweis does not seek to teach you a non-portable abstraction to replace portable concepts like
  // URLs and hashes. Therefore, Roweis writes functions that happily live in Sammy's abstraction.
  // 2. Roweis seeks to make simple things easy and complex things possible. Therefore, when you need to 
  // do something outside of Roweis's sweet spot, you can work directly with Javascript, you can write a
  // Sammy handler directly, you can write a customized backbone view, you are not limited to working
  // within Roweis.
  //
  // What do I need to know to use Roweis?
  // ---
  //
  // A full description and tutorial is outside of the scope of this document, however here are a few key points:
  //
  // 1. Roweis is a client-side Javascript library. You must be familiar with "The Good Parts" of Javascript
  // and of the architecture of [Single Page Interface](http://itsnat.sourceforge.net/php/spim/spi_manifesto_en.php) 
  // applications.
  // 2. Roweis has hard dependencies on [Sammy](http://code.quirkey.com/sammy/index.html),
  // [jQuery](http://jquery.com/), and [Underscore](http://documentcloud.github.com/underscore/). You must have these
  // evaluated prior to evaluating `sammy.roweis.js`.
  // 3. It is not necessary to use or understand `underscore.js`, just to evaluate it so that Roweis can use it.
  // But as long as Roweis requries it, why not learn how to use it effectively?
  // 4. There are a number of declarations in Roweis that involve the use of jQuery selectors. The more expertise
  // you have with jQuery, the easier it will be to use Roweis.
  // 5. Roweis rests on top of Sammy's micro-framework. You absolutely, positively, **must** understand and embrace
  // Sammy's model of routes and handler functions to use Roweis.
  // 6. If you choose to install [Functional Javascript's](http://osteele.com/sources/javascript/functional/)
  // `to-function.js`, Roweis will let you use a string wherever a function is normally expected. Roweis works just fine
  // without `to-function.js` if you don't care to use it.
  //
  // Sammy + Roweis !== MVC
  // ---
  //
  // First, we should be clear what we mean when we talk about [MVC](http://en.wikipedia.org/wiki/Model%E2%80%93View%E2%80%93Controller).
  //
  // Our perspective is that out of the Box, Sammy does not provide MVC. Sammy works on a request-reponse model just like
  // Sinatra or Rails. This is useful when your application has certain obvious destinations that ought to be bookmarkable
  // and when your application ought to do sensible things when you click the back button.
  //
  // Sammy's model is therefore [(¬M)VC](https://github.com/raganwald/homoiconic/blob/master/2010/10/vc_without_m.md#readme).
  // There are no models, and therefore nothing for views to observe for changes. Instead, there are controllers in the
  // form of request handlers, and views in the form of templates or partials. Once a partial has been displayed, Javascript
  // events can be wired up from DOM nodes to to Sammy actions, again without a model to mediate.
  //
  // In the simplest case, Roweis follows this exact model. Roweis simply provides a declarative way to produce the exact
  // same architecture that Sammy supports. In Roweis you declare routes and partials, and you also get to declare
  // how Roweis sets up the locals for the partials to display.
  //
  // Sammy + Roweis + Backbone === MVC
  // ---
  //
  // It is not necessary to include [Backbone.js](http://documentcloud.github.com/backbone/) to use Roweis. However,
  // if you wish to introduce a full MVC model into your application, Roweis has direct support for backbone. (To be precise,
  // we think of backbone as providing a [PVC](https://github.com/raganwald/homoiconic/blob/master/2010/10/vc_without_m.md#readme) 
  // architecture, but this is quibbling.)
  //
  // Although you can build a wondeful application integrating Sammy directly with Backbone, we choose to use Roweis because
  // it still provides a declarative format for defining your application's presentation that continues to make simple things
  // easy.
  
  // Handler Steps
  // ---
  //
  // Roweis takes a configuration hash and produces a function that is bound
  // to Sammy's route handling API (there are also some other ways to invoke a Roweis handler that will be explained below).
  //
  // Sammy wants a function, and Roweis composes a function from a list of smaller functions
  //  called 'steps'. It is very possible to declare what you want your handler to do during any of the steps:
  //
  //     .display('bar', {
  //       fetch_data: function (data) {
  //         data.home_page = 'http://reginald.braythwayt.com';
  //       },
  //       partial: '/blitz'
  //     });
  //
  // But the real meat of what Roweis does is to write the steps for you based on other,
  // seemingly arbitrary declarations you write. For example, you could write:
  //
  //     .display('bar', {
  //       display: function (context, data, callback) {
  //         context.partial('/blitz.haml', callback);
  //       }
  //     });
  //
  // But Roweis provides a super-simple shortcut for this common operation:
  //
  //     .display('bar', {
  //       partial: '/blitz'
  //     });
  //
  // Behind the scenes, Roweis writes the longer function for you, using one or more of certain default steps:
  // `get_params`, `fetch_data`, `munge_data`, `display`, and `redirect`.
  //
  // (It is possible to define a different list of steps for certain advanced purposes with your application,
  // and there is also support for lightweight aspect-oriented programming by writing things like
  // `before_display`.)
  
  // When Roweis writes a handler, it follows a series of steps, and each has a name. The default steps
  // are listed here. The rest of the code you will see is oriented around writing functions for one or more of these
  // steps and composing them together:
  var default_step_names = [
  
    // Inspects the element associated with a handler and infers parameters from it. This is typically
    // not used, as parameters are usually obtained from a `GET` or `POST` bythe browser and injected
    // into `context.params` automatically by Sammy.
    'get_params',
  
    // Performs an action, and as a side-effect initializes the `data` parameter for all subsequent
    // steps to contains ome sort of action result.
    //
    // Roughly speaking, Roweis handlers either primarily dispolay something or primarily perfom 
    // an action that changes the applicatrion's state. Those that primarily display things usually
    // perform some sort of query during their `fetch_data` step, such as sending a `GET`
    // request to a server and putting the result inhto `data. Those that primarily perfom an 
    // action usually `POST` a resource to a server and place the result into `data`.
    // 
    // Besides defining `fetch_data` directly, you can use one of the short-cut methods
    // `gets`, `posts`, `puts`, or `deletes` to write this step.
    'fetch_data',
    
    // Transforms or "maps" the data from one form to another. Useful when a server
    // provides data in an idiosyncratic or inconvenient form. For example, if a server
    // is returning a list of models as an array, you can use `munge_data` as a convenient
    // place to transform `data.model_list` from `[model_1, model_2, ... model_n]` to
    // `{ models: [model_1, model_2, ... model_n] }`, which would make it easier to integrate
    // with Backbone.js
    'munge_data',
    
    // Displays something by manipulating the page's DOM. You can write your own function to do
    // anything you want, but in practice this step usually renders the `data` as locals in a
    // partial.
    //
    // If you are using Backbone, this step can also be used to instantiate a Backbone view and
    // then tell the view to `.render()` itself.
    'display',
    
    // Tells the browser to change the location, invoking another action. The default behaviour 
    // uses Sammy's `HashLocationProxy` to change the hash (and thus the location for the purposes 
    // of bookmarking and the back button), however Sammy can be configured to use a different
    // proxy, in which case a different handler will be invoked but the browser's location will
    // not change.
    //
    // Typically, a handler either displays or redirects but not both. For that reason, there are 
    // two different convenience methods for declaring a handler: `.display(...)` declares a
    // handler that by default displays a partial and does not perform a redirection, and
    // `.action(...)` declares a handler that by default does not display anything but does
    // perform a redirection.
    'redirect'
  //
  ];
  

  // The Sammy.Roweis Plugin
  // ---
  
  // Establish a scope. Sammy supports writing multiple Sammy applications
  // simultaneously within what appears to be a single browser "application."
  //
  // The helpers above are constant across all such applications, whereas the variables declared
  // in this scope are specific to each Sammy application. 
  Sammy.Roweis = (function () {
  
    // Most plugins are constant: You write something like:
    //
    //     $.sammy('.body', function() {
    //       this.use(Sammy.SomePlugin);
    //     });
    //
    // And you when you call`.use(...)`, you are passing in a constant value.
    //
    // Roweis is a dynamic plugin. Instead of calling `.use(Sammy.Roweis)`
    // and passing in a constant plugin, Sammy.Roweis is actually a function
    // that returns a plugin, with certain application defaults set according to the
    // parameters you pass. For example:
    // 
    //     $.sammy('.body', function() {
    //       this.use(Sammy.Roweis('MyApp', { 
    //         partial_root: 'partials' 
    //       }));
    //     });
    //
    // This establishes that your application is called "MyApp" and that by default,
    // the root path for its partials is `./partials`.
    //
    var sammy_dot_roweis = function (app_name, optional_options) {
      /*TODO: Merge scope functionality with application default functionality*/
  
      app_name = app_name || 'app';
      
      // So-called "Macros"
      // ---
      //
      // The following 'macros' write handler steps for you. Each one is a single
      // config property and a function that takes a handler and the value of that config property.
      // if you supply a value for that property, the 'macro' function will be invoked
      // and is expected to perturb the handler as a side-effect.
      //
      // Naturally, you can write your own macros. You can define them across your application:
      //
      //     $.sammy('.body', function() {
      //       this.use(Sammy.Roweis('MyApp', { 
      //         macros: {
      //           part_number: function (handler, num) { ... }
      //         },
      //         ...
      //       }));
      //     });
      //
      // And thereafter, use them in your declarations:
      //
      //     Sammy.Roweis.MyApp
      //       .action(
      //         route: '/increase_inventory',
      //         part_number: 42,
      //       );
      //
      // The macros listed here are the defaults built into Roweis.
      //
      // p.s. Yes, 'macro' is an improper term. The longer and more precise expression
      // is 'a function-writing-function', which is a kind of Higher Order Function ("HOF").
      var default_macros = {
        
        // **Display**
        //
        // The `partial` macro writes a `display` step that uses a tenplate of
        // some type (e.g. Haml) to display the `data`.
        partial: function (handler, partial_value) {
          handler.step_functions.display = _compose(handler.step_functions.display,
            function (context, data, callback) {
              if (false) Sammy.log(handler.config.name + ' starting to render',context,data);
              var local_data = _meld(data, {
                params: context.params
              });
              if (false) Sammy.log(handler.config.name + ' is rendering ' + partial_value + ' with:\n', local_data);
              var render_context = context.render(partial_value, local_data);
              var dom_is_dirty = false;
              if (handler.config.updates && !handler.config.renders && !handler.config.appends_to) {
                render_context
                  .replace(handler.config.updates);
                dom_is_dirty = true;
              }
              if (handler.config.appends_to) {
                var append_fn = (_.isFunction(handler.config.appends_to)) ? handler.config.appends_to : (function () { return handler.config.appends_to; })
                var selector = append_fn(context, data); 
                render_context
                  .then(function (content) {
                    $(selector)
                      .append(content);
                  });
                dom_is_dirty = true;
              }
              if (handler.config.renders) {
                context.roweis || (context.roweis = {});
                context.roweis.renders || (context.roweis.renders = $(handler.config.renders))
                context.roweis.renders
                  .ergo(function (el) {
                    render_context
                      .then(function (content) {
                        el
                          .empty()
                          .append(content)
                          ;
                      });
                    dom_is_dirty = true;
                  })
                  ;
              }
              /*TODO: Fix app to use paramaterized selectors*/
              if (dom_is_dirty) {
                if (false) Sammy.log(handler.config.name + ' is queuing up an display event');
                render_context
                  .then(function (content) {
                    handler.app.trigger('after_display', data.params);
                  })
              }
              render_context
                .then(function (content) {
                  callback(context, data);
                })
            }
          );
        },
        
        // A simple macro for defining a redirection instead of a partial
        redirects_to: function (handler, redirection_value) {
          handler.step_functions.redirect = _compose(handler.step_functions.redirect,
            function (redirect_context, data, callback) {
              var path = _internal_interpolate(redirection_value, redirect_context, data);
              handler.app.setLocation(path);
              callback(redirect_context, data);
            }
          );
        },
        
        // **"Unobtrusive" Handlers**
        //
        // Many handlers are associated with a route. Some are associated with a DOM
        // selector: They are invoked if an element matching their selector is put into
        // the DOM by another display.
        //
        // The handlers are called *unobtrusive handlers*, and there are three key config
        // parameters that control them:
        //
        // First, a selector must be provided with `renders`, such as `renders:
        // '.customers.list'`. This selector is applied against the DOM, if any elements
        // match, the unobtrusive handler is triggered. Whatever it displays through
        // its partial will replace the contents of the selected element. `renders` is
        // not a macro.
        //
        // Second, the typical style is to configure them with
        // `route: false` to make sure that they cannot be invoked from setting the
        // location hash. `route` isn't a macro either.
        //
        // Third, there is a very limited facility for parameterizing an unobtrusive
        // handler by extracting parameters from the element's `id` and/or CSS classes,
        // using the `infers` macro. `infers` writes a handler step that examines the
        // `id` and `class` attributes of the handlers `$element()` to infer parameters.
        //
        // Nota Bene: `MATCHER.lastIndex` needs to be explicitly set because IE will maintain the index unless NULL is returned,
        // which means that with two consecutive routes that contain params, the second set 
        // of params will not be found and end up in splat instead of params. Explanation
        // [here](https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/RegExp/lastIndex).
        infers: function (handler, value) {
          if (value) {
            var MATCHER = /:([\w\d]+)/g;
            var REPLACER = "(.+)";
            var inferences = _.isArray(value) ? value : [value];
            var inferer = _.foldl(inferences,
              function (fn, inference) {
                MATCHER.lastIndex = 0;
                var param_names = [];
                while ((inference_match = MATCHER.exec(inference)) !== null) {
                  param_names.push(inference_match[1]);
                }
                var inference_regexp = new RegExp("^" + inference.replace(MATCHER, REPLACER) + "$");
                return function (attr) {
                  var bindings = fn(attr);
                  if ((attr_match = inference_regexp.exec(attr)) !== null) {
                    attr_match.shift();
                    _.each(attr_match, function (value, index) {
                      var name = param_names[index];
                      bindings[name] = value;
                    });
                  }
                  return bindings;
                };
              },
              function (attr) { return {}; }
            );
            handler.step_functions.get_params = _compose(handler.step_functions.get_params, 
              function (context, data) {
                var el = context.$element();
                var attrs = _.map(el.attr('class').split(' '), "'\.' + _".lambda());
                if (!!el.attr('id')) {
                  attrs.push( '#' + el.attr('id') );
                }
                var inferred_bindings = _.foldl(attrs, 
                  function (bindings, attr) {
                    return $.extend(bindings, inferer(attr));
                  },
                  {}
                );
                $.extend(true, context.params || (context.params = {}), inferred_bindings);
              }
            );
            return handler;
          }
          
        },
        
        // `map` abbreviates a mapping function to make it super-easy to write, and also throws
        // in support for the author's pet (and shamefully incomplete) utility, cartography.js
        //
        // rather than in Roweis itself*
        map: function (handler, map_value) {
          /*TODO: If this survives into production use, move it into an app-specific macro*/
          
          var config_map_fn;
          if (_.isFunction(map_value)) {
            config_map_fn = map_value;
          }
          else if (_.isFunction(map_value.toFunction)) {
            config_map_fn = map_value.toFunction();
          }
          else if ('undefined' !== typeof(Cartography)) {
            config_map_fn = Cartography.compile(map_value);
          }
          if (config_map_fn) {
            handler.step_functions.munge_data = _compose(handler.step_functions.munge_data,
              function (context, data, callback) {
                return callback(context, config_map_fn.call(this, data));
              }
            );
          }
        },
        
        // **Backbone.js**
        //
        // If you install `backbone.js`, you can then define Roweis handlers that display a
        // backbone view.  The style is to define the view in a separate class, and you tell
        // Roweis to use it with a `backbone` declaration, something like:
        //
        //     app.display('my_view_handler', {
        //       route: '/fubar',
        //       backbone: {
        //         clazz: MyBackboneViewClazz,
        //         model: a_function_returning_a_model_for_the_view
        //       }
        //     });
        backbone: function (handler, backbone_definition) {
          if (_.isUndefined(Backbone)) {
            Sammy.log('Error: You must install backbone.js');
          }
          var declares_a_render_method = function (view_clazz) {
            return (view_clazz.prototype.render !== Backbone.View.prototype.render);
          };
          
          var clazz = Backbone.View; // default
          var model;
        
          if (_.isFunction(backbone_definition.clazz)) {
            clazz = backbone_definition.clazz;
          }
          else if (backbone_definition.clazz) {
            clazz = Backbone.View.extend(backbone_definition.clazz); // define extensions on the fly
          }
          
          if (backbone_definition.model) {
            model = backbone_definition.model;
          }
          
          // The parameters for the view constructor are limited to `model` if
          // you supply a model or model function, and `el`, which is inferred
          // from Roweis and Sammy.
          var view_constructor_parameters_fn = function (context, data) {
            var hash = {};
            if (_.isFunction(model) && 1 === model.length) {
              hash.model = model.call(this, data);
            }
            else if (_.isFunction(model) && 2 === model.length) {
              hash.model = model.call(this, context, data);
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
            
            if (handler.config.renders) {
              context.roweis || (context.roweis = {});
              context.roweis.renders || (context.roweis.renders = $(handler.config.renders));
              hash.el = context.roweis.renders;
            }
            return hash;
          };
        
          // this is what Roweis would do if there was no backbone view involved
          var old_declared_roweis_render_fn = handler.step_functions.display || function (context, data) {};
        
          // now write a new function
          handler.step_functions.display = function (context, data) {
            // that initializes the parameters for the backbone view
            var view_constructor_parameters = view_constructor_parameters_fn(context, data);
          
            // and extracts locals for rendering
            var locals = view_constructor_parameters.model || data;
          
            // and that extends the view clazz
            var extended_view_clazz = clazz.extend({
              
              // with a method that invokes the roweis display function. this is handy
              // because you can write your own render function that does some stuff before or
              // after or around Roweis' own render function.
              //
              // A common case is doing a bunch of JS in the view after letting Roweis handle the
              // display.
              roweis: {
                /*TODO: Implement `before_render` and `after_render`*/
                render: function (optional_callback) {
                  old_declared_roweis_render_fn(context, locals, optional_callback || (function () {}));
                  return this;
                }
              },
            
              render: declares_a_render_method(clazz) ? clazz.prototype.render : function () { this.roweis.render(); }
            
            });
          
            // now create an instance of the view
            var view_instance = new extended_view_clazz(view_constructor_parameters);
          
            // and tell it to render itself
            view_instance.render();
          
          };
        }
        
      }
      
      // This code writes one macro for each verb. Thus, when you write something like
      // `posts: '/fu/bar'`, Roweis turns this into a function that does and AJAX `POST`
      // during the `fetch_data` step.
      _.each(_verb_inflections, function (verb) {
        default_macros[verb] = function (handler, value) {
          var fetch_data_fn = function (path, destination, context, data, callback) {
            var server_route = _internal_interpolate(path, context);
            var host_partial_path = server_route.match(/^\//) ? server_route : '/' + server_route;
            var full_url = handler.app.roweis.host + host_partial_path;
            var actuals = $.extend({}, context.params);
            delete actuals.etc;
            var ap = actuals.toHash();
            if (false) Sammy.log(handler.config.name + ' is ajaxing ' + full_url + ' with:', ap);
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
                  handler.app.trigger(code, error_params);
                }
              },
              url: full_url,
              type: _present_tense(verb),
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
          if (typeof(value) === 'string') {
            handler.step_functions.fetch_data = _compose(handler.step_functions.fetch_data,
              function (context, data, callback) {
                fetch_data_fn(value, 'server_data', context, data, callback);
              }
            );
          }
          else if (typeof(value) === 'object') {
            handler.step_functions.fetch_data = _.foldl(_.keys(value),
              function (old_action, destination) {
                return _compose(old_action, function (context, data, callback) {
                  fetch_data_fn(value[destination], destination, context, data, callback);
                });
              },
              handler.step_functions.fetch_data
            );
          }
        }
      });
  
      // Defining a New Handler
      // ---
      
      // The generic function for defining a new handler from a configuration.
      //
      // This function is called by certain convenience methods we will add
      // to Sammy's application object.
      var _define_handler = function (app, config) {
        
        // **Construct the handler object**
        //
        // We are going to build a handler function and decorate it with a metric
        // fuckload of attributes. Those might come in handy for adavcend instrocpection
        // after the fact, and we have a pipe dream that handlers will be rewritten one day.
        // but, one thing at a time.
        //
        // The extra attributes are namespaced under `roweis`, just in case
        // we define something that clashes with some other property associated with functions.
        // The most interesting attribute is `fn`, which is the function that actually does the
        // handling of the function.
        var handler = $.extend(
          function (context, data) {
            return handler.roweis.fn(context, data);
          },
          {
            roweis: {
              fn: _noop,
              app: app,
              config: config,
              step_names: app_options.step_names,
              step_functions: {},
              error_handlers: {}
            }
          }
        );
        
        // **Extract ajax error handlers**
        for (var code in config) {
          if (config.hasOwnProperty(code) && !isNaN(code)) {
            handler.roweis.error_handlers[code] = config[code];
          }
        }
        
        // **Handler steps**
        //
        // By default, the handler has the same steps as the app, which has the default steps.
        // They can be overridden at any level, including within a scope.
        if (config.step_names) {
          handler.roweis.step_names = config.step_names;
        }
        
        // Copy the named steps from the config to the handler
        _.each(handler.roweis.step_names, function (step_name) {
          if (_.isFunction(config[step_name])) {
            handler.roweis.step_functions[step_name] = _compose(handler.roweis.step_functions[step_name], config[step_name]);
          }
        });
        
        // **"Macro" Expansion**
        //
        // As described above, each "macro" is a property and a function
        // that takes the handler and value of the property as parameters.
        //
        // It is expected to perturb the handler appropriately. This is where
        // most of the handler's action steps get written. Some of them are going to
        // be composed with steps written in config.
        var macros_to_expand = $.extend({}, app.roweis.default_macros, app.roweis.macros || {}, config.macros || {});
        _.each(_.keys(macros_to_expand), function (macro_key) {
          var value = handler.roweis.config[macro_key];
          if (!_.isUndefined(value)) {
            macros_to_expand[macro_key](handler.roweis, value);
          }
        });
        
        // **Aspect-Oriented Handlers**
        //
        // You can define a `before_` or `after_` function for each of the action steps,
        // and Roweis will mix it into the step. You could write the whole
        // thing yourself, but an advantage of this system is that you can let Roweis
        // use convention to write the main step while you do additional customization
        // with a `before_` or `after_` step. For example:
        //
        //     .display('bmx_bikes', {
        //       gets: '/bikes/bmx/',
        //       after_fetch_data: function (data) {
        //         return { 
        //           models: data.server_data, 
        //           size: data.server_data.length
        //         };
        //       }
        //     });
        _.each(handler.roweis.step_names, function (step_name) {
          _.each(['before_'+step_name, 'after_'+step_name], function (expanded_step_name) {
            if (_.isFunction(config[expanded_step_name])) {
              handler.roweis[expanded_step_name] = _compose(handler.roweis[expanded_step_name], config[expanded_step_name]);
            }
          })
        });
        
        _.each(handler.roweis.step_names, function (step_name) {
          if (_.isFunction(handler.roweis.step_functions[step_name])) {
            if (_.isFunction(handler.roweis['before_' + step_name])) {
              handler.roweis.step_functions[step_name] = _compose(handler.roweis['before_' + step_name], handler.roweis.step_functions[step_name]);
            }
            if (_.isFunction(handler.roweis['after_' + step_name])) {
              handler.roweis.step_functions[step_name] = _compose(handler.roweis.step_functions[step_name], handler.roweis['after_' + step_name]);
            }
          }
        });
        
        // **Composing the handler function**
        //
        // We compose `handler.roweis.fn` out of the individual
        // step functions. `handler` delegates to this function, so
        // in effect we are redefining `handler`.
        handler.roweis.fn = (function () {
          var step_names_in_use = _.select(handler.roweis.step_names, function (step_name) { 
            return _.isFunction(handler.roweis.step_functions[step_name]); 
          });
          
          return  _.foldr(step_names_in_use,
            (function (callback, step_name) {
              var callbackized_step_fn = _callbackable(handler.roweis.step_functions[step_name]);
              return function (context, data) {
                callbackized_step_fn(context, data, callback);
              };
            }), 
            (function (context, data) { /* nada */ })
          );
        })();

        return handler;
      
      };

      // The generic function for installing a new handler into its app. 
      // It binds the object to the appropriate 
      // [Sammy events](http://code.quirkey.com/sammy/docs/events.html) so that the handler
      // is invoked when the appropriate route (if any) is invoked or the appropriate 
      // element is attached to the DOM.
      //
      // (It could be a method on `handler.roweis`, but the concept of re-installing
      // a handler will have to wait for an architecture involing uninstalling a handler
      // from any existing bindings. So for now, it's a helper function.)
      var _install_handler = function(handler) {
        var config = handler.roweis.config;
        var app = handler.roweis.app;
        
        //
        // triggering a handler through a route
        //
        if (config.method && config.route) {
          app[config.method](config.route, function (handler_context) {
            handler(handler_context, {});
          });
        }
        
        //
        // triggering a handler unobtrusively
        //
        if (config.renders) {
          var updater_fn = function (e, data) {
            // If the selector defined by the controller being bound matches the 
            // data, we care about this and want to hear when it's done rendering
            var context = this;
            
            $.each($(config.renders).filter(':not(.__URH__)'), function (index, dom_el) {
              $(dom_el)
                .addClass('__URH__');
              new_context = $.extend(true, {}, context, { $element: function () { return $(dom_el); } });
              $.extend(true, new_context.roweis || (new_context.roweis = {}), { renders: $(dom_el)});
              handler(new_context, data);
            });
          };
          app
            .bind('after_display', updater_fn)
            .bind('run', updater_fn);
        }
        
        //
        // triggering a handler through an AJAX error status
        //
        if (config.code && !isNaN(config.code) && config.route) {
          app.bind(config.code, function (event, error_data) {
            app.setInterpolatedLocation(config.route, error_data.data);
          })
        }
        
        // Add the handler to the application in the `.roweis` scope
        if (_.isString(config.name) && !app.roweis.handlers[config.name]) {
          app.roweis.handlers[config.name] = handler;
        }
        
        return handler;
        
      };

      // **Base app options**
      //
      // These can be overridden when you invoke Roweis.
      //
      // (By default, if you are using the `Sammy.Haml` plugin, Roweis assumes
      // that partials end in `.haml`.)
      var app_options = _meld(
        /*TODO: Support other defaults such as Moustache or handlebars*/
        { 
          partial_suffix: (Sammy.Haml ? '.haml' : ''),
          name: app_name,
          step_names: default_step_names,
          default_macros: default_macros,
          error_handlers: {}
        },
        optional_options || {}
      );
      
      // The Sammy.Roweis Plugin
      // ---
      //
      // This is the code that actually extends the Sammy application with additional
      // methods for creating and managing scopes and for defining and installing handlers.
      // When this function is called, we modify the sammy application to add
      // Roweis's library functions.
      return function (app, host) {
        
        // **Initializing the Sammy application**
      
        // Add the app to Roweis's name space. This means you can break your
        // declarations up into other files simply by writing something like:
        //
        //     Sammy.Roweis.MyApp
        //       .display('products', { ... })
        //       .display('customers', { ... })  
        //       ;   
        sammy_dot_roweis[app_name] = app;
        
        // Extend the app with a lot of Roweis-specific properties. We confine most of it 
        // into a `.roweis` namespace in the hope of minimizing the likelihood of a conflict with
        // other plugins or with Sammy:
        app.roweis = $.extend({
          host: host || '',
          handlers: [],
          config_stack: [],
          macros: {},
          extended: function (config) {
            var out = _.foldl(this.config_stack, function (acc,hash) { return jQuery.extend(acc,hash); }, config);
            // special case for properties with paths
            for (var prop in out) {
              if (out.hasOwnProperty(prop) && prop.match(/_path$/)) {
                var paths = _.compact(_.pluck(this.config_stack, prop));
                out[prop] = paths.join('/');
              }
            }
            return out;
          },
          with_app_defaults: function (config) {
            var out = $.extend(true, {}, config);
            // **Update config with application defaults**
        
            // we will be passed configuration that has already been massaged by 
            // `_mix_in_optional_parameters_and_conventions`, but there are a few
            // more steps based on application defaults
            if (out.partial && this.partial_suffix && !out.partial.match(/\.[^\/]+$/)) {
              out.partial = out.partial + this.partial_suffix;
            }
            if (out.partial && this.partial_root) {
              out.partial = [this.partial_root, out.partial].join('/');
            }
        
            // and a default DOM selector to update
            if (undefined === out.updates) {
              out.updates = out.renders || this.root_element_selector;
            }
            return out;
          }
        }, app_options);
        
        // Sammy expects a jQuery element selector so that its default partial rendering
        // will work smoothly. We'll add it now. We could do something a little more
        // elegant with our default application options, but we want to respect
        // Sammy's built-in way of registering the root element selector
        app.roweis.root_element_selector = app.roweis.updates || app.element_selector || 'body';
      
        // Additonal methods added to every Sammy application
        // ---
        
        // **Methods for defining and installing handlers**
        
        // The core method for defining a new handler that renders something in the DOM.
        var _display = function (optional_name, optional_config) {
          _install_handler(
            _define_handler(this, 
              this.roweis.with_app_defaults(
                _mix_in_optional_parameters_and_conventions(optional_name, optional_config, 
                  this.roweis.extended({ 
                    method: 'get',
                    appends_to: false,
                    redirect: false 
                  })
                )
              )
            )
          );
          return this;
        };
      
        // The core method for defining a new handler that performs an action and then
        // redirects to a display, a client-side implementation of the
        // [Post-Redirect-Get](https://secure.wikimedia.org/wikipedia/en/wiki/Post/Redirect/Get)
        // ("PRG") pattern.
        var _action = function (optional_name, optional_config) {
          _install_handler(
            _define_handler(this, 
              this.roweis.with_app_defaults(
                _mix_in_optional_parameters_and_conventions(optional_name, optional_config, 
                  this.roweis.extended({ 
                    method: 'post', 
                    updates: false,
                    appends_to: false,
                    backbone: false,
                    partial: false
                  })
                )
              )
            )
          );
          return this;
        };
             
        // **Methods for establishing scopes**
        //
        // In Roweis, scopes establish tenmporary defaults. A simple
        // case might be something like this:
        //
        //     app
        //       .begin({ 
        //         gets_home_path: '/bikes',
        //         partial_home_path: 'bikes'
        //       })
        //         .display({
        //           gets: '',
        //           partial: 'plural'
        //         })
        //         .display({
        //           gets: ':part_number',
        //           partial: 'singular'
        //         })
        //         .end()
        //       ;
        //
        // `begin` establishes a scope and `end` ends it. Within the scope,
        // `gets` has a home path, so our two faux-pages get their data from the
        // server using `GET /bikes` and `GET /bikes/42`. Likewise, there is a home
        // path for partials, so the partials used to display our faux pages will
        // be `/bikes/plural.haml` and `/bikes/singular.haml`.
        
        var _begin = function(config) {
          this.roweis.config_stack.push(config);
          return this;
        };
        
        var _end = function() {
          if (app.roweis.config_stack.length > 0) {
            this.roweis.config_stack.pop();
            return this;
          }
          else {
            Sammy.log('error, "end" unmatched with "use."');
          }
        };
        
        var _scope = function(config, fn) {
          return this
            .begin(config)
            .K(fn)
            .end()
            ;
        };
      
        //
        // Binding an arbitrary function to an error instead of a handler.
        // This may get deprecated at some point.
        var _error = function(code, handler_fn) {
          this.bind(code, function (event, data) {
            handler_fn(data);
          })
          return this;
        };
        
        // The method for forcibly setting the window location
        var _setInterpolatedLocation = function(path, optional_data) {
          if (optional_data) {
            path = sammy_dot_roweis.fully_interpolated(path, optional_data);
          }
          if (path.match(/^#/)) {
            this.setLocation(path);
          }
          else window.location = path;
        };
        
        // **Extend the Application with the convenience methods**
        $.extend(app, {
          display: _display,
          action: _action,
          begin: _begin,
          end: _end,
          scope: _scope,
          error: _error,
          setInterpolatedLocation: _setInterpolatedLocation
        });
      
      };
  
    };
        
    // Place the external interpolation helper function into
    // the `Sammy.Roweis` scope.
    sammy_dot_roweis.fully_interpolated = (function () {
      var _external_interpolate = function () {
        var hash_path = _external_interpolate.arguments[0];
        var data = {};
        for (var i = 1; i < _external_interpolate.arguments.length; ++i) {
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
      return _external_interpolate;
    })();
  
    return sammy_dot_roweis;

  })();
  
  // Readability Helpers
  // ---
  //
  // These helper give you options for making your declarations more readable.
  
  // Really simple inflection conversion, allows you to write either `get: '/foo/bar'` or
  // `gets: '/foo/bar'` when defining handlers.
  function _present_tense (verb) {
    return verb.match(/^get/) ? 'get' : (
      verb.match(/^post/) ? 'post' : (
      verb.match(/^put/) ? 'put' : (
      verb.match(/^del/) ? 'delete' : (verb)
    )));
  };
  
  // The inflections you can use for the various verbs
  var _verb_inflections = ['get', 'gets', 'post', 'posts', 'put', 'puts', 'delete', 'deletes'];
        
  // The `.display(...)` and `.action(...)` methods both ultimately work with a hash called `config`
  // that configures a new handler for Sammy. This function provides you with a lot of flexibility when
  // declaring the hash. That in turn makes for mroe readable declarations. For example, you could
  // write:
  //
  //     .display({ name: 'fu', partial: 'bar' });
  //
  // However, the name doesn't really stand out. That matters, because by convention the name serves as a
  // default. So while this is legal, you can also write:
  //
  //     .display('fu', { partial: 'bar' });
  //
  // Placing the name first as its own parameter ames it more obvious. In really simple cases, you can even write:
  //
  //     .display('foo');
  //
  // There are usually default configuration options. These could be mixed in by writing:
  //
  //      .action('bar', $.extend(, some_defaults, { /* my config */ });
  //
  // But again this de-emphasizes the configuration you are writing. So instead, you can write:
  //
  //     .action('bar', { /* my config */ }, some_defaults);
  //
  // Or:
  //
  //     .action({ /* my config */ }, some_defaults);
  //
  // Read on for more of its special cases and logic.
  function _mix_in_optional_parameters_and_conventions (optional_name, optional_config, defaults) {  
    /*TODO: Extract to a hash of default behaviours so that we can write our own*/
    
    optional_config = optional_config || {};
    var config;
    
    // First we deal with the fact that the first two paramaters are optional
    if (_.isString(optional_name)) {
      config = $.extend({}, defaults, optional_config, { name: optional_name });
    }
    else if ('number' === typeof(optional_name)) {
      config = $.extend({}, defaults, optional_config, { code: optional_name, name: optional_name.toString() });
    }
    else if ('object' === typeof(optional_name)) {
      config = $.extend({}, defaults, optional_name);
    }
    else config = $.extend({}, defaults, optional_config);
      
    // The definition of a new handler is driven by the configuration
    // parameters you supply. But we value convention over configuration, so
    // what follows are a metric fuckload of special cases.
    
    // Many conventions rely on each handler having a unique name within the
    // application. Roweis doesn't enforce that names be unique, but it does
    // take a shot at guessing the name if you don't supply one.
    //
    // `.gets`, `.posts` and so on are all declarations that the `fetch_data`
    // goes to a server for some `data`. The first rule is that if you don't supply
    // a name and you do supply a server path, the name of the handler will be the
    // server path.
    //
    // Nota bene: remember that `_mix_in_optional_parameters_and_conventions` lets you write either
    // `.action('doSomething', { ... })` or `.action({ name: 'doSomething', ... })` as
    // you prefer.
    if (_.isUndefined(config.name)) {
      var verb = _.detect(_verb_inflections, function (v) { return _.isString(config[v]); });
      if (verb) {
        config.name = config[verb];
      }
    }
    
    // `config.route` is the route used by Sammy to trigger the application. If you don't 
    // supply a route, Roweis guess it as the name. Some additional massaging below takes
    // care of the hash and root path, so if you write `.display('bravado')`, you are getting
    // a route of `#bravado` by convention.
    //
    // Also note that we very deliberately test for whether you have defined a route, not
    // for truthiness. Under certain circumstances you may wish to have a handler that
    // cannot be triggered with a location. When that is the case, you can write
    // `.display('stealth', { route: false, ... })` and no route will be configured
    // by convention.
    if (_.isUndefined(config.route) && config.name) {
      config.route = config.name;
    }
    
    // `config.partial` is the partial path to a partial used by Sammy to display `data`. 
    // If you don't supply it, Roweis guess it as the name. Some additional massaging below takes
    // care of a root path and default suffix using scopes and application defaults, path, so 
    // if you write `.display('bravado')`, you could be getting a partial of 
    // `/partials/bravado.haml` by convention.
    if (_.isUndefined(config.partial)) {
      config.partial = config.name;
    }
    
    // next we deal with certain conventions. One is that if there is a config
    // parameter called `foo`, then the parameter `foo_home_path` has special
    // signifcance: the value for `foo` is actually `config.foo_home_path + config.foo`.
    for (var prop in config) {
      /*TODO: Mix in `foo_suffix`*/
      
      var val = config[prop];
      if (config.hasOwnProperty(prop) && val && !prop.match(/_home_path$/) && config[prop+'_home_path']) {
        if (_.isString(val)) {
          config[prop] = [config[prop+'_home_path'], val].join('/');
        }
        else if ('object' === typeof(val)) {
          for (var inner_prop in val) {
            if (val.hasOwnProperty(inner_prop) && _.isString(val[inner_prop])) {
              val[inner_prop] = [config[prop+'_home_path'], val[inner_prop]].join('/');
            }
          }
        }
      }
    }
    
    // Finally, a special case that routes should start with `#/`
    if (_.isString(config.route) && !config.route.match(/^#\//)) {
      config.route = '#/' + config.route;
    }
    
    return config;
  };
  
  // This is the interpolation function used to interpret paths whenever a path is used in a
  // Roweis declaration. This allows you to write things like:
  //
  //     .display('bar', {
  //       partial: '/blitz'
  //     });
  //
  // Or:
  //
  //     .display('bar', {
  //       gets: '/customers/:id'
  //     });
  //
  // Or:
  //
  //     .display('roulette', {
  //       partial: function (context, data) { 
  //         return (data.partipants.is_gigantic() ? '/biggie' : '/smalls');
  //       }
  //     });
  var _internal_interpolate = function(fn_or_path, data, optional_data) {
    var fn;
    if (_.isString(fn_or_path) && fn_or_path.match(/^(#|\/)/)) {
      fn = function () { return fn_or_path; };
    }
    else if (_.isFunction(fn_or_path)) {
      fn = fn_or_path;
    }
    else if (_.isFunction(fn_or_path.toFunction)) {
      fn = fn_or_path.toFunction();
    }
    var path = fn.call(this, data, optional_data);
    var transformed_path = path;
    /* TODO: replace with a fold */
    $.each(path.match(/\:[a-zA-Z_]\w*/g) || [], function(i, parameter) {
      var parameter_name = parameter.substring(1);
      var parameter_value = data[parameter_name] || (data.params && data.params[parameter_name])|| (data.server_data && data.server_data[parameter_name]);;
      transformed_path = transformed_path.replace(parameter, parameter_value);
    });
    return transformed_path;
  };
  
  // This function works very much like `$.extend(true, ...)`. It was written for the worst
  // of all possible reasons, because I didn't know you could pass `true` to `$.extend(...)`
  // to perform a recursive extension.
  var _meld = (function () {
    /* TODO: Rewrite _meld to use $.extend, weaning client code off its idiosyncrasies*/
    
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
  
  // **Continuation Passing Style**
  //
  // We've fallen into Javascript's ghastly habit of reinventing [CPS](http://marijnhaverbeke.nl/cps/).
  //
  // Roweis chains functions together using CPS. There are lots of places where
  // functions are chained together. The most obvious is the four "handler steps" described below: Each
  // step is chained using CPS. This allows Roweis to do sensible things when doing something asynchronously.
  // 
  // You may not expect something to be asynchronous, but to take two common examples, any call to a server
  // is AJAX, and therefore asynchronous by default. That includes any rendering of a partial, since the
  // partial may need to be fetched from the server using AJAX.
  
  // a handy noop function, the equivalent of I in CPS
  var _noop = (function () {
    var noop = function (context, data, callback) {
      return callback(context, data);
    };
    noop.roweis = {is_noop: true};
    return noop;
  })();
  
  // and the test for noop
  var _is_noop = function (fn) {
    return (_.isFunction(fn) && fn.roweis && fn.roweis.is_noop);
  }
  
  // Roweis works with functions that have the signature `function (context, data, callback)`.
  // `_callbackable` allows you to write any of the following and have it be converted accordingly.
  //
  //     function () { ... }
  //     function (data) { ... }
  //     function (context, data) { ... }
  //     function (context, data, callback) { ... }
  //
  // One wrinkle is that if you supply either of the first three forms, and your function returns a value, that is what is passed
  // as data to the callback. Otherwise, it passes the same data to the callback.
  var _callbackable = function(handler) {
    if (_.isUndefined(handler) || _is_noop(handler)) {
      return _noop;
    }
    else if (handler.length > 2) {
      return handler;
    }
    else if (2 === handler.length) {
      return function (context, data, callback) {
        var new_data = handler(context, data);
        return callback(context, new_data || data);
      };
    }
    else if (1 === handler.length) {
      return function (context, data, callback) {
        var new_data = handler(data);
        return callback(context, new_data || data);
      };
    }
    else if (0 === handler.length) {
      return function (context, data, callback) {
        handler();
        return callback(context, data);
      };
    }
  };
  
  // Composes two functions through CPS, converting them into _callbackables
  // in the process
  var _compose = function(x, y) {
    if (_. isUndefined(y) || y.is_noop) {
      return _callbackable(x);
    }
    else if (_. isUndefined(x) || x.is_noop) {
      return _callbackable(y);
    }
    else return function (context, data, callback) {
      _callbackable(x)(context, data, function (context2, data2) {
        _callbackable(y)(context2, data2, callback);
      })
    };
  };

})(jQuery);

// **License Terms**
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