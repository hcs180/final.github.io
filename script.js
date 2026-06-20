const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  body.dataset.theme = savedTheme;
  if (themeToggle) themeToggle.textContent = savedTheme === 'dark' ? '☀' : '☾';
}
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
    body.dataset.theme = nextTheme;
    localStorage.setItem('theme', nextTheme);
    themeToggle.textContent = nextTheme === 'dark' ? '☀' : '☾';
  });
}

// 標記目前分頁
const currentPage = body.dataset.currentPage || location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('[data-page]').forEach(link => {
  if (link.dataset.page === currentPage) link.classList.add('active');
});

// JS 跳轉分頁示範
const goButtons = document.querySelectorAll('[data-go]');
goButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    location.href = btn.dataset.go;
  });
});

// 滾動顯示動畫
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('show'));
}

// 數字動畫
const statEls = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window) {
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count || 0);
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 30));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = current;
      }, 32);
      countObserver.unobserve(el);
    });
  }, { threshold: 0.8 });
  statEls.forEach(el => countObserver.observe(el));
}

// 作品資料（從 project-data.json 載入）
let projectData = {};
fetch('project-data.json')
  .then(response => {
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  })
  .then(data => {
    projectData = Object.fromEntries(Object.entries(data).map(([k, v]) => {
      const points = v.points || (v.detail ? v.detail.split(/。|\n/).map(s => s.trim()).filter(Boolean) : []);
      return [k, {
        id: v.id || k,
        title: v.title || '',
        type: v.type || '',
        desc: v.desc || '',
        detail: v.detail || '',
        cat: v.cat || '',
        img: v.img || '',
        tags: v.tags || [],
        points
      }];
    }));
    // 載入完成後產生卡片並綁定互動
    renderProjects();
    updateProjectList();
    bindDynamicProjectInteractions();
    syncFavoriteButtons();
  })
  .catch(err => {
    console.error('載入 project-data.json 失敗：', err);
  });

// 作品篩選與搜尋
const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
const projectSearch = document.getElementById('projectSearch');
const projectCount = document.getElementById('projectCount');
let activeFilter = 'all';
function updateProjectList() {
  const items = document.querySelectorAll('.project-item');
  if (!items.length) {
    if (projectCount) projectCount.textContent = '目前顯示 0 件作品';
    return;
  }
  const keyword = (projectSearch?.value || '').trim().toLowerCase();
  let visible = 0;
  items.forEach(item => {
    const categories = (item.dataset.category || '').split(' ');
    const text = (item.dataset.title || '').toLowerCase();
    const filterMatch = activeFilter === 'all' || categories.includes(activeFilter);
    const keywordMatch = !keyword || text.includes(keyword);
    const shouldShow = filterMatch && keywordMatch;
    item.classList.toggle('hide', !shouldShow);
    if (shouldShow) visible += 1;
  });
  if (projectCount) projectCount.textContent = `目前顯示 ${visible} 件作品`;
}
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(item => item.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    updateProjectList();
  });
});
if (projectSearch) projectSearch.addEventListener('input', updateProjectList);
updateProjectList();

// 將 projectData 轉為 DOM 卡片並插入頁面
function renderProjects() {
  const listEl = document.querySelector('.project-list');
  if (!listEl) return;
  listEl.innerHTML = Object.entries(projectData).map(([id, p]) => {
    const imgSrc = `images/${(p.img || '').replace(/\.svg$/i, '.jpg')}`;
    const tagsHtml = (p.tags || []).map(t => `<span>${t}</span>`).join('');
    const dataTitle = `${p.title} ${p.type} ${(p.tags || []).join(' ')}`.trim();
    const category = (p.cat || '').trim();
    return `
      <div class="col-md-6 col-xl-4 project-item" data-category="${category}" data-title="${dataTitle}" data-project-id="${id}">
        <article class="project-card h-100">
          <button class="favorite-btn" type="button" data-favorite="${id}" aria-label="收藏 ${p.title}">☆</button>
          <img src="${imgSrc}" alt="${p.title} 示意圖">
          <div class="project-body">
            <span class="project-type">${p.type}</span>
            <h3>${p.title}</h3>
            <p>${p.desc}</p>
            <div class="mini-tags">${tagsHtml}</div>
            <button class="text-btn mt-3" type="button" data-open-project="${id}">查看細節</button>
          </div>
        </article>
      </div>
    `;
  }).join('');
}

// 綁定動態產生的收藏按鈕
function bindFavoriteButtons() {
  document.querySelectorAll('[data-favorite]').forEach(btn => {
    if (btn.dataset.favBound) return;
    btn.dataset.favBound = '1';
    btn.addEventListener('click', () => {
      const id = btn.dataset.favorite;
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      localStorage.setItem(favoriteKey, JSON.stringify([...favorites]));
      syncFavoriteButtons();
    });
  });
}

// 綁定動態產生的「查看細節」按鈕
function bindOpenProjectButtons() {
  document.querySelectorAll('[data-open-project]').forEach(btn => {
    if (btn.dataset.openBound) return;
    btn.dataset.openBound = '1';
    btn.addEventListener('click', () => {
      const id = btn.dataset.openProject;
      const data = projectData[id];
      if (!data || !modalEl || !window.bootstrap) return;
      modalTitle.textContent = data.title;
      modalBody.innerHTML = `
        <p class="project-type">${data.type}</p>
        <p>${data.desc}</p>
        <ul class="detail-list">${data.points.map(point => `<li>${point}</li>`).join('')}</ul>
      `;
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });
  });
}

function bindDynamicProjectInteractions() {
  bindFavoriteButtons();
  bindOpenProjectButtons();
}

// 作品收藏（動態）
const favoriteKey = 'portfolioFavorites';
const favorites = new Set(JSON.parse(localStorage.getItem(favoriteKey) || '[]'));

function syncFavoriteButtons() {
  document.querySelectorAll('[data-favorite]').forEach(btn => {
    const id = btn.dataset.favorite;
    const active = favorites.has(id);
    btn.classList.toggle('active', active);
    btn.textContent = active ? '★' : '☆';
  });
}

// 作品細節 Modal（動態綁定於 render 後）
const modalEl = document.getElementById('projectModal');
const modalTitle = document.getElementById('projectModalTitle');
const modalBody = document.getElementById('projectModalBody');

// 代表專題互動模組
const labData = {
  face: { title: '人臉辨識', text: '拍攝使用者照片後與雲端資料比對，符合條件才導向選物頁。這讓「誰能領」不只靠人工盯場。' },
  rfid: { title: 'RFID', text: '以磁扣驗證身分，提供不想使用臉部資料者替代方式，也能讓急需物資的人快速完成驗證。' },
  webduino: { title: 'Webduino 伺服馬達', text: '辨識成功後控制伺服馬達轉動，模擬門鎖開啟與關閉，讓系統從畫面展示進一步變成實體流程。' },
  data: { title: '資料管理', text: '可延伸紀錄放入、領取、保存期限與補貨狀態，讓管理者把時間花在補貨與檢查，而不是一直站在冰箱旁。' }
};
const labButtons = document.querySelectorAll('.lab-btn');
const labOutput = document.getElementById('labOutput');
labButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    labButtons.forEach(item => item.classList.remove('active'));
    btn.classList.add('active');
    const data = labData[btn.dataset.lab];
    if (data && labOutput) labOutput.innerHTML = `<h3>${data.title}</h3><p>${data.text}</p>`;
  });
});

// 文章閱讀模式
const articleList = document.getElementById('articleList');
document.querySelectorAll('[data-font-size]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-font-size]').forEach(item => item.classList.remove('active'));
    btn.classList.add('active');
    if (!articleList) return;
    articleList.classList.toggle('large-text', btn.dataset.fontSize === 'large');
    articleList.classList.toggle('focus-mode', btn.dataset.fontSize === 'focus');
  });
});

// 聯絡表單：驗證與草稿保存
const contactForm = document.getElementById('contactForm');
const formNotice = document.getElementById('formNotice');
const draftKey = 'portfolioContactDraft';
if (contactForm) {
  const fields = [...contactForm.querySelectorAll('input, select, textarea')];
  const savedDraft = JSON.parse(localStorage.getItem(draftKey) || '{}');
  fields.forEach(field => {
    if (savedDraft[field.name]) field.value = savedDraft[field.name];
    field.addEventListener('input', () => {
      const draft = {};
      fields.forEach(f => draft[f.name] = f.value);
      localStorage.setItem(draftKey, JSON.stringify(draft));
    });
  });
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = contactForm.name.value.trim();
    const email = contactForm.email.value.trim();
    const topic = contactForm.topic.value.trim();
    const message = contactForm.message.value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !emailOk || !topic || message.length < 10) {
      formNotice.textContent = '請確認姓名、Email、主題與留言內容，留言至少 10 個字。';
      formNotice.classList.add('error');
      return;
    }
    formNotice.classList.remove('error');
    formNotice.textContent = '已完成送出示範：這是 GitHub Pages 靜態網站，不會真的寄送資料。';
    localStorage.removeItem(draftKey);
    contactForm.reset();
  });
  const clearDraft = document.getElementById('clearDraft');
  if (clearDraft) {
    clearDraft.addEventListener('click', () => {
      localStorage.removeItem(draftKey);
      contactForm.reset();
      formNotice.classList.remove('error');
      formNotice.textContent = '草稿已清除。';
    });
  }
}

// 回到頂部
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  if (backToTop) backToTop.classList.toggle('show', window.scrollY > 680);
});
if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// 手機點選導覽後收合
const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
const navCollapse = document.getElementById('mainNav');
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (navCollapse && navCollapse.classList.contains('show') && window.bootstrap) {
      bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
    }
  });
});
