// エディタ用のページ作りました
// あのエディタクソだな・・キーでブロック配置するとかあほか・・クリックで選択できるようにした方が
// 明らかに楽だろっていうね。
// ステージ選んで番号別にいろいろいじっていろいろ。よし。

function setup() {
	createCanvas(windowWidth, windowHeight);
	background(100);
}

function draw() {
	ellipse(mouseX, mouseY, 20, 20);
}
