
/* =========================================
   RotaRS — THE LITERARY ARCHIVE
   NOVEL REGISTRY

   全站小說與章節登記系統

   檔案：novels.js
========================================= */

"use strict";

window.RotaRSNovels = {

  /* =========================================
     OMN
     第一部小說
  ========================================= */

  omn: {

    id: "omn",

    title: "OMN",

    // 小說專屬首頁
    url: "novels/omn/novel-omn.html",

    chapters: [

      {
        id: "omn-teaser",
        number: "TEASER",
        title: "Soft Before the Noise",

        // 小說專屬章節資料夾
        url: "novels/omn/chapters/omn-teaser.html",

        type: "teaser"
      }

      /* =====================================
         未來新增章節範例：

         ,{
           id: "omn-chapter-01",
           number: "CHAPTER I",
           title: "章節標題",
           url: "novels/omn/chapters/omn-chapter-01.html",
           type: "chapter"
         }

      ===================================== */

    ]

  }

  /* =========================================
     未來新增第二部小說

     ,novel02: {

       id: "novel02",

       title: "第二部小說",

       url: "novels/novel02/index.html",

       chapters: []

     }

  ========================================= */

};
