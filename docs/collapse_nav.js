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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCollapsibleNav);
  } else {
    setupCollapsibleNav();
  }
})();
