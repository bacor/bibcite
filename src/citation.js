var CitationStyle = function(options) {
	if (!(this instanceof CitationStyle)) return new CitationStyle(options);
	this.footnote = 0;

	this.options = _.defaults(options || {}, {
		before: '',
		after: '',
		includeFootnote: false,
		plain: true,
		showAllAuthorsEvery: 3,
		footnoteIdTemplate: 'bibcite-<%= footnoteNo %>'
	})
	this.options.footnoteIdTemplate = _.template(this.options.footnoteIdTemplate)

	// Internal options
	this.options._export = true
	this.options._triggerCite = true

	// Allowed BibTeX fields; from https://en.wikipedia.org/wiki/BibTeX#Field_types
	var fields = 'address annote author booktitle chapter crossref '
		+ 'edition editor howpublished institution journal key month note '
		+ 'number organization pages publisher school series title type '
		+ 'volume year';
	this.fields = fields.split(' ');

	// Valid entry types (unused)
	var entryTypes = 'article book booklet conference inbook incollection '
		+ 'inproceedings manual mastersthesis misc phdthesis proceedings '
		+ 'techreport unpublished'
	// this.entryTypes = fields.split(' ');
}

CitationStyle.prototype.templates = {
  fullArticle: _.template('<%= author %> (<%= year %>). '
                    +'<%= title %><%= title ? "." : "" %> '
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
                    +'<a href="#<%= footnoteId %>" rel="footnote"><%= author %>, <%= year %></a>'
                    +'<%= after ? " " : "" %><%= after %>)'),
  
  citet: _.template('<a href="#<%= footnoteId %>" rel="footnote"><%= author %> '
                    +'(<%= before %><%= before ? " " : "" %><%= year %>'
                    +'<%= after ? " " : "" %><%= after %>)</a>'),

  citet_plain: _.template('<%= author %> '
                    +'(<%= before %><%= before ? " " : "" %><%= year %>'
                    +'<%= after ? " " : "" %><%= after %>)'),

  footcite: _.template('<sup class="footnote">'
						+'<a href="#<%= footnoteId %>" rel="footnote"><%= footnote %></a>'
					  +'</sup>'),

  footnote: _.template(  '<div id="<%= footnoteId %>" class="bibcite-footnote-wrapper">'
  							+ '<div class="tip"></div>'
  							+ '<div class="content">'
	  							+ '<%= before ? "<p>" : ""%><%= before %><%= before ? "</p>" : ""%>'
	  							+ '<p><%= content %></p>'
	  							+ '<%= after ? "<p>" : ""%><%= after %><%= after ? "</p>" : ""%>'
	  						+ '</div>'
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
}