filename=main

pdf: 
	latexmk ${filename}
	latexmk ${filename}

text: html
	html2text -width 100 -style pretty ${filename}/${filename}.html | sed -n '/./,$$p' | head -n-2 >${filename}.txt

html:
	@#latex2html -split +0 -info "" -no_navigation ${filename}
	htlatex ${filename}

view:
	while inotifywait --event modify,move_self,close_write ${filename}.tex; \
		do latexmk -halt-on-error ${filename} &&   latexmk -halt-on-error \
		${filename}; done

clean:
	rm -f aux/${filename}.{ps,pdf,log,aux,out,dvi,bbl,blg,snm,toc,nav,fdb*,fls,ind,idx,bcf,ilg}

.PHONY: build
build: 
	docker run --rm --workdir='/data' -v $(shell pwd):/data texlive-tul make

.PHONY: buildcontainer
buildcontainer:
	docker build -t texlive-tul -f texlive.dockerfile ../.devcontainer

open:
	docker run --rm -it -v $(shell pwd):/data texlive-tul /bin/bash