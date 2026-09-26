(function () {
  'use strict';

  function setupChineseSearch() {
    var input = document.getElementById('mkdocs-search-query');
    var results = document.getElementById('mkdocs-search-results');
    if (!input || !results) return;

    var root = new URL(base_url + '/', window.location.href);
    var pagesPromise = null;
    var generation = 0;
    var wasHan = false;

    function hasHan(text) {
      return /[\u3400-\u9fff]/.test(text);
    }

    function hanCount(text) {
      return (text.match(/[\u3400-\u9fff]/g) || []).length;
    }

    function loadPages() {
      if (!pagesPromise) {
        pagesPromise = fetch(new URL('search/search_index.json', root)).then(function (response) {
          if (!response.ok) throw new Error('搜索索引加载失败');
          return response.json();
        }).then(function (data) {
          return data.docs.filter(function (doc) { return doc.location.indexOf('#') === -1; });
        }).catch(function (error) {
          pagesPromise = null;
          throw error;
        });
      }
      return pagesPromise;
    }

    function matchingPages(pages, query) {
      var lowered = query.toLowerCase();
      var seen = new Set();
      return pages.filter(function (page) {
        var matches = page.title.toLowerCase().includes(lowered) || page.text.toLowerCase().includes(lowered);
        if (!matches || seen.has(page.location)) return false;
        seen.add(page.location);
        return true;
      }).sort(function (a, b) {
        return Number(b.title.toLowerCase().includes(lowered)) - Number(a.title.toLowerCase().includes(lowered));
      }).slice(0, 20);
    }

    function message(text) {
      var paragraph = document.createElement('p');
      paragraph.textContent = text;
      results.replaceChildren(paragraph);
    }

    function renderPages(pages, query) {
      if (!pages.length) {
        message('未找到匹配的笔记');
        return;
      }

      var fragment = document.createDocumentFragment();
      pages.forEach(function (page) {
        var href = new URL(page.location, root);
        if (href.origin !== window.location.origin) return;

        var article = document.createElement('article');
        var heading = document.createElement('h3');
        var link = document.createElement('a');
        var summary = document.createElement('p');
        var position = page.text.toLowerCase().indexOf(query.toLowerCase());
        var from = Math.max(0, position - 40);

        link.href = href.href;
        link.textContent = page.title;
        summary.textContent = page.text.slice(from, from + 180);
        heading.appendChild(link);
        article.appendChild(heading);
        article.appendChild(summary);
        fragment.appendChild(article);
      });
      results.replaceChildren(fragment);
    }

    // 查询包含汉字时由本脚本显示结果，不让旧 Worker 回复覆盖当前内容。
    var originalDisplay = window.displayResults;
    window.displayResults = function (items) {
      if (!input.value.trim() || hasHan(input.value.trim())) return;
      return originalDisplay(items);
    };

    function update(event) {
      var query = input.value.trim();
      var current = ++generation;

      if (!query) {
        results.replaceChildren();
        wasHan = false;
        return;
      }
      if (!hasHan(query)) {
        if ((wasHan || event.inputType === 'insertFromPaste' || event.type === 'compositionend') &&
            typeof window.doSearch === 'function' && typeof window.min_search_length === 'number') {
          window.doSearch();
        }
        wasHan = false;
        return;
      }

      wasHan = true;
      if (hanCount(query) < 2) {
        message('请至少输入两个汉字');
        return;
      }

      message('正在搜索…');
      loadPages().then(function (pages) {
        if (current !== generation || input.value.trim() !== query) return;
        renderPages(matchingPages(pages, query), query);
      }, function () {
        if (current === generation && input.value.trim() === query) {
          message('搜索暂不可用，请稍后重试');
        }
      });
    }

    input.addEventListener('keyup', function (event) {
      if (!input.value.trim() || hasHan(input.value)) event.stopImmediatePropagation();
    }, true);
    input.addEventListener('input', function (event) {
      if (!event.isComposing) update(event);
    });
    input.addEventListener('compositionend', update);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupChineseSearch);
  } else {
    setupChineseSearch();
  }
})();
