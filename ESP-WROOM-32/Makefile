#
# This is a project Makefile. It is assumed the directory this Makefile resides in is a
# project subdirectory.
#

PROJECT_NAME := tests

EXTRA_COMPONENT_DIRS = $(IDF_PATH)/examples/common_components/protocol_examples_common

include $(IDF_PATH)/make/project.mk

.PHONY httpTestecho
httpTestecho:
	echo "Hello friendo, what are the odds ?" > foo.log
	echo "milions to one!" >> foo.log
	curl -X POST --data-binary @foo.log 192.168.137.162:1234/echo > foores.log

.PHONY httpTestAdder
httpTestAdder:
	curl -X POST --keepalive-time 60 -d '${RANDOM}' 192.168.137.162:1234/adder
	curl -X POST -H "Keep-Alive: 60" -H "Connection: keep-alive" -d '11' 192.168.137.162:1234/adder

