cv:
	cat header.html > index.html
	pandoc cv.md -t html >> index.html
	cat footer.html >> index.html
	weasyprint cv.html _Bobby_W_McCann_CV.pdf
