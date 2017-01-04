---
layout: default
---
## BibCite

BibCite let's you cite from your BibTeX files using a markdown-like syntax. It depends on jQuery and (still) on underscore.js.

### JS
Load the dependencies and you're good to go:
{% highlight html %}
<script src="jquery.min.js"></script>
<script src="underscore-min.js"></script>
<script src="bibcite.min.js"></script>
<script>
//..
</script>
{% endhighlight %}

### Markdown
{% highlight md %}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Suspendisse imperdiet eleifend ornare @(Descartes2006). 
Proin pharetra sodales lectus, a sollicitudin lorem 
sodales eget. @Descartes2006 fusce eget nunc lorem. 

Aenean semper sapien gravida blandit ullamcorper. Duis 
pellentesque metus sit amet gravida posuere. Nullam 
volutpat @@^Descartes2006 malesuada erat, sed consectetur.

@@Banerjee2015
{% endhighlight %}

### Result
Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Suspendisse imperdiet eleifend ornare @(Descartes2006). 
Proin pharetra sodales lectus, a sollicitudin lorem 
sodales eget. @Descartes2006 fusce eget nunc lorem. 

Aenean semper sapien gravida blandit ullamcorper. Duis 
pellentesque metus sit amet gravida posuere. Nullam 
volutpat @@^Descartes2006 malesuada erat, sed consectetur.

@@Banerjee2015

### More examples
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
- And you can include messages there: @^Banerjee2015{Look this is [a link](http://example.com)}{And an afterthough}
- @@*Banerjee2015

### References
<div class="references-container"></div>
