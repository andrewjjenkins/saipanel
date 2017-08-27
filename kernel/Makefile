obj-m += g_multi.o

all:
	make -C /lib/modules/$(shell uname -r)/build M=$(PWD) modules

clean:
	make -C /lib/modules/$(shell uname -r)/build M=$(PWD) clean

install: all
	sudo cp g_multi.ko /lib/modules/$(shell uname -r)/kernel/drivers/usb/gadget/legacy/g_multi.ko
	sudo depmod -ae

.PHONY: all clean
