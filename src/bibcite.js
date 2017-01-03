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