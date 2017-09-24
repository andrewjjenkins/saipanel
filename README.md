# saipanel
Using BeagleBone Black as a custom Saitek Switch Panel driver

This will turn the BBB into a USB Gadget (device) that you attach to a USB port
on your computer.  The BBB is also a USB Host, connected to inputs like the
Saitek Switch Panel.

```
                        +------------------+
                        |    BeagleBone     |                +------------+
+------+      USB       |                   |                |     PC     |
| PZ55 |--<Dev---Host>--|/dev/hidraw0       |      USB       |            |
+------+                |         /dev/hidg0|--<Dev---Host>--|HID Keyboard|
                        |        192.168.7.2|                |192.168.7.1 |
                        | GettingStarted.img|                |D:          |
                        |            (+more)|                |(+more)     |
                        +-------------------+                +------------+
```

The BeagleBone comes out-of-the-box as a USB gadget with several features like
appearing as a USB network card with a connection to the BeagleBone Black's
internal web server, and appearing as a CD-ROM drive with the manual on it.

This adds functionality to appear as a USB Human Interface Device (HID)
keyboard on the PC as well.  Writing packets to /dev/hidg0 on the BeagleBone
causes the PC to see keystrokes from the keyboard.

Then, `server/` has a node.js program that reads from the switch panel and
writes keystrokes to /dev/hidg0.

# Installing the Kernel
Newish distributions of BeagleBone Black use libcomposite to provide the gadget
functionality.  This is neat because you can customize the functions in the
gadget by just writing to files in /sys/config.  However, I could never get the
USB HID functionality to work at the same time as RNDIS (the windows USB NIC).

Instead I have a custom kernel based on the 4.9.44-ti-r61 kernel in use when I
made this.  This uses the old g_multi module (same purpose as libcomposite, but
the gadget functionality isn't modifiable at runtime via sysfs).

I'd really rather use libcomposite if anyone can figure out how to make it
work.  I think there were some bugs like [this](https://github.com/torvalds/linux/commit/749494b6bdbbaf0899aa1c62a1ad74cd747bce47)
that prevented libcomposite from working properly for HID, so once these
are upstreamed into a BBB kernel, libcomposite might just work.

The kernel changes I needed are in another repository of mine.


# Running

```
git clone; cd saipanel/server; npm install; npm start
```

# Server

The server has a concept of inputs, outputs, and bindings, all inside of
`lib/`.  The inputs are drivers that emit events like "GEAR_TOGGLE" when the
gear lever is toggled.  The outputs are drivers that have methods like
`writeKey(key)`.  The bindings connect one input to one or more outputs:

```
const defaultBindings = [
  {
    'name': 'gear',
    'input': 'hidraw0/GEAR_TOGGLE',
    'output': 'hidg0/writeKey(g)',
  },
];
```

boils down to pseudocode:

```
inputDevices[hidraw0].on('GEAR_TOGGLE', function () {
  outputDevices[hidg0].writeKey('g');
});
```

# Client (monitor)

Doesn't really exist yet.  You can go to "http://192.168.7.2:8081/" and get to
the API where you can poke around and see the counts.  Someday there should be
a web app that uses the server's REST API to show events and modify bindings.

# Specs for the PZ55 switch panel

Captured by ArturDCS from https://forums.eagle.ru/showthread.php?p=2293326

    Byte #1
    00000000
    ||||||||_ SWITCHKEY_MASTER_BAT
    |||||||_ SWITCHKEY_MASTER_ALT
    ||||||_ SWITCHKEY_AVIONICS_MASTER
    |||||_ SWITCHKEY_FUEL_PUMP
    ||||_ SWITCHKEY_DE_ICE
    |||_ SWITCHKEY_PITOT_HEAT
    ||_ SWITCHKEY_CLOSE_COWL ** ~
    |_ SWITCHKEY_LIGHTS_PANEL

    Byte #2
    00000000
    ||||||||_ SWITCHKEY_LIGHTS_BEACON
    |||||||_ SWITCHKEY_LIGHTS_NAV
    ||||||_ SWITCHKEY_LIGHTS_STROBE
    |||||_ SWITCHKEY_LIGHTS_TAXI
    ||||_ SWITCHKEY_LIGHTS_LANDING
    |||_ KNOB_ENGINE_OFF
    ||_ KNOB_ENGINE_RIGHT
    |_ KNOB_ENGINE_LEFT

    Byte #3
    00000000
    ||||||||_ KNOB_ENGINE_BOTH
    |||||||_ KNOB_ENGINE_START
    ||||||_ LEVER_GEAR_UP
    |||||_ LEVER_GEAR_DOWN
    ||||_
    |||_
    ||_
    |_


    LED Byte:
    * 00000000 0x0 ALL DARK
    *
    * 00000001 0x1 UP GREEN
    * 00001000 0x8 UP RED
    * 00001001 0x9 UP YELLOW
    *
    * 00000010 0x2 LEFT GREEN
    * 00010000 0x10 LEFT RED
    * 00010010 0x12 LEFT YELLOW
    *
    * 00100000 0x20 RIGHT RED
    * 00000100 0x4 RIGHT GREEN
    * 00100100 0x24 RIGHT YELLOW

# License

    Copyright (c) 2017 Andrew Jenkins (andrewjjenkins@gmail.com)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
