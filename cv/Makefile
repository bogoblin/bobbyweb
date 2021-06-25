cv:
	cat header.html > cv.html
	pandoc cv.md -t html >> cv.html
	cat footer.html >> cv.html
	weasyprint cv.html _Bobby_W_McCann_CV.pdf
