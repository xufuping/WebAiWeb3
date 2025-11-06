#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 配置
const NOTES_DIR = path.join(__dirname, 'notes');
const INDEX_FILE = path.join(NOTES_DIR, 'INDEX.md');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

// 创建readline接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 封装问题询问
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// 确保notes目录存在
function ensureNotesDir() {
    if (!fs.existsSync(NOTES_DIR)) {
        fs.mkdirSync(NOTES_DIR, { recursive: true });
        console.log(`${colors.green}✓${colors.reset} 创建notes目录成功`);
    }
}

// 获取下一个序号
function getNextNumber() {
    if (!fs.existsSync(NOTES_DIR)) {
        return 1;
    }

    const files = fs.readdirSync(NOTES_DIR)
        .filter(file => file.endsWith('.md') && file !== 'INDEX.md')
        .filter(file => /^\d+/.test(file));

    if (files.length === 0) {
        return 1;
    }

    const numbers = files.map(file => {
        const match = file.match(/^(\d+)/);
        return match ? parseInt(match[1]) : 0;
    });

    return Math.max(...numbers) + 1;
}

// 清理文件名中的非法字符
function sanitizeFileName(fileName) {
    return fileName
        .replace(/\//g, '-')              // 斜杠改为短横线
        .replace(/\\/g, '-')              // 反斜杠改为短横线
        .replace(/[:\*\?"<>\|]/g, '')     // 其他非法字符直接删除
        .replace(/\s+/g, ' ')             // 多个空格合并
        .replace(/^\.+/, '')              // 移除开头的点
        .replace(/\.+$/, '')              // 移除结尾的点
        .trim();
}

// 格式化日期
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 生成笔记内容
function generateNoteContent(title, tags, createdTime) {
    const tagList = tags.map(tag => `\`${tag}\``).join(' ');

    return `---
title: ${title}
tags: ${tagList}
created: ${createdTime}
---

# ${title}

## 📌 标签

${tags.map(tag => `- ${tag}`).join('\n')}

## 📝 内容

> 在这里开始记录你的笔记...

---

## 📚 相关链接

- 

---

## 💡 总结

`;
}

// 更新索引文件
function updateIndex() {
    const files = fs.readdirSync(NOTES_DIR)
        .filter(file => file.endsWith('.md') && file !== 'INDEX.md')
        .sort((a, b) => {
            const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0');
            const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0');
            return numA - numB;
        });

    let indexContent = `# 📚 笔记索引

> 共 ${files.length} 篇笔记

---

`;

    // 按标签分组
    const notesByTag = {};
    const allNotes = [];

    files.forEach(file => {
        const filePath = path.join(NOTES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // 提取元数据
        const titleMatch = content.match(/title:\s*(.+)/);
        const tagsMatch = content.match(/tags:\s*(.+)/);
        const createdMatch = content.match(/created:\s*(.+)/);

        const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');
        const tagsStr = tagsMatch ? tagsMatch[1].trim() : '';
        const created = createdMatch ? createdMatch[1].trim() : '';

        // 解析标签
        const tags = tagsStr.match(/`([^`]+)`/g)?.map(t => t.replace(/`/g, '')) || [];

        const noteInfo = {
            file,
            title,
            tags,
            created
        };

        allNotes.push(noteInfo);

        // 按标签分组
        tags.forEach(tag => {
            if (!notesByTag[tag]) {
                notesByTag[tag] = [];
            }
            notesByTag[tag].push(noteInfo);
        });
    });

    // 生成时间线
    indexContent += `## 📅 时间线\n\n`;
    allNotes.forEach(note => {
        const tags = note.tags.map(t => `\`${t}\``).join(' ');
        indexContent += `- **[${note.title}](${note.file})** ${tags}\n  - 📅 ${note.created}\n\n`;
    });

    // 生成标签分类
    if (Object.keys(notesByTag).length > 0) {
        indexContent += `---\n\n## 🏷️ 标签分类\n\n`;

        Object.keys(notesByTag).sort().forEach(tag => {
            indexContent += `### ${tag}\n\n`;
            notesByTag[tag].forEach(note => {
                indexContent += `- [${note.title}](${note.file})\n`;
            });
            indexContent += `\n`;
        });
    }

    indexContent += `---\n\n*最后更新: ${formatDate(new Date())}*\n`;

    fs.writeFileSync(INDEX_FILE, indexContent, 'utf8');
    console.log(`${colors.green}✓${colors.reset} 索引文件已更新`);
}

// 主函数
async function main() {
    console.log(`\n${colors.bright}${colors.cyan}=================================`);
    console.log(`   📝 笔记生成器`);
    console.log(`=================================${colors.reset}\n`);

    try {
        // 确保目录存在
        ensureNotesDir();

        // 步骤1: 输入标题
        console.log(`${colors.yellow}步骤 1/2:${colors.reset} 请输入笔记标题`);
        const title = await question(`${colors.cyan}标题:${colors.reset} `);

        if (!title.trim()) {
            console.log(`${colors.yellow}⚠${colors.reset} 标题不能为空，已取消`);
            rl.close();
            return;
        }

        // 步骤2: 输入标签
        console.log(`\n${colors.yellow}步骤 2/2:${colors.reset} 请输入标签（用空格隔开）`);
        console.log(`${colors.blue}提示词:${colors.reset} 前端 服务端 Go Python Node RN 产品思维 AI Web3 React Vue Angular\n`);
        const tagsInput = await question(`${colors.cyan}标签:${colors.reset} `);

        const tags = tagsInput.trim() ? tagsInput.trim().split(/\s+/) : ['未分类'];

        // 生成文件
        const number = getNextNumber();
        const fileName = `${String(number).padStart(3, '0')}-${sanitizeFileName(title)}.md`;
        const filePath = path.join(NOTES_DIR, fileName);
        const createdTime = formatDate(new Date());

        const content = generateNoteContent(title, tags, createdTime);
        fs.writeFileSync(filePath, content, 'utf8');

        console.log(`\n${colors.green}✓${colors.reset} 笔记创建成功！`);
        console.log(`${colors.bright}文件名:${colors.reset} ${fileName}`);
        console.log(`${colors.bright}路径:${colors.reset} ${filePath}`);
        console.log(`${colors.bright}标签:${colors.reset} ${tags.join(', ')}`);

        // 更新索引
        updateIndex();

        console.log(`\n${colors.green}${colors.bright}🎉 完成！${colors.reset}\n`);

    } catch (error) {
        console.error(`\n${colors.yellow}错误:${colors.reset}`, error.message);
    } finally {
        rl.close();
    }
}

// 运行
main();