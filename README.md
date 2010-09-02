Roweis
===

*Lightweight controllers and views for the [Sammy][sammy] JS framework.*

**what!?**

[Sammy][sammy] is a lightweight (&lt;20K) framework for writing single page Javascript applications. Sammy uses [Sinatra][sinatra]-like simple route definitions and structure. Sammy allows programs to respond to specific URLs, and utilizing the URL hash (#) you can create single page applications that still respond to the back button, like Gmail.

Sammy is touted as "A great way to build simple to complex applications built upon RESTful data stores like [CouchDB][couch] or [Cloudkit][cloud]."

Roweis is a plugin for Sammy that makes the "Great way to build simple applications built upon RESTful data stores" ridiculously easy by delivering a lot of the code you need right out of the box by default and emphasizing convention over configuration.

**for whom**

Roweis might be a good choice if you want to write a client-side [single page application][spa].

We can't tell you when to do this or why. But as one example, in the project where Roweis is being incubated, we want the server to be highly REST-ful and to manage business logic only. Thus, the server's controllers know about business logic, and the client's controllers know about the user interface.

**when**

Roweis has not been released yet. We are extracting it from an active project, and everything is in flux. But we are interested in working with opinionated enthusiasts.

**the basics**

To write a Roweis [single page application][spa], you'll need jQuery, Sammy, Roweis, and one of Sammy's template plug ins ([Haml][haml] is required at the moment). Roweis applications are Sammy applications, so let's start with Sammy and Haml. In its simplest form, your single page will expose one page element that Sammy will manipulate, something like this:

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
        
        // Sammy will put its dunamic stuff in this div:
        .main
        
        // More static stuff here

You then write an `application.js` file for Sammy:

    ;(function ($) {

      var app = $.sammy(function() {
      	this.use(Sammy.Haml);
      	this.element_selector = '.main'; 
      });

      $(function() {
      
        // do what you need for your application here.
    	
      	// it IS necessary to "run" your app, so after doing any other setup, run your app
      	// with a default route. In Sammy you write:

      	app.run('#/welcome');

      	// (Assuming that the "welcome" route leads to the page you wish to display.)
    	
      });
	
    })(jQuery);
    
Now you're ready to write controllers and views in Sammy.
    
**controllers and views in sammy**
    
In Sammy, controllers are chunks of code that handle HTTP requests, and views are chunks of code that manipulate the DOM of your single page application. It is possible to intermingle controller and view code. In Sammy, you can write a function that handles a request for a route and directly manipulates the DOM:

    ;(function ($) {

      var app = $.sammy(function() {
      	this.use(Sammy.Haml);
      	this.element_selector = '.main'; 
      });

      $(function() {
      
        this.get('#/welcome', function() {
          $('.main').text('Welcome to my JS view!');
        });

      	app.run('#/welcome');
    	
      });
	
    })(jQuery);

If you want to split things into a controller and a view, you write a Haml template, e.g. `welcome.haml`:

    // welcome.haml
    Welcome to my Haml view!

And your controller renders the view using Sammy's `.partial` method to interpolate the Haml template and Sammy's `.swap` method to insert the result into the page:

    ;(function ($) {

      var app = $.sammy(function() {
      	this.use(Sammy.Haml);
      	this.element_selector = '.main'; 
      });

      $(function() {
      
        this.get('#/welcome', function (context) {
          this.partial('welcome.haml', {}, function (html) { app.swap(html); });
        });

      	app.run('#/welcome');
    	
      });
	
    })(jQuery);

**controllers and views in roweis**

A Roweis application is a Sammy application. Sammy applications associate functions with routes. Roweis is simply a tool for generating some or even all of those functions for you and then registering them with Sammy.

In the simplest case, you can use Roweis to register a function with Sammy from outside of your `application.js` file:

    Sammy.Roweis.controllers
      .define('welcome', // the name of the controller, must be unique
        function () {
          this.partial('welcome.haml', {}, function (html) { app.swap(html); });
        });
    
This is useful because it is now very easy to move a controller definition into its own Javascript file. When definitions are very small, moving them around makes coding a chore. But as they get more complex, you might want to group them in various ways. Roweis makes that easy, because you can define controller objects from any Javascript file.

Notice that Roweis also does a little "Convention over Configuration:" if a controller is called `welcome`, the default route for it is `#/welcome`.

But Roweis can go further. Notice that the view is called `welcome.haml`? Behold:

    Sammy.Roweis.controllers
      .define('welcome');
    
By default, Roweis creates a controller that simply invokes the Haml view of the same name for you. It also has a default route of `#/welcome`. You can define some more options. For example, you can use a different route:

    Sammy.Roweis.controllers
      .define('welcome', { route: '#/' });
    
**sharing views**

We just saw how you associate a controller with its own view in Roweis: You give it the same name and Roweis takes care of the rest. Let's look at shared views. Let's assume that we run a [Skateboard and BMX Shop][core]. We have two different routes, `#/skateboard`, and `#bmx`. If they each had their own  view, we would write a `skateboard.haml` view and a `bmx.haml` view. Then we'd write our controllers:

    Sammy.Roweis.controllers
      .define('skateboard')
      .define('bmx');
    
If we want both controllers to share a public `product.haml` view, we simply say so:

    Sammy.Roweis.controllers
      .define('skateboard', { view: 'product' })
      .define('bmx',        { view: 'product' });
    
Of course, many times we don't need to share a view, so Sammy is set up to make you do as little work as possible. I personally prefer that if a view is shared, it gets its own unique name. But that's a matter of taste. If you want, you can write:

    Sammy.Roweis.controllers
      .define('skateboard', { view: 'bmx' })
      .define('bmx);
    );
    
Both controllers will use `bmx.haml`.

**redirection**

You often want controllers to redirect to another route:

    Sammy.Roweis.controllers
      .define('skateboard', { redirectTo: 'product' })
      .define('bmx',        { redirectTo: 'product' })
      .define('product');

This is most common when you are posting the results of a form, so much so that it has its own name, [Post/Redirect/Get][prg]. In the example above, a user invoking `#/bmx` or `#skateboard` will have their browser redirect to `#/product`.

Note that Roweis does some route resolution for you. If you write:

    Sammy.Roweis.controllers
      .define('skateboard', { redirectTo: 'product' })
      .define('bmx',        { redirectTo: 'product' })
      .define('product',    { route:      '#/show'  });

Then a user invoking `#/bmx` will have their browser redirect to `#/bmx` or `#skateboard` will have their browser redirect to `#/show`. The product controller will handle that and use `product.haml` as the view.
  	
**server controllers**

Many Sammy controllers wrap a single call to a RESTful server. Roweis is here to help. Instead of associating a function with a verb, associate a path string with the verb:

    Sammy.Roweis.controllers
      .define({ get: 'stories' });
    
This creates a controller called `stories`, and like the local controller, it invokes a Haml template called `stories.haml`. The difference is that it will take its parameters and use AJAX to invoke a `/stories` path on the server, and then it passes the result to the `stories.haml` view.

Naturally you can combine server controllers with redirection:

    Sammy.Roweis.controllers.
      .define({ post: 'logoff', redirectTo: 'welcome' });

**unobtrusive controllers**

When you want to nest views, Roweis gives you a simple mechanism, "unobtrusive controllers." We start by defining a controller without a route:

    Sammy.Roweis.controllers.
      .define('widgets', { get: 'widgets', route: false, renders: '.widgets' });
      
We've declared that our "widgets" controller does not have a route. This means it can only be displayed indirectly. We've also told Roweis that this controller renders the content for every element matching the jQuery selector `.widgets`.

Whenever Roweis renders *any* view, it will look for placeholder elements matching this selector, perform a `GET` to the server, and replace the placeholders with the contents of `widgets.haml`. Notice that this means the view can depend on lightweight controllers to render itself, rather than having a heavyweight controller updating everything.


	
---

Stay tuned for more writing! [Aanand Prasad][aanand] and [Jamie Gilgen][jamie] are responsible for the Good, [Reg Braithwaite][raganwald] is hogging the blame for both the Bad and the Ugly.

*Roweis was conceived on August 19, 2010*

  [sammy]: http://github.com/quirkey/sammy "sammy_js"
[sinatra]: http://www.sinatrarb.com/
[couch]: http://couchdb.apache.org/
[cloud]: http://getcloudkit.com/
[spa]: http://en.wikipedia.org/wiki/Single_page_application "Single Page Application"
[haml]: http://haml-lang.com/ "#haml"
[core]: http://www.ridecore.ca "CORE BMX and Boards"
[prg]: http://en.wikipedia.org/wiki/Post/Redirect/Get
[aanand]: http://github.com/aanand/
[jamie]: http://github.com/jamiebikies
[raganwald]: http://github.com/raganwald