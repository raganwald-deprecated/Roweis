Roweis as a DSL?
===

This is an alterante definition "syntax," based o a jQuery-like chaining DSL. First, our `application.js` file looks the same:

    ;(function ($) {

    var core = $.sammy(function() {
    	this.use(Sammy.Haml);
    	this.use(Sammy.Roweis('core'));
    	this.element_selector = '.main';
    });

    $(function() {			
    	core.run('#/');
    });
	
    })(jQuery);

Then we might start defining some views and controllers:

    ;(function () {
	
    Sammy.Roweis.core
    
      // a string by itself defines a page view that has a default route
      // equal to its name that passes any received parameters
    	// through to the haml partial of the same name
    	
    	// also, ALL views are associated with the get verb by default
    	
      .view('login')

    	// if you supply a name and route, you get the same thing, but you've overriden
    	// the default route. Note that we can chain calls to .view
    	
    	.view('home')
    	  .route('#/')

    	// you can also specify a partial
    	
    	.view('prohibited_user')
    	  .partial('403.haml')
    	  
      // if you supply a selector to the render method instead of a route, you've
      // defined an unobtrusive view that is invoked to render any elements matching
      // its selector. the default partial is gleaned from the name
      
      .view('companyal_boilerplate')
        .renders('.company .boilerplate')
        
      // views for names are optional, but you will have to specify more stuff:
      
      .view()
        .renders('.disclaimer .boilerplate')
        .partial('disclaimer_boilerplate.haml')
        
      // some views need to get some data from the default server first. The default
      // server path is extracted from the name
      
      .view('companies')
        .gets()
        
      // and you can override the server path
      
      .view('company')
        .route('company/:id')
        .gets('/companies/:id')
    	  
    	// a controller updates model state either locally or typically by posting back to
    	// the server. controllers are not views, and they live in their own namespace.
    	// the default behaviour for a controller is to redirect to a view of the same name
    	
    	// all controllers are associated with the post verb by default, so it is quite possible
    	// for a controller and a view to have the same name and the same route. So:
    	
    	.view('preferences')
    	
    	.controller('preferences') // redirects to .view('preferences')
    	
    	// like views, controllers can GET, POST, PUT, or DELETE back to the server
    	
    	.view('logout')
    	  .redirectTo('context -> context.params.snapback');
    	
    	.controller('logout')
    	  .gets('/disconnect') // and then redirects to .view('logout')
    	  
    	// you can override the redirect
    	
    	.view('products')
    	
    	.controller('bmx')
    	  .redirectTo('products')
    	.controller('skateboards')
    	  .redirectTo('products')
    	  
    	// calls to the server are performed with AJAX. You can define some simple
    	// error handling for the entire controller:
    	
    	.view('not_authenticated')
    	  .partial('401.haml')
    	
    	.controller('authenticate')
    	  .posts('/authenticate')
    	  .when('xhr.status == 401')
    	    .redirectTo('not_authenticated')
    	    .end()
    	  .when('xhr.status == 403')
    	    .redirectTo('prohibited_user')
    	    .end()
    	  .redirectTo('context -> context.params.snapback');
	
    	;
	
    })();