;(function ($) {

var main = $.sammy('.main', function() {
	this.use(Sammy.Haml);
	this.use(Sammy.Roweis('main', { 
	  partial_root: 'haml'
	}));
});

var comments = $.sammy('.main:not(.fubar)', function() {
  this.use(Sammy.DataLocationProxy);
  this.location_proxy = new Sammy.DataLocationProxy(this, 'location');
  this.use(Sammy.Haml);
  this.use(Sammy.Roweis('comments', { 
    parent: main,
    partial_root: 'haml'
  }));
});

$(function() {
  main
    .bind('run', function() {console.log('main running')})
    .view('main', { route: '#/'})
    .run('#/');
  comments
    .view('comment_form', {
      route: false,
      renders: '.render_me'
    })
    .controller('new_comment', {
      appends_to: '.comments'
    })
    .run();
});
	
})(jQuery);