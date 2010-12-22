Roweis
===

*Use convention over configuration to implement your views and controllers in the browser*.

**Roweis** is a [Sammy](http://code.quirkey.com/sammy/index.html) plugin for building [Single Page Interface](http://itsnat.sourceforge.net/php/spim/spi_manifesto_en.php) applications in a highly declarative manner using convention over configuration.

Roweis is not a framework: Roweis does not provide an "abstraction" that happens to be implemented using Sammy. Instead, Roweis provides helper methods that build Sammy route and event handlers for you.

The simplest case is a function that handles accessing a particular hash location. In Sammy, you would write a function to handle the root hash like this:

    this.get('#/', function(context) {
      ...
    });
    
In Roweis, you would declare a handler for the root hash location using a configuration hash, like this:

    app.display({
      route: '/',
      ...
    });
    
The discussion below will explain what else would be declared in the hash, and why. The main thing is that Roweis does most of its work with a hash of configuration options rather than the body of a function. Roweis then makes the function for you, and behind the scenese it binds the function to a faux-route using `.get('#/', ...)` on your behalf.

Roweis is a mildly opinionated library: Roweis is designed to help you build and maintain a certain type of client-side application. That does not mean that other types of applications are undesirable, just that this is what Roweis does. The two reasons that Roweis is a library and not a framewok are:

1. Roweis does not seek to teach you a non-portable abstraction to replace portable concepts like URLs and hashes. Therefore, Roweis writes functions that happily live in Sammy's abstraction.
2. Roweis seeks to make simple things easy and complex things possible. Therefore, when you need to do something outside of Roweis's sweet spot, you can work directly with Javascript, you can write a Sammy handler directly, you can write a customized backbone view, you are not limited to working within Roweis.

**where are the models?**

Let's start with the big problem we were trying to solve when we wrote Roweis. We like to build REST-ful servers, and we use tools like node.js and Rails that make REST easy. REST-ful interfaces are model-centric. The problem comes in building a user interface. User interfaces don't always map directly onto the REST-ful API. In one of the example snippets above, a fictitious view called 'products' displays information from two different collections of models: products and activities.

In a typical Rails app, for example, you implement the user interface in templates and controllers. It's fine for a REST-ful server to know how to serve products and activities for products separately. But serving both at the same time is an interface issue. If you build another route in to serve both, you're diluting the clean REST-ful nature of your server.

The solution to us was to factor the model logic into a "model server" that is strictly REST-ful. The views and controllers go somewhere else. We could build a separate Rails server that talks to the model server using curl or MQ, but for our purposes, pushing views and controllers into the browser made sense because were building a Single Page APplication anyways.

**what!?**

[Sammy][sammy] is a lightweight (&lt;20K) framework for writing single page Javascript applications. Sammy uses [Sinatra][sinatra]-like simple route definitions and structure. Sammy allows programs to respond to specific URLs, and utilizing the URL hash (#) you can create single page applications that still respond to the back button, like Gmail.

Sammy is touted as "A great way to build simple to complex applications built upon RESTful data stores like [CouchDB][couch] or [Cloudkit][cloud]." And it is.

Roweis is a plugin for Sammy that makes the "Great way to build simple applications built upon RESTful data stores" ridiculously easy by delivering a lot of the code you need right out of the box by default and emphasizing convention over configuration.

**for whom**

Roweis might be a good choice if you want to write a client-side [single page application][spa].

We can't tell you when to do this or why. But as one example, in the project where Roweis is being incubated, we want the server to be highly REST-ful and to manage business logic only. Thus, the server's controllers know about business logic, and the client's controllers know about the user interface.

**when**

Roweis has not been released yet. We are extracting it from an active project, and everything is in flux. But we are interested in working with opinionated enthusiasts.

The Basics: Writing Sammy Applications
---

To write a typical Sammy [single page application][spa], you'd use jQuery, Sammy, and one of Sammy's template plug ins like [Haml][haml]. In its simplest form, your page will expose one page element that Sammy will manipulate, something like this:

    !!!5
    
    %html
      %head
        %script{:src=>"jquery.js", :type=>"text/javascript", :charset=>"utf-8"}
        %script{:src=>"sammy.js", :type=>"text/javascript", :charset=>"utf-8"}
        %script{:src=>"sammy.haml.js", :type=>"text/javascript", :charset=>"utf-8"}
        
        // your application's include files will go here, along with
        // other javascript libraries you consider essential, e.g.
        
        %script{:src=>"jquery.combinators.js", :type=>"text/javascript", :charset=>"utf-8"}

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
    
How to Write a Sammy App using Roweis
---

Now we'll take a look at using Roweis to write your Sammy app. In addition to jQuery, Sammy, and Haml, we'll also need Roweis and Functional Javascript (a dependency at the moment). Our single page is almost exactly the same with Roweis as it is with Sammy, only the included Javascript files are different:

    !!!5
    
    %html
      %head
        %script{:src=>"jquery.js", :type=>"text/javascript", :charset=>"utf-8"}
        %script{:src=>"sammy.js", :type=>"text/javascript", :charset=>"utf-8"}
        %script{:src=>"sammy.haml.js", :type=>"text/javascript", :charset=>"utf-8"}
        
        // Roweis needs these:
        
        %script{:src=>"functional.js", :type=>"text/javascript", :charset=>"utf-8"}
        %script{:src=>"to-function.js", :type=>"text/javascript", :charset=>"utf-8"}
        
        // And we need Roweis:
        %script{:src=>"sammy.roweis.js", :type=>"text/javascript", :charset=>"utf-8"}
        
        // your application's include files will go here, along with
        // other javascript libraries you consider essential, e.g.
        
        %script{:src=>"jquery.combinators.js", :type=>"text/javascript", :charset=>"utf-8"}

      %body
      
        // Static stuff goes here
        
        // Sammy will put its dunamic stuff in this div:
        .main
        
        // More static stuff here

We also write an `application.js` file for Sammy, but this time we tell it to use Roweis. We will give our application a name, e.g. "example:"

    ;(function ($) {

      var app = $.sammy(function() {
      	this.use(Sammy.Roweis("example"));
      	this.use(Sammy.Haml);
      	this.element_selector = '.main'; 
      });

      $(function() {
      
        // we *can* put application stuff here, but Roweis makes it easy to 
        // organize it elsewhere, so all we'll leave is the run command:

      	app.run('#/welcome');
    	
      });
	
    })(jQuery);

**controllers and views in roweis**

Sammy applications associate routes with functions we call "handlers." Roweis is simply a tool for generating some or even all of those handlers for you and then registering them with Sammy. In the simplest case, we can use Roweis to register a handler function with Sammy from outside of our `application.js` file:

    Sammy.Roweis.example // note the name of the application
      .display('welcome', // the name of the handler, must be unique
        function () {
          this.partial('welcome.haml', {}, function (html) { app.swap(html); });
        });
    
This is useful because it is now very easy to move a handler definition into its own Javascript file, or to group related handlers together. When definitions are very small, moving them around makes coding a chore. But as they get more complex, you might want to group them in various ways. Roweis makes that easy, because you can define handlers from any Javascript file.

**handlers, views, and controllers**

Everything Roweis defines for you is a handler. By convention, a handler that is intended to display model information without changing it is called a "view," and a handler designed to change model information is a "controller." Roweis encourages delimitating your handlers this way, although it is not impossible to write views that modify data or controllers that display data.

**convention over configuration**

Notice that Roweis also does a little "Convention over Configuration:" if a controller is called `welcome`, the default route for it is `#/welcome`, and we don't have to define that separately. And Roweis can go further. If you have a view with the same name as a partial, why repeat yourself?

    Sammy.Roweis.example
      .display('welcome');
    
By default, Roweis's `.display` method creates a handler responds to `GET` and then invokes the Haml view of the same name for you. It also has a default route of `#/welcome`. You can define some more options. For example, you can use a different route:

    Sammy.Roweis.example
      .display('welcome', { 
        route: '#/' 
      });
      
You can also use the Rails/Sinatra/Sammy convention of extracting parameters from the route:

    Sammy.Roweis.example
      .display('product', { 
        route: '#/product/:id' 
      });
    
**sharing partials**

We just saw how you associate a handler with its own partial in Roweis: You give it the same name and Roweis takes care of the rest. Let's look at shared views. Let's assume that we run a [Skateboard and BMX Shop][core]. We have two different routes, `#/skateboard`, and `#bmx`. If they each had their own partials, we would write a `skateboard.haml` partial and a `bmx.haml` partial. Then we'd write our handlers:

    Sammy.Roweis.example
      .display('skateboard')
      .display('bmx');
    
If we want both handlers to share a public `product.haml` partial, we simply say so:

    Sammy.Roweis.example
      .display('skateboard', { partial: 'product' })
      .display('bmx',        { partial: 'product' });
    
Of course, many times we don't need to share a partial, so Sammy is set up to make you do as little work as possible. I personally prefer that if a partial is shared, it gets its own unique name. But that's a matter of taste. If you want, you can write:

    Sammy.Roweis.example
      .display('skateboard', { partial: 'bmx' })
      .display('bmx);
    );
    
Both handlers will use `bmx.haml` as their partial.

**retrieving something**

Some views really are as simple as displaying a template. When that's all you need, writing `.display('show_me')` is all you need to do. But some views need to go and get some restful data from a server that speaks JSON. Roweis makes that easy:

    Sammy.Roweis.example
      .display('product', { 
        gets: 'http://someserver.com/products/:_id',
        route: '#/product/:id
      })
      
This view expects an `id` parameter embedded in its route and in turn it uses AJAX to retrieve some JSON data from `someserver.com`. That data can then be displayed in the partial `product.haml`. In theory you can also have a view POST, PUT, or DELETE data from the server, but we expect this would be atypical.

**controllers**

In Roweis parlance, a view presents something but doesn't modify anything. A controller modifies something. Controllers usually redirect to a view, which [solves certain problems with bookmarking and the back button][prg]. You define controllers with the method `.action`. By default, a controller defines a handler that responds to `POST` instead of `GET`:

    Sammy.Roweis.example
      .action('new_skateboard', { redirects_to: 'show_product' })
      .action('new_bmx',        { redirects_to: 'show_product' })
      .display('show_product');
      
Like a view, a controller can also interact with a remote server. Here's a complete example:

    Sammy.Roweis.example
    
      .display('design_your_own_skateboard'),
      
      .action('new_skateboard', {
        posts: 'http://someserver.com/skateboards',
        redirects_to: 'rad_product/:id' 
      })
      
      .display('rad_product' {
        route: '#/rad/:id',
        gets: 'http://someserver.com/products/:_id'
      });

In this sequence, `design_your_own_skateboard.haml` would contain a form that executes a POST to `#/new_skateboard'. The `new\_skateboard` controller would post that information to the server, and we assume that the JSON returned by the POST is going to include an `id`. The controller would then redirect to the `rad\_product` view, which would go back to the serevr to retrieve the skateboard's details and to display the new, totally rad skateboard using `rad\_product.haml`.

**unobtrusive views**

When you want to nest views, Roweis gives you a simple mechanism, "unobtrusive views." An unobtrusive view has a route of `false` to indicate that it cannot be accessed through an URL and it also defines a jQuery selector called `renders`: 

    Sammy.Roweis.example.
      .display('calendar', { 
        route: false,
        renders: '.calendar.placeholder' ,
        gets: 'http://someserver.com/calendar/events'
      });
      
This declares that the calendar view does not have a route. Instead, whenever ANY view renders a DOM element matching the jQuery selector `.calendar.placeholder`, this view will perform a GET to the server at `'http://someserver.com/calendar/events`. The result will be rendered using the partial `calendar.haml`. However, instead of replacing the contents of the `.main` DOM element, the rendered HTML will replace the elements matching the jQuery selector.
	
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
[functional]: http://osteele.com/sources/javascript/functional/
[spi]: http://itsnat.sourceforge.net/php/spim/spi_manifesto_en.php "The Single Page Interface Manifesto"