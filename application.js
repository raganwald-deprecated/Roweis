;(function ($) {

var main = $.sammy(function() {
	this.use(Sammy.Haml);
	this.use(Sammy.Roweis('main', { 
	  partial_root: 'haml' 
	}));
	this.element_selector = '.main';
});

var comments = $.sammy(function() {
 this.use(Sammy.DataLocationProxy);
  this.location_proxy = new Sammy.DataLocationProxy(this, 'location');
 this.use(Sammy.Haml);
 this.use(Sammy.Roweis('comments', { 
   parent: main,
   partial_root: 'haml'
  }));
  // TODO: We want to listen to our parent's events
  // on .main, but we want to render into our own selector in .comment_form
 this.element_selector = '.main';
});

$(function() {
  main
    .view('index', { route: '#/'})
    .run('#/');
  comments
    .view('empty', {
      route: '#/',
      partial: false
    })
    .view('comment_form', {
      route: false,
      renders: '.render.comment_form'
    })
    .view('success')
    .controller('submit_comment', {
      // action_base: function (context, data) {
      //   $('<p></p>')
      //     .text(context.params.comment)
      //     .appendTo('.comments')
      //     ;
      // },
      redirects_to: '#/success'
    })
    .run();
});
	
})(jQuery);