#! /bin/bash

zcat "$1" | xmllint  --format - > $(basename "$1" | sed "s/\.[^.]*$/.clean.xml/")
