# Making a nice photo album without Javascript

This has definitely been done before, but I wanted to work this out by myself rather than looking at prior art. I'm
making a photo album with clickable thumbnails and no javascript - only HTML and CSS.

This is based on the fact that you can link to HTML elements in the page by navigating to `#[id of your element]`. I
decided to use these beautiful Riven wallpapers for my example. You can download them for free from https://store.cyan.com/products/riven-desktop-background-pack

<iframe src="./basic.html" width="100%" height="500px"></iframe>

So, it works, but I want it to scroll so that the element clicked shows up in the middle. Can we do that?

Yes we can! Using scroll-snap, a new-ish addition to CSS. You can enable scroll snap on a scrolling element using
`scroll-snap-type`. Because our flexbox is scrolling in the x direction, `scroll-snap-type: inline mandatory` means that 
whenever we scroll, it will snap to the nearest snappable element. It won't snap to anything if there aren't any, so we
need to put `scroll-snap-align: center` on the img elements so that we can snap to them.

<iframe src="./scroll-snap.html" width="100%" height="500px"></iframe>

It works okay, but we can make it better. Firstly, I want gaps between the photos, and I want the photos to align even
if they're at the start or end.

## To add later

https://www.w3schools.com/cssref/pr_scroll-behavior.php