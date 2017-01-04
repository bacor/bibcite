// Original work by Henrik Muehe (c) 2010
//
// CommonJS port by Mikola Lysenko 2013
//
//

// Issues:
//  no comment handling within strings
//  no string concatenation
//  no variable values yet

// Grammar implemented here:
//  bibtex -> (string | preamble | comment | entry)*;
//  string -> '@STRING' '{' key_equals_value '}';
//  preamble -> '@PREAMBLE' '{' value '}';
//  comment -> '@COMMENT' '{' value '}';
//  entry -> '@' key '{' key ',' key_value_list '}';
//  key_value_list -> key_equals_value (',' key_equals_value)*;
//  key_equals_value -> key '=' value;
//  value -> value_quotes | value_braces | key;
//  value_quotes -> '"' .*? '"'; // not quite
//  value_braces -> '{' .*? '"'; // not quite
function BibtexParser() {
  this.pos = 0;
  this.input = "";
  
  this.entries = {};
  this.comments = [];
  this.strings = {
      JAN: "January",
      FEB: "February",
      MAR: "March",      
      APR: "April",
      MAY: "May",
      JUN: "June",
      JUL: "July",
      AUG: "August",
      SEP: "September",
      OCT: "October",
      NOV: "November",
      DEC: "December"
  };
  this.currentKey = "";
  this.currentEntry = "";
  

  this.setInput = function(t) {
    this.input = t;
  }
  
  this.getEntries = function() {
      return this.entries;
  }

  this.isWhitespace = function(s) {
    return (s == ' ' || s == '\r' || s == '\t' || s == '\n');
  }

  this.match = function(s) {
    this.skipWhitespace();
    if (this.input.substring(this.pos, this.pos+s.length) == s) {
      this.pos += s.length;
    } else {
      throw "Token mismatch, expected " + s + ", found " + this.input.substring(this.pos);
    }
    this.skipWhitespace();
  }

  this.tryMatch = function(s) {
    this.skipWhitespace();
    if (this.input.substring(this.pos, this.pos+s.length) == s) {
      return true;
    } else {
      return false;
    }
    this.skipWhitespace();
  }

  this.skipWhitespace = function() {
    while (this.isWhitespace(this.input[this.pos])) {
      this.pos++;
    }
    if (this.input[this.pos] == "%") {
      while(this.input[this.pos] != "\n") {
        this.pos++;
      }
      this.skipWhitespace();
    }
  }

  this.value_braces = function() {
    var bracecount = 0;
    this.match("{");
    var start = this.pos;
    while(true) {
      if (this.input[this.pos] == '}' && this.input[this.pos-1] != '\\') {
        if (bracecount > 0) {
          bracecount--;
        } else {
          var end = this.pos;
          this.match("}");
          return this.input.substring(start, end);
        }
      } else if (this.input[this.pos] == '{') {
        bracecount++;
      } else if (this.pos == this.input.length-1) {
        throw "Unterminated value";
      }
      this.pos++;
    }
  }

  this.value_quotes = function() {
    this.match('"');
    var start = this.pos;
    while(true) {
      if (this.input[this.pos] == '"' && this.input[this.pos-1] != '\\') {
          var end = this.pos;
          this.match('"');
          return this.input.substring(start, end);
      } else if (this.pos == this.input.length-1) {
        throw "Unterminated value:" + this.input.substring(start);
      }
      this.pos++;
    }
  }
  
  this.single_value = function() {
    var start = this.pos;
    if (this.tryMatch("{")) {
      return this.value_braces();
    } else if (this.tryMatch('"')) {
      return this.value_quotes();
    } else {
      var k = this.key();
      if (this.strings[k.toUpperCase()]) {
        return this.strings[k];
      } else if (k.match("^[0-9]+$")) {
        return k;
      } else {
        throw "Value expected:" + this.input.substring(start);
      }
    }
  }
  
  this.value = function() {
    var values = [];
    values.push(this.single_value());
    while (this.tryMatch("#")) {
      this.match("#");
      values.push(this.single_value());
    }
    return values.join("");
  }

  this.key = function() {
    var start = this.pos;
    while(true) {
      if (this.pos == this.input.length) {
        throw "Runaway key";
      }
    
      if (this.input[this.pos].match("[a-zA-Z0-9_:\\./-]")) {
        this.pos++
      } else {
        return this.input.substring(start, this.pos).toUpperCase();
      }
    }
  }

  this.key_equals_value = function() {
    var key = this.key();
    if (this.tryMatch("=")) {
      this.match("=");
      var val = this.value();
      return [ key, val ];
    } else {
      throw "... = value expected, equals sign missing:" + this.input.substring(this.pos);
    }
  }

  this.key_value_list = function() {
    var kv = this.key_equals_value();
    this.entries[this.currentEntry][kv[0]] = kv[1];
    while (this.tryMatch(",")) {
      this.match(",");
      // fixes problems with commas at the end of a list
      if (this.tryMatch("}")) {
        break;
      }
      kv = this.key_equals_value();
      this.entries[this.currentEntry][kv[0]] = kv[1];
    }
  }

  this.entry_body = function(d) {
    this.currentEntry = this.key();
    this.entries[this.currentEntry] = { entryType: d.substring(1) };
    this.match(",");
    this.key_value_list();
  }

  this.directive = function () {
    this.match("@");
    return "@"+this.key();
  }

  this.string = function () {
    var kv = this.key_equals_value();
    this.strings[kv[0].toUpperCase()] = kv[1];
  }

  this.preamble = function() {
    this.value();
  }

  this.comment = function() {
    var start = this.pos;
    while(true) {
      if (this.pos == this.input.length) {
        throw "Runaway comment";
      }
    
      if (this.input[this.pos] != '}') {
        this.pos++
      } else {
        this.comments.push(this.input.substring(start, this.pos));
        return;
      }
    }
  }

  this.entry = function(d) {
    this.entry_body(d);
  }

  this.bibtex = function() {
    while(this.tryMatch("@")) {
      var d = this.directive().toUpperCase();
      this.match("{");
      if (d == "@STRING") {
        this.string();
      } else if (d == "@PREAMBLE") {
        this.preamble();
      } else if (d == "@COMMENT") {
        this.comment();
      } else {
        this.entry(d);
      }
      this.match("}");
    }

    this.entries['@comments'] = this.comments;
  }
}

//Runs the parser
function doParse(input) {
  var b = new BibtexParser()
  b.setInput(input)
  b.bibtex()
  return b.entries
}

// module.exports = doParse;
var CitationStyle = function(options) {
	if (!(this instanceof CitationStyle)) return new CitationStyle(options);
	this.footnote = 0;

	this.options = _.defaults(options || {}, {
		before: '',
		after: '',
		includeFootnote: false,
		plain: true,
		showAllAuthorsEvery: 3,
		footnoteIdTemplate: 'bibcite-<%= footnoteNo %>' // will be replaced by footnotify
	})
	this.options.footnoteIdTemplate = _.template(this.options.footnoteIdTemplate)

	// Internal options
	this.options._export = true
	this.options._triggerCite = true

	// Allowed BibTeX fields; from https://en.wikipedia.org/wiki/BibTeX#Field_types
	var fields = 'address annote author booktitle chapter crossref '
		+ 'edition editor howpublished institution journal key month note '
		+ 'number organization pages publisher school series title type '
		+ 'volume year '
		// And some more (from Mendeley?)
		+ 'url arxivid archiveprefix abstract entrytype';
	this.fields = fields.split(' ');

	// Valid entry types (unused)
	var entryTypes = 'article book booklet conference inbook incollection '
		+ 'inproceedings manual mastersthesis misc phdthesis proceedings '
		+ 'techreport unpublished'
	// this.entryTypes = fields.split(' ');
}

CitationStyle.prototype.templates = {
  fullArticle: _.template('<%= author %> (<%= year %>). '
  	  				+'<%= url ? "<a href=\'" + url + "\' target=\'_blank\'>" : "" %>'
                    	+'<%= title %><%= title ? "." : "" %> '
                    +'<%= url ? "</a>" : "" %>'
                    +'<em><%= journal %></em><%= journal ? "." : "" %> '
                    +'<%= volume %><% if (number) { %><em>(<%= number %>)</em><% } %>'
                    +'<%= (pages && volume ) ? ": " : "" %><%= pages %><%= pages ? "." : "" %>'),

  fullBook: _.template('<%= author %> (<%= year %>). '
                    +'<em><%= title %><%= title ? "." : "" %></em> '
                    +'<%= address %><%= address ? ":" : "" %> '
                    +'<%= publisher %>.'),

  citep_plain: _.template('(<%= before %><%= before ? " " : "" %>'
                    +'<%= author %>, <%= year %>'
                    +'<%= after ? " " : "" %><%= after %>)'),
  
  citep: _.template('(<%= before %><%= before ? " " : "" %>'
                    +'<a href="#<%= footnoteId %>" rel="note"><%= author %>, <%= year %></a>'
                    +'<%= after ? " " : "" %><%= after %>)'),
  
  citet: _.template('<a href="#<%= footnoteId %>" rel="note"><%= author %> '
                    +'(<%= before %><%= before ? " " : "" %><%= year %>'
                    +'<%= after ? " " : "" %><%= after %>)</a>'),

  citet_plain: _.template('<%= author %> '
                    +'(<%= before %><%= before ? " " : "" %><%= year %>'
                    +'<%= after ? " " : "" %><%= after %>)'),

  footcite: _.template('<sup class="note">'
						+'<a href="#<%= footnoteId %>" rel="note"><%= footnote %></a>'
					  +'</sup>'),

  footnote: _.template(  '<div id="<%= footnoteId %>">'
							+ '<%= before ? "<p>" : ""%><%= before %><%= before ? "</p>" : ""%>'
  							+ '<p><%= content %></p>'
  							+ '<%= after ? "<p>" : ""%><%= after %><%= after ? "</p>" : ""%>'
	  					+'</div>') 
}

CitationStyle.prototype.formatAuthors = function(citation, all, initials) {
	if(all == undefined) { all = false } // Show all authors
	if(initials == undefined) { initials = false } // Show initials?

	var authors = citation.get('author').map(function(author) {
		if(initials) {
		  return author.lastName + ', ' + author.initials.join('. ') + '.'
		} else {
		  return author.lastName
		}
	});

	if(authors.length == 1) {
		return authors[0]
	} 

	else if((authors.length <= 6 && all == true) || (authors.length == 2)) {
		return authors.slice(0,authors.length-1).join(', ')
	            + ' & ' + authors[authors.length-1];
	} 

	else {
		return authors[0] + ' et al.'
	}
}

CitationStyle.prototype.nextFn = function() {
	this.footnote++;
	return this.footnote;
}

CitationStyle.prototype.export = function(citation, context) {
	var obj = {}
	for(i in this.fields) {
		var prop = this.fields[i];
		switch(prop) {

			case 'author':
				switch(context) {
					case 'footnote':
					case 'reference':
						val = this.formatAuthors(citation, true, true);
						break;
					case 'inline':
						// Periodially show all authors 
						var allAuthors = citation.get('count') % this.options.showAllAuthorsEvery == 0
						val = this.formatAuthors(citation, allAuthors, false);
						break;
				}
				break;

			case 'title':
				var title = citation.get('title');
				val = title.slice(1, title.length - 1);
				break;

			default:
				val = citation.get(prop);
		}
		obj[prop] = val || '';
	}

	obj.key = citation.get('key');
	obj.footnote = this.nextFn()
	obj.footnoteId = this.options.footnoteIdTemplate({footnoteNo: obj.footnote })

	return obj
}

CitationStyle.prototype.render = function(template, citation, options) {
	var options = _.defaults(options || {}, this.options),
		obj = options;
	
	// Export the citation into obj (the condition prevents superfluous exports)
	if(options._export) obj = _(this.export(citation, options._context)).defaults(options);

	// Trigger cite in citation object to e.g. update counter
	if(options._triggerCite) citation.cite();
 	
 	if(options.includeFootnote) options.plain = false;

 	if(options.plain && (template + '_plain' in this.templates)) 
 		template = template + '_plain';

	// Render citation template
	var citationHtml = this.templates[template](obj);

	if(options._context != 'footnote') {
		options.before = '';
		options.after = '';
	}

	// Optionally (but by default) render footnote template
	if( options.includeFootnote) {

		// Pass object and don't export + cite again
		var opts =  _.extend(obj, { includeFootnote: false, _export: false, _triggerCite: false })
		var content = this.fullcite(citation, opts)
		var footnoteHtml = this.templates.footnote(_(opts).extend({ content: content }))
		return {
			citation: citationHtml,
			footnote: footnoteHtml
		}

	} else {
		return citationHtml;
	}
}

CitationStyle.prototype.citep = function(citation, options) {
	options = _(options).defaults({ _context: 'inline' })
	return this.render('citep', citation, options)
}

CitationStyle.prototype.citet = function(citation, options) {
	options = _(options).defaults({ _context: 'inline' })
	return this.render('citet', citation, options)
}

CitationStyle.prototype.footcite = function(citation, options) {
	options = _(options).defaults({ _context: 'footnote' })
	return this.render('footcite', citation, options)
}

CitationStyle.prototype.fullcite = function(citation, options) {
	options = _.defaults(options || {}, { includeFootnote: false, _context: 'reference' })
	switch(citation.get('entryType')) {
		case 'BOOK':
			return this.render('fullBook', citation, options);
		default:
			return this.render('fullArticle', citation, options);
	}
};

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
})(jQuery);

var tex2html_map = {
    "\\\"u": "&uuml;",
    "\\\"a": "&auml;",
    "\\\"o": "&ouml;",
    "\\'e": "&eacute;",
    "\\'a": "&aacute;",
    "\\\"U": "&Uuml;",
    "\\\"A": "&Auml;",
    "\\\"O": "&Ouml;",
    "\\'E": "&Eacute;",
    "\\'A": "&Aacute;",
    "\\\"{u}": "&uuml;",
    "\\\"{a}": "&auml;",
    "\\\"{o}": "&ouml;",
    "\\'{e}": "&eacute;",
    "\\'{a}": "&aacute;",
    "\\\"{U}": "&Uuml;",
    "\\\"{A}": "&Auml;",
    "\\\"{O}": "&Ouml;",
    "\\'{E}": "&Eacute;",
    "\\'{A}": "&Aacute;",
    "\\&": '&amp;',
    "--": "&ndash;"
};

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function tex2html(tex) {
    for (var key in tex2html_map) {
        if (tex2html_map.hasOwnProperty(key)) {
            tex = tex.replaceAll("{" + key + "}", tex2html_map[key]);
            tex = tex.replaceAll(key, tex2html_map[key]);
        };
    };
    return tex;
}

var BibCite = function(bibfile, options) {
    if (!(this instanceof BibCite)) return new BibCite(options);

    this.options = _.defaults(options || {}, {
        bibfile: bibfile,
        defaultMode: 't',
        selector: 'p, li',
        includeFootnote: true
    })
    this.style = new CitationStyle(this.options)

    this.bibliography = {}
    var self = this;
    $.ajax({
        url: bibfile,
        success: function(bibtext) {
            var bibs = doParse(bibtext);
            for (key in bibs) {
                if (key == '@comments') continue;
                var citation = new Citation(key, bibs[key])
                self.bibliography[key.toUpperCase()] = citation
            }
        },
        async: false // to be improved!
    });
    return this;
}

BibCite.prototype.replace = function() {
    for(key in this.bibliography) {
        this.replaceCitation(this.bibliography[key])
    }
    this.footnotify();
    return this;
}

BibCite.prototype.replaceCitation = function(citation) {
    citation = this.get(citation);

    // Matches
    // @key --> normal inline citation, e.g. Author1, Author2 (2015)
    // @(key) --> parenthisized citation, e.g. (Author1, Author2, 2015)
    // @^key --> footnote citation
    // @@key --> full citation
    var expr = new RegExp('@(.)?' + citation.get('key'), 'i')
    var matches = $(this.options.selector).filter(function() {
      return expr.test($(this).text())
    })

    var self = this;
    var expr = new RegExp('(@{1,2})(.)?' + citation.get('key') + '\\)?((\\{[^\\{]*\\})*)', 'gi')
    $.each(matches, function() {
      var html = $(this).html();
      var newHtml = html.replace(expr, function(match, at, type, beforeAfter,C,D,E){
        var type = '' || type, 
            mode = self.options.defaultMode,
            options = {};

        // Plain or with footnotes?
        var includeFootnote = at.length == 2;
        options.includeFootnote  = includeFootnote ? true : false;

        // Extract comments before or after
        if(beforeAfter) {
          beforeAfter = beforeAfter.slice(1, beforeAfter.length-1).split('}{')
          options.before = beforeAfter[0]
          options.after = beforeAfter[1] || ''
        }

        // Determine citation mode
        if(type == '(') { mode = 'p' }
        else if(type == '^') { mode = 'foot'; options.includeFootnote=true } 
        else if(type == '*') { mode = 'full'; options.includeFootnote=false }
        else if(type == '!') { mode = 'no' }

        // Get citation html
        var html = self.cite(citation, mode, options)

        if(typeof(html) == 'object') {
            return html.citation + html.footnote
        } else {
            return html
        }
      })

      // Update paragraph html
      $(this).html(tex2html(newHtml))
    });
}

BibCite.prototype.get = function(key){
    if(_.isString(key)) {
        if(!(key in this.bibliography)){
            console.warn('Citation key not found')
            return false;
        }
        return this.bibliography[key.toUpperCase()]    
    }

    else if(Citation.prototype.isPrototypeOf(key)) {
        return key
    } 

    else {
        throw('Error: Bibcite.get only accepts strings or citation elements')
    }
}

// if first argument is a string
// cite(id) should cite in text
// cite(id, 't') should cite in text
// cite(id, 'p') should cite in parentheses
// cite(id, 'full') should cite in full
// 
// if first argument is a Citation object
// cite(citation, style, options)
BibCite.prototype.cite = function(citation, mode, options) {
    
    // Get citation object
    if(_.isString(citation)) {
        citation = this.get(citation);
        if( _.isUndefined(citation)) 
            throw ('Error: Citation key not found');
    }
    if(!Citation.prototype.isPrototypeOf(citation)) 
        throw ('Error: citation should have Citation as a prototype');

    // Using default style with objects
    if(_.isObject(mode)) {
        options = mode;
        mode = this.options.defaultMode;
    }
    
    // No cite: no output
    if(mode == 'no') {
        this.nocite(citation);
        return '';
    }

    // Determine mode to cite
    var citeFns = { 't': 'citet', 'p': 'citep', 'full': 'fullcite', 'foot': 'footcite' }
    var mode = mode || this.options.defaultMode;
    if(!(mode in citeFns)) {
        console.warn('Warning: invalid mode argument: expecting "t", "p", or "full", but got "' + mode + '". Assuming default.')
        mode = this.options.defaultMode;
    }
    var citeFn = citeFns[mode]

    // Cite!
    return this.style[citeFn].apply(this.style, [citation, options])
}

BibCite.prototype.citep = function(citation, options) { 
    return this.cite(citation, 'p', options) 
}

BibCite.prototype.citet = function(citation, options) { 
    return this.cite(citation, 't', options) 
}

BibCite.prototype.fullcite = function(citation, options) { 
    return this.cite(citation, 'full', options) 
}

BibCite.prototype.footcite = function(citation, options) { 
    return this.cite(citation, 'foot', options) 
}

BibCite.prototype.nocite = function(citation, options) {
    citation.cite(false);
}

BibCite.prototype.footnotify = function() {
    $('a[rel="note"], a[href^="#fn"], a[class="footnote"]').footnotify();
    return this
}

BibCite.prototype.references = function(container) {
    var references = _.filter(this.bibliography, function(citation) {
        return citation.isCited()
    })

    references = _.sortBy(references, function(citation){
        return this.style.formatAuthors(citation, true, true)
    }.bind(this))

    var $list = $('<ul class="references"></ul>')
    _.each(references, function(citation) {
        var html = tex2html(this.fullcite(citation))
        var $item = $('<li></li>').html(html)
        $item.appendTo($list);
    }.bind(this))

    if(container) {
        $list.appendTo($(container))
    } else {
        return $list;
    }
}

////////////////////////////////////////////////////////////////////////////


var Citation = function(key, bib) {
    if (!(this instanceof Citation)) return new Citation(citation_id, citation);

    this.key = key
    this.bib = bib
    this.count = 0 // number of citations
    this.cited = false;
    this.parseAuthor();
}

Citation.prototype.get = function(property) {
    if (property in this) {
        return this[property]
    } else if (property.toUpperCase() in this.bib) {
        return this.bib[property.toUpperCase()]
    } else if (property in this.bib) {
        return this.bib[property]
    } else {
        return false
    }
}

Citation.prototype.parseAuthor = function() {
    var authorString = this.get('author');
    if (!authorString) { return false; }

    var authors = authorString.split(' and ');
    this.author = authors.map(function(author) {
        var obj = { full: author }
        var parts = author.split(', ')
        obj.lastName = parts[0]

        parts = parts[1].split(' ')
        obj.firstName = parts[0]
        obj.middleNames = parts.slice(1)

        obj.initials = [obj.firstName[0]]
        $(obj.middleNames).each(function(name) {
            obj.initials.push(name[0])
        })

        // Make sure initials start with a capital
        obj.initials = _.map(obj.initials, function(i){
            if(_.isUndefined(i)) return '';
            return i.charAt(0).toUpperCase() + i.slice(1);
        })

        return obj
    })
}

Citation.prototype.cite = function(count) {
    if(_.isUndefined(count)) count = true;
    if(count) this.count++;
    this.cited = true;
}
Citation.prototype.isCited = function() {
    return this.cited
}


//# sourceMappingURL=bibcite.js.map