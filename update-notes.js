#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
    red: '\x1b[31m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
};

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 检查笔记文件格式是否符合要求
 * @param {string} filePath - 文件路径
 * @param {string} fileName - 文件名
 * @returns {Object} 检查结果
 */
function checkNoteFormat(filePath, fileName) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        const result = {
            fileName,
            isValid: true,
            errors: [],
            warnings: [],
            metadata: {}
        };

        // 检查1: 是否以 --- 开头（YAML front matter）
        if (!content.startsWith('---')) {
            result.isValid = false;
            result.errors.push('缺少 YAML front matter (文件应以 --- 开头)');
            return result;
        }

        // 提取 YAML front matter
        const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!yamlMatch) {
            result.isValid = false;
            result.errors.push('YAML front matter 格式不正确');
            return result;
        }

        const yamlContent = yamlMatch[1];

        // 检查2: 必须包含 title
        const titleMatch = yamlContent.match(/title:\s*(.+)/);
        if (!titleMatch) {
            result.isValid = false;
            result.errors.push('缺少 title 字段');
        } else {
            result.metadata.title = titleMatch[1].trim();
        }

        // 检查3: 必须包含 tags
        const tagsMatch = yamlContent.match(/tags:\s*(.+)/);
        if (!tagsMatch) {
            result.isValid = false;
            result.errors.push('缺少 tags 字段');
        } else {
            result.metadata.tagsRaw = tagsMatch[1].trim();
            // 解析标签 - 支持 YAML 数组格式
            const tagsStr = tagsMatch[1].trim();
            let tags = [];

            // 尝试解析 [tag1, tag2, tag3] 格式
            if (tagsStr.startsWith('[') && tagsStr.endsWith(']')) {
                tags = tagsStr.slice(1, -1).split(',').map(t => t.trim()).filter(t => t);
            }
            // 兼容旧的反引号格式（用于迁移）
            else if (tagsStr.includes('`')) {
                tags = tagsStr.match(/`([^`]+)`/g)?.map(t => t.replace(/`/g, '')) || [];
            }
            // 支持逗号分隔的简单格式
            else if (tagsStr.includes(',')) {
                tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
            }

            result.metadata.tags = tags;

            if (tags.length === 0) {
                result.warnings.push('tags 字段为空或格式不正确（应使用数组格式，如 [前端, React]）');
            }
        }

        // 检查4: 必须包含 created
        const createdMatch = yamlContent.match(/created:\s*(.+)/);
        if (!createdMatch) {
            result.isValid = false;
            result.errors.push('缺少 created 字段');
        } else {
            result.metadata.created = createdMatch[1].trim();
        }

        // 检查5: 文件内容是否包含标题
        const contentAfterYaml = content.substring(yamlMatch[0].length);
        const h1Match = contentAfterYaml.match(/^#\s+(.+)/m);
        if (!h1Match) {
            result.warnings.push('文件内容缺少一级标题 (# 标题)');
        } else {
            // 检查标题是否与 title 一致
            const contentTitle = h1Match[1].trim();
            if (result.metadata.title && contentTitle !== result.metadata.title) {
                result.warnings.push(`内容标题 "${contentTitle}" 与元数据 title "${result.metadata.title}" 不一致`);
            }
        }

        // 检查6: 是否包含标签部分
        if (!contentAfterYaml.includes('## 📌 标签')) {
            result.warnings.push('缺少标签部分 (## 📌 标签)');
        }

        // 检查7: 是否包含内容部分
        if (!contentAfterYaml.includes('## 📝 内容')) {
            result.warnings.push('缺少内容部分 (## 📝 内容)');
        }

        return result;

    } catch (error) {
        return {
            fileName,
            isValid: false,
            errors: [`读取文件失败: ${error.message}`],
            warnings: [],
            metadata: {}
        };
    }
}

/**
 * 扫描所有笔记文件
 * @returns {Array} 所有笔记的检查结果
 */
function scanAllNotes() {
    if (!fs.existsSync(NOTES_DIR)) {
        console.log(`${colors.red}✗${colors.reset} notes 目录不存在`);
        return [];
    }

    const files = fs.readdirSync(NOTES_DIR)
        .filter(file => file.endsWith('.md') && file !== 'INDEX.md')
        .sort((a, b) => {
            const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0');
            const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0');
            return numA - numB;
        });

    const results = [];

    files.forEach(file => {
        const filePath = path.join(NOTES_DIR, file);
        const result = checkNoteFormat(filePath, file);
        results.push(result);
    });

    return results;
}

/**
 * 更新索引文件
 * @param {Array} validNotes - 所有有效的笔记信息
 */
function updateIndex(validNotes) {
    let indexContent = `# 📚 笔记索引

> 共 ${validNotes.length} 篇笔记

---

`;

    // 按标签分组
    const notesByTag = {};
    const allNotes = [];

    validNotes.forEach(note => {
        const noteInfo = {
            file: note.fileName,
            title: note.metadata.title,
            tags: note.metadata.tags,
            created: note.metadata.created
        };

        allNotes.push(noteInfo);

        // 按标签分组
        note.metadata.tags.forEach(tag => {
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
}

/**
 * 主函数
 */
function main() {
    console.log(`\n${colors.bright}${colors.cyan}=================================`);
    console.log(`   🔄 笔记更新器`);
    console.log(`=================================${colors.reset}\n`);

    // 第一步：扫描所有笔记
    console.log(`${colors.yellow}步骤 1/2:${colors.reset} 扫描笔记文件并检查格式...\n`);

    const results = scanAllNotes();

    if (results.length === 0) {
        console.log(`${colors.yellow}⚠${colors.reset} 没有找到笔记文件\n`);
        return;
    }

    // 统计信息
    const validNotes = results.filter(r => r.isValid);
    const invalidNotes = results.filter(r => !r.isValid);
    const notesWithWarnings = results.filter(r => r.warnings.length > 0);

    console.log(`${colors.bright}扫描结果:${colors.reset}`);
    console.log(`  - 总文件数: ${colors.cyan}${results.length}${colors.reset}`);
    console.log(`  - 格式正确: ${colors.green}${validNotes.length}${colors.reset}`);
    console.log(`  - 格式错误: ${colors.red}${invalidNotes.length}${colors.reset}`);
    console.log(`  - 有警告: ${colors.yellow}${notesWithWarnings.length}${colors.reset}\n`);

    // 显示格式不符合的文件
    if (invalidNotes.length > 0) {
        console.log(`${colors.red}${colors.bright}❌ 格式不符合要求的文件:${colors.reset}\n`);

        invalidNotes.forEach((note, index) => {
            console.log(`${colors.bright}${index + 1}. ${note.fileName}${colors.reset}`);
            note.errors.forEach(error => {
                console.log(`   ${colors.red}✗${colors.reset} ${error}`);
            });
            console.log('');
        });
    }

    // 显示有警告的文件
    if (notesWithWarnings.length > 0) {
        console.log(`${colors.yellow}${colors.bright}⚠️  有警告的文件:${colors.reset}\n`);

        notesWithWarnings.forEach((note, index) => {
            console.log(`${colors.bright}${index + 1}. ${note.fileName}${colors.reset}`);
            note.warnings.forEach(warning => {
                console.log(`   ${colors.yellow}⚠${colors.reset} ${warning}`);
            });
            console.log('');
        });
    }

    // 第二步：更新索引文件
    if (validNotes.length > 0) {
        console.log(`${colors.yellow}步骤 2/2:${colors.reset} 更新索引文件...\n`);

        try {
            // 读取旧的索引文件（如果存在）
            let oldIndexContent = '';
            if (fs.existsSync(INDEX_FILE)) {
                oldIndexContent = fs.readFileSync(INDEX_FILE, 'utf8');
            }

            // 更新索引
            updateIndex(validNotes);

            // 读取新的索引文件
            const newIndexContent = fs.readFileSync(INDEX_FILE, 'utf8');

            // 比较是否有变化
            if (oldIndexContent !== newIndexContent) {
                console.log(`${colors.green}✓${colors.reset} 索引文件已更新`);
                console.log(`${colors.bright}路径:${colors.reset} ${INDEX_FILE}\n`);
            } else {
                console.log(`${colors.blue}ℹ${colors.reset} 索引文件无需更新（内容未变化）\n`);
            }

        } catch (error) {
            console.log(`${colors.red}✗${colors.reset} 更新索引文件失败: ${error.message}\n`);
        }
    }

    // 总结
    console.log(`${colors.bright}${colors.cyan}=================================`);
    if (invalidNotes.length === 0 && notesWithWarnings.length === 0) {
        console.log(`${colors.green}✓ 所有笔记格式正确！${colors.reset}`);
    } else if (invalidNotes.length === 0) {
        console.log(`${colors.yellow}⚠ 所有笔记可用，但有 ${notesWithWarnings.length} 个警告${colors.reset}`);
    } else {
        console.log(`${colors.red}✗ 发现 ${invalidNotes.length} 个格式错误${colors.reset}`);
    }
    console.log(`=================================${colors.reset}\n`);
}

// 运行
main();