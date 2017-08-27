# saipanel
Using BeagleBone Black as a custom Saitek Switch Panel driver


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
The kernel module in kernel/ is GPLv2.


    Saipanel kernel module (in kernel/)
    Portions copyright (C) 2017 Andrew Jenkins (andrewjjenkins@gmail.com)
    Mostly copyright original linux usb gadget authors, see files.

    This program is free software; you can redistribute it and/or
    modify it under the terms of the GNU General Public License
    as published by the Free Software Foundation; either version 2
    of the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.


Everything else (node app) is MIT.

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
