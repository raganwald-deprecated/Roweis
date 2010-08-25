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

**how sammy\_js does it**

To write a Roweis [single page application][spa], you'll need jQuery, Sammy, Roweis, and one of Sammy's template plug ins ([Haml][haml] recommended). Ini its simplest form, your single page will expose one page element that Roweis and Sammy will manipulate, something like this:

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
    
Now you're ready to write controllers and views.
    
**mvc**

In the Model-View-Controller ("MVC") architectural pattern, the concerns of domain logic, presentation of data, and input are separated into "Models," "Views," and "Controllers." This separation facilitates independent testing and re-use. MVC is not the be-all and end-all of architecture, but it is appropriate for some applications.

Roweis is silent on the subject of models. Roweis assumes the existence of a back-end web server or web service that manages the models, while your application provides views and controllers. The purpose of Roweis is to give you a place to put your views and controllers, and to provide a smooth transition from intermingling view and controller code in the same function up to placing views and controllers in their own independent Javascript files.

**controllers and views**
    
In Sammy and Roweis, controllers are chunks of code that handle HTTP requests, and views are chunks of code that manipulate the DOM of your single page application. It is possible to intermingle controller and view code. In Sammy and in Roweis, you can write a single function that handles a request for a route and directly manipulates the DOM:

    this.get('#/welcome', function() {
      $('.main').text('Welcome!');
    });

If you want to split things into a controller and a view, you write a Haml template, e.g. `welcome.haml`:

    // welcome.haml
    Welcome to my Haml view!

And your controller renders the view:

    this.get('#/welcome', function (context) {
      this.render('welcome.haml', context.params.toHash());
    });

This trades some additional complexity for some separation of concerns. The controller is written in Javascript and the view is written in Haml. You also have some reusability: Multiple controllers can share the same view. And with Roweis, you can write the above code in Sammy's application scope and it works just fine. You can also define a controller throw a global `Sammy.Roweis` object:

    Sammy.Roweis.controllers.welcome = function () {
      this.render('welcome.haml', context.params.toHash());
    };
    
This is significant because it is now very easy to move a controller definition into its own Javascript file. When definitions are very small, moving them around makes coding a chore. But as they get more complex, you might want to group them in various ways. Roweis makes that easy, because you can define controller objects from any Javascript file.

Notice that Roweis also does a little "Convention over Configuration:" if a controller is called `welcome`, the default route for it is `#/welcome`. But Roweis can go further. Notice that the view is called `welcome.haml`? Behold:

    Sammy.Roweis.controllers.def({
      name: 'welcome'
    });
    
By default, Roweis creates a controller that simply invokes the Haml view of the same name. It also has a default route of `#/welcome`. You can define some more options. For example, you can use a different route:

    Sammy.Roweis.controllers.def({
      name: 'welcome',
      path: '#/'
    });
    
**private and public views**
    
One thing that is very important to note: When a controller has the same name as a view, the view is *Private*. The only controller that can use it is the controller with the same name. When a view does not share its name with a controller, the view is *Public*, and any controller can use it.

We just saw how you associate a controller with a private view in Roweis: You give it the same name and Roweis takes care of the rest. Let's look at public views. Let's assume that we run a [Skateboard and BMX Shop][core]. We have two different routes, `#/skateboard`, and `#bmx`. If they each had their own private view, we would write a `skateboard.haml` view and a `bmx.haml` view. Then we'd write our controllers:

    Sammy.Roweis.controllers.def(
      { name: 'skateboard' },
      { name: 'bmx' }
    );
    
If we want both controllers to share a public `product.haml` view, we simply say so:

    Sammy.Roweis.controllers.def(
      { name: 'skateboard', view: 'product' },
      { name: 'bmx',        view: 'product' }
    );
    
Of course, many times we don't need to share a view, so Sammy is set up to make you do as little work as possible. 

**redirection**

As mentioned, you cannot have a controller use another controller's private view. Consider:

    Sammy.Roweis.controllers.def(
      { name: 'skateboard' },
      { name: 'bmx', view: 'skateboard' }
    );

This does **not** cause the `bmx` controller to use `skateboard.haml` as its view. Instead, the `bmx` controller *redirects* to the skateboard controller's route. This is most common when you are posting the results of a form, so much so that it has its own name, [Post/Redirect/Get][prg]. In the example above, a user invoking `#/bmx` will have their browser redirect to `#/skateboard`.

Note that Roweis does some route resolution for you. If you write:

    Sammy.Roweis.controllers.def(
      { 
        name: 'skateboard', 
        path: '#/boards,
        view: 'board'
      },
      { name: 'bmx', view: 'skateboard' }
    );

Then a user invoking `#/bmx` will have their browser redirect to `#/boards`. The skateboard controller will handle that and use `board.haml` as the view.
  	
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
[core]: http://www.ridecore.ca "CORE BMX and Boards"
[prg]: http://en.wikipedia.org/wiki/Post/Redirect/Get