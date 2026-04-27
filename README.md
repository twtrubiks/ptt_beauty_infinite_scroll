# Ptt_Beauty_Infinite_Scroll

docker + Django 6 + Python 3.13

如要參考 `python3.8` 以及 `django 3.12.4`, 請到 [django3](https://github.com/twtrubiks/ptt_beauty_infinite_scroll/tree/django3) 分支.

結合 Django + 原生 JavaScript（vanilla JS）實現無限卷軸 Infinite Scroll 📝

* [Youtube Tutorial](https://youtu.be/Gy9TjmM6R4Y)
* ~~[線上 Demo 網站](https://ptt-beauty-infinite-scroll.herokuapp.com/)~~（Heroku 已停止免費方案）

建議對 [Django](https://github.com/django/django) 不熟悉的朋友，可以先觀看我之前寫的文章（ 進入 [Django](https://github.com/django/django)  的世界）

* [Django 基本教學 - 從無到有 Django-Beginners-Guide](https://github.com/twtrubiks/django-tutorial)

* [Django-REST-framework 基本教學 - 從無到有 DRF-Beginners-Guide](https://github.com/twtrubiks/django-rest-framework-tutorial)

## 特色

* 改使用原生的 html loading="lazy"
* 響應式 masonry 版面（CSS columns），不再固定卡片高度
* Skeleton 骨架載入：點下載入更多時立刻顯示佔位卡片
* 預載式無限捲軸：使用者離底部 400px 時就先抓下一頁
* 失敗自動重試（指數退避 500ms / 1500ms / 4500ms），仍失敗則顯示「點此重試」按鈕
* 「回到頂部」浮動按鈕、結尾狀態與 `prefers-reduced-motion` 支援
* 純原生 JavaScript（移除 jQuery），僅保留 SweetAlert2 用於確認 dialog
* 圖片來源為爬蟲，可參考 [auto_crawler_ptt_beauty_image](https://github.com/twtrubiks/auto_crawler_ptt_beauty_image) 。

## 安裝套件

確定電腦有安裝 [Python](https://www.python.org/) 之後

請在  cmd  ( 命令提示字元 ) 輸入以下指令

```cmd
pip install -r requirements.txt
```

或是直接用 docker 版本

```cmd
docker compose up -d
```

## 執行畫面

首頁

![](https://cdn.imgpile.com/f/ViTLl4L_xl.png)

滑鼠游標移到圖片上，可刪除圖片

![](https://cdn.imgpile.com/f/VL5zUy8_xl.png)

載入圖片時，左上角會有 Loading 圖示，代表載入資料中

![](https://cdn.imgpile.com/f/KveXXOA_xl.png)

## 說明

接下來要來比較，**一次全部載入** vs. **一次只載入 10 張圖片** 的使用者體驗

一次載入一萬筆圖片 ( lazyload )

一次載入10張圖片 ( lazyload + infinite-scroll )

相信大家可以很明顯的發現 **一次只載入 10 張圖片** 的開啟網頁速度快很多，

這概念和之前介紹的 [DRF-dataTable-Example-server-side](https://github.com/twtrubiks/DRF-dataTable-Example-server-side) 類似，一般來說，

不太需要一次把全部的資料都顯示出來，而且使用者也不太可能需要次看那麼多的資訊，

所以以這個專案 ( 圖片 ) 為例，我們使用 html 原生 loading="lazy"

一次載入 10 張圖片，使用者慢慢看，就很適合，使用體驗也高了不少 :grin:

## 執行環境

* Python 3.13
* Django 6.0.4
* djangorestframework 3.17.1

## Donation

文章都是我自己研究內化後原創，如果有幫助到您，也想鼓勵我的話，歡迎請我喝一杯咖啡 :laughing:

![alt tag](https://i.imgur.com/LRct9xa.png)

[贊助者付款](https://payment.opay.tw/Broadcaster/Donate/9E47FDEF85ABE383A0F5FC6A218606F8)

## License

MIT license
