
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

