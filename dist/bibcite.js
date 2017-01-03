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
;

// References and bibliography

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
    "\\&": '&amp;'
};

function textohtml(tex) {
    for (var key in textohtml_map) {
        if (textohtml_map.hasOwnProperty(key)) {
            tex = tex.replace("{" + key + "}", textohtml_map[key]);
            tex = tex.replace(key, textohtml_map[key]);
        };
    };
    return tex;
}

function replace_html(rx, target) {
    var matches = $('p').filter(function() {
        return rx.test($(this).text())
    })

    $.each(matches, function() {
        var html = $(this).html();
        $(this).html(html.replace(rx, target))
    });
}

// Keep track of the number of times each reference occurs
var referenceCounts = {}
var referenceCount = function(citation) {
  var id = (typeof(citation) == 'string') ? citation : citation['_ID']
  referenceCounts[id] = (referenceCounts[id] || 0) + 1
  return referenceCounts[id];
}

var parseAuthor = function(authorString) {
  var authors = authorString.split(' and ');
  return authors.map(function(author) {
    var obj = { full: author }
    var parts = author.split(', ')
    obj.lastName = parts[0]

    parts = parts[1].split(' ')
    obj.firstName = parts[0]
    obj.middleNames = parts.slice(1)

    obj.initials = [obj.firstName[0]]
    _(obj.middleNames).each(function(name) {
      obj.initials.push(name[0])
    })

    return obj
  })
}

var formatAuthors = function(citation, all, initials) {
  if(all == undefined) { all = false } // Show all authors
  if(initials == undefined) { initials = false } // Show initials?

  var authors = parseAuthor(citation['AUTHOR']).map(function(author) {
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

var templates = {
  fullArticle: _.template('<%= authors %> (<%= year %>). '
                    +'<%= title %><%= title ? "." : "" %> '
                    +'<em><%= journal %></em><%= journal ? "." : "" %> '
                    +'<%= volume %><% if (number) { %><em>(<%= number %>)</em><% } %>'
                    +'<%= (pages && volume ) ? ": " : "" %><%= pages %><%= pages ? "." : "" %>'),
  citep: _.template('(<%= before %><%= before ? " " : "" %>'
                    +'<a href="#<%= id %>" rel="footnote"><%= authors %>, <%= year %></a>'
                    +'<%= after ? " " : "" %><%= after %>)'),
  citet: _.template('<a href="#<%= id %>" rel="footnote"><%= authors %> '
                    +'(<%= before %><%= before ? " " : "" %><%= year %>'
                    +'<%= after ? " " : "" %><%= after %>)</a>')
}

var fnSelector = 'div.footnotes ol'
var fnCounter = 0;

var fullReference = function(id, citation, before, after) {
  var $wrapper = $('<div id="'+id+'" class="footnote-wrapper"></div>')
      .append($('<p></p>').html(before))
      .append(fullcite(citation))
      .append($('<p></p>').html(after))
  return $('<div>').append($wrapper).html()
}

var citep = function(citation, before, after) {
  var count = referenceCount(citation);
  fnCounter++;
  var id = 'footcite-'+fnCounter
  var content = templates.citep({ 
    authors: formatAuthors(citation, count % 5 == 1, false),
    year: citation['YEAR'],
    count: count,
    id: id,
    before: before,
    after: after
  })
  return content + fullReference(id, citation)
}

var citet = function(citation, before, after) {
  var count = referenceCount(citation);
  fnCounter++;
  var id = 'footcite-'+fnCounter
  var content = templates.citet({ 
    authors: formatAuthors(citation, count % 5 == 1, false),
    year: citation['YEAR'],
    count: count,
    id: id,
    before: before,
    after: after
  })
  return content + fullReference(id, citation)
}

var footcite = function(citation, before, after) {
  fnCounter ++;
  var id = 'footcite-' + fnCounter
  var ref = '<sup class="footnote"><a href="#'+id+'" rel="footnote">' + fnCounter +'</a></sup>'
  return ref + fullReference(id, citation, before, after)
}

var fullcite = function(citation, before, after) {
  return templates.fullArticle({ 
    authors: formatAuthors(citation, true, false),
    year: citation['YEAR'],
    title: citation['TITLE'].slice(1, citation['TITLE'].length-2),
    journal: citation['JOURNAL'],
    volume: citation['VOLUME'],
    number: citation['NUMBER'],
    pages: citation['PAGES'].replace('--','&ndash;')
  }) 
}

var updateReference = function(citation, citation_id) {
  // Matches
  // @key --> normal inline citation, e.g. Author1, Author2 (2015)
  // @(key) --> parenthisized citation, e.g. (Author1, Author2, 2015)
  // @^key --> footnote citation
  // @@key --> full citation
  // var expr = new RegExp('@([@\\^\\(]?)' + citation_id + '\\)?(\\[(.[^\\[]*)\\](\\[(.[^\\[]*)\\])?)?\\W', 'ig')
  var expr = new RegExp('@(.)?' + citation_id, 'i')
  var matches = $('p').filter(function() {
      return expr.test($(this).text())
  })
  
  var expr = new RegExp('@(.)?' + citation_id + '\\)?(\\[.*\\])*', 'gi')
  $.each(matches, function() {
      var html = $(this).html();
      var newHtml = html.replace(expr, function(match, type, beforeAfter){
        var type = '' || type, 
            before = '', 
            after = '', 
            fn = citet;
        
        if(beforeAfter) {
          beforeAfter = beforeAfter.slice(1, beforeAfter.length-1).split('][')
          before = beforeAfter[0]
          after = beforeAfter[1] || ''
        }

        if(type == '(') { fn = citep }
        else if(type == '^') { fn = footcite }
        else if(type == '@') { fn = fullcite }
        return fn(citation, before, after)
      })

      $(this).html(textohtml(newHtml))
  });
}

$(function() {
    $.get("/assets/bibliography.bib", function(bibtext) {
        $(function() {
            var bibs = doParse(bibtext);
            _(bibs).each(function(citation, citation_id) {
                citation['_ID'] = citation_id
                updateReference(citation, citation_id)
            });

            $('.footnote-wrapper').each(function(i, el){
              var $el = $(el);
              var $content = $('<div class="content"></div>').html($el.html())
              var $tip  = $('<div class="tip"></div>')
              $el.empty().append($content).prepend($tip);
            })

            $("a[rel='footnote'], a.footnote").map(function(i, el) {
              var $ref = $(el)
              var $content = $($ref.attr('href'))

              $ref.on('click', function(e) {
                e.preventDefault()
                var href = $ref.attr('href')
                var $content = $(href)
                var active = $content.hasClass('active')
                
                if(!active) {
                  $('.footnote-wrapper.active').each(function() {
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
                  if((endPos.top - beginPos.top > 10) && beginPos.top >= 0) {
                    refWidth = endPos.left
                    refLeft  = 0;
                    refTop = beginPos.top + $ref.height()
                  } else {
                    refWidth = $ref.width()
                    refLeft = beginPos.left
                    refTop = endPos.top + $ref.height()
                  }

                  // Position content of tooltip
                  var totalWidth = $('main').width(),
                      contentWidth = $content.width();
                  if(refLeft > totalWidth - contentWidth / 2) {
                    // Position all the way to the right
                    targetLeft = totalWidth - contentWidth
                  } else {
                    // Center under reference
                    targetLeft = refLeft - (contentWidth - refWidth) / 2
                    targetLeft = Math.max(0, targetLeft)
                  }
                  $content.css({ left: targetLeft, top: refTop})

                  // position tip
                  var $tip = $content.find('.tip'),
                      refCenter = refLeft + refWidth / 2,
                      targetCenter = targetLeft + contentWidth / 2;
                  if(refCenter != targetCenter) {
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
        });
    })

})
//# sourceMappingURL=bibcite.js.map