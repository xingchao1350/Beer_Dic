let termsData = null;
let activeFilters = new Set();
let currentTerm = null;

// 修改 DeepSeek API 相关配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = 'sk-f52cb3b0f1564ed8a67e08203d6b65d2';

// 添加缓存机制，避免重复请求
const contentCache = new Map();

// 加载数据
async function loadTermsData() {
    try {
        console.log('Attempting to load data...');
        const response = await fetch('/beer_categories.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Data loaded successfully:', data);
        termsData = data;
        initializeApp();
    } catch (error) {
        console.error('Error loading terms data:', error);
        document.querySelector('.term-detail').innerHTML = `
            <div class="error-message">
                加载数据失败: ${error.message}
            </div>
        `;
    }
}

// 初始化应用
function initializeApp() {
    renderCategories();
    renderContentTags();
    renderTermsList();
    setupEventListeners();
}

// 渲染分类列表
function renderCategories() {
    const categoryList = document.querySelector('.category-list');
    categoryList.innerHTML = '';
    
    Object.entries(termsData.categories).forEach(([key, category]) => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        if (activeFilters.has(key)) {
            categoryItem.classList.add('active');
        }
        categoryItem.dataset.category = key;
        categoryItem.textContent = category.cn;
        categoryItem.addEventListener('click', toggleFilter);
        categoryList.appendChild(categoryItem);
    });
}

// 切换过滤器
function toggleFilter(event) {
    const category = event.target.dataset.category;
    
    // 清除所有标签的active状态
    document.querySelectorAll('.content-tags .term-tag').forEach(tag => {
        tag.classList.remove('active');
    });
    
    // 清除搜索框内容
    document.getElementById('searchInput').value = '';
    
    if (activeFilters.has(category)) {
        activeFilters.delete(category);
        event.target.classList.remove('active');
    } else {
        activeFilters.clear();
        activeFilters.add(category);
        // 更新分类项的视觉状态
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.toggle('active', item.dataset.category === category);
        });
    }
    
    renderTermsList(category);
}

// 渲染术语列表
function renderTermsList(categoryKey = null, activeTag = null) {
    const termsListContainer = document.querySelector('.terms-list');
    termsListContainer.innerHTML = '';
    
    let filteredTerms = [];
    
    // 根据分类或标签筛选术语
    if (categoryKey) {
        // 按分类筛选
        filteredTerms = termsData.categories[categoryKey].terms;
    } else if (activeTag) {
        // 按标签筛选
        Object.values(termsData.categories).forEach(category => {
            filteredTerms.push(...category.terms.filter(term => 
                term.tags && term.tags.includes(activeTag)
            ));
        });
    } else if (activeFilters.size > 0) {
        // 使用现有的过滤器
        activeFilters.forEach(key => {
            if (termsData.categories[key]) {
                filteredTerms.push(...termsData.categories[key].terms);
            }
        });
    } else {
        // 显示所有术语
        Object.values(termsData.categories).forEach(category => {
            filteredTerms.push(...category.terms);
        });
    }
    
    // 应用搜索过滤
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    if (searchText) {
        filteredTerms = filteredTerms.filter(term => 
            term.en.toLowerCase().includes(searchText) || 
            term.cn.includes(searchText)
        );
    }
    
    // 渲染术语列表
    filteredTerms.forEach(term => {
        const termElement = document.createElement('div');
        termElement.className = 'term-item';
        if (currentTerm && currentTerm.en === term.en) {
            termElement.classList.add('active');
        }
        termElement.textContent = `${term.cn} (${term.en})`;
        termElement.addEventListener('click', () => showTermDetail(term));
        termsListContainer.appendChild(termElement);
    });
    
    // 如果没有找到术语，显示提示信息
    if (filteredTerms.length === 0) {
        termsListContainer.innerHTML = '<div class="no-results">没有找到匹配的术语</div>';
    }
}

// 过滤术语
function filterTerms() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    let allTerms = [];
    
    // 如果没有激活的过滤器，显示所有分类的术语
    if (activeFilters.size === 0) {
        Object.values(termsData.categories).forEach(category => {
            allTerms = allTerms.concat(category.terms);
        });
    } else {
        // 只显示选中分类的术语
        activeFilters.forEach(categoryKey => {
            if (termsData.categories[categoryKey]) {
                allTerms = allTerms.concat(termsData.categories[categoryKey].terms);
            }
        });
    }
    
    // 应用搜索过滤
    return allTerms.filter(term => {
        return searchText === '' || 
                            term.en.toLowerCase().includes(searchText) || 
                            term.cn.includes(searchText);
    });
}

// 显示术语详情
async function showTermDetail(term) {
    currentTerm = term;
    const termDetailContainer = document.querySelector('.term-detail');
    
    // 显示加载状态
    termDetailContainer.innerHTML = `
        <div class="term-header">
            <div class="term-header-content">
            <h2 class="term-title">
                <div class="term-title-cn">${term.cn}</div>
                <div class="term-title-en">${term.en}</div>
            </h2>
                <button class="share-btn" onclick="shareTermDetail('${term.en}')" title="分享">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <polyline points="16 6 12 2 8 6"/>
                        <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                </button>
            </div>
            <div class="term-pronunciation">
                音标: ${term.ipa || 'N/A'}
                <button class="pronunciation-btn" onclick="playPronunciation('${term.en}')" title="点击播放发音">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                </button>
            </div>
            <div class="term-tags">
                ${term.tags.map(tag => `
                    <span class="term-tag" onclick="filterByTag('${tag}')">${tag}</span>
                `).join('')}
            </div>
        </div>
        <div class="term-content">
            <div class="term-loading">正在生成内容...</div>
        </div>
    `;

    // 检查缓存
    const cacheKey = `${term.en}_content`;
    if (contentCache.has(cacheKey)) {
        updateTermContent(contentCache.get(cacheKey));
        return;
    }

    try {
        // 调用 DeepSeek API 生成内容
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "user",
                        content: `请为啤酒术语"${term.cn} (${term.en})"生成中英文简介：
                        1. 中文简介：不超过200字，包括定义和在啤酒领域的主要应用
                        2. 英文简介：对应中文内容的英文翻译，语言简洁专业
                        请用简洁专业的语言描述，确保内容准确且易于理解。
                        格式要求：
                        [CN]
                        中文简介内容
                        [EN]
                        英文简介内容`
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error('API 请求失败');
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // 解析中英文内容
        const [cnDescription, enDescription] = parseContent(content);
        
        const generatedContent = {
            cnDescription,
            enDescription
        };

        // 更新缓存
        contentCache.set(cacheKey, generatedContent);
        
        // 更新显示
        updateTermContent(generatedContent);

    } catch (error) {
        console.error('生成内容失败:', error);
        updateTermContent({
            cnDescription: '内容生成失败，请稍后重试。',
            enDescription: 'Failed to generate content. Please try again later.'
        });
    }
}

// 修改内容解析函数
function parseContent(content) {
    const cnMatch = content.match(/\[CN\]([\s\S]*?)\[EN\]/);
    const enMatch = content.match(/\[EN\]([\s\S]*?)(?:$|\[)/);
    
    const cnDescription = cnMatch ? cnMatch[1].trim() : '';
    const enDescription = enMatch ? enMatch[1].trim() : '';
    
    return [cnDescription, enDescription];
}

// 修改更新术语内容显示函数
function updateTermContent(content) {
    const termContent = document.querySelector('.term-content');
    termContent.innerHTML = `
        <div class="term-description">
            <div class="description-cn">
                <h3>简介</h3>
                <p>${content.cnDescription || '暂无描述'}</p>
            </div>
            <div class="description-en">
                <h3>Description</h3>
                <p>${content.enDescription || 'No description available.'}</p>
            </div>
        </div>
    `;
}

// 添加发音功能
function playPronunciation(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    
    const btn = document.querySelector('.pronunciation-btn');
    btn.classList.add('playing');
    
    utterance.onend = () => {
        btn.classList.remove('playing');
    };
    
    window.speechSynthesis.speak(utterance);
}

// 设置事件监听器
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.querySelector('.search-clear');
    const searchResultsCount = document.querySelector('.search-results-count');

    // 搜索输入事件
    searchInput.addEventListener('input', (e) => {
        const hasValue = e.target.value.length > 0;
        searchClear.style.display = hasValue ? 'block' : 'none';
        searchResultsCount.style.display = hasValue ? 'block' : 'none';
        
        // 更新搜索结果
        renderTermsList();
        
        // 更新结果数量
        const resultCount = document.querySelectorAll('.term-item').length;
        searchResultsCount.textContent = `找到 ${resultCount} 个结果`;
    });

    // 清空搜索
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.style.display = 'none';
        searchResultsCount.style.display = 'none';
        searchInput.focus();
        renderTermsList();
    });

    // 搜索框快捷键
    searchInput.addEventListener('keydown', (e) => {
        // ESC键清空搜索
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchClear.style.display = 'none';
            searchResultsCount.style.display = 'none';
            renderTermsList();
        }
    });
}

// 通过标签筛选
function filterByTag(tag) {
    // 清除搜索框内容
    document.getElementById('searchInput').value = '';
    
    // 清除当前分类选择
    activeFilters.clear();
    
    // 移除所有分类的active状态
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 移除所有标签的active状态
    document.querySelectorAll('.content-tags .term-tag').forEach(tagEl => {
        tagEl.classList.remove('active');
    });
    
    // 激活当前标签
    document.querySelectorAll(`.content-tags .term-tag`).forEach(tagEl => {
        if (tagEl.querySelector('.tag-text').textContent === tag) {
            tagEl.classList.add('active');
        }
    });
    
    // 渲染过滤后的术语列表
    renderTermsList(null, tag);
}

// 渲染内容区域标签
function renderContentTags() {
    const contentTags = document.querySelector('.content-tags');
    const allTags = new Map();
    
    // 收集标签和计数
    Object.values(termsData.categories).forEach(category => {
        category.terms.forEach(term => {
            term.tags?.forEach(tag => {
                allTags.set(tag, (allTags.get(tag) || 0) + 1);
            });
        });
    });
    
    // 排序标签
    const sortedTags = Array.from(allTags.entries())
        .sort((a, b) => b[1] - a[1]);
    
    // 渲染标签和展开按钮
    contentTags.innerHTML = `
        <div class="tags-container">
            ${sortedTags.map(([tag, count]) => `
                <span class="term-tag" onclick="filterByTag('${tag}')">
                    <span class="tag-text">${tag}</span>
                    <span class="tag-count">${count}</span>
                </span>
            `).join('')}
        </div>
        <button class="show-all-tags-btn" title="显示更多标签">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 9l-7 7-7-7"/>
            </svg>
        </button>
    `;
    
    // 添加展开/收起功能
    const showAllBtn = contentTags.querySelector('.show-all-tags-btn');
    const tagsContainer = contentTags.querySelector('.tags-container');
    let isExpanded = false;
    
    showAllBtn.addEventListener('click', () => {
        isExpanded = !isExpanded;
        tagsContainer.classList.toggle('show-all', isExpanded);
        showAllBtn.classList.toggle('expanded', isExpanded);
        showAllBtn.title = isExpanded ? '收起标签' : '显示更多标签';
    });
}

// 获取标签数量
function getTagCount(tag) {
    let count = 0;
    Object.values(termsData.categories).forEach(category => {
        category.terms.forEach(term => {
            if (term.tags?.includes(tag)) count++;
        });
    });
    return count;
}

// 修改生成分享图片功能
async function generateShareImage(term) {
    // 获取缓存的简介内容
    const cacheKey = `${term.en}_content`;
    const cachedContent = contentCache.get(cacheKey);
    
    // 创建临时 canvas 元素
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置画布大小
    canvas.width = 800;
    canvas.height = 800; // 增加高度以容纳更多内容
    
    // 设置背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 添加标题
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.fillText(term.cn, 40, 80);
    
    ctx.font = 'italic 32px -apple-system';
    ctx.fillStyle = '#666666';
    ctx.fillText(term.en, 40, 130);
    
    // 添加音标
    if (term.ipa) {
        ctx.font = '24px -apple-system';
        ctx.fillStyle = '#666666';
        ctx.fillText(`音标: ${term.ipa}`, 40, 180);
    }
    
    // 添加标签
    let currentY = 230;
    if (term.tags && term.tags.length > 0) {
        let tagX = 40;
        ctx.font = '18px -apple-system';
        
        term.tags.forEach(tag => {
            const tagWidth = ctx.measureText(tag).width + 20;
            if (tagX + tagWidth > canvas.width - 40) {
                tagX = 40;
                currentY += 40;
            }
            
            // 绘制标签背景
            ctx.fillStyle = '#f0f0f0';
            ctx.beginPath();
            ctx.roundRect(tagX, currentY - 20, tagWidth, 30, 15);
            ctx.fill();
            
            // 绘制标签文字
            ctx.fillStyle = '#2c3e50';
            ctx.fillText(tag, tagX + 10, currentY);
            
            tagX += tagWidth + 10;
        });
        currentY += 60; // 标签与简介之间的间距
    }
    
    // 添加中文简介
    if (cachedContent?.cnDescription) {
        ctx.font = 'bold 24px -apple-system';
        ctx.fillStyle = '#2c3e50';
        ctx.fillText('简介', 40, currentY);
        currentY += 40;
        
        ctx.font = '20px -apple-system';
        const cnLines = getTextLines(ctx, cachedContent.cnDescription, canvas.width - 80);
        cnLines.forEach(line => {
            ctx.fillText(line, 40, currentY);
            currentY += 30;
        });
        currentY += 30; // 中英文简介之间的间距
    }
    
    // 添加英文简介
    if (cachedContent?.enDescription) {
        ctx.font = 'bold 24px -apple-system';
        ctx.fillStyle = '#2c3e50';
        ctx.fillText('Description', 40, currentY);
        currentY += 40;
        
        ctx.font = '20px -apple-system';
        const enLines = getTextLines(ctx, cachedContent.enDescription, canvas.width - 80);
        enLines.forEach(line => {
            ctx.fillText(line, 40, currentY);
            currentY += 30;
        });
    }
    
    // 添加水印
    ctx.font = '16px -apple-system';
    ctx.fillStyle = '#999999';
    ctx.fillText('鹅毛啤酒辞典', canvas.width - 150, canvas.height - 30);
    
    // 转换为图片
    return canvas.toDataURL('image/png');
}

// 辅助函数：将文本分行
function getTextLines(ctx, text, maxWidth) {
    const words = text.split('');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
        const testLine = currentLine + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

// 添加分享功能
async function shareTermDetail(termEn) {
    const term = findTermByEn(termEn);
    if (!term) return;
    
    try {
        const shareImage = await generateShareImage(term);
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `${term.en}-share.png`;
        link.href = shareImage;
        link.click();
        
    } catch (error) {
        console.error('生成分享图片失败:', error);
        alert('生成分享图片失败，请稍后重试');
    }
}

// 辅助函数：通过英文名查找术语
function findTermByEn(termEn) {
    for (const category of Object.values(termsData.categories)) {
        const term = category.terms.find(t => t.en === termEn);
        if (term) return term;
    }
    return null;
}

// 启动应用
loadTermsData(); 