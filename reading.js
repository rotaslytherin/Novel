
/* =========================================
   RotaRS — THE LITERARY ARCHIVE
   READING SYSTEM

   檔案：reading.js

   功能：
   01 自動閱讀進度
   02 多小說獨立紀錄
   03 段落書籤
   04 最近閱讀
   05 恢復閱讀位置
   06 已完成章節
   07 章節閱讀狀態
   08 作品閱讀進度
   09 重新閱讀
   10 本機資料版本管理
========================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "rotars-reading-v1";
  const VERSION = 1;

  const novels = window.RotaRSNovels || {};

  const body = document.body;

  const novelId = body.dataset.novelId || "";
  const chapterId = body.dataset.chapterId || "";

  const novel = novels[novelId] || null;

  const chapter = novel
    ? novel.chapters.find(
        item => item.id === chapterId
      )
    : null;

  const novelBody = document.querySelector(
    ".novel-body"
  );

  const paragraphs = novelBody
    ? Array.from(
        novelBody.querySelectorAll("p")
      )
    : [];

  let storageAvailable = true;
  let restoring = false;
  let readingStarted = false;
  let lastInteraction = 0;
  let saveTimer = null;
  let latestPosition = null;

  /* =========================================
     資料結構
  ========================================= */

  function emptyData() {
    return {
      version: VERSION,
      lastReadNovel: null,
      novels: {}
    };
  }

  function readData() {
    try {
      const raw = localStorage.getItem(
        STORAGE_KEY
      );

      if (!raw) return emptyData();

      const parsed = JSON.parse(raw);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        parsed.version !== VERSION ||
        !parsed.novels ||
        typeof parsed.novels !== "object"
      ) {
        return emptyData();
      }

      return parsed;

    } catch (error) {
      storageAvailable = false;
      return emptyData();
    }
  }

  function writeData(data) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );

      storageAvailable = true;
      return true;

    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function getNovelData(data, id) {
    if (!data.novels[id]) {
      data.novels[id] = {
        progress: null,
        completedChapters: [],
        bookmarks: []
      };
    }

    const record = data.novels[id];

    if (!Array.isArray(record.completedChapters)) {
      record.completedChapters = [];
    }

    if (!Array.isArray(record.bookmarks)) {
      record.bookmarks = [];
    }

    return record;
  }

  function getChapter(id, targetChapterId) {
    const item = novels[id];

    if (!item) return null;

    return item.chapters.find(
      entry => entry.id === targetChapterId
    ) || null;
  }

  /* =========================================
     安全網址

     僅允許本站相對 HTML 路徑
  ========================================= */

  function safeUrl(url) {
    if (
      typeof url !== "string" ||
      !/^[a-z0-9][a-z0-9/_-]*\.html$/i.test(url)
    ) {
      return null;
    }

    return url;
  }

  /* =========================================
     段落識別碼

     未指定 ID 時自動產生。
     未來修改正文時，建議保留原 ID。
  ========================================= */

  function prepareParagraphs() {
    paragraphs.forEach((paragraph, index) => {
      if (!paragraph.id) {
        paragraph.id =
          "p-" + String(index + 1).padStart(4, "0");
      }

      paragraph.dataset.readingParagraph = "true";
    });
  }

  /* =========================================
     取得目前閱讀位置
  ========================================= */

  function findCurrentPosition() {
    if (!paragraphs.length) return null;

    const headerOffset =
      window.innerWidth <= 700 ? 105 : 135;

    const referenceY =
      Math.min(
        window.innerHeight * 0.38,
        260
      ) + headerOffset;

    let selected = paragraphs[0];

    for (const paragraph of paragraphs) {
      const rect =
        paragraph.getBoundingClientRect();

      if (rect.top <= referenceY) {
        selected = paragraph;
      } else {
        break;
      }
    }

    const rect =
      selected.getBoundingClientRect();

    const height = Math.max(rect.height, 1);

    const fraction = Math.max(
      0,
      Math.min(
        1,
        (referenceY - rect.top) / height
      )
    );

    return {
      paragraphId: selected.id,
      fraction: Number(fraction.toFixed(3))
    };
  }

  /* =========================================
     保存閱讀進度
  ========================================= */

  function saveProgress() {
    if (
      !novel ||
      !chapter ||
      !readingStarted ||
      restoring ||
      !storageAvailable
    ) {
      return;
    }

    const position =
      latestPosition || findCurrentPosition();

    if (!position) return;

    const data = readData();

    const record =
      getNovelData(data, novelId);

    record.progress = {
      chapterId,
      paragraphId: position.paragraphId,
      fraction: position.fraction,
      updatedAt: new Date().toISOString()
    };

    data.lastReadNovel = novelId;

    writeData(data);
  }

  function scheduleSave() {
    if (
      !novelBody ||
      restoring ||
      !readingStarted
    ) {
      return;
    }

    latestPosition = findCurrentPosition();

    clearTimeout(saveTimer);

    saveTimer = setTimeout(
      saveProgress,
      800
    );
  }

  /* =========================================
     閱讀行為判斷

     單純開啟網頁不覆蓋原紀錄。
  ========================================= */

  function noteInteraction() {
    if (!novelBody || restoring) return;

    const rect =
      novelBody.getBoundingClientRect();

    const visible =
      rect.bottom > 100 &&
      rect.top < window.innerHeight - 60;

    if (!visible) return;

    readingStarted = true;
    lastInteraction = Date.now();

    scheduleSave();
  }

  function onScroll() {
    if (restoring || !novelBody) return;

    if (!readingStarted) {
      return;
    }

    if (Date.now() - lastInteraction > 30000) {
      readingStarted = false;
      return;
    }

    scheduleSave();
  }

  /* =========================================
     返回指定段落
  ========================================= */

  function restorePosition(position) {
    if (!position || !position.paragraphId) {
      return;
    }

    const target = paragraphs.find(
      paragraph =>
        paragraph.id === position.paragraphId
    );

    if (!target) return;

    restoring = true;

    const fraction = Math.max(
      0,
      Math.min(
        1,
        Number(position.fraction) || 0
      )
    );

    const headerOffset =
      window.innerWidth <= 700 ? 105 : 135;

    const referenceY =
      Math.min(
        window.innerHeight * 0.38,
        260
      ) + headerOffset;

    function jump() {
      const rect =
        target.getBoundingClientRect();

      const targetY =
        window.scrollY +
        rect.top +
        rect.height * fraction -
        referenceY;

      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: "instant"
      });
    }

    requestAnimationFrame(() => {
      jump();

      setTimeout(() => {
        jump();
        restoring = false;
      }, 350);
    });
  }

  /* =========================================
     Continue Reading

     從小說登記表取得合法章節網址
  ========================================= */

  function getResumeTarget(targetNovelId) {
    const data = readData();

    const id =
      targetNovelId || data.lastReadNovel;

    if (!id || !novels[id]) {
      return null;
    }

    const record = data.novels[id];

    if (!record || !record.progress) {
      return null;
    }

    const progress = record.progress;

    const targetChapter =
      getChapter(id, progress.chapterId);

    if (!targetChapter) {
      return null;
    }

    const url = safeUrl(targetChapter.url);

    if (!url) return null;

    return {
      novelId: id,
      chapterId: progress.chapterId,
      chapter: targetChapter,
      novel: novels[id],
      progress,
      url
    };
  }

  function resumeReading(targetNovelId) {
    const target =
      getResumeTarget(targetNovelId);

    if (!target) return false;

    const url = new URL(
      target.url,
      window.location.href
    );

    url.searchParams.set(
      "rotars-resume",
      "1"
    );

    window.location.assign(url.href);

    return true;
  }

  /* =========================================
     導覽列

     將停用的 CONTINUE READING
     轉成真正可用的連結
  ========================================= */

  function setupContinueReading() {
    const navigation =
      document.querySelector(".sidebar-nav");

    if (!navigation) return;

    const item = Array.from(
      navigation.children
    ).find(element =>
      element.textContent.trim() ===
      "CONTINUE READING"
    );

    if (!item) return;

    const target = getResumeTarget();

    if (!target) return;

    const link =
      document.createElement("a");

    link.className = "nav-link";

    link.href = target.url +
      "?rotars-resume=1";

    link.textContent =
      "CONTINUE READING";

    link.setAttribute(
      "aria-label",
      "繼續閱讀 " +
      target.novel.title +
      "：" +
      target.chapter.title
    );

    item.replaceWith(link);
  }

  /* =========================================
     段落手動書籤
  ========================================= */

  function isBookmarked(paragraphId) {
    const data = readData();

    const record = data.novels[novelId];

    if (!record) return false;

    return record.bookmarks.some(
      item =>
        item.chapterId === chapterId &&
        item.paragraphId === paragraphId
    );
  }

  function toggleBookmark(paragraph) {
    if (!novel || !chapter) return;

    const data = readData();

    const record =
      getNovelData(data, novelId);

    const index = record.bookmarks.findIndex(
      item =>
        item.chapterId === chapterId &&
        item.paragraphId === paragraph.id
    );

    let added = false;

    if (index >= 0) {
      record.bookmarks.splice(index, 1);
    } else {
      record.bookmarks.push({
        chapterId,
        paragraphId: paragraph.id,
        excerpt:
          paragraph.textContent.trim().slice(0, 90),
        createdAt: new Date().toISOString()
      });

      added = true;
    }

    if (!writeData(data)) return;

    updateBookmarkButtons();

    document.dispatchEvent(
      new CustomEvent(
        "rotars:bookmarks-changed",
        {
          detail: {
            novelId,
            chapterId,
            paragraphId: paragraph.id,
            bookmarked: added
          }
        }
      )
    );
  }

  function updateBookmarkButtons() {
    paragraphs.forEach(paragraph => {
      const button =
        paragraph.querySelector(
          ".reading-bookmark-button"
        );

      if (!button) return;

      const saved =
        isBookmarked(paragraph.id);

      button.classList.toggle(
        "is-bookmarked",
        saved
      );

      button.setAttribute(
        "aria-pressed",
        String(saved)
      );

      button.setAttribute(
        "aria-label",
        saved
          ? "取消收藏此段落"
          : "收藏此段落"
      );

      button.textContent =
        saved ? "◆" : "◇";
    });
  }

  function setupBookmarkButtons() {
    if (!novel || !chapter) return;

    paragraphs.forEach(paragraph => {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "reading-bookmark-button";

      button.setAttribute(
        "aria-label",
        "收藏此段落"
      );

      button.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();

          toggleBookmark(paragraph);
        }
      );

      paragraph.appendChild(button);
    });

    updateBookmarkButtons();
  }

  /* =========================================
     手動書籤清單
  ========================================= */

  function getBookmarks(targetNovelId) {
    const data = readData();

    const id = targetNovelId || novelId;

    const record = data.novels[id];

    if (!record) return [];

    return [...record.bookmarks];
  }

  function goToBookmark(bookmark, targetNovelId) {
    const id = targetNovelId || novelId;

    const targetChapter =
      getChapter(id, bookmark.chapterId);

    if (!targetChapter) return false;

    const url = safeUrl(targetChapter.url);

    if (!url) return false;

    const destination = new URL(
      url,
      window.location.href
    );

    destination.searchParams.set(
      "rotars-bookmark",
      bookmark.paragraphId
    );

    window.location.assign(
      destination.href
    );

    return true;
  }

  /* =========================================
     章節完成紀錄
  ========================================= */

  function markChapterComplete() {
    if (!novel || !chapter) return;

    const data = readData();

    const record =
      getNovelData(data, novelId);

    if (
      !record.completedChapters.includes(
        chapterId
      )
    ) {
      record.completedChapters.push(
        chapterId
      );
    }

    writeData(data);
  }

  function isChapterComplete(
    targetNovelId,
    targetChapterId
  ) {
    const data = readData();

    const record =
      data.novels[targetNovelId];

    if (!record) return false;

    return record.completedChapters.includes(
      targetChapterId
    );
  }

  /* =========================================
     作品閱讀進度

     僅計算正式章節。
     Teaser 不列入正式章節比例。
  ========================================= */

  function getNovelCompletion(targetNovelId) {
    const targetNovel =
      novels[targetNovelId];

    if (!targetNovel) return 0;

    const chapters =
      targetNovel.chapters.filter(
        item => item.type !== "teaser"
      );

    if (!chapters.length) return 0;

    const completed = chapters.filter(
      item =>
        isChapterComplete(
          targetNovelId,
          item.id
        )
    ).length;

    return Math.round(
      completed / chapters.length * 100
    );
  }

  /* =========================================
     目錄閱讀狀態
  ========================================= */

  function setupChapterStatuses() {
    if (!novel || chapter) return;

    const links = document.querySelectorAll(
      ".omn-chapter-item"
    );

    links.forEach(link => {
      const url = link.getAttribute("href");

      const targetChapter =
        novel.chapters.find(
          item => item.url === url
        );

      if (!targetChapter) return;

      if (
        isChapterComplete(
          novelId,
          targetChapter.id
        )
      ) {
        link.classList.add(
          "reading-chapter-complete"
        );

        link.setAttribute(
          "data-reading-status",
          "completed"
        );
      }
    });
  }

  /* =========================================
     作品頁繼續閱讀按鈕
  ========================================= */

  function setupNovelResume() {
    if (!novel || chapter) return;

    const target =
      getResumeTarget(novelId);

    if (!target) return;

    const chapterSection =
      document.querySelector(
        ".omn-chapters"
      );

    if (!chapterSection) return;

    const button =
      document.createElement("a");

    button.className =
      "reading-resume-button";

    button.href =
      target.url + "?rotars-resume=1";

    button.textContent =
      "RESUME READING";

    button.setAttribute(
      "aria-label",
      "繼續閱讀 " +
      target.chapter.title
    );

    chapterSection.insertBefore(
      button,
      chapterSection.querySelector(
        ".omn-chapter-list"
      )
    );
  }

  /* =========================================
     閱讀完成偵測

     讀者實際閱讀並接近正文結尾，
     才標記章節完成。
  ========================================= */

  function checkChapterCompletion() {
    if (
      !readingStarted ||
      !novelBody ||
      !paragraphs.length
    ) {
      return;
    }

    const last =
      paragraphs[paragraphs.length - 1];

    const rect =
      last.getBoundingClientRect();

    const reachedEnd =
      rect.bottom <=
      window.innerHeight * 0.85;

    if (reachedEnd) {
      markChapterComplete();
    }
  }

  /* =========================================
     恢復閱讀請求

     只有透過 Continue Reading
     或手動書籤進入時才跳轉。
  ========================================= */

  function handleRestoreRequest() {
    if (!chapter || !paragraphs.length) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const bookmarkId =
      params.get("rotars-bookmark");

    const resume =
      params.get("rotars-resume") === "1";

    if (!bookmarkId && !resume) {
      return;
    }

    let position = null;

    if (bookmarkId) {
      position = {
        paragraphId: bookmarkId,
        fraction: 0
      };
    } else {
      const target =
        getResumeTarget(novelId);

      if (
        target &&
        target.chapterId === chapterId
      ) {
        position = target.progress;
      }
    }

    if (position) {
      restorePosition(position);
    }

    params.delete("rotars-bookmark");
    params.delete("rotars-resume");

    const query = params.toString();

    const cleanUrl =
      window.location.pathname +
      (query ? "?" + query : "") +
      window.location.hash;

    window.history.replaceState(
      null,
      "",
      cleanUrl
    );
  }

  /* =========================================
     重新閱讀

     清除指定作品閱讀進度，
     保留手動書籤。
  ========================================= */

  function resetNovelProgress(targetNovelId) {
    const data = readData();

    const record =
      data.novels[targetNovelId];

    if (!record) return false;

    record.progress = null;
    record.completedChapters = [];

    if (
      data.lastReadNovel === targetNovelId
    ) {
      data.lastReadNovel = null;
    }

    return writeData(data);
  }

  /* =========================================
     對外公開功能
  ========================================= */

  window.RotaRSReading = {
    getResumeTarget,
    resumeReading,
    getBookmarks,
    goToBookmark,
    isChapterComplete,
    getNovelCompletion,
    resetNovelProgress,
    getStorageStatus: () => storageAvailable
  };

  /* =========================================
     啟動系統
  ========================================= */

  function initialize() {
    setupContinueReading();

    if (!novel) return;

    if (!chapter) {
      setupChapterStatuses();
      setupNovelResume();
      return;
    }

    if (!novelBody) return;

    prepareParagraphs();
    setupBookmarkButtons();
    handleRestoreRequest();

    window.addEventListener(
      "wheel",
      noteInteraction,
      { passive: true }
    );

    window.addEventListener(
      "touchmove",
      noteInteraction,
      { passive: true }
    );

    window.addEventListener(
      "keydown",
      event => {
        if (
          [
            "ArrowDown",
            "ArrowUp",
            "PageDown",
            "PageUp",
            " "
          ].includes(event.key)
        ) {
          noteInteraction();
        }
      }
    );

    window.addEventListener(
      "scroll",
      () => {
        onScroll();
        checkChapterCompletion();
      },
      { passive: true }
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") {
          clearTimeout(saveTimer);
          saveProgress();
        }
      }
    );

    window.addEventListener(
      "pagehide",
      () => {
        clearTimeout(saveTimer);
        saveProgress();
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }

})();
