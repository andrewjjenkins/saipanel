#!/bin/bash
#
# Based on:
#   http://isticktoit.net/?p=1383
#   https://pastebin.com/VtAusEmf
#   http://answers.microsoft.com/en-us/windows/forum/windows_10-networking/
#       windows-10-vs-remote-ndis-ethernet-usbgadget-not/cb30520a-753c-4219-b908-ad3d45590447
#
 
set -e

pushd /sys/kernel/config/usb_gadget > /dev/null

# Create a new gadget
mkdir saipanel
pushd saipanel > /dev/null
 
usb_ver="0x0200" # USB 2.0
dev_class="2"
vid="0x1d50"
pid="0x60c7"
mfg="github.com/andrewjjenkins/saipanel"
prod="SaiPanel"
serial="00001"
attr="0x80" # Bus powered
pwr="500" # mA
cfg1="RNDIS"
cfg2="CDC"


# These should be randomly generated.  On the beaglebone there's a lot of code
# to randomly generate that in my case always falls back to the TODO case and
# just uses the same fixed MAC.  I guess it works - following the same pattern
# here.
dev_mac="7a:66:f9:1a:39:e7"
host_mac="1c:ba:8c:a2:ed:6a"

ms_vendor_code="0xcd" # Microsoft
ms_qw_sign="MSFT100" # also Microsoft (if you couldn't tell)
ms_compat_id="RNDIS" # matches Windows RNDIS Drivers
ms_subcompat_id="5162001" # matches Windows RNDIS 6.0 Driver
 
echo "${usb_ver}" > bcdUSB
echo "${dev_class}" > bDeviceClass
echo "${vid}" > idVendor
echo "${pid}" > idProduct

# Set manufacturer strings for english (0x409)
mkdir -p strings/0x409
pushd strings/0x409 > /dev/null
echo "${mfg}" > manufacturer
echo "${prod}" > product
echo "${serial}" > serialnumber
popd > /dev/null
 
# Create 2 configurations. The first will be RNDIS, which is required by
# Windows to be first. The second will be CDC. Linux and Mac are smart
# enough to ignore RNDIS and load the CDC configuration.
 
# config 1 is for RNDIS
 
mkdir configs/c.1
echo "${attr}" > configs/c.1/bmAttributes
echo "${pwr}" > configs/c.1/MaxPower
mkdir configs/c.1/strings/0x409
echo "${cfg1}" > configs/c.1/strings/0x409/configuration
 
# On Windows 7 and later, the RNDIS 5.1 driver would be used by default,
# but it does not work very well. The RNDIS 6.0 driver works better. In
# order to get this driver to load automatically, we have to use a
# Microsoft-specific extension of USB.
 
echo "1" > os_desc/use
echo "${ms_vendor_code}" > os_desc/b_vendor_code
echo "${ms_qw_sign}" > os_desc/qw_sign

# config 2 is for CDC
 
mkdir configs/c.2
echo "${attr}" > configs/c.2/bmAttributes
echo "${pwr}" > configs/c.2/MaxPower
mkdir configs/c.2/strings/0x409
echo "${cfg2}" > configs/c.2/strings/0x409/configuration
 
# Create the HID device
mkdir -p functions/hid.usb0
pushd functions/hid.usb0 > /dev/null
echo 1 > protocol
echo 1 > subclass
echo 8 > report_length
echo -ne \\x05\\x01\\x09\\x06\\xa1\\x01\\x05\\x07\\x19\\xe0\\x29\\xe7\\x15\\x00\\x25\\x01\\x75\\x01\\x95\\x08\\x81\\x02\\x95\\x01\\x75\\x08\\x81\\x03\\x95\\x05\\x75\\x01\\x05\\x08\\x19\\x01\\x29\\x05\\x91\\x02\\x95\\x01\\x75\\x03\\x91\\x03\\x95\\x06\\x75\\x08\\x15\\x00\\x25\\x65\\x05\\x07\\x19\\x00\\x29\\x65\\x81\\x00\\xc0 > report_desc
popd > /dev/null

# Create the RNDIS function, including the Microsoft-specific bits
mkdir functions/rndis.usb1
echo "${dev_mac}" > functions/rndis.usb1/dev_addr
echo "${host_mac}" > functions/rndis.usb1/host_addr
echo "${ms_compat_id}" > functions/rndis.usb1/os_desc/interface.rndis/compatible_id
echo "${ms_subcompat_id}" > functions/rndis.usb1/os_desc/interface.rndis/sub_compatible_id
 

# Create the CDC ECM function
mkdir functions/ecm.usb0
echo "${dev_mac}" > functions/ecm.usb0/dev_addr
echo "${host_mac}" > functions/ecm.usb0/host_addr


# Link everything up and bind the USB device
 
ln -s configs/c.1          os_desc
 
ln -s functions/rndis.usb1 configs/c.1
#ln -s functions/hid.usb0   configs/c.2
 
ln -s functions/ecm.usb0   configs/c.2
 

# Activate by attaching to a UDC.
# If you get an error "Device or resource busy" here:
#  1) You may already have a gadget device exposed.  You can try
#     "rmmod g_multi" or similar.  This will look to the host like
#     hard-unplugging whatever gadget devices were exposed; if you
#     exposed a USB mass storage device and it was in use, this
#     might be bad.
#  2) You may need to pick a specific UDC to bind to.  This code
#     assumes you want the first OTG port.
ls -t /sys/class/udc | head -n 1 > UDC

# Run BeagleBone's script to start a DHCP server on the NIC interface
sleep 1
/opt/scripts/boot/autoconfigure_usb0.sh

popd > /dev/null
popd > /dev/null
