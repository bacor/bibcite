
(function($) {

	var fnWrapperClass = 'bibcite-footnote-wrapper';
	var fnClass = 'bibcite-footnote';
	var outerContainer = 'main';

	var hideActiveFootnotes = function() {
        $('.' + fnWrapperClass + '.active').each(function() {
            var $this = $(this);
            $this.removeClass('visible')
            $this.data('timeout', setTimeout(function() {
                $this.removeClass('active')
            }, 300))
        })
    }

    // Hide active footnotes if you click outside them
    $(window).on('click', function(e){
		var $target = $(e.target);
		var hitFootnote = $target.parents('.' + fnWrapperClass).length > 0;
		var hitRef = $target.hasClass(fnClass) || 
						($target.parents('.'+fnWrapperClass).length > 0);
		if(!hitFootnote && !hitRef) {
			hideActiveFootnotes()
		}
	})


    $.fn.footnotify = function() {
    	var self = this
    	self.addClass(fnClass);
        
        this.findFootnote = function() {
        	return $(self.attr('href'))
        }

        this.isActive = function() { 
            return self.$footnote.hasClass('active')
        }

        this.showFootnote = function() {
        	hideActiveFootnotes()

        	self.$footnote.addClass('active')
            clearTimeout(self.$footnote.data('timeout'))
            self.$footnote.data('timeout', setTimeout(function() {
                self.$footnote.addClass('visible')
            }, 10))

            this.positionFootnote()
        }

        this.hideFootnote = function() {
			self.$footnote.removeClass('visible')
            self.$footnote.data('timeout', setTimeout(function() {
                self.$footnote.removeClass('active')
            }, 300))
        }

        this.positionFootnote = function() {
        	// Insert two probes around the ref to determine the
            // right position of the tooltip
            var $el = (this.parent().hasClass('footnote')) ? this.parent() : this;
            var $beginProbe = $('<i>').insertBefore($el);
            var beginPos = $beginProbe.position();
            var $endProbe = $('<i>').insertAfter($el);
            var endPos = $endProbe.position();
            $endProbe.remove();
            $beginProbe.remove();

            // Different reference positions for references spanning multiple lines
            if ((endPos.top - beginPos.top > 10) && beginPos.top >= 0) {
                refWidth = endPos.left
                refLeft = 0;
            } else {
                refWidth = self.width()
                refLeft = beginPos.left
            }

            // Position content of tooltip
            var totalWidth = $(outerContainer).width(),
                contentWidth = self.$footnote.width();
            if (refLeft > totalWidth - contentWidth / 2) {
                // Position all the way to the right
                targetLeft = totalWidth - contentWidth
            } else {
                // Center under reference
                targetLeft = refLeft - (contentWidth - refWidth) / 2
                targetLeft = Math.max(0, targetLeft)
            }
            self.$footnote.css({ left: targetLeft })

            // position tip
            var $tip = self.$footnote.find('.tip'),
                refCenter = refLeft + refWidth / 2,
                targetCenter = targetLeft + contentWidth / 2;
            if (refCenter != targetCenter) {
                $tip.css('left', refCenter - targetLeft);
            }
        }

        ///////////////////////////////////
        
        this.$footnote = this.findFootnote()

        // Click handler
        this.on('click', function(e) {
        	e.preventDefault();
        	if(!self.isActive()) {
        		self.showFootnote();
        	} else {
        		self.hideFootnote();
        	}
        });

        return this;
    }
})(jQuery)