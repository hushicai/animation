animation
=========

仿jQuery实现方式的简易动画库：

* 随便整了一个简单的队列
* 随便写了一个获取样式的函数
* ...

看了一遍jQuery源码后即兴之作，莫吐槽！

用法：

```javascript
new Animation(
    document.getElementById('test')
)
.animate({ 
    width: 200,
    height: 300
})
.wait(5000) // 等待5s
.animate({
    fontSize: 30
})
.wait(5000) // 等待5s
.animate({
    opacity: 0.5
});
```
