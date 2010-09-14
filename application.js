;(function ($) {

var example = $.sammy(function() {
	this.use(Sammy.Haml);
	this.use(Sammy.Roweis('example', { partial_root: 'haml' }));
	this.element_selector = '.main';
});

$(function() {
  example
    .view('add_comment', {
      action_render: function (context) {
        return '<b>Hi there!</b>';
      }
    })
    // .view('added_comment', {
    //   // indicate that it appends to a specific URL
    // })
    // .controller('component', {
    //   redirect_to: '#/add_comment' // this feels wrong, ought to delegate
    // })
    .run('#/');
});
	
})(jQuery);

// where do we trigger an added comment en passant?