"""Lavoisier's author preface, Robert Kerr's 1790 English translation."""


def experiment_quotation():
    source = "https://www.gutenberg.org/files/30775/30775-h/30775-h.htm"
    return f'''<figure class="experiment-quotation" id="experimental-principle">
      <blockquote cite="{source}"><p>We must trust to nothing but facts: These are presented to us by Nature, and cannot deceive. <strong>We ought, in every instance, to submit our reasoning to the test of experiment</strong>, and never to search for truth but by the natural road of experiment and observation.</p></blockquote>
      <figcaption><a href="{source}" aria-label="Antoine Lavoisier, Elements of Chemistry, author preface, 1790 English translation">— Antoine Lavoisier <span aria-hidden="true">·</span> 1790</a></figcaption>
    </figure>'''
