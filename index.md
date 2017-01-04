---
layout: default
---
## BibCite

BibCite let's you cite from your BibTeX files using a markdown-like syntax. It depends on jQuery and underscore.js.

Note: all this is still pretty experimental.

### JS
Load the dependencies and you're good to go:
{% highlight html %}
<script src="jquery.min.js"></script>
<script src="underscore-min.js"></script>
<script src="bibcite.min.js"></script>
<script>
    B = new BibCite('path/to/my/bib/file.bib', { /* options */ })
    B.replace();
    B.references('.bibliography')
</script>
{% endhighlight %}

### Markdown
{% highlight md %}
Parentized citations are very common @(Lazaridou2016).
You can add a tooltip showing the full reference just
as easily @@(Lazaridou2016). Alternatively, cite in the
running text, just like @@Descartes2006. If you prefer
footnotes @^Lazaridou2016 that is also fine. Or cite
without showing the reference @!Banerjee2015; or get the
full reference: @@Lazaridou2016

# References
<div class="bibliography"></div>
{% endhighlight %}

### Result

Parentized citations are very common @(Lazaridou2016).
You can add a tooltip showing the full reference just
as easily @@(Lazaridou2016). Alternatively, cite in the
running text, just like @@Descartes2006. If you prefer
footnotes @^Lazaridou2016 that is also fine. Or cite
without showing the reference @!Banerjee2015; or get the
full reference: @@Lazaridou2016
{: .result}

<p class="ref-title">References</p>
<div class="bibliography"></div>

## Syntax
The citation syntax follows the general pattern **`[@ or @@][mode][citation key]{[before]}{[after]}`**. Each part is explained below.

* **`[@ or @@]`**. A single `@` results in a plain text citation, double `@@` results in an interacte citation with a full reference in a tooltip.
* **`[mode]`**. There are currently five citation modes; they are summarized in the following table.

| Syntax   | Meaning                 | Example          | Method     |
|----------|-------------------------|------------------|------------|
| `@key`   | Default inline citation | @Descartes2006   | `citet`    |
| `@(key)` | Bracketed citation      | @(Descartes2006) | `citep`    |
| `@^key`  | Footnote citation       | @^Descartes2006  | `footcite` |
| `@*key`  | Full reference          | @*Descartes2006  | `fullcite` |
| `@!key`  | Show in references only | @!Descartes2006  | `nocite`   |

* **`[citation key]`**. The citation key from the BibTeX file. Note that this is case _in_sensitive.
* **`{[before]}`**. The text `[before]` is inserted before the citation
* **`{[after]}`**. The text `[after]` is inserted after the citation. Note that `before` and `after` can contain HTML elements (or initially, markdown), as long as it contains no curly brackets.


## More examples
- @Banerjee2015
- @@Banerjee2015
- @(Banerjee2015)
- @@(Banerjee2015)
- @@(Banerjee2015){}
- @@(Banerjee2015){Before [this is a link?](example.com)}
- @@(Banerjee2015){Before}{After}
- @@(Banerjee2015){}{After}
- @@(Banerjee2015){Before}{after} @@(Banerjee2015){before}
- Footnotes are always interactive: @^Banerjee2015 @@^Banerjee2015
- And you can include messages there: @^Banerjee2015{Look this is [a link](http://example.com) and another citation @Banerjee2015.}{And an afterthough}
- @@*Banerjee2015
