// 公式编辑部分

MathJax.Hub.Config({
	// 表示在页面加载时不自动进行数学公式的渲染。
    skipStartupTypeset: true,
	// 表示不显示MathJax处理数学公式的提示信息。
    showProcessingMessages: false,
    tex2jax: {
		// 内联公式
        inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"]
        ],
		// 行间公式
        displayMath: [
            ["$$", "$$"],
            ["\\[", "\\]"]
        ],
        processEscapes: true
    },
	// 编号部分的实现
    TeX: {
        equationNumbers: {
            autoNumber: "AMS"
        }
    }
});

// Markdown到HTML的转换行为
marked.setOptions({
	// 启用智能列表功能
    smartLists: true,
	// 将一些特殊字符（如引号、破折号等）替换为对应的HTML实体
    smartypants: true
});

// 对字数计数的初始部分，收集
/**
 * @summary basic pluralization support
 * @param {number} amount
 * @param {string} word
 * @returns {string}
 */
const pluralize = (amount, word) => `${amount} ${word}${amount !== 1 ? "s" : ""}`;


// 预览功能包含的主要函数
const Preview = {
	
	// 一系列定义
    delay: 0,
    preview: null,//preview
    buffer: null,//buffer
    timeout: null,
    mjRunning: false,
    oldText: null,
	
	// 获取id信息
    Init() {
        this.preview = document.getElementById("viewer");
        this.buffer = document.getElementById("buffer");
        this.textarea = document.getElementById("getm");
        // this.wordcount = document.getElementById("wordcount");
        this.charcount = document.getElementById("charcount");
        this.save = document.getElementById("save");
    },
	
	// 交换两个HTML元素的属性值来交换显示状态，buffer元素被隐藏，而preview元素被显示出来。（从左界面到右界面）？？
    SwapBuffers() {
        let buffer = this.preview;
        let preview = this.buffer;
        this.buffer = buffer;
        this.preview = preview;
        buffer.style.display = "none";
        preview.style.display = "flex";
    },
	
	// 更新定时器？？
    Update() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(this.callback, this.delay);
    },
	
	// 预览主体！！
    CreatePreview() {
		// 将定时器清除
        Preview.timeout = null;
		
		// 如果mjRunning为true直接返回
        if (this.mjRunning) {
            return;
        }
		
		// 如果text和oldtext相同直接返回, 不相同对text进行格式转换后赋值（转换成html）！！
        let text = this.textarea.value;
        if (text === this.oldtext) {
            return;
        }
        text = this.Escape(text);
        this.buffer.innerHTML = this.oldtext = text;
        this.mjRunning = true;
		
		// 检查是否配置完成
        MathJax.Hub.Configured();
		// 数学公式进行排版和渲染、 调用PrevieDone函数预览 、重置数学公式的编号
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, this.buffer], ["PreviewDone", this], ["resetEquationNumbers", MathJax.InputJax.TeX]);
        // 定义一个正则表达式，用于匹配空白字符
		
		const regex = /\s+/gi;
		// 判断text是否不等于空字符串。如果不是空字符串：
        const hasText = text !== "";
		//1.将处理过的text按空白字符分割成数组，并获取数组的长度作为单词数量
        // const wordCount = hasText ? text.trim().replace(regex, " ").split(" ").length : 0;
		//2.将处理后的text去除空白字符后的长度作为字符数量
        const charCount = hasText ? text.replace(regex, "").length : 0;
        // 对字数的计数！！！！！！此处存在一个bug，如果是全中文论文，Char代表字数，Word失效，英语则有效。
		// ！！！！！！要适用中文论文,解决方法就是不计数word部分,只保存char作为汉字计数
        // this.wordcount.innerHTML = pluralize(wordCount, "Word");
        this.charcount.innerHTML = pluralize(charCount, "Char");
        
		// 更新行号与列号显示
        updateLineNoColNo();
    },
	
	// 预览函数
    PreviewDone() {
		// 将mjRunning置否
        this.mjRunning = false;
		//将buffer中的html元素提出来，调用PartialDescape进行反转义
        text = this.buffer.innerHTML;
        text = this.PartialDescape(text);
		//更新预览区域内容
        this.buffer.innerHTML = DOMPurify.sanitize(marked.parse(text));   // Sanitize output HTML
		//代码高亮处理
        document.querySelectorAll("code").forEach((block) => {
            hljs.highlightBlock(block);
        });
		//调用SwapBuffers，将内容传到右侧？
        this.SwapBuffers();
    },
	
	// 转义HTML字符串,进行空格、小于号等符号的转换
    Escape(html, encode) {
        return html.replace(!encode ? /&(?!#?\w+;)/g : /&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },
	
	//反转义 HTML 字符串，主要针对 ">"、"<"、'"'、"'" 这些字符，以及代码块的处理
    PartialDescape(html) {
		// 按照换行符 \n 进行分割，得行数组
        let lines = html.split("\n");
        let out = "";
        let inside_code = false;
        for (let i = 0; i < lines.length; i += 1) {
            if (lines[i].startsWith("&gt;")) {
                lines[i] = lines[i].replace(/&gt;/g, ">");
            }
			// 如果在代码内部
            if (inside_code) {
                lines[i] = lines[i].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            }
            if (lines[i].startsWith("```")) {
                inside_code = !inside_code;
            }
            out += `${lines[i]}\n`;
        }
        return out;
    },
	
	// 按下的键是否为普通字符键，更新预览区域的显示内容（如果不是，则显示输入的Markdown文本的预览渲染效果）
    UpdateKeyPress({
        keyCode
    }) {
        if (keyCode < 16 || keyCode > 47) {
            this.preview.innerHTML = `<p>${marked.parse(this.textarea.value)}</p>`;
            this.buffer.innerHTML = `<p>${marked.parse(this.textarea.value)}</p>`;
        }
        this.Update();
    },
	// 清空功能
    ClearPreview() {
        this.preview.innerHTML = '';
        this.buffer.innerHTML = '';
		// 对字数的计数
        // this.wordcount.innerHTML = pluralize(0, "Word");
        this.charcount.innerHTML = pluralize(0, "Char");
        updateLineNoColNo();
    }
};


// 在预览对象上设置回调函数，并进行初始与更新
Preview.callback = MathJax.Callback(["CreatePreview", Preview]);
Preview.callback.autoReset = true;
Preview.Init();
Preview.Update();


const mark = document.getElementById("getm");

// 更新行号与列号函数
const updateLineNoColNo = () => {
	// 获取对应id的html元素
    const lineno = document.getElementById("lineno");
    const colno = document.getElementById("colno");
	// 获取文本框或输入框中当前光标所在位置之前的文本行
    const textLines = mark.value.substr(0, mark.selectionStart).split("\n");
    lineno.innerHTML = `Line ${textLines.length}`;//行号
    colno.innerHTML = `Col ${textLines[textLines.length - 1].length}`;//列号
};

// 光标关联行号与列号
mark.addEventListener("mouseup", updateLineNoColNo);
// 键盘左右关联行号与列号
mark.addEventListener("keyup", ({ key }) => {
	//判断是否为左右键
    const isArrow = ["ArrowLeft", "ArrowRight"].some((k) => k === key);
    if (!isArrow) return;
    updateLineNoColNo();
});





//主题切换
// 黑白主题切换部分，并使其保持状态
const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
// 黑夜主题
if (localStorage.getItem("Theme") == "Dark") {
	// 使用CSS里面的dark设置
    document.documentElement.setAttribute("data-theme", "dark");
    document.querySelector("meta[name=theme-color]").setAttribute("content", "#282a36");
    toggleSwitch.checked = true;//勾选复选框
    localStorage.setItem("Theme", "Dark");//存本地
} else {
    document.documentElement.setAttribute("data-theme", "light");
    document.querySelector("meta[name=theme-color]").setAttribute("content", "#DAE5ED");
    toggleSwitch.checked = false;
    localStorage.setItem("Theme", "Light");
}
// 主题切换补充
const switchTheme = ({
    target
}) => {
    if (target.checked) {
        document.documentElement.setAttribute("data-theme", "dark");
        document.querySelector("meta[name=theme-color]").setAttribute("content", "#282a36");
        localStorage.setItem("Theme", "Dark");
    } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.querySelector("meta[name=theme-color]").setAttribute("content", "#DAE5ED");
        localStorage.setItem("Theme", "Light");
    }
};
//在toggleSwitch的状态改变时自动调用switchTheme函数来切换页面主题
toggleSwitch.addEventListener("change", switchTheme, false);



//打开文件
const openFile = ({
    target
}) => {
    let input = target;
    let reader = new FileReader();
	//文件读取完成后
    reader.onload = () => {
        document.getElementById("getm").value = reader.result;
        input.value = "";
        Preview.Update();
    };
	//读取文件，解析文本
    reader.readAsText(input.files[0]);
};

// 拖拽选择文件
const handleFileSelect = (evt) => {
	// 防止事件冒泡，防止事件继续传播到其他元素,避免打开文件的默认行为
    evt.stopPropagation();
    evt.preventDefault();
    const files = evt.dataTransfer.files;
    const reader = new FileReader();
	//文件读取完成后
    reader.onload = ({
        target
    }) => {
        document.getElementById("getm").value = target.result;
        Preview.Update();
    };
    reader.readAsText(files[0], "UTF-8");
};
// 拖拽时复制
const handleDragOver = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
};
//将拖拽文件和导入文件 与getm关联起来
let dropZone = document.getElementById("getm");
dropZone.addEventListener("dragover", handleDragOver, false);
dropZone.addEventListener("drop", handleFileSelect, false);


//快捷键文件选择与保存
document.onkeyup = ({
    altKey,
    which
}) => {
	// CTRL＋O打开文件
    if (altKey && which == 79) {
        document.getElementById("file").click();
    } // CTRL＋S保存文件
	else if (altKey && which == 83) {
        document.getElementById("save").click();
    }
};


// 各个按键前后缀的整体处理
const apply = (e) => {
    let myField = document.getElementById("getm");

    const valueMap = {
        bold: ["**", "**"],
        italic: ["*", "*"],
        strike: ["~", "~"],
        h1: ["# ", ""],
        h2: ["## ", ""],
        h3: ["### ", ""],
        bq: ["> ", ""],
        ol: ["1. ", ""],
        ul: ["- ", ""],
        ic: ["`", "`"],
        bc: ["```\n", "\n```"],
        link: ["[", "]()"],
        check: ["- [x] ", ""],
        image: ["![alt text](image.jpg)", ""],
        hr: ["---\n", ""],
        table: [
            "| Header | Title |\n| ----------- | ----------- |\n| Paragraph | Text |\n",
            "",
        ],
		formula1: ["$", "$"],
		formula2: ["$$", "$$"],
		formula3: ["\\begin{equation}\n", "type \\quad formula \\quad here...\n\\end{equation}"]
    };

    // 将获取的前后缀分别赋值，对选中部分进行处理
    const [myValueBefore, myValueAfter] = valueMap[e];
    //判断是否为旧版本的IE浏览器，
    if (document.selection) {
        myField.focus();
        var selectionText = document.selection.createRange().text;
        if (myValueBefore && myValueAfter && selectionText.startsWith(myValueBefore) && selectionText.endsWith(myValueAfter)) {
            selectionText = selectionText.slice(myValueBefore.length, -myValueAfter.length);
        } else {
            // Apply Style
            selectionText = myValueBefore + selectionText + myValueAfter;
        }
    } else if (myField.selectionStart || myField.selectionStart == "0") {
		// 获取！！光标！！选中文本的起始位置和结束位置
        let startPos = myField.selectionStart;
        let endPos = myField.selectionEnd;
		// 获取选中的文本内容
        var selectionText = myField.value.substring(startPos, endPos);
		//判断是否为myValueBefore和myValueAfter的形式，并删去前后缀
        if (myValueBefore && selectionText.startsWith(myValueBefore) && selectionText.endsWith(myValueAfter)) {
            if (myValueAfter.length == 0) {
                selectionText = selectionText.slice(myValueBefore.length);
            } else {
                selectionText = selectionText.slice(myValueBefore.length, -myValueAfter.length);
            }
			//选取起始位置之前和之后的内容，并将其和处理后的连接在一起
            myField.value = myField.value.substring(0, startPos) + selectionText + myField.value.substring(endPos, myField.value.length);
            // 初始位置不变
			myField.selectionStart = startPos;
			//更改结束位置
            myField.selectionEnd = endPos - myValueBefore.length - myValueAfter.length;
            myField.focus();
        } 
		// 将样式文本插入到原来的文本中，并更新文本输入框的选中范围和焦点位置
		else {
            // Apply Style
            myField.value = myField.value.substring(0, startPos) + myValueBefore + myField.value.substring(startPos, endPos) + myValueAfter + myField.value.substring(endPos, myField.value.length);
            myField.selectionStart = startPos;
            myField.selectionEnd = endPos + myValueBefore.length + myValueAfter.length;
            myField.focus();
        }
    }
    Preview.Update();
};






const slide = (e) => {
	// 获取viewer和getm元素
    let viewer = document.getElementById("viewer");
    let mark = document.getElementById("getm");
	
    // 三种不同的样式，对应不同的数值
    const styleMap = {
        "nill": {
            viewer: ["100vw", "16px"],
            mark: ["0", "0"]
        },
        "half": {
            viewer: ["50vw", "16px"],
            mark: ["50vw", "16px"]
        },
        "full": {
            viewer: ["0", "0"],
            mark: ["100vw", "16px"]
        }
    };
    
	// 获取三种styleMap
    const style = styleMap[e];
	// 分别设置viewer的宽度和内边距
    viewer.style.width = style.viewer[0];
    viewer.style.padding = style.viewer[1];
	// 分别设置mark的宽度和内边距
    mark.style.width = style.mark[0];
    mark.style.padding = style.mark[1];
};


//About部分实现 ，点击一个按钮显示或隐藏about窗口
const About = document.getElementById("About");
const ToggleAbout = document.getElementById("ToggleAbout");
const CloseAbout = document.getElementById("CloseAbout");
// 切换 About 元素的类列表中的 "show-modal" 类的存在与否，从而控制 About 元素的显示或隐藏
const OpenCloseAbout = () => About.classList.toggle("show-modal");
const AboutOnClick = ({
    target
}) => {
    if (target === About) {
        OpenCloseAbout();
    }
};
ToggleAbout.addEventListener("click", OpenCloseAbout);
CloseAbout.addEventListener("click", OpenCloseAbout);

//Save部分实现 ，点击一个按钮显示或隐藏Save窗口
const SaveFile = document.getElementById("SaveFileModal");
const ToggleSaveFile = document.getElementById("ToggleSaveFile");
const CloseSaveFile = document.getElementById("CloseSaveFile");
// 切换 Save 元素的类列表中的 "show-modal" 类的存在与否，从而控制 Save 元素的显示或隐藏
const OpenCloseSaveFile = () => SaveFile.classList.toggle("show-modal");
const SaveFileOnClick = ({
    target
}) => {
    if (target === SaveFile) {
        OpenCloseSaveFile();
    }
};
ToggleSaveFile.addEventListener("click", OpenCloseSaveFile);
CloseSaveFile.addEventListener("click", OpenCloseSaveFile);


//Settings部分实现 ，点击一个按钮显示或隐藏Settings窗口
const Settings = document.getElementById("Settings");
const ToggleSettings = document.getElementById("ToggleSettings");
const CloseSettings = document.getElementById("CloseSettings");
// 切换 Settings 元素的类列表中的 "show-modal" 类的存在与否，从而控制 Settings 元素的显示或隐藏
const OpenCloseSettings = () => Settings.classList.toggle("show-modal");
const SettingsOnClick = ({
    target
}) => {
    if (target === Settings) {
        OpenCloseSettings();
    }
};
ToggleSettings.addEventListener("click", OpenCloseSettings);
CloseSettings.addEventListener("click", OpenCloseSettings);




// 下载部分
// 获取元素
let errorText=document.getElementById("error");
let button=document.getElementById('btn');
let textbox=document.querySelector('#SaveFileInput');
function DownloadFile() {
    let DownloadName = document.getElementById("SaveFileInput").value;
    //未填写保存文件名，出现报错
    if(DownloadName===''){
        errorText.innerHTML="Set name for your file";
        textbox.style.borderColor='rgb(207, 54, 54)';
    }
    else{
        let text = document.getElementById("getm").value;
        text = text.replace(/\n/g, "\r\n");
        let blob = new Blob([text], {
            type: "text/plain"
        });
        let anchor = document.createElement("a");
        anchor.download = DownloadName + ".md";
        anchor.href = window.URL.createObjectURL(blob);
        anchor.target = "_blank";
        anchor.style.display = "none";
		//将a添加如body部分
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        OpenCloseSaveFile();
        //保存后清空输入框
        document.getElementById("SaveFileInput").value='';
        document.getElementById("DownloadFileForm").reset;
    }
	//报错后改变，消除error提示
    textbox.addEventListener('change', validait=>{
        errorText.innerHTML='';
        textbox.style.borderColor='rgb(201, 207, 212)';
         
    });

}

//清除
const clearTextArea = () => {
    document.getElementById("getm").value = '';
    Preview.ClearPreview();
};

// 页面加载时将之前保存的文本内容恢复到文本框中
let scratchpad = document.querySelector("#getm")
scratchpad.value = localStorage.getItem("notes")

let cancel
// 监听文本框的键盘输入
scratchpad.addEventListener("keyup", event => {
  if (cancel) clearTimeout(cancel)
  // 延迟 1000 毫秒（即 1 秒）后执行回调函数
  cancel = setTimeout(() => {
    localStorage.setItem("notes", event.target.value)
  }, 1000)
})

 // "Tab" 键插入一个制表符
document.getElementById("getm").addEventListener("keydown",function(e){
	// 是否按下Tab
    if(e.key=="Tab"){
		//防止光标错误移动
        e.preventDefault();
		// 获取起始位置
        let start=this.selectionStart;
        let end=this.selectionEnd;
        // 将光标定位到插入的制表符后面
        this.value=this.value.substring(0,start)+"\t"+this.value.substring(end);
        this.selectionStart=this.selectionEnd=start+1;
        console.log("Tab Key was clicked and space is apended");
    }
});
