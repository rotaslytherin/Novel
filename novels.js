
"use strict";

/* =========================================
   RotaRS — THE LITERARY ARCHIVE

   NOVEL REGISTRY
   VERSION 2

   全站小說資料庫
   作品獨立資料夾
   角色資料全站共用
========================================= */


/* =========================================
   基本設定
========================================= */

const ROTARS_MAX_CHAPTERS = 100;


/* =========================================
   章節編號
========================================= */

function rotarsChapterNumber(number) {

  return String(number).padStart(2, "0");

}


/* =========================================
   建立章節資料

   published:
   true  = 已發表
   false = 未發表

   未發表章節不會進入閱讀清單
========================================= */

function rotarsCreateChapters(
  novelId,
  chapterSettings = {}
) {

  const chapters = [];

  for (
    let number = 1;
    number <= ROTARS_MAX_CHAPTERS;
    number++
  ) {

    const chapterId = rotarsChapterNumber(number);

    const settings = chapterSettings[number] || {};

    if (settings.published !== true) {
      continue;
    }

    chapters.push({

      id: `${novelId}-${chapterId}`,

      number: `CHAPTER ${number}`,

      title:
        settings.title ||
        `Chapter ${number}`,

      url:
        `novels/${novelId}/chapters/` +
        `${novelId}-${chapterId}.html`,

      type: "chapter"

    });

  }

  return chapters;

}


/* =========================================
   OMN 章節發表設定

   新章節可在此登記：

   2: {
     title: "第二章英文標題",
     published: true
   }

   未發表的章節不會顯示。
========================================= */

const ROTARS_OMN_CHAPTER_SETTINGS = {

  1: {
    title: "Under the Lights",
    published: true
  }

};


/* =========================================
   小說資料庫
========================================= */

window.RotaRSNovels = {

  /* =====================================
     OMN
  ===================================== */

  omn: {

    id: "omn",

    title: "OMN",

    url: "novels/omn/novel-omn.html",

    chapters: [

      /* =================================
         TEASER
      ================================= */

      {
        id: "omn-teaser",

        number: "TEASER",

        title: "Soft Before the Noise",

        url:
          "novels/omn/chapters/" +
          "omn-teaser.html",

        type: "teaser"
      },


      /* =================================
         正式章節

         Chapter 1 — Chapter 100

         僅加入 published: true
         的章節
      ================================= */

      ...rotarsCreateChapters(
        "omn",
        ROTARS_OMN_CHAPTER_SETTINGS
      )

    ]

  }

};
