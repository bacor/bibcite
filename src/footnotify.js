
(function($) {

    // Settings and variables
	var indWrapperClass = 'fn-indicator-wrapper',
        indClass = 'fn-indicator',
        noteClass = 'fn-note';
	var fnClass = 'footnotify-note';
	var outerContainer = 'main';
    var fnCounter = 0;
    var indLabel = 1; // Indicator label

	var hideActiveNotes = function() {
        $('.' + noteClass + '.active').each(function() {
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
		var hitFootnote = $target.parents('.' + noteClass).length > 0;
		var hitRef = $target.hasClass(indClass) || 
						($target.parents('.' + noteClass).length > 0);
		if(!hitFootnote && !hitRef) {
			hideActiveNotes()
		}
	})


    $.fn.footnotify = function() {
        $(this).each(function() {
            if(!$(this).attr('data-note')) {

                var self = $(this),
                    $ind = self, // indicator; semantically more appropriate
                    $indWrapper = self,
                    noteNum = fnCounter++,
                    noteId = 'footnotify:fn'+noteNum;

                // Look for original note
                var href = $ind.attr('href').replace(':','\\:'),
                    $origNote = $(href);
                
                // Check if the immediate parent is part of the note, 
                // by checking if the footnotes content refers back to it
                if($ind.parent().hasClass('note')) $indWrapper = $ind.parent();
                try {
                    var parentId = $ind.parent().attr('id').replace(':','\\:'),
                        reverseRef = $origNote.find('[href="#'+parentId+'"]');
                    if(reverseRef.length > 0) {
                        reverseRef.remove();
                        $indWrapper = self.parent();
                    }
                } catch(e) {}

                // Update indicator wrapper
                $indWrapper = $indWrapper
                    .attr('id', '')
                    .addClass(indWrapperClass);

                // Update indicator 
                $ind.attr('href', '#' + noteId)
                    .addClass(indClass)
                    .attr('data-note', noteNum)
                    .attr('rel', 'note')
                    .on('click', function(e) {
                        e.preventDefault();
                        if(!self.isActive()) {
                            self.showNote();
                        } else {
                            self.hideNote();
                        }
                    });

                if(!isNaN(parseInt($ind.html()))) {
                    $ind.html(indLabel++)
                }

                // Create note and remove old note
                var $note = $('<aside />')
                    .attr('id', noteId)
                    .addClass(noteClass)
                    .attr('data-note', noteNum)
                    .append(
                        $('<div class="tip" />'),
                        $('<div class="content" />')
                           .html($origNote.html()))
                    .insertAfter($indWrapper);

                $origNote.remove();

                /////////////////////////////////////////////////

                self.isActive = function() { 
                    return $note.hasClass('active')
                }

                self.showNote = function() {
                    hideActiveNotes()

                    $note.addClass('active')
                    clearTimeout($note.data('timeout'))
                    $note.data('timeout', setTimeout(function() {
                        $note.addClass('visible')
                    }, 10))

                    this.positionNote()
                }

                self.hideNote = function() {
                    $note.removeClass('visible')
                    $note.data('timeout', setTimeout(function() {
                        $note.removeClass('active')
                    }, 300))
                }

                self.positionNote = function() {
                    // Insert two probes around the ref to determine the
                    // right position of the tooltip
                    // var $el = (this.parent().hasClass('footnote')) ? this.parent() : this;
                    var $beginProbe = $('<i>').insertBefore($indWrapper);
                    var beginPos = $beginProbe.position();
                    var $endProbe = $('<i>').insertAfter($indWrapper);
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
                        contentWidth = $note.width();
                    if (refLeft > totalWidth - contentWidth / 2) {
                        // Position all the way to the right
                        targetLeft = totalWidth - contentWidth
                    } else {
                        // Center under reference
                        targetLeft = refLeft - (contentWidth - refWidth) / 2
                        targetLeft = Math.max(0, targetLeft)
                    }
                    $note.css({ left: targetLeft })

                    // position tip
                    var $tip = $note.find('.tip'),
                        refCenter = refLeft + refWidth / 2,
                        targetCenter = targetLeft + contentWidth / 2;
                    if (refCenter != targetCenter) {
                        $tip.css('left', refCenter - targetLeft);
                    }
                }
                
                /////////////////////////////////////////////////

                return self;
            } else {
                return this;
            }
        })
    }
})(jQuery)