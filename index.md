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
volutpat @^Descartes2016 malesuada erat, sed consectetur.

@@Descartes2016
{% endhighlight %}

### Result
Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Suspendisse imperdiet eleifend ornare @(Descartes2006). 
Proin pharetra sodales lectus, a sollicitudin lorem 
sodales eget. @Descartes2006 fusce eget nunc lorem. 

Aenean semper sapien gravida blandit ullamcorper. Duis 
pellentesque metus sit amet gravida posuere. Nullam 
volutpat @^Descartes2016 malesuada erat, sed consectetur.

@@Descartes2016


