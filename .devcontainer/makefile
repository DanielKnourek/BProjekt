DEVICEPATH=/dev/ttyACM0
USBIP_BUSID=1-3
USBIP_WSL_DISTRO=Arch

.PHONY: tryUnmount
tryUnmount:
	echo "trying to unmount"
	/mnt/c/Program\ Files/usbipd-win/usbipd.exe wsl detach --busid $(USBIP_BUSID)

.PHONY: printSearchResults
printSearchResults:
	echo "searching for usbipd"
	@ls -la /dev/ | grep ACM || echo "no entries"

.PHONY: check
check: printSearchResults
	@if [ -d '$(DEVICEPATH)' ]; then \
		echo "USB device found as direcotry"; \
		rm -rf $(DEVICEPATH) && echo "USB device removed" \
		|| echo "run as root to fix"; \
	elif [ -c '$(DEVICEPATH)' ]; then \
		echo "USB device found as character"; \
		echo "everything is fine"; \
	else \
		if [ ! '$(RUNFLAG)' == true ]; then \
			echo "USB device not found... trying to mount predefinded port"; \
			/mnt/c/Program\ Files/usbipd-win/usbipd.exe wsl attach --busid $(USBIP_BUSID) -d $(USBIP_WSL_DISTRO); \
			RUNFLAG=true $(MAKE) check; \
		else \
			echo "cannot be completed"; \
		fi \
	fi
