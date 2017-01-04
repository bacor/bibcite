
var textohtml_map = {
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

function tex2html(tex) {
    for (var key in textohtml_map) {
        if (textohtml_map.hasOwnProperty(key)) {
            tex = tex.replace("{" + key + "}", textohtml_map[key]);
            tex = tex.replace(key, textohtml_map[key]);
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
}

BibCite.prototype.replace = function() {
    for(key in this.bibliography) {
        this.replaceCitation(this.bibliography[key])
    }

    this.updateTooltips()
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
        else if(type == '*') { mode = 'full' }

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

BibCite.prototype.updateTooltips = function() {
    // To do: make separate prototype?

    $("a[rel='footnote'], a.footnote").map(function(i, el) {
        var $ref = $(el)
        var $content = $($ref.attr('href'))

        $ref.on('click', function(e) {
            e.preventDefault()
            var href = $ref.attr('href')
            var $content = $(href)
            var active = $content.hasClass('active')

            if (!active) {
                $('.bibcite-footnote-wrapper.active').each(function() {
                    var $this = $(this);
                    $this.removeClass('visible')
                    $this.data('timeout', setTimeout(function() {
                        $this.removeClass('active')
                    }, 300))
                })

                $content.addClass('active')
                clearTimeout($content.data('timeout'))
                $content.data('timeout', setTimeout(function() {
                    $content.addClass('visible')
                }, 10))

                // Insert two probes around the ref to determine the
                // right position of the tooltip
                var $beginProbe = $('<i>').insertBefore($ref).addClass('probe');
                var beginPos = $beginProbe.position();
                var $endProbe = $('<i>').insertAfter($ref).addClass('probe');
                var endPos = $endProbe.position();
                $endProbe.remove();
                $beginProbe.remove();

                // Different reference positions for references spanning multiple lines
                if ((endPos.top - beginPos.top > 10) && beginPos.top >= 0) {
                    refWidth = endPos.left
                    refLeft = 0;
                    refTop = beginPos.top + $ref.height()
                } else {
                    refWidth = $ref.width()
                    refLeft = beginPos.left
                    refTop = endPos.top + $ref.height()
                }

                // Position content of tooltip
                var totalWidth = $('main').width(),
                    contentWidth = $content.width();
                if (refLeft > totalWidth - contentWidth / 2) {
                    // Position all the way to the right
                    targetLeft = totalWidth - contentWidth
                } else {
                    // Center under reference
                    targetLeft = refLeft - (contentWidth - refWidth) / 2
                    targetLeft = Math.max(0, targetLeft)
                }
                $content.css({ left: targetLeft, top: refTop })

                // position tip
                var $tip = $content.find('.tip'),
                    refCenter = refLeft + refWidth / 2,
                    targetCenter = targetLeft + contentWidth / 2;
                if (refCenter != targetCenter) {
                    $tip.css('left', refCenter - targetLeft)
                }
            } else {
                $content.removeClass('visible')
                $content.data('timeout', setTimeout(function() {
                    $content.removeClass('active')
                }, 300))
            }
        })
    })

}

BibCite.prototype.references = function(container) {
    var references = _.filter(this.bibliography, function(citation) {
        return citation.get('count') > 0
    })

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
    this.parseAuthor();
}

Citation.prototype.get = function(property) {
    if (property in this) {
        return this[property]
    } else if (property.toUpperCase() in this.bib) {
        return this.bib[property.toUpperCase()]
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

Citation.prototype.cite = function() {
    this.count++;
}