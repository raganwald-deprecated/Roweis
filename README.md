Roweis
===

*Lightweight controllers and views for the [Sammy][sammy] JS framework.*

**what**

[Sammy][sammy] is a lightweight (&lt;20K) framework for writing single page Javascript applications. Sammy uses [Sinatra][sinatra]-like simple route definitions and structure. Sammy allows programs to respond to specific URLs, and utilizing the URL hash (#) you can create single page applications that still respond to the back button, like Gmail.

Sammy is touted as "A great way to build simple to complex applications built upon RESTful data stores like [CouchDB][couch] or [Cloudkit][cloud]."

Roweis is a plugin for Sammy that makes the "Great way to build simple applications built upon RESTful data stores" ridiculously easy by delivering a lot of the code you need right out of the box by default and emphasizing convention over configuration.

**who**

Roweis is for you if:

1. You want to write a client-side single page application.
2. You're familiar with MVC and have used it in at least one other context, e.g. Ruby on Rails.
3. Your client application is backed by a server that speaks JSON.

**how**

To write a Roweis [single plage application][spa], you'll need jQuery, Sammy, Roweis, and one of Sammy's template plug ins ([Haml][haml] recommended). Ini its simplest form, your single page will expose one page element that Roweis and Sammy will manipulate, something like this:

!!!5

    %html
      %head
        %script{:src=>"jquery.js", :type=>"text/javascript", :charset=>"utf-8"}
        %script{:src=>"sammy.js", :type=>"text/javascript", :charset=>"utf-8"}
        %script{:src=>"sammy.roweis.js", :type=>"text/javascript", :charset=>"utf-8"}
        %script{:src=>"sammy.haml.js", :type=>"text/javascript", :charset=>"utf-8"}
        
        // your application's include files will go here, along with
        // other javascript libraries you consider essential, e.g.
        
        %script{:src=>"jquery.combinators.js", :type=>"text/javascript", :charset=>"utf-8"}
        %script{:src=>"jquery.igesture.js", :type=>"text/javascript", :charset=>"utf-8"}

      %body
        // Static stuff goes here
        .roweis_manipulates_this
        // And here

You then write an `application.js` file for Sammy:

    ;(function ($) {

      var app = $.sammy(function() {
      	this.use(Sammy.Haml);
      	this.use(Sammy.Roweis); // Don't forget to tell it you use Roweis!
      	this.element_selector = '.roweis_manipulates_this'; 
      });

      $(function() {
      
        // do what you need for your application here.
    	
      	// it IS necessary to "run" your app, so after doing any other setup, run your app
      	// with a default route. In Sammy you write:

      	app.run('#/welcome');

      	// (Assuming that the "welcome" route leads to the page you wish to display.)
    	
      });
	
    })(jQuery);
    
Now you'r eready to write controllers and views.
    
**local controllers**
    
In Sammy, you write Sinatra-like handlers for the routes your app supports, e.g.

    this.get('#/welcome', function() {
      $('.main').text('Welcome!');
    });
    
If you want to split things into a controller and a view, you write a Haml tenmplate, e.g. `welcome.haml`:

    // welcome.haml
    Welcome to my Haml view!

And your controller tells Sammy to render the view with whatever parameters are passed in:

    this.get('#/welcome', function (context) {
      this.render('welcome.haml', context.params.toHash());
    });

In Roweis, you could write the above as:

    Sammy.Roweis.controllers.welcome = function () {
      this.render('welcome.haml', context.params.toHash());
    };

This defines a controller named "welcome," and Roweis assumes by default that you want its route to be `#/welcome`. Convention over configuration. But Roweis can assume even more on your behalf, behold:

    Sammy.Roweis.controllers.def({
      name: 'welcome'
    });
    
By default, Roweis creates a controller that simply invokes the Haml view. It also has a default route of `#/welcome`. You can define some more options. For example, you can use a different route:

    Sammy.Roweis.controllers.def({
      name: 'welcome',
      path: '#/'
    });

Or you can tell it to use a different view:

    Sammy.Roweis.controllers.def({
      name: 'welcome',
      path: '#/',
      view: 'index.haml'
    });

Of course, you can still write your own controller instead of accepting the default. Simply associate a Sammy-style function with the appropriate HTTP verb:

    Sammy.Roweis.controllers.def({
  		name: 'easteregg',
  		get: function (context) {
  			alert(context.params.say || 'Hello, Sammy Roweis');
  			Sammy.Roweis.controllers.home.redirect(context);
  		}
  	});
  	
And finally, you can define more than one controller at a time:

    Sammy.Roweis.controllers.def(
      'login',
      {
    		'name': 'home',
    		'path': '#/'
    	},
    	{
    		'name': 'easteregg',
    		'get': function (context) {
    			alert(context.params.say || 'Hello, Sammy+Roweis');
    			Sammy.Roweis.controllers.home.redirect(context);
    		}
    	},
    	{
    		'get': 'widgets'
    	},
    	{
    		'get': 'logoff',
    		'view': 'home'
    	}
    );
  	
**server controllers**

Many Sammy controllers wrap a single call to a RESTful server. Roweis is here to help. Instead of associating a function with a verb, associate a path string with the verb:

    Sammy.Roweis.controllers.def({
      get: 'stories'
    });
    
This creates a controller called `stories`, and like the local controller, it invokes a Haml template called `stories.haml`. The difference is that it will take its parameters and use AJAX to invoke a `/stories` path on the server, and then it passes the result to the `stories.haml` view.

Sometimes you want to redirect rather than display a view. This happens most frequently with posts. You can do that by naming a controller rather than defining a path to a view. In this example, we are invoking a `logoff` route on the server, then redirecting to our home controller:

    Sammy.Roweis.controllers.def({
      post: 'logoff',
      view: 'home'
    });
	
---

Stay tuned for more writing. *Roweis was conceived on August 19, 2010*.

[sammy]: http://github.com/quirkey/sammy "sammy_js"
[sinatra]: http://www.sinatrarb.com/
[couch]: http://couchdb.apache.org/
[cloud]: http://getcloudkit.com/
[spa]: http://en.wikipedia.org/wiki/Single_page_application "Single Page Application"
[haml]: http://haml-lang.com/ "#haml"