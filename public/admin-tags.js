// 标签管理功能
let tagsData = {};
let currentTag = null;

// 初始化
async function initializeTagsManager() {
    await loadTagsData();
    setupEventListeners();
    renderTags();
}

// 加载标签数据
async function loadTagsData() {
    try {
        const response = await fetch('/beer_categories.json');
        const data = await response.json();
        
        // 收集所有标签
        tagsData = {};
        Object.values(data.categories).forEach(category => {
            category.terms.forEach(term => {
                term.tags?.forEach(tag => {
                    if (!tagsData[tag]) {
                        tagsData[tag] = {
                            name: tag,
                            category: getCategoryForTag(tag),
                            usageCount: 0
                        };
                    }
                    tagsData[tag].usageCount++;
                });
            });
        });
    } catch (error) {
        console.error('加载标签数据失败:', error);
        alert('加载标签数据失败');
    }
}

// 设置事件监听
function setupEventListeners() {
    const tagForm = document.getElementById('tagForm');
    const cancelTagBtn = document.getElementById('cancelTagBtn');
    const tagsContainer = document.getElementById('tagsContainer');

    tagForm.addEventListener('submit', handleTagSubmit);
    cancelTagBtn.addEventListener('click', resetTagForm);
    
    // 添加标签点击事件委托
    tagsContainer.addEventListener('click', handleTagClick);
}

// 渲染标签列表
function renderTags() {
    const container = document.getElementById('tagsContainer');
    container.innerHTML = '';

    // 按分类组织标签
    const tagsByCategory = {};
    Object.values(tagsData).forEach(tag => {
        if (!tagsByCategory[tag.category]) {
            tagsByCategory[tag.category] = [];
        }
        tagsByCategory[tag.category].push(tag);
    });

    // 渲染每个分类的标签
    Object.entries(tagsByCategory).forEach(([category, tags]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'tag-category';
        categoryDiv.innerHTML = `
            <h3>${getCategoryDisplayName(category)}</h3>
            <div class="tags-container">
                ${tags.map(tag => createTagElement(tag)).join('')}
            </div>
        `;
        container.appendChild(categoryDiv);
    });
}

// 创建标签元素
function createTagElement(tag) {
    return `
        <div class="tag-item" data-tag="${tag.name}">
            <span class="tag-name">${tag.name}</span>
            <span class="tag-count">(${tag.usageCount})</span>
            <span class="tag-category-label">${getCategoryDisplayName(tag.category)}</span>
            <span class="tag-delete" onclick="deleteTag('${tag.name}')">×</span>
        </div>
    `;
}

// 处理标签提交
async function handleTagSubmit(event) {
    event.preventDefault();
    
    const tagName = document.getElementById('tagName').value.trim();
    const tagCategory = document.getElementById('tagCategory').value;

    if (!tagName) return;

    try {
        if (currentTag) {
            // 更新现有标签
            const oldName = currentTag.name;
            
            // 如果标签名称改变，需要更新所有使用该标签的术语
            if (oldName !== tagName) {
                await updateTagReferences(oldName, tagName);
            }
            
            // 更新标签数据
            delete tagsData[oldName];
            tagsData[tagName] = {
                name: tagName,
                category: tagCategory,
                usageCount: currentTag.usageCount
            };
        } else {
            // 创建新标签
            if (tagsData[tagName]) {
                alert('标签已存在');
                return;
            }
            
            tagsData[tagName] = {
                name: tagName,
                category: tagCategory,
                usageCount: 0
            };
        }

        renderTags();
        resetTagForm();
    } catch (error) {
        console.error('保存标签失败:', error);
        alert('保存标签失败');
    }
}

// 更新标签引用
async function updateTagReferences(oldName, newName) {
    try {
        const response = await fetch('/beer_categories.json');
        const data = await response.json();
        let modified = false;

        // 遍历所有术语，更新标签引用
        Object.values(data.categories).forEach(category => {
            category.terms.forEach(term => {
                if (term.tags && term.tags.includes(oldName)) {
                    term.tags = term.tags.map(tag => tag === oldName ? newName : tag);
                    modified = true;
                }
            });
        });

        if (modified) {
            // 这里应该调用后端 API 保存更新后的数据
            console.log('标签引用已更新');
        }
    } catch (error) {
        console.error('更新标签引用失败:', error);
        throw error;
    }
}

// 删除标签
async function deleteTag(tagName) {
    if (!confirm(`确定要删除标签 "${tagName}" 吗？`)) return;

    try {
        // 在这里应该调用后端 API 删除标签
        // 现在只是更新前端数据
        delete tagsData[tagName];
        renderTags();
    } catch (error) {
        console.error('删除标签失败:', error);
        alert('删除标签失败');
    }
}

// 重置表单
function resetTagForm() {
    const form = document.getElementById('tagForm');
    const saveTagBtn = document.getElementById('saveTagBtn');
    
    form.reset();
    saveTagBtn.textContent = '保存标签';
    currentTag = null;
    
    // 移除所有标签的选中状态
    document.querySelectorAll('.tag-item').forEach(item => {
        item.classList.remove('selected');
    });
}

// 获取标签分类显示名称
function getCategoryDisplayName(category) {
    const categoryNames = {
        'history': '历史文化',
        'ingredient': '原料',
        'process': '工艺',
        'style': '风格',
        'service': '服务',
        'quality': '品质'
    };
    return categoryNames[category] || category;
}

// 根据标签名推测分类
function getCategoryForTag(tag) {
    // 这里可以添加更智能的分类逻辑
    return 'general';
}

// 添加标签点击处理
function handleTagClick(event) {
    const tagItem = event.target.closest('.tag-item');
    if (!tagItem) return;
    
    // 如果点击的是删除按钮，不触发编辑
    if (event.target.classList.contains('tag-delete')) return;
    
    const tagName = tagItem.dataset.tag;
    const tag = tagsData[tagName];
    if (!tag) return;
    
    // 设置当前编辑的标签
    currentTag = tag;
    
    // 填充表单
    const tagNameInput = document.getElementById('tagName');
    const tagCategorySelect = document.getElementById('tagCategory');
    const saveTagBtn = document.getElementById('saveTagBtn');
    
    tagNameInput.value = tag.name;
    tagCategorySelect.value = tag.category;
    saveTagBtn.textContent = '更新标签';
    
    // 高亮选中的标签
    document.querySelectorAll('.tag-item').forEach(item => {
        item.classList.remove('selected');
    });
    tagItem.classList.add('selected');
}

// 启动应用
initializeTagsManager(); 