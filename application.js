;(function ($) {

var main = $.sammy('.main', function() {
	this.use(Sammy.Haml);
	this.use(Sammy.Roweis('main', { 
	  partial_root: 'haml' //,
    // element_selector: '.main'
	}));
  // this.element_selector = 'body';
});

var comments = $.sammy('.main:not(.fubar)', function() {
  this.use(Sammy.DataLocationProxy);
  this.location_proxy = new Sammy.DataLocationProxy(this, 'location');
  this.use(Sammy.Haml);
  this.use(Sammy.Roweis('comments', { 
    parent: main,
    partial_root: 'haml' //,
    // element_selector: '.render_me'
  }));
  // TODO: We want to listen to our parent's events
  // on .main, but we want to render into our own selector in .comment_form
  // this.element_selector = 'body';
});

$(function() {
  main
    .bind('run', function() {console.log('main running')})
    .view('main', { route: '#/'})
    .run('#/');
  comments
    .bind('run', function() {console.log('comments running')})
    .view('empty', {
      route: '#/',
      partial: false
    })
    .view('comment_form', {
      route: false,
      renders: '.render_me'
    })
    .view('hi_there', {
      route: false,
      renders: '.hi_there'
    })
  //   .view('success')
  //   .controller('submit_comment', {
  //     // action_base: function (context, data) {
  //     //   $('<p></p>')
  //     //     .text(context.params.comment)
  //     //     .appendTo('.comments')
  //     //     ;
  //     // },
  // //     redirects_to: '#/success'
  // //   })
    .run();
});
	
})(jQuery);