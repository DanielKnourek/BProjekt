DEVICENAME=ttyACM0
DEVICEPATH=/dev/$(DEVICENAME)
USBIP_BUSID=1-3
USBIP_WSL_DISTRO=Arch

.PHONY: tryUnmount
tryUnmount:
	echo "trying to unmount"
	/mnt/c/Program\ Files/usbipd-win/usbipd.exe wsl detach --busid $(USBIP_BUSID)

.PHONY: printSearchResults
printSearchResults:
	@echo "searching for usbipd device"
	@ls -la /dev/ | grep $(DEVICENAME) || echo "no entries"

.PHONY: RULE_ISDIR
RULE_ISDIR:
	$(eval CHECK_ISDIR := $(shell [ -d '$(DEVICEPATH)' ] && echo true || echo false))
	@if [ '$(CHECK_ISDIR)' == true ]; then \
		echo "USB device found as direcotry"; \
	fi

.PHONY: RULE_ISCHAR
RULE_ISCHAR:
	$(eval CHECK_ISCHAR := $(shell [ -c '$(DEVICEPATH)' ] && echo true || echo false))
	@if [ '$(CHECK_ISCHAR)' == true ]; then \
		echo "USB device found as character"; \
		echo "everything looks fine"; \
	fi

.PHONY: RULE_NO_DEVICE
RULE_NO_DEVICE: RULE_ISDIR RULE_ISCHAR
	@if [ '$(CHECK_NO_DEVICE)' == inprogress ]; then \
		echo "cannot be completed"; \
	fi
	$(eval CHECK_NO_DEVICE := $(shell [ $(CHECK_ISDIR) == false ] || [ $(CHECK_ISCHAR) == false ] && echo true || echo false))
	@if [ '$(CHECK_NO_DEVICE)' == true ]; then \
		echo "USB device not found"; \
	fi

.PHONY: check
check: printSearchResults RULE_ISDIR RULE_ISCHAR RULE_NO_DEVICE

.PHONY: fix
fix: check
	@if [ '$(CHECK_NO_DEVICE)' == true ]; then \
		echo "trying to mount predefinded port....."; \
		/mnt/c/Program\ Files/usbipd-win/usbipd.exe wsl attach --busid $(USBIP_BUSID) -d $(USBIP_WSL_DISTRO); \
		CHECK_NO_DEVICE=inprogress $(MAKE) RULE_NO_DEVICE; \
	fi