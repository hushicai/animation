(function(root) {
    var prefix = "_hsc_";
    var count = 0;

    /**
     * 产生一个唯一标识
     *
     * @private
     * @return {string}
     */
    function getUID() {
        count++;
        return prefix + count;
    }

    /**
     * 全局队列暂存池
     *
     * @type {Object}
     */
    var queues = {};

    /**
     * 简易队列
     *
     * @constructor
     */
    function Queue(options) {
        this.uid = getUID();
        queues[this.uid] = [];
    }
    Queue.prototype = {
        constructor: Queue,
        // 入列任务时，判断队列的第一个是任务否正在运行
        // 如果没在运行，弹出队列的第一个任务，运行它
        enqueue: function(fn) {
            var qs = queues[this.uid];

            qs.push(fn);

            if (qs[0] !== 'inprogress') {
                this.dequeue();
            }
        },
        // 出列，取出第一个任务执行
        dequeue: function() {
            var qs = queues[this.uid];
            var fn = qs.shift();

            if (fn === 'inprogress') {
                fn = qs.shift();
            }

            if (fn) {
                qs.unshift('inprogress');
                fn();
            }
        }
    };

    // 缓动函数
    var easing = {
        linear: function(x) {
            return x;
        },
        easeInOut: function(pos) {
            return ((-Math.cos(pos*Math.PI)/2) + 0.5);
        }
    };

    /**
     * 定时器间隔
     *
     * @const
     * @type {number}
     */
    var interval = 16;

    /**
     * 定时器标志
     *
     * @type {number}
     */
    var timerId = null;

    // 动画集合
    var timers = [];

    // 控制器
    var fx = {
        timer: function(timer) {
            timers.push(timer);
            if (timer()) {
                fx.start();
            } else {
                timers.pop();
            }
        },
        start: function() {
            if (!timerId) {
                timerId = setInterval(
                    fx.tick,
                    interval
                );
            }
        },
        stop: function() {
            clearInterval(timerId);
            timerId = null;
        },
        tick: function() {
            var timer;
            for(var i = 0; i < timers.length; i++) {
                timer = timers[i];
                if (!timer() && timers[i] === timer) {
                    timers.splice(i--, 1);
                }
            }
            if (!timers.length) {
                fx.stop();
            }
        },
        now: function() {
            return +new Date();
        }
    };

    /**
    * 复制属性，不覆盖原始对象
    *
    * @return {Object}
    */
    function extend(target, source) {
        target = target || {};
        source = source || {};
        for(var k in source) {
            if (source.hasOwnProperty(k)
                && target[k] === undefined
            ) {
                target[k] = source[k];
            }
        }
        return target;
    }

    // 获取样式值
    function css(elem, prop) {
        prop = prop.replace(/-(\w)/gi, function(match, $1) {
            return $1.toUpperCase();
        });

        var styles = root.getComputedStyle 
            ? root.getComputedStyle(elem)
            : elem.currentStyle;

        var originValue = styles[prop];
        var value = parseInt(originValue, 10);

        return isNaN(value) ? 0 : value;
    }

    /**
     * 单个属性动画类
     *
     * @constructor
     */
    function Tween(element, prop, end, options) {
        this.element = element;
        this.prop = prop;
        this.start = this.now = this.cur();
        this.end = end;
        this.unit = this.constructor.cssNumber[prop] ? '' : 'px';
        this.options = options;
    }
    Tween.prototype = {
        constructor: Tween,
        // 获取当前样式值
        cur: function() {
            return css(this.element, this.prop);
        },
        run: function(percent) {
            var easingFn = easing[this.options.easing];
            if (easingFn) {
                this.pos = easingFn(percent);
            } else {
                this.pos = percent;
            }
            this.now = (this.end - this.start) * this.pos + this.start;
            if (isNaN(this.now)) {
                console && console.log(this.prop, this.now);
                return;
            }
            this.options.onstep.call(this.element,this.prop,  this.now);

            // update style
            this.element.style[this.prop] = this.now + this.unit;
        }
    };

    // 这些属性不自动添加"px"
    Tween.cssNumber = {
        "columnCount": true,
        "fillOpacity": true,
        "fontWeight": true,
        "lineHeight": true,
        "opacity": true,
        "order": true,
        "orphans": true,
        "widows": true,
        "zIndex": true,
        "zoom": true
    };

    /**
     * 动画类
     *
     * @constructor
     */
    function Tx(element, props, options) {
        this.element = element;
        this.options = extend(options, this.constructor.defaults);
        this.startTime = fx.now();

        this.tweens = [];
        for(var k in props) {
            this.tweens.push(
                new Tween(this.element, k, props[k], this.options)
            );
        }
    }

    /**
     * 启动动画
     *
     * @public
     */
    Tx.prototype.start = function(next) {
        var tx = this;

        /**
         * 时钟
         *
         * @inner
         */
        function tick() {
            var tweens = tx.tweens;
            var length = tweens.length;
            var currentTime = fx.now();
            var remaining = Math.max(
                0,
                tx.startTime + tx.options.duration - currentTime
            );
            var temp = remaining / tx.options.duration || 0;
            var percent = 1 - temp;
            for(var i = 0; i < length; i++) {
                tweens[i].run(percent);
            }

            if (percent < 1 && length) {
                return true;
            }

            next && next();

            return false;
        }

        fx.timer(tick);
    }

    /**
     * 释放
     *
     * @public
     */
    Tx.prototype.dispose = function() {
        delete this.element;
    }

    // 动画默认配置
    Tx.defaults = {
        duration: 400,
        easing: 'easeInOut',
        onstep: function() {},
        oncomplete: function() {}
    };

    /**
     * 动画控制类
     *
     * @constructor
     *
     * @param {Object} options 参数配置
     * @param {HTMLElement} options.element
     * @param {Object} options.config
     */
    function Animation(element) {
        this.queue = new Queue();
        this.element = element;
    }
    Animation.prototype = {
        constructor: Animation,
        animate: function(props, options) {
            var animation = this;
            var element = this.element;

            var doAnimation = function() {
                var tx = new Tx(element, props, options);
                var next = function() {
                    tx.dispose();
                    animation.queue.dequeue();
                }

                tx.start(next);
            };

            // 入列
            this.queue.enqueue(doAnimation);

            return this;
        }
    };

    if ( typeof define == 'function' && define.amd ) {                     
        define( Animation );                                                                                        
    }                                                                                                          
    else {                                                                                                     
        root.Animation = Animation;                                                                                      
    } 
})(this)
