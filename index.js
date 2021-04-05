(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? (module.exports = factory())
    : typeof define === "function" && define.amd
    ? define(factory)
    : ((global = global || self), (global.VideoCover = factory()));
})(this, function () {
  class VideoCover {
    /**
     * @param { Object } config 配置信息
     * url String 视频链接
     * currentTime Number 截图时间 默认为1，如果为0可能是黑屏
     * quality Number 图片质量  0.2-0.95  如果为1，会增大base64大小
     * imgWidth Number 生成图片宽度  高度会按照视频宽高比计算
     * imageType String 图片类型  image/png类似这种格式
     * isCheckImageColor Boolean 是否校验图片是纯色，默认为false，如果开启，图片是纯色，会自动获取下一秒视频图片
     */
    constructor(config = {}) {
      const {
        url,
        currentTime = 1,
        quality,
        imgWidth,
        imageType,
        isCheckImageColor,
      } = config;

      if (!url) {
        console.warn('视频链接不能为空')
      }

      this.url = url;
      this.video = null;
      this.videoWidth = 0;
      this.imageType = imageType || 'image/jpeg';
      this.quality = quality ? (quality > 0.2 ? quality : 0.2) : 0.95; // 不要用1，会额外增大base64大小。
      this.imgWidth = imgWidth || 800;
      this.currentTime = currentTime < 1 ? 1 : currentTime; // 默认设置1S
      this.isCheckImageColor = isCheckImageColor;
      this.duration = 0; // 视频时长
    }

    /**
     * 生成视频
     * @param { Function } callback 回调函数
     */
    getVideoCover(callback) {
      const self = this;

      const video = this.video || document.createElement("video");
      const currentTime = self.currentTime;
      video.src = self.url;
      video.style.cssText = `position: fixed; top: -100%; width: 400px; visibility: hidden;`;
      video.controls = "controls";
      // 此处是设置跨域，防止污染canvas画布
      video.crossOrigin = "Anonymous";

      // 设置视频播放进度
      video.currentTime = currentTime;

      // 监听播放进度改变，获取对应帧的截图
      video.addEventListener("timeupdate", () => {
        self.setVideoInfo();

        if (self.currentTime <= self.duration) {
          self.generateCanvas(callback);
        } else {
          self.nextTime()
        }
      });

      this.video = video;

      document.body.appendChild(video);
    }

    // 设置video信息
    setVideoInfo() {
      const video = this.video;

      this.videoWidth = video.videoWidth;
      this.videoHeight = video.videoHeight;
      this.duration = Math.floor(video.duration || 0);
    }

    /**
     * 跳转到具体的时间位置
     * @param { Number } time 时间位置
     */
    jumpTime(time) {
      const duration = this.duration;
      time = time > duration ? duration : time;

      this.currentTime = time;

      this.video.currentTime = time;
    }

    // 获取下一秒的截图
    nextTime() {
      const duration = this.duration;
      let currentTime = this.currentTime;

      if (this.currentTime === duration) {
        return;
      }

      currentTime++

      this.jumpTime(currentTime)      
    }

    /**
     * 生成canvas，并到处图片信息
     * @param { Function } callback 回调函数
     * @returns 
     */
    generateCanvas(callback) {
      const self = this;
      const canvas = this.canvas || document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: false });
      const imgWidth = this.imgWidth;
      const isCheckImageColor = this.isCheckImageColor;
      let videoWidth = this.videoWidth;
      let videoHeight = this.videoHeight;

      if (!this.canvas) {
        if (imgWidth) {
          videoHeight = imgWidth / (videoWidth / videoHeight);
          videoWidth = imgWidth;
        }

        canvas.width = videoWidth;
        canvas.height = videoHeight;
      }

      ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);

      // 如果开启图片校验模式
      if (isCheckImageColor) {
        const checkImageResult = this.checkImage(ctx, videoWidth, videoHeight);

        if (!checkImageResult) {
          this.nextTime();

          return;
        }
      }

      const img = canvas.toDataURL(this.imageType, self.quality);

      callback && callback(img);
    }

    /**
     * 检查图片是否是纯色图
     * @param { Object } ctx canvas执行环境
     * @param { Number } width canvas宽度
     * @param { Number } height canvas高度
     */
    checkImage(ctx, width, height) {
      const imgData = ctx.getImageData(0, 0, width, height);
      const imgDataContent = imgData.data;
      const rgbObj = {};
      let differentLen = 0;

      /**
       * canvas通过imgDataContent获取到的值是一个Uint8ClampedArray的类型化数组
       * 每一个值存储的是0-255的整型
       * 每4个为一组，分别代表 R G B A
       *
       * 整体的思路为遍历整个数组，如果发现颜色值的种类超过配置的数量，即为有图像的图，否则为纯色图
       */

      for (let i = 0, len = imgDataContent.length; i < len; i += 4) {
        const key = imgDataContent.slice(i, i + 4).join("");

        if (!rgbObj[key]) {
          rgbObj[key] = 1;
          differentLen++;
        }

        // 判断如果颜色超出100种，不是纯图
        if (differentLen > 100) {
          return true;
        }
      }

      return false;
    }

    /**
     * 将base64转换成 Blob
     * @param { String } code base64字符串
     * @returns { Blob } 返回Blob对象
     */
    static base64ToBlob(code) {
      if (!code) {
        console.warn("base64不能为空");
        return;
      }

      let parts = code.split(";base64,");
      // 获取图片类型
      let contentType = parts[0].split(":")[1];

      /**
       * 解码base64
       * Window atob() 方法
       * encodedStr: 必需，是一个通过 btoa() 方法编码的字符串。
       * 该方法返回一个解码的字符串。
       */
      let raw = window.atob(parts[1]);
      let rawLength = raw.length;

      // Uint8Array 数组类型表示一个8位无符号整型数组，创建时内容被初始化为0。
      // 创建完后，可以以对象的方式或使用数组下标索引的方式引用数组中的元素。
      /**
       * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array
       */
      let uInt8Array = new Uint8Array(rawLength);

      // 将字符转换成unicode值
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }

      /**
       * Blob() 构造函数返回一个新的 Blob 对象。 blob的内容由参数数组中给出的值的串联组成。
       * https://developer.mozilla.org/zh-CN/docs/Web/API/Blob/Blob
       * 参数
       * @param { ArrayBuffer, ArrayBufferView, Blob, DOMString } array
       * array 是一个由ArrayBuffer, ArrayBufferView, Blob, DOMString 等对象构成的 Array ，
       *
       * ArrayBufferView: 类型化数组
       * 对象描述了一个底层的二进制数据缓冲区（binary data buffer）的一个类数组视图（view）。
       *
       * 或者其他类似对象的混合体，它将会被放进 Blob。DOMStrings会被编码为UTF-8。
       *
       * @param { Object } 配置参数
       * type，默认值为 ""，它代表了将会被放入到blob中的数组内容的MIME类型。
       * endings，默认值为"transparent"，用于指定包含行结束符\n的字符串如何被写入。
       * 它是以下两个值中的一个： "native"，
       * 代表行结束符会被更改为适合宿主操作系统文件系统的换行符，
       * 或者 "transparent"，代表会保持blob中保存的结束符不变
       */
      return new Blob([uInt8Array], {
        type: contentType,
      });
    }

    /**
     * 下载文件
     * @param {String} code base64字符串
     */
    static downloadFile(code) {
      const fileName = Date.now();

      if (!code) {
        console.warn("base64不能为空");
        return;
      }

      let aLink = document.createElement("a");
      let blob = this.base64ToBlob(code); //new Blob([content]);
      let evt = document.createEvent("HTMLEvents");
      evt.initEvent("click", true, true); //initEvent 不加后两个参数在FF下会报错  事件类型，是否冒泡，是否阻止浏览器的默认行为
      aLink.download = fileName;
      aLink.href = URL.createObjectURL(blob);
      aLink.click();
    }
  }

  return VideoCover;
});
