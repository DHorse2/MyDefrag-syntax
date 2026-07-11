## FAQ General information - Will MyDefrag reduce the lifespan of my flash/SSD memory disk?

Yes. Flash memory disks (such as USB memory sticks and Solid State Disks (SSD)) have a limited number of erase-write cycles. The MyDefrag defragmentation and optimization will move files to new locations, which involves erasing and writing, so it will reduce the lifespan of your flash memory.

But there is no cause for alarm. Modern flash memory disks have at least 10,000 write cycles, more expensive types use different hardware that is guaranteed for a minimum of 100,000 cycles. All flash memory disks use a technique called wear-leveling. The controller in the memory disk will automatically reassign blocks in the memory so that all the memory is worn down evenly. For a good explanation of how this works see the [![ \* ](img/Bullit.gif)](http://www.corsair.com/_faq/FAQ_flash_drive_wear_leveling.pdf) [**Corsair USB Flash Wear-Leveling and Life Span**](http://www.corsair.com/_faq/FAQ_flash_drive_wear_leveling.pdf) article on the Corsair website. In order to wear out a cheap 10,000 cycle flash memory disk in ten years, you would have to write to EVERY BLOCK in the device about 2.7 times per day, every single day. This does not take into account error correction, which will extend the life even further, and the fact that the 10,000 cycles is a guaranteed minimum, typical flash memory will handle an order of magnitude more write cycles.

The MyDefrag script to defragment and optimize Flash memory is specially designed to move as little data as possible. Fragmented files are defragmented (this takes just a single write cycle), unfragmented files are not touched at all. Gaps are filled by moving all the files together (also just a single write cycle), if there are no gaps then MyDefrag will do nothing.

Nevertheless, my advice is to use some discretion and not defragment/optimize flash memory disks every day, but only incidentally, for example once per month.

### Memory block fragmentation, filesystem fragmentation, and TRIM

There are 2 kinds of fragmentation that concern SSD disks. The first kind of fragmentation is memory block fragmentation. SSD disks are written in pages (generally 4KB in size) but can only be erased in larger groups called blocks (generally 128 pages or 512KB). This causes fragmentation and results in severe performance loss after the disk has been used for a while. Speed can easily drop by 50% or more. The SSD manufacturers have developed a solution called the TRIM instruction, for more information see [![ \* ](img/Bullit.gif)](http://en.wikipedia.org/wiki/TRIM_%28SSD_command%29) [**this Wikipedia article**](http://en.wikipedia.org/wiki/TRIM_%28SSD_command%29). It is a hardware solution that needs support in the operating system, and only applies when files are being deleted. MyDefrag knows nothing about memory block fragmentation because MyDefrag operates at the filesystem level, not the hardware level. However, the MyDefrag script for Flash memory disks will consolidate free space, and this reduces the problems caused by this kind of fragmentation.

The second kind of fragmentation is filesystem fragmentation. Files can be split into parts that are placed anywhere on the disk, just like on harddisks. Many users think that this kind of fragmentation does not matter for SSD disks, because the disks have a very low latency (no harddisk heads that have to move about). But Windows still has to do more work when a file is fragmented, to gather all the fragments. There is significant overhead inside Windows, nothing to do with the hardware, and it is all the more noticeable because SSD is so fast. MyDefrag deals with this kind of fragmentation.

### See also:

[![ \* ](img/Bullit.gif) **Using MyDefrag**](../Manual/Manual-UsingMyDefrag.md)  
[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQGeneralInformation-WillMyDefragReduceTheLifespanOfMyFlashSSDMemoryDisk.html`_
