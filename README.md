# Ptt_Beauty_Infinite_Scroll

結合 Django +  jQuery 實現無限卷軸 Infinite Scroll 📝

* [Youtube Tutorial](https://youtu.be/Gy9TjmM6R4Y)
* [線上 Demo 網站](https://ptt-beauty-infinite-scroll.herokuapp.com/)

本專案是透過 [Deploying_Django_To_Heroku_Tutorial](https://github.com/twtrubiks/Deploying_Django_To_Heroku_Tutorial) 修改完成，

詳細的佈署  heroku 方式以及細節在這篇就不再說明  :smile:

這次主要是加上 無限卷軸 Infinite Scroll 以及後端的一些小修改。

建議對 [Django](https://github.com/django/django) 不熟悉的朋友，可以先觀看我之前寫的文章（ 進入 [Django](https://github.com/django/django)  的世界）

* [Django 基本教學 - 從無到有 Django-Beginners-Guide](https://github.com/twtrubiks/django-tutorial)

* [Django-REST-framework 基本教學 - 從無到有 DRF-Beginners-Guide](https://github.com/twtrubiks/django-rest-framework-tutorial)

## 特色

* 使用 [lazyload](https://github.com/verlok/lazyload) 載入大量圖片。

* 圖片來源為爬蟲，可參考 [auto_crawler_ptt_beauty_image](https://github.com/twtrubiks/auto_crawler_ptt_beauty_image) 。

## 安裝套件

確定電腦有安裝 [Python](https://www.python.org/) 之後

請在  cmd  ( 命令提示字元 ) 輸入以下指令

```cmd
pip install -r requirements.txt
```

## 執行畫面

首頁

![](http://i.imgur.com/Ul9qrkN.png)

滑鼠游標移到圖片上，可刪除圖片

![](http://i.imgur.com/nSuslHP.png)

載入圖片時，左上角會有 Loading 圖示，代表載入資料中

![](https://i.imgur.com/zLVNTrm.png)

## 說明

接下來要來比較，**一次全部載入** vs. **一次只載入 10 張圖片** 的使用者體驗

一次載入一萬筆圖片 ( lazyload )  -> [ptt-beauty-images](https://ptt-beauty-images.herokuapp.com/)

一次載入10張圖片 ( lazyload + infinite-scroll )  -> [ptt-beauty-infinite-scroll](https://ptt-beauty-infinite-scroll.herokuapp.com/)

相信大家可以很明顯的發現 **一次只載入 10 張圖片** 的開啟網頁速度快很多，

這概念和之前介紹的 [DRF-dataTable-Example-server-side](https://github.com/twtrubiks/DRF-dataTable-Example-server-side) 類似，一般來說，

不太需要一次把全部的資料都顯示出來，而且使用者也不太可能需要次看那

麼多的資訊，所以以這個專案 ( 圖片 ) 為例，我們使用 infinite-scroll
一次載

入 10 張圖片，使用者慢慢看，就很適合，使用體驗也高了不少 :grin:

## 執行環境

* Python 3.6.2

## Donation

文章都是我自己研究內化後原創，如果有幫助到您，也想鼓勵我的話，歡迎請我喝一杯咖啡:laughing:

![alt tag](https://i.imgur.com/LRct9xa.png)

[贊助者付款](https://payment.opay.tw/Broadcaster/Donate/9E47FDEF85ABE383A0F5FC6A218606F8)

## License

MIT license
