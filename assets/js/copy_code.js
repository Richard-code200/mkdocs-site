// 代码块复制按钮:点击将代码块内容复制到剪贴板
(function () {
  'use strict';

  function copyText(text) {
    // 优先使用现代 Clipboard API(需要安全上下文)
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // 回退方案:临时 textarea + execCommand
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        if (document.execCommand('copy')) {
          resolve();
        } else {
          reject(new Error('execCommand copy 失败'));
        }
      } catch (err) {
        reject(err);
      } finally {
        textarea.remove();
      }
    });
  }

  function setupCopyButtons() {
    var blocks = document.querySelectorAll('div.highlight pre');

    blocks.forEach(function (pre) {
      if (pre.querySelector('.copy-code-button')) return;
      var code = pre.querySelector('code');
      if (!code) return;

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-code-button';
      button.setAttribute('aria-label', '复制代码');
      button.textContent = '复制';

      var resetTimer = null;

      function showResult(label, success) {
        button.textContent = label;
        button.classList.toggle('copied', success);
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(function () {
          button.textContent = '复制';
          button.classList.remove('copied');
        }, 1600);
      }

      button.addEventListener('click', function () {
        // 去掉结尾多余的换行,保留代码本身的缩进
        copyText(code.textContent.trimEnd()).then(
          function () {
            showResult('已复制', true);
          },
          function () {
            showResult('复制失败', false);
          }
        );
      });

      pre.appendChild(button);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCopyButtons);
  } else {
    setupCopyButtons();
  }
})();
