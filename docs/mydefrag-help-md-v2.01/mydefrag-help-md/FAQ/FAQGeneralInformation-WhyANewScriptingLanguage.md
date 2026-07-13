## FAQ General information - Why a new scripting language?

When I designed MyDefrag I was faced with some choices. I could have made an API (Application Programmers Interface) with dozens of function calls. This would have meant a lot of work in porting the API to all the different programming languages out there. The SQL paradigm was a lot easier to build, a single entry point that accepts a script. MyDefrag can now be used from most programming languages without having to build an API for that language, because most languages already have a function to start up another program. An example is the PHP system() function.

Another choice I had to make was which programming language to use. I found that the things I wanted to do were not easily mapped onto existing programming languages. Also, it would have brought me back to having to build an API. And it would have meant that all MyDefrag script writers would have had to learn a rich and complete programming language. So, I decided to write a simple, decidated, specially designed scripting language.

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQGeneralInformation-WhyANewScriptingLanguage.html`_
