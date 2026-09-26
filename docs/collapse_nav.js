// 折叠侧边栏的分类导航:默认只显示分类名,点击分类名展开/收起其下的笔记链接
(function () {
  'use strict';

  function setupCollapsibleNav() {
    var sections = document.querySelectorAll('.terminal-mkdocs-side-nav-li');

    sections.forEach(function (li) {
      var title = li.querySelector(':scope > .terminal-mkdocs-side-nav-section-no-index');
      var links = li.querySelector(':scope > .terminal-mkdocs-side-nav-li-ul');
      if (!title || !links) return;

      // 当前页面所在分类默认展开,方便定位当前位置;其余分类默认折叠
      var expanded = title.classList.contains('terminal-mkdocs-side-nav-item--active');

      function render() {
        links.classList.toggle('collapse-nav-collapsed', !expanded);
        title.setAttribute('aria-expanded', String(expanded));
      }

      function toggle() {
        expanded = !expanded;
        render();
      }

      title.setAttribute('role', 'button');
      title.setAttribute('tabindex', '0');
      title.setAttribute('title', '点击展开 / 收起');
      title.addEventListener('click', toggle);

      // 键盘可访问性:Enter 或空格切换
      title.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });

      render();
    });
  }

  function setupMobileNav() {
    var panel = document.getElementById('terminal-mkdocs-side-panel');
    if (!panel) return;

    var button = document.createElement('button');
    var expanded = false;
    button.type = 'button';
    button.className = 'mobile-nav-toggle';
    button.setAttribute('aria-controls', panel.id);

    function render() {
      document.body.classList.toggle('mobile-nav-open', expanded);
      button.setAttribute('aria-expanded', String(expanded));
      button.textContent = expanded ? '收起目录' : '打开目录';
    }

    button.addEventListener('click', function () {
      expanded = !expanded;
      render();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && expanded && window.matchMedia('(max-width: 69.999em)').matches) {
        expanded = false;
        render();
        button.focus();
      }
    });

    panel.parentNode.insertBefore(button, panel);
    render();
    document.body.classList.add('mobile-nav-ready');
  }

  function setupNav() {
    setupCollapsibleNav();
    setupMobileNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNav);
  } else {
    setupNav();
  }
})();
