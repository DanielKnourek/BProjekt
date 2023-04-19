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
	$(eval CHECK_ISDIR_PREV := $(CHECK_ISDIR))
	$(eval CHECK_ISDIR := $(shell [ -d '$(DEVICEPATH)' ] && echo true || echo false))
	@if [ '$(CHECK_ISDIR)' == true ]; then \
		echo "USB device found as directory"; \
		if [ '$(CHECK_ISDIR_PREV)' == inprogress ]; then \
			echo "[RULE_ISDIR] cannot be completed"; \
			exit 1; \
		fi; \
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
		echo "[RULE_NO_DEVICE] cannot be completed "; \
		exit 1; \
	else \
		$(eval CHECK_NO_DEVICE := $(shell ( [ $(CHECK_ISDIR) == false ] || [ $(CHECK_ISDIR) == inprogress ] ) && [ $(CHECK_ISCHAR) == false ] && echo true || echo false)) \
		echo "USB device not found"; \
	fi

.PHONY: check
check: printSearchResults RULE_ISDIR RULE_ISCHAR RULE_NO_DEVICE

.PHONY: fix
fix: check
	@if [ '$(CHECK_ISDIR)' == true ]; then \
		echo "trying to remove bad mount"; \
		rm -rf $(DEVICEPATH) && echo "USB device removed" \
			|| echo "trying to remove as root" && sudo rm -rf $(DEVICEPATH) && echo "USB device removed as ROOT" \
			|| echo "###### run as root to fix ######"; \
		CHECK_ISDIR=inprogress $(MAKE) fix; \
	fi
	@if [ '$(CHECK_NO_DEVICE)' == true ]; then \
		echo "trying to mount predefinded port....."; \
		/mnt/c/Program\ Files/usbipd-win/usbipd.exe wsl attach --busid $(USBIP_BUSID) -d $(USBIP_WSL_DISTRO); \
		CHECK_NO_DEVICE=inprogress $(MAKE) RULE_NO_DEVICE; \
	fi