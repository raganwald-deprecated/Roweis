Roweis
===

*Lightweight controllers and views for the [Sammy][sammy] JS framework.*

**what**

[Sammy][sammy] is a lightweight (&lt;20K) framework for writing single page Javascript applications. Sammy uses [Sinatra][sinatra]-like simple route definitions and structure. Sammy allows programs to respond to specific URLs, and utilizing the URL hash (#) you can create single page applications that still respond to the back button, like Gmail.

Sammy is touted as "A great way to build simple to complex applications built upon RESTful data stores like [CouchDB][couch] or [Cloudkit][cloud]." And it is.

Roweis is a plugin for Sammy that makes the "Great way to build simple applications built upon RESTful data stores" ridiculously easy by delivering a lot of the code you need right out of the box by default and emphasizing convention over configuration.

**who**

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

Now we'll take a look at using Roweis to write your Sammy app. In addition to jQuery, Sammy, and Hanl, we'll also need Roweis and Functional Javascript (a dependency at the moment). Our single page is almost exactly the same with Roweis as it is with Sammy, only the included Javascript files are different:

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
      .view('welcome', // the name of the handler, must be unique
        function () {
          this.partial('welcome.haml', {}, function (html) { app.swap(html); });
        });
    
This is useful because it is now very easy to move a handler definition into its own Javascript file, or to group related handlers together. When definitions are very small, moving them around makes coding a chore. But as they get more complex, you might want to group them in various ways. Roweis makes that easy, because you can define handlers from any Javascript file.

**handlers, views, and controllers**

Everything Roweis defines for you is a handler. By convention, a handler that is intended to display model information without changing it is called a "view," and a handler designed to change model information is a "controller." Roweis encourages delimitating your handlers this way, although it is not impossible to write views that modify data or controllers that display data.

**convention over confoguration*

Notice that Roweis also does a little "Convention over Configuration:" if a controller is called `welcome`, the default route for it is `#/welcome`, and we don't have to define that separately. And Roweis can go further. If you have a view with the same name as a partial, why repeat yourself?

    Sammy.Roweis.example
      .view('welcome');
    
By default, Roweis's `.view` method creates a handler responds to `GET` and then invokes the Haml view of the same name for you. It also has a default route of `#/welcome`. You can define some more options. For example, you can use a different route:

    Sammy.Roweis.example
      .view('welcome', { 
        route: '#/' 
      });
      
You can also use the Rails/Sinatra/Sammy convention of extracting parameters from the route:

    Sammy.Roweis.example
      .view('product', { 
        route: '#/product/:id' 
      });
    
**sharing partials**

We just saw how you associate a handler with its own partial in Roweis: You give it the same name and Roweis takes care of the rest. Let's look at shared views. Let's assume that we run a [Skateboard and BMX Shop][core]. We have two different routes, `#/skateboard`, and `#bmx`. If they each had their own partials, we would write a `skateboard.haml` partial and a `bmx.haml` partial. Then we'd write our handlers:

    Sammy.Roweis.example
      .view('skateboard')
      .view('bmx');
    
If we want both handlers to share a public `product.haml` partial, we simply say so:

    Sammy.Roweis.example
      .view('skateboard', { partial: 'product' })
      .view('bmx',        { partial: 'product' });
    
Of course, many times we don't need to share a partial, so Sammy is set up to make you do as little work as possible. I personally prefer that if a partial is shared, it gets its own unique name. But that's a matter of taste. If you want, you can write:

    Sammy.Roweis.example
      .view('skateboard', { partial: 'bmx' })
      .view('bmx);
    );
    
Both handlers will use `bmx.haml` as their partial.

**retrieving something**

Some views really are as simple as displaying a template. When that's all you need, writing `.view('show_me')` is all you need to do. But some views need to go and get some restful data from a server that speaks JSON. Roweis makes that easy:

    Sammy.Roweis.example
      .view('product', { 
        gets: 'http://someserver.com/products/:_id',
        route: '#/product/:id
      })
      
This view expects an `id` parameter embedded in its route and in turn it uses AJAX to retrieve some JSON data from `someserver.com`. That data can then be displayed in the partial `product.haml`. In theory you can also have a view POST, PUT, or DELETE data from the server, but we expect this would be atypical.

**controllers**

In Roweis parlance, a view presents something but doesn't modify anything. A controller modifies something. Controllers usually redirect to a view, which [solves certain problems with bookmarking and the back button][prg]. You define controllers with the method `.controller`. By default, a controller defines a handler that responds to `POST` instead of `GET`:

    Sammy.Roweis.example
      .controller('new_skateboard', { redirects_to: 'show_product' })
      .controller('new_bmx',        { redirects_to: 'show_product' })
      .view('show_product');
      
Like a view, a controller can also interact with a remote server:

    Sammy.Roweis.example
      .controller('new_skateboard', {
        posts: 'http://someserver.com/skateboards',
        redirects_to: 'show_product/:id' 
      })
      .view('show_product');

This definition assumes that the JSON returned by the POST is going to include an `id`.

**unobtrusive views**

When you want to nest views, Roweis gives you a simple mechanism, "unobtrusive views." An unobtrusive view has a route of `false` to indicate that it cannot be accessed through an URL and it also defines a jQuery selector called `renders`: 

    Sammy.Roweis.example.
      .view('calendar', { 
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