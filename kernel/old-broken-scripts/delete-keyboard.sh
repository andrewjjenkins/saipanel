#!/bin/bash

ifconfig usb0 down
ifconfig usb1 down

pushd /sys/kernel/config/usb_gadget > /dev/null

pushd saipanel > /dev/null
echo "" > UDC
rm os_desc/c.*
rm configs/c.1/*.usb?
rm configs/c.2/*.usb?
rmdir configs/c.1/strings/0x409
rmdir configs/c.1
rmdir configs/c.2/strings/0x409
rmdir configs/c.2
rmdir functions/*.usb?
rmdir strings/0x409
popd > /dev/null

rmdir saipanel
popd > /dev/null
