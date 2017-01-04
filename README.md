## BibCite

BibCite let's you cite from your BibTeX files using a markdown-like syntax. It depends on jQuery and Underscore.js. [More *information* and a *demo* can be found on the project's page](https://bacor.github.io/bibcite)

## Installation

```
bower install bacor/bibcite
```

## Usage
```html
<script src="jquery.min.js"></script>
<script src="underscore-min.js"></script>
<script src="bibcite.min.js"></script>
<script>
    B = new BibCite('path/to/my/bib/file.bib', { /* options */ })
    B.replace();
    B.references('.bibliography')
</script>
```

```markdown
Parenthesized citations are very common @(Lazaridou2016).
You can add a tooltip showing the full reference just
as easily @@(Lazaridou2016). Alternatively, cite in the
running text, just like @@Descartes2006. If you prefer
footnotes @^Lazaridou2016 that is also fine. Or cite
without showing the reference @!Banerjee2015; or get the
full reference: @@Lazaridou2016

# References
<div class="bibliography"></div>
```

A working demo and more examples can be found on [the project's page]
(https://bacor.github.io/bibcite)

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

## Options
The `BibCite` object takes various options. These are always passed along internally and you can overwrite them in, e.g. individual citations `MyBibCite.pcite(myCitation, myOptions)`. 

- **`defaultMode`** The default citation mode; defaults to `"t"` (i.e. `citet`)
- **`selector`** CSS selector for the elements in which to look for citations; defaults to `"p, li"`. 
- **`before`** Default text shown before a citation, defaults to `""`.
- **`after`** Default text shown after a citation, defaults to `""`.
- ... 
