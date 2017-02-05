# PageAccel Chrome Extension

Enable accelerated, streamlined, easy-to-use, faster loading web content on web pages that offer it.

PageAccel automatically detects when pages have alternative, streamlined content available, and switches to use that content automatically. These pages are designed to load quickly and offer a simplified user experience. As a side benefit, for alternative streamlined pages, PageAccel saves bandwidth.

For users who prefer to use the standard (non-accelerated version) of pages on a given website, switching to the standard form is as easy as clicking the PageAccel (lightning) button in the url bar to switch back to the standard pages for that website. Just as easily, users can switch back at any time.

PageAccel is a free, community-driven open source project.

## How does this work?

Some websites provide alternative, streamlined versions of their pages called AMP (accelerated mobile pages). These pages are created to load faster and provide simplified content for both desktop and mobile users alike. When PageAccel detects that a page has an AMP version, it switches to use it.

PageAccel does *not* create any of its content, nor does it alter pages by itself. Any page content that you see when using PageAccel is generated by the page author itself.

## Installation

Open the [PageAccel Chrome Web store link](https://chrome.google.com/webstore/detail/pageaccel/homgapmnacbmbflidhpenianmeidfcjp?hl=en-US) and follow the prompts.

## TODO

* Add "Send Feedback / Broken Page" item to menu to allow direct feedback, positive and negative. Include page currently on and message with feedback. Send this to amplifierteam20@gmail.com.
* Prompt user for feedback (rating, free text, or both) after having visted several simplified pages. Indicated to them which ones were simplified.
* Register simplified and standard domains as pairs, in case they're different.
 * This may also alleviate the need for the tld domain list
* Remove unused tabs from storage if not used in last x days
* After either(days active > 2, pages viewed 500), tell user how many pages have been accelerated and show them which ones. If the percentage is high, show them the % of pages, else, just tell them how many pages. Tell them how many seconds / bytes they've saved by using pageaccel.
 * Do this at some regular intervals
* Provide stats button in pageaccel so user can see stats anytime.
