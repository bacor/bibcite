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
var CitationStyle = function() {
	if (!(this instanceof CitationStyle)) return new CitationStyle();
	this.footnote = 0;
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

	else if((authors.length <= 5 && all == true) || (authors.length == 2)) {
		return authors.slice(0,authors.length-1).join(', ')
	            + ' & ' + authors[authors.length-1];
	} 

	else {
		return authors[0] + ' et al.'
	}
}

CitationStyle.prototype.templates = {
  fullArticle: _.template('<%= author %> (<%= year %>). '
                    +'<%= title %><%= title ? "." : "" %> '
                    +'<em><%= journal %></em><%= journal ? "." : "" %> '
                    +'<%= volume %><% if (number) { %><em>(<%= number %>)</em><% } %>'
                    +'<%= (pages && volume ) ? ": " : "" %><%= pages %><%= pages ? "." : "" %>'),

  fullArticle: _.template('<%= author %> (<%= year %>). '
                    +'<em><%= title %><%= title ? "." : "" %></em> '
                    +'<%= address %><%= address ? ":" : "" %> '
                    +'<%= publisher %>.'),
  
  citep: _.template('(<%= before %><%= before ? " " : "" %>'
                    +'<a href="#<%= footnoteId %>" rel="footnote"><%= author %>, <%= year %></a>'
                    +'<%= after ? " " : "" %><%= after %>)'),
  
  citet: _.template('<a href="#<%= footnoteId %>" rel="footnote"><%= author %> '
                    +'(<%= before %><%= before ? " " : "" %><%= year %>'
                    +'<%= after ? " " : "" %><%= after %>)</a>')
}

CitationStyle.prototype.nextFn = function() {
	this.footnote++;
	return this.footnote;
}

CitationStyle.prototype.export = function(citation, context) {
	var properties = ['author', 'year', 'title', 'journal', 'volume', 
		'number', 'pages', 'address', 'publisher'];
	var obj = {}
	for(i in properties) {
		var prop = properties[i];
		switch(prop) {

			case 'author':
				switch(context) {
					case 'reference':
						val = this.formatAuthors(citation, true, false);
						break;
					case 'inline':
						val = this.formatAuthors(citation, false, false);
						break;
				}
				break;

			case 'title':
				var title = citation.get('title');
				val = title.slice(1, title.length - 2);
				break;

			default:
				val = citation.get(prop);
		}
		obj[prop] = val || '';
	}

	obj.id = citation.id;
	obj.footnote = this.nextFn()
	obj.footnoteId = 'bibcite-' + obj.footnote

	return obj
}

CitationStyle.prototype.render = function(template, context, citation, before, after) {
	var obj = this.export(citation, context)
	obj.before = before;
	obj.after = after;
	return this.templates[template](obj)
}

CitationStyle.prototype.citep = function(citation, before, after) {
	return this.render('citep', 'inline', citation, before, after)
}

CitationStyle.prototype.citet = function(citation, before, after) {
	return this.render('citet', 'inline', citation, before, after)
}

CitationStyle.prototype.reference = function(citation, before, after) {
	switch(citation.get('entryType')) {
		case 'BOOK':
			return this.render('fullBook', 'reference', citation, before, after);
		default:
			return this.render('fullArticle', 'reference', citation, before, after);
	}
}

// var fnSelector = 'div.footnotes ol'
// var fnCounter = 0;
// CitationStyle.prototype.reference = function(citation, before, after) {
// 	// var fn = this.nextFn()
// 	// var id = 'footcite-' + fn
// 	// var ref = '<sup class="footnote"><a href="#'+id+'" rel="footnote">' + fn +'</a></sup>'
// 	// return ref + fullReference(id, citation, before, after)
// 	// 
// 	// 
// 	return templates.fullArticle({ 
// 		authors: formatAuthors(citation, true, false),
// 		year: citation['YEAR'],
// 		title: citation['TITLE'].slice(1, citation['TITLE'].length-2),
// 		journal: citation['JOURNAL'],
// 		volume: citation['VOLUME'],
// 		number: citation['NUMBER'],
// 		pages: citation['PAGES'].replace('--','&ndash;')
// 	})
// }

// var citep = function(citation, before, after) {
//   var count = referenceCount(citation);
//   fnCounter++;
//   var id = 'footcite-'+fnCounter
//   var content = templates.citep({ 
//     authors: formatAuthors(citation, count % 5 == 1, false),
//     year: citation['YEAR'],
//     count: count,
//     id: id,
//     before: before,
//     after: after
//   })
//   return content + fullReference(id, citation)
// }

// var citet = function(citation, before, after) {
//   var count = referenceCount(citation);
//   fnCounter++;
//   var id = 'footcite-'+fnCounter
//   var content = templates.citet({ 
//     authors: formatAuthors(citation, count % 5 == 1, false),
//     year: citation['YEAR'],
//     count: count,
//     id: id,
//     before: before,
//     after: after
//   })
//   return content + fullReference(id, citation)
// }

// var footcite = function(citation, before, after) {
//   fnCounter ++;
//   var id = 'footcite-' + fnCounter
//   var ref = '<sup class="footnote"><a href="#'+id+'" rel="footnote">' + fnCounter +'</a></sup>'
//   return ref + fullReference(id, citation, before, after)
// }

// var fullcite = function(citation, before, after) {
//   return templates.fullArticle({ 
//     authors: formatAuthors(citation, true, false),
//     year: citation['YEAR'],
//     title: citation['TITLE'].slice(1, citation['TITLE'].length-2),
//     journal: citation['JOURNAL'],
//     volume: citation['VOLUME'],
//     number: citation['NUMBER'],
//     pages: citation['PAGES'].replace('--','&ndash;')
//   }) 
// };
;
var BibCite = function(bibfile, settings) {
    if (!(this instanceof BibCite)) return new BibCite(settings);

    this.settings = _.defaults(settings, {
        bibfile: bibfile
    })

    this.style = new CitationStyle()

    this.bibliography = {}
    var self = this;
    $.get(bibfile, function(bibtext) {
        var bibs = doParse(bibtext);
        for (id in bibs) {
            if (id == '@comments') continue;
            var citation = new Citation(id, bibs[id])
            self.bibliography[id] = citation
            console.log(self.style.citep(citation))
            console.log(self.style.citet(citation))
            console.log(self.style.reference(citation))
        }
    });
}

BibCite.prototype.updateCitation = function(citation) {

}


var Citation = function(id, bib) {
    if (!(this instanceof Citation)) return new Citation(citation_id, citation);

    this.id = id
    this.bib = bib
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

        return obj
    })
}
//# sourceMappingURL=bibcite.js.map