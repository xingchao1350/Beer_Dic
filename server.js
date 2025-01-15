const express = require('express');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const app = express();
const mammoth = require('mammoth');
const pdfjsLib = require('pdfjs-dist');
const multer = require('multer');
const officegen = require('officegen');
const PDFDocument = require('pdfkit');

app.use(express.static('public'));
app.use(express.json());

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: multer.diskStorage({
        destination: async function (req, file, cb) {
            try {
                await fsPromises.access('uploads');
                cb(null, 'uploads/');
            } catch {
                await fsPromises.mkdir('uploads', { recursive: true });
                cb(null, 'uploads/');
            }
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        // 根据文件扩展名判断类型
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.md', '.doc', '.docx', '.pdf'];
        
        if (allowedExts.includes(ext)) {
            // 根据扩展名设置正确的 mimetype
            switch (ext) {
                case '.md':
                    file.mimetype = 'text/markdown';
                    break;
                case '.doc':
                    file.mimetype = 'application/msword';
                    break;
                case '.docx':
                    file.mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    break;
                case '.pdf':
                    file.mimetype = 'application/pdf';
                    break;
            }
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型，仅支持 .md、.doc、.docx、.pdf 格式'));
        }
    }
});

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
        const data = JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
        
        // 添加新术语
        if (!data.categories[categoryKey]) {
            return res.status(400).json({ error: '分类不存在' });
        }
        
        data.categories[categoryKey].terms.push(term);
        
        // 保存更新后的数据
        await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
        
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
        const data = JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
        
        // 验证分类和索引
        if (!data.categories[categoryKey] || 
            !data.categories[categoryKey].terms[termIndex]) {
            return res.status(400).json({ error: '找不到要更新的术语' });
        }
        
        // 更新术语
        data.categories[categoryKey].terms[termIndex] = term;
        
        // 保存更新后的数据
        await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
        
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
        const data = JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
        
        // 验证分类和索引
        if (!data.categories[categoryKey] || 
            !data.categories[categoryKey].terms[termIndex]) {
            return res.status(400).json({ error: '找不到要删除的术语' });
        }
        
        // 删除术语
        data.categories[categoryKey].terms.splice(termIndex, 1);
        
        // 保存更新后的数据
        await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
        
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
        const data = JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
        
        // 检查分类是否已存在
        if (data.categories[key]) {
            return res.status(400).json({ error: '分类已存在' });
        }
        
        // 添加新分类
        data.categories[key] = category;
        
        // 保存更新后的数据
        await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
        
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
        const data = JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
        
        // 检查分类是否存在
        if (!data.categories[key]) {
            return res.status(400).json({ error: '分类不存在' });
        }
        
        // 更新分类
        data.categories[key] = category;
        
        // 保存更新后的数据
        await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
        
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
        const data = JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
        
        // 检查分类是否存在
        if (!data.categories[key]) {
            return res.status(400).json({ error: '分类不存在' });
        }
        
        // 删除分类
        delete data.categories[key];
        
        // 保存更新后的数据
        await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
        
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

// 添加保存分类数据的路由
app.post('/api/save-categories', async (req, res) => {
    try {
        const data = req.body;
        const filePath = path.join(__dirname, 'public', 'beer_categories.json');
        
        // 保存数据到文件
        await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        
        res.json({ success: true });
    } catch (error) {
        console.error('保存数据失败:', error);
        res.status(500).json({ 
            error: '保存数据失败',
            details: error.message 
        });
    }
});

// 添加文件上传和处理的路由
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('未收到文件');
        }

        const fileType = path.extname(req.file.originalname).toLowerCase();
        let text = '';

        try {
            switch (fileType) {
                case '.md':
                    text = await fsPromises.readFile(req.file.path, 'utf8');
                    break;
                case '.docx':
                case '.doc':
                    const result = await mammoth.extractRawText({ path: req.file.path });
                    text = result.value;
                    break;
                case '.pdf':
                    const dataBuffer = await fsPromises.readFile(req.file.path);
                    const pdf = await pdfjsLib.getDocument(new Uint8Array(dataBuffer)).promise;
                    let pdfText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        pdfText += content.items.map(item => item.str).join(' ') + '\n';
                    }
                    text = pdfText;
                    break;
                default:
                    throw new Error(`不支持的文件类型: ${fileType}`);
            }

            // 清理上传的文件
            await fsPromises.unlink(req.file.path);

            res.json({
                success: true,
                text: text
            });
        } catch (error) {
            // 确保在出错时也清理文件
            try {
                await fsPromises.unlink(req.file.path);
            } catch {}
            throw error;
        }
    } catch (error) {
        console.error('文件处理错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 修改文件导出路由
app.post('/api/export', async (req, res) => {
    let outputPath = '';
    try {
        console.log('开始导出文件:', req.body.format);
        const { content, format, originalName } = req.body;
        
        // 确保 temp 目录存在
        try {
            await fsPromises.access(path.join(__dirname, 'temp'));
        } catch {
            await fsPromises.mkdir(path.join(__dirname, 'temp'), { recursive: true });
        }

        // 根据格式设置正确的文件扩展名
        const ext = format.toLowerCase();
        outputPath = path.join(__dirname, 'temp', `translated_${Date.now()}.${ext}`);
        console.log('输出路径:', outputPath);

        switch (ext) {
            case 'md':
                console.log('导出 Markdown 文件');
                await fsPromises.writeFile(outputPath, content, 'utf8');
                break;

            case 'docx':
                console.log('导出 Word 文件');
                try {
                    const docx = officegen({
                        type: 'docx',
                        orientation: 'portrait',
                        pageMargins: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
                    });

                    // 添加段落
                    const paragraphs = content.split('\n\n');
                    paragraphs.forEach(para => {
                        if (para.trim()) {
                            const p = docx.createP();
                            p.addText(para.trim());
                        }
                    });

                    // 创建写入流
                    const docxOutput = fs.createWriteStream(outputPath);

                    // 生成文档
                    await new Promise((resolve, reject) => {
                        docxOutput.on('error', reject);
                        docx.on('error', reject);
                        docxOutput.on('finish', resolve);
                        docx.on('finalize', () => {
                            console.log('Word 文档生成完成');
                        });
                        docx.generate(docxOutput);
                    });

                } catch (error) {
                    console.error('Word 文档生成失败:', error);
                    throw error;
                }
                break;

            case 'pdf':
                console.log('导出 PDF 文件');
                try {
                    const doc = new PDFDocument({
                        autoFirstPage: true,
                        size: 'A4',
                        margin: 50
                    });

                    // 创建写入流
                    const pdfOutput = fs.createWriteStream(outputPath);
                    doc.pipe(pdfOutput);

                    // 写入内容
                    const paragraphsPDF = content.split('\n\n');
                    paragraphsPDF.forEach(para => {
                        if (para.trim()) {
                            doc.text(para.trim(), {
                                align: 'left',
                                continued: false
                            });
                            doc.moveDown();
                        }
                    });

                    doc.end();

                    // 等待写入完成
                    await new Promise((resolve, reject) => {
                        pdfOutput.on('finish', () => {
                            console.log('PDF 文件生成完成');
                            resolve();
                        });
                        pdfOutput.on('error', reject);
                    });

                } catch (error) {
                    console.error('PDF 生成失败:', error);
                    throw error;
                }
                break;

            default:
                throw new Error(`不支持的导出格式: ${format}`);
        }

        // 确认文件存在
        await fsPromises.access(outputPath);
        console.log('文件生成成功，准备发送');

        // 设置正确的 Content-Type
        const mimeTypes = {
            'md': 'text/markdown',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'pdf': 'application/pdf'
        };

        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="translated_${originalName}"`);

        // 读取文件并发送
        const fileStream = fs.createReadStream(outputPath);
        fileStream.pipe(res);

        // 文件发送完成后删除
        fileStream.on('end', async () => {
            try {
                await fsPromises.unlink(outputPath);
                console.log('临时文件已删除');
            } catch (error) {
                console.error('删除临时文件失败:', error);
            }
        });

    } catch (error) {
        console.error('导出文件错误:', error);
        if (outputPath) {
            try {
                await fsPromises.unlink(outputPath);
            } catch {}
        }
        res.status(500).json({
            success: false,
            error: error.message || '导出失败'
        });
    }
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            error: '文件上传错误: ' + err.message
        });
    }
    res.status(500).json({
        success: false,
        error: err.message || '服务器错误'
    });
});

// 确保上传目录存在
const ensureDirectories = async () => {
    const dirs = ['uploads', 'temp'];
    for (const dir of dirs) {
        try {
            await fsPromises.access(dir);
        } catch {
            await fsPromises.mkdir(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    }
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await ensureDirectories();
    console.log(`Server is running on port ${PORT}`);
}); 