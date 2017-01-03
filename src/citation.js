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
// }