// STGもどきの前段階としてブロック崩しに挑戦します。サイズは480x400でpythonからの移植。
// ステージを構成するjsonは別ルートで構成する流れ・・うまくいくか知らんけど
// GLSLでもいいか？ピクセル単位で処理するとか。ステージメーカー的な。で、色取得でステージを作るみたいな。うん。
// となるとエディタも作らないと・・めんど。

// 説明書きはModeのところでやろうね
// 背景は三角形や四角形のコラージュ的な（ランダム配置みたいな）
// 単なるグラデだと芸がないので
// まあロジック移植してからでいいです（テトリスの方もそこら辺いじりたいけどまあいいか別に）（STEP10で）

// ステージエディタがないと話にならないので
// 1x1,1x2,2x1,2x2と黄緑とか緑の壊しにくいやつなどなど灰色の壊せないやつとかクリックでそこに配置されて色情報、
// 色情報からそれを元にして・・
// データとしてはどこにどのブロックがあるってだけの話だから。
// ビジュアルだけ分かりやすくしてそれとは別にどこ・・jsonの方がいいな。saveJSONってあるからこれ使うね
// イメージ：{"blue1":[[2, 3], [4, 7], ...]}
// 左上のグリッド番号の配列。存在するものすべてについて。jsonのまま保持しておいて
// アイキャッチに来るたびに実物（ブロッククラスの集合体）に変換し終わったら破棄する
// 作るやつは別に作る(22x13らしい), ひとつひとつが20x20なので440x260だけどそれと別にいろいろ必要そう（ブロック選択とかセーブボタンとか）
// ブロック選択は画像使いたいよね
// ステージ作りとかはまあ、移植なので余計なことは考えなくていいよ

// まああれ、つぶつぶ以外で受けるもの作るにはこれくらいやってデフォールトってわけ。じゃなきゃまたつぶつぶ量産しないといけない
// それもネタ切れになったらおわり
// 厳しいなぁ
// 去年はそれやったせいで熱出してアウトになってそこからピアノやめるとかいろいろ方針転換した
// 今年それやったら下手すると人生詰むんで作戦「いのちをだいじに」で切るべきところはどんどん切っていこう

// エディタは後回し。先にブロッククラスかな。で、パーサー。で、サンプルを作ってそれを元にいろいろテスト。
// ステージもコピペでいい。一つ一つを簡単なシードにして。それで原型を作る。
// エディタはそのあと。
// 装飾はさらにそのあと。長丁場になる。
// 作ってた頃は働いてなかったからエネルギー全注力できたけど今はそれできないから少しずつ少しずつやっていくしかないわね。

// ライフは3, 6, 10, 15でいい気がしてきた。あと難易度丁度いい（気がする）のでこのまま作っちゃおう。
// 衝突判定単純でした。バリデーションかけたあと、移動後に衝突するならそれを使う感じで、あとぶつかった時の反射はその
// calc_is_farを使ってバリデーションかけてる、これがあれの時は判定に使わない、的な感じのあれ。
// colliderに相当するのはrectでしょう。これでいいか。
// つまりボールはrectと思ってやってるのね。

// サイズの確認
// 各ブロックは20x20が基本で最大で40x40とか20x200とか200x20
// ボールは16x16
// パドルは横幅が80,60,40,30で縦幅が5です（薄い）

// STEP1: system
// STEP2: state
// STEP3: title, select, mode (イマココ 2021/02/04)
// STEP4: play
// ↑ステージ関連のもろもろの準備は平行して行う
// ↑ここが一番時間かかるでしょうね
// ここさえ乗り切ればあとはとんとん拍子
// STEP5: pause
// STEP6: clear, allclear, gameover
// STEP7: detail
// STEP8: prepare images
// STEP9: prepare sounds
// STEP10: decoration

let mySystem;
const CANVAS_W = 480;
const CANVAS_H = 400;

// KEYCODE変数
const K_ENTER = 13;
const K_RIGHT = 39;
const K_LEFT = 37;
const K_UP = 38;
const K_DOWN = 40;
const K_SPACE = 32;

let huiFont;

function preload(){
	huiFont = loadFont("https://inaridarkfox4231.github.io/assets/HuiFont29.ttf");
}

function setup() {
	createCanvas(CANVAS_W, CANVAS_H);
	mySystem = new System();
}

function draw() {
	mySystem.update();
	mySystem.draw();
	mySystem.shift();
}

// 今回用意するstateは
// title, select, mode, eyecatch, start, play, pause, gameover, clear, allclear.
// allclearはすべてのstageをクリアしたら～みたいなやつ
// それぞれTitle, Select, Mode, Eyecatch, Start, Play, Pause, Gameover, Clear, Allclearという名前のクラスで
// 遷移については図を参照（こっちにも書くか）
// Modeでは難易度を選択する。パドルの長さ、初期ライフの大きさについて。
// eyecatchでステージシードを作りそれをstart経由でplayに渡して残機が続く限りそれを使って使いまわして
// ブロック全部壊したらクリアで全部クリアしたらタイトルに戻す
// てな感じで
class System{
	constructor(){
		this.state = {title:new Title(this), select:new Select(this), mode:new Mode(this), eyecatch: new Eyecatch(this), start: new Start(this), play: new Play()};
		this.currentState = this.state.title;
	}
  getState(stateName){
    if(stateName === ""){ return undefined; }
    return this.state[stateName];
  }
  setState(nextState){
    this.currentState.setNextState(""); // nextを先に初期化
    nextState.prepare(this.currentState); // 遷移前の諸準備
    this.currentState = nextState; // 移行
  }
	update(){
		this.currentState.update();
	}
	draw(){
		this.currentState.draw();
	}
	shift(){
    let nextState = this.currentState.getNextState();
    if(nextState !== undefined){
      this.setState(nextState);
    }
	}
}

class State{
	constructor(_node){
    this.node = _node;
    this.name = "";
		this.gr = createGraphics(CANVAS_W, CANVAS_H);
    this.nextState = undefined; // 次のstateが未定義でないときに遷移させる
	}
	drawPrepare(){} // 準備描画（最初に一回だけやる）
  getNextState(){ return this.nextState; }
  setNextState(stateName){
    this.nextState = this.node.getState(stateName);
  }
  prepare(_state){
    // 新しい状態に遷移するとき、前の状態の情報を元になんかする（なんかです）
    // たとえばselectからplayに行くときにmodeの情報を与えるとか
  }
  keyAction(code){}
	update(){}
	draw(){}
}

class Title extends State{
	constructor(_node){
		super(_node);
		this.name = "title";
		this.drawPrepare();
	}
  drawPrepare(){
		this.gr.background(80, 128, 255);
		this.gr.textFont(huiFont);
		this.gr.textAlign(CENTER, CENTER);
		this.gr.fill(0);
		this.gr.textSize(80);
		// ボールが跳ね回ってて文字に当たるとすこしずつ薄くなっていくとか
		// 当たるたびになんかパーティクル出すとかしたら面白いかも
		this.gr.text("BLOCKBREAK", CANVAS_W * 0.5, CANVAS_H * 0.33);
		this.gr.textSize(40);
		this.gr.text("PRESS ENTER KEY", CANVAS_W * 0.5, CANVAS_H * 0.6);
	}
	prepare(_state){}
  keyAction(code){
    // エンターキー押したらセレクトへ
    if(code === K_ENTER){
      this.setNextState("select");
    }
	}
	update(){}
	draw(){
		image(this.gr, 0, 0);
	}
}

class Select extends State{
	constructor(_node){
		super(_node);
		this.name = "select";
		this.mode = 0;
		this.choiceLength = 6; // 0:TO TITLE, 1～5:ステージ（EXTRAも21～25として最初から解禁とする）
		this.txt = ["TO TITLE", "STAGE 01～05", "STAGE 06～10", "STAGE 11～15", "STAGE 16～20", "STAGE 21～25"];
		this.base = createGraphics(CANVAS_W, CANVAS_H);
		this.drawPrepare();
	}
  drawPrepare(){
		this.base.background(40, 128, 255);
		this.gr.textSize(30);
		this.gr.noStroke();
		this.gr.textFont(huiFont);
	}
	prepare(_state){
		// モード変数を0に戻さないと
		this.mode = 0;
	}
  keyAction(code){
    // 上下キーで選択、エンターキーでtitleまたはmodeに移行
    switch(code){
      case K_UP:
        this.mode = (this.mode + this.choiceLength - 1) % this.choiceLength;
        break;
      case K_DOWN:
        this.mode = (this.mode + 1) % this.choiceLength;
        break;
      case K_ENTER:
        if(this.mode === 0){
          this.setNextState("title");
        }else{
          this.setNextState("mode");
        }
        break;
    }
	}
	update(){
		// そうね・・やること、ないわね・・
	}
	draw(){
    this.gr.image(this.base, 0, 0);
		let col = [0, 0, 0, 0, 0, 0];
		col[this.mode] += 255;
		const left = 135;
		if(col[0] > 0){ this.gr.fill(0); this.gr.rect(left, 40, 130, 30); }
		this.gr.fill(col[0]);
		this.gr.text(this.txt[0], left + 2, 63);
		for(let k = 1; k < 6; k++){
			if(col[k] > 0){ this.gr.fill(0); this.gr.rect(left, 70 + 50 * k, 183, 30); }
			this.gr.fill(col[k]);
			this.gr.text(this.txt[k], left + 2, 93 + 50 * k);
		}
    image(this.gr, 0, 0);
	}
}

// このページで操作説明する
// 難易度はEASY, NORMAL, HARD, CRAZYの4種類でいこうか（同じ仕様でやる）
// 難易度ごとに色変える感じで（青→緑→黄色→赤）
class Mode extends State{
	constructor(_node){
		super(_node);
		this.name = "mode";
		this.base = createGraphics(CANVAS_W, CANVAS_H);
		this.level = 0; // selectからレベルの情報を受け取る。playに渡す。
		this.levelText = ""; // STAGE--～--のテキストをコピーする感じ
		this.mode = 0; // playのdifficultyとなる値。modeという名前になってるのは、要するに選択画面では常に"mode"という名前を使うってだけの話。
		// playの方でlevelとdifficulty,更にステージ番号1～5に応じてステージが生成されてゲームが行われる
		// ライフ0になったらタイトルに強制的に戻されクリアの場合は次のステージに進み全部クリアしたらやはりタイトルに戻る（スコア表示後）
		// セーブ機能は無いけどまあスコアがセレクト画面に記録されるくらいはいいかなって思うけども（クッキー使う？）
		this.choiceLength = 5; // 0:TO SELECT, 1～4:難易度。
		this.txt = ["TO SELECT", "EASY", "NORMAL", "HARD", "CRAZY"];
		this.drawPrepare();
	}
  drawPrepare(){
		this.base.background(128);
		/* ここでインストラクション書いた方がいいかもなぁ */
		this.gr.textSize(30);
		this.gr.noStroke();
		this.gr.textFont(huiFont);
	}
	prepare(_state){
		// モード変数を0に戻す。
		this.mode = 0;
		// ModeにはSelectからしか来ることができないのでlevelをここでSelectの情報を元に設定
		this.level = _state.mode; // 1～5
		this.levelText = _state.txt[this.level]; // それに応じたテキスト
	}
  keyAction(code){
    // 上下キーで選択、エンターキーでselectまたはplayに移行
    switch(code){
      case K_UP:
        this.mode = (this.mode + this.choiceLength - 1) % this.choiceLength;
        break;
      case K_DOWN:
        this.mode = (this.mode + 1) % this.choiceLength;
        break;
      case K_ENTER:
        if(this.mode === 0){
          this.setNextState("select");
        }else{
          this.setNextState("eyecatch");
        }
        break;
		}
	}
	update(){
		// まあ、やることは、ないわな・・
	}
	draw(){
    this.gr.image(this.base, 0, 0);
		let col = [0, 0, 0, 0, 0];
		col[this.mode] += 255;
		const left = 35;
		const top = 80;
		this.gr.fill(0);
		this.gr.text("--" + this.levelText +" is choosed--", left + 2, top + 23 - 50);
		if(col[0] > 0){ this.gr.fill(0); this.gr.rect(left, top, 140, 30); }
		this.gr.fill(col[0]);
		this.gr.text(this.txt[0], left + 2, top + 23);
		for(let k = 1; k < 5; k++){
			if(col[k] > 0){ this.gr.fill(0); this.gr.rect(left, top + 30 + 50 * k, 103, 30); }
			this.gr.fill(col[k]);
			this.gr.text(this.txt[k], left + 2, top + 53 + 50 * k);
		}
    image(this.gr, 0, 0);
	}
}

// ステージ開始前のスポットみたいなやつ
// まあステージ番号コールするだけ
// ここでステージデータを作っちゃう（Startに渡してPlayにも渡す）
// データはクラスの形にすべきかな
// シードはjsonか画像データかまあ別に作ってそれを元にデータを生成する流れ
// Modeからの場合はstageNumberをlevel * 5 - 4で計算（1,6,11,16,21）,difficulty情報をmodeから取得
// Clearからの場合はそのままでOK. difficultyはmodeから来た時に設定された値がそのまま保持されているし、
// このあとStart経由でplayに設定されたらクリアかオーバーまでずっと保持されるから設定の必要なし。
class Eyecatch extends State{
	constructor(_node){
		super(_node);
		this.name = "eyecatch";
		this.stageNumber = 0; // 1～25
		this.difficulty = 0; // 1～4
		this.frame = 0;
	}
  drawPrepare(){
		this.gr.textAlign(CENTER, CENTER);
		this.gr.textSize(64);
		this.gr.textFont(huiFont);
		this.gr.fill(255);
	}
	prepare(_state){
		switch(_state.name){
			case "mode":
		  	//
			  this.stageNumber = _state.level * 5 - 4;
				this.difficulty = _state.mode;
				break;
			case "clear":
			  this.stageNumber = _state.stageNumber;
				break;
		}
		this.frame = 0;
	}
  keyAction(code){
		// 自動的に移行するので操作は無し
	}
	update(){
		this.frame++;
		if(this.frame == 60){ this.setNextState("start"); }
	}
	draw(){
		this.gr.background(0);
		this.gr.text("STAGE" + this.stageNumber, CANVAS_W * 0.5, CANVAS_H * 0.5);
		image(this.gr, 0, 0);
	}
}

// ここでステージナンバーを元にステージデータを生成し
// それに基づいて描画させる。ステージデータはgraphicを受け取りそこにブロックを追加で描画するだけの処理。
// ステージデータのブロック画像から切り貼りするだけだからgrへの操作は不要。imageしか使わない。
// eyecatchからくる場合とplayから来る場合（やられたとき）があるがステージ生成処理はeyecatchから来るときだけ行なう（当然ね）
// どっちからくるにしても初期化処理を行なう（難易度に応じて）. paddleとか画像もcolliderも異なるので。位置とかも。

// とりあえずstagedataにダミー入れてテストだわね
// ここから先はもろもろ用意しないとどうしようもないな
class Start extends State{
	constructor(_node){
		super(_node);
		this.name = "start";
		this.data = undefined;
		this.stageNumber = 0;
		this.difficulty = 0;
		this.ball = new Ball(); // パドルと一緒に動くだけ。発射時に位置情報をplayに渡す
	  this.paddle = new Paddle(); // パドルはマウスと一緒に動く。発射時に位置情報を以下略. 難易度情報は初めに1回だけセットする
	}
  drawPrepare(){}
	prepare(_state){
		switch(_state.name){
			case "eyecatch":
			  this.data = new Stagedata(_state.stageNumber);
				this.stageNumber = _state.stageNumber; // まあdataに入ってるけど一応ね
				this.difficulty = _state.difficulty; // 難易度が無いとパドルを作れない
				break;
		}
	}
  keyAction(code){}
	update(){
	}
	draw(){}
}

// PlayにはMode,Pause,Clearからくる可能性があるわけです。
// PlayからはPause,Gameover,Clear,Allclearに行きます。
// 最初に準備段階があってその間は・・うーん。ステージコールは別ステートにするか・・情報だけ付与して。その方がdraw場合分けしなくて済む。
// あと発射段階って絵面はPlayのやつ横取りすればいい、Pauseみたいに。で、パドル動かしてボール・・そうね・・
// じゃあEyecatchとStart作るか。
class Play extends State{
	constructor(_node){
		super(_node);
		this.name = "play";
	}
  drawPrepare(){}
	prepare(_state){}
  keyAction(code){}
	update(){}
	draw(){}
}

class Gameover extends State{
	constructor(_node){
		super(_node);
		this.name = "gameover";
	}
  drawPrepare(){}
	prepare(_state){}
  keyAction(code){}
	update(){}
	draw(){}
}

class Clear extends State{
	constructor(_node){
		super(_node);
		this.name = "clear";
	}
  drawPrepare(){}
	prepare(_state){}
  keyAction(code){}
	update(){}
	draw(){}
}

class Allclear extends State{
	constructor(_node){
		super(_node);
		this.name = "allclear";
	}
  drawPrepare(){}
	prepare(_state){}
  keyAction(code){}
	update(){}
	draw(){}
}

// ボール、パドル、ブロック

// ボール
// 大きさは全部一緒でStart用とPlay用に2つインスタンス作る。Startの方はボールが発射されるまで表示
// サイズ16x16 円だけど判定はrectで行なう。その方が楽。
class Ball{
  constructor(){
		// x, yは中心の座標
		this.x = 0;
		this.y = 0;
		this.vx = 0;
		this.vy = 0;
		this.gr = createGraphics(16, 16);
		this.prepareGraphics();
		this.collider = new Rectcollider(-8, -8, 16, 16);
	}
	initialize(x, y){

	}
	prepareGraphics(){
		this.gr.noStroke();
		this.gr.fill(255);
		this.gr.circle(8, 8, 16);
	}
	update(){
		// 速度更新の前に・・ん－。更新前に衝突関連処理行なうので注意ね
		this.x += this.vx;
		this.y += this.vy;
	}
	draw(gr){
		// grに画像を貼り付ける
		gr.image(this.gr, this.x - 8, this.y - 8);
	}
}

// パドル
// 難易度により大きさと色を変える、これもStartとPlayで2つインスタンス
// ボールと衝突判定する。なおブロックの配置の都合上ブロック・・あー、まあ、いいや。
class Paddle{

}

// ブロック
class Block{

}

// Rectcollider
// 長方形領域。ボールとかブロックとかパドルに持たせる
// これを使ってcalc_far(遠くにあるときは判定しないやつ)とか衝突した時の・・
// 位相はぶつかった時だけ計算すればいいと思うんだ・・（ballposのところを読みながら）ねぇ？無駄が多いなぁ。困ったもんだ。
// calc_farも要らない気がする。次のフレームの位置に対してそれが衝突しない感じならスルー、衝突する感じなら
// そのときに移動前の情報により位相を計算しそれに応じて・・
// めり込みの処理をしてない！？でも普通に動いてるな・・速度更新の前に次の位置がめり込む場合に衝突と考えて
// 反射もろもろ処理してる。それで動いてるんだからすごいな。まあいいか（？）
// めりこみめっちゃ苦しんだ過去があるから複雑な気持ちもあるけど深く考えないことにする。ボール大きいしその辺でバランス取ってそう。
// ブロック崩しって見かけによらずほんとにバグらない実装難しくて、これもパドルがめちゃ低い位置あるけど以前はちょい上の方だったし
// パドルも太かった。それでやったらボールが壁とサンドイッチされる致命的なバグが発生して自由なステージ作りがしづらくなった。
// だから諦めた経緯がある。まあいいです。じゃあtopとかそこら辺、centerとか、そういう情報保持のためのクラスってことで。
// updateしながら。それでいこう。衝突はいつものようにpreviousを使って・・そうするとrect要らんけどな！
// あ、colliderにpreviousの概念用意する？違う、ballにpreviousのcolliderで二重で用意すればいいや。
// ブロックは動かないしpaddleのupdateのあとでballのupdateやってる。順番がはっきりしてるなら迷うことは何もないな。
// 単純なロジック。楽勝でしょう。
// ・・・・・
class Rectcollider{
	constructor(left, top, w, h){
		this.left = left;
		this.top = top;
		this.w = w;
		this.h = h;
		this.right = left + w;
		this.bottom = top + h;
	}
	update(l, t){
		this.left = l;
		this.top = t;
		this.right = l + this.w;
		this.bottom = t + this.h;
	}
	collideWithRect(other){
		// 相手colliderとの交叉判定
		if(this.right < other.left || other.right < this.left){ return false; }
		if(this.bottom < other.top || other.bottom < this.top){ return false; }
		return true;
	}
}

// ステージデータ
// ブロック構成に関する完全なデータ
// どの種類のブロックがどんだけあるとか
// それを元に毎フレーム描画するみたいな感じのあれ
// たとえば壊したりしたらそれをもとに更新する、ブロックもクラスなので
// つまりブロックの配列が入ってて描画はそれ使うんだけどそれだけの話で、うん。
// ブロック残り数とかいろんな情報が包含されててこれのプロパティを見てクリアしたかどうか判定する
// 種をもとに初期化
// Systemに持たせてそこから引っ張ってくる感じ
class Stagedata{
	constructor(seed){
	}
}

function keyPressed(){
  mySystem.currentState.keyAction(keyCode);
	return false;
}
