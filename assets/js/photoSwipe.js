const initPhotoSwipeFromDOM = function(gallerySelector) {
    // parse slide data (url, title, size ...) from DOM elements (children of gallerySelector)
    let parseThumbnailElements = function(galleryElement) {
        let figureElements = galleryElement.getElementsByTagName('figure'),
            items = [],
            linkElement,
            captionElements,
            imageElement,
            size,
            sizeAttribute,
            item;

        for(let figureElement of figureElements) {
            linkElement = figureElement.getElementsByTagName('a')[0];
            sizeAttribute = linkElement.getAttribute('data-size');
            if (sizeAttribute === null) {
                console.error('"data-size" attribute has to be set for element %o', linkElement);
                continue;
            }
            size = sizeAttribute.split('x');

            imageElement = linkElement.getElementsByTagName('img')[0];
            item = {
                src: linkElement.getAttribute('href'),
                w: parseInt(size[0], 10),
                h: parseInt(size[1], 10),
                msrc: imageElement.getAttribute('src'),
            };

            captionElements = figureElement.getElementsByTagName('figcaption');
            for (let captionElement of captionElements) {
                // <figcaption> content
                item.title = captionElement.innerHTML;
            }

            // save link to element for getThumbBoundsFn
            item.el = figureElement;
            items.push(item);
        }

        return items;
    };

    // find nearest parent element
    let closest = function(element, fn) {
        return element && (fn(element) ? element : closest(element.parentNode, fn));
    };

    // triggers when user clicks on thumbnail
    let onThumbnailsClick = function(event) {
        event = event || window.event;
        event.preventDefault ? event.preventDefault() : event.returnValue = false;

        let eTarget = event.target || event.srcElement;

        // find root element of slide
        let clickedFigureElement = closest(eTarget, function(element) {
            return (element.tagName && element.tagName.toUpperCase() === 'FIGURE');
        });

        if(!clickedFigureElement) {
            return;
        }

        // find index of clicked item by looping through all child nodes
        // alternatively, you may define index via data- attribute
        let clickedGallery = closest(clickedFigureElement, function (element) {
                return element && element.matches(gallerySelector);
            }),
            figureElements = clickedGallery.getElementsByTagName('figure'),
            nodeIndex = 0,
            index;

        for (let figureElement of figureElements) {
            if(figureElement === clickedFigureElement) {
                index = nodeIndex;
                break;
            }
            nodeIndex++;
        }

        if(index >= 0) {
            // open PhotoSwipe if valid index found
            openPhotoSwipe(index, clickedGallery);
        }
        return false;
    };

    // parse picture index and gallery index from URL (#&pid=1&gid=2)
    let photoswipeParseHash = function() {
        let hash = window.location.hash.substring(1),
            params = {};

        if(hash.length < 5) {
            return params;
        }

        let vars = hash.split('&');
        for (let i = 0; i < vars.length; i++) {
            if(!vars[i]) {
                continue;
            }
            let pair = vars[i].split('=');
            if(pair.length < 2) {
                continue;
            }
            params[pair[0]] = pair[1];
        }

        if(params.gid) {
            params.gid = parseInt(params.gid, 10);
        }

        return params;
    };

    let openPhotoSwipe = function(index, galleryElement, disableAnimation, fromURL) {
        let pswpElement = document.querySelectorAll('.pswp')[0],
            gallery,
            options,
            items;

        items = parseThumbnailElements(galleryElement);

        // define options (if needed)
        options = {
            bgOpacity: 0.9,
            // define gallery index (for URL)
            galleryUID: galleryElement.getAttribute('data-pswp-uid'),

            getThumbBoundsFn: function(index) {
                // See Options -> getThumbBoundsFn section of documentation for more info
                let thumbnail = items[index].el.getElementsByTagName('img')[0], // find thumbnail
                    pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
                    rect = thumbnail.getBoundingClientRect();

                return {x:rect.left, y:rect.top + pageYScroll, w:rect.width};
            }
        };

        // PhotoSwipe opened from URL
        if(fromURL) {
            if(options.galleryPIDs) {
                // parse real index when custom PIDs are used 
                // http://photoswipe.com/documentation/faq.html#custom-pid-in-url
                for(let j = 0; j < items.length; j++) {
                    if(items[j].pid === index) {
                        options.index = j;
                        break;
                    }
                }
            } else {
                // in URL indexes start from 1
                options.index = parseInt(index, 10) - 1;
            }
        } else {
            options.index = parseInt(index, 10);
        }

        // exit if index not found
        if(isNaN(options.index)) {
            return;
        }

        if(disableAnimation) {
            options.showAnimationDuration = 0;
        }

        // Pass data to PhotoSwipe and initialize it
        gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
        gallery.init();
    };

    // loop through all gallery elements and bind events
    let galleryElements = document.querySelectorAll(gallerySelector);

    let galleryCount = 0;
    for(let galleryElement of galleryElements) {
        galleryElement.setAttribute('data-pswp-uid', ++galleryCount);
        let figureElements = galleryElement.getElementsByTagName('figure');
        for (let figureElement of figureElements) {
            figureElement.onclick = onThumbnailsClick;
        }
    }

    // Parse URL and open gallery if it contains #&pid=3&gid=1
    let hashData = photoswipeParseHash();
    if(hashData.pid && hashData.gid) {
        openPhotoSwipe(hashData.pid, galleryElements[hashData.gid - 1], true, true);
    }
};
