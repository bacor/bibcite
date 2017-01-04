
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

// Keep track of the number of times each reference occurs
var referenceCounts = {}
var referenceCount = function(citation) {
  var id = (typeof(citation) == 'string') ? citation : citation['_ID']
  referenceCounts[id] = (referenceCounts[id] || 0) + 1
  return referenceCounts[id];
}

// var parseAuthor = function(authorString) {
//   var authors = authorString.split(' and ');
//   return authors.map(function(author) {
//     var obj = { full: author }
//     var parts = author.split(', ')
//     obj.lastName = parts[0]

//     parts = parts[1].split(' ')
//     obj.firstName = parts[0]
//     obj.middleNames = parts.slice(1)

//     obj.initials = [obj.firstName[0]]
//     $(obj.middleNames).each(function(name) {
//       obj.initials.push(name[0])
//     })

//     return obj
//   })
// }

// var formatAuthors = function(citation, all, initials) {
//   if(all == undefined) { all = false } // Show all authors
//   if(initials == undefined) { initials = false } // Show initials?

//   var authors = parseAuthor(citation['AUTHOR']).map(function(author) {
//     if(initials) {
//       return author.lastName + ', ' + author.initials.join('. ') + '.'
//     } else {
//       return author.lastName
//     }
//   });
  
//   if(authors.length == 1) {
//     return authors[0]
//   } 

//   else if((authors.length <= 5 && all == true) || (authors.length == 2)) {
//     return authors.slice(0,authors.length-1).join(', ')
//                 + ' & ' + authors[authors.length-1];
//   } 

//   else {
//     return authors[0] + ' et al.'
//   }
// }

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
    $.get("/demo/demo-bib.bib", function(bibtext) {
        $(function() {
            var bibs = doParse(bibtext);
            _(bibs).each(function(bib, id) {
                var citation = new Citation(id, bib)
                console.log(citation, 'asdfadsf')
                // citation['_ID'] = citation_id
                // updateReference(citation, citation_id)
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