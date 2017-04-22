/**
 * Slim scroller to support fullpage and multiscroll
 *
 * @constructor
 */

(function () {
    "use strict";

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root = freeGlobal || freeSelf || Function('return this')();

    function Scroller(container) {
        this.container = container || document;
        this.scrolling = false;
        this.currentContainer = null;
        this.currentIndex = - 1;
        this.currentCount = - 1;
    }

    Scroller.prototype.scrollCurrent = function (dir) {
        if (this.currentContainer) {
            this.scroll(this.currentContainer, dir);
        }
    };

    Scroller.prototype.scroll = function (container, dir) {
        if (this.scrolling) {
            return;
        }

        this.currentCount = parseInt(container.scrollCount);
        this.currentIndex = parseInt(container.scrollIndex || 0);
        var options = container.scrollOptions;

        this.currentContainer = container;

        if ('function' == typeof options.beforeTrigger) {
            if (false === options.beforeTrigger.call(this, this.currentIndex, dir)) {
                return;
            }
        }

        if (0 < this.currentIndex || this.currentIndex < this.currentCount) {
            var edge = container.scrollEdge || 'left';
            var frameContainer = container.children;

            if ('forward' == dir) {
                if (this.currentIndex >= this.currentCount) {
                    return;
                }

                this.currentIndex ++;
            } else {
                if (1 > this.currentIndex) {
                    return;
                }

                this.currentIndex --;
            }

            this.scrolling = true;

            if ('function' == typeof options.beforeScroll) {
                if (false === options.beforeScroll.call(this, this.currentIndex, dir)) {
                    return;
                }
            }

            setTimeout(function () {
                this.scrolling = false;

                if ('function' == typeof options.afterScroll) {
                    options.afterScroll.call(this, this.currentIndex, dir);
                }
            }.bind(this), 500);

            for (var i = 0; i < frameContainer.length; ++ i) {
                if ('function' == typeof options.beforeScrollContainer) {
                    options.beforeScrollContainer.call(this, frameContainer[i], this.currentIndex, dir);
                }

                frameContainer[i].style[edge] = - ((frameContainer[i].hasAttribute('inverse') ? this.currentCount - this.currentIndex : this.currentIndex) * 100) + '%';

                if ('function' == typeof options.afterScrollContainer) {
                    options.afterScrollContainer.call(this, frameContainer[i], this.currentIndex, dir);
                }
            }

            container.scrollIndex = this.currentIndex;
        }

        if ('function' == typeof options.afterTrigger) {
            options.afterTrigger.call(this, index, dir);
        }

    };

    Scroller.prototype.init = function (customOptions, callback) {

        var options = {
            beforeTrigger: null,
            afterTrigger: null,
            beforeScroll: null,
            afterScroll: null,
            beforeScrollContainer: null,
            afterScrollContainer: null,
            wheelListener: function (container) {
                // support for mouse wheel
                var _debounce = debounce(function (event, frame) {
                    if (! this.scrolling) {
                        this.scroll(container, event.deltaY > 0 ? 'forward' : 'backward', frame);
                    }
                }.bind(this), 100);

                container.addEventListener('wheel', function (event) {

                    var scrollable = true;
                    if (this.scrolling) {
                        scrollable = false;
                    } else {

                        if (event.deltaY < 0) {
                            if (! this.isFirstFrame()) {
                                scrollable = false;
                            }
                        } else {
                            if (! this.isLastFrame()) {
                                scrollable = false;
                            }
                        }
                    }

                    if (! scrollable) {
                        event.stopPropagation();
                        event.preventDefault();
                    }

                    var frame = this.getCurrentFrame(event.target);

                    if (frame) {
                        _debounce(event, frame);
                    }
                }.bind(this), {passive: false});
            },
            swipeListener: function (container) {
                // use our swiper helper if available
                if (typeof nuSwiper == 'function') {

                    var swiper = new nuSwiper();

                    swiper.on(container);

                    container.addEventListener('swipedown', function (event) {
                        this.scroll(container, 'forward');
                    }.bind(this));

                    container.addEventListener('swipeup', function (event) {
                        this.scroll(container, 'backward');
                    }.bind(this));
                }
            }
        };

        if ('object' == typeof customOptions) {
            for (var attrname in customOptions) {
                if (options.hasOwnProperty(attrname)) {
                    options[attrname] = customOptions[attrname];
                }
            }
        }

        var scrollContainers = this.container.querySelectorAll('.scroll-container');

        for (var i = 0; i < scrollContainers.length; ++ i) {
            scrollContainers[i].scrollCount = scrollContainers[i].children.item(0).children.length - 1;
            scrollContainers[i].scrollEdge = 'horizontal' === scrollContainers[i].getAttribute('direction') ? 'left' : 'top';
            scrollContainers[i].scrollOptions = options;

            [].forEach.call(scrollContainers[i].children, function (frameContainer) {
                var index = 0;
                [].forEach.call(frameContainer.children, function (child) {
                    var className = 'frame-' + index ++;
                    if (child.classList) {
                        child.classList.add(className);
                    } else {
                        child.className += " " + className;
                    }
                });
            });

            if ('function' == typeof options.wheelListener) {
                options.wheelListener.call(this, scrollContainers[i]);
            }

            if ('function' == typeof options.swipeListener) {
                options.swipeListener.call(this, scrollContainers[i]);
            }

            if ('function' == typeof callback) {
                callback.call(this, scrollContainers[i]);
            }
        }

    };

    Scroller.prototype.getCurrentFrame = function (target) {
        var parent = target;

        do {
            parent = parent.parentElement;
        } while (parent && ! parent.classList.contains('frame-container'));

        return parent;
    };

    Scroller.prototype.isFirstFrame = function () {
        return 0 == this.currentIndex;
    };

    Scroller.prototype.isLastFrame = function () {
        return this.currentCount == this.currentIndex;
    };

    Scroller.prototype.getContainerFrames = function (container, index) {
        return container.getElementsByClassName("frame-" + index);
    };

    function debounce (func, wait, immediate, scope) {
        var timeout;

        return function () {
            var context = scope || this, args = arguments;
            var later = function () {
                timeout = null;
                if (! immediate) func.apply(context, args);
            };

            var callNow = immediate && ! timeout;

            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) {
                func.apply(context, args);
            }
        };
    }

    // expose to root
    root.nuScroller = Scroller;
}());
