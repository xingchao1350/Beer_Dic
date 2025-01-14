const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();

app.use(express.static('public'));
app.use(express.json());

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 管理页面路由
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 获取数据
app.get('/beer_categories.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'beer_categories.json'));
});

// 保存术语
app.post('/api/terms', async (req, res) => {
    try {
        const { categoryKey, term } = req.body;
        const filePath = path.join(__dirname, 'public', 'beer_categories.json');
        
        // 读取现有数据
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        // 添加新术语
        if (!data.categories[categoryKey]) {
            return res.status(400).json({ error: '分类不存在' });
        }
        
        data.categories[categoryKey].terms.push(term);
        
        // 保存更新后的数据
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving term:', error);
        res.status(500).json({ error: '保存失败' });
    }
});

// 更新术语
app.put('/api/terms', async (req, res) => {
    try {
        const { categoryKey, termIndex, term } = req.body;
        const filePath = path.join(__dirname, 'public', 'beer_categories.json');
        
        // 读取现有数据
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        // 验证分类和索引
        if (!data.categories[categoryKey] || 
            !data.categories[categoryKey].terms[termIndex]) {
            return res.status(400).json({ error: '找不到要更新的术语' });
        }
        
        // 更新术语
        data.categories[categoryKey].terms[termIndex] = term;
        
        // 保存更新后的数据
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating term:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

// 删除术语
app.delete('/api/terms', async (req, res) => {
    try {
        const { categoryKey, termIndex } = req.body;
        const filePath = path.join(__dirname, 'public', 'beer_categories.json');
        
        // 读取现有数据
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        // 验证分类和索引
        if (!data.categories[categoryKey] || 
            !data.categories[categoryKey].terms[termIndex]) {
            return res.status(400).json({ error: '找不到要删除的术语' });
        }
        
        // 删除术语
        data.categories[categoryKey].terms.splice(termIndex, 1);
        
        // 保存更新后的数据
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting term:', error);
        res.status(500).json({ error: '删除失败' });
    }
});

// 添加分类
app.post('/api/categories', async (req, res) => {
    try {
        const { key, category } = req.body;
        const filePath = path.join(__dirname, 'public', 'beer_categories.json');
        
        // 读取现有数据
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        // 检查分类是否已存在
        if (data.categories[key]) {
            return res.status(400).json({ error: '分类已存在' });
        }
        
        // 添加新分类
        data.categories[key] = category;
        
        // 保存更新后的数据
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ error: '添加分类失败' });
    }
});

// 更新分类
app.put('/api/categories', async (req, res) => {
    try {
        const { key, category } = req.body;
        const filePath = path.join(__dirname, 'public', 'beer_categories.json');
        
        // 读取现有数据
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        // 检查分类是否存在
        if (!data.categories[key]) {
            return res.status(400).json({ error: '分类不存在' });
        }
        
        // 更新分类
        data.categories[key] = category;
        
        // 保存更新后的数据
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: '更新分类失败' });
    }
});

// 删除分类
app.delete('/api/categories', async (req, res) => {
    try {
        const { key } = req.body;
        const filePath = path.join(__dirname, 'public', 'beer_categories.json');
        
        // 读取现有数据
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        // 检查分类是否存在
        if (!data.categories[key]) {
            return res.status(400).json({ error: '分类不存在' });
        }
        
        // 删除分类
        delete data.categories[key];
        
        // 保存更新后的数据
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: '删除分类失败' });
    }
});

// 翻译页面路由
app.get('/translate', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'translate.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 