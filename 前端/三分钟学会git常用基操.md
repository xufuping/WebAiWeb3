# 三分钟学会git基操

### 引言

<p align=center>
<img src="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2d05e2e65b214a3bb5e7d6ba1db98a3b~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=443&h=591&s=1479704&e=gif&f=19&b=f9e0f1" width="200px" />
</p>

在互联网漂泊多年，确实很难找到第二个如此简单且复杂，抽象且具体，稳重且性感的应用——Github, 一个代码托管平台。

它是程序猿的大保健，攻城狮的艾玛尼。正所谓西方不能没有耶路撒冷，篮球不能没有坤，developer不能没有G。Github，在程序开发界有着一发入魂且不可撼动的地位。

作为有容乃大的开源圣地，它可以说是白嫖党的福音，内含丰富的软件资源、优质的魔改应用、期末复习资料、各种收集汇总以及数不清的优秀插件。白嫖一时爽，一直白嫖一直爽。不需要300加⏰，所有的一切在github皆开（免）源（费），无偿贡献给广大群众。从某种角度上来说：从群众中来，到群众中去。

接下来我将结合个人Git使用经验，分享如何三分钟学会git基本命令操作。

### 基操
*git的安装和github的注册移步[这里](https://juejin.cn/spost/7379443863692640291)*

首先说明，所有命令操作都可以使用 [GitHub Desktop](https://desktop.github.com/) 来进行可视化操作，使用教程可以点击[这里](https://docs.github.com/en/desktop/installing-and-authenticating-to-github-desktop/authenticating-to-github-in-github-desktop)。

其次，如果你想要下载你的github仓库或你加入团队的github仓库代码，你需要[配置ssh](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account?tool=webui)来保证钥匙对齐。


### 版本/下载(克隆)
```shell
git -v # 查看git版本；确认git是否成功安装
git clone [repo-url] # 下载（克隆）项目；相对于直接下载会有.git痕迹
git status # 查看项目状态
```

### 切换分支
```shell
git checkout 分支名 # 切换到指定分支
git checkout -b 分支名 # 切换并创建一个新分支
```

### 提交代码
```shell
# 提交代码
git add . # 添加到暂存区
git commit -a -m "your message" # 提交到本地仓库生成commit记录
git push origin [your-branch] # 提交到github仓库
```

如果你的仓库代码并不是克隆下载或者没有.git历史，那么你需要初始化你的项目并且添加上传源。
```shell
git init
git remote add origin [url-源]

```

如果你需要合并多个commit你可以看[这个](https://cloud.tencent.com/developer/article/1690638)

### 拉取更新代码

```shell
# 拉取更新本地代码
git pull origin [your-branch] --rebase # 拉取更新合并代码并变基--变基简单理解为更干净的清理commit提交历史
git rebase --continue # 多次变基需要多次进行下一步
git rebase --abort # 取消整个变基过程
```

如果此处有代码冲突，可以在 vscode 里解决完冲突后执行提交到本地仓库

```shell
# 1. 代码里处理冲突
# 2. 提交到本地git仓库
git add .
git commit -a -m "your message"
# 3. 这时候弹出commit变基后的commit信息，不做额外修改可以直接按esc然后输入：
:wq! # 保存且退出
```

### 放弃修改
1. 没有git add放弃修改和新增
```shell
git checkout -- 文件名 # 单文件放弃修改
git checkout . # 放弃所有修改
rm 文件名/ rm 文件夹 -rf # 放弃单个新增文件
git clean -xdf # 放弃所有新增文件
```

2. git add 放弃修改
```shell
git reset HEAD 文件名 # 单文件放弃修改
git reset HEAD . # 所有文件放弃修改
```

3. git add & git commit 放弃修改
```shell
git reset commit_id # 撤销commit（撤销之后，你所做的已经commit的修改还在工作区）
git reset --hard commit_id # 撤销commit（撤销之后，你所做的已经commit的修改将会清除，仍在工作区/暂存区的代码也将会清除）
```

### 暂存
暂时存储你的修改内容，然后恢复到未修改状态。

```shell
git stash # 备份当前工作区内容，提交相关内容缓存，让工作区保证和上次提交的内容一致。同时，将当前工作区内容保存到git栈中。
git stash pop #从Git栈中读取最近一次保存的内容，恢复工作区的相关内容。由于可能存在多个Stash的内容，所以用栈来管理，pop会从最近的一个stash中读取内容并恢复。
git stash save AA # 储存名为AA的暂存
git stash pop ${0} # 恢复第一个暂存
git stash list # 显示Git栈内的所有备份，可以利用这个列表来决定从那个地方恢复。
git stash clear # 清空Git缓存栈。
```

### 查看commit修改
```shell
git log # 查看所有的commit提交记录
git show # 查看最新的commit
git show commitId # 查看指定commit hashID的所有修改
git show commitId fileName # 查看某次commit中具体某个文件的修改
```

### cherry-pick
有时候我们需要从历史提交的某个记录里切出一个分支来进行修复发布，比如针对项目的某一历史版本进行一个必要修复。这时候我们就需要用到chrry pick:

1. 在最新的master分支上，切一个新分支比如就叫cherry-pick
2. 然后选则需要cherry-pick的分支。这里用vscode的git插件来举例，vscode->git->remotes，找到需要cherry-pick的commit，然后右键选择进行cherry pick。
3. 弹窗里面选择edit->然后diff修改差异代码->然后提交代码->提交pr进行review并合并到特定分支里

![123](https://cdn.nlark.com/yuque/0/2023/png/200061/1687507380701-dd3d5b03-6e0b-42f4-97b8-58490660603b.png?x-oss-process=image%2Fformat%2Cwebp%2Fresize%2Cw_750%2Climit_0)

### fork & pr 开发方式
[采用 fork 和 Pr 的开发方式](https://www.zhihu.com/question/20431718/answer/74250205)

### 清空git副作用
有时候一些不在当前版本控制下的文件影响到了我们的项目，带来一些运行副作用，那么可以使用 `git clean -dfX` 来清理。

### 额外的

其实commit和分支的命名也都有一定规范，官方[commit规范](https://gist.github.com/stephenparish/9941e89d80e2bc58a153)可以看这个，也要结合团队开发规范来使用，目的是能够更好保存/回溯/回退代码。
